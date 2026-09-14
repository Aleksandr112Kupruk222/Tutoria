import assert from "node:assert/strict";
import { build } from "esbuild";

await build({
  entryPoints: ["lib/lessons.ts"],
  outfile: ".sites-runtime/transcript-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { cleanTranscript, parseTranscript } = await import(
  "../.sites-runtime/transcript-test.mjs"
);

const rolling = `WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:02.000
Hello everyone. Welcome back to another

00:00:02.000 --> 00:00:05.000
Hello everyone. Welcome back to another Unreal Engine tutorial for this week.

00:00:05.000 --> 00:00:07.000
Unreal Engine tutorial for this week. Earlier we tackled the distraction challenge.

00:00:07.000 --> 00:00:10.000
Earlier we tackled the distraction challenge. Now open the AI Controller class.
`;

const parsed = parseTranscript(rolling, "screen");
assert.equal(parsed.some((cue) => /Kind: captions|Language: en/.test(cue.text)), false);
const cleaned = cleanTranscript(parsed);
const joined = cleaned.map((cue) => cue.text).join(" ");
assert.equal((joined.match(/Hello everyone/g) || []).length, 1);
assert.equal((joined.match(/tutorial for this week/g) || []).length, 1);
assert.equal((joined.match(/distraction challenge/g) || []).length, 1);
assert.match(joined, /Now open the AI Controller class/);
assert(cleaned.every((cue) => Number.isInteger(cue.seconds)));

const ordinary = cleanTranscript([
  { seconds: 0, mediaId: "screen", text: "Create the Blueprint." },
  { seconds: 20, mediaId: "screen", text: "Create the Blueprint again for the enemy." },
]);
assert.equal(ordinary.length, 2);
assert.match(ordinary[1].text, /Create the Blueprint again/);

console.log("Passed rolling-caption cleanup, metadata removal and distant repetition preservation.");
