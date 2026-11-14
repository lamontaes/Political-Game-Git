import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Your office is a player screen: it shows no record kinds or ISO dates. The interview outlet
// is asked through people and scenes, not a menu. The owner's card of Nov 14 ("Stop me at every
// vote") brought the stop switches back, as worded On and Off toggles (never checkboxes, never
// kind ids), so the old "no stop toggles" check of Oct 28 now guards the wording instead.
describe("Your office", () => {
  const play = readFileSync("src/bench/play.mjs", "utf8");
  const office = play.slice(
    play.indexOf("async function officeParts()"),
    play.indexOf("// ---- The bill on paper"),
  );
  it("has no outlet picker and no checkbox", () => {
    expect(office).not.toMatch(/interview-outlet|checkbox/);
  });
  it("words each stop switch through the controls data, not its kind id", () => {
    const controls = JSON.parse(
      readFileSync("src/bench/data/controls.json", "utf8"),
    );
    for (const key of ["meetings", "floor", "desk"])
      expect(controls.officeStops.switches[key]).toMatch(/^[A-Z][a-z ]+$/);
    expect(office).toMatch(/officeStops\?\.switches|words\.switches/);
    expect(office).not.toMatch(/stop\.key\}\s*[`"]?\s*\)?\s*;?\s*textContent/);
  });
  it("words every date it shows", () => {
    expect(office).not.toMatch(
      /\$\{(?:a\.date|job\.nextMeeting|job\.lastPaid\.on)\}/,
    );
  });
});
