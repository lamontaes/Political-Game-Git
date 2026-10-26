import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { appointerWeighing, nominateAndConfirm } from "./appointments";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

// An appointer's own traits tilt how they weigh a nominee between loyalty
// (alignment and acquaintance) and merit (qualification): two appointers in
// one town rank the same pool differently, and the reasons keep the weights.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "appointer-traits");

it(`appointers with different traits rank the same pool differently in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} [${place.key}], seed ${place.seed}`;
  const weighed = [...core.people.values()]
    .filter((p) => p.alive)
    .map((p) => ({ id: p.id, weighing: appointerWeighing(core, p.id)! }))
    .sort(
      (a, b) =>
        a.weighing.loyalty - b.weighing.loyalty || a.id.localeCompare(b.id),
    );
  const merit = weighed[0]!;
  const loyal = weighed.at(-1)!;
  expect(loyal.weighing.loyalty, where).toBeGreaterThan(merit.weighing.loyalty);
  // Weights slide around one and never reach zero.
  for (const row of [merit, loyal]) {
    expect(row.weighing.loyalty + row.weighing.merit, where).toBeCloseTo(2, 10);
    expect(row.weighing.merit, where).toBeGreaterThan(0);
  }
  // A pool that is a tie at equal weights: a friend on the appointer's side and a stranger better qualified.
  const pool = [
    { id: "friend", lean: 0.8, qualification: 0.2, known: true },
    { id: "expert", lean: 0.2, qualification: 0.75, known: false },
  ];
  const rank = (weighing: typeof merit.weighing | undefined) =>
    nominateAndConfirm({
      seatKey: "appointer-traits",
      appointerSide: 1,
      candidates: pool,
      confirmingBody: null,
      ...(weighing ? { weighing } : {}),
    });
  expect(loyal.weighing.loyalty, where).toBeGreaterThan(1);
  expect(merit.weighing.loyalty, where).toBeLessThan(1);
  const byLoyal = rank(loyal.weighing);
  const byMerit = rank(merit.weighing);
  expect(byLoyal.nomineeId, `${where}: the loyalty-minded pick`).toBe("friend");
  expect(byMerit.nomineeId, `${where}: the merit-minded pick`).toBe("expert");
  // Each reason keeps the weights used, by nominee.
  for (const result of [byLoyal, byMerit])
    for (const reason of result.reasons) {
      expect(reason.loyaltyWeight, where).toBeDefined();
      expect(reason.meritWeight, where).toBeDefined();
    }
  // No named appointer weighs as before: equal weights, no weights recorded.
  expect(rank(undefined).reasons[0]!.loyaltyWeight, where).toBeUndefined();
}, 600_000);
