/**
 * The price engine reads the outcome web's environment outcomes. A deposit
 * charge nets out the containers returned, so the share returned is the web's
 * level of env.container-recycling-pct for the place (its base plus the
 * deposit link's added points); a carbon price is a price on the tons a
 * household emits, so the tons are the engine's own estimate times the web's
 * factor for env.emissions (the carbon-price and power-plant links). Full
 * households and the place's counted groups read the same record by the same
 * rule. Played in the bench world, in a place drawn from all 56 on a seed
 * nobody chose, with both laws in force, against a twin whose web month row
 * was not shifted; the shifted world's links take the researched size from
 * the link's own row (the deposit link's points up, or down in a state that
 * began with the deposit so the share stays a share).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { enactLaw, lawChain } from "./modules/laws";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.PRICES_ENV_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "prices-web-environment");

const P = "us-policy-positions:";
const BOTTLE = `${P}environment-energy.bottle-deposit`;
const CARBON = `${P}environment-energy.price-carbon`;
const RECYCLING = "env.container-recycling-pct";
const EMISSIONS = "env.emissions";
const RECYCLING_LINK = "container-deposit-to-recycling";
const EMISSION_LINKS = [
  "carbon-price-to-emissions",
  "power-plant-carbon-to-emissions",
] as const;
/** The most a returned share can be for the shifted level to stay a share. */
const MOST_RETURNED = 95;

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

