import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * No player screen speaks the developers' language.
 *
 * The sibling guard (no-source-panel-on-a-player-screen) refuses citations and
 * outbound links. It did not catch sentences written for the people building
 * the game: a meeting card that called itself a "Game-authored session", a
 * council panel that said an election "still needs its member-decision
 * producer", ballots labeled "(game-authored)", "Not modeled:" footnotes and
 * a "Reference: …, snapshot …" tail. Those are words about the game, not in
 * it.
 *
 * Comments are blanked out first (line numbers kept), so a developer note in
 * the source is not mistaken for text on the screen. Anything behind the
 * diagnostics gate is allowed, exactly as the sibling guard allows it.
 */

const PLAYER_DIR = fileURLToPath(new URL(".", import.meta.url));

const DIAGNOSTICS_GATE = /\{\s*(DIAGNOSTICS|diagnostics)\s*(\?|&&|$)/;

const DEVELOPER_WORDING =
  /game-authored|member-decision|\bproducer\b|\bnot (yet )?modell?ed\b|\bReference:|\bsnapshot \d|\(authored\)|\bauthored (game|session|route|tax|standing)|not asserted|is asserted/i;

function indent(line: string): number {
  return line.length - line.trimStart().length;
}

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

/** Blank block and line comments, keeping every newline so line numbers hold. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, (_match, before: string) => before);
}

function playerComponents(): readonly string[] {
  return readdirSync(PLAYER_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .filter((name) => !name.includes(".test."));
}

function offending(): readonly string[] {
  const found: string[] = [];
  for (const name of playerComponents()) {
    const source = readFileSync(`${PLAYER_DIR}${name}`, "utf8");
    const lines = withoutComments(source).split("\n");
    lines.forEach((line, index) => {
      if (!DEVELOPER_WORDING.test(line) || gated(lines, index)) return;
      found.push(`${name}:${index + 1}: ${line.trim()}`);
    });
  }
  return found;
}

describe("player screens and developer wording", () => {
  it("reads the player components, so an empty sweep cannot pass", () => {
    expect(playerComponents().length).toBeGreaterThan(20);
  });

  it("prints no developer wording outside the diagnostics gate", () => {
    expect(offending()).toEqual([]);
  });

  it("would have caught the sentences it was written for", () => {
    for (const sentence of [
      "Game-authored session: City Council: Regular meeting",
      "Recording a new council election through ordinary play still needs its member-decision producer.",
      "Other councilors' ballots (game-authored)",
      "Reference: enacted-text, snapshot 2026-09-08.",
      "Not modeled: ridership, travel times, access or public approval.",
      "These are authored game taxes.",
    ]) {
      expect(DEVELOPER_WORDING.test(sentence), sentence).toBe(true);
    }
  });

  it("ignores comments but not the text beside them", () => {
    const source = [
      "/* the producer gates this */",
      "<p>{x}</p> // a fixture note",
      "<p>Game-authored session</p>",
    ].join("\n");
    const lines = withoutComments(source).split("\n");
    expect(lines.map((line) => DEVELOPER_WORDING.test(line))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("shows the player a plain ballot note and keeps the record's disclosure", () => {
    const governing = readFileSync(
      `${PLAYER_DIR}../presentation/municipal-governing.ts`,
      "utf8",
    );
    const constant = (name: string) =>
      new RegExp(`${name} =\\s*"([^"]+)"`).exec(governing)?.[1] ?? "";
    expect(constant("COUNCIL_BALLOT_PLAYER_NOTE")).not.toBe("");
    expect(DEVELOPER_WORDING.test(constant("COUNCIL_BALLOT_PLAYER_NOTE"))).toBe(
      false,
    );
    // The vote record keeps its own disclosure; only the screen changed.
    expect(constant("AUTHORED_COUNCIL_BALLOT_NOTE")).toMatch(/game-authored/);
  });
});
