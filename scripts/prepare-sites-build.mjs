import { copyFile, mkdir } from "node:fs/promises";
import { URL } from "node:url";

const projectRoot = new URL("../", import.meta.url);
const workerSource = new URL("deployment/sites-worker/index.js", projectRoot);
const workerConfig = new URL(
  "deployment/sites-worker/wrangler.json",
  projectRoot,
);
const serverOutput = new URL("dist/server/", projectRoot);

await mkdir(serverOutput, { recursive: true });
await Promise.all([
  copyFile(workerSource, new URL("index.js", serverOutput)),
  copyFile(workerConfig, new URL("wrangler.json", serverOutput)),
]);
