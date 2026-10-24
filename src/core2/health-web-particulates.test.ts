/**
 * The four particulates links reach infants through the death engine. The web
 * keeps env.particulates as its modeled base times the four links' factors
 * (emission rules, power-plant carbon limits, a clean-electricity standard, a
 * carbon price); the next month the particles-to-infant-deaths link reads that
 * month's particulates as a share of where they started and moves
 * health.infant-mortality; the death engine multiplies an infant's hazard by
 * that outcome's factor (health-web.ts), for full and counted people alike.
 * Played in the bench world, in a place drawn from all 56 on a seed nobody
 * chose, against a twin whose web month row was not shifted. The shift is laid
 * on the particulates month as the web itself writes a row (each link's effect
 * and the outcome those effects multiply), many times the researched sizes so
 * a small town's records can show it. PARTICULATES_LINK shifts one link alone.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { deathWebFactor } from "./health-web";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { healthDeathWebOf } from "./modules/health";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { countedHouseholdsByPlace } from "./modules/residents";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { WEB_LINKS, WIRED_INTO } from "./outcome-web-model";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.PARTICULATES_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "particulates-chain");

const PARTICULATES = "env.particulates";
const INFANT_MORTALITY = "health.infant-mortality";
const INFANT_LINK = "particles-to-infant-deaths";
/** The four links into particulates and how far the shifted world moves each (a clean-up, so negative). */
const SHIFTS = {
  "emission-rules-to-particulates": -0.3,
  "power-plant-carbon-to-particulates": -0.15,
  "clean-electricity-to-particulates": -0.1,
  "carbon-price-to-particulates": -0.05,
} as const;
type Cause = keyof typeof SHIFTS;
const ALONE = process.env.PARTICULATES_LINK as Cause | undefined;
const shifted: Partial<Record<Cause, number>> = ALONE
  ? { [ALONE]: SHIFTS[ALONE] }
  : SHIFTS;
/** From the 4th, when the full people's monthly look has read the web, the counted flows run on the first of the next month. */
const COUNTED_FLOW_WITHIN_DAYS = 28;

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;

interface Counts {
  month: string;
  webDeathRecordId: string | null;
  expected: { deaths: number };
}

function play(shift: boolean) {
  const opening = gameStartDate();
  const world = buildBenchWorld(place.seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = () => coreAPI(world.core);
  const nextThird = () => {
    do advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
    while (world.core.date.slice(8, 10) !== "03");
  };
  // To the first 3rd after the opening: the web has written its second month.
  nextThird();
  const months = api().moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const rows = () => months.rows().map((r) => r as unknown as WebMonth);
  const latestMonth = () =>
    rows()
      .map((r) => r.month)
      .sort()
      .at(-1)!;
  const shiftedMonth = latestMonth();
  const into = (WIRED_INTO.get(PARTICULATES) ?? []).map((row) => row.key);
  expect(into.sort()).toEqual(Object.keys(SHIFTS).sort());
  // The web rewrites its month row whenever a law takes effect, so the shift is
  // laid on again each day until the next month's run has read it.
  const lay = () => {
    if (!shift) return;
    for (const old of rows().filter((r) => r.month === shiftedMonth)) {
      const effects = { ...old.effects, ...shifted };
      const product = into.reduce((n, key) => n * (1 + (effects[key] ?? 0)), 1);
      months.put({
        ...old,
        effects,
        values: {
          ...old.values,
          [PARTICULATES]: old.bases[PARTICULATES]! * product,
        },
      } as never);
    }
  };
  lay();
  // Each day to the next 3rd: that run reads the shifted month.
  do {
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
    if (world.core.date.slice(8, 10) !== "03") lay();
  } while (world.core.date.slice(8, 10) !== "03");
  const nextMonth = latestMonth();
  const was = rows().find(
    (r) => r.month === shiftedMonth && r.placeId === world.placeId,
  )!;
  const web = rows().find(
    (r) => r.month === nextMonth && r.placeId === world.placeId,
  )!;
  // The 4th: the full people's monthly look has read the new month.
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const ages = [0, 30, 60] as const;
  const factors = Object.fromEntries(
    ages.map((age) => [age, deathWebFactor(api(), world.placeId, age, 2)]),
  ) as Record<(typeof ages)[number], ReturnType<typeof deathWebFactor>>;
  const infants = [...world.core.people.values()]
    .filter(
      (person) =>
        person.alive &&
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(world.core.date)) <
          1,
    )
    .map((person) => ({
      id: person.id,
      factor: healthDeathWebOf(world.core, person.id),
    }));
  const ageToday = (birthDate: string) =>
    ageOnDate(makeIsoDate(birthDate), makeIsoDate(world.core.date));
  const countedInfants = (
    countedHouseholdsByPlace(world.core).get(world.placeId) ?? []
  )
    .flatMap((record) => record.people)
    .filter((person) => ageToday(person.birthDate) < 1).length;
  for (let day = 0; day < COUNTED_FLOW_WITHIN_DAYS; day += 1)
    advanceCore(world.core, addDays(makeIsoDate(world.core.date), 1));
  const counted = (
    api()
      .moduleState(RENEWAL_MODULE_ID)
      .table("counts")
      .rows() as unknown as Counts[]
  ).filter((row) => row.month > nextMonth);
  return { web, was, factors, infants, countedInfants, counted };
}

