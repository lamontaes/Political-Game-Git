/**
 * Filling in a household reads only the pooled flows
 * (core-fill-in-scans-every-flow): most counted flows are one household's own
 * rent, and a fill-in looks at them by id. In a played world, after a run of
 * fill-ins, the pooled list holds exactly the flows that name jobs or
 * contracts, in the flows' own order, and is a small part of all flows.
 * A place and seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { fillInPerson } from "./state";
import { pooledFlows, residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "fill-in-pooled-flows");

it(`reads the pooled flows after fill-ins in ${place.name} (${place.key}), seed ${seed}`, () => {
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const pools = (flow: {
    kind: string;
    perDayMinorByJob?: unknown;
    amountByContract?: unknown;
  }) =>
    (flow.kind === "wages" && flow.perDayMinorByJob) ||
    ((flow.kind === "retirement" || flow.kind === "purchase") &&
      flow.amountByContract);
  const check = (when: string) => {
    const expected = [...rt.flows.values()].filter((flow) => pools(flow));
    const read = [...pooledFlows(rt)];
    expect(
      read.map((flow) => flow.id),
      `${where}: ${when}`,
    ).toEqual(expected.map((flow) => flow.id));
    return { all: rt.flows.size, pooled: read.length };
  };
  const before = check("at the opening");
  // Fill in a run of counted people; each fill-in adds flows of its own.
  const counted = [...rt.householdOfPerson.keys()].sort().slice(0, 40);
  for (const id of counted) if (!core.people.has(id)) fillInPerson(core, id);
  const after = check("after fill-ins");
  expect(after.all, where).toBeGreaterThanOrEqual(before.all);
  expect(before.pooled, `${where}: pooled flows`).toBeLessThan(before.all);
}, 300_000);
