"use client";

import Link from "next/link";
import SyncedVideo from "./synced-video";
import {stepAtTime} from "@/lib/playback";

import { useState, useEffect, useRef, type ReactNode } from "react";

import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Code2,
  Layers,
  Search,
  Clock,
  Play,
  GraduationCap,
  ChevronRight,
  Check,
  CheckCircle2,
  Lightbulb,
  Wrench,
  FileText,
  Download,
  Plus,
  SlidersHorizontal,
  Gamepad2,
  LayoutGrid,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

import { lessons, Lesson, stamp } from "@/lib/lessons";

import { api, type Catalog } from "@/lib/api";

import { FolderOpen, LockKeyhole } from "lucide-react";

export function Shell({
  children,
  active = "library",
}: {
  children: ReactNode;
  active?: string;
}) {
  const teacher = active === "teacher";

  return (
    <div className={`app-shell course-shell ${teacher ? "teacher-shell" : ""}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <header className="course-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Layers size={23} />
          </span>
          tutoria<span className="brand-dot">.</span>
        </Link>
        <span className="course-area">
          {teacher ? "TEACHER WORKSPACE" : "DIGITAL TECHNOLOGIES HUB"}
        </span>
        <nav>
          {teacher ? (
            <>
              <Link href="/">
                Student view <ExternalLink size={15} />
              </Link>
              <button
                onClick={async () => {
                  await api("/api/auth/logout", {});
                  window.location.href = "/teacher/login/";
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link className="teacher-login" href="/teacher/login">
              <GraduationCap size={17} /> Teacher login
            </Link>
          )}
        </nav>
      </header>

      <div className="main-shell">
        <main id="main">{children}</main>
        <footer>
          Learn. Create. Collaborate. Succeed.
          <span>Tutoria / Digital Technologies</span>
        </footer>
      </div>
    </div>
  );
}

export function Library({folderPage=false}:{folderPage?:boolean}) {
  const [catalog, setCatalog] = useState<Catalog>({ folders: [], lessons: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [folder, setFolder] = useState(""),
    [query, setQuery] = useState(""),
    [level, setLevel] = useState("All levels");

  const load = () => {
    setLoading(true);
    setError("");
    api<Catalog>("/api/catalog")
      .then(setCatalog)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(()=>{if(folderPage)setFolder(new URLSearchParams(window.location.search).get("id")||"");load();}, [folderPage]);

  const selected = catalog.folders.find((f) => f.id === folder);
  const results = catalog.lessons.filter(
    (e) =>
      (!folderPage || (!!folder && e.folderId === folder)) &&
      (level === "All levels" || e.lesson.difficulty === level) &&
      [e.lesson.title, e.lesson.description, ...e.lesson.tags]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <Shell>
      {!folderPage && <><div className="page-heading">
        <div className="eyebrow">DIGITAL TECHNOLOGIES</div>
        <h1>
          Build skills. <span>Create possibilities.</span>
        </h1>
        <p>
          Your lesson videos, practical guides and challenges. All in one place.
        </p>
        <div className="hero-motto">LEARN | CREATE | COLLABORATE | SUCCEED</div>
      </div>
      <div className="start-panel">
        <div className="eyebrow">START HERE</div>
        <h2>Choose what you’re learning</h2>
        <p>Open a lesson folder to find your videos and step-by-step guides.</p>
      </div>

      </>}
      {folderPage && <><Link className="back" href="/">← All folders</Link><div className="library-heading"><div><div className="eyebrow">LESSON FOLDER</div><h1>{selected?.name || (loading?"Loading folder…":"Folder unavailable")}</h1><p>{selected?.description}</p></div></div></>}
      {error && (
        <div className="status error" role="alert">
          {error} <button onClick={load}>Try again</button>
        </div>
      )}

      {!folderPage && <>
      <div className="library-heading">
        <div>
          <div className="eyebrow">YOUR LEARNING SPACE</div>
          <h2>Lesson folders</h2>
        </div>
        {folder && (
          <button className="secondary" onClick={() => setFolder("")}>
            All folders
          </button>
        )}
      </div>

      {loading ? (
        <p role="status">Loading lesson folders…</p>
      ) : (
        <div className="folder-grid">
          {catalog.folders.map((f) => (
            <Link
              key={f.id}
              className={`folder-card tone-${f.color} ${folder === f.id ? "chosen" : ""}`}
              href={`/folder/?id=${encodeURIComponent(f.id)}`}
            >
              <FolderOpen size={25} />
              <span className="folder-teacher">
                LESSON FOLDER
              </span>
              <h3>{f.name}</h3>
              <p>{f.description}</p>
              <span className="folder-bottom">
                {catalog.lessons.filter((l) => l.folderId === f.id).length}{" "}
                published lessons <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && !catalog.folders.length && (
        <div className="empty">
          <FolderOpen size={30} />
          <h3>Your learning space is ready</h3>
          <p>Folders will appear here when your teachers create them.</p>
          <Link
            className="secondary"
            href="/tutorials/your-first-player-controller/"
          >
            Explore the example lesson
          </Link>
        </div>
      )}

      </>}
      <div className="library-heading">
        <h2>{folderPage ? "Lessons" : "Search all lessons"}</h2>
        <span className="muted">{folderPage||query||level!=="All levels" ? `${results.length} lessons` : ""}</span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search tutorials"
            placeholder="Find a lesson or topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter difficulty"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          {["All levels", "Beginner", "Intermediate", "Advanced"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      {(folderPage||query.trim()||level!=="All levels") && <div className="student-lesson-list">
        {results.map(({ id, lesson: l }) => (
          <Link
            href={`/lesson/?id=${encodeURIComponent(id)}`}
            className="lesson-card student-lesson-row"
            key={id}
          >
            <div className="lesson-art">
              <img
                src={`https://i.ytimg.com/vi/${l.media[0].videoId}/mqdefault.jpg`}
                alt={l.title}
              />
              <span className="play-circle">
                <Play size={23} />
              </span>
            </div>
            <div className="card-content">
              <span className="badge">{l.difficulty}</span>
              <h3>
                {l.title}
                <ArrowUpRight size={20} />
              </h3>
              <p>{l.description}</p>
              <div className="card-foot">
                <span>{l.steps.length} steps</span>
                <span>{l.durationMinutes} min lesson</span>
              </div>
            </div>
          </Link>
        ))}
      </div>}
      {!folderPage && !query.trim() && level==="All levels" && <p className="editor-help">Open a folder above, or search across every published lesson.</p>}
      {!loading && !error && (folderPage||query.trim()||level!=="All levels") && !results.length && catalog.folders.length > 0 && (
        <div className="empty">
          <BookOpen size={28} />
          <h3>
            {query || level !== "All levels"
              ? "No matching lessons"
              : "No published lessons yet"}
          </h3>
          <p>
            {query || level !== "All levels"
              ? "Try another search or difficulty."
              : "Your teacher is preparing this folder. Check back when your lesson is ready."}
          </p>
          {(query || level !== "All levels") && (
            <button
              className="secondary"
              onClick={() => {
                setQuery("");
                setLevel("All levels");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}

const tabs = [
  "Guide",

  "Transcript",

  "Concepts",

  "Troubleshooting",

  "Extensions",

  "Quiz",

  "Resources",
];

export function LessonView({
  lesson,

  preview = false,
  onExitPreview,
  folderId,
}: {
  lesson: Lesson;

  preview?: boolean;
  onExitPreview?:()=>void;
  folderId?:string;
}) {
  const [tab, setTab] = useState("Guide"),
    [step, setStep] = useState(0),
    [follow, setFollow] = useState(true),
    [playing, setPlaying] = useState(false),
    [seconds, setSeconds] = useState(0),
    [mediaId, setMediaId] = useState(lesson.media[0].id),
    [revision, setRevision] = useState(0),
    [done, setDone] = useState<string[]>([]),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [checked, setChecked] = useState(false),
    [search, setSearch] = useState("");

  const video = lesson.media.find((m) => m.id === mediaId) || lesson.media[0];

  const seek = (s: number, id: string) => {
    setSeconds(s);

    setMediaId(id);

    setRevision((v) => v + 1);

    setPlaying(true);
  };

  const current = lesson.steps[step];

  return (
    <Shell active="lesson">
      {preview?<button className="back" onClick={onExitPreview}><ArrowLeft size={15}/>Back to editor</button>:<Link className="back" href={folderId?`/folder/?id=${encodeURIComponent(folderId)}`:"/"}><ArrowLeft size={15}/>{folderId?"Back to folder":"All tutorials"}</Link>}
      <div className="lesson-heading">
        <div>
          <div className="eyebrow">
            {lesson.module} <span>/</span> {lesson.tags[0]}
          </div>

          <h1>{lesson.title}</h1>

          <p>{lesson.description}</p>

          <div className="lesson-meta">
            <span className="badge">{lesson.difficulty}</span>

            <span>
              <Clock size={15} />
              {lesson.durationMinutes} min
            </span>

            <span>
              <BookOpen size={15} />
              {lesson.steps.length} steps
            </span>

            {preview && <b>Draft preview</b>}
          </div>
        </div>
      </div>

      {lesson.sample && (
        <div className="sample-note">
          Sample lesson: the guide, transcript and timestamps are illustrative.
          The GDQuest reference video demonstrates playback and is not a
          matching recording.
        </div>
      )}

      <div className="lesson-layout">
        <div className="watch-column">
          <div className="player">
            {playing ? (
              <SyncedVideo videoId={video.videoId} title={video.title} seconds={seconds} requestId={revision} onTime={time=>{if(follow){const next=stepAtTime(lesson.steps,mediaId,time);setStep(next);}}}/>

            ) : (
              <button
                className="player-cover"

                onClick={() => setPlaying(true)}

                aria-label="Play lesson video"
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}

                  alt="Video thumbnail"
                />

                <span className="play-circle">
                  <Play fill="currentColor" />
                </span>

                <strong>Watch the tutorial</strong>
              </button>
            )}
          </div>

          <div className="video-caption">
            <span>{video.title}</span>

            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}&t=${seconds}s`}

              target="_blank"

              rel="noreferrer"

              aria-label="Open video on YouTube"
            >
              <ExternalLink size={16} />
            </a>
          </div>

          {lesson.media.length > 1 && (
            <select
              aria-label="Select video"

              value={mediaId}

              onChange={(e) => {
                setMediaId(e.target.value);
                setStep(stepAtTime(lesson.steps,e.target.value,0));

                setSeconds(0);

                setRevision((v) => v + 1);
              }}
            >
              {lesson.media.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          )}

          <label className="follow-video"><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/> Follow video in the step guide</label>
          <div className="chapter-panel">
            <div className="chapter-title">
              <h2>In this tutorial</h2>

              <span>
                {done.length}/{lesson.steps.length}
              </span>
            </div>

            <div className="progress-track">
              <div
                style={{
                  width: `${(done.length / Math.max(1,lesson.steps.length)) * 100}%`,
                }}
              />
            </div>

            {lesson.steps.map((s, i) => (
              <button
                key={s.id}

                className={`chapter ${step === i ? "selected" : ""}`}

                onClick={() => {
                  setStep(i);

                  setTab("Guide");

                  seek(s.seconds, s.mediaId);
                }}
              >
                <span className="chapter-number">
                  {done.includes(s.id) ? (
                    <Check size={15} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>

                <span>{s.title}</span>

                <time>{stamp(s.seconds)}</time>
              </button>
            ))}

            <p className="local-note">Step checks last for this visit.</p>
          </div>

          <div className="objectives">
            <h3>
              <GraduationCap size={20} /> What you’ll learn
            </h3>

            {lesson.objectives.map((o) => (
              <p key={o}>
                <CheckCircle2 size={16} />

                {o}
              </p>
            ))}
          </div>
        </div>

        <div className="reading-column">
          <div className="tabs" role="tablist" aria-label="Lesson sections">
            {tabs
              .filter(
                (t) =>
                  t === "Guide" ||
                  t === "Transcript" ||
                  (t === "Concepts" && lesson.concepts.length) ||
                  (t === "Troubleshooting" && lesson.troubleshooting.length) ||
                  (t === "Extensions" &&
                    lesson.extensions.some((e) => e.title.trim())) ||
                  (t === "Quiz" && lesson.quiz.length) ||
                  (t === "Resources" && lesson.resources.length),
              )
              .map((t) => (
                <button
                  key={t}

                  role="tab"

                  aria-selected={tab === t}

                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
          </div>

          <div className="lesson-body" role="tabpanel" aria-label={tab}>
            {tab === "Guide" && !current && <p>No guide steps are available for this video.</p>}
            {tab === "Guide" && current && (
              <>
                <div className="step-top">
                  <span className="eyebrow">
                    STEP {String(step + 1).padStart(2, "0")} OF{" "}
                    {String(lesson.steps.length).padStart(2, "0")}
                  </span>

                  <button
                    className="timestamp"

                    onClick={() => seek(current.seconds, current.mediaId)}
                  >
                    <Play size={13} />
                    {stamp(current.seconds)} in video
                  </button>
                </div>

                <h2>{current.title}</h2>

                <p className="instruction">{current.body}</p>

                {current.code && (
                  <div className="code-block">
                    <div>
                      player.gd <span>GDScript</span>
                    </div>

                    <pre>
                      <code>{current.code}</code>
                    </pre>
                  </div>
                )}

                <div className="checkpoint">
                  <CheckCircle2 size={21} />

                  <div>
                    <h3>Before you move on</h3>

                    <p>{current.check}</p>
                  </div>
                </div>

                <label className="step-check">
                  <input
                    type="checkbox"

                    checked={done.includes(current.id)}

                    onChange={(e) =>
                      setDone(
                        e.target.checked
                          ? [...done, current.id]
                          : done.filter((x) => x !== current.id),
                      )
                    }
                  />{" "}
                  I’ve completed this step
                </label>

                <div className="step-nav">
                  <button
                    disabled={step === 0}

                    onClick={() => {setFollow(false);setStep((v) => v - 1);}}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>

                  {step < lesson.steps.length - 1 ? (
                    <button
                      className="primary"

                      onClick={() => {setFollow(false);setStep((v) => v + 1);}}
                    >
                      Next step <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button className="primary" onClick={() => setTab("Quiz")}>
                      Try the knowledge check <ArrowRight size={16} />
                    </button>
                  )}
                </div>

                <button
                  className="help-link"

                  onClick={() => setTab("Troubleshooting")}
                >
                  <Wrench size={15} /> Something not working? Explore
                  troubleshooting <ChevronRight size={16} />
                </button>
              </>
            )}

            {tab === "Transcript" && (
              <>
                <div className="eyebrow">READ ALONG</div>

                <h2>
                  {lesson.sample ? "Sample transcript" : "Full transcript"}
                </h2>

                <label className="search">
                  <Search size={18} />

                  <input
                    placeholder="Find a word or phrase…"

                    aria-label="Search transcript"

                    value={search}

                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>

                {lesson.transcript

                  .filter((s) =>
                    s.text.toLowerCase().includes(search.toLowerCase()),
                  )

                  .map((s, i) => (
                    <div className="transcript-row" key={i}>
                      <button
                        className="timestamp"

                        onClick={() => seek(s.seconds, s.mediaId)}
                      >
                        {stamp(s.seconds)}
                      </button>

                      <p>{s.text}</p>
                    </div>
                  ))}

                {!lesson.transcript.some((s) =>
                  s.text.toLowerCase().includes(search.toLowerCase()),
                ) && <p>No matching transcript segments.</p>}
              </>
            )}

            {tab === "Concepts" && (
              <>
                <div className="eyebrow">KNOW THE LANGUAGE</div>

                <h2>Key concepts</h2>

                {lesson.concepts.map((c) => (
                  <div className="definition" key={c.term}>
                    <h3>{c.term}</h3>

                    <p>{c.definition}</p>
                  </div>
                ))}
              </>
            )}

            {tab === "Troubleshooting" && (
              <>
                <div className="eyebrow">GET UNSTUCK</div>

                <h2>A small fix can change everything.</h2>

                {lesson.troubleshooting.map((t) => (
                  <details key={t.problem}>
                    <summary>
                      {t.problem}

                      <Plus size={18} />
                    </summary>

                    <p>{t.solution}</p>
                  </details>
                ))}
              </>
            )}

            {tab === "Extensions" && (
              <>
                <div className="eyebrow">MAKE IT YOUR OWN</div>

                <h2>Ready for another challenge?</h2>

                <p className="muted">Choose the level that stretches you.</p>

                {lesson.extensions.map((e) => (
                  <div className="extension" key={e.level}>
                    <span className="badge">{e.level}</span>

                    <h3>{e.title}</h3>

                    <p>{e.body}</p>
                  </div>
                ))}
              </>
            )}

            {tab === "Quiz" && (
              <>
                <div className="eyebrow">PAUSE & REFLECT</div>

                <h2>Check your understanding</h2>

                <p className="muted">
                  No grades. Just a chance to see what’s clicked.
                </p>

                {lesson.quiz.map((q, i) => (
                  <fieldset className="quiz-question" key={q.id}>
                    <legend>
                      {i + 1}. {q.question}
                    </legend>

                    {q.options.map((o, j) => (
                      <label
                        className={checked && j === q.answer ? "correct" : ""}

                        key={j}
                      >
                        <input
                          type="radio"

                          name={q.id}

                          checked={answers[q.id] === j}

                          disabled={checked}

                          onChange={() => setAnswers({ ...answers, [q.id]: j })}
                        />

                        {o}
                      </label>
                    ))}

                    {checked && (
                      <p className="feedback">
                        {answers[q.id] === q.answer
                          ? "Correct."
                          : "Take another look."}{" "}
                        {q.explanation}
                      </p>
                    )}
                  </fieldset>
                ))}

                {checked ? (
                  <div aria-live="polite">
                    <strong>
                      {
                        lesson.quiz.filter((q) => answers[q.id] === q.answer)
                          .length
                      }{" "}
                      of {lesson.quiz.length} correct
                    </strong>

                    <button
                      className="secondary"

                      onClick={() => {
                        setAnswers({});

                        setChecked(false);
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <button
                    className="primary"

                    disabled={
                      Object.keys(answers).length !== lesson.quiz.length
                    }

                    onClick={() => setChecked(true)}
                  >
                    Check my answers <Check size={17} />
                  </button>
                )}
              </>
            )}

            {tab === "Resources" && (
              <>
                <div className="eyebrow">KEEP EXPLORING</div>

                <h2>Your toolkit</h2>

                {lesson.resources.map((r) => (
                  <a
                    className="resource"

                    key={r.url}

                    href={r.url}

                    target="_blank"

                    rel="noreferrer"
                  >
                    <BookOpen size={22} />

                    <div>
                      <h3>{r.title}</h3>

                      <p>{r.description}</p>
                    </div>

                    <ArrowUpRight size={20} />
                  </a>
                ))}

                <button
                  className="secondary"

                  onClick={() => {
                    const blob = new Blob(
                      [
                        lesson.steps

                          .map(
                            (s, i) =>
                              `${i + 1}. ${s.title}\n${s.body}\n${s.code || ""}\nCheckpoint: ${s.check}`,
                          )

                          .join("\n\n"),
                      ],

                      { type: "text/plain" },
                    );

                    const u = URL.createObjectURL(blob),
                      a = document.createElement("a");

                    a.href = u;

                    a.download = `${lesson.slug}-guide.txt`;

                    a.click();

                    URL.revokeObjectURL(u);
                  }}
                >
                  <Download size={16} /> Download written guide
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
