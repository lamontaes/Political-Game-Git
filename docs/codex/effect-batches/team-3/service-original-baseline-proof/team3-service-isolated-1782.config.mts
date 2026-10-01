import { execFileSync } from "node:child_process";
import path from "node:path";
import { appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { mergeConfig } from "/workspace/Political-Game-Git/node_modules/vite/dist/node/index.js";
import base from "/workspace/Political-Game-Git/vite.config";

const root = "/workspace/Political-Game-Git";
const head = process.env.TEAM3_SERVICE_SOURCE_HEAD;
if (!head) throw new Error("Exact original source head is required");
const manifest = process.env.TEAM3_SERVICE_SOURCE_MANIFEST;
if (!manifest) throw new Error("Exact source manifest path is required");
const files = new Set(
  execFileSync("git", ["ls-tree", "-r", "--name-only", head, "src", "data"], {
    cwd: root,
    encoding: "utf8",
  })
    .trim()
    .split("\n"),
);
const sources = new Map<string, string>();

export default mergeConfig(base, {
  plugins: [
    {
      name: "team-3-isolated-original-source-service-proof",
      enforce: "pre" as const,
      load(id: string) {
        const clean = id.split("?")[0]!;
        const relative = path.relative(root, clean);
        if (!relative.startsWith("src/") && !relative.startsWith("data/"))
          return null;
        if (!/\.(ts|tsx|js|jsx|json)$/.test(relative)) return null;
        if (!files.has(relative))
          throw new Error(`Pinned source ${head} has no ${relative}`);
        let source = sources.get(relative);
        if (source === undefined) {
          source = execFileSync("git", ["show", `${head}:${relative}`], {
            cwd: root,
            encoding: "utf8",
            maxBuffer: 32 * 1024 * 1024,
          });
          sources.set(relative, source);
          appendFileSync(
            manifest,
            JSON.stringify({
              head,
              path: relative,
              sha256: createHash("sha256").update(source).digest("hex"),
            }) + "\n",
          );
        }
        return source;
      },
    },
  ],
});
