/**
 * A household filled in and later returned to the counts brings its commuters
 * back as the place's unplaced workers (`returnCommuterPay`): no more of them
 * than it has working-age members without a job in town, and the pool pays
 * for the workers the records hold, as at the opening (pool item
 * world-movers-change-unplaced-workers-not-the-pool-pay).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { ageOn } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { demoteHousehold } from "./modules/counted-demotion";
import {
  countedParameter,
  DAYS_PER_YEAR,
  loseAwayWork,
  residentsRuntime,
  returnCommuterPay,
  unplacedPayPerWorkerBase,
} from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "unplaced-workers-return");
const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
// A pool's pay is kept in whole cents a period: a thousandth of the pool.
const ROUNDING_SHARE = 0.001;

it(`a household returned to the counts brings back no more commuters than it has members to be them, in ${where}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const store = rt.store;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const circle = new Set([
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  const from = countedParameter("countedWorkingAgeFrom"),
    below = countedParameter("countedWorkingAgeBelow");
  // Households of one real household with out-of-town workers, away from the
  // player's circle: the first whose filled-in people can return is the case.
  const candidates = [...rt.households.values()]
    .filter((row) => {
      const h = store.liveHousehold(row.household.id);
      return (
        h &&
        !row.household.quarters &&
        store.weightOf(h) === 1 &&
        h.unplacedWorkers > 0 &&
        row.people.every((p) => !circle.has(p.id))
      );
    })
    .sort((a, b) => a.household.id.localeCompare(b.household.id));
  expect(
    candidates.length,
    `${where}: households with commuters`,
  ).toBeGreaterThan(0);
  let householdId = "";
  for (const row of candidates.slice(0, 12)) {
    // An earlier try may have moved or changed this one.
    const live = store.liveHousehold(row.household.id);
    if (!live || !(live.unplacedWorkers > 0)) continue;
    const home = fillInPerson(core, row.people[0]!.id).householdId;
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    if (demoteHousehold(coreAPI(core), home, core.date)) {
      householdId = home;
      break;
    }
  }
  expect(
    householdId,
    `${where}: a filled-in household that can return`,
  ).not.toBe("");
  const h = store.liveHousehold(householdId);
  // A household that moved away on the return day is not in the counts.
  if (h) {
    const open = store.countedMembers(h).filter((m) => {
      const age = ageOn(store.born[m]!, core.date);
      return age >= from && age < below;
    }).length;
    expect(
      h.unplacedWorkers,
      `${where}: ${householdId} holds ${h.unplacedWorkers} workers of ${open} working-age members`,
    ).toBeLessThanOrEqual(open);
  }
  // A commuter who earned many times the pool's average comes back as one
  // worker at the average, never as several workers of a household that has
  // only one member to be them.
  const free = (x: NonNullable<ReturnType<typeof store.liveHousehold>>) =>
    store.countedMembers(x).filter((m) => {
      const age = ageOn(store.born[m]!, core.date);
      return age >= from && age < below;
    }).length - x.jobs.filter((job) => job.endsAt === undefined).length;
  const other = [...store.liveHouseholds()].find(
    (x) =>
      !x.quarters &&
      store.weightOf(x) === 1 &&
      x.unplacedWorkers > 0 &&
      free(x) >= 1 &&
      unplacedPayPerWorkerBase(rt, x) > 0,
  );
  expect(
    other,
    `${where}: a household with out-of-town workers and a free member`,
  ).toBeDefined();
  const perWorker = unplacedPayPerWorkerBase(rt, other!);
  // Its commuters leave the counts (the engine's own writer), as a filled-in
  // household's do, before it comes back.
  expect(loseAwayWork(core, other!, other!.unplacedWorkers)).toBe(true);
  returnCommuterPay(
    core,
    other!.id,
    Math.round((perWorker * 4) / (DAYS_PER_YEAR / 30)) * 100,
    other!.jobs.length,
  );
  expect(
    other!.unplacedWorkers,
    `${where}: ${other!.id} returned with a commuter paid four times the pool's average`,
  ).toBeLessThanOrEqual(free(other!));
  // The records' workers earn what the pool pays.
  const byPool = new Map<string, { earn: number; paid: number }>();
  const row = (key: string) => {
    let at = byPool.get(key);
    if (!at) byPool.set(key, (at = { earn: 0, paid: 0 }));
    return at;
  };
  for (const x of store.liveHouseholds())
    row(`${x.placeId}|${x.quarters ? "rooms" : "homes"}`).earn +=
      x.unplacedWorkers * store.weightOf(x) * unplacedPayPerWorkerBase(rt, x);
  for (const flow of rt.flows.values()) {
    if (flow.financeKind !== "work.unplaced-residents" || flow.endedAt)
      continue;
    const perYear =
      flow.cadence.kind === "days"
        ? DAYS_PER_YEAR / flow.cadence.every
        : 12 / flow.cadence.every;
    row(`${flow.placeId}|${flow.quarters ? "rooms" : "homes"}`).paid +=
      flow.amountMinor * perYear;
  }
  for (const [key, at] of byPool)
    if (at.earn > 0 || at.paid > 0)
      expect(
        Math.abs(at.earn - at.paid),
        `${where}: pool ${key} records earn ${at.earn}, pool pays ${at.paid}`,
      ).toBeLessThanOrEqual(
        Math.max(at.earn, at.paid) * ROUNDING_SHARE + DAYS_PER_YEAR,
      );
}, 900_000);
