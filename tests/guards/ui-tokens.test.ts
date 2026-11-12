import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import baseline from "./ui-tokens-baseline.json";

/**
 * One UI system (owner, Nov 10: "Make sure that the UI system is unified so
 * that when it's time to adjust the UI in the future... it's way easier to
 * change stuff on a screen or on a menu"). A size, a corner or a color is
 * named once in `:root` of src/bench/play.css and every rule reads the name,
 * so one change there changes every screen. A rule that types its own value
 * is a second source for the same fact.
 *
 * What was already typed by hand is counted in ui-tokens-baseline.json; a
 * count may only go down. Read src/bench/ui/README.md before adding a screen.
 */

const ROOT = path.resolve(__dirname, "../..");
const FILE = "src/bench/play.css";

/** The stylesheet without comments and without the `:root` blocks that define the names. */
export function rules(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/:root\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, " ");
}

/** Hand-typed values in the rules, by kind. */
export function typedByHand(css: string): Record<string, number> {
  const body = rules(css);
  const count = (pattern: RegExp) => body.match(pattern)?.length ?? 0;
  return {
    // A font or font-size whose value carries a pixel size of its own.
    fontSizes: count(
      /(?<![-\w])font(?:-size)?\s*:[^;{}]*?\d(?:\.\d+)?px[^;{}]*;/g,
    ),
    // A corner radius given in pixels (0, a percentage or a name is not one).
    radii: count(
      /(?<![-\w])border-radius\s*:[^;{}]*?[1-9]\d*(?:\.\d+)?px[^;{}]*;/g,
    ),
    // A color written as a hex code.
    hexColors: count(/#[0-9a-fA-F]{3,8}\b/g),
  };
}

describe("the UI's sizes, corners and colors are named once", () => {
  const found = typedByHand(readFileSync(path.join(ROOT, FILE), "utf8"));
  const known = baseline as Record<string, number>;

  it("types no new size, corner or color by hand in a rule", () => {
    const over = Object.entries(found)
      .filter(([kind, n]) => n > (known[kind] ?? 0))
      .map(
        ([kind, n]) =>
          `${FILE}: ${n} ${kind} typed by hand, ${known[kind] ?? 0} known. Read a name from :root (var(--...)) or add one there.`,
      );
    expect(over).toEqual([]);
  });

  it("lowers a known count as soon as a value moves to a name", () => {
    const stale = Object.entries(known)
      .filter(([kind, n]) => (found[kind] ?? 0) < n)
      .map(
        ([kind, n]) =>
          `${kind}: lower ${n} to ${found[kind] ?? 0} in tests/guards/ui-tokens-baseline.json`,
      );
    expect(stale).toEqual([]);
  });

  it("counts a typed value and leaves a named one alone", () => {
    const typed = typedByHand(
      ".a { font: 600 15px var(--ui); border-radius: 3px; color: #f2e6c9; }",
    );
    expect(typed).toEqual({ fontSizes: 1, radii: 1, hexColors: 1 });
    const named = typedByHand(
      ":root { --cream: #f2e6c9; --control-radius: 2px; } /* #fff 12px */ .a { font: var(--control-font); border-radius: var(--control-radius); color: var(--cream); } .b { border-radius: 50%; font-size: 0.85em; }",
    );
    expect(named).toEqual({ fontSizes: 0, radii: 0, hexColors: 0 });
  });
});
