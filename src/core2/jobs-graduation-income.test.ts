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

function play(placeSeed: string, placeKey: string, shift: boolean) {
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  let day = makeIsoDate(core.date);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    // The web writes its month on the 3rd, and again when a law takes
    // effect; each day the twin raises the effect in any row without it.
    if (!shift) continue;
    const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    for (const row of months.rows() as unknown as WebMonth[])
      if (row.month === core.date.slice(0, 7) && row.effects[LINK] !== SHIFT)
        months.put({
          ...row,
          effects: { ...row.effects, [LINK]: SHIFT },
        } as never);
  }
  return core as CoreState;
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

it("a senior who graduates only where graduation was raised is hired at a diploma's pay there, and their household's income carries it", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "graduation-pay");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const base = play(place.seed, place.key, false);
    const raised = play(place.seed, place.key, true);
    const a = graduations(base);
    const b = graduations(raised);
    const flipped = [...b.values()]
      .filter((row) => row.passed && a.get(row.personId)?.passed === false)
      .map((row) => row.personId);
    const hiresA = hiresOf(base);
    const hiresB = hiresOf(raised);
    const pairs = flipped.flatMap((personId) => {
      const graduated = b.get(personId)!.date;
      return hiresB
        .filter((h) => h.personId === personId && h.date >= graduated)
        .flatMap((hb) => {
          const ha = hiresA.find(
            (h) => h.jobId === hb.jobId && h.date === hb.date,
          );
          return ha ? [{ personId, ha, hb }] : [];
        });
    });
    console.info(
      `graduation-pay ${where}: ${a.size} senior records, ${flipped.length} graduated only where raised, ${pairs.length} hired to the same job on the same day in both`,
    );
    if (!pairs.length) {
      tried.push(
        `${where}: ${flipped.length} graduated only where raised, none hired to one job in both`,
      );
      continue;
    }
    for (const { personId, ha, hb } of pairs) {
      // Same position, same day: the diploma alone moves the pay.
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
      `graduation-pay ${where}: ${personId} graduated per ${b.get(personId)!.id}, which in the base world reads not graduated; hired to ${hb.jobId} on ${hb.date} at ${hb.values.hourlyMinor} cents an hour against ${ha.values.hourlyMinor}; ${incomeB.basis}: ${incomeB.amount} against ${incomeA.amount}`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a senior graduate only where graduation was raised and be hired in both worlds: ${tried.join("; ")}`,
  );
}, 3_600_000);
