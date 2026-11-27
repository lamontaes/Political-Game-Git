import {
  type SchoolMeasureRow,
  SCHOOL_MEASURE,
  SCHOOL_MODULE_ID,
} from "./people";
import type { CoreAPI, CoreState, PersonId } from "../types";
import { lawChain } from "./laws";
import { addDays, makeIsoDate } from "../kernel/dates";
import { type WireItem, isPolicyTopic } from "../press-topics";
import type { ModuleRow } from "../module-data";
import { JOBS_MODULE_ID } from "./jobs";
import briefs from "../data/press/briefs.json";
import { BUSINESS_MODULE_ID } from "./business";
import { VIEWS_MODULE_ID, stancesOf } from "./views";
import { type PrintedStory, usualSpace } from "../press-desk";
import { newsKey, storiesHeard } from "./news";
import { leanedScore } from "../trait-decisions";
import { CRIME_MODULE_ID } from "../laws-in-force";
import { outletsHere, pressParameter, table } from "./press-base";
import { deskContext } from "./press-desk-reads";
import { printedStoryOf } from "./press-stories";

/**
 * The story a school measure row is, if the paper may print it: the
 * graduation, or the spring tests, told once by their math row (reading is
 * said with it). One student's result is theirs, not the town's: a year with
 * a single senior or a single tested student is no story ("None of the 1
 * seniors in Reserve graduated" would name one teenager).
 */
export function schoolResultKind(
  row: SchoolMeasureRow,
): "graduation" | "tests" | null {
  if (row.students < 2) return null;
  return row.measure === SCHOOL_MEASURE.graduation
    ? "graduation"
    : row.measure === SCHOOL_MEASURE.math
      ? "tests"
      : null;
}

/** Fresh items on the wire, oldest first. */
/**
 * The school year's results reach the desk the week the school engine keeps
 * them (owner, Oct 29: side stories): how many of the town's seniors
 * graduated, and the spring tests' proficiency, one item each, worded from
 * the measure rows themselves (`graduation:<year>`, `tests:<year>`).
 */
export function schoolResults(api: CoreAPI): void {
  if (!api.state.modules.has(SCHOOL_MODULE_ID)) return;
  const town = lawChain(api).townPlaceId;
  const since = addDays(
    makeIsoDate(api.state.date),
    -api.parameter("daysPerWeek"),
  );
  for (const row of api
    .moduleState(SCHOOL_MODULE_ID)
    .table("measures")
    .query("byPlace", [town]) as unknown as readonly SchoolMeasureRow[]) {
    if (row.date < since || row.date > api.state.date) continue;
    const kind = schoolResultKind(row);
    if (!kind) continue;
    const id = `${kind}:${row.startYear}`;
    if (table(api, "wire").get(id)) continue;
    const item: WireItem = {
      id,
      kind: `school.${kind}`,
      date: row.date,
      level: "town",
      topic: `school:${town}`,
      desiredChange: `school.${kind}`,
      ending: false,
      subjectIds: [],
      facts: { measureId: row.id },
    };
    table(api, "wire").put(item as unknown as ModuleRow);
  }
}

/** A resident's round birthday, as the briefs column prints it. */
export const MILESTONE_BIRTHDAY = "person.milestone-birthday";

/** A business's round year since its founding, as the briefs column prints it. */
export const BUSINESS_ANNIVERSARY = "organization.anniversary";

/** A resident's retirement, as the briefs column prints it. */
export const RETIREMENT = "person.retired";

/** The jobs engine's reason for a worker who leaves work for good. */
const RETIRED = "retired";

/** A reader's letter to the editor, as the press prints it. */
export const LETTER = "press.letter";

/** The trait engine's decision to write to the paper or keep quiet. */
const LETTER_DECISION = "press.letter";

/** The anniversary of a date in a year, as a date ("02-29" falls on the 28th outside leap years). */
function anniversaryIn(year: number, date: string): string {
  const day = date.slice(5);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return `${year}-${day === "02-29" && !leap ? "02-28" : day}`;
}

/**
 * The week's milestones, for the briefs column (words-paper-and-journal-
 * everyday-life; owner, Nov 1: "real ones with some good fluff"): a
 * resident of the town who retired this week (the jobs engine's record of
 * their leaving), one who reached a round birthday this week, and a
 * business in town that reached a round year since it was founded, each
 * from its own record's date (the person's birth date; the business
 * engine's founding row or its age at the opening). The round ages and
 * years are data (data/press/briefs.json, milestones).
 */
