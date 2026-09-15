"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Inbox, RotateCcw, Users } from "lucide-react";
import { api, type Session } from "@/lib/api";
import { Shell } from "./tutoria";

type Account = { id: string; username: string; name: string; role: string; must_change: number };
type Feedback = {
  id: string; kind: "bug" | "improvement" | "content"; urgency: number; message: string;
  page_path: string; page_title: string; context_kind: string; context_id: string;
  context_title: string; reporter_name: string | null; status: "new" | "resolved";
  created_at: string; reviewed_at: string | null;
};
const urgencyLabel = ["", "Critical", "High", "Medium", "Low", "Minor"];
const kindLabel = { bug: "Bug report", improvement: "Improvement", content: "Content issue" };

export default function AdminPanel({ session }: { session: Session }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [view, setView] = useState<"feedback" | "accounts">("feedback");
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [name, setName] = useState(""), [username, setUsername] = useState(""), [password, setPassword] = useState("");
  const [reset, setReset] = useState<Account | null>(null), [remove, setRemove] = useState<Account | null>(null);

  const load = async () => {
    const [accountResult, feedbackResult] = await Promise.all([
      api<{ accounts: Account[] }>("/api/admin/accounts"),
      api<{ feedback: Feedback[] }>("/api/admin/feedback"),
    ]);
    setAccounts(accountResult.accounts);
    setFeedback(feedbackResult.feedback);
  };
  useEffect(() => { load().catch((caught) => setError((caught as Error).message)); }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); await load(); } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };
  const newCount = feedback.filter((item) => item.status === "new").length;

  return <Shell active="teacher" feedbackContext={{ kind: "Admin panel" }}>
    <div className="dashboard-heading admin-heading"><div><div className="eyebrow">DIGITAL TECHNOLOGIES</div><h1>Administration</h1><p>Review feedback and manage access to the learning hub.</p></div></div>
    <div className="admin-tabs" role="tablist" aria-label="Administration sections">
      <button className={view === "feedback" ? "active" : ""} onClick={() => setView("feedback")} role="tab" aria-selected={view === "feedback"}><Inbox size={17}/> Feedback inbox {newCount > 0 && <span>{newCount}</span>}</button>
      <button className={view === "accounts" ? "active" : ""} onClick={() => setView("accounts")} role="tab" aria-selected={view === "accounts"}><Users size={17}/> Accounts</button>
    </div>
    {error && <p role="alert" className="status error">{error}</p>}{notice && <p role="status" className="status">{notice}</p>}

    {view === "feedback" && <section aria-label="Feedback inbox">
      <div className="admin-section-heading"><div><h2>Feedback inbox</h2><p>{newCount ? `${newCount} message${newCount === 1 ? "" : "s"} awaiting review.` : "All feedback has been reviewed."}</p></div></div>
      {!feedback.length ? <div className="empty feedback-empty"><Inbox size={28}/><h3>No feedback yet</h3><p>Messages submitted from Tutoria will appear here.</p></div> : <div className="feedback-inbox">
        {feedback.map((item) => <article className={`feedback-card ${item.status}`} key={item.id}>
          <div className="feedback-card-top"><div className="feedback-badges"><span className={`urgency-badge urgency-${item.urgency}`}>{item.urgency} · {urgencyLabel[item.urgency]}</span><span className="feedback-kind">{kindLabel[item.kind]}</span>{item.status === "resolved" && <span className="resolved-badge"><CheckCircle2 size={14}/> Resolved</span>}</div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>
          <p className="feedback-message">{item.message}</p>
          <dl className="feedback-details">
            <div><dt>Page</dt><dd>{[item.context_kind, item.context_title, item.context_id].filter(Boolean).join(" · ") || item.page_title || "Tutoria page"}</dd></div>
            <div><dt>Path</dt><dd><a href={item.page_path} target="_blank" rel="noreferrer">{item.page_path}</a></dd></div>
            <div><dt>From</dt><dd>{item.reporter_name || "Anonymous visitor"}</dd></div>
          </dl>
          <div className="feedback-card-actions">{item.status === "new" ? <button className="primary" disabled={busy} onClick={() => void run(async () => { await api(`/api/admin/feedback?id=${encodeURIComponent(item.id)}`, { status: "resolved" }, "PATCH"); setNotice("Feedback marked as resolved."); })}><CheckCircle2 size={15}/> Mark resolved</button> : <button className="secondary" disabled={busy} onClick={() => void run(async () => { await api(`/api/admin/feedback?id=${encodeURIComponent(item.id)}`, { status: "new" }, "PATCH"); setNotice("Feedback returned to the inbox."); })}><RotateCcw size={15}/> Reopen</button>}</div>
        </article>)}
      </div>}
    </section>}

    {view === "accounts" && <>
      <form className="editor-form exchange-stage" onSubmit={(event) => { event.preventDefault(); void run(async () => { await api("/api/admin/accounts", { name, username, password }); setName(""); setUsername(""); setPassword(""); setNotice("Teacher created. They must replace their temporary password at first login."); }); }}>
        <h2>Add a teacher</h2><div className="two-fields"><label>Full name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)}/></label><label>Username<input required pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,59}" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off"/></label></div><label>Temporary password — at least 8 characters<input required type="password" minLength={8} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password"/></label><button disabled={busy} className="primary">Create teacher account</button>
      </form>
      <h2>Accounts</h2><div className="account-list">{accounts.map((account) => <div className="exchange-stage" key={account.id}><h3>{account.name}</h3><p>{account.username} · {account.role}{account.must_change ? " · Password change required" : ""}</p><div className="editor-actions"><button disabled={busy} className="secondary" onClick={() => { setReset(account); setPassword(""); setRemove(null); }}>Reset password</button>{account.id !== session.user.id && <button disabled={busy} className="secondary" onClick={() => { setRemove(account); setReset(null); }}>Delete account</button>}</div></div>)}</div>
      {reset && <form className="editor-form exchange-stage" onSubmit={(event) => { event.preventDefault(); void run(async () => { await api(`/api/admin/password?id=${encodeURIComponent(reset.id)}`, { password }); if (reset.id === session.user.id) { window.location.href = "/teacher/login/"; return; } setReset(null); setPassword(""); setNotice("Password reset. Existing sessions have been signed out."); }); }}><h2>Reset password for {reset.name}</h2><p>This signs the account out on all devices. They must choose a new password after signing in.</p><label>New temporary password<input type="password" required minLength={12} maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password"/></label><div className="editor-actions"><button disabled={busy} className="primary">Reset password</button><button type="button" className="secondary" onClick={() => { setReset(null); setPassword(""); }}>Cancel</button></div></form>}
      {remove && <section className="exchange-stage"><h2>Delete {remove.name}&apos;s account?</h2><p>This removes their login access. Shared folders and lessons stay available to the other teachers. Their username will remain reserved.</p><div className="editor-actions"><button disabled={busy} className="primary" onClick={() => void run(async () => { await api(`/api/admin/account?id=${encodeURIComponent(remove.id)}`, {}, "DELETE"); setRemove(null); setNotice("Account removed. Shared lessons have been kept."); })}>Delete account</button><button className="secondary" onClick={() => setRemove(null)}>Cancel</button></div></section>}
    </>}
  </Shell>;
}
