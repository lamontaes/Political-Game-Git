import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
export function historicalEvidenceHashes() {
  const files = execFileSync("git", ["ls-files", "-z", "docs/agent/evidence"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  return Object.fromEntries(
    files.map((file) => [
      file,
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]),
  );
}
