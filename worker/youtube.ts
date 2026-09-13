import {
  type Env,
  type Teacher,
  HttpError,
  random,
  sha,
  encrypt,
  decrypt,
  json,
} from "./security";
import { parseTranscript } from "../lib/lessons";
const scope = "https://www.googleapis.com/auth/youtube.force-ssl";
export const youtubeReady = (env: Env) =>
  !!(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.TOKEN_ENCRYPTION_KEY &&
    env.APP_ORIGIN
  );
const redirectUri = (env: Env) => `${env.APP_ORIGIN}/api/youtube/callback`;
const timeout = () => AbortSignal.timeout(20000);
export async function startConnection(env: Env, user: Teacher) {
  if (!youtubeReady(env))
    throw new HttpError(
      503,
      "YouTube connection needs Google OAuth setup. You can paste a transcript now.",
    );
  const state = random(),
    verifier = random();
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
  );
  const challenge = btoa(String.fromCharCode(...digest))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  await env.DB.prepare(
    "INSERT INTO oauth_states (state_hash,teacher_id,session_hash,verifier,expires) VALUES (?,?,?,?,?)",
  )
    .bind(
      await sha(state),
      user.id,
      user.sessionHash,
      verifier,
      Date.now() + 600000,
    )
    .run();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(env),
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return json({ url: url.href });
}
async function googleJson(url: string, token: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: timeout(),
  });
  if (!r.ok)
    throw new HttpError(
      r.status === 403 ? 403 : 502,
      "YouTube could not provide this content. Check channel access, captions and API quota, or use manual transcript import.",
    );
  return (await r.json()) as any;
}
export async function finishConnection(r: Request, env: Env, user: Teacher) {
  if (!youtubeReady(env))
    throw new HttpError(503, "Google OAuth is not configured.");
  const u = new URL(r.url);
  const state = u.searchParams.get("state") || "";
  if (!/^[a-f0-9]{64}$/.test(state))
    throw new HttpError(
      400,
      "Invalid connection state. Start again from the dashboard.",
    );
  const row = await env.DB.prepare(
    "DELETE FROM oauth_states WHERE state_hash=? AND teacher_id=? AND session_hash=? AND expires>? RETURNING verifier",
  )
    .bind(await sha(state), user.id, user.sessionHash, Date.now())
    .first<{ verifier: string }>();
  if (!row)
    throw new HttpError(
      400,
      "This connection request expired or has already been used.",
    );
  if (u.searchParams.has("error"))
    return Response.redirect(
      `${env.APP_ORIGIN}/teacher/?youtube=cancelled`,
      303,
    );
  const code = u.searchParams.get("code");
  if (!code) throw new HttpError(400, "Missing Google authorisation code.");
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri(env),
      grant_type: "authorization_code",
      code_verifier: row.verifier,
    }),
    signal: timeout(),
  });
  if (!tokenResponse.ok)
    throw new HttpError(
      502,
      "Google authorisation could not be completed. Reconnect from the dashboard.",
    );
  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(scope))
    throw new HttpError(403, "Grant caption access to connect this channel.");
  const channels = await googleJson(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    tokens.access_token,
  );
  const channel = channels.items?.[0];
  if (!channel)
    throw new HttpError(
      400,
      "No YouTube channel was found for this Google account.",
    );
  await env.DB.prepare(
    "INSERT INTO youtube_connections (teacher_id,channel_id,channel_title,refresh_token) VALUES (?,?,?,?) ON CONFLICT(teacher_id) DO UPDATE SET channel_id=excluded.channel_id,channel_title=excluded.channel_title,refresh_token=excluded.refresh_token",
  )
    .bind(
      user.id,
      channel.id,
      channel.snippet.title,
      await encrypt(tokens.refresh_token, env.TOKEN_ENCRYPTION_KEY!),
    )
    .run();
  return Response.redirect(`${env.APP_ORIGIN}/teacher/?youtube=connected`, 303);
}
export async function importVideo(env: Env, user: Teacher, videoId: string) {
  if (!youtubeReady(env))
    throw new HttpError(
      503,
      "Google OAuth setup is not complete. Paste the video title and transcript instead.",
    );
  const connection = await env.DB.prepare(
    "SELECT refresh_token FROM youtube_connections WHERE teacher_id=?",
  )
    .bind(user.id)
    .first<{ refresh_token: string }>();
  if (!connection)
    throw new HttpError(
      409,
      "Connect your YouTube channel first, or paste a transcript.",
    );
  const refresh = await decrypt(
    connection.refresh_token,
    env.TOKEN_ENCRYPTION_KEY!,
  );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
    signal: timeout(),
  });
  if (!response.ok)
    throw new HttpError(
      401,
      "Your YouTube permission has expired. Reconnect your channel.",
    );
  const tokens = (await response.json()) as { access_token: string };
  const videos = await googleJson(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}`,
    tokens.access_token,
  );
  const video = videos.items?.[0];
  if (!video) throw new HttpError(404, "This video could not be found.");
  const metadata = {
    title: video.snippet.title,
    description: video.snippet.description || "",
  };
  try {
    const tracks = await googleJson(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
      tokens.access_token,
    );
    const track =
      tracks.items?.find(
        (t: any) =>
          t.snippet.language.startsWith("en") && t.snippet.status === "serving",
      ) || tracks.items?.find((t: any) => t.snippet.status === "serving");
    if (!track)
      return {
        ...metadata,
        transcript: [],
        warning:
          "No available captions. Paste a transcript to build the draft.",
      };
    const captions = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${encodeURIComponent(track.id)}?tfmt=vtt`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: timeout(),
      },
    );
    if (!captions.ok) throw Error("Captions unavailable");
    const raw = await captions.text();
    if (raw.length > 800000) throw Error("Caption file too large");
    return {
      ...metadata,
      transcript: parseTranscript(raw, "screen"),
      warning: null,
    };
  } catch {
    return {
      ...metadata,
      transcript: [],
      warning:
        "YouTube did not allow caption download. Import an owner-exported caption file or paste the transcript.",
    };
  }
}
export async function disconnect(env: Env, user: Teacher) {
  const row = await env.DB.prepare(
    "SELECT refresh_token FROM youtube_connections WHERE teacher_id=?",
  )
    .bind(user.id)
    .first<{ refresh_token: string }>();
  let revoked = true;
  if (row && env.TOKEN_ENCRYPTION_KEY) {
    try {
      const token = await decrypt(row.refresh_token, env.TOKEN_ENCRYPTION_KEY);
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        body: new URLSearchParams({ token }),
        signal: timeout(),
      });
      revoked = response.ok;
    } catch {
      revoked = false;
    }
  }
  await env.DB.prepare("DELETE FROM youtube_connections WHERE teacher_id=?")
    .bind(user.id)
    .run();
  return json({
    ok: true,
    warning: revoked
      ? null
      : "Removed from Tutoria. Google revocation could not be confirmed; remove access in your Google Account permissions.",
  });
}
