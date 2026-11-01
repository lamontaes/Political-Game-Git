/**
 * A closed race's causes fold into summaries (core-long-run-tables-grow-with-history),
 * in a played world (a random place and seed each run, named so a failure can
 * be replayed): run to the eve of the first election, fold every contest the
 * campaigns engine has causes for, and the race standing reads the same, a
 * door knocked before is still a return visit, and the rows are gone.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { contestStanding } from "./campaign-day";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  causeSummaryOf,
  foldClosedRaceCauses,
  type CauseRow,
} from "./modules/campaigns";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.CAUSES_FOLD_SEED ?? randomBytes(8).toString("hex");

describe(`campaign causes fold (seed ${seed})`, () => {
  it("a closed race's causes fold into summaries the standing and the doors read the same", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core,
      api = coreAPI(core);
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as { id: string; electionDate: string }[];
    const first = contests
      .map((c) => c.electionDate)
      .filter((d) => d > core.date)
      .sort()[0]!;
    advanceCore(core, addDays(makeIsoDate(first), -1));
    const causes = api.moduleState(CAMPAIGNS_MODULE_ID).table("causes");
    const before = causes.rows() as unknown as CauseRow[];
    const standings = (ids: string[]) =>
      ids.map((id) => contestStanding(api, id, core.playerId ?? ""));
    const ids = contests.map((c) => c.id).sort();
    const standingBefore = standings(ids);

    for (const id of ids) foldClosedRaceCauses(api, id);

    expect(standings(ids)).toEqual(standingBefore);
    const after = new Set(
      (causes.rows() as unknown as CauseRow[]).map((row) => row.id),
    );
    const gone = before.filter((row) => !after.has(row.id));
    expect(before.length).toBeGreaterThan(0);
    for (const row of gone) {
      const summary = causeSummaryOf(api, row.voterId, row.candidateId)!;
      expect(summary).toBeDefined();
      if (row.act === "door" && row.actorId === row.candidateId)
        expect(summary.firstDoor! <= row.date).toBe(true);
    }
    // Folding again changes nothing: the summaries already hold every row.
    for (const id of ids) foldClosedRaceCauses(api, id);
    expect(standings(ids)).toEqual(standingBefore);
    console.log(
      `${world.place.displayName}: ${before.length} causes, ${gone.length} folded, ${after.size} kept`,
    );
  }, 600_000);
});
