/**
 * Elections item 1, the caller switch: every `import` or `export ... from` of
 * partyName, partySide, nationalParty or caucusSide from appointments moves to
 * party-sides (the elections leaf file that holds them), so appointments.ts can
 * drop its re-export. Re-runnable: a file already switched is left alone.
 *
 *   node --import tsx scripts/elections/switch-party-sides-importers.ts [--check]
 *
 * `--check` lists what it would change and exits 1 when anything is left.
 * `--except <file>` skips the files named in it (one path per line): the files
 * another session is editing, which are left for the CTO's re-run after those land.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const MOVED = new Set([
  "partyName",
  "partySide",
  "nationalParty",
  "caucusSide",
]);
const STATEMENT =
  /(import|export)(\s+type)?\s*\{([^}]*)\}\s*from\s*(["'])([^"']*\/appointments|\.\/appointments)\4;?/g;

const check = process.argv.includes("--check");
const exceptAt = process.argv.indexOf("--except");
const except = new Set(
  exceptAt >= 0
    ? readFileSync(process.argv[exceptAt + 1]!, "utf8")
        .split("\n")
        .filter(Boolean)
    : [],
);
const files = execFileSync(
  "git",
  ["ls-files", "src", "scripts", "tests", "*.mjs"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter((f) => /\.(ts|tsx|mjs)$/.test(f))
  .filter(
    (f) =>
      f !== "src/core2/appointments.ts" &&
      f !== "src/core2/party-sides.ts" &&
      !except.has(f),
  );

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(
    STATEMENT,
    (
      whole,
      keyword: string,
      type: string | undefined,
      list: string,
      quote: string,
      path: string,
    ) => {
      const names = list
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      const bare = (n: string) =>
        n.replace(/^type\s+/, "").split(/\s+as\s+/)[0]!;
      const moved = names.filter((n) => MOVED.has(bare(n)));
      if (!moved.length) return whole;
      const kept = names.filter((n) => !MOVED.has(bare(n)));
      const to = path.replace(/appointments$/, "party-sides");
      const make = (ns: string[], target: string) =>
        `${keyword}${type ?? ""} { ${ns.join(", ")} } from ${quote}${target}${quote};`;
      return [kept.length ? make(kept, path) : null, make(moved, to)]
        .filter(Boolean)
        .join("\n");
    },
  );
  if (after === before) continue;
  changed += 1;
  if (check) console.log(file);
  else writeFileSync(file, after);
}
console.log(`${changed} file(s) ${check ? "to switch" : "switched"}`);
if (check && changed) process.exit(1);
