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
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import housingParameters from "./data/housing/parameters.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import {
  HOUSING_MODULE_ID,
  levelFromPay,
  withHousing,
} from "./modules/housing";
import { coreAPI } from "./state";
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
const DAYS = 365;
const MONTHS = 12;

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

  it(`two drawn played towns open with rents at the same share of their own pay (seed ${seed})`, () => {
    const before = setBookkeeping(false);
    const share = housingParameters.housingRentShareOfPay.value;
    try {
      const towns: { where: string; pay: number; rent: number }[] = [];
      const tried: string[] = [];
      for (let attempt = 0; towns.length < 2 && attempt < 8; attempt += 1) {
        const place = drawPlace(seed, `day-one-world:${attempt}`);
        const where = `${place.name} (${place.key}), seed ${seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const town = String(core.placeMetadata?.housingTown ?? "");
        const typical = core.placeMetadata?.housingTypical;
        // The opening keeps what the town's rents and values came from.
        expect(
          typical,
          `${where}: the opening's typical rent, value and pay`,
        ).toBeDefined();
        const [rent, , pay] = JSON.parse(String(typical)) as [
          number,
          number,
          number?,
        ];
        if (!pay) {
          tried.push(`${where}: no household with pay`);
          continue;
        }
        // Typical rent is the fitted share of the town's own median household pay.
        expect(
          Math.abs(rent - (share * pay * DAYS) / MONTHS),
          `${where}: rent ${rent} against pay ${pay} a day`,
          // The kept pay is rounded to the cent: one cent of pay a day.
        ).toBeLessThanOrEqual((share * DAYS) / MONTHS + 1);
        // The town's renters pay around it: their median is the typical rent.
        const rents = (
          coreAPI(core)
            .moduleState(HOUSING_MODULE_ID)
            .table("dwellings")
            .rows() as unknown as {
            householdId: string;
            tenure: string;
            rentMinor?: number;
          }[]
        )
          .filter(
            (row) =>
              row.tenure === "rent" &&
              core.households.get(row.householdId)?.placeId === town,
          )
          .map((row) => row.rentMinor ?? 0);
        if (rents.length >= 5) {
          const middle = [...rents].sort((a, b) => a - b)[
            Math.floor(rents.length / 2)
          ]!;
          expect(
            Math.abs(middle / rent - 1),
            `${where}: renters' median ${middle} against the typical ${rent}`,
          ).toBeLessThan(0.25);
        }
        towns.push({ where, pay, rent });
      }
      if (towns.length < 2)
        throw new Error(
          `Fewer than two drawn towns had pay: ${tried.join("; ")}`,
        );
      const [a, b] = towns as [(typeof towns)[0], (typeof towns)[0]];
      // The better-paid town opens on the higher rent.
      if (a.pay !== b.pay)
        expect(
          Math.sign(a.rent - b.rent),
          `${a.where} pay ${a.pay} rent ${a.rent}; ${b.where} pay ${b.pay} rent ${b.rent}`,
        ).toBe(Math.sign(a.pay - b.pay));
      process.stdout.write(
        `day-one towns: ${towns.map((t) => `${t.where}: pay ${Math.round(t.pay)} a day, rent ${t.rent}`).join("; ")}; passed over: ${tried.join("; ") || "none"}\n`,
      );
    } finally {
      setBookkeeping(before);
    }
  }, 600_000);
});
