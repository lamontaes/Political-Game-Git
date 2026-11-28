/**
 * The counted population's reads: the residents runtime a world keeps and the
 * small questions asked of it (a resident's facts, a counted household, its
 * job, group, staff and children, the households by place, what suppliers are
 * owed). They live here, away from the residents engine, and import nothing at
 * run time, so a reader takes them without loading the engine's ring.
 * modules/residents.ts re-exports each one and stays the one writer of the
 * runtime.
 */
import type { ResidentWageShortfall } from "./budgets-treasury";
import type { CountedHousehold } from "./counted-groups";
import type { ResidentsRuntime, ResidentFacts } from "./modules/residents";
import type { ResidentHouseholdRecord } from "./residents";
import type {
  CoreState,
  JobInput,
  PersonId,
  PersonInput,
  PlaceId,
} from "./types";

export const runtimes = new WeakMap<CoreState, ResidentsRuntime>();

export function residentsRuntime(
  core: CoreState,
): ResidentsRuntime | undefined {
  return runtimes.get(core);
}

/** Cash above the firm's buffer goes to its owners: part local, the rest outside. */
/** A firm's supplier bills accrued and not yet paid (net-30), and who they're owed to. */
export function supplierBillsOwedTo(
  core: CoreState,
  organizationId: string,
): { owedMinor: number; supplierId: string; flowId: string } | undefined {
  const costs = runtimes
    .get(core)
    ?.flows.get(`outside-costs:${organizationId}`);
  if (!costs || costs.endedAt || !core.finance.businesses.has(organizationId))
    return undefined;
  return {
    owedMinor: Math.floor(supplierBillsOwed(core, organizationId)),
    supplierId: costs.payeeId,
    flowId: costs.id,
  };
}

/** What a business owes its outside suppliers for costs accrued on its sales but not yet billed or paid (net-30 terms). */
export function supplierBillsOwed(
  core: CoreState,
  organizationId: string,
): number {
  const rt = runtimes.get(core),
    book = core.finance.businesses.get(organizationId);
  const costs = rt?.flows.get(`outside-costs:${organizationId}`);
  if (!book || !costs || costs.endedAt) return 0;
  const share =
    book.annualDemandMinor > 0
      ? book.annualOtherCostsMinor / book.annualDemandMinor
      : 0;
  const accrued =
    (costs.accruedCostMinor ?? 0) +
    (book.receivedMinor - (costs.receivedMinor ?? book.receivedMinor)) * share;
  return Math.max(
    0,
    accrued -
      (book.operatingPaidMinor -
        (costs.localPaidMinor ?? book.operatingPaidMinor)) -
      (costs.outsidePaidMinor ?? 0),
  );
}

/** A job held by someone in the wider population, while its employer still pays it. */
export function countedJob(
  core: CoreState,
  jobId: string,
): JobInput | undefined {
  const rt = runtimes.get(core);
  const job = rt?.jobs.get(jobId);
  if (!rt || !job) return undefined;
  const flow = rt.wageFlowByJob.get(jobId);
  return flow && !flow.endedAt ? job : undefined;
}

/** How many jobs at an employer are held by people in the wider population, while their wages are still paid (by the employer or the treasury that funds it). */
export function countedStaffOf(
  core: CoreState,
  organizationId: string,
): number {
  const rt = runtimes.get(core);
  if (!rt) return 0;
  let jobs = 0;
  for (const [jobId, job] of rt.jobs)
    if (job.organizationId === organizationId && countedJob(core, jobId))
      jobs += 1;
  return jobs;
}

/** The record of someone still in the wider population, built from their group's columns. */
export function residentPerson(
  core: CoreState,
  personId: PersonId,
): PersonInput | undefined {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  if (m === undefined) return undefined;
  const store = rt!.store;
  const id = store.ids[m]!;
  return store
    .peopleOf(store.households[store.household[m]!]!)
    .find((row) => row.id === id);
}

/** A counted person's place, birth date, job and traits read from the columns; undefined once they are filled in, dead or moved. */
export function residentFacts(
  core: CoreState,
  personId: PersonId,
): ResidentFacts | undefined {
  const store = runtimes.get(core)?.store;
  const m = store?.countedMember(personId);
  if (!store || m === undefined) return undefined;
  return store.factsOf(m);
}

