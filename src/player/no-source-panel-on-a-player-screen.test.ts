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
 * A panel behind a diagnostics gate is allowed, because that is the agreed
 * place for this material — the developer harness opens it and ordinary play
 * does not. The gate has to be visible within a few lines above the summary,
 * so a panel that loses its gate in a later edit starts failing here.
 *
 * It fails closed. If the directory read returns nothing, the file count
 * assertion fails rather than the test passing over an empty set — an
 * instrument that fails by doing nothing is indistinguishable from a pass.
 */

const PLAYER_DIR = fileURLToPath(new URL(".", import.meta.url));

const DIAGNOSTICS_GATE = /\{\s*(DIAGNOSTICS|diagnostics)\s*(\?|&&)/;

const FORBIDDEN = /<summary>[^<]*\b(sources?|citations?|provenance)\b/i;

function playerComponents(): readonly string[] {
  return readdirSync(PLAYER_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .filter((name) => !name.includes(".test."));
}

describe("player screens", () => {
  it("reads more than a handful of components, so an empty sweep cannot pass", () => {
    expect(playerComponents().length).toBeGreaterThan(20);
  });

  it("never offers a player a panel of sources or citations", () => {
    const offending: string[] = [];
    for (const name of playerComponents()) {
      const lines = readFileSync(`${PLAYER_DIR}${name}`, "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!FORBIDDEN.test(line)) return;
        const above = lines.slice(Math.max(0, index - 8), index).join("\n");
        if (DIAGNOSTICS_GATE.test(above)) return;
        offending.push(`${name}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offending).toEqual([]);
  });

  it("recognises a diagnostics gate, so the allowance is not a hole", () => {
    expect(DIAGNOSTICS_GATE.test("      {diagnostics ? (")).toBe(true);
    expect(DIAGNOSTICS_GATE.test("      {DIAGNOSTICS ? (")).toBe(true);
    expect(DIAGNOSTICS_GATE.test("      {view.sources ? (")).toBe(false);
  });
});
