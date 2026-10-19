import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { bugReport, replayBugReport } from "./bug-report";
import { newGame, registerCommand, runCommand } from "./saves";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-bug-report");

// A player action that fails once the world reaches a date: a stand-in for
// any crash a player meets.
registerCommand<{ after: string }>("test.fail-after", (core, payload) => {
  if (core.date >= payload.after)
    throw new Error(`Fixture failure on ${core.date}`);
});

describe(`bug reports in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("carries the save, so a replay reaches the same failure", () => {
    const game = newGame({
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
    });
    const through = daysAfterStart(19);
    runCommand(game, "advance", { through });
    let caught: unknown;
    try {
      runCommand(game, "test.fail-after", { after: daysAfterStart(14) });
    } catch (error) {
      caught = error;
    }
    const report = JSON.parse(
      JSON.stringify(bugReport(game, { error: caught, note: "It stopped." })),
    );
    expect(report.error.message).toBe(`Fixture failure on ${through}`);
    expect(report.save.commands.at(-1).kind).toBe("test.fail-after");
    expect(report.recent.every((row: { kind: string }) => row.kind)).toBe(true);
    const replay = replayBugReport(report);
    expect(replay.reproduced?.message).toBe(`Fixture failure on ${through}`);
    expect(replay.game?.core.date).toBe(through);
  }, 300_000);
});
