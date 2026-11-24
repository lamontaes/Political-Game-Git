/**
 * A folded cause kept for the trace goes once it is older than
 * `circleActRetentionMonths`; the player's own and recent ones stay (memory
 * and long runs, Nov 8). A random place and seed each run, named so a failure
 * can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  dropOldFoldedCauses,
  type CauseRow,
} from "./modules/campaigns";
import { coreAPI } from "./state";

const seed = process.env.FOLDED_WINDOW_SEED ?? randomBytes(8).toString("hex");

describe(`folded cause window (seed ${seed})`, () => {
  it("drops old folded causes, keeps recent ones and the player's", () => {
    setBookkeeping(false);
    const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
    const core = world.core,
      api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 200));
    const table = api.moduleState(CAMPAIGNS_MODULE_ID).table("foldedCauses");
    const row = (id: string, voterId: string, date: string) =>
      ({
        id,
        voterId,
        candidateId: "candidate",
        date,
        act: "speech",
        actorId: "candidate",
        warmthBefore: 0,
        warmthAfter: 0,
        agreement: null,
        rapport: 0,
        weight: 0,
      }) as unknown as CauseRow as never;
    const other = [...core.people.keys()].find((id) => id !== core.playerId)!;
    const old = addDays(makeIsoDate(core.date), -200);
    const recent = addDays(makeIsoDate(core.date), -10);
    table.put(row("old", other, old));
    table.put(row("recent", other, recent));
    table.put(row("oldPlayer", core.playerId!, old));
    dropOldFoldedCauses(api);
    expect(table.get("old"), `${world.place.displayName}`).toBeUndefined();
    expect(table.get("recent")).toBeDefined();
    expect(table.get("oldPlayer")).toBeDefined();
    // Played on, nothing but the player's is older than the window.
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const cutoff = addDays(makeIsoDate(core.date), -100);
    const older = (table.rows() as unknown as CauseRow[]).filter(
      (r) => r.date < cutoff && r.voterId !== core.playerId,
    );
    expect(older).toEqual([]);
  }, 600_000);
});