/** The id of the counted group a counted person's household stands in today, if any. */
export function countedGroupIdOf(
  core: CoreState,
  personId: PersonId,
): string | undefined {
  const rt = runtimes.get(core);
  const household = countedHouseholdOf(core, personId);
  return household && household.group >= 0
    ? rt?.store.groups[household.group]?.id
    : undefined;
}

/** The counted household a person belongs to, if they are still counted. */
export function countedHouseholdOf(
  core: CoreState,
  personId: PersonId,
): CountedHousehold | undefined {
  const rt = runtimes.get(core);
  const m = rt?.store.countedMember(personId);
  return m === undefined
    ? undefined
    : rt!.store.households[rt!.store.household[m]!];
}

/** How many people under the voting age live in a counted person's household, for a reader that weighs what a run costs the family. */
export function countedChildrenOf(
  core: CoreState,
  personId: PersonId,
  adultAge: number,
): number {
  const rt = runtimes.get(core);
  const home = countedHouseholdOf(core, personId);
  if (!rt || !home) return 0;
  const year = Number(core.date.slice(0, 4));
  return rt.store
    .factsOfHousehold(home)
    .filter((row) => year - Number(row.birthDate.slice(0, 4)) < adultAge)
    .length;
}

export function residentWageShortfall(
  core: CoreState,
  id: string,
): ResidentWageShortfall | undefined {
  return runtimes.get(core)?.shortfalls.get(id);
}

/** The account that pays and receives for a place's counted residents (benefits, taxes). */
export function residentsAccountFor(
  core: CoreState,
  placeId: PlaceId,
): string | undefined {
  const row = runtimes
    .get(core)
    ?.input.accounts.find((account) => account.placeId === placeId);
  return row
    ? core.cashJournal.residualAccountByOwner.get(row.accountId)
    : undefined;
}

/** Counted households in each place, as recorded today. */
export function countedHouseholdsByPlace(
  core: CoreState,
): Map<PlaceId, ResidentHouseholdRecord[]> {
  const rt = runtimes.get(core);
  const byPlace = new Map<PlaceId, ResidentHouseholdRecord[]>();
  if (!rt) return byPlace;
  for (const row of rt.input.accounts) byPlace.set(row.placeId, []);
  // The live households in record order, as `rt.households` yields them.
  const store = rt.store;
  for (const h of store.households)
    if (!h.gone) byPlace.get(h.placeId)?.push(store.householdView(h));
  return byPlace;
}

/** What each counted household pays these schools now, by household: the school and the monthly amount of its record. */
export function countedTuitionPlans(
  core: CoreState,
  schoolIds: ReadonlySet<string>,
  financeKind: string,
): Map<string, { schoolId: string; monthlyMinor: number }> {
  const rt = runtimes.get(core);
  const out = new Map<string, { schoolId: string; monthlyMinor: number }>();
  if (!rt) return out;
  const prefix = "hh:";
  for (const flow of rt.flows.values()) {
    if (
      flow.endedAt ||
      flow.kind !== "purchase" ||
      flow.financeKind !== financeKind ||
      !schoolIds.has(flow.payeeId) ||
      !flow.amountByContract
    )
      continue;
    for (const [key, amount] of Object.entries(flow.amountByContract))
      if (key.startsWith(prefix) && amount > 0)
        out.set(key.slice(prefix.length), {
          schoolId: flow.payeeId,
          monthlyMinor: amount,
        });
  }
  return out;
}

/**
 * The counted residents' Social Security awards running now, for the law
 * reach: each pooled flow's payee, its amount, the retirees it pays and the
 * line level it was last rated at (`rerateCountedRetirement`).
 */
export function countedRetirementAwards(core: CoreState): {
  readonly flowId: string;
  readonly payeeId: string;
  readonly placeId: string;
  readonly amountMinor: number;
  readonly retirees: number;
  readonly level: number;
}[] {
  const rt = runtimes.get(core);
  if (!rt) return [];
  const out = [];
  for (const flow of rt.flows.values()) {
    if (flow.kind !== "retirement" || flow.endedAt) continue;
    out.push({
      flowId: flow.id,
      payeeId: flow.payeeId,
      placeId: flow.placeId,
      amountMinor: flow.amountMinor,
      retirees: Math.max(1, Object.keys(flow.amountByContract ?? {}).length),
      level: rt.retirementLevel.get(flow.id) ?? 1,
    });
  }
  return out;
}
