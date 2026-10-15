import base from "/workspace/Political-Game-Git/vite.config.ts";
import { execFileSync } from "node:child_process";
const root = "/workspace/Political-Game-Git/";
const files = new Set([
  "src/presentation/enacted-law-effects.test.ts",
  "src/presentation/enacted-duties.test.ts",
]);
export default {
  ...base,
  plugins: [
    {
      name: "team6-exact-team2-a80-fixtures",
      enforce: "pre",
      load(id) {
        const path = id.split("?")[0];
        const relative = path.slice(root.length);
        if (path.startsWith(root) && files.has(relative))
          return execFileSync(
            "git",
            ["show", "75608f984640b6206a0452298830e4f4049ba880:" + relative],
            { cwd: root, encoding: "utf8" },
          );
      },
    },
    ...base.plugins,
  ],
};
