/**
 * Points every hand-built full name (`${x.givenName} ${x.familyName}`) in the director, the
 * English engine and the screens at `fullNameOf` in src/english/plain-words.mjs (CTO's story
 * audit, Nov 26, row C1). The text is the same, so a records digest and every line read the same;
 * what changes is that one function says how a name is joined. Re-runnable: it fixes any copy another
 * branch has added since. Talk's files stay out until Talk posts done (SKIP).
 *
 *   node scripts/story/point-names-at-the-one-function.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SKIP = new Set([
  "src/director/conversation.ts",
  "src/director/scene-talk.ts",
  "src/director/purpose-scene.ts",
  "src/english/plain-words.mjs",
]);
const FILES = execFileSync(
  "git",
  ["ls-files", "src/director", "src/english", "src/bench"],
  {
    cwd: ROOT,
    encoding: "utf8",
  },
)
  .split("\n")
  .filter(
    (file) =>
      /\.(ts|tsx|mjs)$/.test(file) &&
      !/\.(test|spec|browser|node-test)\.(ts|tsx|mjs)$/.test(file) &&
      !SKIP.has(file),
  );
const NAME = /`\$\{([\w.!?]+)\.givenName\} \$\{\1\.familyName\}`/g;
let changed = 0;
for (const file of FILES) {
  const text = readFileSync(path.join(ROOT, file), "utf8");
  if (!NAME.test(text)) continue;
  NAME.lastIndex = 0;
  let next = text.replace(NAME, "fullNameOf($1)");
  const spec = path.posix.relative(
    path.posix.dirname(file),
    "src/english/plain-words.mjs",
  );
  const from = spec.startsWith(".") ? spec : `./${spec}`;
  const existing = new RegExp(
    `^import \\{([^}]*)\\} from "${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}";$`,
    "m",
  ).exec(next);
  if (existing) {
    const names = [
      ...new Set([
        ...existing[1]
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
        "fullNameOf",
      ]),
    ].sort();
    next = next.replace(
      existing[0],
      `import { ${names.join(", ")} } from "${from}";`,
    );
  } else {
    // Before the first import; a file with none gets it after its leading comment (or at the top).
    const first = next.search(/^import /m);
    const lead = /^(?:\/\*[\s\S]*?\*\/\s*|(?:\/\/[^\n]*\n)+\s*)?/.exec(next)[0]
      .length;
    const at = first >= 0 ? first : lead;
    next = `${next.slice(0, at)}import { fullNameOf } from "${from}";\n${next.slice(at)}`;
  }
  writeFileSync(path.join(ROOT, file), next);
  changed += 1;
}
process.stdout.write(`${changed} files now call fullNameOf\n`);
