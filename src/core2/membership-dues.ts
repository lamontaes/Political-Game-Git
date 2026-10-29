/**
 * Membership organizations live on their members' dues. A labor union
 * local's members are the place's employed at its state's union membership
 * rate (BLS, 2025; the nation's where BLS has no row), each paying a share of the place's median wage monthly from the
 * wider population's pooled cash, so the local can pay its own staff.
 */
import businessParameters from "./data/business/parameters.json" with { type: "json" };
import unionData from "./data/business/union-membership.json" with { type: "json" };
import { makeIsoDate } from "./kernel/dates";
import type { Parameter } from "./parameters";
import type { ResidentFlowInput } from "./residents";
import { stopgap } from "./stopgaps";
import type { CoreInput, Source } from "./types";
import { worldUnionRatePct } from "./union-rate";

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
  // The place's employed and their daily pay: full and counted jobs alike.
  const pay = new Map<string, number[]>();
  const placeOf = new Map(
    input.organizations.map((row) => [row.id, row.placeId]),
  );
  for (const job of [
    ...input.jobs,
    ...residents.households.flatMap((row) => row.jobs),
  ]) {
    const placeId = placeOf.get(job.organizationId);
    if (!placeId || job.endsAt !== undefined) continue;
    const list = pay.get(placeId) ?? [];
    list.push(job.wageDailyMinor);
    pay.set(placeId, list);
  }
  stopgap("SG-WORLD-business-union-members");
  const flows: ResidentFlowInput[] = [];
  for (const union of unions) {
    const account = residents.accounts.find(
      (row) => row.placeId === union.placeId,
    );
    const list = [...(pay.get(union.placeId) ?? [])].sort((a, b) => a - b);
    if (!account || !list.length) continue;
    // This world's membership rate, drawn around the state's (BLS, 2025) or the nation's.
    const rate = worldUnionRatePct(
      input.seed,
      input.placeMetadata?.housingState,
    );
    const members = Math.round((list.length * rate) / 100);
    const medianMonthly =
      (list[Math.floor(list.length / 2)]! * DAYS_PER_YEAR) / MONTHS_PER_YEAR;
    const amount = Math.round(
      members * medianMonthly * p("businessUnionDuesShare"),
    );
    if (amount <= 0) continue;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation: (unionData as { table: string }).table,
      estimatedFrom: `${members} members of ${list.length} employed in the place, each paying ${(p("businessUnionDuesShare") * 100).toFixed(1)}% of the median monthly wage.`,
    };
    const first = new Date(`${input.startedAt}T00:00:00.000Z`);
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
  return {
    ...input,
    residents: { ...residents, flows: [...residents.flows, ...flows] },
  };
}
