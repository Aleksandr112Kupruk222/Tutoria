"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/tutoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { LockKeyhole, ArrowRight } from "lucide-react";
export default function Login() {
  const [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Shell>
      <div className="login-layout">
        <section className="login-intro">
          <div className="eyebrow">FOR THE PEOPLE WHO TEACH</div>
          <h1>
            Your lessons.
            <br />
            <span>Your workspace.</span>
          </h1>
          <p>
            Organise videos, turn transcripts into practical guides, and give
            students a clear next step.
          </p>
          <span className="hero-motto">CREATE | REVIEW | SHARE</span>
        </section>
        <form
          className="login-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/auth/login", { username: user, password });
              window.location.href = "/teacher/";
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <span className="login-icon">
            <LockKeyhole size={25} />
          </span>
          <h2>Teacher login</h2>
          <p>Sign in to your own teaching workspace.</p>
          <label>
            Username
            <Input
              required
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Your teacher username"
            />
          </label>
          <label>
            Password
            <Input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <div role="alert" className="status error">
              {error}
            </div>
          )}
          <Button type="submit" className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <ArrowRight size={17} />
          </Button>
          <p className="login-note">
            Teacher accounts are provided by your course administrator.
          </p>
          <Link className="back" href="/">
            Back to student learning hub
          </Link>
        </form>
      </div>
    </Shell>
  );
}
