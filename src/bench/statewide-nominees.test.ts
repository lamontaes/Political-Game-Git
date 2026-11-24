import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { partySide } from "../core2/appointments";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

/**
 * A statewide partisan race (a U.S. Senate seat, a governor) draws a
 * candidate from each major party once filing closes: the played world, a
 * place drawn from all 56, run to the day after the first general
 * election's last filing deadline.
 */
const runSeed =
  process.env.GOLDEN_PATH_SEED ?? `statewide-nominees:${Date.now()}`;

describe("statewide races draw both major parties", () => {
  it("every statewide partisan race has a Democratic and a Republican candidate after filing closes", () => {
    const place = drawPlace(runSeed, "statewide-nominees");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    console.log(where);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    const firstGeneral = (
      elections.table("contests").rows() as unknown as ContestRow[]
    )
      .filter((c) => c.level === "state" || c.level === "federal")
      .map((c) => c.electionDate)
      .sort()[0]!;
    const statewide = () =>
      (elections.table("contests").rows() as unknown as ContestRow[]).filter(
        (c) =>
          c.electionDate === firstGeneral &&
          (c.level === "state" || c.level === "federal") &&
          !c.district &&
          c.title !== "President",
      );
    const lastDeadline = statewide()
      .map((c) => c.filingDeadline)
      .sort()
      .at(-1)!;
    const through = addDays(makeIsoDate(lastDeadline), 1);
    while (core.date < through)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const checked: string[] = [];
    for (const contest of statewide()) {
      const holder = (
        terms.query("bySeatStatus", [
          contest.seatId,
          "serving",
        ]) as unknown as TermRow[]
      )[0];
      // Nonpartisan offices (a seat with no party) are not party races.
      if (!holder?.party) continue;
      const sides = new Set(
        (
          elections
            .table("filings")
            .query("byContest", [contest.id]) as unknown as FilingRow[]
        )
          .filter((f) => f.status === "on-ballot")
          .map((f) => partySide(f.party ?? null)),
      );
      checked.push(`${contest.title} ${contest.id}`);
      expect(
        sides.has(-1) && sides.has(1),
        `${contest.title} (${contest.id}) has one side only: ${where}`,
      ).toBe(true);
    }
    // A place whose first general has no statewide partisan race is named,
    // not failed.
    console.log(
      checked.length
        ? `checked ${checked.length}: ${checked.join("; ")}`
        : `not exercised: no statewide partisan race on ${firstGeneral}`,
    );
  }, 900_000);
});
