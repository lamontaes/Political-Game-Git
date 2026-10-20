/** One model, two tiers: the town's people counts (macro, press audience, disaster share) stand for as many people as the counted records' weights say. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  residentCounts,
  residentsRuntime,
  townPlaceOf,
} from "./modules/residents";
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

/**
 * What the records of the town that were filled in at the opening held: a
 * household filled in since the opening stands for itself alone, and the rest
 * of the households it stood for go to the other households of its group, so
 * at a larger count scale the town stands for (scale - 1) more of each of
 * them than the scale alone says.
 */
function filledIn(core: ReturnType<typeof open>["core"]) {
  const rt = residentsRuntime(core)!;
  const town = townPlaceOf(core);
  const held = { people: 0, households: 0, workers: 0 };
  for (const h of rt.store.households) {
    if (h.placeId !== town || !h.gone) continue;
    held.households += 1;
    held.people += h.members.length;
    held.workers += h.jobs.length;
  }
  return held;
}

function check(seed: string, key: string, where: string) {
  const base = open(seed, key);
  const big = open(seed, key, SCALE);
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
  // A larger count scale stands for more people, households and workers: at
  // most the scale times the base, plus the (scale - 1) more of each
  // household filled in at the opening that the other records took on.
  const held = filledIn(base.core);
  for (const field of ["people", "households", "workers"] as const) {
    expect(sum(big.core, field), `${where}: ${field}`).toBeGreaterThan(
      sum(base.core, field),
    );
    expect(sum(big.core, field), `${where}: ${field}`).toBeLessThanOrEqual(
      SCALE *
        1.05 *
        (sum(base.core, field) + ((SCALE - 1) / SCALE) * held[field]),
    );
  }
  // The national step hears a town of the larger size.
  expect(big.state.townResidents, where).toBeGreaterThan(
    base.state.townResidents,
  );
}

it("counts the people, households and workers a counted record stands for, and macro hears the town at that size", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "census-macro");
  check(draw.seed, draw.key, `seed ${draw.seed}, ${draw.name} (${draw.key})`);
}, 900_000);

it("holds in the small town where the count once ran over (Huntington Center, Vermont)", () => {
  check(
    "81f3003b4329071a3e587bb803de9acf3816104a8fcfb0e6ca02e3ba1d4276ff",
    "5034675",
    "seed 81f3003b…, Huntington Center, Vermont (5034675)",
  );
}, 900_000);
