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
 * - Housing spending: a housing line above its base pays rent help to as
 *   many of the town's lowest-cash renting households as the extra money
 *   covers at the average voucher (never more than the rent): a monthly
 *   payment from the government's treasury to the household's head, owed
 *   until a cut ends it for the households it no longer covers. Counted
 *   households wait (SG-GOV-REACH-A-rent-assistance).
 */
import { paidLeaveProgram, paidLeavePremium } from "../paid-leave";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import { HOUSING_MODULE_ID, townFigures } from "../modules/housing";
import { residentsRuntime } from "../modules/residents";
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
  ageOn,
  applyRecords,
  endRows,
  ensureReachA,
  mechanicRow,
  onReachPayroll,
  POLICIES,
  PREMIUM_KIND,
  REACH_A_MODULE_ID,
  putMechanic,
  reachParameter,
  reachTable,
  specOf,
  townPeople,
  writeRows,
  yesLevels,
} from "./group-a-records";

export const LEAVE_KEY =
  "us-policy-positions:labor-workforce.paid-family-leave";
const PARKS_KEY =
  "us-policy-positions:civil-family-community.dedicated-parks-funding";
const HOUSING_KEY = "budget-line:housing";

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

// --- housing spending --------------------------------------------------------------

export const housingAssistance: PolicyHandler = (api, change) => {
  ensureReachA(api);
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return;
  api.stopgap(POLICIES[HOUSING_KEY]!.stopgapId!);
  const gov = governments(api).find((g) => g.level === change.level);
  const budget = gov ? budgetToday(api, gov) : null;
  if (!gov || !budget) return;
  const extra =
    (budget.spendingMinor.housing ?? 0) - baseLine(api, gov, budget, "housing");
  const slots = Math.max(
    0,
    Math.floor(extra / reachParameter("housingAssistanceAnnualMinor")),
  );
  // Only renting households have a rent to help with; the ones with the least
  // cash per member come first.
  const adult = reachParameter("adultAge");
  const core = api.state as CoreState;
  const byHousehold = new Map<
    string,
    { cash: number; members: number; head: PersonState | null }
  >();
  for (const person of townPeople(api)) {
    const lease = core.finance.contracts.get(`lease:${person.householdId}`);
    if (!lease || lease.endedAt) continue;
    const row = byHousehold.get(person.householdId) ?? {
      cash: 0,
      members: 0,
      head: null,
    };
    row.cash += person.liquidMinor;
    row.members += 1;
    // The oldest adult takes the payment.
    if (
      ageOn(person.birthDate, api.state.date) >= adult &&
      (!row.head ||
        person.birthDate < row.head.birthDate ||
        (person.birthDate === row.head.birthDate && person.id < row.head.id))
    )
      row.head = person;
    byHousehold.set(person.householdId, row);
  }
  // The slots are shared across every renting household, named or counted,
  // in proportion: a counted renter is helped by the same rule as a full one.
  const town = lawChain(api).townPlaceId;
  const figures = api.state.modules.has(HOUSING_MODULE_ID)
    ? townFigures(api, town)
    : { renters: 0, rentMinor: 0 };
  const totalRenters = Math.max(figures.renters, byHousehold.size);
  const share = totalRenters > 0 ? Math.min(1, slots / totalRenters) : 0;
  const chosen = new Map(
    [...byHousehold]
      .filter(([, row]) => row.head !== null)
      .sort(
        ([a, x], [b, y]) =>
          x.cash / x.members - y.cash / y.members || a.localeCompare(b),
      )
      .slice(0, Math.floor(share * byHousehold.size)),
  );
  const countedRenters = totalRenters - byHousehold.size;
  const countedHelped = Math.floor(share * countedRenters);
  const date = api.state.date;
  const people = townPeople(api).filter(
    (p) => chosen.has(p.householdId) && ageOn(p.birthDate, date) >= adult,
  );
  const keep = new Set(people.map((p) => p.id));
  endRows(api, HOUSING_KEY, "assisted", keep);
  writeRows(
    api,
    HOUSING_KEY,
    change.lawId,
    specOf(HOUSING_KEY, "assisted"),
    people.map((p) => ({ id: p.id, personId: p.id, count: null })),
  );
  // The help is money: a monthly payment from the treasury to each head, no
  // more than the household's rent.
  const voucher = Math.floor(
    reachParameter("housingAssistanceAnnualMinor") /
      reachParameter("monthsPerYear"),
  );
  const want = new Map<string, number>();
  for (const [householdId, row] of chosen) {
    const rent = core.finance.contracts.get(`lease:${householdId}`)!;
    const amount = Math.min(voucher, rent.amountMinor);
    if (amount > 0 && row.head) want.set(row.head.id, amount);
  }
  // The counted renters' help is paid to their place's pooled residents
  // account, the voucher (at most the typical rent) for each household helped.
  const residentsOrg = residentsRuntime(core)?.input.accounts.find(
    (a) => a.placeId === town,
  )?.accountId;
  if (residentsOrg && countedHelped > 0)
    want.set(
      residentsOrg,
      countedHelped * Math.min(voucher, figures.rentMinor || voucher),
    );
  reconcileRentHelp(api, gov, want);
  putMechanic(api, {
    id: `${HOUSING_KEY}:${gov.id}`,
    key: HOUSING_KEY,
    active: chosen.size + countedHelped > 0,
    since: date,
    facts: {
      governmentId: gov.id,
      extraMinor: extra,
      households: chosen.size + countedHelped,
      lawId: change.lawId,
    },
  });
};

