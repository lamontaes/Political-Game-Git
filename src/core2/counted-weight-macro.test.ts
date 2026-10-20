/** One model, two tiers: the town's people counts (macro, press audience, disaster share) stand for as many people as the counted records' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentCounts, residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;

function open(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  // The macro engine records its state on its first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const state = coreAPI(core)
    .moduleState("macro")
    .table("state")
    .get("macro:state") as unknown as {
    townResidents: number;
    placeIds: string[];
  };
  return { core, state };
}

it("counts the people, households and workers a counted record stands for, and macro hears the town at that size", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "census-macro");
  const where = `seed ${draw.seed}, ${draw.name} (${draw.key})`;
  const base = open(draw.seed, draw.key);
  const big = open(draw.seed, draw.key, SCALE);
  const sum = (
    core: typeof base.core,
    field: "people" | "households" | "workers",
  ) => residentCounts(core).reduce((n, row) => n + row[field], 0);
  // The counts follow the weighted store place by place.
  for (const { core } of [base, big]) {
    const store = residentsRuntime(core)!.store;
    for (const row of residentCounts(core))
      expect(row.people, `${where}: ${row.placeId}`).toBeCloseTo(
        store.weightedPeople(row.placeId),
        6,
      );
  }
  expect(sum(base.core, "people"), where).toBeGreaterThan(0);
  // A larger count scale stands for more people, households and workers.
  for (const field of ["people", "households", "workers"] as const) {
    expect(sum(big.core, field), `${where}: ${field}`).toBeGreaterThan(
      sum(base.core, field),
    );
    expect(sum(big.core, field), `${where}: ${field}`).toBeLessThanOrEqual(
      SCALE * 1.05 * sum(base.core, field),
    );
  }
  // The national step hears a town of the larger size.
  expect(big.state.townResidents, where).toBeGreaterThan(
    base.state.townResidents,
  );
}, 900_000);
