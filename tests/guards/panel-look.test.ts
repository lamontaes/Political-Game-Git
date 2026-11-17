import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * Every menu wears the one approved panel (owner, Nov 5 and Nov 16: "I hate
 * this blockiness"; docs/mocks/2026-11-07-approved/MENU-LOOK.md, Surfaces):
 * the textured picture, 78% solid, its slim brass edge and small corners in
 * the picture, a darker tint under the text. The flat glass with a drawn
 * brass line, an iron ring and four corner pictures is gone, and no screen
 * brings it back.
 */

const ROOT = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(ROOT, "src/bench/play.css"), "utf8");
/** The stylesheet without comments and without the `:root` blocks that define the names. */
const body = css
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/:root\s*\{(?:[^{}]|\{[^{}]*\})*\}/g, " ");
const panel = body.match(/(?:^|\})\s*\.panel\s*\{([^}]*)\}/)?.[1] ?? "";

describe("the menu panel is the approved texture", () => {
  it("draws the panel from the approved picture, edge and all", () => {
    expect(css).toMatch(/--panel-art:\s*url\("\/ui\/kit13\/panel\.png"\)/);
    expect(panel).toMatch(/border-image:\s*var\(--panel-art\)[^;]*\bfill\b/);
    expect(existsSync(path.join(ROOT, "public/ui/kit13/panel.png"))).toBe(true);
    expect(
      readFileSync(path.join(ROOT, "src/bench/server.ts"), "utf8"),
    ).toContain("panel\\.png");
  });

  it("keeps the picture the mock's own, byte for byte", () => {
    const game = readFileSync(path.join(ROOT, "public/ui/kit13/panel.png"));
    const mock = readFileSync(
      path.join(ROOT, "docs/mocks/2026-11-07-approved/img/panel.png"),
    );
    expect(game.equals(mock)).toBe(true);
  });

  it("has no flat glass, drawn brass line or iron ring on the panel", () => {
    expect(panel).not.toMatch(/linear-gradient/);
    expect(panel).not.toMatch(/var\(--brass\)|var\(--iron\)/);
    expect(body).not.toMatch(/--glass-top|--glass-bottom/);
    expect(css).not.toMatch(/--glass-top|--glass-bottom/);
  });

  it("puts the darker tint under the text, inside the edge", () => {
    const tint = body.match(/\.panel::before\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(tint).toMatch(/background:\s*var\(--panel-tint\)/);
    expect(tint).toMatch(/z-index:\s*-1/);
  });

  it("draws no corner pictures over the panel", () => {
    expect(body).not.toMatch(/\.panel::after/);
  });

  it("hovers with the one halo", () => {
    expect(css).toMatch(/--pick-hover-glow:\s*var\(--halo-glow\)/);
    expect(css).toMatch(/--pick-hover:\s*var\(--halo-frame\)/);
  });
});
