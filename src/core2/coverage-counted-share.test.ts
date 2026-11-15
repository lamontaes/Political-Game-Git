/**
 * The counted households that hold an employer health plan stand for about the
 * national share of the place's counted workers, at a monthly review as at the
 * opening (pool item people-coverage-counted-unplaced-record-ranked-as-one-worker).
 * The ranking counts a counted record for the policyholders it stands for, so
 * a record of many households is not ranked as one worker: before, the held
 * records stood for 6 percent of the counted households at Marion, 9 percent
 * at Oak Grove and 81 percent at Waverly on the day this test reads.
 *
 * The places are pinned (no drawn test): each is named with the place seed its
 * world is built from, and played to the day after the March review.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedCoverageOf } from "./modules/coverage";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const PINNED_PLACES = [
  { name: "Marion, Mississippi", key: "2845160", seed: "7df73e53cd67" },
  {
    name: "Oak Grove, Tennessee",
    key: "4754700",
    seed: "5affb71e52fb1248c3d5ebd8ed99c64605f04b05d91e5104084a3fac3e6ee4db",
  },
  { name: "Waverly, New York", key: "3678806", seed: "wav-1" },
] as const;

/** How far the held share may sit from the national share: the outcome web's reach moves it a few points. */
const TOLERANCE = 0.1;

for (const place of PINNED_PLACES)
  it(`counted households holding a plan stand for about the national share of counted workers at ${place.name}`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, makeIsoDate("2025-03-02"));
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    const where = `${place.name} (${place.key}), place seed ${place.seed}, ${core.date}`;
    let households = 0;
    let held = 0;
    let large = 0;
    let largeHeld = 0;
    for (const h of rt.store.liveHouseholds()) {
      // A record with a worker: an unplaced one, or a recorded job still held.
      if (
        !(h.unplacedWorkers > 0) &&
        !h.jobs.some((job) => job.endsAt === undefined)
      )
        continue;
      const weight = rt.store.weightOf(h);
      const holds = !!countedCoverageOf(api, h.id);
      households += weight;
      if (holds) held += weight;
      if (weight > 20) {
        large += 1;
        if (holds) largeHeld += 1;
      }
    }
    const share = held / households;
    process.stdout.write(
      `COVERAGE SHARE ${where}: held records stand for ${Math.round(held)} of ${Math.round(households)} counted households with a worker (${(share * 100).toFixed(1)} percent); ${largeHeld} of ${large} records of more than 20 households hold a plan\n`,
    );
    expect(
      households,
      `${where}: counted households with a worker`,
    ).toBeGreaterThan(0);
    const national = api.parameter("healthEmployerPolicyholderShare");
    expect(
      Math.abs(share - national),
      `${where}: held share ${share.toFixed(3)} against the national ${national}`,
    ).toBeLessThan(TOLERANCE);
  }, 300_000);
