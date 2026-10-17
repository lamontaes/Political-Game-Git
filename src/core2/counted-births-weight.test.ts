/**
 * One model, two tiers: counted births and deaths follow the real people a
 * household stands for. A drawn town opened twice from one seed, once as a
 * sample and once with every counted household standing for about three,
 * played half a year: the expected births and deaths per thousand real
 * people match, and the births actually booked add up to what was expected
 * to within one household's weight (no dice: the carry holds the rest).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;
const DAYS = 180;
const RATE_BAND = 0.2;
const MINIMUM_PEOPLE = 800;
const WEIGHT_DRIFT = 0.1;

interface CountRow {
  placeId: string;
  expected: { births: number; deaths: number };
  births: string[];
}

function play(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const store = residentsRuntime(core)!.store;
  const start = store.weightedPeople(town);
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  const renewal = api.moduleState("core2-renewal-v1");
  const rows = (renewal.table("counts").rows() as unknown as CountRow[]).filter(
    (row) => row.placeId === town,
  );
  const expected = { births: 0, deaths: 0 };
  let booked = 0;
  for (const row of rows) {
    expected.births += row.expected.births;
    expected.deaths += row.expected.deaths;
    for (const baby of row.births) {
      const born = renewal.table("births").get(`${baby}:birth`) as unknown as
        { householdId: string } | undefined;
      const at = store.householdOf.get(born?.householdId ?? "");
      booked += at === undefined ? 1 : store.weightOf(store.households[at]!);
    }
  }
  const heaviest = Math.max(
    1,
    ...[...store.liveHouseholds()]
      .filter((h) => h.placeId === town)
      .map((h) => store.weightOf(h)),
  );
  return { start, expected, booked, heaviest };
}

it("expects and books births and deaths for the real people a counted household stands for", () => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const draw = drawPlace(randomBytes(32).toString("hex"), "births-weight");
    const where = `place ${draw.key}, seed ${draw.seed}`;
    const base = play(draw.seed, draw.key);
    if (base.start < MINIMUM_PEOPLE || base.expected.births < 3) continue;
    const scaled = play(draw.seed, draw.key, SCALE);
    const per = (n: number, people: number) => (n / people) * 1000;
    for (const kind of ["births", "deaths"] as const) {
      const one = per(base.expected[kind], base.start);
      const many = per(scaled.expected[kind], scaled.start);
      expect(many, `${where}: expected ${kind} per 1000`).toBeGreaterThan(
        one * (1 - RATE_BAND),
      );
      expect(many, `${where}: expected ${kind} per 1000`).toBeLessThan(
        one * (1 + RATE_BAND),
      );
    }
    // Booked births stand for the expected ones, short or over by less than one
    // household plus the little that households' weights shift after a birth
    // (a regrouped household takes on the weight of the one it joins).
    expect(
      Math.abs(scaled.booked - scaled.expected.births),
      `${where}: booked ${scaled.booked} against expected ${scaled.expected.births}`,
    ).toBeLessThanOrEqual(
      scaled.heaviest + WEIGHT_DRIFT * scaled.expected.births,
    );
    return;
  }
  throw new Error("no drawn town with enough counted people in 6 places");
}, 1_800_000);