export function milestones(api: CoreAPI): void {
  const c = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const since = addDays(
    makeIsoDate(api.state.date),
    -api.parameter("daysPerWeek"),
  );
  const thisWeek = (date: string) => {
    const year = Number(api.state.date.slice(0, 4));
    // The week can span New Year's Day: the anniversary falls in this year
    // or the last.
    return [year, year - 1]
      .map((y) => anniversaryIn(y, date))
      .find((day) => day > since && day <= api.state.date);
  };
  const put = (item: WireItem) => {
    if (!table(api, "wire").get(item.id))
      table(api, "wire").put(item as unknown as ModuleRow);
  };
  // A full resident only: a counted resident's birthday is printed once
  // they are filled in (the notice names them).
  // stopgapId: SG-WORDS-milestone-birthday-full-people
  const jobs = c.modules.has(JOBS_MODULE_ID)
    ? api.moduleState(JOBS_MODULE_ID)
    : undefined;
  for (const id of c.peopleByPlace.get(town) ?? []) {
    const person = c.people.get(id);
    if (!person?.alive) continue;
    // A resident who retired this week, from the jobs engine's own record of
    // their leaving (reason "retired"), and the years they held the job.
    for (const row of (jobs?.table("changes").query("byPerson", [id]) ??
      []) as unknown as {
      date: string;
      kind: string;
      reasonKey: string;
      organizationId: string;
      jobId: string;
    }[]) {
      if (row.kind !== "left-work" || row.reasonKey !== RETIRED) continue;
      if (row.date <= since || row.date > api.state.date) continue;
      const held = [...(c.work.commitmentsByPerson.get(id) ?? [])]
        .map((cid) => c.work.commitments.get(cid))
        .find((commitment) => commitment?.jobId === row.jobId);
      const from = held?.heldSince ?? held?.startsAt;
      put({
        id: `retirement:${id}:${row.date}`,
        kind: RETIREMENT,
        date: row.date,
        level: "town",
        topic: `person:${id}`,
        desiredChange: RETIREMENT,
        ending: false,
        subjectIds: [id],
        facts: {
          personId: id,
          organizationId: row.organizationId,
          jobId: row.jobId,
          ...(from ? { since: from } : {}),
        },
      });
    }
    const day = thisWeek(person.birthDate);
    if (!day) continue;
    const age = Number(day.slice(0, 4)) - Number(person.birthDate.slice(0, 4));
    if (!briefs.milestones.birthdayAges.includes(age)) continue;
    put({
      id: `birthday:${person.id}:${day}`,
      kind: MILESTONE_BIRTHDAY,
      date: day,
      level: "town",
      topic: `person:${person.id}`,
      desiredChange: MILESTONE_BIRTHDAY,
      ending: false,
      subjectIds: [person.id],
      facts: { personId: person.id, age: String(age) },
    });
  }
  if (!c.modules.has(BUSINESS_MODULE_ID)) return;
  const business = api.moduleState(BUSINESS_MODULE_ID);
  const founded = [
    ...(
      business.table("ages").rows() as unknown as {
        id: string;
        foundedAt: string;
      }[]
    ).map((row) => ({ id: row.id, date: row.foundedAt })),
    ...(
      business.table("foundings").rows() as unknown as {
        organizationId: string;
        date: string;
      }[]
    ).map((row) => ({ id: row.organizationId, date: row.date })),
  ];
  for (const row of founded) {
    const book = c.finance.businesses.get(row.id);
    if (!book || book.closedAt) continue;
    if (c.organizations.get(row.id)?.placeId !== town) continue;
    const day = thisWeek(row.date);
    if (!day) continue;
    const years = Number(day.slice(0, 4)) - Number(row.date.slice(0, 4));
    if (!briefs.milestones.businessYears.includes(years)) continue;
    put({
      id: `anniversary:${row.id}:${day}`,
      kind: BUSINESS_ANNIVERSARY,
      date: day,
      level: "town",
      topic: row.id,
      desiredChange: BUSINESS_ANNIVERSARY,
      ending: false,
      subjectIds: [],
      facts: { organizationId: row.id, years: String(years), since: row.date },
    });
  }
}

