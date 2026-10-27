import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The budget sheet's rounding, read from play.mjs as the browser runs it:
 * whole dollars to three figures below a million, one decimal of a million,
 * billion or trillion above.
 */
const source = readFileSync(new URL("./play.mjs", import.meta.url), "utf8");
const block = (name: string) => {
  const start = source.indexOf(`const ${name} =`);
  const end = source.indexOf("};", start) + 2;
  const tail = source.slice(start, end);
  // compactWords ends at "});" (a call), roundedDollars at "};".
  return name === "compactWords"
    ? source.slice(start, source.indexOf("});", start) + 3)
    : tail;
};
const roundedDollars = new Function(
  `${block("compactWords")}\n${block("roundedDollars")}\nreturn roundedDollars;`,
)() as (minor: number) => string;

describe("budget sums read in a rounded unit", () => {
  it.each([
    [0, "$0"],
    [123, "$1"],
    [1234, "$12"],
    [-1234, "−$12"],
    [12345, "$123"],
    [123456, "$1,240"],
    [4_829_310, "$48,300"],
    [99_999_960, "$1 million"],
    [5_200_000_000_000_00, "$5.2 trillion"],
    [-180_000_000_000_000, "−$1.8 trillion"],
  ])("%d minor reads %s", (minor, words) => {
    expect(roundedDollars(minor)).toBe(words);
  });

  it("never shows cents or a fraction of a dollar below a million", () => {
    for (let minor = -500_000; minor <= 500_000; minor += 137)
      expect(roundedDollars(minor)).toMatch(/^−?\$\d{1,3}(,\d{3})*$/);
  });
});
