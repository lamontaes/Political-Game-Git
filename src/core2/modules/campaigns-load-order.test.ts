import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The campaign engine's files import each other and the files around the
 * entry, so each of them must load as the very first file of a process:
 * `campaigns-base.ts` and `campaigns-work.ts` once threw "Cannot access
 * 'DONATION_KIND' before initialization" when loaded first, because the
 * entry's module object read a constant the base had not yet set. The
 * dependency-free constants now sit in `campaigns-constants.ts`, which
 * imports nothing, so no order can find one of them uninitialized.
 *
 * Each file is loaded in a fresh Node process (vitest's own loader orders
 * circular imports differently and does not reproduce the failure), the base
 * and the work file first, then every other file of the engine (CTO, Nov 27,
 * 5:36 a.m.).
 */
const folder = __dirname;
const files = readdirSync(folder)
  .filter((f) => /^campaigns.*\.ts$/.test(f) && !f.endsWith(".test.ts"))
  .sort();
const first = ["campaigns-base.ts", "campaigns-work.ts"];
const order = [...first, ...files.filter((f) => !first.includes(f))];

function loadFirst(file: string): void {
  execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(path.join(folder, file))})`,
    ],
    { cwd: path.resolve(folder, "../../.."), stdio: "pipe", timeout: 110_000 },
  );
}

describe("each campaign file loads as the first file of a process", () => {
  it("finds the files it is about", () => {
    expect(order.length).toBeGreaterThanOrEqual(16);
    for (const file of first) expect(files, file).toContain(file);
  });

  for (const file of order)
    it(
      file,
      () => {
        expect(() => loadFirst(file), file).not.toThrow();
      },
      120_000,
    );
});
