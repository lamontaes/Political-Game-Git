/**
 * A government's charges and fees (tuition, hospital bills, sewer and trash,
 * parks, tolls) are paid by the people who use its services. The town's part
 * of each government's yearly charges comes out of its households' living
 * costs: each month a share of the living cost every household pays on the
 * 1st goes to the government instead of the outside account, and the part
 * outsiders use stays the outside account's. What the charges are for comes
 * from the Census 2022 item codes (`service-charges-2022.json`).
 *
 * Households pay by their living cost and businesses' own charges are inside
 * it (stopgap SG-GOV-service-charges-by-living-cost).
 */
import charges from "../../data/research/money/service-charges-2022.json" with { type: "json" };
import { budgetInForce, treasuryParameter } from "./budgets-treasury";
import { setLivingCostSplit } from "./living-cost-split";
import {
  BUDGETS_MODULE_ID,
  governments,
  type GovernmentRow,
} from "./modules/budgets";
import { lawChain } from "./modules/laws";
import { monthlyLivingCostMinor, residentsRuntime } from "./modules/residents";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreState } from "./types";

interface Level {
  chargesAndFees: { shares: Record<string, number> };
}
interface PlaceRow {
  tag: "SOURCED" | "ESTIMATED";
  state: Level;
  local: Level;
}
const PLACES = charges.places as unknown as Record<string, PlaceRow>;

/** A government's charges for the coming month, as a part of the town's living cost. */
export interface ServiceChargeShareRow {
  readonly id: string;
  readonly governmentId: string;
  readonly organizationId: string;
  readonly date: string;
  /** The charges for one month of the people the town models. */
  readonly targetMonthlyMinor: number;
  /** The part of the government's residents the town's modeled people are. */
  readonly modeledShare: number;
  /** What the town's households owe for living costs in a month. */
  readonly livingMonthlyMinor: number;
  /** The part of each household's living cost that is this government's charges. */
  readonly share: number;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly services: readonly { service: string; share: number }[];
}

/** What households paid a government in one month, by what the charges are for. */
export interface ServiceChargeMonthRow {
  readonly id: string;
  readonly governmentId: string;
  readonly month: string;
  readonly paidMinor: number;
  readonly byService: Readonly<Record<string, number>>;
}

const table = (api: CoreAPI, name: string) =>
  api.moduleState(BUDGETS_MODULE_ID).table(name);

/** The town's people the game models: full people living there and counted ones times their weights. */
function modeledResidents(api: CoreAPI, townPlaceId: string): number {
  const core = api.state as CoreState;
  let n = residentsRuntime(core)?.store.weightedPeople(townPlaceId) ?? 0;
  for (const person of core.people.values())
    if (person.alive && person.placeId === townPlaceId) n += 1;
  return n;
}

export function serviceChargeShares(api: CoreAPI): ServiceChargeShareRow[] {
  return table(
    api,
    "serviceCharges",
  ).rows() as unknown as ServiceChargeShareRow[];
}

export function serviceChargesPaidBy(
  api: CoreAPI,
  governmentId: string,
): readonly ServiceChargeMonthRow[] {
  return table(api, "serviceChargeMonths").query("byGovernment", [
    governmentId,
  ]) as unknown as ServiceChargeMonthRow[];
}

function servicesOf(
  stateKey: string,
  gov: GovernmentRow,
): {
  tag: "SOURCED" | "ESTIMATED";
  services: { service: string; share: number }[];
} {
  const row = PLACES[stateKey];
  const level = gov.level === "state" ? row?.state : row?.local;
  return {
    tag: row?.tag ?? "ESTIMATED",
    services: Object.entries(level?.chargesAndFees.shares ?? {})
      .filter(([, share]) => share > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([service, share]) => ({ service, share })),
  };
}

/**
 * Work out each government's part of the town's living cost for the next
 * month, from its budget in force and the households' living costs, and hand
 * it to the residents engine. Run when the treasuries open, at each close,
 * and when a budget changes.
 */
export function syncServiceCharges(api: CoreAPI): void {
  const core = api.state as CoreState;
  const chain = lawChain(api);
  const living = monthlyLivingCostMinor(core, chain.townPlaceId);
  const modeled = modeledResidents(api, chain.townPlaceId);
  const months = treasuryParameter("monthsPerYear");
  for (const gov of governments(api)) {
    if (gov.level === "federal") continue;
    const annual = budgetInForce(api, gov.id)?.revenueMinor.chargesAndFees ?? 0;
    const { tag, services } = servicesOf(chain.stateKey, gov);
    // The people the town models pay their part; the rest of what the
    // government's residents pay stays the outside account's.
    const residents =
      gov.level === "city" ? Math.max(modeled, gov.residents) : gov.residents;
    const modeledShare = residents > 0 ? Math.min(1, modeled / residents) : 0;
    const target = Math.round((annual * modeledShare) / months);
    table(api, "serviceCharges").put({
      id: gov.id,
      governmentId: gov.id,
      organizationId: gov.organizationId,
      date: api.state.date,
      modeledShare,
      targetMonthlyMinor: target,
      livingMonthlyMinor: living,
      share:
        living > 0 && target > 0 && services.length
          ? Math.min(1, target / living)
          : 0,
      tag,
      services,
    } as unknown as ModuleRow);
  }
  if (serviceChargeShares(api).some((row) => row.share > 0))
    api.stopgap("SG-GOV-service-charges-by-living-cost");
  setLivingCostSplit(core, {
    shares: (placeId) =>
      placeId !== chain.townPlaceId
        ? []
        : serviceChargeShares(api)
            .filter((row) => row.share > 0)
            .map((row) => ({
              organizationId: row.organizationId,
              share: row.share,
            })),
    paid: (_placeId, organizationId, minor) => {
      const row = serviceChargeShares(api).find(
        (r) => r.organizationId === organizationId,
      );
      if (!row) return;
      const month = api.state.date.slice(0, 7);
      const id = `${row.governmentId}:${month}`;
      const prior = table(api, "serviceChargeMonths").get(id) as unknown as
        ServiceChargeMonthRow | undefined;
      const byService: Record<string, number> = { ...(prior?.byService ?? {}) };
      let left = minor;
      row.services.forEach(({ service, share }, i) => {
        const part =
          i === row.services.length - 1 ? left : Math.round(minor * share);
        const taken = Math.min(left, part);
        byService[service] = (byService[service] ?? 0) + taken;
        left -= taken;
      });
      table(api, "serviceChargeMonths").put({
        id,
        governmentId: row.governmentId,
        month,
        paidMinor: (prior?.paidMinor ?? 0) + minor,
        byService,
      } satisfies ServiceChargeMonthRow as unknown as ModuleRow);
    },
  });
}
