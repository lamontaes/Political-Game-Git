/** Completed rentals are occupied by households choosing a cheaper home. */
import { regionalLevel, regionalRegistered } from "./modules/regional";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import lawParameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };
import construction from "./data/housing/construction.json" with { type: "json" };
import type { ProjectRow, StockRow } from "./housing-construction";
import {
  householdIncome,
  regroupHousehold,
  residentsRuntime,
} from "./modules/residents";
import { fundBalance, peopleInGroup } from "./counted-money";
import { makeIsoDate } from "./kernel/dates";
import { sendLawNotice } from "./housing-notices";
import { nextDue } from "./housing-homeless";
import { addResidentFlow, setResidentFlowAmount } from "./residents-economy";
import { webFactorFor } from "./outcome-web-reach";
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

const RENT_STABILIZATION =
  "us-policy-positions:housing-land-use.rent-stabilization";

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
      if (house.gone || house.tenure !== "rent") continue;
      // A household filled in keeps its record in the core: the full-tier loop
      // above renews its lease. One returned to the counts keeps the record too,
      // but its lease has ended and its rent is the flow again, so only a
      // live lease puts a household in the full tier.
      const lease = c.finance.contracts.get(`lease:${house.id}`);
      if (c.households.has(house.id) && lease && !lease.endedAt) continue;
      const flow = rt.flows.get(`rent:${house.id}`);
      if (!flow || flow.endedAt || table(api, "statuses").get(house.id))
        continue;
      rows.push({
        id: house.id,
        placeId: house.placeId,
        memberIds: rt.store.memberIdsOf(house),
        tier: "counted",
        leaseId: flow.id,
        landlordId: flow.payeeId,
        rentMinor: flow.amountMinor,
        incomeMinor: householdIncome(rt, house) / months,
      });
    }
  return rows;
}

/** Release actual occupied units before a formerly homeless household signs again. */
export function releaseVacatedRentals(api: CoreAPI): void {
  const c = api.state as CoreState;
  const occupied = table(api, "occupancy");
  const entries = occupied.rows() as unknown as Occupancy[];
  if (!entries.length) return;
  const liveLeases = new Set(
    [...c.finance.contracts.values()]
      .filter(
        (row) => row.id.startsWith("lease:") && !row.endedAt && row.householdId,
      )
      .map((row) => row.householdId),
  );
  const rt = residentsRuntime(c);
  for (const row of entries) {
    const project = table(api, "projects").get(row.projectId) as unknown as
      ProjectRow | undefined;
    if (!project) continue;
    const full = c.households.get(row.householdId);
    const counted = full ? undefined : rt?.store.liveHousehold(row.householdId);
    const flow = rt?.flows.get(`rent:${row.householdId}`);
    const hasLease = full
      ? liveLeases.has(row.householdId) &&
        full.memberIds.some((id) => c.people.get(id)?.alive)
      : Boolean(counted && flow && !flow.endedAt);
    if (
      hasLease &&
      (full ?? counted)?.placeId === project.placeId &&
      !table(api, "statuses").get(row.householdId)
    )
      continue;
    occupied.remove(row.id);
    table(api, "affordable").remove(row.householdId);
    const stock = table(api, "stock").get(
      `stock:${project.placeId}`,
    ) as unknown as StockRow;
    table(api, "stock").put({
      ...stock,
      vacantRental: Math.min(stock.rentalUnits, stock.vacantRental + 1),
    });
  }
}

