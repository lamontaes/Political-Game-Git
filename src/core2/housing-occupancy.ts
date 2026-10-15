/** Completed rentals are occupied by households choosing a cheaper home. */
import { regionalLevel, regionalRegistered } from "./modules/regional";
import construction from "./data/housing/construction.json" with { type: "json" };
import type { ProjectRow, StockRow } from "./housing-construction";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { setResidentFlowAmount } from "./residents-economy";
import type { CoreAPI, CoreState } from "./types";

interface Tenant {
  id: string;
  placeId: string;
  memberIds: readonly string[];
  tier: "full" | "counted";
  leaseId: string;
  landlordId: string;
  rentMinor: number;
  incomeMinor: number;
}
interface Occupancy {
  id: string;
  householdId: string;
  projectId: string;
  unit: number;
  affordable: boolean;
  leaseId: string;
  tier: string;
}
const table = (api: CoreAPI, name: string) =>
  api.moduleState("housing").table(name);

/** Moving hassle is weighed against savings, relative to the household's income. */
export function rentalMovePull(
  oldRent: number,
  newRent: number,
  income: number,
  friction: number,
): number {
  return (
    (oldRent - newRent - newRent * friction) / Math.max(1, income, oldRent)
  );
}

function tenants(api: CoreAPI): Tenant[] {
  const c = api.state as CoreState;
  const months = api.parameter("macroMonthsPerYear");
  const days = api.parameter("jobsDaysPerYear");
  const rows: Tenant[] = [];
  const retirement = new Map<string, number>();
  for (const contract of c.finance.contracts.values())
    if (
      !contract.endedAt &&
      contract.recipientIncome &&
      contract.kind === "income.retirement"
    ) {
      const id = contract.recipientIncome.personId;
      retirement.set(
        id,
        (retirement.get(id) ?? 0) +
          contract.amountMinor / Math.max(1, contract.periodMonths),
      );
    }

  for (const lease of c.finance.contracts.values()) {
    if (!lease.id.startsWith("lease:") || lease.endedAt || !lease.householdId)
      continue;
    const house = c.households.get(lease.householdId);
    if (!house || table(api, "statuses").get(house.id)) continue;
    const living = house.memberIds.filter((id) => c.people.get(id)?.alive);
    if (!living.length) continue;
    const income = living.reduce((sum, id) => {
      const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
      return (
        sum +
        (retirement.get(id) ?? 0) +
        (job && !job.endsAt ? (job.wageDailyMinor * days) / months : 0)
      );
    }, 0);
    rows.push({
      id: house.id,
      placeId: house.placeId,
      memberIds: living,
      tier: "full",
      leaseId: lease.id,
      landlordId: lease.payeeId,
      rentMinor: lease.amountMinor,
      incomeMinor: income,
    });
  }
  const rt = residentsRuntime(c);
  if (rt)
    for (const house of rt.store.liveHouseholds()) {
      if (house.gone || c.households.has(house.id) || house.tenure !== "rent")
        continue;
      const flow = rt.flows.get(`rent:${house.id}`);
      if (!flow || flow.endedAt || table(api, "statuses").get(house.id))
        continue;
      rows.push({
        id: house.id,
        placeId: house.placeId,
        memberIds: rt.households.get(house.id)?.household.memberIds ?? [],
        tier: "counted",
        leaseId: flow.id,
        landlordId: flow.payeeId,
        rentMinor: flow.amountMinor,
        incomeMinor: householdIncome(rt, house) / months,
      });
    }
  return rows;
}

