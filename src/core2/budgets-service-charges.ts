/**
 * A government's charges and fees (tuition, hospital bills, sewer and trash,
 * parks, tolls) are paid by the people who use its services. The town's part
 * of each government's yearly charges comes out of its households' living
 * costs: each month a share of the living cost every household pays on the
 * 1st goes to the government instead of the outside account. The rest of the
 * government's charges are paid by the people elsewhere who use its services
 * (revenue-payers.json), less what the town's households already paid. What the charges are for comes
 * from the Census 2022 item codes (`service-charges-2022.json`).
 *
 * Households pay by their living cost and businesses' own charges are inside
 * it (stopgap SG-GOV-service-charges-by-living-cost).
 */
import charges from "../../data/research/money/service-charges-2022.json" with { type: "json" };
import {
  budgetInForce,
  noteTownRevenue,
  treasuryParameter,
} from "./budgets-treasury";
import { setLivingCostSplit, setOutsideCostSplit } from "./living-cost-split";
import {
  budgetWorldShares,
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

/** The service the first by-use slice charges: sewer and trash, flat per dwelling and per firm. */
const SEWER = "sewerage-and-solid-waste";

/**
 * A firm's sewer and trash bill against a dwelling's, by weight (ESTIMATED,
 * spread 1.3 to 5). No national figure splits the service between households
 * and firms. UNC Environmental Finance Center's North Carolina rates reports
 * put the typical commercial connection (15,000 gallons a month) at $115 a
 * month for water and sewer (2018 data) against $42 for the typical
 * residential one (5,000 gallons; 184 utilities with separate commercial
 * rates, 2021): 2.7 times, from mixed years. Owatonna, Minnesota's ordinance
 * bills a flat $18.90 a month to residents and a $24.94 base to commercial
 * accounts before use (1.3 times, before use). Both are small samples.
 */
const FIRM_TO_DWELLING_WEIGHT = 2.7;

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
  /** Sewer and trash for one month, flat per dwelling (a full household or a counted one); the rest is the uniform share. */
  readonly sewerPerDwellingMinor: number;
  /** The same service for one firm (its weight times a dwelling's). */
  readonly sewerPerFirmMinor: number;
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

/** Who pays a flat charge in the town: the full households' payers, the counted households together, and the firms. */
interface TownPayers {
  /** Full households' payers (the member who pays the living cost). */
  readonly people: ReadonlySet<string>;
  /** The counted households' residents accounts, with how many dwellings each pays for. */
  readonly counted: ReadonlyMap<string, number>;
  /** Firms that pay outside costs. */
  readonly firms: ReadonlySet<string>;
  readonly dwellings: number;
}

function townPayers(api: CoreAPI, townPlaceId: string): TownPayers {
  const core = api.state as CoreState;
  const people = new Set<string>();
  for (const home of core.households.values()) {
    if (home.placeId !== townPlaceId) continue;
    // The member the household's living-cost flow is paid by: the first with a cost.
    const payer = home.memberIds
      .map((id) => core.people.get(id))
      .find((row) => row?.alive && row.livingCostDailyMinor > 0);
    if (payer) people.add(payer.id);
  }
  const counted = new Map<string, number>();
  const rt = residentsRuntime(core);
  const firms = new Set<string>();
  if (rt) {
    const store = rt.store;
    let homes = 0;
    for (const h of store.liveHouseholds()) {
      if (h.placeId !== townPlaceId) continue;
      let cost = 0;
      for (const m of store.countedMembers(h)) cost += store.living[m] ?? 0;
      if (cost > 0) homes += store.weightOf(h);
    }
    for (const flow of rt.flows.values()) {
      if (flow.endedAt || flow.placeId !== townPlaceId) continue;
      if (flow.kind === "outside-costs") firms.add(flow.payerId);
      if (
        flow.kind === "purchase" &&
        flow.payerId === flow.residentsId &&
        homes > 0
      )
        counted.set(flow.payerId, homes);
    }
  }
  const dwellings =
    people.size + [...counted.values()].reduce((n, v) => Math.max(n, v), 0);
  return { people, counted, firms, dwellings };
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
  api: CoreAPI,
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
    // This world's mix of services, drawn around the published one.
    services: Object.entries(
      budgetWorldShares(
        api,
        `budget-world:service-charges:${gov.id}`,
        level?.chargesAndFees.shares ?? {},
      ),
    )
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
  const payers = townPayers(api, chain.townPlaceId);
  const months = treasuryParameter("monthsPerYear");
  for (const gov of governments(api)) {
    if (gov.level === "federal") continue;
    // A charge's level is the budget's charges line; no bill sets a fee.
    api.stopgap("SG-GOV-fee-level-by-bill");
    const annual = budgetInForce(api, gov.id)?.revenueMinor.chargesAndFees ?? 0;
    const { tag, services } = servicesOf(api, chain.stateKey, gov);
    // The people the town models pay their part; the rest of what the
    // government's residents pay stays the outside account's.
    const residents =
      gov.level === "city" ? Math.max(modeled, gov.residents) : gov.residents;
    const modeledShare = residents > 0 ? Math.min(1, modeled / residents) : 0;
    const target = Math.round((annual * modeledShare) / months);
    // Sewer and trash is charged to its users: flat per dwelling and per firm,
    // taken out of the uniform share. A service with no users in the town
    // keeps the uniform share.
    const sewerShare = services.find((s) => s.service === SEWER)?.share ?? 0;
    const weight =
      payers.dwellings + FIRM_TO_DWELLING_WEIGHT * payers.firms.size;
    const sewerMonthly = weight > 0 ? Math.round(target * sewerShare) : 0;
    const perDwelling = weight > 0 ? Math.floor(sewerMonthly / weight) : 0;
    const uniformTarget = Math.round(target - perDwelling * weight);
    table(api, "serviceCharges").put({
      id: gov.id,
      governmentId: gov.id,
      organizationId: gov.organizationId,
      date: api.state.date,
      modeledShare,
      targetMonthlyMinor: target,
      livingMonthlyMinor: living,
      share:
        living > 0 && uniformTarget > 0 && services.length
          ? Math.min(1, uniformTarget / living)
          : 0,
      sewerPerDwellingMinor: perDwelling,
      sewerPerFirmMinor: Math.round(perDwelling * FIRM_TO_DWELLING_WEIGHT),
      tag,
      services,
    } as unknown as ModuleRow);
  }
  if (serviceChargeShares(api).some((row) => row.share > 0))
    api.stopgap("SG-GOV-service-charges-by-living-cost");
  // What a payer owes a government for sewer and trash: a dwelling's charge
  // for each dwelling it pays for, a firm's charge for a firm.
  const sewerOwed = (row: ServiceChargeShareRow, payerId?: string): number => {
    if (!payerId) return 0;
    if (payers.people.has(payerId)) return row.sewerPerDwellingMinor;
    const homes = payers.counted.get(payerId);
    if (homes) return homes * row.sewerPerDwellingMinor;
    if (payers.firms.has(payerId)) return row.sewerPerFirmMinor;
    return 0;
  };
  const sharesOf = (
    placeId: string,
    payerId?: string,
    total?: number,
  ): { organizationId: string; share: number }[] =>
    placeId !== chain.townPlaceId
      ? []
      : serviceChargeShares(api).flatMap((row) => {
          const owed = total && total > 0 ? sewerOwed(row, payerId) : 0;
          const share = row.share + (total ? Math.min(1, owed / total) : 0);
          return share > 0
            ? [{ organizationId: row.organizationId, share }]
            : [];
        });
  const paidTo = (
    organizationId: string,
    minor: number,
    payerId?: string,
  ): void => {
    const row = serviceChargeShares(api).find(
      (r) => r.organizationId === organizationId,
    );
    if (!row) return;
    const month = api.state.date.slice(0, 7);
    const id = `${row.governmentId}:${month}`;
    const prior = table(api, "serviceChargeMonths").get(id) as unknown as
      ServiceChargeMonthRow | undefined;
    const byService: Record<string, number> = { ...(prior?.byService ?? {}) };
    // The sewer part is what the payer owes for its dwellings or firm; the
    // rest is spread over the other services by their shares.
    const sewer = Math.min(minor, sewerOwed(row, payerId));
    if (sewer > 0) byService[SEWER] = (byService[SEWER] ?? 0) + sewer;
    const others = row.services.filter((s) => s.service !== SEWER);
    const whole = others.reduce((n, s) => n + s.share, 0);
    let left = minor - sewer;
    others.forEach(({ service, share }, i) => {
      const part =
        i === others.length - 1
          ? left
          : Math.round((minor - sewer) * (whole > 0 ? share / whole : 0));
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
    // What the town paid comes off what the government's other service users
    // owe at their next installment.
    noteTownRevenue(api, {
      governmentId: row.governmentId,
      line: "chargesAndFees",
      paidMinor: minor,
    });
  };
  setLivingCostSplit(core, {
    shares: sharesOf,
    paid: (_placeId, organizationId, minor, payerId) =>
      paidTo(organizationId, minor, payerId),
  });
  // The firms' sewer and trash comes out of what they pay outside the town for their costs.
  setOutsideCostSplit(
    core,
    {
      shares: (placeId, payerId, total) =>
        placeId !== chain.townPlaceId || !payerId || !payers.firms.has(payerId)
          ? []
          : sharesOf(placeId, payerId, total)
              .map((row) => ({
                organizationId: row.organizationId,
                share:
                  row.share -
                  (serviceChargeShares(api).find(
                    (r) => r.organizationId === row.organizationId,
                  )?.share ?? 0),
              }))
              .filter((row) => row.share > 0),
      paid: (_placeId, organizationId, minor, payerId) =>
        paidTo(organizationId, minor, payerId),
    },
    "budgets-sewer",
  );
}