/** Monthly matching reviews live offers, never schedules a household to move. */
export function occupyCompletedRentals(api: CoreAPI): void {
  const c = api.state as CoreState;
  // stopgapId: SG-WORLD-new-rental-move-coverage
  api.stopgap("SG-WORLD-new-rental-move-coverage");
  // stopgapId: SG-WORLD-housing-vacancy
  api.stopgap("SG-WORLD-housing-vacancy");
  const candidates = tenants(api);
  const occupied = table(api, "occupancy");
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
  // The web's factor on rents is one per place and month; every lease there reads the same.
  const webFactors = new Map<string, number>();
  const webFactor = (placeId: string) => {
    let factor = webFactors.get(placeId);
    if (factor === undefined) {
      factor = webFactorFor(api, placeId, "housing.rent");
      webFactors.set(placeId, factor);
    }
    return factor;
  };
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
      | {
          renewedAt: string;
          regionPay: number;
          vacancy?: number;
          webFactor?: number;
        }
      | undefined;
    if (!last) {
      table(api, "renewals").put({
        id: tenant.leaseId,
        webFactor: webFactor(tenant.placeId),
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
    // The outcome web's rent factor is a level against the place's start; a lease moves by
    // the change in it since the lease last renewed, so a steady factor is not charged twice.
    const webChange = webFactor(tenant.placeId) / (last.webFactor ?? 1);
    const marketRentMinor = Math.round(
      ((tenant.rentMinor * level.hourlyEarnings) / last.regionPay) *
        vacancyFactor *
        webChange,
    );
    // Rent stabilization in force where the household lives caps the rise.
    const law =
      c.modules.has(LAWS_MODULE_ID) &&
      tenant.placeId === lawChain(api).townPlaceId
        ? lawInForce(api, RENT_STABILIZATION)
        : undefined;
    // stopgapId: SG-GOV-REACH-A-rent-contracts — the catalog's estimated
    // annual cap still stands in for the statute's building exemptions.
    if (law?.value === 1) api.stopgap("SG-GOV-REACH-A-rent-contracts");
    const rent =
      law?.value === 1
        ? Math.min(
            marketRentMinor,
            Math.round(
              tenant.rentMinor *
                (1 + lawParameters.parameters.rentIncreaseCap.value),
            ),
          )
        : marketRentMinor;
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
      webFactor: webFactor(tenant.placeId),
      webChange,
      renewedAt: c.date,
      rentMinor: rent,
      previousRentMinor: tenant.rentMinor,
      marketRentMinor,
      lawId: law?.value === 1 ? (law.governing?.id ?? null) : null,
      savedMinor: marketRentMinor - rent,
      vacancyFactor,
      stockId: `stock:${tenant.placeId}`,
      ...(vacancy === undefined ? {} : { vacancy }),
    });
    if (tenant.tier === "full" && law?.value === 1)
      noticeRentRenewal(api, tenant, {
        lawId: law.governing?.id ?? "",
        previousRentMinor: tenant.rentMinor,
        marketRentMinor,
        rentMinor: rent,
      });
  }
}

/**
 * The renewal notice a tenant receives where rent stabilization held the rise
 * below the market: the landlord's letter names the law, the old rent, the
 * market rent and the rent charged. Its oldest adult learns, from the letter
 * itself, that the law saved the household money, and their view of the law
 * moves in proportion to the share of the market rent saved.
 */
function noticeRentRenewal(
  api: CoreAPI,
  tenant: Tenant,
  rent: {
    readonly lawId: string;
    readonly previousRentMinor: number;
    readonly marketRentMinor: number;
    readonly rentMinor: number;
  },
): void {
  const saved = rent.marketRentMinor - rent.rentMinor;
  if (saved <= 0 || rent.marketRentMinor <= 0) return;
  sendLawNotice(api, {
    memberIds: tenant.memberIds,
    kind: "housing.rent-renewal",
    recordId: tenant.leaseId,
    lawId: rent.lawId,
    topic: RENT_STABILIZATION,
    desiredChange: "enact",
    noticeFacts: {
      leaseId: tenant.leaseId,
      previousRentMinor: String(rent.previousRentMinor),
      marketRentMinor: String(rent.marketRentMinor),
      rentMinor: String(rent.rentMinor),
    },
    moodImpulse:
      api.parameter("housingRentSavingImpulseScale") *
      (saved / rent.marketRentMinor),
    learnedFacts: { savedMinor: String(saved) },
    noticeCitation: `Renewal notice for ${tenant.leaseId} under ${rent.lawId}`,
    learnedCitation: `Learned from the renewal notice for ${tenant.leaseId} that ${rent.lawId} held the rent below the market`,
  });
}

export interface CompletedRentalOffer {
  project: ProjectRow;
  unit: number;
  affordable: boolean;
  rentMinor: number;
}

/** A real vacant unit a household without a home can afford. */
export function completedRentalOffer(
  api: CoreAPI,
  placeId: string,
  incomeMinor: number,
): CompletedRentalOffer | undefined {
  const stock = table(api, "stock").get(`stock:${placeId}`) as unknown as
    StockRow | undefined;
  if (!stock || stock.vacantRental < 1) return undefined;
  const offers: CompletedRentalOffer[] = [];
  for (const project of table(
    api,
    "projects",
  ).rows() as unknown as ProjectRow[]) {
    if (
      project.open ||
      project.kind !== "multi" ||
      project.placeId !== placeId ||
      project.askingRentMinor === undefined
    )
      continue;
    const used = new Set(
      (
        table(api, "occupancy").query("byProject", [
          project.id,
        ]) as unknown as Occupancy[]
      ).map((row) => row.unit),
    );
    for (let unit = 0; unit < project.units; unit++) {
      if (used.has(unit)) continue;
      const affordable = unit < project.affordableUnits;
      if (
        affordable &&
        incomeMinor >=
          (project.medianPayMinor ?? 0) * construction.inclusionary.amiShare
      )
        continue;
      const rentMinor = affordable
        ? Math.round(incomeMinor * construction.inclusionary.rentShareOfIncome)
        : project.askingRentMinor;
      if (
        rentMinor <= 0 ||
        incomeMinor < rentMinor * api.parameter("housingRehouseIncomeMultiple")
      )
        continue;
      offers.push({ project, unit, affordable, rentMinor });
    }
  }
  return offers.sort(
    (a, b) =>
      a.rentMinor - b.rentMinor ||
      a.project.id.localeCompare(b.project.id) ||
      a.unit - b.unit,
  )[0];
}