describe(`particulates reach infants through the death engine (${place.name}, seed ${seed})`, () => {
  it("the web chains the particulates the four links move into the infant outcome, and the death hazard of infants follows", () => {
    const base = play(false);
    const moved = play(true);
    const infant = link(INFANT_LINK);
    expect(infant.from).toBe(`${PARTICULATES}:pct-of-start`);
    expect(infant.to).toBe(INFANT_MORTALITY);
    expect(WIRED_INTO.get(INFANT_MORTALITY)?.map((row) => row.key)).toContain(
      INFANT_LINK,
    );
    // The links move the particulates the web keeps; the web's next month reads them as a share of where they started.
    const startedAt = (row: WebMonth) =>
      (row.values[PARTICULATES]! / row.bases[PARTICULATES]!) * 100;
    for (const [cause, effect] of Object.entries(shifted))
      expect(moved.was.effects[cause], cause).toBe(effect);
    expect(startedAt(moved.was)).toBeLessThan(startedAt(base.was));
    const expected = (row: WebMonth) => infant.size! * (startedAt(row) - 100);
    expect(moved.web.effects[INFANT_LINK]).toBeCloseTo(expected(moved.was), 12);
    expect(base.web.effects[INFANT_LINK] ?? 0).toBeCloseTo(
      expected(base.was),
      12,
    );
    expect(moved.web.effects[INFANT_LINK]!).toBeLessThan(
      base.web.effects[INFANT_LINK] ?? 0,
    );
    expect(moved.web.values[INFANT_MORTALITY]).toBeLessThan(
      base.web.values[INFANT_MORTALITY]!,
    );
    // The death engine reads that month's record for an infant, and for no one else.
    expect(moved.factors[0].recordId).toBe(moved.web.id);
    expect(moved.factors[0].factor).toBeLessThan(base.factors[0].factor);
    expect(moved.factors[0].factor / base.factors[0].factor).toBeCloseTo(
      (1 + moved.web.effects[INFANT_LINK]!) /
        (1 + (base.web.effects[INFANT_LINK] ?? 0)),
      9,
    );
    for (const age of [30, 60] as const)
      expect(moved.factors[age].factor, `age ${age}`).toBe(
        base.factors[age].factor,
      );
    // Full infants (where the town has any not already ill) carry the lower factor in their strain.
    const was = new Map(base.infants.map((row) => [row.id, row.factor]));
    const shared = moved.infants.filter((row) => was.has(row.id));
    const lower = shared.filter((row) => row.factor < was.get(row.id)!);
    for (const row of shared)
      expect(row.factor, row.id).toBeLessThanOrEqual(was.get(row.id)!);
    for (const row of lower)
      expect(row.factor / was.get(row.id)!, row.id).toBeCloseTo(
        moved.factors[0].factor / base.factors[0].factor,
        6,
      );
    // Counted infants: the month's expected deaths read that record and fall.
    const sum = (rows: Counts[]) =>
      rows.reduce((n, row) => n + row.expected.deaths, 0);
    expect(moved.counted.length).toBeGreaterThan(0);
    expect(moved.counted.some((row) => row.webDeathRecordId !== null)).toBe(
      true,
    );
    // Where the town has counted infants their owed deaths fall; where it has none, nothing counted moves.
    if (moved.countedInfants > 0)
      expect(sum(moved.counted)).toBeLessThan(sum(base.counted));
    else expect(sum(moved.counted)).toBe(sum(base.counted));
    expect(moved.countedInfants + moved.infants.length).toBe(
      base.countedInfants + base.infants.length,
    );
    console.log(
      `particulates chain: ${place.name}, seed ${seed}, ${Object.entries(
        shifted,
      )
        .map(([k, v]) => `${k} ${v}`)
        .join(
          ", ",
        )}: web ${moved.was.id} particulates ${startedAt(base.was).toFixed(2)} -> ${startedAt(moved.was).toFixed(2)} of start; ${moved.web.id} infant effect ${(base.web.effects[INFANT_LINK] ?? 0).toFixed(5)} -> ${moved.web.effects[INFANT_LINK]!.toFixed(5)}; infant hazard factor ${base.factors[0].factor.toFixed(5)} -> ${moved.factors[0].factor.toFixed(5)} (record ${moved.factors[0].recordId}); ${moved.countedInfants} counted infants; ${lower.length} of ${shared.length} full infants lower [${lower
        .slice(0, 3)
        .map(
          (r) =>
            `${r.id} ${was.get(r.id)!.toFixed(4)} -> ${r.factor.toFixed(4)}`,
        )
        .join(
          ", ",
        )}]; counted expected deaths ${sum(base.counted).toFixed(5)} -> ${sum(moved.counted).toFixed(5)}`,
    );
  }, 3_600_000);
});
