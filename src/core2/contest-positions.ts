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
import type { OfficeLevel } from "./offices-local";
import type { CoreAPI } from "./types";
import localRecords from "./data/campaigns/local-question-records.json" with { type: "json" };

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

/** The questions this contest's office belongs to a government that may decide, in the order the platform questions are kept, then a local government's own budget lines. */
export function contestPositions(
  api: CoreAPI,
  contest: { readonly officeId: string },
): readonly string[] {
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as { level: OfficeLevel } | undefined;
  if (!office) throw new Error(`No office record ${contest.officeId}`);
  const local =
    office.level === "federal" || office.level === "state"
      ? null
      : latestLocalBudget(api, office.level);
  return [
    ...PLATFORM_QUESTIONS.filter(
      (question) =>
        levelMayDecide(api, office.level, question) &&
        (local === null || placeHolds(local, question)),
    ),
    ...budgetPositions(api, office.level),
  ];
}
