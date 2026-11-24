/**
 * The positions a contest's candidates can take: the policy questions the
 * government the seat belongs to may decide in this place.
 *
 * A seat's positions are not every question the game asks. A borough council
 * cannot decide a state's abortion law, a state legislature cannot decide a
 * town's zoning, and a governor takes up what the state decides. The office
 * record says which government the seat belongs to (city, county, township,
 * state or federal); the question data says which levels decide each
 * question; and for a town, township or county the state's own law says
 * which questions its places may act on. The same check the bodies file by
 * when they sit (`levelMayDecide`), so a position offered here is a bill that
 * body can draft.
 *
 * A town, township or county also decides its own budget, whatever its state
 * lets it decide in law, and local races run on it: its seats offer each line
 * of its government's latest budget as a position ("budget-line:<line>", more
 * or less spent on it), the same key the council's budget vote and a voter's
 * view read. A line nobody leans on (no recorded axis) is left out, as no
 * stance on it can form.
 *
 * A local seat runs only on what its place's records hold (the lead, Nov 12:
 * a council candidate in a town of a few hundred campaigning on civilian
 * oversight of the police): a question that is about a line of the local
 * budget (src/core2/data/campaigns/local-question-records.json) is offered only where
 * the government's latest budget spends on, or takes in, that line.
 */
import { questionAxis } from "./campaign-views";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { BUDGETS_MODULE_ID, budgetsOf, governments } from "./modules/budgets";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { levelMayDecide } from "./modules/world-legislating";
import { stanceReader } from "./campaign-stances";
import type { OfficeLevel } from "./offices-local";
import type { CoreAPI } from "./types";
import localRecords from "./data/campaigns/local-question-records.json" with { type: "json" };
import officeAreas from "./data/campaigns/office-areas.json" with { type: "json" };
import lineAreas from "./data/campaigns/budget-line-areas.json" with { type: "json" };

/** The question families a local budget line is about (budget-line-areas.json); a line not listed is set by every body that votes a budget. */
const LINE_AREAS = lineAreas.lines as Readonly<
  Record<string, readonly string[]>
>;

/** Row offices' own work: the policy areas and budget lines they can act on (office-areas.json). A kind not here runs on what its government may decide. */
const OFFICE_WORK = officeAreas.kinds as Readonly<
  Record<
    string,
    {
      readonly areas: readonly string[];
      readonly budgetLines: readonly string[];
    }
  >
>;

/** A question's policy family: the part of its key before the dot ("us-policy-positions:justice-public-safety.end-cash-bail" is "justice-public-safety"). */
function areaOf(question: string): string {
  const key = question.slice(question.indexOf(":") + 1);
  return key.slice(0, key.indexOf("."));
}

const NEEDS = localRecords.needs as Readonly<
  Record<string, { readonly spending?: string; readonly revenue?: string }>
>;

/** A local government's latest budget, the one its seats run on. */
function latestLocalBudget(api: CoreAPI, level: OfficeLevel) {
  if (level === "federal" || level === "state") return undefined;
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return undefined;
  // A township's board votes the town's own budget, as a city's council does.
  const own = level === "county" ? "county" : "city";
  const gov = governments(api).find((row) => row.level === own);
  return gov
    ? [...budgetsOf(api, gov.id)].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
    : undefined;
}

/** Whether a local place's records hold what a question is about: the budget line it names, spent on or taken in. */
function placeHolds(
  budget: ReturnType<typeof latestLocalBudget>,
  question: string,
): boolean {
  const need = NEEDS[question];
  if (!need) return true;
  if (!budget) return false;
  return (
    (!need.spending || (budget.spendingMinor[need.spending] ?? 0) > 0) &&
    (!need.revenue || (budget.revenueMinor[need.revenue] ?? 0) > 0)
  );
}

