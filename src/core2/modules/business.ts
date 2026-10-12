/**
 * Businesses growing: every business has an owner, and each month the owner
 * chooses how much of that month's profit to draw, never more than the
 * profit the business has kept. Where a place's market for a kind of
 * business has room, the owners of that kind's strong businesses choose
 * first whether to open another location there; if none does, the place's
 * adults choose whether to found one. Chains are repeated growth, never
 * scripted. Every payment moves through the ledger.
 */
import { chooseAct } from "../choice";
import businessData from "../data/business/business.json" with { type: "json" };
import businessParameters from "../data/business/parameters.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import type { ActOffer, CoreAPI, CoreModule, CoreState } from "../types";
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import {
  countedJobsOf,
  purchaseShareOf,
  shiftPurchaseShare,
} from "../residents-economy";
import { residentPerson, residentsRuntime } from "./residents";
import { lendForFounding } from "./credit";
import { registerEmployer } from "./jobs";
import { transferCash } from "../world-transfer";

export const BUSINESS_MODULE_ID = "business";
export const BUSINESS_PARAMETERS = businessParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const PULL = "business:pull";

interface OwnerRow {
  id: string;
  ownerId: string;
  since: string;
  basis: string;
  /** Book counters at the last draw, to measure this month's profit. */
  salesThrough: number;
  wagesThrough: number;
  operatingThrough: number;
  /** Profit earned and not yet drawn; the most an owner can take. */
  retainedMinor: number;
  /** Cash less credit owed at the last draw: profit is its change. */
  netThrough?: number;
  /** The business this one is a location of, when an owner opened it. */
  parentId?: string;
}

interface Market {
  placeId: string;
  kindId: string;
  room: number;
  incumbents: string[];
  staff: number;
}

function store(api: CoreAPI) {
  return api.moduleState(BUSINESS_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function option(share: number, reasons: Record<string, number>): ActOffer {
  const row = share > 0 ? businessData.actions.draw : businessData.actions.keep;
  return {
    definition: {
      id: row.id,
      actKinds: row.actKinds,
      goalKinds: [],
      need: businessData.need,
      effortParameter: businessData.effortParameter,
      effectParameter: businessData.effectParameter,
      targetKind: businessData.targetKind,
      effect: businessData.effect,
    },
    targetId: `business-draw:${share}`,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: PULL,
      weightParameter: "one",
      arguments: { value: String(value), share: String(share) },
    })),
  };
}

/** The opening's owners: each business's highest-paid current worker, as owner-operator. */
function open(api: CoreAPI): void {
  const c = core(api);
  // Owners are generated as owner-operators until founding gives businesses their founders.
  stopgap("SG-WORLD-business-opening-owners");
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    const staff = [...(c.finance.jobsByOrganization.get(id) ?? [])]
      .map((jobId) => c.jobs.get(jobId)!)
      .filter((job) => job.endsAt === undefined && c.people.get(job.personId))
      .sort(
        (a, b) =>
          (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) ||
          c.people
            .get(a.personId)!
            .birthDate.localeCompare(c.people.get(b.personId)!.birthDate) ||
          a.id.localeCompare(b.id),
      );
    if (!staff.length) {
      // No full worker: the best-paid counted worker owns it, filled in when the player meets them.
      const counted = countedJobsOf(c, id).sort(
        (a, b) =>
          (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) ||
          a.id.localeCompare(b.id),
      )[0];
      if (counted) staff.push(counted);
    }
    if (!staff.length) continue;
    store(api)
      .table("owners")
      .put({
        id,
        isOwner: true,
        ownerId: staff[0]!.personId,
        since: c.date,
        basis: "highest-paid-worker",
        salesThrough: book.salesReceivedMinor,
        wagesThrough: book.wagesPaidMinor,
        operatingThrough: book.operatingPaidMinor,
        retainedMinor: 0,
        netThrough: netCash(c, id),
      });
  }
  store(api).table("state").put({ id: "business:state", openedAt: c.date });
  scheduleMonth(api);
}

