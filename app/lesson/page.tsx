"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Lesson } from "@/lib/lessons";
import { Shell, LessonView } from "@/components/tutoria";
export default function LessonPage() {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [folderId, setFolderId] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      setError("Choose a lesson from the library.");
      return;
    }
    api<{ lesson: Lesson; folderId: string }>(`/api/lesson?id=${encodeURIComponent(id)}`)
      .then((r) => {setLesson(r.lesson);setFolderId(r.folderId);})
      .catch((e) => setError(e.message));
  }, []);
  return lesson ? (
    <LessonView lesson={lesson} folderId={folderId} />
  ) : (
    <Shell>
      <div className="empty">
        {error ? (
          <>
            <h2>Lesson unavailable</h2>
            <p role="alert">{error}</p>
            <Link href="/" className="primary">
              Back to library
            </Link>
          </>
        ) : (
          <p role="status">Loading lesson…</p>
        )}
      </div>
    </Shell>
  );
}
