"use client";
import { useState } from "react";
import { parseTranscript, type Lesson } from "@/lib/lessons";
import { preparationPackage, chatgptTemplate, parseChatgptLesson, applyChatgptLesson, type ChatgptLesson } from "@/lib/chatgpt-exchange";
function download(name: string, content: string, type: string) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function ChatgptExchange({lesson,onApply}:{lesson:Lesson;onApply:(lesson:Lesson)=>void}) {
  const [captions,setCaptions]=useState("");
  const [raw,setRaw]=useState(""),[candidate,setCandidate]=useState<ChatgptLesson|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const run=(fn:()=>void)=>{setError("");setNotice("");try{fn();}catch(e){setError((e as Error).message);}};
  const validate=()=>run(()=>{setCandidate(null);const v=parseChatgptLesson(raw,lesson);applyChatgptLesson(v,lesson);setCandidate(v);});
  return <div className="chatgpt-exchange">
    <p>Use your preferred AI assistant, such as ChatGPT or Claude, to turn captions into a structured lesson. Tutoria makes no AI requests.</p>
    <section className="exchange-stage">
      <h3>1. Import your captions</h3>
      <p>Load an SRT or VTT file, or paste timestamped captions. Importing replaces this video's draft transcript; your lesson text stays as it is.</p>
      <label>Caption file (.srt / .vtt / .txt)<input type="file" accept=".srt,.vtt,.txt" onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;setError("");setNotice("");try{if(file.size>900000)throw Error("Use captions smaller than 900 KB.");setCaptions(await file.text());setNotice("Captions loaded. Press Import captions to attach them to this draft.");}catch(err){setError((err as Error).message);}}}/></label>
      <label>Timestamped captions<textarea rows={7} value={captions} onChange={e=>setCaptions(e.target.value)} placeholder="00:00 Introduction"/></label>
      <button className="primary" disabled={!captions.trim()} onClick={()=>run(()=>{if(new TextEncoder().encode(captions).length>900000)throw Error("Use captions smaller than 900 KB.");const imported=parseTranscript(captions,lesson.media[0].id);onApply({...lesson,transcript:[...lesson.transcript.filter(t=>t.mediaId!==lesson.media[0].id),...imported]});setCandidate(null);setNotice(`Imported ${imported.length} caption segments. Save your draft to keep them, or download the preparation pack below.${imported.every(t=>t.seconds===0)?" These captions have no usable timing beyond 0:00. Import timed SRT/VTT for accurate lesson links.":""}`);})}>Import captions</button>
      <p className="editor-help">Currently attached: {lesson.transcript.filter(t=>t.mediaId===lesson.media[0].id).length} caption segments.</p>
    </section>
    <section className="exchange-stage">
      <h3>2. Download your AI preparation pack</h3>
      <p>Import captions above, then download your pack. The preparation pack includes your captions, the JSON template and instructions for writing contextual steps.</p>
      <div className="editor-actions">
        <button className="primary" onClick={()=>run(()=>{download(`${lesson.slug}-ai-pack.md`,preparationPackage(lesson),"text/markdown");setNotice("Pack downloaded. Upload it to your AI assistant and ask it to follow the instructions and return a completed JSON file.");})}>Download AI preparation pack</button>
        <button className="secondary" onClick={()=>download("tutoria-lesson-template.json",JSON.stringify(chatgptTemplate(lesson),null,2),"application/json")}>Download blank JSON template</button>
      </div>
      <p className="editor-help">The pack contains this video's transcript. Upload it yourself to the AI conversation you choose.</p>
    </section>
    <section className="exchange-stage">
      <h3>3. Bring back the completed JSON</h3>
      <label>Choose your AI-generated JSON file<input type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;setCandidate(null);setError("");setNotice("");setRaw("");try{if(f.size>900000)throw Error("Use a JSON file smaller than 900 KB.");const t=await f.text();setRaw(t);const v=parseChatgptLesson(t,lesson);applyChatgptLesson(v,lesson);setCandidate(v);}catch(err){setError((err as Error).message);}}}/></label>
      <label>Or paste the completed JSON<textarea rows={9} value={raw} onChange={e=>{setRaw(e.target.value);setCandidate(null);setError("");setNotice("");}} placeholder="Paste the JSON returned by your AI assistant"/></label>
      <button className="secondary" onClick={validate} disabled={!raw.trim()}>Check JSON</button>
    </section>
    {error&&<div className="status error" role="alert" style={{whiteSpace:"pre-wrap"}}>{error}</div>}
    {notice&&<div className="status" role="status">{notice}</div>}
    {candidate&&<section className="exchange-stage" aria-label="Import review">
      <h3>4. Review before applying</h3>
      <h4>{candidate.title}</h4><p>{candidate.description}</p>
      <p>{candidate.sections.length} sections · {candidate.sections.reduce((n,s)=>n+s.steps.length,0)} steps · {candidate.objectives.length} objectives · {candidate.teacherReviewNotes.length} teacher notes</p>
      {candidate.sections.map((s,i)=><details key={i}><summary>{s.title} ({s.steps.length} steps)</summary>{s.steps.map((st,j)=><div className="exchange-step" key={j}><strong>{st.title} — {Math.floor(st.seconds/60)}:{String(st.seconds%60).padStart(2,"0")}</strong><p>{st.body}</p><p><strong>Check:</strong> {st.check}</p></div>)}</details>)}
      {candidate.teacherReviewNotes.length>0&&<><h4>Teacher checks</h4><ul>{candidate.teacherReviewNotes.map((n,i)=><li key={i}>{n}</li>)}</ul></>}
      <p>Applying replaces the lesson overview, objectives, steps, concepts, troubleshooting, activities, quiz and teacher notes. Your video, source transcript, folder and resources stay attached. Nothing is published automatically.</p>
      <div className="editor-actions"><button className="primary" onClick={()=>run(()=>{const checked=parseChatgptLesson(raw,lesson);onApply(applyChatgptLesson(checked,lesson));setCandidate(null);setRaw("");setNotice("Applied to the editor. Review the lesson, then Save draft or Preview lesson.");})}>Apply to editor draft</button><button className="secondary" onClick={()=>{setCandidate(null);setRaw("");}}>Discard import</button></div>
    </section>}
  </div>;
}
