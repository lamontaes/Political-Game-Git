/**
 * A town opens with as many businesses of each kind as its own workers fill
 * at the county's usual business size (Census 2023 County Business
 * Patterns), not a fixed three stores, three restaurants and one clinic.
 * Pinned places and seeds: a small town (Edgar, Wisconsin), a mid-size town
 * (Pierre, South Dakota) and a city opened at its Census size (Danville,
 * Virginia, where each generated resident stands for about four).
 */
import { describe, expect, it } from "vitest";
import { corePlaceByKey } from "./place-lookup";
import { buildPopulation } from "./population";
import { TOWN_WORKPLACE_BY_KEY } from "./town-workplaces";
import type { TownBusinessCount } from "./town-establishments";
import type { CoreInput } from "./types";

const PLACES = [
  { name: "Edgar, Wisconsin", key: "5522550", seed: "edgar-petition-1" },
  { name: "Pierre, South Dakota", key: "4649600", seed: "size-4649600" },
  { name: "Danville, Virginia", key: "5121344", seed: "size-5121344" },
] as const;

const opened = new Map<string, CoreInput>();
function open(place: (typeof PLACES)[number]): CoreInput {
  let input = opened.get(place.key);
  if (!input) {
    input = buildPopulation({
      seed: place.seed,
      startedAt: "2025-01-01",
      placeKey: place.key,
      openAtCensusScale: true,
    });
    opened.set(place.key, input);
  }
  return input;
}

const countsOf = (input: CoreInput) =>
  new Map(
    (
      JSON.parse(
        input.placeMetadata!.openingBusinessCounts!,
      ) as TownBusinessCount[]
    ).map((row) => [row.kind, row]),
  );

describe("a town's businesses are sized from its own workers", () => {
  for (const place of PLACES)
    it(`${place.name}: every kind's count is its workers over the county's business size, and every job's employer exists`, () => {
      const input = open(place);
      const scale = Number(input.placeMetadata!.openingCountScale);
      const counts = countsOf(input);
      const organizations = new Set(input.organizations.map((row) => row.id));
      const jobsAt = new Map<string, number>();
      for (const job of input.jobs) {
        expect(organizations.has(job.organizationId), job.id).toBe(true);
        jobsAt.set(
          job.organizationId,
          (jobsAt.get(job.organizationId) ?? 0) + 1,
        );
      }
      for (const row of counts.values()) {
        expect(row.count, row.kind).toBeGreaterThanOrEqual(1);
        if (!row.size) {
          expect(row.count, row.kind).toBe(1);
          continue;
        }
        const records = row.workers / scale;
        const wanted = Math.max(1, Math.round(row.workers / row.size.size));
        expect(row.count, row.kind).toBe(
          Math.min(wanted, Math.max(1, Math.round(records))),
        );
        expect(row.heldToRecords, row.kind).toBe(wanted > row.count);
      }
      // The jobs are dealt evenly: the town's businesses of a kind differ by
      // at most one job record.
      const town = corePlaceByKey(place.key)!.context.jurisdiction.id;
      for (const row of counts.values()) {
        const classification = TOWN_WORKPLACE_BY_KEY.get(
          row.kind,
        )!.classification;
        const held = input.organizations
          .filter(
            (org) =>
              org.placeId === town && org.classification === classification,
          )
          .map((org) => jobsAt.get(org.id) ?? 0);
        if (held.length < 2) continue;
        expect(
          Math.max(...held) - Math.min(...held),
          row.kind,
        ).toBeLessThanOrEqual(1);
      }
    }, 120_000);

  it("Danville, Virginia: a city opens with many stores and restaurants, each near the county's usual size", () => {
    const counts = countsOf(open(PLACES[2]));
    const retail = counts.get("retail")!;
    const restaurant = counts.get("restaurant")!;
    expect(retail.count).toBeGreaterThan(50);
    expect(restaurant.count).toBeGreaterThan(20);
    for (const row of [retail, restaurant]) {
      const perBusiness = row.workers / row.count;
      expect(perBusiness).toBeGreaterThan(row.size!.size / 2);
      expect(perBusiness).toBeLessThan(row.size!.size * 2);
    }
  }, 120_000);

  it("Edgar, Wisconsin: a small town keeps a few of each, and a public employer is one", () => {
    const counts = countsOf(open(PLACES[0]));
    expect(counts.get("retail")!.count).toBeLessThan(10);
    expect(counts.get("police")?.count ?? 1).toBe(1);
  }, 120_000);
});
