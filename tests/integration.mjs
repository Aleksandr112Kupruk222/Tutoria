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
  bindings: { BOOTSTRAP_ACCOUNTS: JSON.stringify(accounts), ADMIN_BOOTSTRAP_HASH: accounts[0].hash },
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
  const extra=await readFile("drizzle/0001_graceful_night_thrasher.sql","utf8");
  await db.batch(extra.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const orderingMigration=await readFile("drizzle/0002_vengeful_medusa.sql","utf8");
  await db.batch(orderingMigration.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const feedbackMigration=await readFile("drizzle/0003_plain_archangel.sql","utf8");
  await db.batch(feedbackMigration.split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
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
  // Simulate an existing installation with duplicated starter folders.
  for(const owner of ["aleks","ben"]){
    for(const [suffix,name] of [["unreal","Unreal Engine"],["modelling","3D Modelling"],["sample","Sample lessons"]])
      await db.prepare("INSERT INTO folders(id,owner_id,name,description,color,created_at) VALUES (?,?,?,'','cyan',?)").bind(`${owner}-${suffix}`,owner,name,owner==="aleks"?"2026-01-01":"2026-02-01").run();
    const lesson={...sample,id:`${owner}-example`,slug:`${owner}-example`};
    await db.prepare("INSERT INTO tutorials(id,owner_id,folder_id,draft_json,revision,updated_at) VALUES (?,?,?,?,1,'2026-02-01')").bind(lesson.id,owner,`${owner}-sample`,JSON.stringify(lesson)).run();
  }
  const cat = await (
    await request("/api/teacher/catalog", undefined, ac)
  ).json();
  assert.equal(cat.folders.length, 3);
  assert.equal(cat.lessons.length, 2);
  const badFolder = await request(
    "/api/teacher/folder?id=" + cat.folders[0].id,
    { name: "Intrusion", description: "", color: "cyan" },
    bc,
    "PUT",
  );
  assert.equal(badFolder.status, 200);
  assert.deepEqual((await (await request("/api/teacher/catalog",undefined,bc)).json()).folders.map(f=>f.id),cat.folders.map(f=>f.id));
  assert.equal((await db.prepare("SELECT folder_id FROM tutorials WHERE id='ben-example'").first()).folder_id,"aleks-sample");
  const own = cat.lessons[0];
  const payload = {
    lesson: {...own.lesson, teacherReviewNotes: ["Teacher-only check"]},
    folderId: own.folderId,
    revision: own.revision,
    action: "publish",
  };
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
    (await request("/api/teacher/lesson?id=" + own.id, payload, bc, "PUT"))
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
  for (const title of [undefined, ""]) {
    const created = await request("/api/teacher/lessons", {title,videoId:own.lesson.media[0].videoId,folderId:own.folderId}, ac);
    assert.equal(created.status, 201);
    assert.equal((await created.json()).entry.lesson.title, "Untitled lesson");
  }
  assert.equal((await request("/api/youtube/start", {}, ac)).status, 503);
  const ordering=(await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons.filter(l=>l.folderId===own.folderId);
  const reversed=ordering.map(l=>l.id).reverse();
  assert.equal((await request("/api/teacher/order",{folderId:own.folderId,ids:reversed},bc,"PUT")).status,200);
  assert.equal((await request("/api/teacher/order",{folderId:own.folderId,ids:[reversed[0],reversed[0]]},ac,"PUT")).status,400);
  assert.equal((await request("/api/teacher/order",{folderId:own.folderId,ids:reversed.slice(1)},ac,"PUT")).status,409);
  assert.equal((await request("/api/teacher/order",{folderId:own.folderId,ids:reversed},ac,"PUT","https://attacker.test")).status,403);
  assert.equal((await request("/api/teacher/order",{folderId:own.folderId,ids:reversed},ac,"PUT")).status,200);
  assert.deepEqual((await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons.filter(l=>l.folderId===own.folderId).map(l=>l.id),reversed);
  const appended=await request("/api/teacher/lessons",{videoId:own.lesson.media[0].videoId,folderId:own.folderId},ac);
  const appendedId=(await appended.json()).entry.id;
  assert.equal((await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons.filter(l=>l.folderId===own.folderId).at(-1).id,appendedId);
  console.log("Passed folder ordering, duplicate/stale ID rejection, CSRF and append-at-end creation.");
  const submittedFeedback=await request("/api/feedback",{kind:"bug",urgency:2,message:"The next step button does not respond.",pagePath:"/lesson/?id=lesson-one",pageTitle:"Lesson",contextKind:"Lesson",contextId:"lesson-one",contextTitle:"Player controls"},ac);
  assert.equal(submittedFeedback.status,201);
  assert.equal((await request("/api/feedback",{kind:"bug",urgency:0,message:"Invalid urgency",pagePath:"/",pageTitle:"",contextKind:"Page",contextId:"",contextTitle:""})).status,400);
  assert.equal((await request("/api/feedback",{kind:"bug",urgency:2,message:"Cross-site feedback",pagePath:"/",pageTitle:"",contextKind:"Page",contextId:"",contextTitle:""},"","POST","https://attacker.test")).status,403);
  assert.equal((await request("/api/admin/feedback",undefined,ac)).status,403);
  assert.equal((await request("/api/admin/accounts",undefined,ac)).status,403);
  const adminLogin=await request("/api/auth/login",{username:"admin",password:"1234"});
  const adminCookie=adminLogin.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/admin/accounts",undefined,adminCookie)).status,428);
  assert.equal((await request("/api/auth/password",{password:"admin-new-password"},adminCookie)).status,200);
  assert.equal((await request("/api/admin/accounts",undefined,adminCookie)).status,200);
  const inbox=(await (await request("/api/admin/feedback",undefined,adminCookie)).json()).feedback;
  assert.equal(inbox.length,1);
  assert.equal(inbox[0].context_title,"Player controls");
  assert.equal(inbox[0].reporter_name,"aleks");
  assert.equal((await request("/api/admin/feedback?id="+inbox[0].id,{status:"resolved"},adminCookie,"PATCH")).status,200);
  assert.equal((await (await request("/api/admin/feedback",undefined,adminCookie)).json()).feedback[0].status,"resolved");
  assert.equal((await request("/api/admin/account?id=admin",{},adminCookie,"DELETE")).status,400);
  assert.equal((await request("/api/admin/accounts",{username:"computing",name:"Computing Teacher",password:"eight123"},adminCookie)).status,201);
  assert.equal((await request("/api/admin/accounts",{username:"computing",name:"Duplicate",password:"eight123"},adminCookie)).status,409);
  const newLogin=await request("/api/auth/login",{username:"computing",password:"eight123"});
  const newCookie=newLogin.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/auth/password",{password:"eight123"},newCookie)).status,400);
  assert.equal((await request("/api/auth/password",{password:"longer-new-password"},newCookie)).status,200);
  assert.equal((await (await request("/api/teacher/catalog",undefined,newCookie)).json()).folders.length,3);
  assert.deepEqual((await (await request("/api/teacher/catalog",undefined,newCookie)).json()).lessons,(await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons);
  const teacherList=(await (await request("/api/admin/accounts",undefined,adminCookie)).json()).accounts;
  const newId=teacherList.find(t=>t.username==="computing").id;
  assert.equal((await request("/api/admin/password?id="+newId,{password:"replacement-password"},adminCookie)).status,200);
  assert.equal((await request("/api/teacher/session",undefined,newCookie)).status,401);
  assert.equal((await request("/api/auth/login",{username:"computing",password:"eight123"})).status,401);
  assert.equal((await request("/api/auth/login",{username:"computing",password:"replacement-password"})).status,200);
  assert.equal((await (await request("/api/lesson?id="+own.id)).json()).folderId,own.folderId);
  const sharedFolder=(await (await request("/api/teacher/folders",{name:"Shared computing",description:"",color:"cyan"},bc)).json()).folder;
  const sharedLesson=(await (await request("/api/teacher/lessons",{videoId:own.lesson.media[0].videoId,folderId:sharedFolder.id},ac)).json()).entry;
  const benLesson=(await (await request("/api/teacher/lessons",{videoId:own.lesson.media[0].videoId,folderId:sharedFolder.id},bc)).json()).entry;
  const validShared={...sample,id:sharedLesson.id,slug:sharedLesson.id};
  assert.equal((await request("/api/teacher/lesson?id="+sharedLesson.id,{lesson:validShared,folderId:sharedFolder.id,revision:1,action:"publish"},ac,"PUT")).status,200);
  assert.equal((await request("/api/teacher/folder?id="+sharedFolder.id,{},ac,"DELETE","https://attacker.test")).status,403);
  assert.equal((await request("/api/teacher/folder?id="+sharedFolder.id,{},ac,"DELETE")).status,200);
  assert.equal((await request("/api/teacher/folder?id="+sharedFolder.id,{},ac,"DELETE")).status,404);
  assert.equal((await request("/api/teacher/folder?id=unassigned",{},ac,"DELETE")).status,400);
  assert.equal((await request("/api/teacher/folder?id=unassigned",{name:"Visible",description:"",color:"cyan"},ac,"PUT")).status,404);
  for(const [id,cookie] of [[sharedLesson.id,ac],[benLesson.id,bc]]){
    const saved=(await (await request("/api/teacher/catalog",undefined,cookie)).json()).lessons.find(l=>l.id===id);
    assert.equal(saved.folderId,"unassigned");assert.equal(saved.published,false);
    assert.equal(saved.lesson.media[0].videoId,own.lesson.media[0].videoId);
  }
  assert.equal((await request("/api/lesson?id="+sharedLesson.id)).status,404);
  const publicCatalog=await (await request("/api/catalog")).json();
  assert(!publicCatalog.folders.some(f=>f.id==="unassigned"||f.id===sharedFolder.id));
  assert(publicCatalog.folders.every(f=>f.teacher===undefined));
  assert(!publicCatalog.lessons.some(l=>l.id===sharedLesson.id));
  assert.equal((await request("/api/teacher/lesson?id="+sharedLesson.id,{lesson:validShared,folderId:"unassigned",revision:3,action:"publish"},bc,"PUT")).status,400);
  assert.equal((await request("/api/teacher/lesson?id="+sharedLesson.id,{lesson:validShared,folderId:own.folderId,revision:2,action:"save"},ac,"PUT")).status,409);
  assert.equal((await request("/api/teacher/lesson?id="+sharedLesson.id,{lesson:validShared,folderId:own.folderId,revision:3,action:"publish"},bc,"PUT")).status,200);
  assert.equal((await request("/api/lesson?id="+sharedLesson.id)).status,200);
  const retained=(await (await request("/api/teacher/folders",{name:"Retained shared folder",description:"",color:"cyan"},bc)).json()).folder;
  console.log("Passed shared folders, legacy consolidation, lossless deletion, hidden Unassigned, republishing and 8/12-character passwords.");
  assert.equal((await request("/api/teacher/lesson?id="+own.id,{},ac,"DELETE","https://attacker.test")).status,403);
  assert.equal((await request("/api/teacher/lesson?id="+own.id,{},bc,"DELETE")).status,200);
  assert.equal((await request("/api/lesson?id="+own.id)).status,404);
  assert.equal((await request("/api/teacher/lesson?id="+own.id,{...payload,revision:3},ac,"PUT")).status,409);
  const beforeRemoval=(await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons;
  assert.equal((await request("/api/admin/account?id=ben",{},adminCookie,"DELETE")).status,200);
  assert.deepEqual((await (await request("/api/teacher/catalog",undefined,ac)).json()).lessons,beforeRemoval);
  assert.equal((await request("/api/teacher/session",undefined,bc)).status,401);
  assert.equal((await request("/api/auth/login",{username:"ben",password:"1234"})).status,401);
  assert.equal((await db.prepare("SELECT deleted FROM teachers WHERE id='ben'").first()).deleted,1);
  assert((await (await request("/api/catalog")).json()).folders.some(f=>f.id===retained.id));
  console.log("Passed admin role isolation, required first password change, account creation/reset/deletion, session revocation, no bootstrap resurrection and collaborative lesson deletion and content preservation.");
  assert.equal((await request("/api/auth/logout", {}, ac)).status, 200);
  assert.equal(
    (await request("/api/teacher/catalog", undefined, ac)).status,
    401,
  );
  console.log(
    "Passed: transcript extraction, correction flags, glossary, password login/change, cookies, shared teacher access, CSRF, draft/publish separation, stale writes, unconfigured OAuth and logout.",
  );
} finally {
  await mf.dispose();
}
