"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LocateFixed, Play } from "lucide-react";
import { parseTranscript, stamp, type Lesson } from "@/lib/lessons";
import { preparationPackage, chatgptTemplate, parseChatgptLesson, applyChatgptLesson, type ChatgptLesson } from "@/lib/chatgpt-exchange";
import SyncedVideo from "@/components/synced-video";

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const resolvedPrefix = /^\[Resolved\]\s*/i;
const noteText = (note: string) => note.replace(resolvedPrefix, "");
const noteResolved = (note: string) => resolvedPrefix.test(note);
function firstTimestamp(value: string) {
  const match = value.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (!match) return null;
  return match[3] ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : Number(match[1]) * 60 + Number(match[2]);
}

export default function ChatgptExchange({ lesson, onApply, onStagedChange }: { lesson: Lesson; onApply: (lesson: Lesson) => void; onStagedChange: (staged: boolean) => void }) {
  const [captions, setCaptions] = useState("");
  const [raw, setRaw] = useState("");
  const [candidate, setCandidate] = useState<ChatgptLesson | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [stagedDirty, setStagedDirty] = useState(false);
  const [reviewSeconds, setReviewSeconds] = useState(0);
  const [videoRequest, setVideoRequest] = useState(0);
  const [showReviewVideo, setShowReviewVideo] = useState(false);

  useEffect(() => { onStagedChange(candidate !== null); }, [candidate, onStagedChange]);

  useEffect(() => {
    if (!candidate) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [candidate]);

  const run = (fn: () => void) => { setError(""); setNotice(""); try { fn(); } catch (caught) { setError((caught as Error).message); } };
  const edit = (change: (next: ChatgptLesson) => void) => {
    setCandidate((current) => { if (!current) return current; const next = structuredClone(current); change(next); return next; });
    setStagedDirty(true); setError(""); setNotice("");
  };
  const loadCandidate = (value: ChatgptLesson) => { setCandidate(value); setStagedDirty(false); setShowReviewVideo(false); setReviewSeconds(0); };
  const validate = () => run(() => { setCandidate(null); const value = parseChatgptLesson(raw, lesson); applyChatgptLesson(value, lesson); loadCandidate(value); });
  const jumpToVideo = (seconds: number) => { setReviewSeconds(seconds); setVideoRequest((value) => value + 1); setShowReviewVideo(true); };
  const findNearestStep = (seconds: number) => {
    if (!candidate) return;
    const steps = candidate.sections.flatMap((section, sectionIndex) => section.steps.map((step, stepIndex) => ({ seconds: step.seconds, id: `import-step-${sectionIndex}-${stepIndex}` })));
    const closest = steps.reduce((best, item) => Math.abs(item.seconds - seconds) < Math.abs(best.seconds - seconds) ? item : best);
    const element = document.getElementById(closest.id);
    const group = element?.closest("details"); if (group) group.open = true;
    requestAnimationFrame(() => element?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const discard = () => { setCandidate(null); setRaw(""); setError(""); setNotice("Import discarded. The current lesson draft was not changed."); setStagedDirty(false); setShowReviewVideo(false); };

  return <div className="chatgpt-exchange">
    <p>Use your preferred AI assistant, such as ChatGPT or Claude, to turn captions into a structured lesson. Tutoria makes no AI requests.</p>
    <section className="exchange-stage">
      <h3>1. Import your captions</h3>
      <p>Load an SRT or VTT file, or paste timestamped captions. Importing replaces this video&apos;s draft transcript; your lesson text stays as it is.</p>
      <label>Caption file (.srt / .vtt / .txt)<input type="file" accept=".srt,.vtt,.txt" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setError(""); setNotice(""); try { if (file.size > 900000) throw Error("Use captions smaller than 900 KB."); setCaptions(await file.text()); setNotice("Captions loaded. Press Import captions to attach them to this draft."); } catch (caught) { setError((caught as Error).message); } }} /></label>
      <label>Timestamped captions<textarea rows={7} value={captions} onChange={event => setCaptions(event.target.value)} placeholder="00:00 Introduction" /></label>
      <button className="primary" disabled={!captions.trim()} onClick={() => run(() => { if (new TextEncoder().encode(captions).length > 900000) throw Error("Use captions smaller than 900 KB."); const imported = parseTranscript(captions, lesson.media[0].id); onApply({ ...lesson, transcript: [...lesson.transcript.filter(item => item.mediaId !== lesson.media[0].id), ...imported] }); setCandidate(null); setNotice(`Imported ${imported.length} caption segments. Save your draft to keep them, or download the preparation pack below.${imported.every(item => item.seconds === 0) ? " These captions have no usable timing beyond 0:00. Import timed SRT/VTT for accurate lesson links." : ""}`); })}>Import captions</button>
      <p className="editor-help">Currently attached: {lesson.transcript.filter(item => item.mediaId === lesson.media[0].id).length} caption segments.</p>
    </section>
    <section className="exchange-stage">
      <h3>2. Download your AI preparation pack</h3>
      <p>Import captions above, then download your pack. The preparation pack includes your captions, the JSON template and instructions for writing contextual steps.</p>
      <div className="editor-actions"><button className="primary" onClick={() => run(() => { download(`${lesson.slug}-ai-pack.md`, preparationPackage(lesson), "text/markdown"); setNotice("Pack downloaded. Upload it to your AI assistant and ask it to follow the instructions and return a completed JSON file."); })}>Download AI preparation pack</button><button className="secondary" onClick={() => download("tutoria-lesson-template.json", JSON.stringify(chatgptTemplate(lesson), null, 2), "application/json")}>Download blank JSON template</button></div>
      <p className="editor-help">The pack contains this video&apos;s transcript. Upload it yourself to the AI conversation you choose.</p>
    </section>
    <section className="exchange-stage">
      <h3>3. Bring back the completed JSON</h3>
      <label>Choose your AI-generated JSON file<input type="file" accept=".json,application/json" onChange={async event => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setCandidate(null); setError(""); setNotice(""); setRaw(""); try { if (file.size > 900000) throw Error("Use a JSON file smaller than 900 KB."); const text = await file.text(); setRaw(text); const value = parseChatgptLesson(text, lesson); applyChatgptLesson(value, lesson); loadCandidate(value); } catch (caught) { setError((caught as Error).message); } }} /></label>
      <label>Or paste the completed JSON<textarea rows={9} value={raw} onChange={event => { setRaw(event.target.value); setCandidate(null); setError(""); setNotice(""); }} placeholder="Paste the JSON returned by your AI assistant" /></label>
      <button className="secondary" onClick={validate} disabled={!raw.trim()}>Check JSON</button>
    </section>
    {error && <div className="status error" role="alert" style={{ whiteSpace: "pre-wrap" }}>{error}</div>}
    {notice && <div className="status" role="status">{notice}</div>}
    {candidate && <section className="exchange-stage review-editor" aria-label="Import review">
      <div className="review-heading"><div><h3>4. Review before applying</h3><p>Edit this staged copy. The current lesson remains unchanged until you apply it.</p></div>{stagedDirty && <span className="draft-badge">Staged edits</span>}</div>
      <div className="review-source"><div><strong>Original source · read only</strong><p>{lesson.media[0].title} · {lesson.transcript.filter(item => item.mediaId === lesson.media[0].id).length} transcript segments</p></div><a className="secondary" href={`https://www.youtube.com/watch?v=${lesson.media[0].videoId}&t=${reviewSeconds}s`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink size={14} /></a></div>
      {showReviewVideo && <div className="review-video"><SyncedVideo videoId={lesson.media[0].videoId} title={lesson.media[0].title} seconds={reviewSeconds} requestId={videoRequest} onTime={() => {}} /></div>}
      <fieldset className="review-group"><legend>Generated lesson details</legend>
        <label>Lesson title<input value={candidate.title} onChange={event => edit(next => { next.title = event.target.value; })} /></label>
        <label>Lesson overview / description<textarea rows={4} value={candidate.description} onChange={event => edit(next => { next.description = event.target.value; })} /></label>
        <div className="review-grid"><label>Difficulty<select value={candidate.difficulty} onChange={event => edit(next => { next.difficulty = event.target.value as ChatgptLesson["difficulty"]; })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Duration in minutes<input type="number" min={1} value={candidate.durationMinutes} onChange={event => edit(next => { next.durationMinutes = Number(event.target.value); })} /></label></div>
        <label>Tags (one per line)<textarea rows={3} value={candidate.tags.join("\n")} onChange={event => edit(next => { next.tags = event.target.value.split("\n"); })} /></label>
      </fieldset>
      <fieldset className="review-group"><legend>Objectives</legend>
        {candidate.objectives.map((objective, index) => <div className="review-list-row" key={index}><input aria-label={`Objective ${index + 1}`} value={objective} onChange={event => edit(next => { next.objectives[index] = event.target.value; })} /><button className="secondary compact" type="button" onClick={() => edit(next => { next.objectives.splice(index, 1); })}>Remove</button></div>)}
        <button className="secondary" type="button" onClick={() => edit(next => { next.objectives.push("New objective"); })}>Add objective</button>
      </fieldset>
      <div className="review-section-heading"><div><h4>Generated sections and steps</h4><p>Expand a section to edit the student guide. Source timestamps stay fixed to validated transcript positions.</p></div><span>{candidate.sections.length} sections · {candidate.sections.reduce((total, section) => total + section.steps.length, 0)} steps</span></div>
      {candidate.sections.map((section, sectionIndex) => <details className="review-section" key={sectionIndex}><summary>{section.title || "Untitled section"} ({section.steps.length} steps)</summary>
        <label>Section title<input value={section.title} onChange={event => edit(next => { next.sections[sectionIndex].title = event.target.value; })} /></label>
        {section.steps.map((step, stepIndex) => <article className="review-step" id={`import-step-${sectionIndex}-${stepIndex}`} key={stepIndex}><div className="review-step-heading"><strong>Step {stepIndex + 1}</strong><button className="timestamp" type="button" onClick={() => jumpToVideo(step.seconds)}><Play size={13} />{stamp(step.seconds)} in video</button></div><label>Step title<input value={step.title} onChange={event => edit(next => { next.sections[sectionIndex].steps[stepIndex].title = event.target.value; })} /></label><label>Instructions / content<textarea rows={5} value={step.body} onChange={event => edit(next => { next.sections[sectionIndex].steps[stepIndex].body = event.target.value; })} /></label><label>Student success check<textarea rows={2} value={step.check} onChange={event => edit(next => { next.sections[sectionIndex].steps[stepIndex].check = event.target.value; })} /></label></article>)}
      </details>)}
      <fieldset className="review-group"><legend>Concepts</legend>{candidate.concepts.map((concept, index) => <article className="review-card" key={index}><label>Term<input value={concept.term} onChange={event => edit(next => { next.concepts[index].term = event.target.value; })} /></label><label>Definition<textarea rows={3} value={concept.definition} onChange={event => edit(next => { next.concepts[index].definition = event.target.value; })} /></label></article>)}{!candidate.concepts.length && <p className="editor-help">No concepts were generated.</p>}</fieldset>
      <fieldset className="review-group"><legend>Troubleshooting</legend>{candidate.troubleshooting.map((entry, index) => <article className="review-card" key={index}><label>Problem<input value={entry.problem} onChange={event => edit(next => { next.troubleshooting[index].problem = event.target.value; })} /></label><label>Solution<textarea rows={3} value={entry.solution} onChange={event => edit(next => { next.troubleshooting[index].solution = event.target.value; })} /></label></article>)}{!candidate.troubleshooting.length && <p className="editor-help">No troubleshooting entries were generated.</p>}</fieldset>
      <fieldset className="review-group"><legend>Extensions and activities</legend>{candidate.extensions.map((extension, index) => <article className="review-card" key={index}><div className="review-grid"><label>Level<select value={extension.level} onChange={event => edit(next => { next.extensions[index].level = event.target.value as ChatgptLesson["extensions"][number]["level"]; })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Activity title<input value={extension.title} onChange={event => edit(next => { next.extensions[index].title = event.target.value; })} /></label></div><label>Activity content<textarea rows={4} value={extension.body} onChange={event => edit(next => { next.extensions[index].body = event.target.value; })} /></label></article>)}{!candidate.extensions.length && <p className="editor-help">No extension activities were generated.</p>}</fieldset>
      <fieldset className="review-group"><legend>Quiz</legend>{candidate.quiz.map((question, questionIndex) => <article className="review-card" key={questionIndex}><label>Question<input value={question.question} onChange={event => edit(next => { next.quiz[questionIndex].question = event.target.value; })} /></label>{question.options.map((option, optionIndex) => <div className="review-option" key={optionIndex}><input type="radio" name={`review-answer-${questionIndex}`} aria-label={`Mark option ${optionIndex + 1} correct`} checked={question.answer === optionIndex} onChange={() => edit(next => { next.quiz[questionIndex].answer = optionIndex; })} /><input aria-label={`Question ${questionIndex + 1} option ${optionIndex + 1}`} value={option} onChange={event => edit(next => { next.quiz[questionIndex].options[optionIndex] = event.target.value; })} /></div>)}<p className="editor-help">Select the radio button beside the correct answer.</p><label>Explanation<textarea rows={3} value={question.explanation} onChange={event => edit(next => { next.quiz[questionIndex].explanation = event.target.value; })} /></label></article>)}{!candidate.quiz.length && <p className="editor-help">No quiz questions were generated.</p>}</fieldset>
      <div className="teacher-checks"><div className="review-section-heading"><div><h4>Teacher checks</h4><p>Warnings remain until you explicitly mark them resolved.</p></div><span>{candidate.teacherReviewNotes.length} checks</span></div>
        {candidate.teacherReviewNotes.map((note, index) => { const seconds = firstTimestamp(note); const resolved = noteResolved(note); return <article className={`teacher-check ${resolved ? "resolved" : ""}`} key={index}><label>Check {index + 1}<textarea rows={3} value={noteText(note)} onChange={event => edit(next => { next.teacherReviewNotes[index] = `${resolved ? "[Resolved] " : ""}${event.target.value}`; })} /></label><div className="teacher-check-actions"><label className="resolved-toggle"><input type="checkbox" checked={resolved} onChange={event => edit(next => { next.teacherReviewNotes[index] = `${event.target.checked ? "[Resolved] " : ""}${noteText(next.teacherReviewNotes[index])}`; })} />Reviewed / Resolved</label>{seconds !== null && <><button className="secondary compact" type="button" onClick={() => jumpToVideo(seconds)}><Play size={13} />Watch {stamp(seconds)}</button><button className="secondary compact" type="button" onClick={() => findNearestStep(seconds)}><LocateFixed size={13} />Find nearest step</button></>}</div></article>; })}
        {!candidate.teacherReviewNotes.length && <p className="editor-help">The package contains no teacher checks.</p>}
      </div>
      <p className="review-apply-note">Applying replaces the lesson overview, objectives, steps, concepts, troubleshooting, activities, quiz and teacher notes with this edited staged copy. Your video, source transcript, folder and resources stay attached. Nothing is published automatically.</p>
      <div className="editor-actions"><button className="primary" onClick={() => run(() => { const checked = parseChatgptLesson(JSON.stringify(candidate), lesson); const editedLesson = applyChatgptLesson(checked, lesson); onApply(editedLesson); setCandidate(null); setRaw(""); setStagedDirty(false); setShowReviewVideo(false); setNotice("Edited import applied to the editor draft. Review the lesson, then Save draft or Preview lesson."); })}>Validate &amp; apply edited lesson</button><button className="secondary" onClick={discard}>Cancel / Discard import</button></div>
    </section>}
  </div>;
}
