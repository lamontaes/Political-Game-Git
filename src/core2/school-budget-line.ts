/**
 * How far a town's schools budget lines stand above their Census base: the
 * cause the school engine's graduation reads through the outcome web
 * (school-spending-to-attainment). A change a mayor or council enacts to the
 * city's or county's schools line moves it; until one does it is zero.
 */
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
} from "./modules/budgets";
import type { CoreAPI, CoreState } from "./types";

/**
 * The schools lines of the place's city and county budgets in force, together,
 * above their Census base for the same fiscal year, as a percent, and the
 * budget the change stands on (the one furthest from its base). Null where the
 * place has no budget with a schools line to measure from.
 */
export function schoolsLineAboveBase(
  api: CoreAPI,
  placeId: string,
): { pct: number; recordId: string | null } | null {
  const core = api.state as CoreState;
  if (!core.modules.has(BUDGETS_MODULE_ID)) return null;
  // stopgapId: SG-SCHOOL-spending-line-for-per-pupil (the schools line above its Census base stands for the change in per-pupil spending)
  api.stopgap("SG-SCHOOL-spending-line-for-per-pupil");
  let base = 0,
    now = 0;
  let furthest: { budgetId: string; change: number } | null = null;
  for (const gov of governments(api)) {
    if (gov.level !== "city" && gov.level !== "county") continue;
    // A government's budget belongs to its town; other places are not funded by it.
    if (core.organizations.get(gov.organizationId)?.placeId !== placeId)
      continue;
    const budget = [...budgetsOf(api, gov.id)]
      .filter((row) => row.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    if (!budget) continue;
    const line =
      baseBudget(api, gov, budget.fiscalYear).spendingMinor["schools"] ?? 0;
    if (!line) continue;
    const here = budget.spendingMinor["schools"] ?? 0;
    base += line;
    now += here;
    const change = Math.abs(here - line) / line;
    if (!furthest || change > furthest.change)
      furthest = { budgetId: budget.id, change };
  }
  return base
    ? { pct: ((now - base) / base) * 100, recordId: furthest?.budgetId ?? null }
    : null;
}