function scheduleMonth(api: CoreAPI): void {
  const next =
    addDays(
      makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  api.moduleCalendar(BUSINESS_MODULE_ID).schedule({
    key: `month:${next}`,
    date: next,
    kind: "business-month",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: businessData.source.citation,
    },
    sourceRecordIds: ["business:state"],
  });
}

/** A business's cash less what it owes on its credit lines. */
function netCash(c: CoreState, organizationId: string): number {
  let owed = 0;
  for (const id of c.finance.facilitiesByBorrower.get(organizationId) ?? [])
    owed += c.finance.facilities.get(id)?.principalMinor ?? 0;
  return (c.organizations.get(organizationId)?.liquidMinor ?? 0) - owed;
}

/** The owner as a full person, or as a counted person until they are filled in. */
function ownerPerson(c: CoreState, personId: string) {
  const full = c.people.get(personId);
  if (full) return { person: full, full: true, alive: full.alive };
  const counted = residentPerson(c, personId);
  return counted
    ? {
        person: { ...counted, needs: {} as Record<string, number> },
        full: false,
        alive: true,
      }
    : undefined;
}

/**
 * The option a person takes: the shared chooser for a full person; for one
 * still counted, the option whose reasons sum highest (the same reasons).
 */
function decide(c: CoreState, personId: string, offers: ActOffer[]): ActOffer {
  if (c.people.has(personId)) return chooseAct(c, personId, offers).selected!;
  stopgap("SG-WORLD-business-counted-owner-choice");
  const score = (offer: ActOffer) =>
    (offer.reasonBindings ?? []).reduce(
      (n, row) => n + Number(row.arguments?.value ?? 0),
      0,
    );
  return [...offers].sort((a, b) => score(b) - score(a))[0]!;
}

/** Where an owner's money goes: their own cash, or their place's pooled residents account while counted. */
function ownerAccount(c: CoreState, personId: string): string | undefined {
  if (c.people.has(personId)) return personId;
  const placeId = residentPerson(c, personId)?.placeId;
  return residentsRuntime(c)?.input.accounts.find(
    (row) => row.placeId === placeId,
  )?.accountId;
}

/** An owner-operator who no longer works at the business, or an owner who has died, hands it on. */
function stillOwns(c: CoreState, row: OwnerRow): boolean {
  const operator =
    row.basis === "highest-paid-worker" || row.basis === "successor";
  if (!c.people.has(row.ownerId))
    return (
      !operator ||
      countedJobsOf(c, row.id).some((job) => job.personId === row.ownerId)
    );
  const owner = c.people.get(row.ownerId);
  if (!owner?.alive) return false;
  if (!operator) return true;
  const job = owner.jobId ? c.jobs.get(owner.jobId) : undefined;
  return job?.organizationId === row.id && job.endsAt === undefined;
}

/**
 * The next owner: the business's best-paid, longest-serving full worker,
 * else an adult in the owner's family who owns nothing yet.
 */
function successorOf(
  api: CoreAPI,
  row: OwnerRow,
  owners: ReadonlySet<string>,
): { personId: string; basis: string } | undefined {
  const c = core(api);
  const workers = [...(c.finance.jobsByOrganization.get(row.id) ?? [])]
    .map((id) => c.jobs.get(id)!)
    .filter(
      (job) =>
        job.endsAt === undefined &&
        job.personId !== row.ownerId &&
        c.people.get(job.personId)?.alive &&
        !owners.has(job.personId),
    )
    .sort(
      (a, b) =>
        (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) || a.id.localeCompare(b.id),
    );
  if (workers[0]) return { personId: workers[0].personId, basis: "successor" };
  const counted = countedJobsOf(c, row.id)
    .filter((job) => job.personId !== row.ownerId && !owners.has(job.personId))
    .sort(
      (a, b) =>
        (b.hourlyMinor ?? 0) - (a.hourlyMinor ?? 0) || a.id.localeCompare(b.id),
    )[0];
  if (counted) return { personId: counted.personId, basis: "successor" };
  const owner = c.people.get(row.ownerId);
  const family = [...(owner?.familyIds ?? [])]
    .map((id) => c.people.get(id))
    .filter(
      (person) =>
        person?.alive &&
        !owners.has(person.id) &&
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
          api.parameter("jobsDaysPerYear") >=
          api.parameter("businessFounderMinimumAge"),
    )
    .sort((a, b) => a!.birthDate.localeCompare(b!.birthDate));
  return family[0] ? { personId: family[0].id, basis: "heir" } : undefined;
}

