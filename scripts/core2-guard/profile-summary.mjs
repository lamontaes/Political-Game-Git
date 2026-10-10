/* global process */
import { execFileSync } from "node:child_process";
const [summarizer, profile, top] = process.argv.slice(2);
const result = JSON.parse(
  execFileSync(process.execPath, [summarizer, profile, top], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }),
);
process.stdout.write(
  JSON.stringify({
    totalMs: result.totalMs,
    self: result.self,
    total: result.total,
  }),
);
