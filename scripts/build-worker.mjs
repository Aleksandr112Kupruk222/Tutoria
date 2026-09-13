import { build } from "esbuild";
import { mkdir, cp, readFile } from "node:fs/promises";
await mkdir("dist/server", { recursive: true });
await build({
  entryPoints: ["worker/index.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
await cp("out", "dist/client", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/.openai/drizzle", { recursive: true });
console.log("Worker, public assets and migrations prepared.");