/** Monthly matching reviews live offers, never schedules a household to move. */
export function occupyCompletedRentals(api: CoreAPI): void {
  const c = api.state as CoreState;
  // stopgapId: SG-WORLD-new-rental-move-coverage
  api.stopgap("SG-WORLD-new-rental-move-coverage");
  // stopgapId: SG-WORLD-housing-vacancy
  api.stopgap("SG-WORLD-housing-vacancy");
  const candidates = tenants(api);
  const byHouse = new Map(candidates.map((row) => [row.id, row]));
  const occupied = table(api, "occupancy");
  for (const row of occupied.rows() as unknown as Occupancy[]) {
    const tenant = byHouse.get(row.householdId);
    const project = table(api, "projects").get(row.projectId) as unknown as
      ProjectRow | undefined;
    if (!project || tenant?.placeId === project.placeId) continue;
    occupied.remove(row.id);
    const stock = table(api, "stock").get(
      `stock:${project.placeId}`,
    ) as unknown as StockRow;
    table(api, "stock").put({
      ...stock,
      vacantRental: Math.min(stock.rentalUnits, stock.vacantRental + 1),
    });
  }
  const projects = (table(api, "projects").rows() as unknown as ProjectRow[])
    .filter(
      (row) =>
        !row.open && row.kind === "multi" && row.askingRentMinor !== undefined,
    )
    .sort(
      (a, b) =>
        a.completesAt.localeCompare(b.completesAt) || a.id.localeCompare(b.id),
    );
  const moved = new Set<string>();
  for (const project of projects) {
    const held = occupied.query("byProject", [
      project.id,
    ]) as unknown as Occupancy[];
    const used = new Set(held.map((row) => row.unit));
    for (let unit = 0; unit < project.units; unit++) {
      if (used.has(unit)) continue;
      const affordable = unit < project.affordableUnits;
      const offers = candidates
        .flatMap((tenant) => {
          if (
            tenant.placeId !== project.placeId ||
            tenant.landlordId !== project.payerId ||
            moved.has(tenant.id)
          )
            return [];
          const prior = occupied.get(tenant.id) as unknown as
            Occupancy | undefined;
          if (prior?.projectId === project.id || prior?.affordable) return [];
          if (
            affordable &&
            tenant.incomeMinor >=
              (project.medianPayMinor ?? 0) * construction.inclusionary.amiShare
          )
            return [];
          const rent = affordable
            ? Math.round(
                tenant.incomeMinor *
                  construction.inclusionary.rentShareOfIncome,
              )
            : project.askingRentMinor!;
          if (
            rent <= 0 ||
            tenant.incomeMinor <
              rent * api.parameter("housingRehouseIncomeMultiple")
          )
            return [];
          const pull = rentalMovePull(
            tenant.rentMinor,
            rent,
            tenant.incomeMinor,
            api.parameter("housingMoveRentFriction"),
          );
          return pull > 0 ? [{ tenant, rent, pull, prior }] : [];
        })
        .sort(
          (a, b) =>
            (affordable
              ? a.tenant.incomeMinor - b.tenant.incomeMinor
              : b.pull - a.pull) || a.tenant.id.localeCompare(b.tenant.id),
        );
      const offer = offers[0];
      if (!offer) continue;
      const { tenant, rent, pull, prior } = offer;
      // Preserve the standing writer and arrears. The same landlord receives
      // the new rent on the existing due date for full and counted tenants.
      if (tenant.tier === "full")
        api.setStandingContractAmount(tenant.leaseId, rent);
      else if (!setResidentFlowAmount(c, tenant.leaseId, rent)) continue;
      occupied.put({
        id: tenant.id,
        householdId: tenant.id,
        projectId: project.id,
        unit,
        affordable,
        leaseId: tenant.leaseId,
        tier: tenant.tier,
        since: c.date,
      });
      table(api, "dwellings").put({
        ...table(api, "dwellings").get(`dwelling:${tenant.id}`),
        id: `dwelling:${tenant.id}`,
        householdId: tenant.id,
        tenure: "rent",
        kind: "apartment",
        rentMinor: rent,
        projectId: project.id,
        unit,
        since: c.date,
        basis: "completed-project",
      });
      if (affordable)
        table(api, "affordable").put({
          id: tenant.id,
          householdId: tenant.id,
          projectId: project.id,
          since: c.date,
          rentMinor: rent,
          previousRentMinor: tenant.rentMinor,
        });
      const moveId = `housing-move:${tenant.id}:${c.date}`;
      table(api, "moves").put({
        id: moveId,
        householdId: tenant.id,
        personIds: [...tenant.memberIds],
        tier: tenant.tier,
        projectId: project.id,
        leaseId: tenant.leaseId,
        date: c.date,
        unit,
        previousProjectId: prior?.projectId ?? null,
        oldRentMinor: tenant.rentMinor,
        rentMinor: rent,
        monthlyIncomeMinor: tenant.incomeMinor,
        pull,
        // The old rented home becomes vacant as this unit is occupied.
        vacancyDelta: 0,
        reasonKey: "rent-savings-after-moving-hassle",
      });
      api.emit({
        id: `event:${moveId}`,
        kind: "housing.moved",
        date: c.date,
        placeId: tenant.placeId,
        personIds: tenant.memberIds.filter((id) => c.people.has(id)),
        publicRecord: false,
        topic: project.id,
        source: {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: construction.source.citation,
          estimatedFrom:
            "Completed unit, household rent and income, and recorded moving pull.",
        },
        facts: {
          projectId: project.id,
          moveId,
          leaseId: tenant.leaseId,
          oldRentMinor: String(tenant.rentMinor),
          rentMinor: String(rent),
        },
      });
      moved.add(tenant.id);
    }
  }
}