/**
 * The week's letters to the editor (words-paper-and-journal-everyday-life;
 * the CTO's ruling, OWNER-DECISIONS Nov 1 20:00). For each town newspaper,
 * the readers whose stance was last moved by one of its recent stories about
 * a bill or a law weigh writing to it: how strongly they feel past the
 * strength it takes to write (`letterStrength`), with their temperament at
 * its calibrated weight (the press.letter decision, Mondak and Halperin
 * 2008), never the stance alone. The paper prints the strongest case among
 * those who would write, one letter a week, and a writer whose letter ran
 * waits the span the paper's letters policy sets before another, and longer
 * before another on the same question. The letter
 * names the bill or law the story reported and whether the writer is for it.
 */
export function letters(api: CoreAPI): void {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return;
  const c = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const ctx = deskContext(api);
  const fresh = addDays(
    makeIsoDate(api.state.date),
    -pressParameter("storyFreshDays"),
  );
  const spaced = addDays(
    makeIsoDate(api.state.date),
    -pressParameter("letterWriterDays"),
  );
  const sameQuestion = addDays(
    makeIsoDate(api.state.date),
    -pressParameter("letterTopicDays"),
  );
  const bar = pressParameter("letterStrength");
  // A writer's letters are the printed stories they wrote (the desk prints a
  // letter under its writer's name): none lately, and none on this question
  // for longer, since the paper has printed their say on it.
  const wroteLately = (id: string, topic: string) =>
    (
      table(api, "stories").query("byReporter", [
        id,
      ]) as unknown as PrintedStory[]
    ).some(
      (story) =>
        story.kind === LETTER &&
        (story.date > spaced ||
          (story.topic === topic && story.date > sameQuestion)),
    );
  // A counted reader's view is not moved by what they read, so none of their
  // stances cites a story; their letters wait on that.
  // stopgapId: SG-WORDS-letters-counted-readers
  for (const outlet of outletsHere(api)) {
    // Letters to the editor are a newspaper's page.
    if (outlet.tier === "national" || outlet.kind !== "newspaper") continue;
    const from = newsKey(`printed:${outlet.id}:`);
    let best:
      | {
          personId: string;
          stance: ReturnType<typeof stancesOf>[number];
          storyId: string;
          printed: PrintedStory;
          about: Readonly<Record<string, string>>;
          score: number;
        }
      | undefined;
    for (const id of ctx.followers(outlet.id)) {
      const person = c.people.get(id as PersonId);
      if (!person?.alive || person.placeId !== town) continue;
      for (const stance of stancesOf(api, id as PersonId)) {
        const cause = stance.causes.at(-1);
        if (!cause?.learnedFrom?.startsWith(from) || cause.date < fresh)
          continue;
        // A letter is for or against a policy the reader holds a side on.
        if (
          !isPolicyTopic(stance.topic) ||
          stance.topic.startsWith("budget-line:") ||
          !["enact", "repeal"].includes(stance.desiredChange)
        )
          continue;
        const score = leanedScore(
          c,
          person,
          LETTER_DECISION,
          "write",
          "keep",
          stance.strength - bar,
        );
        if (
          score <= 0 ||
          (best &&
            (score < best.score ||
              (score === best.score && id.localeCompare(best.personId) >= 0)))
        )
          continue;
        if (wroteLately(id, stance.topic)) continue;
        // The bill or law the story reported, from the story as they read it.
        const storyId = cause.learnedFrom.slice("news:".length);
        const printed = printedStoryOf(api, storyId);
        const about = storiesHeard(api, id as PersonId, cause.date).find(
          (row) => row.id === storyId,
        )?.facts;
        if (!printed || !(about?.billId || (about?.lawId && about.series)))
          continue;
        best = { personId: id, stance, storyId, printed, about, score };
      }
    }
    if (!best) continue;
    const { printed, about } = best;
    const id = `letter:${best.personId}:${api.state.date}`;
    if (table(api, "wire").get(id)) continue;
    table(api, "wire").put({
      id,
      kind: LETTER,
      date: api.state.date,
      level: "town",
      topic: best.stance.topic,
      desiredChange: best.stance.desiredChange,
      ending: false,
      subjectIds: [best.personId],
      facts: {
        personId: best.personId,
        outletId: outlet.id,
        storyId: best.storyId,
        topic: best.stance.topic,
        desiredChange: best.stance.desiredChange,
        strength: String(best.stance.strength),
        // For the bill or law when the writer wants the change it makes (a
        // letter answering a letter carries the change the bill makes).
        lawChange: about.lawChange ?? printed.recordedChange,
        side:
          best.stance.desiredChange ===
          (about.lawChange ?? printed.recordedChange)
            ? "for"
            : "against",
        ...(about.billId ? { billId: about.billId } : {}),
        ...(!about.billId && about.lawId
          ? {
              lawId: about.lawId,
              series: about.series ?? "",
              ...(about.level ? { level: about.level } : {}),
              ...(about.change ? { change: about.change } : {}),
            }
          : {}),
      },
    } as unknown as ModuleRow);
  }
}

