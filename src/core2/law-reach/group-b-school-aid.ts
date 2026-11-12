/**
 * State school aid under an equalize-school-funding law. The state sets aside
 * a share of what the state's local governments spend on schools (the pool)
 * and pays it out by residents, weighted by need: the state's income per head
 * over the region's, so a poorer region gets more and a richer one less, with
 * no cutoff. Only governments that exist in the world are paid; the state's
 * local aid line rises by exactly what they receive. The state treasury pays
 * each town government's aid line a twelfth a month through the accounts
 * (budgets-treasury.ts), and the town pays its schools line from it, which
 * the school engine reads (school-outcomes.ts, school-budget-line.ts).
 */
import budgetBases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import {
  baseBudget,
  governments,
  type GovernmentRow,
} from "../modules/budgets";
import { budgetInForce } from "../budgets-treasury";
import { lawChain } from "../modules/laws";
import { regionOfPlace } from "../modules/regional";
import type { CoreAPI, CoreState } from "../types";
import { moveBudget } from "./group-b-money";
import { reachParameter } from "./group-b-people";

const bases = budgetBases as unknown as {
  calibration: { factor: number };
  places: Record<
    string,
    { local?: { spending?: Record<string, number> } } | undefined
  >;
};
const regionData = regions as unknown as {
  regions: {
    id: string;
    stateUsps: string;
    population: number;
    perCapitaIncome: number | null;
  }[];
};

/**
 * How much more than the state's average a region needs: the state's income
 * per head over the region's, as a share of the people-weighted average of
 * that ratio across the state, so the state's shares add to one. A state whose
 * regions carry no income figure (Puerto Rico) shares by people alone.
 */
export function schoolAidNeed(stateKey: string, regionId?: string): number {
  const usps = stateKey.slice("US-".length);
  const rows = regionData.regions.filter((r) => r.stateUsps === usps);
  const need = (r: { perCapitaIncome: number | null }) =>
    r.perCapitaIncome ? 1 / r.perCapitaIncome : 1;
  if (rows.some((r) => !r.perCapitaIncome)) return 1;
  const people = rows.reduce((n, r) => n + r.population, 0);
  const mean =
    people > 0
      ? rows.reduce((n, r) => n + need(r) * r.population, 0) / people
      : 0;
  const row = rows.find((r) => r.id === regionId);
  return row && mean > 0 ? need(row) / mean : 1;
}

/** The schools aid each of the town's own governments gets, in minor units, by government id. */
export function schoolAidShares(api: CoreAPI): Map<string, number> {
  const core = api.state as CoreState;
  const out = new Map<string, number>();
  const chain = lawChain(api);
  const local = bases.places[chain.stateKey]?.local?.spending?.schools;
  const state = governments(api).find((g) => g.level === "state");
  if (!local || !state?.residents) return out;
  // The pool per resident of the state: the researched share of what its
  // local governments spend on schools.
  const perResident =
    reachParameter("equalizedFundingSpendingShare") *
    local *
    bases.calibration.factor *
    reachParameter("centsPerDollar");
  const need = schoolAidNeed(chain.stateKey, regionOfPlace(chain.townPlaceId));
  // The town's governments carry its schools in proportion to what each
  // spends on them a resident at the Census base, so the aid reaches the
  // lines the school engine reads, and the per-resident rises add up to
  // the pool's per-resident aid.
  const carrying: { gov: GovernmentRow; perResident: number }[] = [];
  for (const gov of governments(api) as readonly GovernmentRow[]) {
    if (gov.level !== "city" && gov.level !== "county") continue;
    if (
      core.organizations.get(gov.organizationId)?.placeId !== chain.townPlaceId
    )
      continue;
    const budget = budgetInForce(api, gov.id);
    if (!budget || !gov.residents) continue;
    const line =
      baseBudget(api, gov, budget.fiscalYear).spendingMinor.schools ?? 0;
    if (line > 0) carrying.push({ gov, perResident: line / gov.residents });
  }
  const carried = carrying.reduce((n, c) => n + c.perResident, 0);
  for (const { gov, perResident: own } of carrying)
    out.set(
      gov.id,
      Math.round(perResident * need * gov.residents * (own / carried)),
    );
  return out;
}

/**
 * While the law stands, each of the town's governments gets its share as aid
 * (revenue) and as schools spending, and the state's local aid line rises by
 * the sum paid: charged equals paid. A repeal takes the current year's
 * amounts back. Applied once per fiscal year's budget, as every act that
 * moves budget money is (moveBudget).
 */
export function equalizeSchoolFunding(
  api: CoreAPI,
  input: { key: string; lawId: string; inForce: boolean },
): number {
  const shares = schoolAidShares(api);
  const governmentsOf = (level: "city" | "county") =>
    (governments(api) as readonly GovernmentRow[]).filter(
      (g) => g.level === level,
    );
  let total = 0;
  for (const level of ["city", "county"] as const) {
    const gov = governmentsOf(level).find((g) => shares.has(g.id));
    if (!gov) continue;
    const share = shares.get(gov.id)!;
    total += share;
    moveBudget(api, {
      ...input,
      level,
      plan: () => ({ schools: share }),
      revenuePlan: () => ({ intergovernmental: share }),
    });
  }
  moveBudget(api, {
    ...input,
    level: "state",
    plan: () => ({ localAid: total }),
  });
  return total;
}
