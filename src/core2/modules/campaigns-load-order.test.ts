import { describe, expect, it, vi } from "vitest";

/**
 * The campaign engine's files import each other and the files around the
 * entry, so each of them must load as the very first file of a process:
 * `campaigns-base.ts` and `campaigns-work.ts` once threw "Cannot access
 * 'DONATION_KIND' before initialization" when loaded first, because the
 * entry's module object read a constant the base had not yet set. The
 * dependency-free constants now sit in `campaigns-constants.ts`, which
 * imports nothing, so no order can find one of them uninitialized.
 *
 * Each file is loaded in a fresh module registry, the base and the work file
 * first, then every other file of the engine (CTO, Nov 27, 5:36 a.m.).
 */
const loaders = import.meta.glob(["./campaigns*.ts", "!./*.test.ts"]) as Record<
  string,
  () => Promise<Record<string, unknown>>
>;
const first = ["./campaigns-base.ts", "./campaigns-work.ts"];
const order = [
  ...first,
  ...Object.keys(loaders)
    .filter((file) => !first.includes(file))
    .sort(),
];

describe("each campaign file loads as the first file of a process", () => {
  it("finds the files it is about", () => {
    expect(order.length).toBeGreaterThanOrEqual(16);
    for (const file of first)
      expect(loaders[file], file).toBeTypeOf("function");
  });

  for (const file of order)
    it(`${file}`, async () => {
      vi.resetModules();
      const loaded = await loaders[file]!();
      expect(Object.keys(loaded).length, file).toBeGreaterThanOrEqual(0);
    }, 120_000);
});