/**
 * The police log of the month that just closed reaches the desk in the next
 * month's first week (owner, Oct 29: side stories, "fourth car stolen"): the
 * crimes the town's residents reported to police, worded from the crime
 * engine's own month record (`police-log:<month>`). A month with none
 * reported puts nothing on the wire.
 */
export function policeLog(api: CoreAPI): void {
  if (!api.state.modules.has(CRIME_MODULE_ID)) return;
  if (Number(api.state.date.slice(8, 10)) > api.parameter("daysPerWeek"))
    return;
  const town = lawChain(api).townPlaceId;
  const month = addDays(
    makeIsoDate(`${api.state.date.slice(0, 8)}01`),
    -1,
  ).slice(0, 7);
  const id = `police-log:${month}`;
  if (table(api, "wire").get(id)) return;
  const row = api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .get(`${town}:${month}`) as unknown as
    | { readonly types?: Record<string, { readonly reported?: number }> }
    | undefined;
  const reported = Object.values(row?.types ?? {}).reduce(
    (sum, type) => sum + (type.reported ?? 0),
    0,
  );
  if (!(reported > 0)) return;
  const item: WireItem = {
    id,
    kind: "crime.month",
    date: api.state.date,
    level: "town",
    topic: `crime:${town}`,
    desiredChange: "crime.month",
    ending: false,
    subjectIds: [],
    facts: {
      monthId: `${town}:${month}`,
      // How far the month stands from the town's own usual: the desk's
      // space for the log slides with it, down to nothing (Words lead,
      // Nov 14). A town with no earlier months has no usual to compare.
      ...policeLogComparison(api, town, month, reported),
    },
  };
  table(api, "wire").put(item as unknown as ModuleRow);
}

/**
 * How a town's police log for `month` stands against the town's usual: the
 * facts the wire item carries (vsUsual, usual, spread, rising, the months of
 * record, the chance and busier), read from the crime engine's month rows.
 * The desk's space and the words read these from the wire; dev mode's trace
 * reads the same function, so it shows what the paper read. A town with no
 * earlier months has no usual to compare.
 */
export function policeLogComparison(
  api: CoreAPI,
  town: string,
  month: string,
  reported: number,
): Record<string, string> {
  const usual = usualMonth(api, town, month);
  return usual
    ? {
        vsUsual: String(Math.round((reported / usual.total) * 1000) / 1000),
        // The words may compare the month with the town's usual only
        // once the usual rests on enough closed months (two months are
        // not a usual month), and only by how far the month stands off
        // the usual against the town's own spread of months.
        ...(usual.months >= pressParameter("briefUsualMinMonths")
          ? {
              usual: String(Math.round(usual.total * 10) / 10),
              spread: String(Math.round(usual.spread * 10) / 10),
              ...(usual.rising ? { rising: usual.rising } : {}),
            }
          : {}),
        // How many closed months the usual rests on, and how often a
        // month this busy comes by chance at that usual: a town with a
        // short record or a small usual is not called busy on chance.
        monthsOfRecord: String(usual.months),
        chance: String(
          Math.round(chanceOfMonthAtLeast(reported, usual.total) * 10000) /
            10000,
        ),
        ...(monthIsWellOver(usual.months, reported, usual.total)
          ? { busier: "yes" }
          : {}),
      }
    : {};
}

/** The town's closed crime months before `month` that its usual rests on, newest first. */
function usualMonthRows(
  api: CoreAPI,
  town: string,
  month: string,
): readonly { readonly id: string; readonly month: string }[] {
  return (
    api
      .moduleState(CRIME_MODULE_ID)
      .table("months")
      .query("byPlace", [town]) as unknown as {
      readonly id: string;
      readonly month: string;
    }[]
  )
    .filter((row) => row.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, pressParameter("usualMonths"));
}