function succeed(api: CoreAPI): void {
  const c = core(api);
  const rows = store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[];
  const owners = new Set(rows.map((row) => row.ownerId));
  for (const row of rows) {
    const book = c.finance.businesses.get(row.id);
    if (!book || book.closedAt || stillOwns(c, row)) continue;
    const next = successorOf(api, row, owners);
    const previous = ownerPerson(c, row.ownerId);
    store(api)
      .table("successions")
      .put({
        id: `succession:${row.id}:${c.date}`,
        organizationId: row.id,
        date: c.date,
        fromId: row.ownerId,
        toId: next?.personId ?? "",
        basis: next?.basis ?? "no-successor",
        cause: previous?.alive ? "stopped-working" : "died",
      });
    if (!next) {
      // Nobody to hand it to: it runs without a recorded owner until a voluntary closure exists.
      stopgap("SG-WORLD-business-no-successor");
      store(api).table("owners").remove(row.id);
      continue;
    }
    owners.delete(row.ownerId);
    owners.add(next.personId);
    store(api)
      .table("owners")
      .put({
        ...row,
        ownerId: next.personId,
        since: c.date,
        basis: next.basis,
      });
    api.emit({
      id: `event:organization.owner-changed:${row.id}:${c.date}`,
      date: c.date,
      kind: "organization.owner-changed",
      personIds: [next.personId, row.ownerId].filter(
        (id) => c.people.get(id)?.alive,
      ),
      placeId: c.organizations.get(row.id)?.placeId ?? "",
      source: {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: businessData.source.citation,
        estimatedFrom: `${row.ownerId} ${previous?.alive ? "stopped working at" : "died owning"} ${row.id}; ${next.personId} takes it on as ${next.basis}.`,
      },
      publicRecord: true,
      topic: row.id,
    });
  }
}

function month(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  succeed(api);
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    const book = c.finance.businesses.get(row.id),
      found = ownerPerson(c, row.ownerId),
      owner = found?.person,
      account = ownerAccount(c, row.ownerId);
    if (!book || book.closedAt || !owner || !found.alive || !account) continue;
    // Profit is what the business's net cash gained: every sale, wage, purchase and loan payment.
    const net = netCash(c, row.id);
    const profit = net - (row.netThrough ?? net);
    const retained = Math.max(0, row.retainedMinor + profit);
    const cash = c.organizations.get(row.id)!.liquidMinor;
    const cushion =
      (book.annualPayrollMinor / p("macroMonthsPerYear")) *
      p("businessCushionMonths");
    const ownerDays =
      owner.livingCostDailyMinor > 0
        ? owner.liquidMinor / owner.livingCostDailyMinor
        : Number.POSITIVE_INFINITY;
    const short = cushion > 0 ? Math.max(0, 1 - cash / cushion) : 0;
    const need = 1 / (1 + ownerDays / p("businessDaysPerMonth"));
    let drawn = 0,
      share = 0;
    if (retained > 0) {
      const selected = decide(
        c,
        owner.id,
        businessData.drawShares.map((s) =>
          option(s, {
            need: p("businessDrawNeedWeight") * need * s,
            keep: -p("businessDrawKeepWeight") * short * s,
            size: -p("businessDrawSizeWeight") * s * s,
          }),
        ),
      );
      share = Number(selected.targetId.split(":").at(-1));
      if (share > 0)
        drawn = transferCash(
          api,
          `owner-draw:${row.id}:${c.date}`,
          row.id,
          account,
          retained * share,
          {
            tag: "ESTIMATED",
            asOf: c.date,
            citation: businessData.source.citation,
            estimatedFrom: `The owner's draw: ${share} of ${retained} minor units of profit kept, chosen from their own money and the business's cash.`,
          },
        );
    }
    store(api)
      .table("draws")
      .put({
        id: `draw:${row.id}:${c.date}`,
        organizationId: row.id,
        ownerId: owner.id,
        date: c.date,
        profitMinor: profit,
        retainedBeforeMinor: retained,
        share,
        drawnMinor: drawn,
        cashMinor: cash,
        cushionMinor: cushion,
      });
    store(api)
      .table("owners")
      .put({
        ...row,
        isOwner: true,
        salesThrough: book.salesReceivedMinor,
        wagesThrough: book.wagesPaidMinor,
        operatingThrough: book.operatingPaidMinor,
        retainedMinor: retained - drawn,
        netThrough: net - drawn,
      });
  }
}

