/**
 * Unions at work. At the opening each industry's workplaces are covered by a
 * union contract to the state's represented share scaled by the industry's
 * (BLS Union Members 2025): the largest workplaces first, since big
 * establishments are the ones organized, and public employers (schools, city
 * hall, state and federal offices) at government's much higher rates. The
 * employer that stands for jobs outside the town is covered at the state's
 * overall share. New businesses open unorganized.
 *
 * Each month the union's members are the workers at covered workplaces times
 * the share of represented workers who join: the state's own share at the
 * opening, and, where a right-to-work law takes effect or ends in play, the
 * share right-to-work (or other) states show. The members' dues (a share of
 * the place's median pay) are the union local's income, paid from the wider
 * population's pooled cash.
 */
import unionData from "./data/business/union-membership.json" with { type: "json" };
import { residentsRuntime } from "./modules/residents";
import type { ModuleTable } from "./module-state";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

const UNION = "membership:labor-union";
const DATA = unionData as unknown as {
  nationRepresentedPct: number;
  states: Record<
    string,
    { membersPct: number; representedPct: number; estimate?: string }
  >;
  industries: Record<string, { membersPct: number; representedPct: number }>;
  industryOfClassification: Record<string, string>;
  industryOfKind: Record<string, string>;
  rightToWork: { states: string[] };
};
const RTW = new Set(DATA.rightToWork.states);

/** Members per represented worker, averaged over the states with (or without) a right-to-work law. */
function joinShare(rightToWork: boolean): number {
  const rows = Object.entries(DATA.states).filter(
    ([usps, row]) =>
      row.representedPct > 0 && !row.estimate && RTW.has(usps) === rightToWork,
  );
  return (
    rows.reduce((n, [, row]) => n + row.membersPct / row.representedPct, 0) /
    Math.max(1, rows.length)
  );
}

export interface UnionMonth {
  id: string;
  placeId: string;
  month: string;
  represented: number;
  members: number;
  rightToWork: boolean;
  duesMonthlyMinor: number;
}

/** A place's right-to-work law as the laws engine last set it, else the state's law on record. */
export function setRightToWork(
  table: ModuleTable,
  placeId: string,
  inForce: boolean,
): void {
  table.put({ id: `law:right-to-work:${placeId}`, inForce });
}