/**
 * Why a town's police log for a crime month stood where it did on the page,
 * for dev mode's trace (owner, Nov 16: what a thread traces by script, dev
 * mode traces in the game): the month's reported count, the comparison the
 * wire carried (`policeLogComparison`), the closed months the usual rests
 * on, and the share of a brief's space the desk gave it (`usualSpace`).
 * Read from the crime engine's month rows; nothing is kept.
 */
export function policeLogWhy(
  api: CoreAPI,
  monthRowId: string,
):
  | {
      readonly reported: number;
      readonly comparison: Readonly<Record<string, string>>;
      readonly usualMonthIds: readonly string[];
      readonly space: number;
    }
  | undefined {
  const row = api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .get(monthRowId) as unknown as
    | {
        readonly placeId: string;
        readonly month: string;
        readonly types?: Record<string, { readonly reported?: number }>;
      }
    | undefined;
  if (!row) return undefined;
  const reported = Object.values(row.types ?? {}).reduce(
    (sum, type) => sum + (type.reported ?? 0),
    0,
  );
  const comparison = policeLogComparison(api, row.placeId, row.month, reported);
  return {
    reported,
    comparison,
    usualMonthIds: usualMonthRows(api, row.placeId, row.month).map(
      (month) => month.id,
    ),
    space: usualSpace({ facts: comparison }, pressParameter),
  };
}

/**
 * What the town's police log usually holds: the mean of what was reported in
 * its last twelve closed months before this one (at least two), and the
 * crime type whose count most passed its own usual this month. Read from the
 * crime engine's month rows; nothing is kept here.
 */
function usualMonth(
  api: CoreAPI,
  town: string,
  month: string,
):
  | { total: number; months: number; spread: number; rising?: string }
  | undefined {
  type Month = {
    readonly month: string;
    readonly types?: Record<string, { readonly reported?: number }>;
  };
  const rows = usualMonthRows(api, town, month) as readonly Month[];
  if (rows.length < 2) return undefined;
  const mean = (read: (row: Month) => number) =>
    rows.reduce((sum, row) => sum + read(row), 0) / rows.length;
  const total = mean((row) =>
    Object.values(row.types ?? {}).reduce(
      (sum, type) => sum + (type.reported ?? 0),
      0,
    ),
  );
  if (!(total > 0)) return undefined;
  // How far the town's own closed months stand off their mean: what is
  // unusual for this town is read from its own months, never picked.
  const monthTotals = rows.map((row) =>
    Object.values(row.types ?? {}).reduce(
      (sum, type) => sum + (type.reported ?? 0),
      0,
    ),
  );
  const spread = Math.sqrt(
    monthTotals.reduce((sum, n) => sum + (n - total) ** 2, 0) /
      Math.max(1, monthTotals.length - 1),
  );
  const now = api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .get(`${town}:${month}`) as unknown as Month | undefined;
  let rising: string | undefined;
  let most = 0;
  for (const [type, tally] of Object.entries(now?.types ?? {})) {
    const over =
      (tally.reported ?? 0) - mean((row) => row.types?.[type]?.reported ?? 0);
    // A kind is said to have jumped only when it is itself clearly over its
    // own usual: two or more reports over, and the share where a brief has
    // all its space (the month's total could be over on noise alone).
    const own = mean((row) => row.types?.[type]?.reported ?? 0);
    if (
      over > most &&
      over >= 2 &&
      (tally.reported ?? 0) >= pressParameter("briefUsualCeiling") * own
    ) {
      most = over;
      rising = type;
    }
  }
  return { total, months: rows.length, spread, ...(rising ? { rising } : {}) };
}

/** True when the usual rests on enough months and chance rarely gives a month this busy. */
export function monthIsWellOver(
  months: number,
  count: number,
  usual: number,
): boolean {
  return (
    months >= pressParameter("briefUsualMinMonths") &&
    chanceOfMonthAtLeast(count, usual) < pressParameter("briefChanceBar")
  );
}

/**
 * How often a month at least this busy comes by chance in a town whose usual
 * month is `usual`: the chance of `count` or more reports when reports arrive
 * independently at the usual rate (the upper tail of a count with that mean).
 * A measure of the record against its own history, never a roll for what
 * anyone does.
 */
export function chanceOfMonthAtLeast(count: number, usual: number): number {
  let term = Math.exp(-usual);
  let below = 0;
  for (let k = 0; k < count; k += 1) {
    below += term;
    term *= usual / (k + 1);
  }
  return Math.max(0, 1 - below);
}
