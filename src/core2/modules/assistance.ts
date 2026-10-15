/**
 * SNAP, the food assistance program. Every month a household in town whose
 * gross income is under the program's line gets the maximum allotment for its
 * size (the starting law's `snap-maximum` rows, by state and year) less 30
 * percent of its net income (after the earned income and standard
 * deductions), at least the minimum benefit for one- and two-person
 * households. The federal treasury owes it each month to the household's
 * account: a named household to the member who holds its cash, the town's
 * counted households together to the residents' account, each counted
 * household read by the same rule and counted in proportion to the share
 * that applies. A household applies by its own leaning toward filing for a
 * public benefit against the size of its benefit; the counted share is the
 * share of a uniformly leaning population that would. The assistance work
 * requirement, once law, takes the members it covers out of a household's
 * unit after its time limit (law-reach group B holds the clock). Benefits the
 * treasury pays in town count as the welfare line's spending in town.
 */
import parameters from "../data/assistance/parameters.json" with { type: "json" };
import { decisionLean } from "../trait-decisions";
import { registerLinePayments } from "../budgets-treasury";
import { assistanceTimeLimit } from "../law-reach/group-b";
import {
  forgetTownFacts,
  povertyLineDollars,
  reachParameter,
  townFacts,
  type HouseholdFacts,
  type ResidentFacts,
} from "../law-reach/group-b-people";
import { timeLimitedNow } from "../law-reach/group-b-money";
import { REACH_B_MODULE_ID } from "../law-reach/group-b-store";
import { registerModule } from "../state";
import { makeIsoDate } from "../kernel/dates";
import type { ModuleRow } from "../module-data";
import type {
  CoreAPI,
  CoreModule,
  CoreState,
  PersonState,
  Source,
} from "../types";
import { BUDGETS_MODULE_ID, governments, type GovernmentRow } from "./budgets";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import { residentsRuntime } from "./residents";

export const ASSISTANCE_MODULE_ID = "core2-assistance-v1";
const KIND = "assistance-month";
const LINE = "welfareAndMedicaid";
const MAXIMUM_SERIES = "snap-maximum";
const DECISION = "jobs-benefits.file-claim";

const PARAMETERS = (
  parameters as unknown as {
    parameters: Record<string, { value: number }>;
  }
).parameters;
const p = (key: string): number => {
  const row = PARAMETERS[key];
  if (!row) throw new Error(`Unknown assistance parameter: ${key}`);
  return row.value;
};

/** One recipient's standing benefit: a named household's payer, or the town's counted households together. */
export interface BenefitRow {
  readonly id: string;
  readonly recipientId: string;
  readonly obligationId: string;
  readonly governmentId: string;
  readonly amountMinor: number;
  /** Households paid: 1 for a named household, the counted total for the residents' account. */
  readonly households: number;
  readonly since: string;
  readonly lawId: string;
  readonly endedOn: string | null;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(ASSISTANCE_MODULE_ID).table(name);

/** The program's rows for a recipient, or all, current and ended. */
export function snapBenefits(api: CoreAPI): readonly BenefitRow[] {
  if (!api.state.modules.has(ASSISTANCE_MODULE_ID)) return [];
  return table(api, "benefits").rows() as unknown as BenefitRow[];
}

interface Terms {
  readonly lawId: string;
  readonly bySize: Readonly<Record<string, number>>;
  readonly additionalPerson: number;
  readonly source: Source;
}

/** The maximum allotments the law in force records for the town's state, in dollars a month. */
function termsOf(api: CoreAPI): Terms | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  const row = lawInForce(api, MAXIMUM_SERIES).governing;
  const t = row?.terms as
    | {
        byHouseholdSize?: Record<string, number>;
        additionalPerson?: number;
      }
    | undefined;
  if (!row || !t?.byHouseholdSize) return null;
  return {
    lawId: row.id,
    bySize: t.byHouseholdSize,
    additionalPerson: t.additionalPerson ?? 0,
    source: {
      tag: row.estimate ? "ESTIMATED" : "SOURCED",
      asOf: api.state.date,
      citation: `${row.id}: ${String(row.source)}`,
      ...(row.estimate ? { estimatedFrom: String(row.source) } : {}),
    },
  };
}

