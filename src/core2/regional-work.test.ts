import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { ageOn } from "./counted-groups";
import { gameStartDate } from "./game-start";
import {
  countedParameter,
  residentsRuntime,
  startRegionalWork,
  stopRegionalWork,
} from "./modules/residents";

// A counted person's regional work adds a worker to their household (less
// what its share already covered) and the pay of as many workers as the
// record stands for to the unplaced workers' flow; ending it takes exactly
// that back. A counted person who already holds a recorded job is not hired
// (Pendleton, Indiana, seed 3a862b9a-fcef-4dc6-a0b8-2db653b4042b: the first
// member tried held work-relationship_c0d50c4a152df8e3). Places are drawn
// until one has a free member who takes the work; each passed over is named.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DRAWS = 6;

it(`regional work starts and stops symmetrically, in a place drawn from seed ${seed}`, () => {
  const passedOver: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(draw ? `${seed}:${draw}` : seed, "regional-work");
    const where = `${place.name} (${place.key}), seed ${draw ? `${seed}:${draw}` : seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const rt = residentsRuntime(core)!;
    const flowTotal = () =>
      [...rt.flows.values()]
        .filter(
          (f) => f.financeKind === "work.unplaced-residents" && !f.endedAt,
        )
        .reduce((sum, f) => sum + f.amountMinor, 0);
    const workers = () =>
      [...rt.store.liveHouseholds()].reduce((n, h) => n + h.unplacedWorkers, 0);
    const homes = [...rt.store.liveHouseholds()].filter((h) => !h.quarters);
    expect(homes.length, `${where}: counted households`).toBeGreaterThan(0);
    // A member who holds a recorded job is refused, and nothing moves.
    const holder = homes
      .flatMap((h) =>
        h.jobs.filter((j) => j.endsAt === undefined).map((j) => j.personId),
      )
      .find((id) => rt.store.countedMember(id) !== undefined);
    if (holder) {
      const before = { flow: flowTotal(), workers: workers() };
      expect(
        startRegionalWork(core, holder, 2000),
        `${where}: ${holder} holds a recorded job`,
      ).toBeUndefined();
      expect(workers(), where).toBe(before.workers);
      expect(flowTotal(), where).toBe(before.flow);
    }
    // A free member: working age, no recorded job, in a household whose
    // share leaves room.
    const from = countedParameter("countedWorkingAgeFrom"),
      below = countedParameter("countedWorkingAgeBelow");
    const free = homes.flatMap((h) => {
      const held = new Set(
        h.jobs.filter((j) => j.endsAt === undefined).map((j) => j.personId),
      );
      const open = rt.store.countedMembers(h).filter((m) => {
        const age = ageOn(rt.store.born[m]!, core.date);
        return age >= from && age < below && !held.has(rt.store.ids[m]!);
      });
      return open.length - h.unplacedWorkers > 0
        ? open.map((m) => rt.store.ids[m]!)
        : [];
    });
    const before = { flow: flowTotal(), workers: workers() };
    const started = free.find(
      (id) => startRegionalWork(core, id, 2000) === "counted",
    );
    if (!started) {
      passedOver.push(
        `${where}: ${free.length} free members, none taken (no unplaced-workers pool)`,
      );
      expect(workers(), where).toBe(before.workers);
      continue;
    }
    expect(workers(), where).toBeGreaterThan(before.workers);
    expect(flowTotal(), where).toBeGreaterThan(before.flow);
    expect(stopRegionalWork(core, started), where).toBe(true);
    expect(workers(), where).toBeCloseTo(before.workers, 6);
    expect(Math.abs(flowTotal() - before.flow), where).toBeLessThanOrEqual(1);
    process.stdout.write(
      `REGIONAL WORK ${where}: ${started} started and stopped; holder refused: ${holder ?? "none in the counts"}; passed over: ${passedOver.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a free counted member who took regional work: ${passedOver.join("; ")}`,
  );
}, 1_800_000);
