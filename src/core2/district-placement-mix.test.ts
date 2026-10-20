/**
 * A town split between legislative districts places its counted households by
 * each district's own household income mix (pool item
 * research-residents-sourced-parameters, row SG-CORE-district-placement;
 * ACS 2020-2024 B19001 by district): every district holds the town's share of
 * people the Census place-district table gives it, and a district whose own
 * households are richer holds richer households of the town, without taking a
 * contiguous slice of the income ladder. A split town is drawn from the
 * places the game knows on a seed nobody chose (DISTRICT_MIX_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import districtIncome from "./data/district-household-income.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import {
  householdIncome,
  residentsRuntime,
  townDistricts,
} from "./modules/residents";

const seed = process.env.DISTRICT_MIX_SEED ?? randomBytes(8).toString("hex");
const income = districtIncome as unknown as {
  districts: Record<string, Record<string, number[]>>;
};
const RICH_FROM = 11; // bins from $75,000 up

it("places a split town's households by each district's own income mix", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 40; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "district-mix");
    const where = `${place.name} (${place.key}), world seed ${place.seed}, run seed ${seed} draw ${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const districts = townDistricts(core);
    if (districts.length < 2) {
      tried.push(`${where}: whole in one district`);
      continue;
    }
    const rt = residentsRuntime(core)!;
    const households = [...rt.store.liveHouseholds()].filter(
      (h) => h.district !== undefined && h.district !== "town",
    );
    const people = new Map<string, number>();
    const byDistrict = new Map<
      string,
      { sum: number; count: number; bins: Set<number> }
    >();
    let total = 0;
    for (const h of households) {
      const count = rt.store.weightedCount(h);
      people.set(h.district!, (people.get(h.district!) ?? 0) + count);
      total += count;
      const entry = byDistrict.get(h.district!) ?? {
        sum: 0,
        count: 0,
        bins: new Set(),
      };
      entry.sum += householdIncome(rt, h) * count;
      entry.count += count;
      byDistrict.set(h.district!, entry);
    }
    expect(total, where).toBeGreaterThan(0);
    // Each district holds the town's share of people the Census table gives it.
    const censusTotal = districts.reduce((n, [, count]) => n + count, 0);
    for (const [id, count] of districts)
      expect(
        Math.abs((people.get(id) ?? 0) / total - count / censusTotal),
        `${where}: ${id}`,
      ).toBeLessThan(0.05);
    // A richer district (a larger share of its own households at $75,000 and up) holds richer households.
    const rich = (id: string) => {
      const [chamber, geoid] = id.split(":") as [string, string];
      const bins = income.districts[chamber]![geoid]!;
      const all = bins.reduce((a, b) => a + b, 0);
      return bins.slice(RICH_FROM).reduce((a, b) => a + b, 0) / all;
    };
    const ranked = districts
      .map(([id]) => id)
      .filter((id) => byDistrict.get(id)?.count)
      .sort((a, b) => rich(a) - rich(b));
    if (ranked.length < 2 || rich(ranked.at(-1)!) - rich(ranked[0]!) < 0.1) {
      tried.push(`${where}: districts too alike to rank`);
      continue;
    }
    // No district takes a slice of the income ladder: each holds households from below and above the town's median.
    const incomes = households
      .map((h) => householdIncome(rt, h))
      .sort((a, b) => a - b);
    const median = incomes[Math.floor(incomes.length / 2)]!;
    for (const [id] of districts)
      if ((people.get(id) ?? 0) > 20) {
        const mine = households
          .filter((h) => h.district === id)
          .map((h) => householdIncome(rt, h));
        expect(
          mine.some((v) => v < median) && mine.some((v) => v >= median),
          `${where}: ${id} holds a slice of the ladder`,
        ).toBe(true);
      }
    const mean = (id: string) =>
      byDistrict.get(id)!.sum / byDistrict.get(id)!.count;
    expect(
      mean(ranked.at(-1)!),
      `${where}: richest district holds richer households`,
    ).toBeGreaterThan(mean(ranked[0]!));
    console.log(`${where}: ${ranked.length} districts placed by their own mix`);
    return;
  }
  throw new Error(
    `no split town with distinct districts in 40 places: ${tried.join("; ")}`,
  );
}, 3_600_000);
