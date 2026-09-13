"use client";
import { useState } from "react";
import type { Lesson } from "@/lib/lessons";
import { preparationPackage, chatgptTemplate, parseChatgptLesson, applyChatgptLesson, type ChatgptLesson } from "@/lib/chatgpt-exchange";
function download(name: string, content: string, type: string) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function ChatgptExchange({lesson,onApply}:{lesson:Lesson;onApply:(lesson:Lesson)=>void}) {
  const [raw,setRaw]=useState(""),[candidate,setCandidate]=useState<ChatgptLesson|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const run=(fn:()=>void)=>{setError("");setNotice("");try{fn();}catch(e){setError((e as Error).message);}};
  const validate=()=>run(()=>{setCandidate(null);const v=parseChatgptLesson(raw,lesson);applyChatgptLesson(v,lesson);setCandidate(v);});
  return <div className="chatgpt-exchange">
    <p>Use your own ChatGPT to turn captions into a structured lesson. Tutoria makes no AI requests.</p>
    <section className="exchange-stage">
      <h3>1. Take your captions to ChatGPT</h3>
      <p>First import your SRT or VTT in Video &amp; transcript. The preparation pack includes your captions, the JSON template and instructions for writing contextual steps.</p>
      <div className="editor-actions">
        <button className="primary" onClick={()=>run(()=>{download(`${lesson.slug}-chatgpt-pack.md`,preparationPackage(lesson),"text/markdown");setNotice("Pack downloaded. Upload it to ChatGPT and ask it to follow the instructions and return a completed JSON file.");})}>Download ChatGPT preparation pack</button>
        <button className="secondary" onClick={()=>download("tutoria-lesson-template.json",JSON.stringify(chatgptTemplate(lesson),null,2),"application/json")}>Download blank JSON template</button>
      </div>
      <p className="editor-help">The pack contains this video's transcript. Upload it yourself to the ChatGPT conversation you choose.</p>
    </section>
    <section className="exchange-stage">
      <h3>2. Bring back the completed JSON</h3>
      <label>Choose ChatGPT's JSON file<input type="file" accept=".json,application/json" onChange={async e=>{const f=e.target.files?.[0];e.target.value="";if(!f)return;setCandidate(null);setError("");setNotice("");setRaw("");try{if(f.size>900000)throw Error("Use a JSON file smaller than 900 KB.");const t=await f.text();setRaw(t);const v=parseChatgptLesson(t,lesson);applyChatgptLesson(v,lesson);setCandidate(v);}catch(err){setError((err as Error).message);}}}/></label>
      <label>Or paste the completed JSON<textarea rows={9} value={raw} onChange={e=>{setRaw(e.target.value);setCandidate(null);setError("");setNotice("");}} placeholder="Paste the JSON returned by ChatGPT"/></label>
      <button className="secondary" onClick={validate} disabled={!raw.trim()}>Check JSON</button>
    </section>
    {error&&<div className="status error" role="alert" style={{whiteSpace:"pre-wrap"}}>{error}</div>}
    {notice&&<div className="status" role="status">{notice}</div>}
    {candidate&&<section className="exchange-stage" aria-label="Import review">
      <h3>3. Review before applying</h3>
      <h4>{candidate.title}</h4><p>{candidate.description}</p>
      <p>{candidate.sections.length} sections · {candidate.sections.reduce((n,s)=>n+s.steps.length,0)} steps · {candidate.objectives.length} objectives · {candidate.teacherReviewNotes.length} teacher notes</p>
      {candidate.sections.map((s,i)=><details key={i}><summary>{s.title} ({s.steps.length} steps)</summary>{s.steps.map((st,j)=><div className="exchange-step" key={j}><strong>{st.title} — {Math.floor(st.seconds/60)}:{String(st.seconds%60).padStart(2,"0")}</strong><p>{st.body}</p><p><strong>Check:</strong> {st.check}</p></div>)}</details>)}
      {candidate.teacherReviewNotes.length>0&&<><h4>Teacher checks</h4><ul>{candidate.teacherReviewNotes.map((n,i)=><li key={i}>{n}</li>)}</ul></>}
      <p>Applying replaces the lesson overview, objectives, steps, concepts, troubleshooting, activities, quiz and teacher notes. Your video, source transcript, folder and resources stay attached. Nothing is published automatically.</p>
      <div className="editor-actions"><button className="primary" onClick={()=>run(()=>{const checked=parseChatgptLesson(raw,lesson);onApply(applyChatgptLesson(checked,lesson));setCandidate(null);setRaw("");setNotice("Applied to the editor. Review the lesson, then Save draft or Preview lesson.");})}>Apply to editor draft</button><button className="secondary" onClick={()=>{setCandidate(null);setRaw("");}}>Discard import</button></div>
    </section>}
  </div>;
}