/** Room in each place's market for each kind: incumbents' demand above their capacity, as a share of capacity. */
function marketRoom(api: CoreAPI): Market[] {
  const c = core(api);
  const out = new Map<
    string,
    {
      placeId: string;
      kindId: string;
      demand: number;
      capacity: number;
      incumbents: string[];
      staff: number;
    }
  >();
  for (const [id, book] of c.finance.businesses) {
    const placeId = c.organizations.get(id)?.placeId;
    if (book.closedAt || !book.capacityMinor || !placeId) continue;
    const key = `${placeId}|${book.kindId}`;
    const row = out.get(key) ?? {
      placeId,
      kindId: book.kindId,
      demand: 0,
      capacity: 0,
      incumbents: [],
      staff: 0,
    };
    // Real demand, in the business's own opening prices.
    row.demand += book.annualDemandMinor / (book.price / book.anchorPrice || 1);
    row.capacity += book.capacityMinor;
    row.incumbents.push(id);
    row.staff +=
      (c.finance.jobsByOrganization.get(id)?.size ?? 0) +
      countedJobsOf(c, id).length;
    out.set(key, row);
  }
  return [...out.values()].map((row) => ({
    placeId: row.placeId,
    kindId: row.kindId,
    room: Math.max(0, row.demand / row.capacity - 1),
    incumbents: row.incumbents,
    staff: row.staff,
  }));
}

/**
 * Where a place's market has the most room: the owners of strong businesses
 * of that kind choose first whether to open a location there, then the
 * place's working-age adults choose whether to found one.
 */
