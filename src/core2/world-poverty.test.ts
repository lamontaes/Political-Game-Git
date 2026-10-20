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
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { incomeBandOf, residentsRuntime } from "./modules/residents";
import { WORLD_METRICS_MODULE_ID } from "./modules/world-metrics";
import { WEB_LINKS, WIRED_INTO, linkCoverage } from "./outcome-web-model";
import { coreAPI } from "./state";
import {
  householdPoverty,
  povertyByPlace,
  povertyThresholdMinor,
} from "./world-poverty";

const seed = process.env.WEB_POVERTY_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-poverty");

describe("the Census poverty line", () => {
  it("reads the 2024 table by size, children and the eldest member", () => {
    expect(povertyThresholdMinor(1, 0, 40)).toBe(16320 * 100);
    expect(povertyThresholdMinor(1, 0, 70)).toBe(15045 * 100);
    expect(povertyThresholdMinor(2, 1, 35)).toBe(21621 * 100);
    expect(povertyThresholdMinor(4, 2, 40)).toBe(31812 * 100);
    expect(povertyThresholdMinor(12, 3, 40)).toBe(68102 * 100);
  });
});

describe(`poverty from incomes (${place.name}, seed ${seed})`, () => {
  it("is the engine's record, spreads by household and moves with pay", () => {
    const opening = gameStartDate();
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(opening), 100));
    const api = coreAPI(world.core);

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
