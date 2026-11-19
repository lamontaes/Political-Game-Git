import { describe, expect, it } from "vitest";
import { parseDeclaration } from "../../scripts/release/declarations";
import { renderReleaseSection } from "../../scripts/release/notes";

// Player notes by area, one short line each (crew line, Nov 16: "This is not
// structured like a real patch note."). A declaration may name the part of
// the game it touches; the release then lists it under that area as its
// title alone, one line, before any older note that names none.
const declaration = (
  id: string,
  extra: string,
  body = "Prose a player reads.",
) =>
  parseDeclaration(
    `---\nid: ${id}\nimpact: patch\nsection: Fixed\n${extra}---\n\n${body}\n`,
    id,
  );

describe("notes by area", () => {
  it("lists a note filed under an area as one short line under its area", () => {
    const text = renderReleaseSection("0.200.0", "2026-11-17", [
      declaration("b-talk", "title: No double greetings\narea: Talk\n"),
      declaration("a-start", "title: Saves come back\narea: Starting out\n"),
      declaration("c-old", "title: An older note\n"),
    ]);
    const lines = text.split("\n");
    expect(lines.indexOf("### Starting out")).toBeLessThan(
      lines.indexOf("### Talk"),
    );
    expect(lines).toContain("- Saves come back");
    expect(lines).toContain("- No double greetings");
    expect(text).not.toContain("Prose a player reads.\n\n### Talk");
    // An older note with no area keeps its section and its prose, after the areas.
    expect(lines.indexOf("### Fixed")).toBeGreaterThan(
      lines.indexOf("### Talk"),
    );
    expect(text).toContain("**An older note** Prose a player reads.");
  });

  it("refuses an area the notes do not have, or a title longer than one short line", () => {
    expect(() => declaration("x", "title: Fine\narea: Elsewhere\n")).toThrow(
      /must be one of/,
    );
    expect(() =>
      declaration("y", `title: ${"A very long line ".repeat(5)}\narea: Talk\n`),
    ).toThrow(/one short line/);
  });

  it("keeps a source-only change free of an area", () => {
    expect(() =>
      parseDeclaration(
        "---\nid: z\nimpact: none\narea: Talk\n---\n\nTooling only.\n",
        "z",
      ),
    ).toThrow(/must not carry/);
  });
});