/** A signed lease or counted rent flow consumes one actual vacant unit. */
export function occupyRehousedRental(
  api: CoreAPI,
  offer: CompletedRentalOffer,
  householdId: string,
  leaseId: string,
): void {
  const c = api.state as CoreState;
  const rt = residentsRuntime(c);
  const full = c.households.get(householdId);
  const countedIndex = rt?.store.householdOf.get(householdId);
  const counted =
    countedIndex === undefined ? undefined : rt!.store.households[countedIndex];
  const house = full ?? (counted && !counted.gone ? counted : undefined);
  const lease = full
    ? c.finance.contracts.get(leaseId)
    : rt?.flows.get(leaseId);
  const stock = table(api, "stock").get(
    `stock:${offer.project.placeId}`,
  ) as unknown as StockRow | undefined;
  if (
    !house ||
    !lease ||
    lease.endedAt ||
    (full
      ? !("householdId" in lease) || lease.householdId !== householdId
      : leaseId !== `rent:${householdId}`) ||
    lease.payeeId !== offer.project.payerId ||
    lease.amountMinor !== offer.rentMinor ||
    !stock ||
    stock.vacantRental < 1
  )
    throw new Error(
      "A completed rental requires its signed lease and a real vacancy.",
    );
  const occupied = table(api, "occupancy");
  if (
    occupied.get(householdId) ||
    occupied
      .query("byProject", [offer.project.id])
      .some((row) => row.unit === offer.unit)
  )
    throw new Error(
      "A completed rental unit or household is already assigned.",
    );
  occupied.put({
    id: householdId,
    householdId,
    projectId: offer.project.id,
    unit: offer.unit,
    affordable: offer.affordable,
    leaseId,
    tier: full ? "full" : "counted",
    since: c.date,
  });
  if (!full && counted && rt) {
    counted.tenure = "rent";
    regroupHousehold(rt, counted, c.date);
  }
  table(api, "stock").put({ ...stock, vacantRental: stock.vacantRental - 1 });
  table(api, "dwellings").put({
    ...table(api, "dwellings").get(`dwelling:${householdId}`),
    id: `dwelling:${householdId}`,
    householdId,
    tenure: "rent",
    kind: "apartment",
    projectId: offer.project.id,
    unit: offer.unit,
    rentMinor: offer.rentMinor,
    since: c.date,
    basis: "rehoused-completed-project",
  });
  if (offer.affordable)
    table(api, "affordable").put({
      id: householdId,
      householdId,
      projectId: offer.project.id,
      rentMinor: offer.rentMinor,
      since: c.date,
    });
  table(api, "moves").put({
    id: `housing-move:${householdId}:${c.date}`,
    householdId,
    personIds: full ? [...full.memberIds] : rt!.store.memberIdsOf(counted!),
    tier: full ? "full" : "counted",
    projectId: offer.project.id,
    leaseId,
    unit: offer.unit,
    date: c.date,
    rentMinor: offer.rentMinor,
    previousHousingStatus:
      table(api, "statuses").get(householdId)?.status ?? null,
    vacancyDelta: -1,
    reasonKey: "income-and-cash-reach-a-vacant-home",
  });
}

