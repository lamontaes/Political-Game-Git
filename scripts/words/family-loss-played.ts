/**
 * Plays the talk after a lost race at its three pinned places (Pomeroy WA,
 * Vineyard UT, Walled Lake MI) and writes the played file the readers stamp,
 * headed with the head's sha. Development tooling; shipped play never imports
 * it. About ten minutes.
 *
 *   node --import tsx scripts/words/family-loss-played.ts <out-file>
 */
import { execFileSync } from "node:child_process";

const out = process.argv[2];
if (!out) throw new Error("usage: family-loss-played.ts <out-file>");
const sha = execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
execFileSync(
  "npx",
  ["vitest", "run", "src/director/family-loss-stake-scene.test.ts"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYED_FILE: out,
      PLAYED_SHA: sha,
      NODE_OPTIONS: "--max-old-space-size=7000",
    },
  },
);
