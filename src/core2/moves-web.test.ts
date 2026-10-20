/**
 * Leaving takes the outcome web's factors, for full people and counted
 * households alike. The same town is built from one seed three times and played
 * forty days with the web's links held at known effects (the effect each link
 * would carry, landing on each person through its researched moderators):
 * nothing, a rent rule (-0.2 on renters' moves), then a crime rise (+0.1 on
 * leaving). Only the factor differs between the worlds, so each person's pull
 * built under a factor is their pull without it times that factor, and the
 * counted households' movers per month follow.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import { MOVES_MODULE_ID } from "./modules/moves";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.WEB_MOVES_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-moves");

interface FullPull {
  id: string;
  causes: Record<string, number>;
  webFactor?: number;
}
interface CountedPull {
  id: string;
  moversPerMonth: number;
}

function play(rent: number, crime: number) {
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  // The web's latest month for every place a person or household lives in,
  // carrying the links' effects held at known values (a month later than any
  // the web writes, so it is the one the engines read).
  const places = new Set<string>();
  for (const person of world.core.people.values()) places.add(person.placeId);
  const residents = residentsRuntime(world.core);
  for (const h of residents?.store.liveHouseholds() ?? [])
    places.add(h.placeId);
  for (const placeId of places)
    coreAPI(world.core)
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .put({
        id: `web:${placeId}:2099-01`,
        placeId,
        month: "2099-01",
        date: "2099-01-03",
        values: {},
        bases: {},
        effects: {
          "rent-control-to-tenant-stays": rent,
          "crime-to-out-migration": crime,
        },
        engineSources: {},
      } as never);
  advanceCore(world.core, addDays(makeIsoDate(opening), 40));
  const api = coreAPI(world.core);
  const full = new Map(
    (
      api
        .moduleState(MOVES_MODULE_ID)
        .table("pulls")
        .rows() as unknown as FullPull[]
    ).map((row) => [row.id, row]),
  );
  const counted = (
    api
      .moduleState(COUNTED_MOVES_MODULE_ID)
      .table("pulls")
      .rows() as unknown as CountedPull[]
  ).reduce((n, row) => n + row.moversPerMonth, 0);
  return { full, counted };
}

const stage = (row: FullPull | undefined) => row?.causes.lifeStage ?? 0;

describe(`leaving takes the web's factors (${place.name}, seed ${seed})`, () => {
  it("slows renters under a rent rule and quickens families under a crime rise, in both tiers", () => {
    const none = play(0, 0);
    const rent = play(-0.2, 0);
    const crime = play(0, 0.1);

    // Full people: each pull is the unmoved pull times the factor, and the
    // factors differ across people (the spread).
    const compare = (moved: typeof rent) => {
      const factors: number[] = [];
      let close = 0;
      for (const [id, row] of moved.full) {
        const base = stage(none.full.get(id));
        if (base <= 0 || row.webFactor === undefined) continue;
        // A person who changed circumstances mid-run (a new job, a birth)
        // drifts a little; almost everyone sits at their factor.
        if (Math.abs(stage(row) / base - row.webFactor) < 0.03) close += 1;
        factors.push(row.webFactor);
      }
      expect(close, "pulls at their factor").toBeGreaterThanOrEqual(
        factors.length * 0.9,
      );
      return factors;
    };
    const rentFactors = compare(rent);
    expect(rentFactors.length).toBeGreaterThan(0);
    expect(Math.min(...rentFactors)).toBeLessThan(1);
    expect(Math.max(...rentFactors)).toBeLessThanOrEqual(1);
    const crimeFactors = compare(crime);
    expect(crimeFactors.length).toBeGreaterThan(0);
    expect(Math.max(...crimeFactors)).toBeGreaterThan(1);
    // With children weighs 1.51 against 0.97 before scaling, so more than one factor stands.
    expect(new Set(crimeFactors.map((f) => f.toFixed(6))).size).toBeGreaterThan(
      1,
    );

    // Counted households: movers per month fall under the rent rule (renters
    // only) and rise under the crime rise.
    expect(none.counted).toBeGreaterThan(0);
    expect(rent.counted).toBeLessThan(none.counted);
    expect(rent.counted).toBeGreaterThan(none.counted * 0.7);
    expect(crime.counted).toBeGreaterThan(none.counted);
    expect(crime.counted).toBeLessThan(none.counted * 1.2);
  }, 1_800_000);
});
