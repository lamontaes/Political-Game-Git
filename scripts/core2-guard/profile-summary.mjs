/* global process */
import { execFileSync } from "node:child_process";
import policies from "./policies.json" with { type: "json" };
const [summarizer, profile, top] = process.argv.slice(2);
const result = JSON.parse(
  execFileSync(process.execPath, [summarizer, profile, top], {
    encoding: "utf8",
    maxBuffer: policies.profileParseBytes,
  }),
);
process.stdout.write(
  JSON.stringify({
    totalMs: result.totalMs,
    self: result.self,
    total: result.total,
  }),
);
