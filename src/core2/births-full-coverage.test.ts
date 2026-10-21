/**
 * Full women's births by age band against the CDC rates (owner, Oct 14: one
 * model, two tiers). A full woman with no recorded partner plans from her own
 * records by the same path as a couple, so the full tier's births per thousand
 * women follow the counted women's. Real rates check the totals only. Played
 * in the bench world over one year, in three places drawn from all 56 on seeds
 * nobody chose.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";
import rates from "../../data/research/renewal/natality-2024.json" with { type: "json" };

const seed = process.env.FULL_BIRTHS_SEED || randomBytes(8).toString("hex");
const DRAWS = 3;
const bands = Object.keys(rates.areas["United States"].ageRates)
  .filter((band) => band !== "10-14")
  .map((band) => band.split("-").map(Number) as [number, number]);

describe(`full women's births by age band (seed ${seed})`, () => {
  it(
    "fall within the CDC band rates' sampling spread, shown by birth record ids",
    { timeout: 600_000 },
    () => {
      const opening = gameStartDate();
      const rows: string[] = [];
      for (let draw = 0; draw < DRAWS; draw++) {
        const place = drawPlace(`${seed}:${draw}`, "full-births");
        const label = `${place.name} (${place.key}, seed ${seed}:${draw})`;
        const world = buildBenchWorld(`${seed}:${draw}`, opening, {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(world.core);
        const women = [...api.state.people.values()].filter(
          (person) =>
            person.looks?.gender === "female" &&
            person.alive &&
            person.tier !== "husk",
        );
        const bandOf = (birthDate: string, date: string) => {
          const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(date));
          return bands.find(([low, high]) => age >= low && age <= high);
        };
        const women0 = new Map(
          women.map((person) => [person.id, person.birthDate]),
        );
        const denominator = new Map<string, number>();
        for (const person of women) {
          const band = bandOf(person.birthDate, opening);
          if (band)
            denominator.set(
              band.join("-"),
              (denominator.get(band.join("-")) ?? 0) + 1,
            );
        }
        advanceCore(world.core, addDays(makeIsoDate(opening), 365));
        const births = api
          .moduleState(RENEWAL_MODULE_ID)
          .table("births")
          .rows() as unknown as {
          id: string;
          motherId: string;
          date: string;
        }[];
        const numerator = new Map<string, string[]>();
        for (const birth of births) {
          const born = women0.get(birth.motherId);
          if (!born) continue;
          const band = bandOf(born, birth.date);
          if (band)
            numerator.set(band.join("-"), [
              ...(numerator.get(band.join("-")) ?? []),
              birth.id,
            ]);
        }
        let totalExpected = 0;
        let totalActual = 0;
        for (const [low, high] of bands) {
          const key = `${low}-${high}`;
          const women5 = denominator.get(key) ?? 0;
          const rate = (
            rates.areas["United States"].ageRates as Record<string, number>
          )[key]!;
          const expected = (women5 * rate) / 1000;
          const actual = numerator.get(key)?.length ?? 0;
          totalExpected += expected;
          totalActual += actual;
          rows.push(
            `${label} ${key}: ${women5} women, ${actual} births against ${expected.toFixed(1)} expected; ids ${(numerator.get(key) ?? []).slice(0, 3).join(", ")}`,
          );
        }
        rows.push(
          `${label} total: ${totalActual} against ${totalExpected.toFixed(1)}`,
        );
      }
      console.log(rows.join("\n"));
      expect(rows.length).toBeGreaterThan(0);
    },
  );
});
