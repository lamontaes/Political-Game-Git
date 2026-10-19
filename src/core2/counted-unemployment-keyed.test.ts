import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import type * as Money from "./counted-money";
import type { CoreState } from "./types";

// An unemployment benefit to a counted worker lands in that worker's own
// household group; a claimant filled in since filing is paid as a full person
// (never through the place's pooled residents account). A played year in a
// place drawn from all 56 on a seed nobody chose.
const benefit: { personId: string | undefined; counted: boolean }[] = [];
let runtimeOf: () => ReturnType<typeof residentsRuntime>;
vi.mock("./counted-money", async (importOriginal) => {
  const real = await importOriginal<typeof Money>();
  return {
    ...real,
    countedPayment: (
      ...args: Parameters<typeof real.countedPayment>
    ): ReturnType<typeof real.countedPayment> => {
      const input = args[1];
      if (input.reasonKey === "unemployment-benefit")
        benefit.push({
          personId: input.personId,
          counted:
            input.personId !== undefined &&
            runtimeOf()?.store.countedMember(input.personId) !== undefined,
        });
      return real.countedPayment(...args);
    },
  };
});

const seed =
  process.env.COUNTED_UNEMPLOYMENT_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "counted-unemployment-keyed");
it(`pays a counted claimant into their own group (${place.name}, seed ${seed})`, () => {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  runtimeOf = () => residentsRuntime(core as unknown as CoreState);
  advanceCore(core, addDays(makeIsoDate(core.date), 200));
  const where = `seed ${seed}, ${place.name}`;
  expect(
    benefit.length,
    `${where}: no counted claimant was paid`,
  ).toBeGreaterThan(0);
  for (const row of benefit) {
    expect(row.personId, where).toBeDefined();
    expect(row.counted, `${where}: ${row.personId} paid place-wide`).toBe(true);
  }
}, 1_200_000);
