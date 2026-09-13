import { adminApi } from "./admin";
import { z } from "zod";
import {
  lessonSchema,
  draftLessonSchema,
  type Lesson,
} from "../lib/lessons";
import {
  type Env,
  HttpError,
  json,
  body,
  checkWrite,
  requireTeacher,
  bootstrap,
  hashPassword,
  verifyPassword,
  random,
  sha,
  sessionCookie,
  cookieToken,
} from "./security";
import {
  youtubeReady,
  startConnection,
  finishConnection,
  importVideo,
  disconnect,
} from "./youtube";
const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const folderSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(350),
  color: z.enum(["cyan", "magenta", "green"]),
});
const blankLesson = (
  title: string,
  videoId: string,
  id: string,
  folder: string,
): Lesson => ({
  schemaVersion: 1,
  id,
  slug: id,
  title,
  description: "",
  module: folder,
  difficulty: "Beginner",
  durationMinutes: 30,
  tags: [],
  sample: false,
  media: [
    { id: "screen", provider: "youtube", role: "tutorial", videoId, title },
  ],
  objectives: [],
  steps: [],
  transcript: [],
  concepts: [],
  troubleshooting: [],
  extensions: [
    { level: "Beginner", title: "", body: "" },
    { level: "Intermediate", title: "", body: "" },
    { level: "Advanced", title: "", body: "" },
  ],
  quiz: [],
  resources: [],
});
// Consolidate legacy, automatically created starter folders without touching custom folders.
// Each batch moves every lesson before removing the duplicate, preserving foreign keys.
async function mergeStarterFolders(env: Env) {
  const legacy = "id = owner_id || '-unreal' OR id = owner_id || '-modelling' OR id = owner_id || '-sample'";
  const groups = (await env.DB.prepare(`SELECT name, MIN(created_at || '|' || id) AS first FROM folders WHERE ${legacy} GROUP BY name HAVING COUNT(*) > 1`).all<{name:string;first:string}>()).results;
  for (const group of groups) {
    const canonical = group.first.split('|').slice(1).join('|');
    await env.DB.batch([
      env.DB.prepare(`UPDATE tutorials SET folder_id=?, revision=revision+1 WHERE folder_id IN (SELECT id FROM folders WHERE (${legacy}) AND name=? AND id<>?)`).bind(canonical,group.name,canonical),
      env.DB.prepare(`DELETE FROM folders WHERE (${legacy}) AND name=? AND id<>?`).bind(group.name,canonical),
    ]);
  }
}
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const u = new URL(request.url),
    path = u.pathname.replace(/\/$/, "");
  try {
    if (!["GET", "HEAD"].includes(request.method)) checkWrite(request);
    if (path === "/api/auth/login" && request.method === "POST") {
      const data = z
        .object({
          username: z
            .string()
            .trim()
            .min(1)
            .max(60)
            .transform((s) => s.toLowerCase()),
          password: z.string().min(1).max(200),
        })
        .parse(await body(request));
      await bootstrap(env);
      const now = Date.now(),
        ip = request.headers.get("cf-connecting-ip") || "local";
      const key = await sha(`${ip}:${data.username}`);
      const limit = await env.DB.prepare(
        "SELECT attempts,reset_at FROM login_attempts WHERE key=?",
      )
        .bind(key)
        .first<{ attempts: number; reset_at: number }>();
      if (limit && limit.reset_at > now && limit.attempts >= 8)
        throw new HttpError(
          429,
          "Too many login attempts. Try again in 15 minutes.",
        );
      await env.DB.prepare(
        "INSERT INTO login_attempts (key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END",
      )
        .bind(key, now + 900000, now, now)
        .run();
      const user = await env.DB.prepare(
        "SELECT id,password_hash FROM teachers WHERE username=? AND deleted=0",
      )
        .bind(data.username)
        .first<{ id: string; password_hash: string }>();
      const valid = await verifyPassword(
        data.password,
        user?.password_hash || "0".repeat(64) + ":" + "0".repeat(64),
      );
      if (!user || !valid)
        throw new HttpError(401, "Username or password is incorrect.");
      await env.DB.prepare("DELETE FROM login_attempts WHERE key=?")
        .bind(key)
        .run();
      const token = random();
      await env.DB.prepare(
        "INSERT INTO sessions (token_hash,teacher_id,expires) VALUES (?,?,?)",
      )
        .bind(await sha(token), user.id, now + 28800000)
        .run();
      await env.DB.prepare("DELETE FROM sessions WHERE expires<?")
        .bind(now)
        .run();
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(request, token),
      });
    }
    if (path === "/api/auth/logout" && request.method === "POST") {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await sha(cookieToken(request)))
        .run();
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(request, "", 0),
      });
    }
    if (path === "/api/catalog" && request.method === "GET") {
      await mergeStarterFolders(env);
      const folders = (
        await env.DB.prepare(
          "SELECT id,name,description,color FROM folders WHERE id<>'unassigned' ORDER BY created_at,id",
        ).all()
      ).results;
      const rows = await env.DB.prepare(
        "SELECT id,folder_id,published_json FROM tutorials WHERE deleted=0 AND folder_id<>'unassigned' AND published_json IS NOT NULL ORDER BY folder_id,sort_order,id",
      ).all<{ id: string; folder_id: string; published_json: string }>();
      return json({
        folders,
        lessons: rows.results.map((r) => ({
          id: r.id,
          folderId: r.folder_id,
          lesson: JSON.parse(r.published_json),
        })),
      });
    }
    if (path === "/api/lesson" && request.method === "GET") {
      const id = idSchema.parse(u.searchParams.get("id"));
      const row = await env.DB.prepare(
        "SELECT folder_id,published_json FROM tutorials WHERE id=? AND folder_id<>'unassigned' AND deleted=0 AND published_json IS NOT NULL",
      )
        .bind(id)
        .first<{ folder_id: string; published_json: string }>();
      if (!row) throw new HttpError(404, "This lesson is not published.");
      return json({ lesson: JSON.parse(row.published_json), folderId: row.folder_id });
    }
    const user = await requireTeacher(
      request,
      env,
      path === "/api/teacher/session" || path === "/api/auth/password",
    );
    if (path.startsWith("/api/admin/")) return await adminApi(request, env, user);
    if (path === "/api/teacher/session" && request.method === "GET") {
      const connection = await env.DB.prepare(
        "SELECT channel_id,channel_title FROM youtube_connections WHERE teacher_id=?",
      )
        .bind(user.id)
        .first();
      return json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          mustChange: !!user.must_change,
          role: user.role,
        },
        youtube: { configured: youtubeReady(env), connection },
      });
    }
    if (path === "/api/auth/password" && request.method === "POST") {
      const data = z
        .object({
          password: z.string().min(12, "Use at least 12 characters.").max(200),
        })
        .parse(await body(request));
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE teachers SET password_hash=?,must_change=0 WHERE id=?",
        ).bind(await hashPassword(data.password), user.id),
        env.DB.prepare(
          "DELETE FROM sessions WHERE teacher_id=? AND token_hash<>?",
        ).bind(user.id, user.sessionHash),
      ]);
      return json({ ok: true });
    }
    if (path === "/api/teacher/catalog" && request.method === "GET") {
      await mergeStarterFolders(env);
      const folders = (
        await env.DB.prepare(
          "SELECT id,name,description,color FROM folders ORDER BY created_at,id",
        ).all()
      ).results;
      const rows = await env.DB.prepare(
        "SELECT id,folder_id,draft_json,published_json IS NOT NULL AS published,revision,updated_at FROM tutorials WHERE deleted=0 ORDER BY folder_id,sort_order,id",
      )
        .all<{
          id: string;
          folder_id: string;
          draft_json: string;
          published: number;
          revision: number;
          updated_at: string;
        }>();
      return json({
        folders,
        lessons: rows.results.map((r) => ({
          id: r.id,
          folderId: r.folder_id,
          lesson: JSON.parse(r.draft_json),
          published: !!r.published,
          revision: r.revision,
          updatedAt: r.updated_at,
        })),
      });
    }
    if (path === "/api/teacher/folders" && request.method === "POST") {
      const data = folderSchema.parse(await body(request)),
        id = random().slice(0, 24);
      await env.DB.prepare(
        "INSERT INTO folders (id,owner_id,name,description,color,created_at) VALUES (?,?,?,?,?,?)",
      )
        .bind(
          id,
          user.id,
          data.name,
          data.description,
          data.color,
          new Date().toISOString(),
        )
        .run();
      return json({ folder: { id, ...data } }, 201);
    }
    if (path === "/api/teacher/folder" && request.method === "DELETE") {
      const id = idSchema.parse(u.searchParams.get("id"));
      if(id === "unassigned") throw new HttpError(400,"Unassigned cannot be deleted.");
      if(!await env.DB.prepare("SELECT id FROM folders WHERE id=?").bind(id).first()) throw new HttpError(404,"Folder not found.");
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO folders (id,owner_id,name,description,color,created_at) VALUES ('unassigned',?,'Unassigned','Teacher-only drafts. Choose a lesson folder before publishing.','cyan',?)").bind(user.id,new Date().toISOString()),
        env.DB.prepare("UPDATE tutorials SET folder_id='unassigned',published_json=NULL,revision=revision+1,updated_at=? WHERE folder_id=?").bind(new Date().toISOString(),id),
        env.DB.prepare("DELETE FROM folders WHERE id=?").bind(id),
      ]);
      return json({ok:true});
    }
    if (path === "/api/teacher/folder" && request.method === "PUT") {
      const id = idSchema.parse(u.searchParams.get("id")),
        data = folderSchema.parse(await body(request));
      const result = await env.DB.prepare(
        "UPDATE folders SET name=?,description=?,color=? WHERE id=? AND id<>'unassigned'",
      )
        .bind(data.name, data.description, data.color, id)
        .run();
      if (!result.meta.changes) throw new HttpError(404, "Folder not found.");
      return json({ ok: true });
    }
    if (path === "/api/teacher/lessons" && request.method === "POST") {
      const data = z
        .object({
          title: z.string().trim().max(160).optional(),
          videoId: z.string().regex(/^[\w-]{11}$/),
          folderId: idSchema,
        })
        .parse(await body(request));
      const folder = await env.DB.prepare(
        "SELECT name FROM folders WHERE id=?",
      )
        .bind(data.folderId)
        .first<{ name: string }>();
      if (!folder) throw new HttpError(400, "Choose an available folder.");
      const id = random().slice(0, 24),
        lesson = blankLesson(data.title || "Untitled lesson", data.videoId, id, folder.name);
      await env.DB.prepare(
        "INSERT INTO tutorials (id,owner_id,folder_id,draft_json,revision,updated_at,sort_order) VALUES (?,?,?,?,1,?,(SELECT COALESCE(MAX(sort_order),0)+1 FROM tutorials WHERE folder_id=?3 AND deleted=0))",
      )
        .bind(
          id,
          user.id,
          data.folderId,
          JSON.stringify(lesson),
          new Date().toISOString(),
        )
        .run();
      return json(
        {
          entry: {
            id,
            folderId: data.folderId,
            lesson,
            revision: 1,
            published: false,
          },
        },
        201,
      );
    }
    if (path === "/api/teacher/order" && request.method === "PUT") {
      const data=z.object({folderId:idSchema,ids:z.array(idSchema).min(1).max(500)}).parse(await body(request));
      if(new Set(data.ids).size!==data.ids.length)throw new HttpError(400,"Each lesson must appear once.");
      const rows=(await env.DB.prepare("SELECT id FROM tutorials WHERE folder_id=? AND deleted=0").bind(data.folderId).all<{id:string}>()).results;
      if(rows.length!==data.ids.length||rows.some(r=>!data.ids.includes(r.id)))throw new HttpError(409,"The folder changed or contains unavailable lessons. Refresh and try again.");
      const result=await env.DB.prepare("UPDATE tutorials SET sort_order=(SELECT CAST(key AS INTEGER)+1 FROM json_each(?1) WHERE value=tutorials.id) WHERE deleted=0 AND folder_id=?2 AND id IN (SELECT value FROM json_each(?1)) AND (SELECT COUNT(*) FROM tutorials WHERE folder_id=?2 AND deleted=0)=?3").bind(JSON.stringify(data.ids),data.folderId,data.ids.length).run();
      if(result.meta.changes!==data.ids.length)throw new HttpError(409,"The folder changed. Refresh and try again.");
      return json({ok:true});
    }
    if (path === "/api/teacher/lesson" && request.method === "DELETE") {
      const id=idSchema.parse(u.searchParams.get("id"));
      const result=await env.DB.prepare("UPDATE tutorials SET deleted=1,published_json=NULL,revision=revision+1 WHERE id=? AND deleted=0").bind(id).run();
      if(!result.meta.changes)throw new HttpError(404,"Lesson not found.");
      return json({ok:true});
    }
    if (path === "/api/teacher/lesson" && request.method === "PUT") {
      const id = idSchema.parse(u.searchParams.get("id"));
      const data = z
        .object({
          lesson: draftLessonSchema,
          folderId: idSchema,
          revision: z.number().int().positive(),
          action: z.enum(["save", "publish", "unpublish"]),
        })
        .parse(await body(request));
      if (data.lesson.id !== id)
        throw new HttpError(400, "A lesson ID cannot be changed.");
      const folder = await env.DB.prepare(
        "SELECT name FROM folders WHERE id=?",
      )
        .bind(data.folderId)
        .first<{ name: string }>();
      if (!folder) throw new HttpError(400, "Choose an available folder.");
      const lesson = { ...data.lesson, module: folder.name };
      if (data.action === "publish" && data.folderId === "unassigned") throw new HttpError(400,"Choose a lesson folder before publishing.");
      if (data.action === "publish") lessonSchema.parse(lesson);
      const serialized = JSON.stringify(lesson);
      const statement =
        data.action === "save"
          ? "UPDATE tutorials SET sort_order=CASE WHEN folder_id<>?1 THEN (SELECT COALESCE(MAX(sort_order),0)+1 FROM tutorials WHERE folder_id=?1 AND deleted=0) ELSE sort_order END,folder_id=?1,draft_json=?,revision=revision+1,updated_at=? WHERE id=? AND deleted=0 AND revision=?"
          : "UPDATE tutorials SET sort_order=CASE WHEN folder_id<>?1 THEN (SELECT COALESCE(MAX(sort_order),0)+1 FROM tutorials WHERE folder_id=?1 AND deleted=0) ELSE sort_order END,folder_id=?1,draft_json=?,published_json=?,revision=revision+1,updated_at=? WHERE id=? AND deleted=0 AND revision=?";
      const params =
        data.action === "save"
          ? [
              data.folderId,
              serialized,
              new Date().toISOString(),
              id,
              data.revision,
            ]
          : [
              data.folderId,
              serialized,
              data.action === "publish" ? JSON.stringify({ ...lesson, teacherReviewNotes: undefined }) : null,
              new Date().toISOString(),
              id,
              data.revision,
            ];
      const result = await env.DB.prepare(statement)
        .bind(...params)
        .run();
      if (!result.meta.changes)
        throw new HttpError(
          409,
          "This lesson is unavailable or changed in another session. Export your edits, then reopen it from the dashboard.",
        );
      return json({ revision: data.revision + 1, ok: true });
    }
    if (path === "/api/youtube/start" && request.method === "POST")
      return await startConnection(env, user);
    if (path === "/api/youtube/callback" && request.method === "GET")
      return await finishConnection(request, env, user);
    if (path === "/api/youtube/disconnect" && request.method === "POST")
      return await disconnect(env, user);
    if (path === "/api/youtube/import" && request.method === "POST") {
      const data = z
        .object({ videoId: z.string().regex(/^[\w-]{11}$/) })
        .parse(await body(request));
      return json(await importVideo(env, user, data.videoId));
    }
    throw new HttpError(404, "Not found.");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof z.ZodError)
      return json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" · "),
        },
        400,
      );
    console.error(
      "API operation failed",
      e instanceof Error ? e.message : "Unknown error",
    );
    return json(
      { error: "The content service is unavailable. Please try again." },
      503,
    );
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
