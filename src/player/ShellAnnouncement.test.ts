import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the shell prints no status sentence", () => {
  it("keeps the announcement and the unsaved note out of the screen text", () => {
    const text = readFileSync("src/player/PlayerGame.tsx", "utf8");
    expect(text).toContain("data-announcement={shell.announcement}");
    expect(text).not.toMatch(/>\s*\{shell\.announcement\}/);
    expect(text).not.toContain("This life has not been saved yet");
  });
});