/** Covers workplaces at the opening (once) and sets each union local's dues to this month's members. */
export function reviewUnions(
  api: CoreAPI,
  unions: ModuleTable,
  isElsewhere: (organizationId: string) => boolean,
): void {
  const c = api.state as CoreState,
    rt = residentsRuntime(c);
  const locals = [...c.organizations.values()].filter(
    (row) => (row as { classification?: string }).classification === UNION,
  );
  if (!rt || !locals.length) return;
  const usps = c.placeMetadata?.housingState ?? "";
  const state = DATA.states[usps];
  if (!state) return;
  // The island areas' rates are estimates: no official survey covers them.
  if (state.estimate) stopgap("SG-WORLD-union-territory-rates");
  // Who works where, and the place's pay.
  const staff = new Map<string, number>();
  // The wider population's workers alone: their dues come from its pooled cash.
  const countedStaff = new Map<string, number>();
  const pay = new Map<string, number[]>();
  const count = (organizationId: string, wageDailyMinor: number) => {
    staff.set(organizationId, (staff.get(organizationId) ?? 0) + 1);
    const placeId = c.organizations.get(organizationId)?.placeId;
    if (!placeId) return;
    const list = pay.get(placeId);
    if (list) list.push(wageDailyMinor);
    else pay.set(placeId, [wageDailyMinor]);
  };
  for (const [jobId, flow] of rt.wageFlowByJob) {
    const job = rt.jobs.get(jobId);
    if (job && job.endsAt === undefined && !flow.endedAt) {
      count(job.organizationId, job.wageDailyMinor);
      countedStaff.set(
        job.organizationId,
        (countedStaff.get(job.organizationId) ?? 0) + 1,
      );
    }
  }
  for (const job of c.jobs.values())
    if (job.endsAt === undefined) count(job.organizationId, job.wageDailyMinor);
  if (!unions.get("unions:opened")) {
    // Each industry's workplaces, largest first, covered to the state's represented share scaled by the industry's.
    const industryOf = (organizationId: string) => {
      if (isElsewhere(organizationId)) return "total";
      const org = c.organizations.get(organizationId) as
        { classification?: string } | undefined;
      return (
        DATA.industryOfClassification[org?.classification ?? ""] ??
        DATA.industryOfKind[
          c.finance.businesses.get(organizationId)?.kindId ?? ""
        ] ??
        "private"
      );
    };
    const groups = new Map<string, [string, number][]>();
    for (const [id, n] of staff) {
      const org = c.organizations.get(id) as
        { classification?: string } | undefined;
      if (org?.classification === UNION) continue;
      const industry = industryOf(id);
      const group = groups.get(industry);
      if (group) group.push([id, n]);
      else groups.set(industry, [[id, n]]);
    }
    for (const [industry, list] of groups) {
      const share = Math.min(
        1,
        (state.representedPct *
          ((DATA.industries[industry] ?? DATA.industries.private)!
            .representedPct /
            DATA.nationRepresentedPct)) /
          100,
      );
      if (industry === "total") {
        for (const [id] of list)
          unions.put({ id: `covered:${id}`, coveredShare: share, industry });
        continue;
      }
      const total = list.reduce((n, [, k]) => n + k, 0);
      let covered = 0;
      for (const [id, n] of list.sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )) {
        // Cover it while that brings the industry closer to its share.
        if (covered + n / 2 > share * total) break;
        covered += n;
        unions.put({ id: `covered:${id}`, coveredShare: 1, industry });
      }
    }
    // The law in force at the opening where the laws engine set it, else the state's law on record.
    const law = (local: { placeId: string }) =>
      (
        unions.get(`law:right-to-work:${local.placeId}`) as
          { inForce: boolean } | undefined
      )?.inForce;
    unions.put({
      id: "unions:opened",
      openingRightToWork: law(locals[0]!) ?? RTW.has(usps),
    });
  }
  const opened = unions.get("unions:opened") as unknown as {
    openingRightToWork: boolean;
  };
  // Who among the represented joins: whole populations, until each worker chooses for themselves.
  stopgap("SG-WORLD-business-union-members");
  for (const local of locals) {
    const law = unions.get(`law:right-to-work:${local.placeId}`) as
      { inForce: boolean } | undefined;
    const rightToWork = law?.inForce ?? opened.openingRightToWork;
    const join =
      rightToWork === opened.openingRightToWork
        ? state.membersPct / state.representedPct
        : joinShare(rightToWork);
    let represented = 0,
      countedRepresented = 0;
    for (const [id, n] of staff) {
      if (c.organizations.get(id)?.placeId !== local.placeId) continue;
      const row = unions.get(`covered:${id}`) as
        { coveredShare: number } | undefined;
      if (!row) continue;
      represented += row.coveredShare * n;
      countedRepresented += row.coveredShare * (countedStaff.get(id) ?? 0);
    }
    const members = Math.round(represented * join);
    // Full members' dues aren't charged yet (they'd pay from their own cash, by their own choice).
    const payingMembers = Math.round(countedRepresented * join);
    const list = [...(pay.get(local.placeId) ?? [])].sort((a, b) => a - b);
    const median = list[Math.floor(list.length / 2)] ?? 0;
    const dues = Math.round(
      payingMembers *
        ((median * api.parameter("jobsDaysPerYear")) /
          api.parameter("macroMonthsPerYear")) *
        api.parameter("businessUnionDuesShare"),
    );
    const flow = rt.flows.get(`dues:${local.id}`);
    if (flow && !flow.endedAt) flow.amountMinor = dues;
    const month = c.date.slice(0, "YYYY-MM".length);
    const record: UnionMonth = {
      id: `union-month:${local.placeId}:${month}`,
      placeId: local.placeId,
      month,
      represented: Math.round(represented),
      members,
      rightToWork,
      duesMonthlyMinor: flow && !flow.endedAt ? dues : 0,
    };
    unions.put({ ...record });
  }
}
