/**
 * A member's recorded vote carries the roll's own outcome
 * (pool item gov-record-vote-outcome-written-at-tally).
 *
 * EDGE-CASE PROOF ONLY. This builds a small core in a drawn place and hands
 * `recordRoll` a hand-built roll; it does not play a bill through the
 * legislature. The played-world proof (a council bill voted in a drawn town,
 * a member's record on the Campaigns screen showing passed or failed) is the
 * checker's and the second session's, not this file's.
 *
 * The place is drawn from all 56 on a seed nobody chose (`GOLDEN_PATH_SEED`
 * fixes the seed, `GOLDEN_PATH_PLACE_KEY` the place); both are in every
 * failure message.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { createLifeCore } from "./life";
import { recordRoll } from "./modules/legislature";
import {
  openRecord,
  voteRecordId,
  votesOf,
  type VoteRecordRow,
} from "./modules/record";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("recordRoll writes the roll's outcome on every member's row", () => {
  const draw = drawPlace(seed, "vote-outcome-recorded");
  const key = process.env.GOLDEN_PATH_PLACE_KEY ?? draw.key;
  const where = `seed ${seed}, place ${key}`;
  const world = () => {
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: gameStartDate(),
        minimumPeople: 20,
      }),
    );
    openRecord(core);
    return coreAPI(core);
  };
  const row = (personId: string, billId: string, position: number) => ({
    personId,
    body: "office:test",
    billId,
    measureId: "2026-001",
    stance: { question: "q:test", position },
  });
  const read = (
    api: ReturnType<typeof world>,
    billId: string,
    personId: string,
  ): VoteRecordRow | undefined =>
    votesOf(api, personId).find(
      (v) => v.id === voteRecordId(billId, "q:test", personId),
    );

  it("a carried roll leaves passed true on the yes and the no rows alike", () => {
    const api = world();
    recordRoll(
      api,
      [row("person:a", "bill:carried", 1), row("person:b", "bill:carried", -1)],
      true,
    );
    expect(read(api, "bill:carried", "person:a")?.passed, where).toBe(true);
    expect(read(api, "bill:carried", "person:b")?.passed, where).toBe(true);
  });

  it("a failed roll leaves passed false, and no row is left null", () => {
    const api = world();
    recordRoll(
      api,
      [row("person:a", "bill:failed", 1), row("person:b", "bill:failed", -1)],
      false,
    );
    for (const id of ["person:a", "person:b"])
      expect(read(api, "bill:failed", id)?.passed, `${where} ${id}`).toBe(
        false,
      );
  });

  it("a bill's two rolls keep their own outcomes", () => {
    const api = world();
    recordRoll(api, [row("person:a", "bill:one", 1)], true);
    recordRoll(api, [row("person:a", "bill:two", 1)], false);
    expect(read(api, "bill:one", "person:a")?.passed, where).toBe(true);
    expect(read(api, "bill:two", "person:a")?.passed, where).toBe(false);
  });
});
