import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * No player screen offers to show its sources.
 *
 * The standing rule is that no source or provenance reference reaches a
 * player-facing surface. An earlier sweep took the citation lists out of the
 * sentences the engine builds, and a second one took them off the World
 * overview. Both missed these, because a disclosure triangle hides the
 * offending text until somebody opens it — so reading the page does not find
 * it and reading the sentence does not either. What does find it is the
 * summary a player is invited to click.
 *
 * This asserts on the summaries in `src/player`. It is deliberately about the
 * label rather than the contents: a panel that offers "Sources" is already
 * telling the player the game has sources, whatever is inside it.
 *
 * The label is not enough on its own. A panel titled "How this office's
 * calendar works" printed statute citations with excerpts, and five more
 * screens printed a citation or a link out to a statute inside an ordinary
 * sentence, with no disclosure triangle at all. So this also refuses any
 * line that renders a citation field or links off the game — the contents,
 * wherever they sit.
 *
 * Anything behind a diagnostics gate is allowed, because that is the agreed
 * place for this material — the developer harness opens it and ordinary play
 * does not. The gate is found by walking up the enclosing lines (each less
 * indented than the last, as the formatter lays JSX out), so a gate thirty
 * lines above still counts and a sibling block's gate does not. A panel that
 * loses its gate in a later edit starts failing here.
 *
 * It fails closed. If the directory read returns nothing, the file count
 * assertion fails rather than the test passing over an empty set — an
 * instrument that fails by doing nothing is indistinguishable from a pass.
 */

const PLAYER_DIR = fileURLToPath(new URL(".", import.meta.url));

const DIAGNOSTICS_GATE = /\{\s*(DIAGNOSTICS|diagnostics)\s*(\?|&&|$)/;

const FORBIDDEN = /<summary>[^<]*\b(sources?|citations?|provenance)\b/i;

/** Reading a citation field, or linking anywhere but within the page. */
const CITATION = /[\w)\]]\.(citations?|sources|excerpt|sourceUrl|sourceNote)\b/;
const OUTBOUND_LINK = /\bhref=(?!\{?`?["']?[#/?])/;

function indent(line: string): number {
  return line.length - line.trimStart().length;
}

/** Whether a diagnostics gate encloses this line. */
function gated(lines: readonly string[], index: number): boolean {
  if (DIAGNOSTICS_GATE.test(lines[index]!)) return true;
  let depth = indent(lines[index]!);
  for (let above = index - 1; above >= 0 && depth > 0; above -= 1) {
    const line = lines[above]!;
    if (line.trim() === "" || indent(line) >= depth) continue;
    depth = indent(line);
    if (DIAGNOSTICS_GATE.test(line)) return true;
  }
  return false;
}

function playerComponents(): readonly string[] {
  return readdirSync(PLAYER_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .filter((name) => !name.includes(".test."));
}

function ungated(pattern: RegExp): readonly string[] {
  const offending: string[] = [];
  for (const name of playerComponents()) {
    const lines = readFileSync(`${PLAYER_DIR}${name}`, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (!pattern.test(line) || gated(lines, index)) return;
      offending.push(`${name}:${index + 1}: ${line.trim()}`);
    });
  }
  return offending;
}

describe("player screens", () => {
  it("reads more than a handful of components, so an empty sweep cannot pass", () => {
    expect(playerComponents().length).toBeGreaterThan(20);
  });

  it("never offers a player a panel of sources or citations", () => {
    expect(ungated(FORBIDDEN)).toEqual([]);
  });

  it("never prints a citation or links a player out to one", () => {
    expect(ungated(CITATION)).toEqual([]);
    expect(ungated(OUTBOUND_LINK)).toEqual([]);
  });

  it("finds the gated material it allows, so the allowance is measured", () => {
    // These are real, gated, and must be seen and excused — if the patterns
    // stopped matching them, the two sweeps above would pass over nothing.
    const seen = playerComponents().flatMap((name) => {
      const lines = readFileSync(`${PLAYER_DIR}${name}`, "utf8").split("\n");
      return lines.flatMap((line, index) =>
        CITATION.test(line) || OUTBOUND_LINK.test(line)
          ? [gated(lines, index)]
          : [],
      );
    });
    expect(seen.filter(Boolean).length).toBeGreaterThan(5);
  });

  it("recognizes a gate only when it encloses the line", () => {
    expect(DIAGNOSTICS_GATE.test("      {diagnostics ? (")).toBe(true);
    expect(DIAGNOSTICS_GATE.test("      {DIAGNOSTICS ? (")).toBe(true);
    expect(DIAGNOSTICS_GATE.test("      {view.sources ? (")).toBe(false);
    const inside = ["  {diagnostics ? (", "    <p>", "      <a href={x}>"];
    expect(gated(inside, 2)).toBe(true);
    const sibling = [
      "  {diagnostics ? (",
      "    <p />",
      "  ) : null}",
      "  <p>",
      "    <a href={x}>",
    ];
    expect(gated(sibling, 4)).toBe(false);
    expect(OUTBOUND_LINK.test('<a href="#entry">')).toBe(false);
    expect(OUTBOUND_LINK.test("<a href={`#journal-${key}`}>")).toBe(false);
    expect(OUTBOUND_LINK.test("<a href={source.url}>")).toBe(true);
    expect(OUTBOUND_LINK.test('<a href="/?view=developer">')).toBe(false);
    expect(CITATION.test("return [...sources.values()]")).toBe(false);
    expect(CITATION.test("{rule.source.citation}")).toBe(true);
  });
});