/** New households take a real vacant home once their own income and cash qualify. */
export function houseUnassignedHouseholds(api: CoreAPI): void {
  const c = api.state as CoreState;
  const availablePlaces = new Set<string>();
  for (const project of table(
    api,
    "projects",
  ).rows() as unknown as ProjectRow[]) {
    if (
      project.open ||
      project.kind !== "multi" ||
      project.askingRentMinor === undefined
    )
      continue;
    const stock = table(api, "stock").get(`stock:${project.placeId}`);
    if (
      Number(stock?.vacantRental ?? 0) > 0 &&
      table(api, "occupancy").query("byProject", [project.id]).length <
        project.units
    )
      availablePlaces.add(project.placeId);
  }
  if (!availablePlaces.size) return;
  const rt = residentsRuntime(c);
  const groupCashPerPerson = new Map<number, number>();
  const months = api.parameter("macroMonthsPerYear");
  const days = api.parameter("jobsDaysPerYear");
  const candidates: {
    id: string;
    placeId: string;
    members: readonly string[];
    income: number;
    cash: number;
    counted: boolean;
  }[] = [];
  const contracted = new Set<string>();
  const retirement = new Map<string, number>();
  for (const contract of c.finance.contracts.values()) {
    if (contract.endedAt) continue;
    if (
      contract.householdId &&
      (contract.id.startsWith("lease:") || contract.id.startsWith("mortgage:"))
    )
      contracted.add(contract.householdId);
    if (contract.kind === "income.retirement" && contract.recipientIncome) {
      const id = contract.recipientIncome.personId;
      retirement.set(
        id,
        (retirement.get(id) ?? 0) +
          contract.amountMinor / Math.max(1, contract.periodMonths),
      );
    }
  }
  for (const house of c.households.values()) {
    if (
      !availablePlaces.has(house.placeId) ||
      contracted.has(house.id) ||
      table(api, "dwellings").get(`dwelling:${house.id}`) ||
      table(api, "statuses").get(house.id)
    )
      continue;
    const members = house.memberIds.filter((id) => c.people.get(id)?.alive);
    if (!members.length) continue;
    const income = members.reduce((sum, id) => {
      const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
      return (
        sum +
        (retirement.get(id) ?? 0) +
        (job && !job.endsAt ? (job.wageDailyMinor * days) / months : 0)
      );
    }, 0);
    candidates.push({
      id: house.id,
      placeId: house.placeId,
      members,
      income,
      cash: members.reduce((sum, id) => sum + c.people.get(id)!.liquidMinor, 0),
      counted: false,
    });
  }
  if (rt)
    for (const house of rt.store.liveHouseholds()) {
      if (
        !availablePlaces.has(house.placeId) ||
        house.gone ||
        house.tenure !== "other" ||
        c.households.has(house.id) ||
        rt.flows.has(`rent:${house.id}`) ||
        table(api, "statuses").get(house.id)
      )
        continue;
      let cashPerPerson = groupCashPerPerson.get(house.group);
      if (cashPerPerson === undefined) {
        const people = peopleInGroup(rt, house.group);
        cashPerPerson =
          rt.funded && people > 0
            ? fundBalance(api, rt, house.group) / people
            : 0;
        groupCashPerPerson.set(house.group, cashPerPerson);
      }
      const cash = Math.floor(cashPerPerson * rt.store.countedCount(house));
      candidates.push({
        id: house.id,
        placeId: house.placeId,
        members: rt.store
          .countedMembers(house)
          .map((index) => rt.store.ids[index]!),
        income: householdIncome(rt, house) / months,
        cash,
        counted: true,
      });
    }
  // Lowest incomes reach set-aside homes first; equal circumstances use stable IDs.
  candidates.sort((a, b) => a.income - b.income || a.id.localeCompare(b.id));
  for (const house of candidates) {
    const offer = completedRentalOffer(api, house.placeId, house.income);
    if (
      !offer ||
      house.cash < offer.rentMinor ||
      !c.organizations.has(offer.project.payerId)
    )
      continue;
    const source = {
      tag: "ESTIMATED" as const,
      asOf: c.date,
      citation: construction.source.citation,
      estimatedFrom:
        "A completed vacant unit, recorded household income and cash, and the landlord income qualification.",
    };
    const dueAt = makeIsoDate(nextDue(c.date));
    const leaseId = house.counted
      ? `rent:${house.id}`
      : `lease:${house.id}:${c.date}`;
    if (house.counted) {
      const account = rt!.input.accounts.find(
        (row) => row.placeId === house.placeId,
      )?.accountId;
      if (!account) continue;
      addResidentFlow(c, {
        id: leaseId,
        kind: "purchase",
        financeKind: "household.rent",
        payerId: account,
        payeeId: offer.project.payerId,
        residentsId: account,
        placeId: house.placeId,
        amountMinor: offer.rentMinor,
        firstAt: dueAt,
        cadence: { kind: "months", every: 1, day: 1 },
        salesReceipt: false,
        marketAdjusted: false,
        source,
      });
    } else {
      api.addFinanceContract({
        id: leaseId,
        householdId: house.id,
        payerIds: house.members,
        payeeId: offer.project.payerId,
        kind: "household-purchase",
        amountMinor: offer.rentMinor,
        dueAt,
        periodMonths: 1,
        accruesArrears: true,
        source,
      });
    }
    occupyRehousedRental(api, offer, house.id, leaseId);
    const moveId = `housing-move:${house.id}:${c.date}`;
    table(api, "moves").put({
      ...table(api, "moves").get(moveId)!,
      monthlyIncomeMinor: house.income,
      cashMinor: house.cash,
      previousHousingStatus: "unassigned",
      reasonKey: "income-and-cash-reach-a-vacant-home",
    });
  }
}