const maximumFor = (terms: Terms, size: number): number =>
  terms.bySize[String(Math.min(size, 8))]! +
  Math.max(0, size - 8) * terms.additionalPerson;

/**
 * A household's monthly benefit in dollars: zero over the gross line or when
 * the allotment is nothing. `size` is the unit (members the work requirement
 * has not stopped); the line and the income are the whole household's.
 */
export function benefitDollars(input: {
  readonly terms: Terms;
  readonly stateKey: string;
  readonly householdSize: number;
  readonly unitSize: number;
  /** Yearly pay, and yearly income that is not pay (retirement awards). */
  readonly earnedDollars: number;
  readonly unearnedDollars?: number;
}): number {
  const months = p("monthsPerYear");
  const unearned = input.unearnedDollars ?? 0;
  const annual = input.earnedDollars + unearned;
  if (
    annual >=
    reachParameter("assistanceIncomeShare") *
      povertyLineDollars(input.stateKey, input.householdSize)
  )
    return 0;
  const cents = p("centsPerDollar");
  const standard =
    (input.unitSize <= 3
      ? p("standardDeductionSmallMinor")
      : p("standardDeductionLargeMinor")) / cents;
  const net = Math.max(
    0,
    (input.earnedDollars / months) * (1 - p("earnedIncomeDeductionShare")) +
      unearned / months -
      standard,
  );
  const allotment =
    maximumFor(input.terms, input.unitSize) - p("benefitReductionShare") * net;
  if (allotment <= 0) return 0;
  const minimum = p("minimumBenefitMinor") / cents;
  return input.unitSize <= p("minimumBenefitMaxSize")
    ? Math.max(allotment, minimum)
    : allotment;
}

/** The share of a uniformly leaning population whose lean carries a benefit across the line. */
function applyingShare(need: number): number {
  const w = p("applyLeanWeight");
  return Math.max(
    0,
    Math.min(1, (need - p("applyNeedThreshold")) / (2 * w) + 0.5),
  );
}

