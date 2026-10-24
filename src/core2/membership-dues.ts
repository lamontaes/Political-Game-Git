/**
 * Membership organizations live on their members' dues. A labor union
 * local's members are recorded on the jobs of the place's employed (the jobs
 * nearest the place's median pay first) until the state's union membership
 * rate (BLS, 2025; the nation's where BLS has no row) is met, each paying a
 * share of their own pay monthly from the wider population's pooled cash, so
 * the local can pay its own staff.
 */
import businessParameters from "./data/business/parameters.json" with { type: "json" };
import unionData from "./data/business/union-membership.json" with { type: "json" };
import { makeIsoDate } from "./kernel/dates";
import type { Parameter } from "./parameters";
import type { ResidentFlowInput } from "./residents";
import { stopgap } from "./stopgaps";
import type { FinanceContractInput } from "./finance-types";
import type { CoreInput, JobInput, Source } from "./types";

const UNION_RATES = (
  unionData as { states: Record<string, { membersPct: number }> }
).states;
const UNION_NATION_PCT = (unionData as { nationMembersPct: number })
  .nationMembersPct;
const P = businessParameters as unknown as Readonly<Record<string, Parameter>>;
const p = (key: string) => P[key]!.value;
const UNION = "membership:labor-union";
const DAYS_PER_YEAR = 365,
  MONTHS_PER_YEAR = 12;

export function withMembershipDues(input: CoreInput): CoreInput {
  const residents = input.residents;
  if (!residents) return input;
  const unions = input.organizations.filter(
    (row) => (row as { classification?: string }).classification === UNION,
  );
  if (!unions.length) return input;
  const placeOf = new Map(
    input.organizations.map((row) => [row.id, row.placeId]),
  );
  const open = (job: JobInput) =>
    job.endsAt === undefined && placeOf.has(job.organizationId);
  // The place's employed, full and counted jobs alike, by place.
  const byPlace = new Map<string, JobInput[]>();
  for (const job of [
    ...input.jobs,
    ...residents.households.flatMap((row) => row.jobs),
  ])
    if (open(job)) {
      const placeId = placeOf.get(job.organizationId)!;
      byPlace.set(placeId, [...(byPlace.get(placeId) ?? []), job]);
    }
  // SG-WORLD-business-union-members-rule: who holds a membership is chosen by
  // pay alone, the jobs nearest the place's median first, until the state's BLS
  // rate is met. The rate checks the count; it is not a roll on any worker.
  stopgap("SG-WORLD-business-union-members");
  stopgap("SG-WORLD-business-union-members-rule");
  const memberOf = new Map<string, string>();
  const flows: ResidentFlowInput[] = [];
  const contracts: FinanceContractInput[] = [];
  const fullHouseholdOf = new Map(
    input.people.map((person) => [person.id, person.householdId]),
  );
  const monthlyDues = (job: JobInput) =>
    (job.wageDailyMinor * DAYS_PER_YEAR * p("businessUnionDuesShare")) /
    MONTHS_PER_YEAR;
  const first = new Date(`${input.startedAt}T00:00:00.000Z`);
  first.setUTCMonth(first.getUTCMonth() + 1, 1);
  const firstDue = makeIsoDate(first.toISOString().slice(0, 10));
  for (const union of unions) {
    const account = residents.accounts.find(
      (row) => row.placeId === union.placeId,
    );
    const jobs = byPlace.get(union.placeId) ?? [];
    if (!account || !jobs.length) continue;
    // The state's membership rate (BLS, 2025), else the nation's.
    const rate =
      UNION_RATES[input.placeMetadata?.housingState ?? ""]?.membersPct ??
      UNION_NATION_PCT;
    const wages = jobs.map((job) => job.wageDailyMinor).sort((a, b) => a - b);
    const median = wages[Math.floor(wages.length / 2)]!;
    const members = [...jobs]
      .sort(
        (a, b) =>
          Math.abs(a.wageDailyMinor - median) -
            Math.abs(b.wageDailyMinor - median) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .slice(0, Math.round((jobs.length * rate) / 100));
    for (const job of members) memberOf.set(job.id, union.id);
    // Each member pays a share of their own pay, monthly. A full member
    // pays from their own cash through a standing bill; the counted members'
    // dues come from their place's pooled cash (their cash is pooled by place).
    const counted: JobInput[] = [];
    for (const job of members) {
      const householdId = fullHouseholdOf.get(job.personId);
      if (householdId === undefined || !input.finance) counted.push(job);
      else
        contracts.push({
          id: `dues:${union.id}:${job.personId}`,
          householdId,
          payerIds: [job.personId],
          payeeId: union.id,
          kind: "household-purchase",
          amountMinor: Math.round(monthlyDues(job)),
          dueAt: firstDue,
          periodMonths: 1,
          accruesArrears: false,
          source: {
            tag: "ESTIMATED",
            asOf: input.startedAt,
            citation: (unionData as { table: string }).table,
            estimatedFrom: `Member of ${union.id}, paying ${(p("businessUnionDuesShare") * 100).toFixed(1)}% of their own pay.`,
          },
        });
    }
    const amount = Math.round(
      counted.reduce((sum, job) => sum + monthlyDues(job), 0),
    );
    if (amount <= 0) continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation: (unionData as { table: string }).table,
      estimatedFrom: `${counted.length} counted members of ${jobs.length} employed in the place, each paying ${(p("businessUnionDuesShare") * 100).toFixed(1)}% of their own pay.`,
    };
    flows.push({
      id: `dues:${union.id}`,
      kind: "purchase",
      financeKind: "household.union-dues",
      payerId: account.accountId,
      payeeId: union.id,
      residentsId: account.accountId,
      placeId: union.placeId,
      amountMinor: amount,
      firstAt: firstDue,
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: false,
      marketAdjusted: false,
      source,
    });
  }
  const marked = (job: JobInput): JobInput =>
    memberOf.has(job.id)
      ? { ...job, unionLocalId: memberOf.get(job.id)! }
      : job;
  return {
    ...input,
    ...(input.finance
      ? {
          finance: {
            ...input.finance,
            contracts: [...input.finance.contracts, ...contracts],
          },
        }
      : {}),
    jobs: input.jobs.map(marked),
    residents: {
      ...residents,
      households: residents.households.map((row) => ({
        ...row,
        jobs: row.jobs.map(marked),
      })),
      flows: [...residents.flows, ...flows],
    },
  };
}
