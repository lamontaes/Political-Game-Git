/**
 * One unit for a counted household's out-of-town workers: workers per
 * household of the record. Every reader of a counted household's income
 * multiplies by the record's weight, so the pay the place's pool hands out
 * must equal the workers the records hold times what one is paid, before and
 * after a counted person finds or loses regional work, and no record may hold
 * more workers than it has working-age members to do the work.
 *
 * Not held here: the same identity through a played year. Households that
 * move in or out change the workers on the records without changing what the
 * pool pays (pool item world-movers-change-unplaced-workers-not-the-pool-pay);
 * the test prints both sides after the played days.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { ageOn, type CountedHousehold } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { unplacedRates } from "./modules/counted-moves";
import {
  countedParameter,
  DAYS_PER_YEAR,
  residentsRuntime,
  startRegionalWork,
  stopRegionalWork,
  unplacedPayPerWorkerBase,
} from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "unplaced-workers-unit");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
const PLAYED_DAYS = 400;
// Two skipped months, so the residents engine catches up at least twice.
const SKIPPED_DAYS = 60;
// A pool's pay is kept in whole cents a period, so the two sides of the
// identity may differ by the rounding of each hire: a thousandth of the pool.
const ROUNDING_SHARE = 0.001;
// Fewer free members than this is too few to compare two kinds of place.
const SMALL_POOL = 50;
// Two places under one opening rate differ by their recorded jobs, never by
// half: the defect this guards read one in fifty.
const WITHIN_A_FACTOR = 0.5;

it(`a counted household's out-of-town workers are per household everywhere, in ${where}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const store = rt.store;
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  const poolOf = (h: CountedHousehold) =>
    `${h.placeId}|${h.quarters ? "rooms" : "homes"}`;
  /** Working-age members of one household of the record who hold no recorded job. */
  const openMembers = (h: CountedHousehold) => {
    const held = new Set(
      h.jobs.filter((job) => job.endsAt === undefined).map((j) => j.personId),
    );
    return store.countedMembers(h).filter((m) => {
      const age = ageOn(store.born[m]!, core.date);
      return age >= from && age < below && !held.has(store.ids[m]!);
    });
  };
  /** By pool: the workers the records hold (times their weights), what the records say they earn a year at the opening's pay, and what the pool's flow pays a year. */
  const pools = () => {
    const out = new Map<
      string,
      { workers: number; earnYear: number; paidYear: number; open: number }
    >();
    const row = (key: string) => {
      let at = out.get(key);
      if (!at)
        out.set(key, (at = { workers: 0, earnYear: 0, paidYear: 0, open: 0 }));
      return at;
    };
    for (const h of store.liveHouseholds()) {
      const at = row(poolOf(h));
      const weight = store.weightOf(h);
      at.workers += h.unplacedWorkers * weight;
      at.earnYear +=
        h.unplacedWorkers * weight * unplacedPayPerWorkerBase(rt, h);
      at.open += openMembers(h).length * weight;
    }
    for (const flow of rt.flows.values()) {
      if (flow.financeKind !== "work.unplaced-residents" || flow.endedAt)
        continue;
      const perYear =
        flow.cadence.kind === "days"
          ? DAYS_PER_YEAR / flow.cadence.every
          : 12 / flow.cadence.every;
      row(`${flow.placeId}|${flow.quarters ? "rooms" : "homes"}`).paidYear +=
        flow.amountMinor * perYear;
    }
    return out;
  };
  const report = (label: string) => {
    const lines: string[] = [];
    for (const [key, at] of pools())
      if (at.workers > 0 || at.paidYear > 0)
        lines.push(
          `${key}: ${at.workers.toFixed(1)} workers of ${at.open} open members; records earn ${Math.round(at.earnYear / 100)} a year, the pool pays ${Math.round(at.paidYear / 100)}`,
        );
    process.stdout.write(
      `UNPLACED WORKERS ${label} ${core.date} ${where}\n  ${lines.join("\n  ")}\n`,
    );
  };
  const holds = (label: string) => {
    for (const [key, at] of pools()) {
      if (!(at.paidYear > 0) && !(at.earnYear > 0)) continue;
      expect(
        Math.abs(at.earnYear - at.paidYear),
        `${label}, pool ${key}: the records' workers earn ${at.earnYear} a year and the pool pays ${at.paidYear} (${where})`,
      ).toBeLessThanOrEqual(
        Math.max(at.paidYear, at.earnYear) * ROUNDING_SHARE + DAYS_PER_YEAR,
      );
    }
  };

  // ---- At the opening the records and the pool agree.
  report("opening");
  holds("at the opening");
  // Every place's adults work at the same opening rate, whether its records
  // stand for one household each or for many: a place of many-household
  // records may not open with a far smaller share of its free members at
  // work than a place of one-household records beside it (a county once
  // opened with one in a hundred at work, its records counted as if each
  // were one household).
  const shareAtWork = (heavy: boolean) => {
    let workers = 0,
      open = 0;
    for (const h of store.liveHouseholds()) {
      if (h.quarters || store.weightOf(h) > 1 !== heavy) continue;
      workers += h.unplacedWorkers * store.weightOf(h);
      open += openMembers(h).length * store.weightOf(h);
    }
    return open >= SMALL_POOL ? workers / open : undefined;
  };
  const many = shareAtWork(true),
    single = shareAtWork(false);
  process.stdout.write(
    `UNPLACED WORKERS opening share of free members at work: many-household records ${many?.toFixed(3) ?? "too few"}, one-household records ${single?.toFixed(3) ?? "too few"}\n`,
  );
  if (many !== undefined && single !== undefined && single > 0)
    expect(
      many / single,
      `records of many households open with ${many} of their free members at work, one-household records with ${single} (${where})`,
    ).toBeGreaterThan(WITHIN_A_FACTOR);

  // ---- One counted person of the heaviest record finds regional work.
  const heavy = [...store.liveHouseholds()]
    .filter(
      (h) =>
        !h.quarters &&
        store.weightOf(h) > 1 &&
        unplacedPayPerWorkerBase(rt, h) > 0 &&
        // A free member, in a household whose share leaves room for them
        // (a member it already covers is not hired again).
        openMembers(h).length - h.unplacedWorkers > 0,
    )
    .sort(
      (a, b) => store.weightOf(b) - store.weightOf(a) || (a.id < b.id ? -1 : 1),
    )[0];
  if (heavy) {
    const weight = store.weightOf(heavy);
    const key = poolOf(heavy);
    const before = { per: heavy.unplacedWorkers, pool: pools().get(key)! };
    // The household gains a worker less what its share already covered, and
    // never more than its working-age members without a recorded job.
    const gain = Math.min(
      1,
      Math.max(0, openMembers(heavy).length - heavy.unplacedWorkers),
    );
    const member = openMembers(heavy)[0]!;
    const personId = store.ids[member]!;
    const rateBefore = unplacedRates(rt, core.date).get(heavy.placeId)!;
    expect(startRegionalWork(core, personId, 2000), where).toBe("counted");
    const after = pools().get(key)!;
    // The share of the place's free members working out of town, which the
    // moves engine gives each newcomer household, is people over people: the
    // record's households found work, of all the place's free members.
    expect(
      unplacedRates(rt, core.date).get(heavy.placeId)! - rateBefore,
      `the place's rate rose by ${weight} workers of its ${before.pool.open} free members (${where})`,
    ).toBeCloseTo((gain * weight) / before.pool.open, 9);
    expect(
      heavy.unplacedWorkers - before.per,
      `one member of each of the record's ${weight} households found work, less what the share covered (${where})`,
    ).toBeCloseTo(gain, 9);
    expect(
      after.workers - before.pool.workers,
      `the place gained ${gain * weight} workers (${where})`,
    ).toBeCloseTo(gain * weight, 6);
    expect(
      heavy.unplacedWorkers,
      `a household's out-of-town workers never outnumber its free working-age members (${where})`,
    ).toBeLessThanOrEqual(openMembers(heavy).length + 1e-9);
    holds(`after one hire in a record of ${weight} households`);
    expect(stopRegionalWork(core, personId), where).toBe(true);
    expect(heavy.unplacedWorkers, where).toBeCloseTo(before.per, 9);
    holds("after that work ended");
    process.stdout.write(
      `UNPLACED WORKERS one hire in ${heavy.id} (weight ${weight}): ${before.per.toFixed(3)} to ${(before.per + gain).toFixed(3)} a household and back; the pool's workers ${before.pool.workers.toFixed(1)} to ${after.workers.toFixed(1)}\n`,
    );
  } else
    process.stdout.write(
      `UNPLACED WORKERS no record of more than one household has a pool and a free member in ${where}\n`,
    );

  // ---- Played: the engines' own hires and layoffs. A hire adds at most one
  // worker to a household and never past its working-age members without a
  // recorded job, so no record that stands for many households may hold more
  // workers than it has working-age members (on a record of 53 households the
  // old weight-sized add put 53 on a household of two; in Cumberland,
  // Maryland a one-adult household held its opening share and a whole hire,
  // 1.69 workers). A record of one household is left out:
  // a household that returned to the counts holds its commuter's pay as so
  // many of the pool's workers (`returnCommuterPay`), which is a measure of
  // pay, not a count of its members.
  advanceCore(core, addDays(makeIsoDate(core.date), PLAYED_DAYS));
  report(`after ${PLAYED_DAYS} days`);
  const workingAge = (h: CountedHousehold) =>
    store.countedMembers(h).filter((m) => {
      const age = ageOn(store.born[m]!, core.date);
      return age >= from && age < below;
    }).length;
  const over: string[] = [];
  let heavyRecords = 0,
    heavyWithWork = 0;
  for (const h of store.liveHouseholds()) {
    if (!(store.weightOf(h) > 1)) continue;
    heavyRecords += 1;
    if (h.unplacedWorkers >= 1) heavyWithWork += 1;
    if (h.unplacedWorkers > workingAge(h) + 1e-9)
      over.push(
        `${h.id} (weight ${store.weightOf(h).toFixed(1)}): ${h.unplacedWorkers.toFixed(2)} workers, ${workingAge(h)} working-age members`,
      );
  }
  process.stdout.write(
    `UNPLACED WORKERS after ${PLAYED_DAYS} days: of ${heavyRecords} records of more than one household, ${heavyWithWork} hold a whole worker or more and ${over.length} hold more workers than their working-age members\n`,
  );
  expect(
    over.slice(0, 8),
    `${over.length} records of more than one household hold more workers than their working-age members (${where})`,
  ).toEqual([]);

  // ---- Skipped: results mode runs no module's day, and the residents engine
  // catches up on the first of each month; members who passed working age on
  // any skipped day still take their share of the work with them, dated the
  // day they passed it. The check reads the world once that catch-up has run
  // (the day after the first of the month after the skipped days): before it, a member who
  // passed working age since the last first still holds their work (Fort
  // Plain, New York, seed 708dcedf017ce5453a47: person_e865f61eebdd47f5, born
  // 1961-04-21, in regional work since 2025-02-01, turned 65 on 2026-04-21,
  // and household_66e03fb6984e2f6b was read on 2026-04-25 with 1.00 workers
  // and no working-age member; on May 1 the catch-up takes the worker off).
  // A household whose every working-age member left that way holds none.
  advanceCore(core, addDays(makeIsoDate(core.date), SKIPPED_DAYS), {
    results: true,
  });
  const settled = new Date(`${core.date.slice(0, 7)}-01T00:00:00Z`);
  settled.setUTCMonth(settled.getUTCMonth() + 1, 2);
  advanceCore(core, settled.toISOString().slice(0, 10), { results: true });
  report(`after ${SKIPPED_DAYS} skipped days`);
  const overSkipped: string[] = [];
  let skippedRecords = 0;
  for (const h of store.liveHouseholds()) {
    if (!(store.weightOf(h) > 1)) continue;
    skippedRecords += 1;
    if (h.unplacedWorkers > workingAge(h) + 1e-9)
      overSkipped.push(
        `${h.id} (weight ${store.weightOf(h).toFixed(1)}): ${h.unplacedWorkers.toFixed(2)} workers, ${workingAge(h)} working-age members`,
      );
  }
  process.stdout.write(
    `UNPLACED WORKERS after ${SKIPPED_DAYS} skipped days: of ${skippedRecords} records of more than one household, ${overSkipped.length} hold more workers than their working-age members\n`,
  );
  expect(
    overSkipped.slice(0, 8),
    `${overSkipped.length} records of more than one household hold more workers than their working-age members after ${SKIPPED_DAYS} skipped days (${where})`,
  ).toEqual([]);
}, 1_800_000);
