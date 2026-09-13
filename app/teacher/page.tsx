"use client";
import AdminPanel from "@/components/admin-panel";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/tutoria";
import LessonEditor from "@/components/lesson-editor";
import {
  api,
  type Catalog,
  type Entry,
  type Folder,
  type Session,
} from "@/lib/api";
import { youtubeId, parseTranscript, type Lesson } from "@/lib/lessons";
import {buildTranscriptDraft} from "@/lib/draft-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  FolderOpen,
  Video,
  ArrowRight,
  ExternalLink,
  Settings2,
  CheckCircle2,
} from "lucide-react";
export default function Teacher() {
  const [session, setSession] = useState<Session | null>(null),
    [catalog, setCatalog] = useState<Catalog>({ folders: [], lessons: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState<"list" | "folder" | "video">("list"),
    [dragId, setDragId] = useState(""),
    [dropId, setDropId] = useState(""),
    [folderId, setFolderId] = useState(""),
    [folderEdit, setFolderEdit] = useState<Folder | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [color, setColor] = useState<Folder["color"]>("cyan"),
    [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [targetFolder, setTargetFolder] = useState(""),
    [deletingFolder, setDeletingFolder] = useState(false),
    [deleting, setDeleting] = useState<Entry | null>(null),
    [editing, setEditing] = useState<Entry | null>(null),
    [password, setPassword] = useState(""), [transcriptText,setTranscriptText]=useState("");
  useEffect(()=>{
    const sync=()=>{setFolderId(new URLSearchParams(window.location.search).get("folder")||"");setDeleting(null);setView("list");};
    sync();window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);
  },[]);
  const openFolder=(id:string)=>{setDeletingFolder(false);setFolderId(id);setTargetFolder(id);setView("list");setDeleting(null);setNotice("");setError("");window.history.pushState({},"",id?`/teacher/?folder=${encodeURIComponent(id)}`:"/teacher/");};
  const refresh = async () => {
    const s = await api<Session>("/api/teacher/session");
    setSession(s);
    if (!s.user.mustChange && s.user.role !== "admin") {
      const c = await api<Catalog>("/api/teacher/catalog");
      setCatalog(c);
      setTargetFolder((v) => v || c.folders[0]?.id || "");
    }
  };
  useEffect(() => {
    refresh()
      .catch((e) => {
        if (e.status === 401) window.location.replace("/teacher/login/");
        else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (loading)
    return (
      <Shell active="teacher">
        <p role="status">Opening your workspace…</p>
      </Shell>
    );
  if (!session)
    return (
      <Shell>
        <div className="empty">
          <h2>Unable to open the dashboard</h2>
          <p role="alert">{error}</p>
          <Link className="primary" href="/teacher/login/">
            Return to login
          </Link>
        </div>
      </Shell>
    );
  if (session.user.mustChange)
    return (
      <Shell active="teacher">
        <form
          className="password-form editor-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api("/api/auth/password", { password });
              await refresh();
            });
          }}
        >
          <div className="eyebrow">WELCOME, {session.user.name}</div>
          <h1>Make this account yours.</h1>
          <p>
            Replace the temporary password before opening your workspace.
          </p>
          <label>
            New password — at least 12 characters
            <Input
              type="password"
              minLength={12}
              maxLength={200}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="status error">
              {error}
            </p>
          )}
          <Button type="submit" className="primary" disabled={busy}>
            Set password & open dashboard
          </Button>
        </form>
      </Shell>
    );
  if (session.user.role === "admin") return <AdminPanel session={session}/>;
  if (editing)
    return (
      <LessonEditor
        key={editing.id}
        initial={editing.lesson}
        onClose={() => {
          setEditing(null);
          void refresh();
        }}
        onSave={async (lesson: Lesson, action: "save" | "publish") => {
          const result = await api<{ revision: number }>(
            `/api/teacher/lesson?id=${editing.id}`,
            {
              lesson,
              folderId: editing.folderId,
              revision: editing.revision,
              action,
            },
            "PUT",
          );
          setEditing({
            ...editing,
            lesson,
            revision: result.revision,
            published: action === "publish" || editing.published,
          });
        }}
      />
    );
  const reorder = async (id:string,direction:number) => {
    const entry=catalog.lessons.find(l=>l.id===id)!;
    const ids=catalog.lessons.filter(l=>l.folderId===entry.folderId).map(l=>l.id);
    const index=ids.indexOf(id),other=index+direction;
    if(other<0||other>=ids.length)return;
    [ids[index],ids[other]]=[ids[other],ids[index]];
    await run(async()=>{await api("/api/teacher/order",{folderId:entry.folderId,ids},"PUT");await refresh();setNotice("Lesson order saved. Students see published lessons in this order.");});
  };
  const dropLesson = async (target:string) => {
    const source=dragId;setDragId("");setDropId("");
    if(busy||!source||source===target)return;
    const ids=catalog.lessons.filter(l=>l.folderId===folderId).map(l=>l.id);
    const from=ids.indexOf(source),to=ids.indexOf(target);
    if(from<0||to<0)return;
    ids.splice(from,1);ids.splice(to,0,source);
    await run(async()=>{await api("/api/teacher/order",{folderId,ids},"PUT");await refresh();setNotice("Lesson order saved.");});
  };
  const folders = catalog.folders;
  const filtered = catalog.lessons.filter(
    (l) => !folderId || l.folderId === folderId,
  );
  return (
    <Shell active="teacher">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">YOUR TEACHING WORKSPACE</div>
          <h1>
            Hello, <span>{session.user.name}.</span>
          </h1>
          <p>
            Give every lesson a home. Turn your tutorials into something
            students can follow.
          </p>
        </div>
        <Button
          className="primary"
          onClick={() => {
            if(folderId)setTargetFolder(folderId);
            setView("video");
            setTitle("");
            setUrl("");
            setError("");
          }}
        >
          <Plus size={17} />
          Add a video
        </Button>
      </div>
      {error && (
        <div className="status error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="status" role="status">
          {notice}
        </div>
      )}

      {view === "folder" && (
        <form
          className="dashboard-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api(
                folderEdit
                  ? `/api/teacher/folder?id=${folderEdit.id}`
                  : "/api/teacher/folders",
                { name, description, color },
                folderEdit ? "PUT" : "POST",
              );
              await refresh();
              setView("list");
              setNotice(folderEdit ? "Folder updated." : "Folder created.");
            });
          }}
        >
          <h2>{folderEdit ? "Edit folder" : "Create a lesson folder"}</h2>
          <div className="two-fields">
            <label>
              Folder name
              <Input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Unreal Engine"
              />
            </label>
            <label>
              Colour
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as Folder["color"])}
              >
                <option value="cyan">Cyan</option>
                <option value="magenta">Magenta</option>
                <option value="green">Green</option>
              </select>
            </label>
          </div>
          <label>
            Short description
            <Textarea
              maxLength={350}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <Button className="primary" disabled={busy} type="submit">
              Save folder
            </Button>
            <Button
              className="secondary"
              type="button"
              onClick={() => setView("list")}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {view === "video" && (
        <form
          className="dashboard-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const videoId = youtubeId(url);
              if (!videoId) throw Error("Paste a valid HTTPS YouTube link.");


              const lessonTitle=title.trim()||'';
              const r = await api<{entry:Entry}>('/api/teacher/lessons',{title:lessonTitle,videoId,folderId:targetFolder});
              let entry=r.entry;
              const transcript=transcriptText.trim()?parseTranscript(transcriptText,'screen'):[];
              if(transcript.length){const generated=buildTranscriptDraft({...entry.lesson,transcript},'');
                try{const saved=await api<{revision:number}>(`/api/teacher/lesson?id=${entry.id}`,{lesson:generated.lesson,folderId:entry.folderId,revision:entry.revision,action:'save'},'PUT');entry={...entry,lesson:generated.lesson,revision:saved.revision};}catch{entry={...entry,lesson:generated.lesson};}
              }
              setEditing(entry);
              setView("list");
            });
          }}
        >
          <div className="eyebrow">START A NEW LESSON</div>
          <h2>Add your video</h2>
          <p>
            Paste your video link and choose a folder. You can add captions now or later in Prepare with AI.
          </p>
          <label>
            YouTube URL
            <Input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </label>
          <div className="two-fields">
            <label>
              Lesson title (optional — add it later)
              <Input
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Lesson folder
              <select
                required
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
              >
                <option value="" disabled>
                  Choose a folder
                </option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>Transcript (optional fallback)<Textarea value={transcriptText} onChange={e=>setTranscriptText(e.target.value)} placeholder="Paste timed captions here to start your draft."/></label>
          <div className="form-actions">
            <Button className="primary" type="submit" disabled={busy}>
              {busy?'Building draft…':'Create draft'} <ArrowRight size={17} />
            </Button>
            <Button
              className="secondary"
              type="button"
              onClick={() => setView("list")}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
      {!folderId && <>
      <div className="library-heading">
        <h2>Shared lesson folders</h2>
        <Button
          className="secondary"
          onClick={() => {
            setFolderEdit(null);
            setName("");
            setDescription("");
            setColor("cyan");
            setView("folder");
            setError("");
          }}
        >
          <Plus size={16} />
          New folder
        </Button>
      </div>
      <div className="folder-grid">
        {folders.map((f) => (
          <div
            key={f.id}
            className={`folder-card tone-${f.color} ${folderId === f.id ? "chosen" : ""}`}
          >
            <button
              className="folder-main"
              onClick={() => openFolder(f.id)}
              aria-pressed={folderId === f.id}
            >
              <FolderOpen size={25} />
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <span className="folder-bottom">
                {catalog.lessons.filter((l) => l.folderId === f.id).length}{" "}
                lessons <ArrowRight size={16} />
              </span>
            </button>
            {f.id !== "unassigned" && <button
              className="folder-edit"
              aria-label={`Edit ${f.name}`}
              onClick={() => {
                setFolderEdit(f);
                setName(f.name);
                setDescription(f.description);
                setColor(f.color);
                setView("folder");
              }}
            >
              <Settings2 size={16} />
            </button>}
          </div>
        ))}
      </div>
      </>}
      {folderId && <>
      <div className="library-heading">
        <h2>
          {folderId
            ? folders.find((f) => f.id === folderId)?.name
            : "All your lessons"}
        </h2>
        {folderId && (
          <button className="secondary" onClick={() => openFolder("")}>
            ← All folders
          </button>
        )}
      </div>
      {folderId !== "unassigned" && <Button className="secondary" disabled={busy} onClick={()=>setDeletingFolder(true)}>Delete folder</Button>}
      {folderId === "unassigned" && <p className="status">Only teachers can see this folder. Move your lessons to a shared folder before publishing.</p>}
      {deletingFolder && <section className="exchange-stage"><h2>Delete this shared folder?</h2><p>Lessons from every teacher will be moved to Unassigned and returned to drafts. No videos or lesson content will be deleted.</p><div className="editor-actions"><Button className="primary" disabled={busy} onClick={()=>void run(async()=>{await api(`/api/teacher/folder?id=${encodeURIComponent(folderId)}`,{},"DELETE");await refresh();openFolder("unassigned");setNotice("Folder deleted. Lessons are safely stored in Unassigned as drafts.");})}>Delete folder and keep lessons</Button><Button className="secondary" disabled={busy} onClick={()=>setDeletingFolder(false)}>Cancel</Button></div></section>}
      {deleting && <section className="exchange-stage"><h2>Delete {deleting.lesson.title}?</h2><p>This removes the lesson from your dashboard and student view, including any published version.</p><div className="editor-actions"><Button disabled={busy} className="primary" onClick={()=>void run(async()=>{await api(`/api/teacher/lesson?id=${deleting.id}`,{},"DELETE");setDeleting(null);await refresh();setNotice("Lesson deleted.");})}>Delete lesson</Button><Button className="secondary" onClick={()=>setDeleting(null)}>Cancel</Button></div></section>}
      <p className="editor-help">You are viewing your lessons in this shared folder. Drag the grip on a lesson to reorder it. You can also use Move up and Move down. New videos are added at the end.</p>
      <div className="lesson-table">
        {filtered.map((e) => (
          <div className={`lesson-row draggable-lesson ${dragId===e.id?"is-dragging":""} ${dropId===e.id?"drop-target":""}`} key={e.id}
            onDragOver={event=>{if(!busy&&dragId&&dragId!==e.id){event.preventDefault();event.dataTransfer.dropEffect="move";setDropId(e.id);}}}
            onDrop={event=>{event.preventDefault();void dropLesson(e.id);}}>
            <button type="button" className="drag-handle" draggable={!busy} disabled={busy} aria-label={`Drag to reorder ${e.lesson.title}`}
              onDragStart={event=>{event.dataTransfer.setData("text/plain",e.id);event.dataTransfer.effectAllowed="move";setDragId(e.id);}}
              onDragEnd={()=>{setDragId("");setDropId("");}}>⠿</button>
            <img
              src={`https://i.ytimg.com/vi/${e.lesson.media[0].videoId}/mqdefault.jpg`}
              alt=""
            />
            <div className="lesson-row-title">
              <h3>{e.lesson.title}</h3>
              <span className={`badge ${e.published ? "" : "draft-badge"}`}>
                {e.published ? "Published" : "Draft"}
              </span>
            </div>
            <label className="assign-folder">
              <span>Folder</span>
              <select
                aria-label={`Folder for ${e.lesson.title}`}
                disabled={busy}
                value={e.folderId}
                onChange={(event) => {
                  const id = event.target.value;
                  void run(async () => {
                    await api(
                      `/api/teacher/lesson?id=${e.id}`,
                      {
                        lesson: e.lesson,
                        folderId: id,
                        revision: e.revision,
                        action: "save",
                      },
                      "PUT",
                    );
                    await refresh();
                    setNotice("Lesson moved to its new folder.");
                  });
                }}
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="row-actions">
              <Button className="secondary" disabled={busy||catalog.lessons.filter(l=>l.folderId===e.folderId)[0]?.id===e.id} aria-label={`Move ${e.lesson.title} up`} onClick={()=>void reorder(e.id,-1)}>Move up</Button>
              <Button className="secondary" disabled={busy||catalog.lessons.filter(l=>l.folderId===e.folderId).at(-1)?.id===e.id} aria-label={`Move ${e.lesson.title} down`} onClick={()=>void reorder(e.id,1)}>Move down</Button>
              <Button className="secondary" disabled={busy} onClick={()=>setDeleting(e)}>Delete</Button>
              <Button className="secondary" onClick={() => setEditing(e)}>
                Edit content
              </Button>
              {e.published && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `/api/teacher/lesson?id=${e.id}`,
                        {
                          lesson: e.lesson,
                          folderId: e.folderId,
                          revision: e.revision,
                          action: "unpublish",
                        },
                        "PUT",
                      );
                      await refresh();
                      setNotice(
                        "Lesson returned to draft. It is no longer visible to students.",
                      );
                    })
                  }
                >
                  Unpublish
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <Video size={28} />
          <h3>No lessons here yet</h3>
          <p>Add a video to start your first draft.</p>
        </div>
      )}
      </>}
    </Shell>
  );
}