/** Both tiers renew the rent their payment writer actually reads. */
export function renewRentalLeases(api: CoreAPI): void {
  if (!regionalRegistered(api)) return;
  const c = api.state as CoreState;
  for (const tenant of tenants(api)) {
    const level = regionalLevel(api, tenant.placeId);
    if (!level) continue;
    // Set-aside rent is already tied to income by its allocation, not market rent.
    if (table(api, "affordable").get(tenant.id)) continue;
    const stock = table(api, "stock").get(
      `stock:${tenant.placeId}`,
    ) as unknown as StockRow | undefined;
    const vacancy =
      stock && stock.rentalUnits > 0
        ? stock.vacantRental / stock.rentalUnits
        : undefined;
    const last = table(api, "renewals").get(tenant.leaseId) as
      { renewedAt: string; regionPay: number; vacancy?: number } | undefined;
    if (!last) {
      table(api, "renewals").put({
        id: tenant.leaseId,
        regionPay: level.hourlyEarnings,
        renewedAt: c.date,
        rentMinor: tenant.rentMinor,
        ...(vacancy === undefined ? {} : { vacancy }),
      });
      continue;
    }
    const months =
      (Number(c.date.slice(0, 4)) - Number(last.renewedAt.slice(0, 4))) *
        api.parameter("macroMonthsPerYear") +
      Number(c.date.slice(5, 7)) -
      Number(last.renewedAt.slice(5, 7));
    if (months < api.parameter("macroMonthsPerYear")) continue;
    // Half a unit regularizes zero vacancy without a rent discontinuity at zero.
    const unitShare =
      stock && stock.rentalUnits > 0
        ? api.parameter("macroHalf") / stock.rentalUnits
        : api.parameter("one");
    const vacancyFactor =
      vacancy === undefined || last.vacancy === undefined
        ? 1
        : ((vacancy + unitShare) / (last.vacancy + unitShare)) **
          -api.parameter("housingRentVacancyElasticity");
    const rent = Math.round(
      ((tenant.rentMinor * level.hourlyEarnings) / last.regionPay) *
        vacancyFactor,
    );
    if (tenant.tier === "full")
      api.setStandingContractAmount(tenant.leaseId, rent);
    else if (!setResidentFlowAmount(c, tenant.leaseId, rent)) continue;
    const dwelling = table(api, "dwellings").get(`dwelling:${tenant.id}`);
    if (dwelling) table(api, "dwellings").put({ ...dwelling, rentMinor: rent });
    table(api, "renewals").put({
      id: tenant.leaseId,
      householdId: tenant.id,
      tier: tenant.tier,
      regionPay: level.hourlyEarnings,
      renewedAt: c.date,
      rentMinor: rent,
      previousRentMinor: tenant.rentMinor,
      vacancyFactor,
      stockId: `stock:${tenant.placeId}`,
      ...(vacancy === undefined ? {} : { vacancy }),
    });
  }
}
