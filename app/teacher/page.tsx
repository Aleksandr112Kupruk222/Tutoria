"use client";
import { useEffect, useState } from "react";
import { Shell, LessonView } from "@/components/tutoria";
import {
  Lesson,
  sampleLesson,
  lessonSchema,
  parseTranscript,
  youtubeId,
} from "@/lib/lessons";
import { Download, Eye, Save, Upload, Plus, Trash2 } from "lucide-react";
const key = "tutoria.teacher-draft.v1";
const sections = [
  "Overview",
  "Video & transcript",
  "Learning objectives",
  "Steps & chapters",
  "Key concepts",
  "Troubleshooting",
  "Extension activities",
  "Knowledge check",
  "Resources",
  "Structured JSON",
];
export default function Teacher() {
  const [draft, setDraft] = useState<Lesson>(sampleLesson),
    [section, setSection] = useState(sections[0]),
    [status, setStatus] = useState(""),
    [error, setError] = useState(false),
    [preview, setPreview] = useState(false),
    [raw, setRaw] = useState(""),
    [json, setJson] = useState(""),
    [url, setUrl] = useState(
      `https://www.youtube.com/watch?v=${sampleLesson.media[0].videoId}`,
    ),
    [loaded, setLoaded] = useState(false);
  const notify = (s: string, e = false) => {
    setStatus(s);
    setError(e);
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const d = lessonSchema.parse(JSON.parse(saved));
        setDraft(d);
        setUrl(`https://www.youtube.com/watch?v=${d.media[0].videoId}`);
      }
    } catch {
      notify(
        "The saved draft could not be read. Your sample lesson is available; import a backup to recover your draft.",
        true,
      );
    }
    setLoaded(true);
  }, []);
  const update = (patch: Partial<Lesson>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus("Unsaved changes — save a local draft or export a backup.");
    setError(false);
  };
  const validate = () => {
    const r = lessonSchema.safeParse(draft);
    if (!r.success) {
      notify(
        r.error.issues
          .map((i) => `${i.path.join(".") || "Lesson"}: ${i.message}`)
          .join(" · "),
        true,
      );
      return false;
    }
    return true;
  };
  const save = () => {
    if (!validate()) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
      notify(
        "Draft saved in this browser. Export JSON to keep a portable backup.",
      );
    } catch {
      notify(
        "Browser storage is unavailable or full. Export JSON to save your work.",
        true,
      );
    }
  };
  const exportDraft = () => {
    if (!validate()) return;
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `${draft.slug}.json`;
    a.click();
    URL.revokeObjectURL(u);
    notify(
      "Validated lesson exported. Publishing to students requires adding it to the content collection and rebuilding the site.",
    );
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw Error("Use a JSON file smaller than 2 MB.");
      const d = lessonSchema.parse(JSON.parse(await file.text()));
      setDraft(d);
      setUrl(`https://www.youtube.com/watch?v=${d.media[0].videoId}`);
      notify("Lesson imported for review. Save your local draft when ready.");
    } catch (e) {
      notify(
        `Import failed: ${e instanceof Error ? e.message : "Invalid content"}`,
        true,
      );
    }
  };
  if (preview)
    return (
      <>
        <div className="preview-banner">
          <strong>Local draft preview</strong>
          <button onClick={() => setPreview(false)}>Return to editor</button>
        </div>
        <LessonView lesson={draft} preview />
      </>
    );
  return (
    <Shell active="teacher">
      <div className="editor-top">
        <div>
          <div className="eyebrow">TEACHER STUDIO</div>
          <h1>Great lessons start here.</h1>
          <p>Shape the details. Give your students a clearer path.</p>
        </div>
        <div className="editor-actions">
          <button className="secondary" disabled={!loaded} onClick={save}>
            <Save size={15} /> Save draft
          </button>
          <button
            className="primary"
            onClick={() => {
              if (validate()) setPreview(true);
            }}
          >
            <Eye size={15} /> Preview lesson
          </button>
        </div>
      </div>
      <div className="sample-note">
        Prototype editor · Drafts stay in this browser and are not published to
        students. No teacher authentication or AI generation is connected yet.
      </div>
      {status && (
        <div
          role={error ? "alert" : "status"}
          className={`status ${error ? "error" : ""}`}
        >
          {status}
        </div>
      )}
      <div className="editor-layout">
        <aside className="editor-nav">
          {sections.map((s) => (
            <button
              className={section === s ? "active" : ""}
              key={s}
              onClick={() => {
                if (s === "Structured JSON")
                  setJson(JSON.stringify(draft, null, 2));
                setSection(s);
              }}
            >
              {s}
            </button>
          ))}
          <p className="editor-note">
            1. Import your transcript
            <br />
            2. Review and edit the lesson
            <br />
            3. Preview the student view
            <br />
            4. Export the reviewed content
          </p>
        </aside>
        <div className="editor-form">
          <h2>{section}</h2>
          {section === "Overview" && (
            <>
              <p className="editor-help">
                Start from the sample, then replace its content with your own.
              </p>
              <label>
                Lesson title
                <input
                  value={draft.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </label>
              <label>
                Short description
                <textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </label>
              <div className="two-fields">
                <label>
                  Lesson ID
                  <input
                    value={draft.id}
                    onChange={(e) => update({ id: e.target.value })}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    value={draft.slug}
                    onChange={(e) => update({ slug: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Module / topic
                <input
                  value={draft.module}
                  onChange={(e) => update({ module: e.target.value })}
                />
              </label>
              <div className="two-fields">
                <label>
                  Difficulty
                  <select
                    value={draft.difficulty}
                    onChange={(e) =>
                      update({
                        difficulty: e.target.value as Lesson["difficulty"],
                      })
                    }
                  >
                    {["Beginner", "Intermediate", "Advanced"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Lesson duration (minutes)
                  <input
                    type="number"
                    min="1"
                    value={draft.durationMinutes}
                    onChange={(e) =>
                      update({ durationMinutes: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label>
                Tags (comma separated)
                <input
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    update({
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.sample}
                  onChange={(e) => update({ sample: e.target.checked })}
                />{" "}
                Label as illustrative sample content
              </label>
              <div className="editor-actions">
                <button className="secondary" onClick={exportDraft}>
                  <Download size={15} /> Export lesson JSON
                </button>
                <label className="secondary file-label">
                  <Upload size={15} /> Import lesson JSON
                  <input
                    className="file-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      void importFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </>
          )}
          {section === "Video & transcript" && (
            <>
              <p className="editor-help">
                Paste a YouTube URL, then manually import your own captions.
                Automatic caption retrieval will require owner-authorised
                YouTube access.
              </p>
              <label>
                YouTube URL
                <input value={url} onChange={(e) => setUrl(e.target.value)} />
              </label>
              <button
                className="secondary"
                onClick={() => {
                  const id = youtubeId(url);
                  if (!id) {
                    notify(
                      "Enter a valid HTTPS YouTube watch, short, embed or youtu.be URL.",
                      true,
                    );
                    return;
                  }
                  update({
                    media: draft.media.map((m, i) =>
                      i === 0 ? { ...m, videoId: id } : m,
                    ),
                  });
                  notify(
                    "Video attached. Import its transcript below; existing lesson text is unchanged.",
                  );
                }}
              >
                Attach video
              </button>
              <label>
                Video title
                <input
                  value={draft.media[0].title}
                  onChange={(e) =>
                    update({
                      media: draft.media.map((m, i) =>
                        i === 0 ? { ...m, title: e.target.value } : m,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Paste transcript or captions
                <textarea
                  className="long-text"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder={
                    "00:00 Introduction\n02:00 Define the input actions\n\nPlain text, SRT and WebVTT are supported."
                  }
                />
              </label>
              <label className="secondary file-label">
                <Upload size={15} /> Load .txt / .srt / .vtt
                <input
                  className="file-input"
                  type="file"
                  accept=".txt,.srt,.vtt"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (f.size > 2_000_000) {
                        notify("Use a transcript smaller than 2 MB.", true);
                        return;
                      }
                      setRaw(await f.text());
                      notify(
                        "Caption file loaded. Review the text, then import it.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="primary"
                onClick={() => {
                  try {
                    const transcript = parseTranscript(raw, draft.media[0].id);
                    update({ transcript });
                    notify(
                      `Imported ${transcript.length} transcript segments. Review timings and manually edit the guide; AI generation is not connected.`,
                    );
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Import transcript
              </button>
              <p className="editor-help">
                Current transcript: {draft.transcript.length} segments. Plain
                text is stored at 0:00; add timings in Structured JSON. Import
                replaces the current draft transcript.
              </p>
            </>
          )}
          {section === "Learning objectives" && (
            <label>
              One learning objective per line
              <textarea
                className="long-text"
                value={draft.objectives.join("\n")}
                onChange={(e) =>
                  update({ objectives: e.target.value.split("\n") })
                }
              />
            </label>
          )}
          {section === "Steps & chapters" && (
            <>
              {draft.steps.map((s, i) => (
                <div className="entry" key={s.id}>
                  <h3>Step {i + 1}</h3>
                  <label>
                    Title
                    <input
                      value={s.title}
                      onChange={(e) =>
                        update({
                          steps: draft.steps.map((x, j) =>
                            j === i ? { ...x, title: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="two-fields">
                    <label>
                      Start time (seconds)
                      <input
                        type="number"
                        min="0"
                        value={s.seconds}
                        onChange={(e) =>
                          update({
                            steps: draft.steps.map((x, j) =>
                              j === i
                                ? { ...x, seconds: Number(e.target.value) }
                                : x,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      Video
                      <select
                        value={s.mediaId}
                        onChange={(e) =>
                          update({
                            steps: draft.steps.map((x, j) =>
                              j === i ? { ...x, mediaId: e.target.value } : x,
                            ),
                          })
                        }
                      >
                        {draft.media.map((m) => (
                          <option value={m.id} key={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Written instructions
                    <textarea
                      value={s.body}
                      onChange={(e) =>
                        update({
                          steps: draft.steps.map((x, j) =>
                            j === i ? { ...x, body: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Code (optional)
                    <textarea
                      value={s.code || ""}
                      onChange={(e) =>
                        update({
                          steps: draft.steps.map((x, j) =>
                            j === i ? { ...x, code: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Checkpoint
                    <input
                      value={s.check}
                      onChange={(e) =>
                        update({
                          steps: draft.steps.map((x, j) =>
                            j === i ? { ...x, check: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    className="danger"
                    disabled={draft.steps.length === 1}
                    onClick={() =>
                      update({ steps: draft.steps.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 size={14} /> Remove step
                  </button>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  update({
                    steps: [
                      ...draft.steps,
                      {
                        id: crypto.randomUUID(),
                        title: "New step",
                        mediaId: draft.media[0].id,
                        seconds: 0,
                        body: "Write your instructions here.",
                        check: "Describe a successful result.",
                      },
                    ],
                  })
                }
              >
                <Plus size={15} /> Add step
              </button>
            </>
          )}
          {section === "Key concepts" && (
            <>
              {draft.concepts.map((c, i) => (
                <div className="entry" key={i}>
                  <label>
                    Term
                    <input
                      value={c.term}
                      onChange={(e) =>
                        update({
                          concepts: draft.concepts.map((x, j) =>
                            j === i ? { ...x, term: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Definition
                    <textarea
                      value={c.definition}
                      onChange={(e) =>
                        update({
                          concepts: draft.concepts.map((x, j) =>
                            j === i ? { ...x, definition: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  update({
                    concepts: [
                      ...draft.concepts,
                      {
                        term: "New concept",
                        definition: "Explain this concept.",
                      },
                    ],
                  })
                }
              >
                Add concept
              </button>
            </>
          )}
          {section === "Troubleshooting" && (
            <>
              {draft.troubleshooting.map((t, i) => (
                <div className="entry" key={i}>
                  <label>
                    Problem
                    <input
                      value={t.problem}
                      onChange={(e) =>
                        update({
                          troubleshooting: draft.troubleshooting.map((x, j) =>
                            j === i ? { ...x, problem: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Solution
                    <textarea
                      value={t.solution}
                      onChange={(e) =>
                        update({
                          troubleshooting: draft.troubleshooting.map((x, j) =>
                            j === i ? { ...x, solution: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  update({
                    troubleshooting: [
                      ...draft.troubleshooting,
                      { problem: "New problem", solution: "Describe the fix." },
                    ],
                  })
                }
              >
                Add troubleshooting advice
              </button>
            </>
          )}
          {section === "Extension activities" &&
            draft.extensions.map((x, i) => (
              <div className="entry" key={x.level}>
                <h3>{x.level}</h3>
                <label>
                  Activity title
                  <input
                    value={x.title}
                    onChange={(e) =>
                      update({
                        extensions: draft.extensions.map((v, j) =>
                          j === i ? { ...v, title: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Instructions
                  <textarea
                    value={x.body}
                    onChange={(e) =>
                      update({
                        extensions: draft.extensions.map((v, j) =>
                          j === i ? { ...v, body: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
            ))}
          {section === "Knowledge check" && (
            <>
              {draft.quiz.map((q, i) => (
                <div className="entry" key={q.id}>
                  <label>
                    Question {i + 1}
                    <input
                      value={q.question}
                      onChange={(e) =>
                        update({
                          quiz: draft.quiz.map((v, j) =>
                            j === i ? { ...v, question: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  {q.options.map((o, k) => (
                    <label key={k}>
                      Option {k + 1}
                      <input
                        value={o}
                        onChange={(e) =>
                          update({
                            quiz: draft.quiz.map((v, j) =>
                              j === i
                                ? {
                                    ...v,
                                    options: v.options.map((a, b) =>
                                      b === k ? e.target.value : a,
                                    ),
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Correct answer
                    <select
                      value={q.answer}
                      onChange={(e) =>
                        update({
                          quiz: draft.quiz.map((v, j) =>
                            j === i
                              ? { ...v, answer: Number(e.target.value) }
                              : v,
                          ),
                        })
                      }
                    >
                      {q.options.map((o, k) => (
                        <option key={k} value={k}>
                          Option {k + 1}: {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Explanation
                    <textarea
                      value={q.explanation}
                      onChange={(e) =>
                        update({
                          quiz: draft.quiz.map((v, j) =>
                            j === i ? { ...v, explanation: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  update({
                    quiz: [
                      ...draft.quiz,
                      {
                        id: crypto.randomUUID(),
                        question: "New question",
                        options: ["First option", "Second option"],
                        answer: 0,
                        explanation: "Explain the correct answer.",
                      },
                    ],
                  })
                }
              >
                Add question
              </button>
            </>
          )}
          {section === "Resources" && (
            <>
              {draft.resources.map((r, i) => (
                <div className="entry" key={i}>
                  <label>
                    Resource title
                    <input
                      value={r.title}
                      onChange={(e) =>
                        update({
                          resources: draft.resources.map((v, j) =>
                            j === i ? { ...v, title: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    HTTPS URL
                    <input
                      value={r.url}
                      onChange={(e) =>
                        update({
                          resources: draft.resources.map((v, j) =>
                            j === i ? { ...v, url: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Description
                    <input
                      value={r.description}
                      onChange={(e) =>
                        update({
                          resources: draft.resources.map((v, j) =>
                            j === i ? { ...v, description: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() =>
                  update({
                    resources: [
                      ...draft.resources,
                      {
                        title: "New resource",
                        url: "https://docs.godotengine.org",
                        description: "Describe this resource.",
                      },
                    ],
                  })
                }
              >
                Add resource
              </button>
            </>
          )}
          {section === "Structured JSON" && (
            <>
              <p className="editor-help">
                Edit the full data structure, including media, transcript
                timings and array entries. Changes are applied only after schema
                validation.
              </p>
              <textarea
                aria-label="Lesson JSON"
                className="long-text"
                spellCheck={false}
                value={json}
                onChange={(e) => setJson(e.target.value)}
              />
              <button
                className="primary"
                onClick={() => {
                  try {
                    const d = lessonSchema.parse(JSON.parse(json));
                    setDraft(d);
                    setUrl(
                      `https://www.youtube.com/watch?v=${d.media[0].videoId}`,
                    );
                    notify(
                      "JSON validated and applied. Save the draft to retain these changes.",
                    );
                  } catch (e) {
                    notify(
                      `JSON was not applied: ${(e as Error).message}`,
                      true,
                    );
                  }
                }}
              >
                Validate & apply JSON
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
