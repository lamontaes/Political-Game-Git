/**
 * Membership organizations live on their members' dues. A labor union
 * local's members are the place's employed at its state's union membership
 * rate (BLS, 2025; the nation's where BLS has no row), each paying a share of the place's median wage monthly from the
 * wider population's pooled cash, so the local can pay its own staff.
 */
import businessParameters from "./data/business/parameters.json" with { type: "json" };
import unionData from "./data/business/union-membership.json" with { type: "json" };
import { makeIsoDate } from "../simulation/dates";
import type { Parameter } from "./parameters";
import type { ResidentFlowInput } from "./residents";
import { stopgap } from "./stopgaps";
import type { CoreInput, Source } from "./types";

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

/** One dues flow per union local: its members' monthly dues from its place's pooled residents account. */
export function unionDuesFlows(input: {
  unions: readonly { id: string; placeId: string }[];
  /** Every open job, full and counted, with its employer's place. */
  jobs: readonly { placeId: string; wageDailyMinor: number }[];
  accounts: readonly { placeId: string; accountId: string }[];
  usps: string;
  /** First dues fall due the month after this date. */
  from: string;
}): ResidentFlowInput[] {
  if (!input.unions.length) return [];
  // The place's employed and their daily pay: full and counted jobs alike.
  const pay = new Map<string, number[]>();
  for (const job of input.jobs) {
    const list = pay.get(job.placeId) ?? [];
    list.push(job.wageDailyMinor);
    pay.set(job.placeId, list);
  }
  stopgap("SG-WORLD-business-union-members");
  const flows: ResidentFlowInput[] = [];
  for (const union of input.unions) {
    const account = input.accounts.find((row) => row.placeId === union.placeId);
    const list = [...(pay.get(union.placeId) ?? [])].sort((a, b) => a - b);
    if (!account || !list.length) continue;
    // The state's membership rate (BLS, 2025), else the nation's.
    const rate = UNION_RATES[input.usps]?.membersPct ?? UNION_NATION_PCT;
    const members = Math.round((list.length * rate) / 100);
    const medianMonthly =
      (list[Math.floor(list.length / 2)]! * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
    const amount = Math.round(
      members * medianMonthly * p("businessUnionDuesShare"),
    );
    if (amount <= 0) continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.from,
      citation: (unionData as { table: string }).table,
      estimatedFrom: `${members} members of ${list.length} employed in the place, each paying ${(p("businessUnionDuesShare") * 100).toFixed(1)}% of the median monthly wage.`,
    };
    const first = new Date(`${input.from}T00:00:00.000Z`);
    first.setUTCMonth(first.getUTCMonth() + 1, 1);
    flows.push({
      id: `dues:${union.id}`,
      kind: "purchase",
      financeKind: "household.union-dues",
      payerId: account.accountId,
      payeeId: union.id,
      residentsId: account.accountId,
      placeId: union.placeId,
      amountMinor: amount,
      firstAt: makeIsoDate(first.toISOString().slice(0, 10)),
      cadence: { kind: "months", every: 1, day: 1 },
      salesReceipt: false,
      marketAdjusted: false,
      source,
    });
  }
  return flows;
}

export function withMembershipDues(input: CoreInput): CoreInput {
  const residents = input.residents;
  if (!residents) return input;
  const placeOf = new Map(
    input.organizations.map((row) => [row.id, row.placeId]),
  );
  const jobs = [
    ...input.jobs,
    ...residents.households.flatMap((row) => row.jobs),
  ].flatMap((job) => {
    const placeId = placeOf.get(job.organizationId);
    return placeId && job.endsAt === undefined
      ? [{ placeId, wageDailyMinor: job.wageDailyMinor }]
      : [];
  });
  const flows = unionDuesFlows({
    unions: input.organizations.filter(
      (row) => (row as { classification?: string }).classification === UNION,
    ),
    jobs,
    accounts: residents.accounts,
    usps: input.placeMetadata?.housingState ?? "",
    from: input.startedAt,
  });
  if (!flows.length) return input;
  return {
    ...input,
    residents: { ...residents, flows: [...residents.flows, ...flows] },
  };
}

export const UNION_CLASSIFICATION = UNION;
