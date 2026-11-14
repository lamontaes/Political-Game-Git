import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * One reading of how far a budget line stands above its base (owner rule: one engine per mechanic;
 * found Nov 14 while pinning the housing family test). A state's or county's adopted line is scaled by
 * its receipts (`receiptsFactor`), which `baseBudget` leaves out, so a line minus `baseBudget` reads a
 * line no bill raised as raised and hides a real raise when the factor is below one. A reader takes a
 * line's extra with `lineExtra`, or its zero with `lineWithoutBills`, both in modules/budgets.ts. Only
 * the receipts side of a base row (`baseBudget(...).revenueMinor`) may still come from `baseBudget`
 * outside that file.
 */
const OWNER = "src/core2/modules/budgets.ts";
const REVENUE_ONLY = /baseBudget\s*\(\s*[^()]*\)\s*\.\s*revenueMinor/g;
const ANY = /baseBudget\s*\(/g;

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(path);
  }
  return out;
}

describe("a line's extra is read one way", () => {
  it("no reader takes the spending side of baseBudget, which leaves out the receipts scaling", () => {
    const bad = sources("src")
      .filter((f) => f !== OWNER)
      .filter((f) => {
        const text = readFileSync(f, "utf8").replace(
          /^\s*import[^;]*?\bbaseBudget\b[^;]*;/gm,
          "",
        );
        const all = text.match(ANY)?.length ?? 0;
        const revenue = text.match(REVENUE_ONLY)?.length ?? 0;
        return all > revenue;
      });
    expect(bad).toEqual([]);
  });
});
