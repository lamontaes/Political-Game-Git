import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Your office is a player screen: scenes stop time, or the player does (owner,
// Oct 27), so it carries no stop toggles, and it shows no record kinds or ISO
// dates. The interview outlet is asked through people and scenes, not a menu.
describe("Your office", () => {
  const play = readFileSync("src/bench/play.mjs", "utf8");
  const office = play.slice(
    play.indexOf("async function officeRows()"),
    play.indexOf("// ---- The bill on paper"),
  );
  it("has no stop toggles and no outlet picker", () => {
    expect(office).not.toMatch(/office\/stops|interview-outlet|checkbox/);
  });
  it("words every date it shows", () => {
    expect(office).not.toMatch(
      /\$\{(?:a\.date|job\.nextMeeting|job\.lastPaid\.on)\}/,
    );
  });
});
