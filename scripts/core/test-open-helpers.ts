/**
 * Re-runnable: points every test and test kit that called `openRecord`,
 * `openClimate` or `openNationalEvents` at tests/support/open-modules.ts
 * (item 9: the world builder installs those engines from its list, so the
 * functions left src/). Run it again on a branch that added a test with one
 * of the old imports:
 *
 *   node --import tsx scripts/core/test-open-helpers.ts
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const NAMES = ["openRecord", "openClimate", "openNationalEvents"];
const HELPER = path.join(ROOT, "tests/support/open-modules.ts");

function files(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) files(full, found);
    else if (/\.(ts|tsx|mts)$/.test(name)) found.push(full);
  }
  return found;
}

const importPattern = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+"([^"]+)";\n/g;
let changed = 0;
for (const file of files(path.join(ROOT, "tests"))) {
  if (file === HELPER) continue;
  const text = readFileSync(file, "utf8");
  if (!NAMES.some((name) => new RegExp(`\\b${name}\\b`).test(text))) continue;
  const taken = new Set<string>();
  const rewritten = text.replace(
    importPattern,
    (whole, typeOnly: string | undefined, list: string, from: string) => {
      if (typeOnly || !/\/(record|climate|national-events)$/.test(from))
        return whole;
      const names = list
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const keep = names.filter((name) => !NAMES.includes(name));
      if (keep.length === names.length) return whole;
      for (const name of names) if (NAMES.includes(name)) taken.add(name);
      return keep.length
        ? `import { ${keep.join(", ")} } from "${from}";\n`
        : "";
    },
  );
  if (!taken.size) continue;
  let rel = path
    .relative(path.dirname(file), HELPER.replace(/\.ts$/, ""))
    .split(path.sep)
    .join("/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  const add = `import { ${[...taken].sort().join(", ")} } from "${rel}";\n`;
  const lastImport = [...rewritten.matchAll(/^import[^;]*;\n/gm)].pop();
  const at = lastImport ? lastImport.index! + lastImport[0].length : 0;
  writeFileSync(file, rewritten.slice(0, at) + add + rewritten.slice(at));
  changed += 1;
}
console.log(`test-open-helpers: ${changed} files pointed at the helper`);
