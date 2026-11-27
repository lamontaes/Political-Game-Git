import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const source = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!source) throw new Error("Pass the checked unused-file inventory.");
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const files = new Set(git("ls-files", "-z").split("\0"));
const root =
  /^(?:scripts\/(?:core2-year|dev-tests|dialogue-batch|play-walks|speed-years|words|world-proofs)\/)/;
const rows = JSON.parse(readFileSync(source, "utf8"));
const planned = [];
const retained = [];
for (const { file, reason } of rows) {
  if (!files.has(file)) continue;
  if (
    reason ||
    !root.test(file) ||
    /\.(?:test|node-test|spec|browser)\./.test(file)
  ) {
    retained.push({
      file,
      reason:
        reason ??
        "Preserve a data generator, research check or maintainer entrypoint.",
    });
    continue;
  }
  const code = readFileSync(file, "utf8");
  if (
    /\b(?:assert\s*[.(]|expect\s*\(|process\.exitCode\s*=|owner (?:said|rul)|rulings? verbatim)/i.test(
      code,
    )
  ) {
    retained.push({
      file,
      reason: "Potential check or owner record; not an uncalled probe.",
    });
    continue;
  }
  planned.push(file);
}
if (process.argv.includes("--apply") && planned.length)
  git("rm", "--", ...planned);
console.log(JSON.stringify({ deleted: planned, retained }, null, 2));
