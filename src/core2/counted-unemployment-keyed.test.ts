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
it(`pays a counted claimant into their own group (seed ${seed})`, () => {
  // A small town can go 200 days with no claim, so draw again (up to eight
  // places) and fail only if none of them pays a counted claimant.
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    benefit.length = 0;
    const place = drawPlace(seed, `counted-unemployment-keyed:${attempt}`);
    tried.push(place.name);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    runtimeOf = () => residentsRuntime(core as unknown as CoreState);
    advanceCore(core, addDays(makeIsoDate(core.date), 200));
    if (!benefit.length) continue;
    const where = `seed ${seed}, ${place.name}`;
    for (const row of benefit) {
      expect(row.personId, where).toBeDefined();
      expect(row.counted, `${where}: ${row.personId} paid place-wide`).toBe(
        true,
      );
    }
    return;
  }
  throw new Error(
    `no counted claimant was paid in eight drawn places (${tried.join(", ")}; seed ${seed})`,
  );
}, 1_800_000);
