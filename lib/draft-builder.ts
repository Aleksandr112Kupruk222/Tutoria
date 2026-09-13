import type { Lesson } from "./lessons";
const glossary = [
  ["Blueprint", "Unreal Engine’s visual scripting system."],
  ["Actor", "An object that can be placed or spawned in an Unreal level."],
  ["Event Tick", "An Unreal event that runs every frame while enabled."],
  ["BeginPlay", "An event called when play begins for an Actor."],
  ["Static Mesh", "Geometry used for an object whose mesh does not deform."],
  ["Material", "A definition of how a surface is rendered."],
  [
    "Collision",
    "Rules and shapes that determine how objects interact physically.",
  ],
  ["UV", "Two-dimensional coordinates used to place textures on a mesh."],
  ["Extrude", "Extend selected mesh geometry to create additional faces."],
  ["Bevel", "Add geometry along an edge to soften or chamfer it."],
  ["Normal", "A direction perpendicular to a surface, used in shading."],
  [
    "Keyframe",
    "A recorded property value at a specific point in an animation.",
  ],
  ["Variable", "A named value that can be read and changed."],
  [
    "Vector",
    "A set of components representing quantities such as direction or position.",
  ],
  ["GDScript", "Godot’s built-in scripting language."],
];
const action =
  /\b(create|add|select|connect|set|open|drag|click|change|rename|save|compile|duplicate|extrude|move|rotate|scale|apply|import|enable|disable|press|attach|delete)\b/i;
const caution =
  /\b(don['’]?t|do not|undo|actually|instead|mistake|wrong|shouldn['’]?t|won['’]?t|not working)\b/i;
export function buildTranscriptDraft(
  lesson: Lesson,
  description = "",
): { lesson: Lesson; notes: string[] } {
  if (!lesson.transcript.length)
    throw new Error("Import or paste a transcript first.");
  const cues = lesson.transcript;
  const notes = [
    "Suggestions were extracted by rules, not AI. Check each step against the video.",
    "No code, quizzes or extension tasks were invented.",
  ];
  const chapterMatches = [
    ...description.matchAll(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+)$/gm),
  ].map((m) => ({
    seconds: Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]),
    title: m[4].trim(),
  }));
  const chapters = chapterMatches.filter(
    (x, i, a) => x.seconds >= 0 && (!i || x.seconds > a[i - 1].seconds),
  );
  const buckets: {
    seconds: number;
    mediaId: string;
    text: string;
    title?: string;
  }[] = [];
  for (const cue of cues) {
    const prev = buckets[buckets.length - 1];
    const chapter = chapters.find(
      (c) => c.seconds <= cue.seconds && (!prev || c.seconds > prev.seconds),
    );
    const transition =
      /\b(next (?:we|you)|now (?:we|let)|moving on|in this (?:part|section))\b/i.test(
        cue.text,
      );
    if (
      !prev ||
      cue.mediaId !== prev.mediaId ||
      chapter ||
      cue.seconds - prev.seconds >= 75 ||
      (transition && cue.seconds - prev.seconds > 20)
    ) {
      buckets.push({
        seconds: chapter?.seconds ?? cue.seconds,
        mediaId: cue.mediaId,
        text: cue.text,
        title: chapter?.title,
      });
    } else prev.text += " " + cue.text;
  }
  const steps: Lesson["steps"] = [];
  for (const b of buckets) {
    if (!action.test(b.text) && !b.title) continue;
    const sentences = b.text.split(/(?<=[.!?])\s+/);
    const actionable = sentences.find((s) => action.test(s)) || b.text;
    const match = action.exec(actionable);
    const excerpt = (match ? actionable.slice(match.index) : actionable)
      .replace(/[.!?].*$/, "")
      .trim();
    const title = b.title || excerpt.split(/\s+/).slice(0, 10).join(" ");
    const warned = caution.test(b.text);
    steps.push({
      id: `step-${steps.length + 1}`,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      seconds: b.seconds,
      mediaId: b.mediaId,
      body: b.text,
      check: warned
        ? "Review needed: this passage contains a correction or warning. Confirm the final action shown in the video."
        : "Review needed: add a clear checkpoint for this step.",
    });
    if (warned)
      notes.push(`Step ${steps.length} includes a correction or warning.`);
  }
  if (!steps.length) {
    steps.push({
      id: "step-1",
      title: "Review the tutorial",
      seconds: cues[0].seconds,
      mediaId: cues[0].mediaId,
      body: cues.map((c) => c.text).join(" "),
      check:
        "No clear action phrases were detected. Split this transcript into steps manually.",
    });
    notes.push("No clear action phrases were detected.");
  }
  const all = cues.map((c) => c.text).join(" ");
  const concepts = glossary
    .filter(([term]) =>
      new RegExp(
        "\\b" + term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "i",
      ).test(all),
    )
    .map(([term, definition]) => ({ term, definition }));
  const troubleshooting = cues
    .filter((c) => caution.test(c.text))
    .slice(0, 12)
    .map((c) => ({
      problem: `Review advice at ${Math.floor(c.seconds / 60)}:${String(c.seconds % 60).padStart(2, "0")}`,
      solution: c.text,
    }));
  return {
    lesson: {
      ...lesson,
      steps,
      concepts,
      troubleshooting,
      objectives: steps
        .slice(0, 5)
        .map(
          (s) =>
            `Be able to ${s.title.charAt(0).toLowerCase() + s.title.slice(1)}.`,
        ),
    },
    notes,
  };
}
