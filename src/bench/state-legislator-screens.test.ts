/**
 * M5-01 through the play page's own records (pool item
 * play-state-legislator-career-screen): in the played world, the government
 * screen lists the numbered state legislative seats covering the player's
 * town with their holders, an open race for one of those seats appears among
 * its contests with the filing office's rules checked for the person, the
 * person files through the screen's own filing call, and after the election
 * the seat's record names the result. A state and place are drawn from all 56
 * on a seed nobody chose (STATE_SCREEN_SEED pins one); no race in reach in
 * eight places fails, naming each.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { checkEligibility } from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { fileForOffice, governmentView } from "./government";
import { buildBenchWorld } from "./world";

const seed = process.env.STATE_SCREEN_SEED ?? randomBytes(8).toString("hex");

it("lists the covering state legislative seats with holders, files for one and records the result", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "state-screen");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // The races open as the filing windows come round: look through a year.
    let view = governmentView(core, playerId!);
    let race: (typeof view.contests)[number] | undefined;
    const covering = () =>
      new Set(
        view.seats
          .filter((row) => row.level === "state" && row.district)
          .map((row) => row.seatId),
      );
    for (let step = 0; step < 13 && !race; step += 1) {
      view = governmentView(core, playerId!);
      race = view.contests.find(
        (row) =>
          row.contest.family === "stateLegislative" &&
          covering().has(row.contest.seatId),
      );
      if (!race) advanceCore(core, addDays(makeIsoDate(core.date), 30));
    }
    if (!race) {
      tried.push(`${where}: no race for a covering seat in a year`);
      continue;
    }
    const seatRow = view.seats.find(
      (row) => row.seatId === race!.contest.seatId,
    )!;
    // The seat is a numbered one and its holder is named by term record.
    expect(seatRow.district, where).toBeTruthy();
    expect(seatRow.holder?.termId, where).toBeTruthy();
    // The person who files: the first resident the rules let in.
    const runner = [...core.people.values()]
      .filter((p) => p.alive && p.tier !== "husk" && p.id.startsWith("person_"))
      .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
      .find((p) =>
        checkEligibility(coreAPI(core), p.id, race!.contest.id, null).every(
          (c) => c.met,
        ),
      );
    if (!runner) {
      tried.push(`${where}: no resident qualifies`);
      continue;
    }
    const filed = fileForOffice(core, runner.id, race.contest.id);
    expect(filed.status, `${where}: ${runner.id}`).not.toBe("refused");
    const after = governmentView(core, runner.id);
    expect(
      after.filings.some((row) => row.contestId === race!.contest.id),
      where,
    ).toBe(true);
    // Through election day: the voting engine's result names the person on
    // the ballot for that seat's race.
    advanceCore(core, addDays(makeIsoDate(race.contest.electionDate), 1));
    const result = resultOf(coreAPI(core), race.contest.id);
    expect(
      result,
      `${where}: no result for ${race.contest.title}`,
    ).not.toBeNull();
    expect(Object.keys(result!.totals), where).toContain(runner.id);
    process.stdout.write(
      `${where}: seat ${seatRow.seatId} (${seatRow.district}), holder term ${seatRow.holder!.termId}, filed ${runner.id}\n`,
    );
    return;
  }
  throw new Error(`No state legislative race in reach: ${tried.join("; ")}`);
}, 1_800_000);
