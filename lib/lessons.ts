import { z } from "zod";
import sampleData from "../content/player-controller.json";
const text = z.string().trim().min(1),
  time = z.number().int().min(0);
const makeLessonSchema = (text: z.ZodString, minimum: number) =>
  z
    .object({
      schemaVersion: z.literal(1),
      id: text,
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      title: text,
      description: text,
      module: text,
      difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
      durationMinutes: z.number().int().positive(),
      tags: z.array(text).min(minimum),
      sample: z.boolean(),
      teacherReviewNotes: z.array(z.string().max(20000)).max(100).optional(),
      media: z
        .array(
          z.object({
            id: text,
            role: z.enum(["tutorial", "classroom"]),
            provider: z.literal("youtube"),
            videoId: z.string().regex(/^[\w-]{11}$/),
            title: text,
          }),
        )
        .min(1),
      objectives: z.array(text).min(minimum),
      steps: z
        .array(
          z.object({
            id: text,
            title: text,
            mediaId: text,
            seconds: time,
            body: text,
            code: z.string().optional(),
            check: text,
          }),
        )
        .min(minimum),
      transcript: z
        .array(z.object({ seconds: time, text: text, mediaId: text }))
        .min(minimum),
      concepts: z.array(z.object({ term: text, definition: text })),
      troubleshooting: z.array(z.object({ problem: text, solution: text })),
      extensions: z
        .array(
          z.object({
            level: z.enum(["Beginner", "Intermediate", "Advanced"]),
            title: text,
            body: text,
          }),
        )
        .max(3),
      quiz: z.array(
        z.object({
          id: text,
          question: text,
          options: z.array(text).min(2),
          answer: z.number().int().min(0),
          explanation: text,
        }),
      ),
      resources: z.array(
        z.object({
          title: text,
          url: z
            .string()
            .url()
            .refine((v) => /^https:\/\//.test(v), "Use HTTPS"),
          description: text,
        }),
      ),
    })
    .superRefine((l, c) => {
      for (const a of [l.media, l.steps, l.quiz])
        if (new Set(a.map((x) => x.id)).size !== a.length)
          c.addIssue({
            code: "custom",
            message: "IDs must be unique within each collection",
          });
      for (const x of [...l.steps, ...l.transcript])
        if (!l.media.some((m) => m.id === x.mediaId))
          c.addIssue({ code: "custom", message: "Unknown media reference" });
      for (const q of l.quiz)
        if (q.answer >= q.options.length)
          c.addIssue({
            code: "custom",
            message: "Quiz answer is outside its options",
          });
      if (
        new Set(l.extensions.map((x) => x.level)).size !== l.extensions.length
      )
        c.addIssue({
          code: "custom",
          message: "Only one extension per difficulty is allowed",
        });
    });
export const lessonSchema = makeLessonSchema(text, 1);
export const draftLessonSchema = makeLessonSchema(z.string().max(100000), 0);
export type Lesson = z.infer<typeof lessonSchema>;
export const sampleLesson: Lesson = lessonSchema.parse(sampleData);
export const lessons = [lessonSchema.parse(sampleLesson)];
export const stamp = (n: number) =>
  `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
export function youtubeId(value: string) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    const h = u.hostname.replace(/^www\./, "");
    const id =
      h === "youtu.be"
        ? u.pathname.slice(1)
        : ["youtube.com", "m.youtube.com"].includes(h)
          ? u.searchParams.get("v") ||
            u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1]
          : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function parseTranscript(
  raw: string,
  mediaId: string,
): Lesson["transcript"] {
  const result: Lesson["transcript"] = [];
  let seconds = 0,
    buffer: string[] = [];
  const flush = () => {
    if (buffer.length)
      result.push({ seconds, text: buffer.join(" ").trim(), mediaId });
    buffer = [];
  };
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const s = line.trim();
    if (!s || s === "WEBVTT" || /^\d+$/.test(s)) continue;
    const m = s.match(
      /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,]\d+)?(?:\s*-->.*|\s+(.+))?$/,
    );
    if (m) {
      flush();
      seconds = Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      if (m[4]) buffer.push(m[4]);
    } else buffer.push(s.replace(/<[^>]*>/g, ""));
  }
  flush();
  if (!result.length) throw new Error("Paste a non-empty transcript.");
  return result;
}
