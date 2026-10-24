/**
 * A graduation change reaches later household incomes (pool item
 * world-schooling-to-pay). Two worlds from one seed and place, identical but
 * for the web's equalized-funding effect on graduation, raised in the web
 * month rows as the school-outcomes twins do. A senior who graduates only in
 * the raised world holds a high school diploma there and none in the other;
 * hired to the same position in both, they are paid the diploma's premium
 * where they graduated, and their household's income carries it. A place is
 * drawn from all 56 on a seed nobody chose (GRADUATION_PAY_SEED pins one);
 * a place where no such senior is hired within the year is drawn again.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { JOBS_MODULE_ID } from "./modules/jobs";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import {
  householdIncome,
  residentPerson,
  residentsRuntime,
} from "./modules/residents";
import { SCHOOL_MODULE_ID } from "./school-measures";
import { SCHOOL_MEASURE, type SchoolResultRow } from "./school-outcomes";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GRADUATION_PAY_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const LINK = "equalized-funding-to-graduation";
const SHIFT = 0.5;
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

interface Hire {
  readonly id: string;
  readonly jobId: string;
  readonly personId: string;
  readonly date: string;
  readonly kind: string;
  readonly values: { readonly hourlyMinor: number };
}

function build(placeSeed: string, placeKey: string): CoreState {
  return buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  }).core as CoreState;
}

/** One day of play; the raised twin lays the effect again on any of the month's rows without it. */
function step(core: CoreState, day: string, raise: boolean): void {
  advanceCore(core, makeIsoDate(day));
  // The web writes its month on the 3rd, and again when a law takes effect.
  if (!raise) return;
  const months = coreAPI(core)
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months");
  for (const row of months.rows() as unknown as WebMonth[])
    if (row.month === core.date.slice(0, 7) && row.effects[LINK] !== SHIFT)
      months.put({
        ...row,
        effects: { ...row.effects, [LINK]: SHIFT },
      } as never);
}

const graduations = (core: CoreState) =>
  new Map(
    (
      coreAPI(core)
        .moduleState(SCHOOL_MODULE_ID)
        .table("results")
        .rows() as unknown as SchoolResultRow[]
    )
      .filter((row) => row.measure === SCHOOL_MEASURE.graduation)
      .map((row) => [row.personId, row] as const),
  );

const hiresOf = (core: CoreState) =>
  (
    coreAPI(core)
      .moduleState(JOBS_MODULE_ID)
      .table("changes")
      .rows() as unknown as Hire[]
  ).filter((row) => row.kind === "hire");

/**
 * The pay of the household a person lives in: a full household's jobs as a
 * day's wages, a counted household's income for the year, as the poverty
 * read takes each.
 */
function incomeOf(
  core: CoreState,
  personId: string,
): { amount: number; basis: string } {
  const full = core.people.get(personId);
  if (full && !full.placeId.startsWith("counted:")) {
    const home = core.households.get(full.householdId);
    const amount = (home?.memberIds ?? []).reduce((n, id) => {
      const jobId = core.people.get(id)?.jobId;
      const job = jobId ? core.jobs.get(jobId) : undefined;
      return n + (job && job.endsAt === undefined ? job.wageDailyMinor : 0);
    }, 0);
    return { amount, basis: `full household ${full.householdId}, cents a day` };
  }
  const rt = residentsRuntime(core)!;
  const person = residentPerson(core, personId);
  const at = person ? rt.store.householdOf.get(person.householdId) : undefined;
  return {
    amount:
      at === undefined ? 0 : householdIncome(rt, rt.store.households[at]!),
    basis: `counted household ${person?.householdId}, cents a year`,
  };
}

/** Hires of seniors who graduated only where raised, to a job they also hold in the base world. */
function pairsOf(
  base: CoreState,
  raised: CoreState,
  flipped: ReadonlyMap<string, string>,
) {
  const hiresA = hiresOf(base);
  return hiresOf(raised).flatMap((hb) => {
    const graduated = flipped.get(hb.personId);
    if (!graduated || hb.date < graduated) return [];
    // The same position: its pay is set when it is posted, so the day each
    // world filled it does not matter.
    const ha = hiresA.find((h) => h.jobId === hb.jobId);
    return ha ? [{ personId: hb.personId, ha, hb }] : [];
  });
}

it("a senior who graduates only where graduation was raised is hired at a diploma's pay there, and their household's income carries it", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "graduation-pay");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    // The twins play side by side, a day at a time, so a place is left as
    // soon as it cannot show the change, and the run stops at the first hire.
    const base = build(place.seed, place.key);
    const raised = build(place.seed, place.key);
    let day = makeIsoDate(base.date);
    const end = addDays(day, 365);
    let flipped: Map<string, string> | undefined;
    let pairs: ReturnType<typeof pairsOf> = [];
    let records = 0;
    while (day < end && !pairs.length) {
      day = addDays(day, 1);
      step(base, day, false);
      step(raised, day, true);
      const a = graduations(base);
      if (!flipped) {
        if (!a.size) continue;
        // Graduation day: the seniors whose result the raised effect moved.
        const b = graduations(raised);
        records = a.size;
        flipped = new Map(
          [...b.values()]
            .filter(
              (row) => row.passed && a.get(row.personId)?.passed === false,
            )
            .map((row) => [row.personId, row.date] as const),
        );
        if (!flipped.size) break;
      }
      pairs = pairsOf(base, raised, flipped);
    }
    console.info(
      `graduation-pay ${where}: ${records} senior records, ${flipped?.size ?? 0} graduated only where raised, ${pairs.length} hired to the same job in both by ${day}`,
    );
    if (!pairs.length) {
      tried.push(
        `${where}: ${flipped?.size ?? 0} graduated only where raised, none hired to a job they also hold in the base world by ${day}`,
      );
      continue;
    }
    const b = graduations(raised);
    const a = graduations(base);
    for (const { personId, ha, hb } of pairs) {
      // The same position: the diploma alone moves the pay.
      expect(
        hb.values.hourlyMinor,
        `${where}: ${hb.jobId} for ${personId}`,
      ).toBeGreaterThan(ha.values.hourlyMinor);
    }
    const { personId, ha, hb } = pairs[0]!;
    const incomeA = incomeOf(base, personId);
    const incomeB = incomeOf(raised, personId);
    expect(
      incomeB.amount,
      `${where}: ${personId}'s ${incomeB.basis}`,
    ).toBeGreaterThan(incomeA.amount);
    console.info(
      `graduation-pay ${where}: ${personId} graduated per ${b.get(personId)!.id}, which in the base world reads ${a.get(personId)!.passed ? "graduated" : "not graduated"}; hired to ${hb.jobId} on ${hb.date} at ${hb.values.hourlyMinor} cents an hour against ${ha.values.hourlyMinor} (base world, ${ha.date}); ${incomeB.basis}: ${incomeB.amount} against ${incomeA.amount}`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a senior graduate only where graduation was raised and be hired in both worlds: ${tried.join("; ")}`,
  );
}, 3_600_000);
