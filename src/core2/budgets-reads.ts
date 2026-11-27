/** The budgets engine's front door for reads: a government's row, an adopted budget, a reserve sweep and a firm's employer taxes. Each function answers one question; none returns a table. */
import {
  BUDGETS_MODULE_ID,
  type BudgetRow,
  type GovernmentRow,
} from "./modules/budgets";
import {
  EMPLOYER_TAXES_MODULE_ID,
  type EmployerTaxRecord,
  type ProfitTaxRecord,
} from "./modules/employer-taxes";
import type { CoreAPI, CoreState } from "./types";

function store(api: CoreAPI) {
  return api.moduleState(BUDGETS_MODULE_ID);
}

/** Whether this world keeps the budgets engine. */
export function budgetsKept(api: CoreAPI): boolean {
  return (api.state as CoreState).modules.has(BUDGETS_MODULE_ID);
}

/** One government's row by its id. */
export function governmentRowOf(
  api: CoreAPI,
  governmentId: string,
): GovernmentRow | undefined {
  if (!budgetsKept(api)) return undefined;
  return store(api).table("governments").get(governmentId) as unknown as
    GovernmentRow | undefined;
}

/** One adopted budget by its record id. */
export function budgetRowOf(
  api: CoreAPI,
  budgetId: string,
): BudgetRow | undefined {
  if (!budgetsKept(api)) return undefined;
  return store(api).table("budgets").get(budgetId) as unknown as
    BudgetRow | undefined;
}

/** Every budget the engine has adopted. */
export function allBudgetRows(api: CoreAPI): readonly BudgetRow[] {
  if (!budgetsKept(api)) return [];
  return store(api).table("budgets").rows() as unknown as BudgetRow[];
}

/** Whether a government's opening reserve has been swept into its funds. */
export function reserveSwept(api: CoreAPI, governmentId: string): boolean {
  if (!budgetsKept(api)) return false;
  return (
    store(api).table("reserveSweeps").rows() as unknown as {
      governmentId: string;
    }[]
  ).some((row) => row.governmentId === governmentId);
}

/** The payroll taxes an employer has paid, one record per payday. */
export function employerTaxRecordsOf(
  api: CoreAPI,
  organizationId: string,
): readonly EmployerTaxRecord[] {
  if (!(api.state as CoreState).modules.has(EMPLOYER_TAXES_MODULE_ID))
    return [];
  return api
    .moduleState(EMPLOYER_TAXES_MODULE_ID)
    .table("shares")
    .query("byEmployer", [organizationId]) as unknown as EmployerTaxRecord[];
}

/** The profit taxes a business has paid, one record per assessment. */
export function profitTaxRecordsOf(
  api: CoreAPI,
  organizationId: string,
): readonly ProfitTaxRecord[] {
  if (!(api.state as CoreState).modules.has(EMPLOYER_TAXES_MODULE_ID))
    return [];
  return api
    .moduleState(EMPLOYER_TAXES_MODULE_ID)
    .table("profits")
    .query("byBusiness", [organizationId]) as unknown as ProfitTaxRecord[];
}