function play(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(place.seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  const town = lawChain(api).townPlaceId;
  // Both prices are law in the town from the first day, at every level.
  for (const series of [BOTTLE, CARBON])
    for (const level of lawChain(api).levels)
      enactLaw(api, {
        jurisdiction: level.jurisdiction,
        level: level.level,
        series,
        value: 1,
        effectiveDate: world.core.date,
        measureId: `test:prices-web-environment:${series}`,
        citation: "Controlled law case in a generated opening.",
      });
  // The web opens its first month on the first day played.
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const latest = () => {
    const rows = months
      .rows()
      .map((row) => row as unknown as WebMonth)
      .filter((row) => row.placeId === town);
    const month = rows
      .map((row) => row.month)
      .sort()
      .at(-1)!;
    return rows.find((row) => row.month === month)!;
  };
  const opened = latest();
  const base = opened.bases[RECYCLING]!;
  const added =
    base + link(RECYCLING_LINK).size! <= MOST_RETURNED
      ? link(RECYCLING_LINK).size!
      : -link(RECYCLING_LINK).size!;
  const effects = {
    [RECYCLING_LINK]: added,
    ...Object.fromEntries(EMISSION_LINKS.map((key) => [key, link(key).size!])),
  };
  // The web rewrites its month row whenever a law takes effect, so the shift
  // is laid on the latest row again each day until the price engine has read it.
  const lay = () => {
    if (!shift) return;
    const row = latest();
    const merged = { ...row.effects, ...effects };
    months.put({
      ...row,
      effects: merged,
      values: {
        ...row.values,
        [RECYCLING]: row.bases[RECYCLING]! + added,
        [EMISSIONS]:
          row.bases[EMISSIONS]! *
          EMISSION_LINKS.reduce((n, key) => n * (1 + merged[key]!), 1),
      },
    } as never);
  };
  // The price engine settles on the 3rd of the next month, before the web writes that month's row.
  let read = opened;
  while (true) {
    lay();
    read = latest();
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
    if (world.core.date.slice(8, 10) === "03") break;
  }
  const rowsOf = (key: string, what: string) =>
    new Map(
      appliedOn(api, key)
        .filter((row) => row.what === what)
        .map((row) => [row.targetId, row] as const),
    );
  return {
    town,
    read,
    added,
    base,
    deposit: rowsOf(BOTTLE, "beverage-container-per-unit"),
    carbon: rowsOf(CARBON, "fuel-share"),
  };
}

/**
 * A row's amount is a sum of whole cents, one rounded payment per household it
 * covers (a counted group covers as many households as people, at most); each
 * payment is off by at most half a cent in the twin and, scaled, in the shift.
 */
const roundingOf = (row: { count: number; was: number }) =>
  Math.min(row.count + 0.5, 1.5 + row.was * 0.01);

/** Rows both worlds recorded for the same household, group or business, with what each paid. */
function pairs(
  base: Map<string, LawAppliedRow>,
  moved: Map<string, LawAppliedRow>,
  target: LawAppliedRow["target"],
) {
  return [...moved.values()]
    .filter((row) => row.target === target && base.has(row.targetId))
    .map((row) => ({
      id: row.id,
      count: row.count,
      was: base.get(row.targetId)!.amountMinor,
      now: row.amountMinor,
    }))
    .filter((row) => row.was > 0);
}

describe(`the price engine reads the web's environment outcomes (${place.name}, seed ${seed})`, () => {
  it("nets a deposit by the web's returned share and prices carbon on the web's emissions, for full and counted households", () => {
    const base = play(false);
    const moved = play(true);
    // The twin's web month moves neither outcome (the links' lags have not passed); the shifted month moves both.
    for (const key of [RECYCLING_LINK, ...EMISSION_LINKS])
      expect(base.read.effects[key] ?? 0, key).toBe(0);
    expect(moved.read.id).toBe(base.read.id);
    // Deposit: what a household pays is the share of its deposits not returned.
    const returnedWas = base.read.values[RECYCLING]! / 100;
    const returnedNow = moved.read.values[RECYCLING]! / 100;
    expect(returnedNow).toBeCloseTo((moved.base + moved.added) / 100, 12);
    const keptRatio = (1 - returnedNow) / (1 - returnedWas);
    expect(moved.added).not.toBe(0);
    const households = pairs(base.deposit, moved.deposit, "household");
    const groups = pairs(base.deposit, moved.deposit, "group");
    expect(households.length).toBeGreaterThan(0);
    expect(groups.length).toBeGreaterThan(0);
    for (const row of [...households, ...groups]) {
      expect(
        Math.abs(row.now - row.was * keptRatio),
        row.id,
      ).toBeLessThanOrEqual(roundingOf(row));
      expect(row.now < row.was, row.id).toBe(keptRatio < 1);
    }
    // Carbon: tons times the web's factor, which is the two links' effects together.
    const emissions = EMISSION_LINKS.reduce(
      (n, key) => n * (1 + link(key).size!),
      1,
    );
    const carbonHouseholds = pairs(base.carbon, moved.carbon, "household");
    const carbonGroups = pairs(base.carbon, moved.carbon, "group");
    const businesses = pairs(base.carbon, moved.carbon, "organization");
    expect(carbonHouseholds.length).toBeGreaterThan(0);
    expect(carbonGroups.length).toBeGreaterThan(0);
    for (const row of [...carbonHouseholds, ...carbonGroups, ...businesses]) {
      expect(
        Math.abs(row.now - row.was * emissions),
        row.id,
      ).toBeLessThanOrEqual(roundingOf(row));
      expect(row.now, row.id).toBeLessThan(row.was);
    }
    const first = (rows: ReturnType<typeof pairs>) => rows[0]!;
    console.log(
      `prices web environment: ${place.name}, seed ${seed}: price engine read ${moved.read.id}; returned share ${(returnedWas * 100).toFixed(1)}% -> ${(returnedNow * 100).toFixed(1)}%, deposit paid ${households.length} full households and ${groups.length} counted groups, e.g. ${first(households).id} ${first(households).was} -> ${first(households).now} and ${first(groups).id} (${first(groups).count} people) ${first(groups).was} -> ${first(groups).now}; emissions factor ${emissions.toFixed(5)}, carbon paid ${carbonHouseholds.length} full households, ${carbonGroups.length} counted groups and ${businesses.length} businesses, e.g. ${first(carbonHouseholds).id} ${first(carbonHouseholds).was} -> ${first(carbonHouseholds).now}`,
    );
  }, 3_600_000);
});