function foundings(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const market = marketRoom(api)
    .filter(
      (row) =>
        row.room > 0 &&
        purchaseShareOf(
          c,
          new Set(row.incumbents),
          1 / (row.incumbents.length + 1),
        ) > 0,
    )
    .sort(
      (a, b) =>
        b.room - a.room ||
        a.placeId.localeCompare(b.placeId) ||
        a.kindId.localeCompare(b.kindId),
    )[0];
  if (!market) return;
  const traits = businessData.traits;
  const traitPull = (personId: string) => {
    const person = ownerPerson(c, personId)!.person;
    return (
      ((person.traits[traits.enterprising] ?? 0) +
        (person.traits[traits.risk] ?? 0)) /
      p("macroTraitScaleBoard")
    );
  };
  const ownerRows = store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[];
  // Owners of the kind's businesses anywhere, strongest books first.
  const growers = ownerRows
    .map((row) => {
      const book = c.finance.businesses.get(row.id);
      const owner = ownerPerson(c, row.ownerId);
      if (!book || book.closedAt || book.kindId !== market.kindId) return;
      if (!owner?.alive) return;
      const cash = c.organizations.get(row.id)!.liquidMinor;
      const cushion =
        (book.annualPayrollMinor / p("macroMonthsPerYear")) *
        p("businessCushionMonths");
      // Cash against its cushion, on a sliding scale from -1 (none) toward +1.
      const strength = cushion > 0 ? (cash - cushion) / (cash + cushion) : 0;
      return { row, owner, cash, cushion, strength };
    })
    .filter((row) => row !== undefined)
    .sort(
      (a, b) => b.strength - a.strength || a.row.id.localeCompare(b.row.id),
    );
  const decided = new Set<string>();
  for (const grower of growers) {
    const ownerId = grower.owner.person.id;
    if (decided.has(ownerId)) continue;
    decided.add(ownerId);
    const selected = decide(c, ownerId, [
      option(0, {}),
      expandOption(market.kindId, {
        baseline: p("businessExpandBaseline"),
        room: p("businessFoundRoomWeight") * market.room,
        traits: p("businessFoundTraitWeight") * traitPull(ownerId),
        books: p("businessExpandStrengthWeight") * grower.strength,
      }),
    ]);
    if (selected.definition.id !== businessData.actions.expand.id) continue;
    found(api, ownerId, market, {
      parentId: grower.row.id,
      // The parent funds the location from cash above its own cushion.
      fundsMinor: Math.max(0, grower.cash - grower.cushion),
      strength: grower.strength,
    });
    return;
  }
  const owners = new Set(ownerRows.map((row) => row.ownerId));
  const seekers = c.modules.has("jobs")
    ? api.moduleState("jobs").table("seekers")
    : undefined;
  for (const person of [...c.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const age =
      daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
      p("jobsDaysPerYear");
    if (
      !person.alive ||
      person.placeId !== market.placeId ||
      owners.has(person.id) ||
      age < p("businessFounderMinimumAge") ||
      age >= p("businessFounderMaximumAge")
    )
      continue;
    const unemployed = seekers?.get(person.id) && !person.jobId ? 1 : 0;
    const result = chooseAct(c, person.id, [
      option(0, {}),
      foundOption(market.kindId, {
        baseline: p("businessFoundBaseline"),
        room: p("businessFoundRoomWeight") * market.room,
        traits: p("businessFoundTraitWeight") * traitPull(person.id),
        lostWork: p("businessFoundUnemployedWeight") * unemployed,
      }),
    ]);
    if (result.selected!.definition.id !== businessData.actions.found.id)
      continue;
    found(api, person.id, market);
    // One opening a month; the next month's room is measured afresh.
    return;
  }
}

function expandOption(
  kindId: string,
  reasons: Record<string, number>,
): ActOffer {
  const base = foundOption(kindId, reasons);
  return {
    ...base,
    definition: {
      ...base.definition,
      id: businessData.actions.expand.id,
      actKinds: businessData.actions.expand.actKinds,
    },
    targetId: `business-expand:${kindId}`,
  };
}

function foundOption(
  kindId: string,
  reasons: Record<string, number>,
): ActOffer {
  const base = option(1, reasons);
  return {
    ...base,
    definition: {
      ...base.definition,
      id: businessData.actions.found.id,
      actKinds: businessData.actions.found.actKinds,
    },
    targetId: `business-found:${kindId}`,
  };
}

function found(
  api: CoreAPI,
  founderId: string,
  market: Market,
  location?: { parentId: string; fundsMinor: number; strength: number },
): boolean {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const kindId = market.kindId;
  const founder = ownerPerson(c, founderId)!.person;
  const id = location
    ? `organization:location:${location.parentId}:${market.placeId}:${c.date}`
    : `organization:founded:${kindId}:${founderId}:${c.date}`;
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation: businessData.source.citation,
    estimatedFrom: `${location ? `A location of ${location.parentId}, opened by its owner ${founderId}` : `Founded by ${founderId}`} where the place's ${kindId} businesses had demand ${(market.room * 100).toFixed(1)} percent above their capacity.`,
  };
  const parentName = location
    ? c.organizations.get(location.parentId)?.name
    : undefined;
  const share = 1 / (market.incumbents.length + 1);
  // No customers to win (no buyers reach this market's businesses): nothing to found.
  if (purchaseShareOf(c, new Set(market.incumbents), share) <= 0) return false;
  api.addOrganization({
    id,
    placeId: market.placeId,
    name:
      parentName ??
      businessData.namePattern
        .replace("{founder}", founder.familyName)
        .replace("{kind}", kindId),
    kind: "employer",
    liquidMinor: 0,
    source,
  });
  const annualDemandMinor = shiftPurchaseShare(
    c,
    new Set(market.incumbents),
    id,
    share,
  );
  const monthly = Math.round(annualDemandMinor / p("macroMonthsPerYear"));
  const kind = DEFAULT_BUSINESS_BOOKS_DATA.kinds.find(
    (row) => row.id === kindId,
  )!;
  const annualPayrollMinor = annualDemandMinor * p(kind.payrollShareParameter);
  const annualOtherCostsMinor = Math.max(
    0,
    annualDemandMinor * (1 - p(kind.marginParameter)) - annualPayrollMinor,
  );
  api.addBusinessBooks({
    organizationId: id,
    kindId,
    annualPayrollMinor,
    annualDemandMinor,
    annualOtherCostsMinor,
    // The town's income as an incumbent's books have reached it today, so demand projects from now.
    openingTownIncomeMinor: Math.round(
      market.incumbents
        .map((id) => c.finance.businesses.get(id))
        .filter((row) => row && row.openingTownIncomeMinor > 0)
        .map(
          (row) => row!.reachedIncomeRatio * row!.openingTownIncomeMinor,
        )[0] ?? 0,
    ),
    capacityMinor: annualDemandMinor,
    price: 1,
    costContractIds: [],
    source,
  });
  const startup =
    ((annualPayrollMinor + annualOtherCostsMinor) / p("macroMonthsPerYear")) *
    p("businessStartupMonthsOfCosts");
  // A location is funded first from its parent's spare cash; a loan covers the rest.
  const funded = location
    ? transferCash(
        api,
        `location-funding:${id}`,
        location.parentId,
        id,
        Math.min(startup, location.fundsMinor),
        source,
      )
    : 0;
  const loan =
    startup - funded > 0
      ? lendForFounding(
          api,
          id,
          startup - funded,
          p("businessStartupTermMonths"),
        )
      : 0;
  const book = c.finance.businesses.get(id)!;
  store(api)
    .table("owners")
    .put({
      id,
      isOwner: true,
      ownerId: founderId,
      since: c.date,
      basis: location ? "location" : "founder",
      ...(location ? { parentId: location.parentId } : {}),
      salesThrough: book.salesReceivedMinor,
      wagesThrough: book.wagesPaidMinor,
      operatingThrough: book.operatingPaidMinor,
      retainedMinor: 0,
      netThrough: netCash(c, id),
    });
  if (c.modules.has("jobs"))
    registerEmployer(
      api,
      id,
      Math.max(1, Math.round(market.staff * share)),
      location?.parentId ?? market.incumbents[0],
    );
  store(api)
    .table("foundings")
    .put({
      id,
      organizationId: id,
      founderId,
      kindId,
      placeId: market.placeId,
      date: c.date,
      room: market.room,
      customersMonthlyMinor: monthly,
      loanMinor: loan,
      parentFundsMinor: funded,
      incumbents: market.incumbents.length,
      ...(location
        ? { parentId: location.parentId, parentStrength: location.strength }
        : {}),
    });
  api.emit({
    id: `event:organization.founded:${id}`,
    date: c.date,
    kind: "organization.founded",
    personIds: c.people.has(founderId) ? [founderId] : [],
    placeId: market.placeId,
    source,
    publicRecord: true,
    topic: id,
  });
  return true;
}

/** Who owns a business, for jobs (who decided a layoff) and the bench. */
export function ownerOf(
  api: CoreAPI,
  organizationId: string,
): string | undefined {
  if (!(api.state as CoreState).modules.has(BUSINESS_MODULE_ID))
    return undefined;
  return (
    store(api).table("owners").get(organizationId) as OwnerRow | undefined
  )?.ownerId;
}

export const BUSINESS_MODULE: CoreModule = {
  id: BUSINESS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      owners: { indexes: { all: { fields: ["isOwner"] } } },
      draws: { indexes: { byOrganization: { fields: ["organizationId"] } } },
      foundings: {},
      successions: {},
    },
  },
  reasonProviders: {
    [PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  onCalendarWork(api, work) {
    if (work.kind !== "business-month") return;
    month(api);
    foundings(api);
    scheduleMonth(api);
  },
  onDay(api) {
    if (!store(api).table("state").get("business:state")) open(api);
  },
};
