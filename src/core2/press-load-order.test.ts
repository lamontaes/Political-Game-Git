/**
 * Each part of the press loads first without a crash. The parts import each
 * other downward and the modules around them import the press, so a part
 * loaded as the very first file of a process must find everything it reads
 * already built ("Cannot access ... before initialization" otherwise). One
 * fresh process per file, the file the only thing it imports.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, it } from "vitest";

const modules = path.resolve(import.meta.dirname, "modules");
const PARTS = [
  "press",
  "press-base",
  "press-briefs",
  "press-desk-reads",
  "press-exposure",
  "press-ids",
  "press-interviews",
  "press-open",
  "press-outlets",
  "press-staffing",
  "press-stories",
  "press-week",
];

for (const part of PARTS)
  it(`${part}.ts loads first in a fresh process`, () => {
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "-e",
        `import(${JSON.stringify(path.join(modules, `${part}.ts`))}).then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });`,
      ],
      { encoding: "utf8", timeout: 120_000 },
    );
    expect(run.status, `${part}: ${run.stderr.slice(0, 600)}`).toBe(0);
  }, 150_000);
