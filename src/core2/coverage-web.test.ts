import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  COVERAGE_MODULE_ID,
  type CountedCoverageRow,
  type CoverageRow,
} from "./modules/coverage";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { residentsRuntime } from "./modules/residents";
import { webReach } from "./outcome-web-reach";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A recession costs men their employer plans more than women (Cawley, Moriya
// and Simon 2015): the coverage decision multiplies the uninsured part of its
// own rate by the web's factor for each worker, by sex and age
// (web-coverage-reads). Two worlds opened alike; in one, the day before the
// April review, the unemployment-to-uninsured effect on the web's month row is
// raised. The records the review writes are then compared by record id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINK = "unemployment-to-uninsured";
const MEASURE = "health.uninsured-pct";
/** A recession's worth: the effect on the uninsured rate rises by a fifth. */
const SHIFT = 0.2;
/** A share of one sex's plans means something only with a few plans behind it. */
const MIN_HOLDERS = 8;

type Sex = "male" | "female";

interface Holder {
  /** The coverage record that names this worker the policyholder. */
  readonly recordId: string;
  readonly sex: Sex;
  /** Real workers the record stands for: one for a full person, the household's weight for a counted one. */
  readonly weight: number;
}

/** Who holds an employer plan in their own name in this town, by coverage record id, full and counted alike. */
function holders(core: CoreState, placeId: string): Map<string, Holder> {
  const api = coreAPI(core);
  const out = new Map<string, Holder>();
  const rows = api
    .moduleState(COVERAGE_MODULE_ID)
    .table("coverage")
    .rows() as unknown as CoverageRow[];
  for (const row of rows) {
    if (row.to !== null || row.plan !== "employer") continue;
    if (row.holderId !== row.personId) continue;
    const person = core.people.get(row.personId);
    // The state's officials live at the state, outside this town's web.
    if (person?.placeId !== placeId) continue;
    const sex = person.looks?.gender;
    if (sex === "male" || sex === "female")
      out.set(row.personId, { recordId: row.id, sex, weight: 1 });
  }
  const rt = residentsRuntime(core);
  const counted = api
    .moduleState(COVERAGE_MODULE_ID)
    .table("countedCoverage")
    .rows() as unknown as CountedCoverageRow[];
  for (const row of counted) {
    if (row.to !== null || !rt) continue;
    const household = rt.store.liveHousehold(row.householdId);
    const m = rt.store.countedMember(row.holderId);
    if (!household || household.placeId !== placeId || m === undefined)
      continue;
    const sex = rt.store.strings[rt.store.genderIx[m]!];
    if (sex === "male" || sex === "female")
      out.set(row.holderId, {
        recordId: row.id,
        sex,
        weight: rt.store.weightOf(household),
      });
  }
  return out;
}

const weighted = (list: readonly Holder[], sex: Sex) =>
  list.filter((h) => h.sex === sex).reduce((n, h) => n + h.weight, 0);

interface Played {
  readonly placeId: string;
  /** Every coverage record open the day before the review, so two worlds can be shown alike until the shift. */
  readonly openRecords: readonly string[];
  /** The web month row the review of April stood on, and the link's effect on it before any shift. */
  readonly monthId: string | undefined;
  readonly effect: number | undefined;
  /** What the row holds after the review (a law taking effect recomputes the month). */
  readonly standing: number | undefined;
  readonly factors: Record<Sex, { factor: number; recordId: string | null }>;
  readonly holders: Map<string, Holder>;
}

/** One world opened in a drawn place and played to the April review; the shift, when there is one, is made the day before. */
function play(
  place: ReturnType<typeof drawPlace>,
  year: number,
  shift: number | undefined,
): Played {
  const { core, placeId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  // After March's web month row (the 3rd), the day before the April review (the 1st).
  advanceCore(core, makeIsoDate(`${year}-03-31`));
  const api = coreAPI(core);
  const openRecords = (
    [
      ...api.moduleState(COVERAGE_MODULE_ID).table("coverage").rows(),
      ...api.moduleState(COVERAGE_MODULE_ID).table("countedCoverage").rows(),
    ] as unknown as { id: string; to: string | null }[]
  )
    .filter((row) => row.to === null)
    .map((row) => row.id)
    .sort();
  const monthsOf = () =>
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as WebMonth[];
  const latest = [...monthsOf()].sort((a, b) =>
    b.month.localeCompare(a.month),
  )[0];
  const effect = latest?.effects[LINK];
  if (latest && effect !== undefined && shift !== undefined)
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .put({
        ...latest,
        effects: { ...latest.effects, [LINK]: effect + shift },
      } as unknown as Parameters<
        ReturnType<ReturnType<typeof api.moduleState>["table"]>["put"]
      >[0]);
  advanceCore(core, makeIsoDate(`${year}-04-01`));
  const reach = (sex: Sex) => {
    const r = webReach(api, placeId, MEASURE, { sex, age: 40 });
    return { factor: r.factor, recordId: r.recordId };
  };
  return {
    placeId,
    openRecords,
    monthId: latest?.id,
    effect,
    standing: monthsOf().find((row) => row.id === latest?.id)?.effects[LINK],
    factors: { male: reach("male"), female: reach("female") },
    holders: holders(core, placeId),
  };
}

it(`a rise in the unemployment link's effect ends a larger share of men's employer plans than women's, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  const year = Number(gameStartDate().slice(0, 4));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `coverage-web:${attempt}`);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    // Two worlds opened alike, one after the other (each is large).
    const control = play(place, year, undefined);
    if (control.monthId === undefined || control.effect === undefined) {
      tried.push(`${where}: no web month row for the link`);
      continue;
    }
    const treatment = play(place, year, SHIFT);
    // The two worlds were alike to the day before the shift.
    expect(
      treatment.openRecords,
      `${where}: coverage records open on ${year}-03-31`,
    ).toEqual(control.openRecords);
    // The row stood through the review (a law taking effect recomputes the
    // month, and then the shift is gone).
    if (treatment.standing !== control.effect + SHIFT) {
      tried.push(`${where}: the month row was recomputed under the shift`);
      continue;
    }
    const { male: menControl, female: womenControl } = control.factors;
    const { male: men, female: women } = treatment.factors;
    // The factor stands on the web month the shift was made on, for both.
    expect(men.recordId, `${where}: the web month it stands on`).toBe(
      control.monthId,
    );
    expect(women.recordId, where).toBe(control.monthId);
    // It lands harder on a man than on a woman, and on neither less than it did.
    expect(men.factor - menControl.factor, `${where}: men`).toBeGreaterThan(
      women.factor - womenControl.factor,
    );
    expect(
      women.factor - womenControl.factor,
      `${where}: women`,
    ).toBeGreaterThanOrEqual(0);

    const before = control.holders;
    const now = treatment.holders;
    const menBefore = weighted([...before.values()], "male");
    const womenBefore = weighted([...before.values()], "female");
    if (menBefore < MIN_HOLDERS || womenBefore < MIN_HOLDERS) {
      tried.push(
        `${where}: ${menBefore} men and ${womenBefore} women hold a plan in the control`,
      );
      continue;
    }
    // A plan that ends is a policyholder in the control who is not one in the
    // treatment; a plan that begins is the other way about (a household's
    // policy passes to the wife when her husband's ends, so a woman can gain one).
    const ended = [...before].filter(([id]) => !now.has(id)).map(([, h]) => h);
    const began = [...now].filter(([id]) => !before.has(id)).map(([, h]) => h);
    const lost = (sex: Sex) => weighted(ended, sex);
    const gained = (sex: Sex) => weighted(began, sex);
    if (lost("male") === 0) {
      tried.push(`${where}: no man's plan ended under the shift`);
      continue;
    }
    const menShare = (lost("male") - gained("male")) / menBefore;
    const womenShare = (lost("female") - gained("female")) / womenBefore;
    const records = (list: readonly Holder[], sex: Sex) =>
      list.filter((h) => h.sex === sex).map((h) => h.recordId);
    expect(
      menShare,
      `${where}: share of men's plans that ended ${menShare.toFixed(3)} (${lost("male")} ended, ${gained("male")} began, of ${menBefore}) against women's ${womenShare.toFixed(3)} (${lost("female")} ended, ${gained("female")} began, of ${womenBefore}); men's ended records ${records(ended, "male").slice(0, 4).join(", ")}`,
    ).toBeGreaterThan(womenShare);
    console.log(
      JSON.stringify({
        where,
        webMonth: control.monthId,
        effectBefore: control.effect,
        effectShifted: treatment.standing,
        factorAtForty: {
          men: [menControl.factor, men.factor],
          women: [womenControl.factor, women.factor],
        },
        menWithPlans: menBefore,
        womenWithPlans: womenBefore,
        menEnded: lost("male"),
        menBegan: gained("male"),
        womenEnded: lost("female"),
        womenBegan: gained("female"),
        menEndedRecords: records(ended, "male").slice(0, 4),
        womenEndedRecords: records(ended, "female").slice(0, 4),
        womenBeganRecords: records(began, "female").slice(0, 4),
        skipped: tried,
      }),
    );
    return;
  }
  throw new Error(`no drawn place was fit to compare (${tried.join("; ")})`);
}, 3_600_000);
