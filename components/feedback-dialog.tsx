"use client";

import { useState } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type FeedbackContext = {
  kind: string;
  id?: string;
  title?: string;
};

const urgencyOptions = [
  [1, "Critical", "The website cannot be used"],
  [2, "High", "A major feature is blocked"],
  [3, "Medium", "Something works incorrectly"],
  [4, "Low", "A small issue or inconvenience"],
  [5, "Minor", "A typo or cosmetic detail"],
] as const;

export default function FeedbackDialog({ context }: { context: FeedbackContext }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"bug" | "improvement" | "content">("bug");
  const [urgency, setUrgency] = useState(3);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const reset = () => {
    setKind("bug");
    setUrgency(3);
    setMessage("");
    setError("");
    setSent(false);
  };

  const contextLabel = [context.kind, context.title, context.id]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <button className="feedback-trigger" type="button">
          <MessageSquarePlus size={17} />
          <span>Feedback</span>
        </button>
      </DialogTrigger>
      <DialogContent className="feedback-dialog">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you for the feedback.</DialogTitle>
              <DialogDescription>
                Your message is now in the administrator inbox with this page attached.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <button className="primary" type="button">Done</button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form
            className="feedback-form"
            onSubmit={(event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              void api("/api/feedback", {
                kind,
                urgency,
                message,
                pagePath: `${window.location.pathname}${window.location.search}`,
                pageTitle: document.title,
                contextKind: context.kind,
                contextId: context.id || "",
                contextTitle: context.title || "",
              })
                .then(() => setSent(true))
                .catch((caught) => setError((caught as Error).message))
                .finally(() => setBusy(false));
            }}
          >
            <DialogHeader>
              <DialogTitle>Send feedback</DialogTitle>
              <DialogDescription>
                Report a problem or suggest a change. The current page is attached automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="feedback-source">
              <strong>Page being reported</strong>
              <span>{contextLabel || "Current page"}</span>
            </div>

            <label>
              Feedback type
              <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                <option value="bug">Report a bug</option>
                <option value="improvement">Suggest an improvement</option>
                <option value="content">Report a content issue</option>
              </select>
            </label>

            <fieldset className="urgency-scale">
              <legend>Urgency</legend>
              <div className="urgency-options">
                {urgencyOptions.map(([value, label, detail]) => (
                  <label className={urgency === value ? "selected" : ""} key={value}>
                    <input
                      type="radio"
                      name="feedback-urgency"
                      value={value}
                      checked={urgency === value}
                      onChange={() => setUrgency(value)}
                    />
                    <strong>{value}</strong>
                    <span>{label}</span>
                    <small>{detail}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              What happened, or what would you improve?
              <textarea
                required
                minLength={5}
                maxLength={4000}
                rows={6}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Include what you expected and what you saw."
              />
            </label>
            <div className="feedback-form-bottom">
              <span>{message.length}/4000</span>
              {error && <p className="status error" role="alert">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <button className="secondary" type="button">Cancel</button>
              </DialogClose>
              <button className="primary" disabled={busy || message.trim().length < 5} type="submit">
                <Send size={15} /> {busy ? "Sending…" : "Send feedback"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
