import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const backdropStyles = readFileSync(
  new URL("./BackdropSurfaceLayer.css", import.meta.url),
  "utf8",
);
const roomStyles = readFileSync(
  new URL("./RoomMedia.css", import.meta.url),
  "utf8",
);

function ruleFor(styles: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    styles.match(
      new RegExp(`(?:^|\\n)\\s*${escapedSelector}\\s*\\{[^}]*\\}`, "s"),
    )?.[0] ?? ""
  );
}

describe("live place surface typography", () => {
  it("uses approved type roles on every painted and room surface", () => {
    for (const selector of [
      ".bs-board",
      ".bs-poster",
      ".bs-brochure",
      ".room-tv",
    ])
      expect(ruleFor(backdropStyles + roomStyles, selector)).toContain(
        "font-family: var(--ui)",
      );

    for (const selector of [".bs-plans", ".bs-sheet", ".room-paper"])
      expect(ruleFor(backdropStyles + roomStyles, selector)).toContain(
        "font-family: var(--speech)",
      );

    expect(
      ruleFor(roomStyles, ".room-paper--look-1 .room-paper-masthead"),
    ).toContain("font-family: var(--name)");
    expect(backdropStyles + roomStyles).not.toMatch(
      /font-family:\s*(?:"Helvetica Neue"|Arial|Georgia|"Times New Roman"|"Marker Felt"|"Comic Sans MS"|"Segoe Print"|"Old English Text MT"|"UnifrakturCook")/,
    );
  });
});