/**
 * Keep the rent-help obligations as the wanted ones: a payment whose head or
 * amount changed is ended, a new or changed one opens from tomorrow, a month
 * at a time. A treasury pays what it holds.
 */
function reconcileRentHelp(
  api: CoreAPI,
  gov: GovernmentRow,
  want: ReadonlyMap<string, number>,
): void {
  const accounts = api.accounts();
  const table = reachTable(api, "payments");
  const open = (
    table.query("byKey", [HOUSING_KEY, null]) as unknown as {
      id: string;
      key: string;
      recipientId: string;
      obligationId: string;
      amountMinor: number;
      governmentId: string;
    }[]
  ).filter((r) => r.governmentId === gov.id);
  const kept = new Set<string>();
  for (const row of open) {
    if (want.get(row.recipientId) === row.amountMinor) {
      kept.add(row.recipientId);
      continue;
    }
    if (!accounts.obligation(row.obligationId)?.endedAt)
      accounts.endObligation(row.obligationId);
    table.put({ ...row, endedOn: api.state.date } as unknown as ModuleRow);
  }
  const first = makeIsoDate(addDays(makeIsoDate(api.state.date), 1));
  for (const [recipientId, amountMinor] of want) {
    if (kept.has(recipientId)) continue;
    const base = `rent-help:${gov.id}:${recipientId}:${api.state.date}`;
    let obligationId = base;
    for (let n = 2; accounts.obligation(obligationId); n += 1)
      obligationId = `${base}#${n}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(gov.organizationId),
      to: accounts.main(recipientId),
      amountMinor,
      firstDueAt: first,
      cadence: { kind: "months", every: 1 },
      accruesArrears: false,
      reasonKey: "law-reach:rent-assistance",
      source: {
        tag: "ESTIMATED",
        citation: `Housing line as amended: rent help of at most ${amountMinor} a month, the average voucher (HUD, Picture of Subsidized Households 2023)`,
        asOf: api.state.date,
        estimatedFrom: "housingAssistanceAnnualMinor",
      },
    });
    table.put({
      id: obligationId,
      key: HOUSING_KEY,
      endedOn: null,
      governmentId: gov.id,
      recipientId,
      obligationId,
      amountMinor,
    } as unknown as ModuleRow);
  }
}
