/**
 * How far a town's schools budget lines stand above their Census base: the
 * cause the school engine's graduation reads through the outcome web
 * (school-spending-to-attainment). A change a mayor or council enacts to the
 * city's or county's schools line moves it (or the state's, where the state
 * runs the schools); until one does it is zero.
 */
import {
  BUDGETS_MODULE_ID,
  lineWithoutBills,
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
  // Written inside `read` below, so it lives on an object: TypeScript does not narrow a property to null at the return.
  const stands: { furthest: { budgetId: string; change: number } | null } = {
    furthest: null,
  };
  const read = (gov: ReturnType<typeof governments>[number]) => {
    const budget = [...budgetsOf(api, gov.id)]
      .filter((row) => row.startsOn <= core.date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
    if (!budget) return;
    const line = lineWithoutBills(api, gov, budget.fiscalYear, "schools");
    if (!line) return;
    const here = budget.spendingMinor["schools"] ?? 0;
    base += line;
    now += here;
    const change = Math.abs(here - line) / line;
    if (!stands.furthest || change > stands.furthest.change)
      stands.furthest = { budgetId: budget.id, change };
  };
  for (const gov of governments(api)) {
    if (gov.level !== "city" && gov.level !== "county") continue;
    // A government's budget belongs to its town; other places are not funded by it.
    if (core.organizations.get(gov.organizationId)?.placeId !== placeId)
      continue;
    read(gov);
  }
  // Where no city or county budget carries a schools line (a state that runs
  // its schools as one system), the town's schools are funded by the state's
  // line, and its change from its own base moves them the same way.
  if (!base)
    for (const gov of governments(api)) if (gov.level === "state") read(gov);
  return base
    ? {
        pct: ((now - base) / base) * 100,
        recordId: stands.furthest?.budgetId ?? null,
      }
    : null;
}
