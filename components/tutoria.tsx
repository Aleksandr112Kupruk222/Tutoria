"use client";
import Link from "next/link";
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
export function Shell({
  children,
  active = "library",
}: {
  children: ReactNode;
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Layers size={23} />
          </span>
          tutoria<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">THE GAME DEVELOPMENT LAB</div>
        <nav>
          <Link
            className={active === "library" ? "nav-item active" : "nav-item"}
            href="/"
          >
            <LayoutGrid size={19} /> Tutorial library <span>01</span>
          </Link>
          <Link
            className={active === "teacher" ? "nav-item active" : "nav-item"}
            href="/teacher"
          >
            <GraduationCap size={20} /> Teacher studio
          </Link>
        </nav>
        <div className="sidebar-section">YOUR LEARNING SPACE</div>
        <div className="side-note">
          <Code2 size={20} />
          <p>
            A little less rewinding.
            <br />A lot more creating.
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">GD</span>
          <div>
            Game design<span>College learning studio</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {active === "teacher"
                ? "Teacher studio"
                : active === "lesson"
                  ? "Tutorial library / Lesson"
                  : "Tutorial library"}
            </strong>
          </span>
          <span className="prototype">
            <span /> Prototype · sample content
          </span>
        </header>
        <main id="main">{children}</main>
        <footer>
          Made for learning by doing.<span>Tutoria / Game development lab</span>
        </footer>
      </div>
    </div>
  );
}
export function Library() {
  const [q, setQ] = useState(""),
    [difficulty, setDifficulty] = useState("All levels"),
    [module, setModule] = useState("All topics");
  const filtered = lessons.filter(
    (l) =>
      [l.title, l.description, ...l.tags]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (difficulty === "All levels" || l.difficulty === difficulty) &&
      (module === "All topics" || l.module === module),
  );
  return (
    <Shell>
      <div className="page-heading">
        <div className="eyebrow">LEARN. BUILD. MAKE IT YOURS.</div>
        <h1>
          Your next idea starts here<span>.</span>
        </h1>
        <p>Practical game development, one clear step at a time.</p>
      </div>
      <div className="library-heading">
        <h2>
          Tutorial library <span className="count">{lessons.length}</span>
        </h2>
        <span className="muted">Your classroom, at your pace</span>
      </div>
      <div className="filters">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Search tutorials"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tutorials, tools or concepts…"
          />
          {q && (
            <button aria-label="Clear search" onClick={() => setQ("")}>
              <X size={16} />
            </button>
          )}
        </label>
        <label className="select-wrap">
          <SlidersHorizontal size={16} />
          <select
            aria-label="Filter difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["All levels", "Beginner", "Intermediate", "Advanced"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <select
          aria-label="Filter topic"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          {["All topics", ...new Set(lessons.map((l) => l.module))].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <div className="results-label">
        {filtered.length} tutorial{filtered.length !== 1 ? "s" : ""}
        <span>Organised around what you’ll build</span>
      </div>
      {filtered.length ? (
        <div className="library-grid">
          {filtered.map((l) => (
            <Link
              className="lesson-card"
              key={l.id}
              href={`/tutorials/${l.slug}`}
            >
              <div className="lesson-art">
                <img
                  src={`https://i.ytimg.com/vi/${l.media[0].videoId}/hqdefault.jpg`}
                  alt="Godot game development reference video thumbnail"
                />
                <div className="art-shade" />
                <span className="art-label">
                  GODOT 4 <span>•</span> 2D DEVELOPMENT
                </span>
                <span className="play-circle">
                  <Play size={24} fill="currentColor" />
                </span>
                <span className="art-duration">
                  <Clock size={13} />
                  {l.durationMinutes} min lesson
                </span>
              </div>
              <div className="card-content">
                <div className="card-meta">
                  <span className="badge">{l.difficulty}</span>
                  <span>Sample lesson</span>
                </div>
                <h3>
                  {l.title}
                  <ArrowUpRight size={21} />
                </h3>
                <p>{l.description}</p>
                <div className="tags">
                  {l.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="card-foot">
                  <span>
                    <BookOpen size={15} />
                    {l.steps.length} guided steps
                  </span>
                  <span>
                    Open tutorial <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
          <div className="next-card">
            <span className="outline-icon">
              <Layers size={25} />
            </span>
            <div className="eyebrow">A LIBRARY THAT GROWS WITH YOU</div>
            <h3>
              One great lesson.
              <br />
              More possibilities.
            </h3>
            <p>
              This is your first sample tutorial. Your existing lessons will
              find their home here after the prototype review.
            </p>
            <Link href="/teacher">
              Explore teacher studio <ArrowRight size={16} />
            </Link>
            <div className="next-card-bottom">
              Built for your next 17 tutorials — and beyond.
            </div>
          </div>
        </div>
      ) : (
        <div className="empty">
          <Search size={30} />
          <h3>No tutorials found</h3>
          <p>Try another search or a different difficulty.</p>
          <button
            className="primary"
            onClick={() => {
              setQ("");
              setDifficulty("All levels");
              setModule("All topics");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="learning-strip">
        <div>
          <span className="strip-icon">
            <Play size={20} />
          </span>
          <section>
            <h3>Watch with purpose</h3>
            <p>Jump straight to the part you need.</p>
          </section>
        </div>
        <div>
          <span className="strip-icon">
            <Code2 size={20} />
          </span>
          <section>
            <h3>Build step by step</h3>
            <p>Keep clear instructions by your side.</p>
          </section>
        </div>
        <div>
          <span className="strip-icon">
            <Lightbulb size={20} />
          </span>
          <section>
            <h3>Take it further</h3>
            <p>Find your next challenge.</p>
          </section>
        </div>
      </div>
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
}: {
  lesson: Lesson;
  preview?: boolean;
}) {
  const [tab, setTab] = useState("Guide"),
    [step, setStep] = useState(0),
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
      <Link className="back" href={preview ? "/teacher" : "/"}>
        <ArrowLeft size={15} />
        {preview ? "Back to editor" : "All tutorials"}
      </Link>
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
            {preview && <b>Local draft preview</b>}
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
              <iframe
                key={`${mediaId}-${revision}`}
                title={video.title}
                src={`https://www.youtube-nocookie.com/embed/${video.videoId}?start=${seconds}&autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                className="player-cover"
                onClick={() => setPlaying(true)}
                aria-label="Play reference video"
              >
                <img
                  src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
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
                  width: `${(done.length / lesson.steps.length) * 100}%`,
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
            {tabs.map((t) => (
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
            {tab === "Guide" && (
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
                    onClick={() => setStep((v) => v - 1)}
                  >
                    <ArrowLeft size={16} /> Previous
                  </button>
                  {step < lesson.steps.length - 1 ? (
                    <button
                      className="primary"
                      onClick={() => setStep((v) => v + 1)}
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
