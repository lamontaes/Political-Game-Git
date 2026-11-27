import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { posix as path } from "node:path";
const [, , report, browser, playApi] = process.argv;
if (!report || !browser || !playApi)
  throw new Error("Pass Knip, browser shipping and desktop shipping reports.");
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const shipped = new Set([...read(browser).files, ...read(playApi).files]);
const files = git("ls-files", "-z")
  .split("\0")
  .filter((file) => file && existsSync(file));
const rows = read(report).issues.filter((row) => row.files.length);
const candidates = new Set(rows.map((row) => row.file));
const aliases = new Map();
const reasons = new Map();
const keep = (file, reason) => {
  if (!reasons.has(file)) reasons.set(file, reason);
};
for (const { file } of rows) {
  if (shipped.has(file))
    keep(file, "Observed in a shipped bundle or runtime copy.");
  else if (
    !/^(?:src|scripts)\//.test(file) ||
    /\.(?:d|generated|config|test|spec|browser)\./.test(file) ||
    /^src\/(?:director|bench\/ui)\//.test(file)
  )
    keep(
      file,
      "Configuration, authoring, type companion, test, or dynamic loader surface.",
    );
  const name = path.basename(file);
  for (const key of [name, name.replace(/\.[^.]+$/, "")]) {
    if (key.length < 5)
      keep(file, "Short or generic basename can be constructed by a launcher.");
    const targets = aliases.get(key) ?? new Set();
    targets.add(file);
    aliases.set(key, targets);
  }
}
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const keys = [...aliases.keys()].sort((a, b) => b.length - a.length);
const names = new RegExp(
  `(?<![\\w.-])(?:${keys.map(escape).join("|")})(?![\\w.-])`,
  "g",
);
for (const file of files) {
  if (
    !/\.(?:[cm]?[jt]sx?|tsx|mts|html|sh|md|ya?ml|json|txt|toml|ini|cmd)$/i.test(
      file,
    ) ||
    file.includes(".generated.") ||
    file === "docs/coordination/refactor/repo-sort.json"
  )
    continue;
  for (const [key] of readFileSync(file, "utf8").matchAll(names))
    for (const target of aliases.get(key) ?? [])
      if (target !== file) keep(target, `Named outside itself by ${file}`);
}
console.log(
  JSON.stringify(
    [...candidates].map((file) => ({
      file,
      reason: reasons.get(file) ?? null,
    })),
    null,
    2,
  ),
);
