// Developer controls are never in the player's markup: Mark gap joins the
// talk box only when dev mode is switched on (play.mjs adds it then).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("./play.html", import.meta.url), "utf8");

describe("the play page's markup", () => {
  it("has no Mark gap control", () => {
    expect(html).not.toMatch(/id="talk-gap"|Mark gap/);
  });
});
