/**
 * Dev mode's records proof in a generated world (a random place and seed each
 * run, named so a failure can be replayed): the same seed and place run to the
 * same date keep the same records, and one changed record is named by table
 * and id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { compareProofs, recordProof } from "./dev-proof";
import { setBookkeeping } from "../core2/bookkeeping";
import { residentsRuntime } from "../core2/modules/residents";

const seed = process.env.DEV_PROOF_SEED ?? randomBytes(8).toString("hex");
const played = () => {
  const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 30));
  return world;
};

describe(`dev records proof (seed ${seed})`, () => {
  it("two runs of the same seed and place keep the same records, and a changed record is named", () => {
    setBookkeeping(false);
    const first = recordProof(played().core, { rows: true });
    const world = played();
    expect(world.core.date).toBe(first.date);
    expect(recordProof(world.core).digest).toBe(first.digest);
    expect(
      compareProofs(first, recordProof(world.core, { rows: true })),
    ).toEqual([]);

    const person = [...world.core.people.values()].find((row) => row.alive)!;
    person.liquidMinor += 1;
    const [difference, ...rest] = compareProofs(
      first,
      recordProof(world.core, { rows: true }),
    );
    expect(rest).toEqual([]);
    expect(difference).toMatchObject({
      table: "core.people",
      firstId: person.id,
      differingIds: 1,
    });
    person.liquidMinor -= 1;

    // The counted population lives in the residents engine's part, not in core.people.
    const store = residentsRuntime(world.core)!.store;
    store.liquid[0] = store.liquid[0]! + 1;
    expect(
      compareProofs(first, recordProof(world.core, { rows: true })).map(
        (row) => row.table,
      ),
    ).toEqual(["part.core2-residents"]);
  }, 240_000);
});
