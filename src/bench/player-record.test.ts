/**
 * The Campaigns screen's record section (pool item play-campaigns-shows-your-record) is a
 * view of the records voters read: in a played world in a place drawn from all 56, an
 * officeholder who has voted is shown with exactly the roll calls the record table holds
 * for them (by record id), their sponsored bills and their promises with status. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { votesOf } from "../core2/modules/record";
import { coreAPI } from "../core2/state";
import { playerRecord } from "./campaign";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const n of [1, 2]) {
  it(`a voter's roll calls are the record's, by id (${replay}, draw ${n})`, () => {
    const draw = drawPlace(replay, `player-record:${n}`);
    const where = `${draw.name} (${draw.key}), place seed ${draw.seed}`;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 150));
    const voter = [...core.people.keys()].find(
      (id) => votesOf(api, id).length > 0,
    );
    expect(voter, `${where}: nobody has voted in 150 days`).toBeDefined();
    const record = playerRecord(core, voter!);
    // A vote with no outcome on record is not shown (Fable A's read, Nov 12).
    const held = votesOf(api, voter!).filter((v) => v.passed !== null);
    expect(
      record.votes.map((v) => v.id),
      where,
    ).toEqual(held.map((v) => v.id));
    for (const vote of record.votes) {
      expect(vote.question, `${where}: ${vote.id}`).toBeTruthy();
      expect([-1, 0, 1]).toContain(vote.position);
    }
    for (const bill of record.bills) expect(bill.id, where).toBeTruthy();
    for (const promise of record.promises)
      expect(["kept", "broken", "open"], where).toContain(promise.status);
  }, 600_000);
}
