import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { readFile } from "node:fs/promises";
import { pbkdf2Sync } from "node:crypto";
import { build } from "esbuild";
await build({
  entryPoints: ["lib/draft-builder.ts"],
  outfile: ".sites-runtime/test-builder.mjs",
  bundle: true,
  format: "esm",
  platform: "node",
});
const { buildTranscriptDraft } =
  await import("../.sites-runtime/test-builder.mjs");
const sample = JSON.parse(
  await readFile("content/player-controller.json", "utf8"),
);
const generated = buildTranscriptDraft({
  ...sample,
  transcript: [
    {
      seconds: 0,
      mediaId: "screen",
      text: "First create a Blueprint Actor. Select the mesh.",
    },
    {
      seconds: 90,
      mediaId: "screen",
      text: "Next connect BeginPlay. Actually do not connect Event Tick; undo that mistake.",
    },
  ],
});
assert.equal(generated.lesson.steps.length, 2);
assert.equal(generated.lesson.steps[1].seconds, 90);
assert.match(generated.lesson.steps[1].check, /correction/);
assert(generated.lesson.concepts.some((x) => x.term === "Blueprint"));
assert.equal(generated.lesson.quiz, sample.quiz);
assert.throws(() => buildTranscriptDraft({ ...sample, transcript: [] }));
const accounts = ["aleks", "ben"].map((name) => ({
  id: name,
  username: name,
  name,
  hash:
    "test-salt:" +
    pbkdf2Sync("1234", "test-salt", 100000, 32, "sha256").toString("hex"),
}));
const mf = new Miniflare({
  modules: true,
  scriptPath: "dist/server/index.js",
  compatibilityDate: "2026-05-15",
  d1Databases: ["DB"],
  bindings: { BOOTSTRAP_ACCOUNTS: JSON.stringify(accounts) },
  serviceBindings: { ASSETS: async () => new Response("asset") },
});
try {
  const db = await mf.getD1Database("DB");
  const migration = await readFile("drizzle/0000_far_black_cat.sql", "utf8");
  await db.batch(
    migration
      .split("--> statement-breakpoint")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
  const request = (
    path,
    data,
    cookie = "",
    method = "POST",
    origin = "https://example.com",
  ) =>
    mf.dispatchFetch("https://example.com" + path, {
      method: data === undefined ? "GET" : method,
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  assert.equal((await request("/api/teacher/catalog")).status, 401);
  assert.equal(
    (await request("/api/auth/login", { username: "aleks", password: "bad" }))
      .status,
    401,
  );
  const a = await request("/api/auth/login", {
    username: "Aleks",
    password: "1234",
  });
  assert.equal(a.status, 200);
  const ac = a.headers.get("set-cookie").split(";")[0];
  assert.match(a.headers.get("set-cookie"), /HttpOnly/);
  assert.match(a.headers.get("set-cookie"), /Secure/);
  assert.equal(
    (await request("/api/teacher/catalog", undefined, ac)).status,
    428,
  );
  assert.equal(
    (
      await request(
        "/api/auth/password",
        { password: "aleks-test-password-2026" },
        ac,
      )
    ).status,
    200,
  );
  const b = await request("/api/auth/login", {
    username: "ben",
    password: "1234",
  });
  const bc = b.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (
      await request(
        "/api/auth/password",
        { password: "ben-test-password-2026" },
        bc,
      )
    ).status,
    200,
  );
  const cat = await (
    await request("/api/teacher/catalog", undefined, ac)
  ).json();
  assert.equal(cat.folders.length, 3);
  assert.equal(cat.lessons.length, 1);
  const badFolder = await request(
    "/api/teacher/folder?id=" + cat.folders[0].id,
    { name: "Intrusion", description: "", color: "cyan" },
    bc,
    "PUT",
  );
  assert.equal(badFolder.status, 404);
  const own = cat.lessons[0];
  const payload = {
    lesson: {...own.lesson, teacherReviewNotes: ["Teacher-only check"]},
    folderId: own.folderId,
    revision: own.revision,
    action: "publish",
  };
  assert.equal(
    (await request("/api/teacher/lesson?id=" + own.id, payload, bc, "PUT"))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/teacher/lesson?id=" + own.id,
        payload,
        ac,
        "PUT",
        "https://attacker.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (await (await request("/api/catalog")).json()).lessons.length,
    0,
  );
  assert.equal(
    (await request("/api/teacher/lesson?id=" + own.id, payload, ac, "PUT"))
      .status,
    200,
  );
  assert.equal(
    (await (await request("/api/catalog")).json()).lessons.length,
    1,
  );
  assert.equal(
    (await request("/api/teacher/lesson?id=" + own.id, payload, ac, "PUT"))
      .status,
    409,
  );
  assert.equal((await (await request("/api/lesson?id=" + own.id)).json()).lesson.teacherReviewNotes, undefined);
  assert.equal((await (await request("/api/catalog")).json()).lessons[0].lesson.teacherReviewNotes, undefined);
  assert.deepEqual((await (await request("/api/teacher/catalog", undefined, ac)).json()).lessons[0].lesson.teacherReviewNotes, ["Teacher-only check"]);
  const draft = {
    ...payload,
    revision: 2,
    action: "save",
    lesson: { ...own.lesson, title: "Changed draft" },
  };
  assert.equal(
    (await request("/api/teacher/lesson?id=" + own.id, draft, ac, "PUT"))
      .status,
    200,
  );
  assert.equal(
    (await (await request("/api/lesson?id=" + own.id)).json()).lesson.title,
    own.lesson.title,
  );
  assert.equal((await request("/api/youtube/start", {}, ac)).status, 503);
  assert.equal((await request("/api/auth/logout", {}, ac)).status, 200);
  assert.equal(
    (await request("/api/teacher/catalog", undefined, ac)).status,
    401,
  );
  console.log(
    "Passed: transcript extraction, correction flags, glossary, password login/change, cookies, ownership isolation, CSRF, draft/publish separation, stale writes, unconfigured OAuth and logout.",
  );
} finally {
  await mf.dispose();
}