/** The member who holds a named household's cash (an adult), who is paid and decides. */
function payerOf(api: CoreAPI, householdId: string): PersonState | undefined {
  const core = api.state as CoreState;
  const adult = reachParameter("adultAge");
  const date = api.state.date;
  return (core.households.get(householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id))
    .filter(
      (person): person is PersonState =>
        !!person?.alive &&
        Number(date.slice(0, 4)) - Number(person.birthDate.slice(0, 4)) >=
          adult,
    )
    .sort(
      (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
    )[0];
}

/** Yearly income that is not pay for a named household: its members' standing income contracts (retirement). */
export function unearnedDollars(core: CoreState, householdId: string): number {
  let minor = 0;
  for (const id of core.households.get(householdId)?.memberIds ?? [])
    for (const contractId of core.finance.incomeContractsByPerson.get(id) ??
      []) {
      const contract = core.finance.contracts.get(contractId);
      if (!contract || contract.endedAt || !contract.kind.startsWith("income."))
        continue;
      minor +=
        (contract.amountMinor * p("monthsPerYear")) / contract.periodMonths;
    }
  return minor / p("centsPerDollar");
}

/** Whether a member runs a business: the owner's draw is income the household's record does not carry. */
function ownsBusiness(api: CoreAPI, householdId: string): boolean {
  const core = api.state as CoreState;
  if (!core.modules.has("business")) return false;
  const owners = (cache.get(core) ??
    new Set(
      (
        api.moduleState("business").table("owners").rows() as unknown as {
          ownerId: string;
        }[]
      ).map((row) => row.ownerId),
    )) as Set<string>;
  cache.set(core, owners);
  return (core.households.get(householdId)?.memberIds ?? []).some((id) =>
    owners.has(id),
  );
}
const cache = new WeakMap<object, Set<string>>();

/** The residents the work requirement has stopped drawing, by id. */
function stoppedByWorkRequirement(
  api: CoreAPI,
  facts: ReturnType<typeof townFacts>,
  stateKey: string,
  governmentId: string,
): ReadonlySet<string> {
  const core = api.state as CoreState;
  if (!core.modules.has(REACH_B_MODULE_ID) || !core.modules.has(LAWS_MODULE_ID))
    return new Set();
  const limit = assistanceTimeLimit(api, facts, stateKey);
  return timeLimitedNow(api, governmentId, "snap", limit);
}

function review(api: CoreAPI): void {
  const core = api.state as CoreState;
  cache.delete(core);
  const fed = governments(api).find((g) => g.level === "federal");
  const terms = termsOf(api);
  const want = new Map<
    string,
    { amountMinor: number; households: number; named: boolean }
  >();
  if (fed && terms) {
    // stopgapId: SG-GOV-snap-simplified-eligibility
    api.stopgap("SG-GOV-snap-simplified-eligibility");
    forgetTownFacts(api);
    const chain = lawChain(api);
    const facts = townFacts(api, chain.townPlaceId);
    const stopped = stoppedByWorkRequirement(
      api,
      facts,
      chain.stateKey,
      fed.id,
    );
    const members = new Map<string, ResidentFacts[]>();
    for (const r of facts.residents)
      members.set(r.householdId, [...(members.get(r.householdId) ?? []), r]);
    const rt = residentsRuntime(core);
    const residentsOrg = rt?.input.accounts.find(
      (a) => a.placeId === chain.townPlaceId,
    )?.accountId;
    const cents = p("centsPerDollar");
    const standing = new Map<string, string>();
    for (const row of table(
      api,
      "benefits",
    ).rows() as unknown as BenefitRow[]) {
      const person = row.endedOn ? undefined : core.people.get(row.recipientId);
      if (person) standing.set(person.householdId, person.id);
    }
    let countedMinor = 0;
    let countedHouseholds = 0;
    for (const household of facts.households.values() as Iterable<HouseholdFacts>) {
      const unit = (members.get(household.id) ?? []).filter(
        (r) => !stopped.has(r.id),
      ).length;
      if (!unit) continue;
      // A named household's retirement awards are income that is not pay;
      // a counted household's figure already holds both and is read as pay.
      const unearned = household.named
        ? unearnedDollars(core, household.id)
        : 0;
      if (household.named && ownsBusiness(api, household.id)) continue;
      const dollars = benefitDollars({
        terms,
        stateKey: chain.stateKey,
        householdSize: household.size,
        unitSize: unit,
        earnedDollars: household.incomeDollars,
        unearnedDollars: unearned,
      });
      if (dollars <= 0) continue;
      const need = dollars / maximumFor(terms, unit);
      if (household.named) {
        // The member already paid stays the payer while they are in the household.
        const payer =
          core.people.get(standing.get(household.id) ?? "") ??
          payerOf(api, household.id);
        if (!payer?.alive) continue;
        const lean = decisionLean(core, payer, DECISION, "file", "skip");
        if (need + p("applyLeanWeight") * lean <= p("applyNeedThreshold"))
          continue;
        want.set(payer.id, {
          amountMinor: Math.round(dollars * cents),
          households: 1,
          named: true,
        });
      } else if (residentsOrg) {
        const share = applyingShare(need);
        countedMinor += dollars * cents * share;
        countedHouseholds += share;
      }
    }
    if (residentsOrg && countedMinor >= 1)
      want.set(residentsOrg, {
        amountMinor: Math.round(countedMinor),
        households: Math.round(countedHouseholds),
        named: false,
      });
  }
  const accounts = api.accounts();
  const rows = table(api, "benefits");
  const date = api.state.date;
  const source = terms?.source;
  const live = new Map<string, BenefitRow>();
  for (const row of rows.rows() as unknown as BenefitRow[])
    if (!row.endedOn) live.set(row.recipientId, row);
  for (const [recipientId, row] of live) {
    const next = want.get(recipientId);
    if (!next) {
      if (!accounts.obligation(row.obligationId)?.endedAt)
        accounts.endObligation(row.obligationId);
      rows.put({ ...row, endedOn: date } as unknown as ModuleRow);
      continue;
    }
    if (next.amountMinor !== row.amountMinor && source) {
      accounts.setObligationAmount(row.obligationId, next.amountMinor, source);
      rows.put({
        ...row,
        amountMinor: next.amountMinor,
        households: next.households,
      } as unknown as ModuleRow);
    }
  }
  if (!fed || !terms) return;
  const first = makeIsoDate(
    new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  for (const [recipientId, next] of want) {
    if (live.has(recipientId)) continue;
    const obligationId = `assistance:snap:${recipientId}:${date}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(fed.organizationId),
      to: accounts.main(recipientId),
      amountMinor: next.amountMinor,
      firstDueAt: first,
      cadence: { kind: "months", every: 1 },
      accruesArrears: false,
      reasonKey: "assistance:snap",
      source: terms.source,
    });
    rows.put({
      id: `snap:${recipientId}:${date}`,
      recipientId,
      obligationId,
      governmentId: fed.id,
      amountMinor: next.amountMinor,
      households: next.households,
      since: date,
      lawId: terms.lawId,
      endedOn: null,
    } satisfies BenefitRow as unknown as ModuleRow);
  }
}

function scheduleMonth(api: CoreAPI): void {
  const at = new Date(`${api.state.date}T00:00:00Z`);
  at.setUTCMonth(at.getUTCMonth() + 1, p("reviewDay"));
  api.moduleCalendar(ASSISTANCE_MODULE_ID).schedule({
    key: `month:${at.toISOString().slice(0, 7)}`,
    date: at.toISOString().slice(0, "YYYY-MM-DD".length),
    kind: KIND,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: "USDA Food and Nutrition Service, SNAP",
    },
    sourceRecordIds: ["assistance:state"],
  });
}

export const ASSISTANCE_MODULE: CoreModule = {
  id: ASSISTANCE_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: { state: {}, benefits: {} },
  },
  onDay(api) {
    if (table(api, "state").get("assistance:state")) return;
    table(api, "state").put({
      id: "assistance:state",
      openedAt: api.state.date,
    } as unknown as ModuleRow);
    review(api);
    scheduleMonth(api);
  },
  onCalendarWork(api, work) {
    if (work.kind !== KIND) return;
    review(api);
    scheduleMonth(api);
  },
};

/** Install the program in a world that has laws and budgets. */
export function openAssistance(core: CoreState): void {
  if (!core.modules.has(ASSISTANCE_MODULE_ID))
    registerModule(core, ASSISTANCE_MODULE);
}

/** SNAP the treasury pays in town counts as the federal welfare line's spending in town. */
registerLinePayments((api: CoreAPI, gov: GovernmentRow) => {
  const out: Record<string, number> = {};
  if (
    !api.state.modules.has(ASSISTANCE_MODULE_ID) ||
    !api.state.modules.has(BUDGETS_MODULE_ID)
  )
    return out;
  const accounts = api.accounts();
  let paid = 0;
  for (const row of snapBenefits(api)) {
    if (row.endedOn || row.governmentId !== gov.id) continue;
    if (accounts.obligation(row.obligationId)?.endedAt) continue;
    paid += row.amountMinor;
  }
  if (paid > 0) out[LINE] = paid;
  return out;
});