/** A local seat's own government's budget lines, largest first, as positions. */
function budgetPositions(api: CoreAPI, level: OfficeLevel): readonly string[] {
  const latest = latestLocalBudget(api, level);
  if (!latest) return [];
  return Object.entries(latest.spendingMinor)
    .filter(([, minor]) => minor > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([line]) => `budget-line:${line}`)
    .filter((position) => questionAxis(position) !== 0);
}

/** A stand's reason on a filing: the office's own work, or its government's decision (the question's level may decide it) or budget. Shown as the `platformWhy` row beside `platform`. */
export type StandReason = `office-work:${string}` | `body-decides:${string}`;

/**
 * The stands this contest's office can run on, each with why it is one: a row
 * office (office-areas.json) only the policy areas and budget lines of its
 * own work; any other seat (a body that votes the budget and makes the
 * ordinances, a chief executive) the questions its government may decide in
 * the order the platform questions are kept, then a local government's own
 * budget lines. Every question is checked against the same law the bodies
 * file by (`levelMayDecide`) and, for a local seat, the place's records.
 */
export function contestStands(
  api: CoreAPI,
  contest: { readonly officeId: string },
): readonly { readonly position: string; readonly reason: StandReason }[] {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as
    { level: OfficeLevel; kind: string } | undefined;
  if (!office) throw new Error(`No office record ${contest.officeId}`);
  const local =
    office.level === "federal" || office.level === "state"
      ? null
      : latestLocalBudget(api, office.level);
  const work = OFFICE_WORK[office.kind];
  // stopgapId: SG-GOV-office-areas-estimated (a row office's areas and lines are estimated from every state's county code)
  if (work) api.stopgap("SG-GOV-office-areas-estimated");
  const questions = PLATFORM_QUESTIONS.filter(
    (question) =>
      (!work || work.areas.includes(areaOf(question))) &&
      levelMayDecide(api, office.level, question) &&
      (local === null || placeHolds(local, question)),
  ).map((position) => ({
    position,
    reason: (work
      ? `office-work:${office.kind}`
      : `body-decides:${office.level}`) as StandReason,
  }));
  // The families of question this government's state law lets it decide.
  const mayAreas = new Set(
    PLATFORM_QUESTIONS.filter((question) =>
      levelMayDecide(api, office.level, question),
    ).map(areaOf),
  );
  const lines = budgetPositions(api, office.level)
    .filter((position) => {
      const line = position.slice("budget-line:".length);
      if (work) return work.budgetLines.includes(line);
      // A body that votes the budget sets a line only where its state's law
      // lets it decide something in the line's family.
      const areas = LINE_AREAS[line];
      return !areas || areas.some((area) => mayAreas.has(area));
    })
    .map((position) => ({
      position,
      reason: (work
        ? `office-work:${office.kind}`
        : `body-decides:${office.level}`) as StandReason,
    }));
  return [...questions, ...lines];
}

/** The questions this contest's office can run on (`contestStands`, without the reasons). */
export function contestPositions(
  api: CoreAPI,
  contest: { readonly officeId: string },
): readonly string[] {
  return contestStands(api, contest).map((stand) => stand.position);
}

/**
 * The reason each stand of a platform ("question=position") stands, in the
 * platform's order, as "question=<record>;<seat>": the record that gives the
 * candidate their reason (`StanceReader.ground`: a vote, their position as an
 * official, their own circumstances, faith or degree, or what reached them),
 * then why the seat can act on it (`StandReason`).
 */
export function standReasons(
  api: CoreAPI,
  contest: { readonly officeId: string },
  platform: readonly string[],
  personId: string,
  party: string | null | undefined,
): string[] {
  const stands = new Map(
    contestStands(api, contest).map((s) => [s.position, s.reason]),
  );
  const reader = stanceReader(api, personId, party);
  return platform.flatMap((entry) => {
    const question = entry.slice(0, entry.lastIndexOf("="));
    const seat = stands.get(question);
    const record = reader.ground(question);
    return seat && record ? [`${question}=${record};${seat}`] : [];
  });
}
