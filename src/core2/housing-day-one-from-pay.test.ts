/**
 * Day one's rents and home values come from the place's own pay (owner,
 * Nov 16, 2026: "Everything comes from the simulation. Stop pegging things to
 * real numbers"). The same drawn town is built twice from one seed, the
 * second time with every job's pay raised by half: its typical rent and
 * typical home value rise with it. When both were read from the county's
 * published medians, the two builds opened on the same rent and value.
 *
 * The place is drawn; the place and seed are named in every message.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { levelFromPay, withHousing } from "./modules/housing";
import { corePlaceByKey } from "./place-lookup";
import type { CoreInput, Source } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const start = "2025-01-20";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Day-one housing fixture only.",
};
const HOMES = 120;

/** A drawn town's opening input before housing: `HOMES` one-person households at pay that rises across them, times `raise`. */
function buildOpeningInput(placeKey: string, raise: number): CoreInput {
  const town = corePlaceByKey(placeKey)!.context.jurisdiction.id;
  const homes = Array.from({ length: HOMES }, (_, i) => i);
  return {
    seed,
    startedAt: start,
    people: homes.map((i) => ({
      id: `person:${i}`,
      givenName: `P${i}`,
      familyName: "Fixture",
      birthDate: `${1945 + (i % 60)}-01-01`,
      placeId: town,
      householdId: `household:${i}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 100_000,
      livingCostDailyMinor: 0,
      source: src,
      familyIds: [],
      knownIds: [],
    })),
    households: homes.map((i) => ({
      id: `household:${i}`,
      placeId: town,
      memberIds: [`person:${i}`],
      source: src,
    })),
    jobs: homes.map((i) => ({
      id: `job:${i}`,
      personId: `person:${i}`,
      organizationId: "organization:employer",
      title: "Worker",
      wageDailyMinor: Math.round((6_000 + ((i * 37) % HOMES) * 150) * raise),
      hoursDaily: 8,
      source: src,
    })),
    organizations: [
      {
        id: "organization:employer",
        placeId: town,
        name: "Employer",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
    ],
    finance: { contracts: [], facilities: [], businesses: [], gaps: [] },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { placeKey },
  };
}

describe("day one's rents and values", () => {
  it("rise in every place when its pay rises, at any pay and in any world", () => {
    for (const world of ["world-a", "world-b"])
      for (const pay of [4_000, 12_000, 30_000]) {
        const low = levelFromPay(pay, { startedAt: "2025-01-20", seed: world });
        const high = levelFromPay(pay * 1.5, {
          startedAt: "2025-01-20",
          seed: world,
        });
        expect(low.rentMinor, `${world} ${pay}`).toBeGreaterThan(0);
        expect(high.rentMinor / low.rentMinor, `${world} ${pay}`).toBeCloseTo(
          1.5,
          2,
        );
        expect(high.valueMinor / low.valueMinor, `${world} ${pay}`).toBeCloseTo(
          1.5,
          2,
        );
      }
  });

  it(`the same drawn town opens on higher rents and values when its jobs pay more (seed ${seed})`, () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(seed, `day-one-pay:${attempt}`);
      const where = `${place.name} (${place.key}), seed ${seed}`;
      const typical = (raise: number) => {
        const housed = withHousing(buildOpeningInput(place.key, raise));
        const dwellings = JSON.parse(
          String(housed.placeMetadata?.housingDwellings ?? "[]"),
        ) as [string, "own" | "rent" | "group", number][];
        const median = (tenure: string) => {
          const rows = dwellings
            .filter((row) => row[1] === tenure)
            .map((row) => row[2])
            .sort((a, b) => a - b);
          return rows[Math.floor(rows.length / 2)] ?? 0;
        };
        return { rent: median("rent"), value: median("own") };
      };
      const base = typical(1);
      if (!base.rent || !base.value) {
        tried.push(`${where}: no ${base.rent ? "owner" : "renter"} on day one`);
        continue;
      }
      const raised = typical(1.5);
      expect(
        raised.rent,
        `${where}: median rent ${base.rent} at today's pay, ${raised.rent} with pay raised by half`,
      ).toBeGreaterThan(base.rent * 1.2);
      expect(
        raised.value,
        `${where}: median value ${base.value} at today's pay, ${raised.value} with pay raised by half`,
      ).toBeGreaterThan(base.value * 1.2);
      process.stdout.write(
        `day-one pay: ${where}: rent ${base.rent} to ${raised.rent}, value ${base.value} to ${raised.value}; passed over: ${tried.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No drawn place had both a renter and an owner: ${tried.join("; ")}`,
    );
  }, 600_000);
});
