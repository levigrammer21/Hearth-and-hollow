import { mkdir, copyFile, cp } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const f of [
  "index.html",
  "style.css",
  "app.mjs",
  "engine.mjs",
  "content.mjs",
  "world.mjs",
  "cloud.mjs",
  "firebase-config.js",
  "manifest.webmanifest",
  "sw.js",
  "icon.svg",
])
  await copyFile(f, "dist/" + f);
await cp("img", "dist/img", { recursive: true });
console.log("Static game packaged in dist/");
