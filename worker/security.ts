export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  BOOTSTRAP_ACCOUNTS?: string;
  ADMIN_BOOTSTRAP_HASH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  APP_ORIGIN?: string;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
export const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export const sha = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export function checkWrite(r: Request) {
  if (
    r.headers.get("origin") !== new URL(r.url).origin ||
    r.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Cross-site changes are not allowed.");
}
export async function body(r: Request) {
  if (!r.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Send JSON content.");
  const reader = r.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing content.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new HttpError(413, "Use content smaller than 1 MB.");
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(all));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export interface Teacher {
  id: string;
  username: string;
  name: string;
  must_change: number;
  sessionHash: string;
  role: "teacher" | "admin";
}
export function cookieToken(r: Request) {
  return (
    r.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("tutoria_session="))
      ?.split("=")[1] || ""
  );
}
export const sessionCookie = (r: Request, token: string, maxAge = 28800) =>
  `tutoria_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(r.url).protocol === "https:" ? "; Secure" : ""}`;
export async function hashPassword(password: string, salt = random()) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `${salt}:${Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const actual = await hashPassword(password, stored.split(":")[0]);
  let diff = actual.length ^ stored.length;
  for (let i = 0; i < Math.max(actual.length, stored.length); i++)
    diff |= (actual.charCodeAt(i) || 0) ^ (stored.charCodeAt(i) || 0);
  return diff === 0;
}
export async function requireTeacher(
  r: Request,
  env: Env,
  allowChange = false,
): Promise<Teacher> {
  const token = cookieToken(r);
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Please log in to your teacher account.");
  const sessionHash = await sha(token);
  const user = await env.DB.prepare(
    "SELECT t.id,t.username,t.name,t.must_change,t.role FROM sessions s JOIN teachers t ON t.id=s.teacher_id WHERE s.token_hash=? AND s.expires>? AND t.deleted=0",
  )
    .bind(sessionHash, Date.now())
    .first<Omit<Teacher, "sessionHash">>();
  if (!user)
    throw new HttpError(401, "Your session has expired. Please log in again.");
  if (user.must_change && !allowChange)
    throw new HttpError(
      428,
      "Set a new password before using the teacher dashboard.",
    );
  return { ...user, sessionHash };
}
export async function bootstrap(env: Env) {
  if (env.ADMIN_BOOTSTRAP_HASH) await env.DB.prepare("INSERT OR IGNORE INTO teachers (id,username,name,password_hash,must_change,created_at,role) VALUES ('admin','admin','Administrator',?,1,?,'admin')").bind(env.ADMIN_BOOTSTRAP_HASH,new Date().toISOString()).run();
  if (!env.BOOTSTRAP_ACCOUNTS) return;
  const accounts = JSON.parse(env.BOOTSTRAP_ACCOUNTS) as {
    id: string;
    username: string;
    name: string;
    hash: string;
  }[];
  for (const a of accounts) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO teachers (id,username,name,password_hash,must_change,created_at) VALUES (?,?,?,?,1,?)",
    )
      .bind(a.id, a.username, a.name, a.hash, new Date().toISOString())
      .run();
  }
}
export async function encrypt(value: string, key: string) {
  const k = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(key), (c) => c.charCodeAt(0)),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      k,
      new TextEncoder().encode(value),
    ),
  );
  return (
    btoa(String.fromCharCode(...iv)) + "." + btoa(String.fromCharCode(...data))
  );
}
export async function decrypt(value: string, key: string) {
  const [a, b] = value.split(".");
  const k = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(key), (c) => c.charCodeAt(0)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: Uint8Array.from(atob(a), (c) => c.charCodeAt(0)) },
      k,
      Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
    ),
  );
}
