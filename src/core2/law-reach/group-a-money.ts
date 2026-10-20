/**
 * Law reach, group A: policies that move money through the budgets engine
 * and the cash journal.
 *
 * - Paid family leave: every paycheck of a town worker pays the program's
 *   premium to the government that runs it (state over city), through the
 *   journal on payday. Claims for leave wait on a birth or illness engine
 *   (SG-GOV-REACH-A-leave-claims).
 * - Dedicated parks funding: the parks line of the government that passed it
 *   rises by the dedicated share; a repeal takes the same amount back out.
 *   The housing line pays its rent assistance in the housing engine (housing-assistance.ts).
 */
import { paidLeaveProgram, paidLeavePremium } from "../paid-leave";
import type { CoreAPI, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import type { WorkPayrollJournalReceipt } from "../work-payroll-cash";
import type { PolicyHandler } from "./host";
import {
  amendBudget,
  BUDGETS_MODULE_ID,
  adoptedLine,
  budgetsOf,
  governments,
  type BudgetRow,
  type GovernmentRow,
} from "../modules/budgets";
import { lawChain } from "../modules/laws";
import {
  applyRecords,
  mechanicRow,
  onReachPayroll,
  PREMIUM_KIND,
  REACH_A_MODULE_ID,
  putMechanic,
  reachParameter,
  reachTable,
  yesLevels,
} from "./group-a-records";

export const LEAVE_KEY =
  "us-policy-positions:labor-workforce.paid-family-leave";
const PARKS_KEY =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";

const LEVEL_ORDER = ["federal", "state", "county", "township", "city"];

/** The government at the highest level that says yes (its treasury runs the program). */
function governmentFor(
  api: CoreAPI,
  levels: readonly { level: string }[],
): GovernmentRow | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const govs = governments(api);
  for (const level of LEVEL_ORDER)
    if (levels.some((l) => l.level === level)) {
      const gov = govs.find((g) => g.level === level);
      if (gov) return gov;
    }
  return null;
}

/** The government's budget in force today. */
export function budgetToday(
  api: CoreAPI,
  gov: GovernmentRow,
): BudgetRow | null {
  const date = api.state.date;
  return (
    budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= date)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ?? null
  );
}

/** A line's amount before any amendment this year: the line as adopted. */
export function baseLine(
  api: CoreAPI,
  gov: GovernmentRow,
  budget: BudgetRow,
  line: string,
): number {
  return adoptedLine(api, gov, budget.fiscalYear, line);
}

// --- paid family leave -------------------------------------------------------------

export const paidLeave: PolicyHandler = (api, change) => {
  applyRecords(api, LEAVE_KEY, change.lawId, change.inForce);
  const gov = change.inForce
    ? governmentFor(api, yesLevels(api, LEAVE_KEY))
    : null;
  putMechanic(api, {
    id: LEAVE_KEY,
    key: LEAVE_KEY,
    active: gov !== null,
    since: api.state.date,
    facts: {
      lawId: change.lawId,
      governmentId: gov?.id ?? "",
      treasuryId: gov?.organizationId ?? "",
      share: reachParameter("paidLeavePremiumShare"),
    },
  });
};

function leavePremium(
  api: CoreAPI,
  receipt: Readonly<WorkPayrollJournalReceipt>,
): void {
  const program = paidLeaveProgram(api);
  if (!program || receipt.paidMinor <= 0) return;
  const person = api.state.people.get(receipt.personId);
  if (!person || person.placeId !== lawChain(api).townPlaceId) return;
  // Capped by the cash the premium is taken from: what isn't set aside.
  const accounts = api.accounts();
  const premium = paidLeavePremium(
    receipt.paidMinor,
    Math.max(0, accounts.balance(accounts.main(person.id))),
    program.share,
  );
  if (premium <= 0) return;
  const treasury = program.treasuryId;
  const record = {
    id: `leave-premium:${receipt.id}`,
    date: api.state.date,
    personId: receipt.personId,
    payrollReceiptId: receipt.id,
    premiumMinor: premium,
    paidMinor: receipt.paidMinor,
    governmentId: program.governmentId,
    lawId: program.lawId,
    reason: `Paid family leave premium under ${program.lawId}`,
    postings: [
      {
        id: `${receipt.id}:leave:out`,
        accountId: `cash:${receipt.personId}:residual`,
        deltaMinor: -premium,
      },
      {
        id: `${receipt.id}:leave:in`,
        accountId: `cash:${treasury}:residual`,
        deltaMinor: premium,
      },
    ],
  };
  reachTable(api, "premiums").put(record as unknown as ModuleRow);
  const state = api.state as CoreState;
  api.postJournal({
    id: `journal:${api.state.date}:${state.cashJournal.nextSequence}`,
    date: api.state.date,
    expectedSequence: state.cashJournal.nextSequence,
    sourceRef: { kind: PREMIUM_KIND, id: record.id },
    postings: record.postings,
  });
}
onReachPayroll(leavePremium);

export interface LeavePremium {
  readonly id: string;
  readonly date: string;
  readonly personId: string;
  readonly premiumMinor: number;
  readonly paidMinor: number;
  readonly governmentId: string;
}

/** Every leave premium a person has paid. */
export function leavePremiumsOf(
  api: CoreAPI,
  personId: string,
): readonly LeavePremium[] {
  if (!api.state.modules.has(REACH_A_MODULE_ID)) return [];
  return reachTable(api, "premiums").query("byPerson", [
    personId,
  ]) as unknown as LeavePremium[];
}

// --- dedicated parks funding ----------------------------------------------------------

export const parksFunding: PolicyHandler = (api, change) => {
  applyRecords(api, PARKS_KEY, change.lawId, change.inForce);
  const yes = change.inForce ? yesLevels(api, PARKS_KEY) : [];
  const rows = reachTable(api, "mechanics").query("byKey", [
    PARKS_KEY,
  ]) as unknown as {
    id: string;
    active: boolean;
    facts: Record<string, string | number>;
  }[];
  // Take back what a level that no longer says yes added.
  for (const row of rows) {
    if (!row.active) continue;
    const still = yes.some((l) => `${PARKS_KEY}:${l.level}` === row.id);
    if (still) continue;
    amendBudget(api, {
      governmentId: String(row.facts.governmentId),
      line: "parks",
      deltaMinor: -Number(row.facts.deltaMinor),
      measureId: change.lawId,
    });
    putMechanic(api, {
      id: row.id,
      key: PARKS_KEY,
      active: false,
      since: api.state.date,
      facts: { ...row.facts, repealedBy: change.lawId },
    });
  }
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  for (const level of yes) {
    const id = `${PARKS_KEY}:${level.level}`;
    if (mechanicRow(api, id)?.active) continue;
    const gov = governments(api).find((g) => g.level === level.level);
    const budget = gov ? budgetToday(api, gov) : null;
    if (!gov || !budget) continue;
    const delta = Math.round(
      (budget.spendingMinor.parks ?? 0) * reachParameter("parksDedicatedShare"),
    );
    if (delta <= 0) continue;
    amendBudget(api, {
      governmentId: gov.id,
      line: "parks",
      deltaMinor: delta,
      measureId: level.lawId,
    });
    putMechanic(api, {
      id,
      key: PARKS_KEY,
      active: true,
      since: api.state.date,
      facts: { governmentId: gov.id, deltaMinor: delta, lawId: level.lawId },
    });
  }
};
