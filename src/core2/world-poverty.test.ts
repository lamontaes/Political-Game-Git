/**
 * Poverty is a result of incomes: every household's yearly pay and awards
 * against the Census line for its size, children and eldest member, counted
 * by weight. World-metrics records the share monthly and the outcome web
 * reads that record, so a link into poverty would count its cause twice.
 * Played in the bench world, in a place drawn from all 56 on a seed nobody
 * chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { incomeBandOf, residentsRuntime } from "./modules/residents";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import { WEB_LINKS, WIRED_INTO, linkCoverage } from "./outcome-web-model";
import { fileClaim, type ClaimRow } from "./jobs-benefits";
import { coreAPI } from "./state";
import type { JobInput } from "./types";
import {
  householdPoverty,
  povertyByPlace,
  povertyThresholdMinor,
} from "./world-poverty";

const seed = process.env.WEB_POVERTY_SEED || randomBytes(8).toString("hex");
const firstPlace = drawPlace(seed, "web-poverty");

describe("the Census poverty line", () => {
  it("reads the 2024 table by size, children and the eldest member", () => {
    expect(povertyThresholdMinor(1, 0, 40)).toBe(16320 * 100);
    expect(povertyThresholdMinor(1, 0, 70)).toBe(15045 * 100);
    expect(povertyThresholdMinor(2, 1, 35)).toBe(21621 * 100);
    expect(povertyThresholdMinor(4, 2, 40)).toBe(31812 * 100);
    expect(povertyThresholdMinor(12, 3, 40)).toBe(68102 * 100);
  });
});

const REDRAWS = 5;

/** Play a drawn town 100 days and find the record the run is about. */
function playTown(drawSeed: string) {
  const place = drawPlace(drawSeed, "web-poverty");
  const opening = gameStartDate();
  const world = buildBenchWorld(drawSeed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(world.core, addDays(makeIsoDate(opening), 100));
  const api = coreAPI(world.core);
  // The monthly record, and the web row reading it.
  const metrics = api
    .moduleState(WORLD_METRICS_MODULE_ID)
    .table("months")
    .rows() as unknown as {
    id: string;
    placeId: string;
    date: string;
    povertyShare?: number;
  }[];
  // The biggest place the web keeps that has a recorded share is the one the run is about.
  const web = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as {
    placeId: string;
    date: string;
    values: Record<string, number>;
    engineSources: Record<string, string | null>;
  }[];
  const counted = povertyByPlace(world.core);
  const kept = new Set(web.map((r) => r.placeId));
  const withShare = metrics.filter(
    (r) => r.povertyShare !== undefined && kept.has(r.placeId),
  );
  const biggest = [...new Set(withShare.map((r) => r.placeId))].sort(
    (a, b) => counted.get(b)!.people - counted.get(a)!.people,
  )[0]!;
  const record = withShare
    .filter((r) => r.placeId === biggest)
    .sort((a, b) => b.date.localeCompare(a.date))[0]!;
  return { world, record, web, place };
}

describe(`poverty from incomes (${firstPlace.name}, seed ${seed})`, () => {
  it("is the engine's record, spreads by household and moves with pay", () => {
    // Links into poverty are the engine's, not the web's: none runs.
    const into = WEB_LINKS.filter((l) => l.to === "household.poverty-pct");
    expect(into.length).toBeGreaterThanOrEqual(14);
    for (const link of into) {
      const c = linkCoverage(link);
      expect(c.wired, link.key).toBe(false);
      expect("carriedBy" in c && c.carriedBy, link.key).toBe(link.carriedBy);
      expect(link.carriedBy, link.key).toBeTruthy();
    }
    expect(WIRED_INTO.get("household.poverty-pct")).toBeUndefined();

    // A town needs both poor and non-poor households to show the spread; a
    // town of a few full households can have none below the line. Redraw a
    // bounded number of times, and fail by name when no draw has both.
    const tried: string[] = [];
    let found: ReturnType<typeof playTown> | null = null;
    for (let draw = 0; draw < REDRAWS && !found; draw += 1) {
      const town = playTown(draw ? `${seed}-${draw}` : seed);
      const share = town.record.povertyShare!;
      if (share > 0 && share < 1) found = town;
      else tried.push(`${town.place.name}, ${town.place.state}: ${share}`);
    }
    if (!found)
      throw new Error(
        `no drawn town in ${REDRAWS} draws has both poor and non-poor households (${tried.join("; ")})`,
      );
    const { world, record, web, place } = found;
    expect(record.povertyShare!).toBeGreaterThan(0);
    expect(record.povertyShare!).toBeLessThan(1);
    // The web's latest row for the place stands on the engine's record.
    const row = web
      .filter((r) => r.placeId === record.placeId)
      .sort((a, b) => b.date.localeCompare(a.date))[0]!;
    expect(row.engineSources["household.poverty-pct"]).toMatch(/^metrics:/);
    expect(row.values["household.poverty-pct"]).toBeGreaterThan(0);

    // Person by person: it varies by household kind and income fifth.
    const households = householdPoverty(world.core).filter(
      (h) => h.placeId === record.placeId,
    );
    const byKind = new Map<string, { people: number; poor: number }>();
    const byFifth = new Map<number, { people: number; poor: number }>();
    for (const h of households) {
      const people = h.size * h.weight;
      for (const [map, key] of [
        [byKind, h.kind],
        [byFifth, incomeBandOf(h.incomeMinor)],
      ] as const) {
        const at = (map as Map<unknown, { people: number; poor: number }>).get(
          key,
        ) ?? { people: 0, poor: 0 };
        at.people += people;
        if (h.poor) at.poor += people;
        (map as Map<unknown, typeof at>).set(key, at);
      }
    }
    const share = (m: Map<unknown, { people: number; poor: number }>) =>
      [...m].map(([k, v]) => `${String(k)} ${(v.poor / v.people).toFixed(3)}`);
    console.log(
      `poverty: ${place.name}, seed ${seed}: record ${record.id} share ${record.povertyShare!.toFixed(4)}; web ${row.values["household.poverty-pct"]!.toFixed(2)}%; by kind ${share(byKind).join(", ")}; by fifth ${share(byFifth).join(", ")}`,
    );
    const kindShares = [...byKind.values()].map((v) => v.poor / v.people);
    expect(Math.max(...kindShares)).toBeGreaterThan(Math.min(...kindShares));
    const poor = povertyByPlace(world.core).get(record.placeId)!;
    expect(poor.poor / poor.people).toBeCloseTo(record.povertyShare!, 1);

    // The measure reads incomes: halve every pay and poverty rises.
    const before = poor.poor / poor.people;
    for (const job of world.core.jobs.values())
      job.wageDailyMinor = Math.round(job.wageDailyMinor / 2);
    const rt = residentsRuntime(world.core);
    for (const h of rt?.store.liveHouseholds() ?? []) {
      h.wagesMinorYear = Math.round(h.wagesMinorYear / 2);
      h.unplacedWorkers = 0;
    }
    const half = povertyByPlace(world.core).get(record.placeId)!;
    expect(half.poor / half.people).toBeGreaterThan(before);
  }, 600_000);
});

/**
 * Unemployment compensation is money income in the Census official measure,
 * so a household reads its open claims as income: the weekly benefit times the
 * weeks left on the claim, at most 52, by one rule for named and counted
 * households (the household record's weight multiplies the count).
 */
describe(`unemployment compensation is income (seed ${seed})`, () => {
  it("reads a claim's benefit as a household's income, and the poverty count moves when the claim ends", () => {
    const tried: string[] = [];
    for (let draw = 0; draw < REDRAWS; draw += 1) {
      const place = drawPlace(`${seed}-claims-${draw}`, "web-poverty-claims");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${seed}-claims-${draw}`;
      const claims = api.moduleState("jobs").table("claims");
      const read = (householdId: string) =>
        householdPoverty(core).find((h) => h.householdId === householdId)!;
      const yearly = (c: ClaimRow) => c.weeklyMinor * Math.min(52, c.weeksLeft);
      const end = (c: ClaimRow) =>
        claims.put({
          ...c,
          open: false,
          endedAt: core.date,
          endReason: "hired",
        });
      const file = (jobs: readonly JobInput[]) => {
        for (const job of jobs) {
          const claim = fileClaim(api, claims, job, "poverty-test", 52);
          if (claim) return { job, claim };
        }
        return undefined;
      };

      // Named: a person living alone loses a job; the claim is the household's only income.
      const town = lawChain(api).townPlaceId;
      const alone = [...core.jobs.values()].filter(
        (j) =>
          j.endsAt === undefined &&
          core.people.get(j.personId)?.placeId === town &&
          core.households.get(core.people.get(j.personId)?.householdId ?? "")
            ?.memberIds.length === 1,
      );
      const named = file(alone);
      // Counted: a counted worker files; the household reads the same benefit.
      const rt = residentsRuntime(core);
      const countedJobs = [...(rt?.jobs.values() ?? [])].filter(
        (j) => !core.jobs.has(j.id) && j.endsAt === undefined,
      );
      const counted = file(countedJobs);
      if (!named || !counted || !rt) {
        tried.push(`${where}: no lone worker and counted worker able to claim`);
        continue;
      }

      // Named tier.
      const household = core.people.get(named.job.personId)!.householdId;
      api.endJob(named.job.id, "test:poverty-claim");
      const withClaim = read(household);
      expect(withClaim.incomeMinor, `${where}: ${named.claim.id}`).toBe(
        yearly(named.claim),
      );
      // The benefit lifts the household over its line, so the count of the poor moves with the claim.
      const lift = Math.ceil(
        (withClaim.thresholdMinor + 1) / Math.min(52, named.claim.weeksLeft),
      );
      claims.put({ ...named.claim, weeklyMinor: lift });
      const lifted = read(household);
      expect(lifted.poor, `${where}: ${named.claim.id} at ${lift} a week`).toBe(
        false,
      );
      const place0 = povertyByPlace(core).get(lifted.placeId)!;
      end({ ...named.claim, weeklyMinor: lift });
      const ended = read(household);
      expect(ended.incomeMinor, where).toBe(0);
      expect(ended.poor, where).toBe(true);
      expect(povertyByPlace(core).get(lifted.placeId)!.poor, where).toBe(
        place0.poor + lifted.size * lifted.weight,
      );

      // Counted tier: one rule, the claim adds exactly its benefit to the counted household.
      const m = rt.store.countedMember(counted.job.personId)!;
      const countedHousehold = rt.store.households[rt.store.household[m]!]!.id;
      const after = read(countedHousehold);
      end(counted.claim);
      const before = read(countedHousehold);
      expect(
        after.incomeMinor - before.incomeMinor,
        `${where}: ${counted.claim.id}`,
      ).toBe(yearly(counted.claim));
      expect(after.weight, where).toBe(before.weight);
      console.info(
        `unemployment claims as income (${where}): ${named.claim.id} reads ${withClaim.incomeMinor} for ${household}; counted ${counted.claim.id} adds ${yearly(counted.claim)} to ${countedHousehold}`,
      );
      return;
    }
    throw new Error(
      `no draw had a lone worker and a counted worker able to claim: ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
