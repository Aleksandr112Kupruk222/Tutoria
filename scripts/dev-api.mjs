import { Miniflare } from "miniflare";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { pbkdf2Sync, randomBytes } from "node:crypto";
const accounts = ["Aleks", "Ben"].map((name) => {
  const salt = randomBytes(32).toString("hex");
  return {
    id: name.toLowerCase(),
    username: name.toLowerCase(),
    name,
    hash:
      salt +
      ":" +
      pbkdf2Sync("1234", salt, 100000, 32, "sha256").toString("hex"),
  };
});
await mkdir(".wrangler/tutoria", { recursive: true });
const mf = new Miniflare({
  modules: true,
  scriptPath: "dist/server/index.js",
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  port: 3001,
  host: "127.0.0.1",
  d1Databases: { DB: "tutoria-local" },
  d1Persist: ".wrangler/tutoria",
  bindings: {
    BOOTSTRAP_ACCOUNTS: JSON.stringify(accounts),
    APP_ORIGIN: "http://localhost:3001",
  },
  serviceBindings: {
    ASSETS: async (request) => {
      const u = new URL(request.url);
      return fetch(`http://localhost:3000${u.pathname}${u.search}`, {
        method: request.method,
        headers: request.headers,
        redirect: "manual",
      });
    },
  },
});
const db = await mf.getD1Database("DB");
await db
  .prepare(
    "CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)",
  )
  .run();
for (const file of (await readdir("drizzle"))
  .filter((x) => x.endsWith(".sql"))
  .sort()) {
  if (
    await db
      .prepare("SELECT name FROM local_migrations WHERE name=?")
      .bind(file)
      .first()
  )
    continue;
  const sql = await readFile(`drizzle/${file}`, "utf8");
  await db.batch(
    sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
  await db
    .prepare("INSERT INTO local_migrations (name) VALUES (?)")
    .bind(file)
    .run();
}
console.log("Complete local app: http://localhost:3001");
console.log(
  "Fresh local accounts: Aleks and Ben. Initial password: 1234 (change at first login).",
);
process.on("SIGINT", async () => {
  await mf.dispose();
  process.exit(0);
});
await mf.ready;
