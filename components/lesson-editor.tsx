"use client";
import { useEffect, useState } from "react";
import { Shell, LessonView } from "@/components/tutoria";
import {
  Lesson,
  sampleLesson,
  lessonSchema,
  draftLessonSchema,
  parseTranscript,
  youtubeId,
} from "@/lib/lessons";
import { Download, Eye, Save, Upload, Plus, Trash2 } from "lucide-react";
import { buildTranscriptDraft } from "@/lib/draft-builder";
import { api } from "@/lib/api";
import ChatgptExchange from "@/components/chatgpt-exchange";
const sections = [
  "Prepare with ChatGPT",
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
export default function LessonEditor({
  initial,
  onSave,
  onClose,
}: {
  initial: Lesson;
  onSave: (lesson: Lesson, action: "save" | "publish") => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Lesson>(initial),
    [section, setSection] = useState("Overview"),
    [status, setStatus] = useState(""),
    [error, setError] = useState(false),
    [preview, setPreview] = useState(false),
    [raw, setRaw] = useState(""),
    [json, setJson] = useState(""),
    [url, setUrl] = useState(
      `https://www.youtube.com/watch?v=${initial.media[0].videoId}`,
    ),
    [loaded, setLoaded] = useState(false);
  const notify = (s: string, e = false) => {
    setStatus(s);
    setError(e);
  };
  useEffect(() => {
    setLoaded(true);
  }, []);
  const update = (patch: Partial<Lesson>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus("Unsaved changes - save your draft to keep these edits.");
    setError(false);
  };
  const validate = () => {
    const r = lessonSchema.safeParse({
      ...draft,
      extensions: draft.extensions.filter(
        (e) => e.title.trim() && e.body.trim(),
      ),
    });
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
  const save = async () => {
    try {
      draftLessonSchema.parse(draft);
      setLoaded(false);
      await onSave(draft, "save");
      notify(
        "Draft saved to your account. Students still see the last published version.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoaded(true);
    }
  };
  const publish = async () => {
    if (!validate()) return;
    try {
      setLoaded(false);
      await onSave(
        {
          ...draft,
          extensions: draft.extensions.filter(
            (e) => e.title.trim() && e.body.trim(),
          ),
        },
        "publish",
      );
      notify("Lesson published. Students can now open it from its folder.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoaded(true);
    }
  };
  const exportDraft = () => {
    if (!draftLessonSchema.safeParse(draft).success) {
      notify("Check the lesson structure before exporting.", true);
      return;
    }
    const u = URL.createObjectURL(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `${draft.slug}.json`;
    a.click();
    URL.revokeObjectURL(u);
    notify("Lesson exported as a portable JSON backup.");
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw Error("Use a JSON file smaller than 2 MB.");
      const imported = draftLessonSchema.parse(JSON.parse(await file.text()));
      const d = { ...imported, id: initial.id, slug: initial.slug };
      setDraft(d);
      setUrl(`https://www.youtube.com/watch?v=${d.media[0].videoId}`);
      notify("Lesson imported for review. Save the draft when ready.");
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
          <strong>Draft preview</strong>
          <button onClick={() => setPreview(false)}>Return to editor</button>
        </div>
        <LessonView lesson={draft} preview onExitPreview={()=>setPreview(false)} />
      </>
    );
  return (
    <Shell active="teacher">
      <button className="back" onClick={onClose}>
        Back to dashboard
      </button>
      <div className="editor-top">
        <div>
          <div className="eyebrow">TEACHER STUDIO</div>
          <h1>Edit your lesson.</h1>
          <p>Review the draft, check the timings, then publish when ready.</p>
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
        Changes are private until you publish.{" "}
        <button className="primary" disabled={!loaded} onClick={publish}>
          Publish reviewed lesson
        </button>
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
            4. Publish the reviewed lesson
          </p>
        </aside>
        <div className="editor-form">
          <h2>{section}</h2>
          {section === "Prepare with ChatGPT" && <ChatgptExchange lesson={draft} onApply={setDraft} />}

          {section === "Overview" && (
            <>
              <p className="editor-help">
                Set the lesson details students will see in their folder.
              </p>
              <button className="secondary" onClick={() => setSection("Prepare with ChatGPT")}>Prepare with ChatGPT</button>
              <label>
                Teacher review notes (saved privately with your draft)
                <textarea rows={5} value={(draft.teacherReviewNotes || []).join("\n")} onChange={e => update({teacherReviewNotes:e.target.value.split("\n")})} />
              </label>
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
                    readOnly
                    value={draft.id}
                    onChange={(e) => update({ id: e.target.value })}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    readOnly
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
              <button
                className="secondary"
                onClick={async () => {
                  const id = youtubeId(url);
                  if (!id) {
                    notify("Enter a valid YouTube URL first.", true);
                    return;
                  }
                  try {
                    notify("Importing video and captions...");
                    const result = await api<{
                      title: string;
                      description: string;
                      transcript: Lesson["transcript"];
                      warning: string | null;
                    }>("/api/youtube/import", { videoId: id });
                    update({
                      title: result.title,
                      media: draft.media.map((m, i) =>
                        i === 0
                          ? { ...m, videoId: id, title: result.title }
                          : m,
                      ),
                      ...(result.transcript.length
                        ? { transcript: result.transcript }
                        : {}),
                    });
                    notify(
                      result.warning ||
                        "Captions imported. Build suggested steps below.",
                    );
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Import from my YouTube channel
              </button>
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
                      `Imported ${transcript.length} transcript segments. Review timings and manually edit the guide; Use Build suggested steps to organise the transcript.`,
                    );
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Import transcript
              </button>
              <button
                className="primary"
                onClick={() => {
                  try {
                    const result = buildTranscriptDraft(draft);
                    update(result.lesson);
                    notify(result.notes.join(" "));
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
              >
                Build suggested steps from transcript
              </button>
              <p className="editor-help">
                This replaces steps, objectives, concepts and troubleshooting in
                the draft. Rules extract action passages and glossary terms;
                review before saving.
              </p>
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
                  <div className="form-actions"><button className="secondary" disabled={i===0} onClick={()=>{const steps=[...draft.steps];[steps[i-1],steps[i]]=[steps[i],steps[i-1]];update({steps})}}>Move up</button><button className="secondary" disabled={i===draft.steps.length-1} onClick={()=>{const steps=[...draft.steps];[steps[i],steps[i+1]]=[steps[i+1],steps[i]];update({steps})}}>Move down</button><button className="secondary" disabled={i===draft.steps.length-1||draft.steps[i+1]?.mediaId!==s.mediaId} onClick={()=>{const steps=[...draft.steps];steps[i]={...s,body:s.body+"\n\n"+steps[i+1].body};steps.splice(i+1,1);update({steps})}}>Merge with next</button></div>
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
          {section === "Extension activities" && draft.extensions.length<3 && <button className="secondary" onClick={()=>update({extensions:(["Beginner","Intermediate","Advanced"] as const).map(level=>draft.extensions.find(e=>e.level===level)||{level,title:"",body:""})})}>Add extension levels</button>}
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
                    const imported = draftLessonSchema.parse(JSON.parse(json));
                    const d = {
                      ...imported,
                      id: initial.id,
                      slug: initial.slug,
                    };
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
