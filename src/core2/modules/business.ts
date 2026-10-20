/**
 * Businesses growing: every business has an owner, and each month the owner
 * chooses how much of that month's profit to draw, never more than the
 * profit the business has kept. Where a place's market for a kind of
 * business has room, the owners of that kind's strong businesses choose
 * first whether to open another location there; if none does, the place's
 * adults choose whether to found one. Chains are repeated growth, never
 * scripted. Every payment moves through the ledger.
 */
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import resourceParameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { chooseAct } from "../choice";
import { countedPayment } from "../counted-money";
import { depositsHeld, withdrawSavings } from "../accounts";
import businessData from "../data/business/business.json" with { type: "json" };
import businessParameters from "../data/business/parameters.json" with { type: "json" };
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import { ageOnDate } from "../kernel/dates";
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { traitLeanBetween } from "../trait-decisions";
import type {
  ActOffer,
  CoreAPI,
  CoreState,
  PersonState,
  Source,
} from "../types";
import type {
  HistoryWriter,
  PreStartModule,
  PreStartWindow,
} from "../pre-start";
import bdsRates from "../data/business/bds-rates.json" with { type: "json" };
import ownership from "../data/business/ownership.json" with { type: "json" };
import openingFinance from "../data/opening-finance.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import { businessName, businessNameContext } from "../business-names";
import type { BusinessBooksState } from "../finance-types";
import {
  addResidentFlow,
  countedHeadcountOf,
  countedJobsOf,
  purchaseShareOf,
  shiftPurchaseShare,
} from "../residents-economy";
import {
  residentPerson,
  countedFundOf,
  residentsRuntime,
  supplierBillsOwed,
} from "./residents";
import { foundingLoanLimit, lendForFounding } from "./credit";
import { registerEmployer, strongestPulls } from "./jobs";
import { transferCash } from "../world-transfer";
import {
  addRegulatoryCost,
  countyNonattainment,
  endOperatingRule,
  setOperatingLimit,
} from "../business-operating-rules";

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
  /**
   * Months of revenue lost to operating losses (sales less wages, purchases,
   * outside costs and compliance costs from the books), decayed over the
   * memory window and floored at zero: what pulls an owner toward closing.
   */
  lossMonths?: number;
  /** The outside-costs flow's cumulative paid at the last snapshot. */
  outsideThrough?: number;
  tradingId?: string;
}

/** A completed month's actual trading, read by the staffing decision. */
export interface BusinessTradingMonth {
  id: string;
  organizationId: string;
  date: string;
  from: string;
  days: number;
  salesMinor: number;
  payrollMinor: number;
  costsMinor: number;
  complianceMinor: number;
  lossMonths: number;
}

export function businessTradingMonth(
  api: CoreAPI,
  organizationId: string,
): BusinessTradingMonth | undefined {
  if (!core(api).modules.has(BUSINESS_MODULE_ID)) return undefined;
  const owner = store(api).table("owners").get(organizationId) as
    OwnerRow | undefined;
  return owner?.tradingId
    ? (store(api).table("trading").get(owner.tradingId) as unknown as
        BusinessTradingMonth | undefined)
    : undefined;
}

interface Market {
  placeId: string;
  kindId: string;
  room: number;
  incumbents: string[];
  staff: number;
  /** The incumbents' annual demand, nominal. */
  demandMinor: number;
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

const OUTSIDE_FIRM = "outside-firm";

/**
 * The opening's businesses that belong to firms based outside the town: the
 * largest by staff, in order, until their share of the town's jobs reaches
 * the state's share of employment in multi-establishment firms (Census).
 * Their parent is the place's outside account.
 */
function outsideOwned(api: CoreAPI): Map<string, string> {
  const c = core(api);
  const usps = c.placeMetadata?.housingState ?? "";
  const share =
    (ownership.byState as Record<string, number>)[usps] ?? ownership.national;
  const sized = [...c.finance.businesses.entries()]
    .filter(([, book]) => !book.closedAt)
    .map(([id]) => ({
      id,
      placeId: c.organizations.get(id)?.placeId,
      staff:
        [...(c.finance.jobsByOrganization.get(id) ?? [])].filter(
          (jobId) => c.jobs.get(jobId)?.endsAt === undefined,
        ).length + countedHeadcountOf(c, id),
    }))
    .sort((a, b) => b.staff - a.staff || a.id.localeCompare(b.id));
  const total = sized.reduce((n, row) => n + row.staff, 0);
  const out = new Map<string, string>();
  let taken = 0;
  for (const row of sized) {
    // Stop where one more would overshoot the share by more than it falls short.
    if (taken + row.staff / 2 > share * total) break;
    const parent = [...c.organizations.values()].find(
      (org) => org.placeId === row.placeId && org.outsideFlow !== undefined,
    )?.id;
    if (!parent) continue;
    out.set(row.id, parent);
    taken += row.staff;
  }
  return out;
}

/** The opening's owners: each business's highest-paid current worker, as owner-operator. */
function open(api: CoreAPI): void {
  const c = core(api);
  // Owners are generated as owner-operators until founding gives businesses their founders.
  stopgap("SG-WORLD-business-opening-owners");
  const outside = outsideOwned(api);
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt) continue;
    const parent = outside.get(id);
    if (parent) {
      store(api)
        .table("owners")
        .put({
          id,
          isOwner: true,
          ownerId: parent,
          since: c.date,
          basis: OUTSIDE_FIRM,
          salesThrough: book.salesReceivedMinor,
          wagesThrough: book.wagesPaidMinor,
          operatingThrough: book.operatingPaidMinor,
          retainedMinor: 0,
          netThrough: netCash(c, id),
        });
      continue;
    }
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

/** A business's cash less what it owes on its credit lines and to its suppliers. */
function netCash(c: CoreState, organizationId: string): number {
  // Supplier bills accrued on its sales are owed already, though not yet billed.
  // Whole cents: the books never carry a fraction of a cent.
  let owed = Math.floor(supplierBillsOwed(c, organizationId));
  for (const id of c.finance.facilitiesByBorrower.get(organizationId) ?? [])
    owed += c.finance.facilities.get(id)?.principalMinor ?? 0;
  return Math.round(
    (c.organizations.get(organizationId)?.liquidMinor ?? 0) +
      depositsHeld(c, organizationId) -
      owed,
  );
}

/** A counted person's household id, place and head count, read from the groups' store (no person record is built). */
function countedFacts(
  c: CoreState,
  personId: string,
): { householdId: string; placeId: string; people: number } | undefined {
  const store = residentsRuntime(c)?.store;
  const m = store?.countedMember(personId);
  if (m === undefined) return undefined;
  const h = store!.households[store!.household[m]!]!;
  return {
    householdId: h.id,
    placeId: store!.strings[store!.placeIx[m]!]!,
    people: store!.countedCount(h),
  };
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

/** A household's common savings are available to a founder on the same per-person basis in either tier. */
function founderSavings(
  c: CoreState,
  personId: string,
): { holderId: string; minor: number } {
  const person = c.people.get(personId);
  const counted = person ? undefined : countedFacts(c, personId);
  const holderId = person?.householdId ?? counted?.householdId ?? "";
  const full = c.households.get(holderId);
  const people = full
    ? full.memberIds.filter((id) => c.people.get(id)?.alive).length
    : (counted?.people ?? 0);
  return {
    holderId,
    minor: people ? Math.floor(depositsHeld(c, holderId) / people) : 0,
  };
}

/** Where an owner's money goes: their own cash, or their place's pooled residents account while counted. */
function ownerAccount(c: CoreState, personId: string): string | undefined {
  if (c.people.has(personId) || c.organizations.has(personId)) return personId;
  const placeId = countedFacts(c, personId)?.placeId;
  return residentsRuntime(c)?.input.accounts.find(
    (row) => row.placeId === placeId,
  )?.accountId;
}

/** An owner-operator who no longer works at the business, or an owner who has died, hands it on. */
function stillOwns(c: CoreState, row: OwnerRow): boolean {
  if (row.basis === OUTSIDE_FIRM) return true;
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

/**
 * Where a dead owner's closing proceeds go: a living member of their household,
 * else the nearest living relative (a partner, then a child, then a parent, from
 * the family links; then any other kin), else the place's outside account, as
 * such (the closure's choice record names it as the owner it paid).
 */
export function estateHeir(
  api: CoreAPI,
  organizationId: string,
  ownerId: string,
) {
  const c = core(api);
  const alive = (id: string) => c.people.get(id)?.alive === true;
  const housemate = c.households
    .get(c.people.get(ownerId)?.householdId ?? "")
    ?.memberIds.find(alive);
  if (housemate) return housemate;
  const rank = (link: { kind: string; personIds: readonly string[] }) =>
    link.kind === "partner" ? 0 : link.personIds[0] === ownerId ? 1 : 2;
  const near = [...c.familyLinks.values()]
    .filter((link) => link.personIds.includes(ownerId as never))
    .map((link) => ({
      id: link.personIds.find((id) => id !== ownerId)!,
      rank: rank(link),
    }))
    .filter((row) => alive(row.id))
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
  if (near[0]) return near[0].id;
  const kin = [...(c.people.get(ownerId)?.familyIds ?? [])]
    .filter(alive)
    .sort();
  if (kin[0]) return kin[0];
  const placeId = c.organizations.get(organizationId)?.placeId;
  return (
    [...c.organizations.values()].find(
      (org) => org.placeId === placeId && org.outsideFlow !== undefined,
    )?.id ?? ownerId
  );
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
      // Nobody to hand it to: the owner (or, if they died, their household) closes it and takes what's left.
      const heir = previous?.alive
        ? row.ownerId
        : estateHeir(api, row.id, row.ownerId);
      closeByChoice(api, row.id, heir, businessData.reasons.noSuccessor);
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

/** A union local keeps a cushion of its own payroll and sends the rest of its dues to its international, outside the town. */
function membershipPayouts(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  for (const org of c.organizations.values()) {
    if (
      (org as { classification?: string }).classification !==
      "membership:labor-union"
    )
      continue;
    const outside = [...c.organizations.values()].find(
      (row) => row.placeId === org.placeId && row.outsideFlow !== undefined,
    );
    if (!outside) continue;
    let daily = 0;
    for (const id of c.finance.jobsByOrganization.get(org.id) ?? []) {
      const job = c.jobs.get(id);
      if (job && job.endsAt === undefined) daily += job.wageDailyMinor;
    }
    const cushion =
      ((daily * p("jobsDaysPerYear")) / p("macroMonthsPerYear")) *
      p("businessCushionMonths");
    const excess = org.liquidMinor - cushion;
    if (excess > 0)
      transferCash(
        api,
        `per-capita:${org.id}:${c.date}`,
        org.id,
        outside.id,
        excess,
        {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: businessData.source.citation,
          estimatedFrom:
            "Dues above the local's payroll cushion go to its international union as per-capita payments.",
        },
      );
  }
}

/** The owner closes the business by choice; its remaining cash goes to them (or their place's pool while counted). */
function closeByChoice(
  api: CoreAPI,
  organizationId: string,
  ownerId: string,
  reasonKey: string,
  values: Readonly<Record<string, number>> = {},
): boolean {
  const c = core(api);
  const account = ownerAccount(c, ownerId),
    book = c.finance.businesses.get(organizationId);
  if (!account || !book || book.closedAt) return false;
  const closureSource = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation: businessData.source.citation,
    estimatedFrom: `${ownerId} closed ${organizationId}: ${reasonKey}.`,
  };
  withdrawSavings(c, api, {
    id: `closure-savings:${organizationId}:${c.date}`,
    holderId: organizationId,
    customerAccountId: api.accounts().main(organizationId),
    amountMinor: depositsHeld(c, organizationId),
    source: closureSource,
  });
  store(api)
    .table("choices")
    .put({
      id: `choice:${organizationId}:${c.date}`,
      organizationId,
      ownerId,
      date: c.date,
      reasonKey,
      decidedAs: c.people.has(ownerId) ? "full" : "counted",
      values: { ...values },
    });
  api.closeBusinessByChoice({
    organizationId,
    ownerAccountId:
      !c.people.has(ownerId) && !c.organizations.has(ownerId)
        ? countedFundOf(c, countedFacts(c, ownerId)!.householdId)!
        : api.accounts().main(account),
    reasonKey,
    source: closureSource,
  });
  return true;
}

function closeOffer(
  close: boolean,
  organizationId: string,
  reasons: Record<string, number>,
): ActOffer {
  const row = close ? businessData.actions.close : businessData.actions.carryOn;
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
    targetId: `business-close:${organizationId}:${close ? 1 : 0}`,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: PULL,
      weightParameter: "one",
      arguments: { value: String(value) },
    })),
  };
}

/**
 * An outside firm's pulls to close, summed against the stay bar: the
 * operating losses (months of revenue lost), the age pull, the cash runway
 * left while losing money, and payroll the business could not meet. The
 * share they add up to slides from nothing at the bar to a sure closing across
 * the ramp (never quite 1), so nothing flips at a threshold.
 */
export function countedClosurePulls(
  api: CoreAPI,
  book: BusinessBooksState,
  lossMonths: number,
  agePull: number,
  netCashMinor: number,
): {
  share: number;
  bar: number;
  pulls: { losses: number; age: number; runway: number; conditions: number };
} {
  const p = (key: string) => api.parameter(key);
  const monthlyCosts =
    (book.annualPayrollMinor + book.annualOtherCostsMinor) /
    p("macroMonthsPerYear");
  const runway = monthlyCosts > 0 ? netCashMinor / monthlyCosts : 0;
  const monthlyPayroll = book.annualPayrollMinor / p("macroMonthsPerYear");
  const pulls = {
    losses: p("businessCloseLossWeight") * lossMonths,
    age: agePull,
    // Little cash cover matters when the business is losing money.
    runway:
      p("businessCloseRunwayWeight") *
      Math.max(0, 1 - runway / p("businessCloseRunwayMonths")) *
      Math.min(1, lossMonths),
    conditions:
      monthlyPayroll > 0
        ? p("businessCloseConditionsWeight") *
          (Math.max(0, book.wagesUnpaidMinor) / monthlyPayroll)
        : 0,
  };
  const bar = p("businessCloseStayBar");
  const share = Math.min(
    1 - 1e-9,
    Math.max(
      0,
      (pulls.losses + pulls.age + pulls.runway + pulls.conditions - bar) /
        p("businessCloseRampWidth"),
    ),
  );
  return { share, bar, pulls };
}

/**
 * Each owner weighs closing against carrying on: the business's operating
 * losses over the recent months (in months of revenue lost, from its books)
 * and the owner's years past the usual retirement age pull toward closing. A
 * full owner decides through the shared chooser. An outside firm's pulls (the
 * same losses and age, the cash runway left while losing money, and payroll the
 * business could not meet) are summed against a stay bar and slide from nothing
 * to a sure closing across a ramp, so no fixed rate decides how many close;
 * the state's exit rate only checks totals in a test.
 */
function reviewClosures(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const counted: {
    id: string;
    ownerId: string;
    score: number;
    reasons: Record<string, number>;
  }[] = [];
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    const book = c.finance.businesses.get(row.id);
    const outsideFirm = row.basis === OUTSIDE_FIRM;
    const found = outsideFirm ? undefined : ownerPerson(c, row.ownerId);
    if (!book || book.closedAt || (!outsideFirm && !found?.alive)) continue;
    // Operating losses from the books, not cash against opening cash.
    const losses = row.lossMonths ?? 0;
    // A firm based elsewhere weighs a branch's losses; it doesn't age out.
    const age = found
      ? ageOnDate(makeIsoDate(found.person.birthDate), makeIsoDate(c.date))
      : p("jobsEarliestRetirementAge");
    const reasons = {
      baseline: p("businessCloseBaseline"),
      losses: p("businessCloseLossWeight") * losses,
      age:
        (p("businessCloseAgeWeight") *
          Math.max(0, age - p("jobsEarliestRetirementAge"))) /
        p("businessCloseAgeYears"),
    };
    if (!outsideFirm) {
      const chosen = chooseAct(c, row.ownerId, [
        closeOffer(false, row.id, {}),
        closeOffer(true, row.id, reasons),
      ]).selected!;
      if (chosen.definition.id === businessData.actions.close.id)
        closeByChoice(
          api,
          row.id,
          row.ownerId,
          reasons.losses > reasons.age
            ? businessData.reasons.losses
            : businessData.reasons.retiring,
          reasons,
        );
    } else {
      // Outside firm: causes summed against the stay bar, sliding.
      const { share, pulls, bar } = countedClosurePulls(
        api,
        book,
        losses,
        reasons.age,
        netCash(c, row.id),
      );
      if (share > 0)
        counted.push({
          id: row.id,
          ownerId: row.ownerId,
          // strongestPulls reads a score as a logistic; this is the ramp's share.
          score: Math.log(share / (1 - share)),
          reasons: { stayBar: -bar, ...pulls },
        });
    }
  }
  if (!counted.length) return;
  for (const row of strongestPulls(api, "business-close", counted))
    closeByChoice(
      api,
      row.id,
      row.ownerId,
      (row.reasons.age ?? 0) >
        (row.reasons.losses ?? 0) +
          (row.reasons.runway ?? 0) +
          (row.reasons.conditions ?? 0)
        ? businessData.reasons.retiring
        : businessData.reasons.losses,
      row.reasons,
    );
}

/** A branch of a firm based elsewhere sends its parent the cash above its cushion, out of the profit it has kept. */
function sweepToParent(api: CoreAPI, row: OwnerRow): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const book = c.finance.businesses.get(row.id);
  if (!book || book.closedAt) return;
  const net = netCash(c, row.id);
  const retained = row.retainedMinor + (net - (row.netThrough ?? net));
  const cash = c.organizations.get(row.id)!.liquidMinor;
  const cushion =
    (book.annualPayrollMinor / p("macroMonthsPerYear")) *
    p("businessCushionMonths");
  const swept =
    retained > 0
      ? transferCash(
          api,
          `parent-sweep:${row.id}:${c.date}`,
          row.id,
          row.ownerId,
          Math.min(retained, Math.max(0, cash - cushion)),
          {
            tag: "ESTIMATED",
            asOf: c.date,
            citation: businessData.source.citation,
            estimatedFrom:
              "A branch of a firm based outside the town sends its parent the cash above its cushion, out of profit it has kept.",
          },
        )
      : 0;
  store(api)
    .table("owners")
    .put({
      ...row,
      isOwner: true,
      ...bookedMonth(api, row, book),
      retainedMinor: retained - swept,
      netThrough: net - swept,
    });
}

/** A business's compliance payments this month, from the books of what it paid. */
function complianceThisMonth(api: CoreAPI, organizationId: string): number {
  let total = 0;
  for (const row of store(api)
    .table("compliance")
    .query("byOrganization", [organizationId]) as unknown as {
    date: string;
    paidMinor: number;
  }[])
    if (row.date === core(api).date) total += row.paidMinor;
  return total;
}

/**
 * The counters to keep at the end of a month: the books' running totals, the
 * outside-costs flow's paid so far, and the months of revenue lost (this
 * month's operating result from the books, fading the older months over the
 * memory window). Operating result is sales less wages, purchases from
 * suppliers, costs bought outside the town and compliance costs.
 */
function bookedMonth(
  api: CoreAPI,
  row: OwnerRow,
  book: BusinessBooksState,
): Pick<
  OwnerRow,
  | "salesThrough"
  | "wagesThrough"
  | "operatingThrough"
  | "outsideThrough"
  | "lossMonths"
  | "tradingId"
> {
  const outsidePaid =
    residentsRuntime(core(api))?.flows.get(`outside-costs:${row.id}`)
      ?.outsidePaidMinor ?? 0;
  const sales = book.salesReceivedMinor - row.salesThrough;
  const payrollMinor = book.wagesPaidMinor - row.wagesThrough;
  const complianceMinor = complianceThisMonth(api, row.id);
  const costs =
    book.wagesPaidMinor -
    row.wagesThrough +
    (book.operatingPaidMinor - row.operatingThrough) +
    (outsidePaid - (row.outsideThrough ?? 0)) +
    complianceMinor;
  const base = Math.max(sales, costs);
  const lost = base > 0 ? Math.max(-1, Math.min(1, (costs - sales) / base)) : 0;
  const lossMonths = Math.max(
    0,
    (row.lossMonths ?? 0) *
      (1 - 1 / api.parameter("businessLossMemoryMonths")) +
      lost,
  );
  const tradingId = `business-trading:${row.id}:${api.state.date}`;
  const previous = row.tradingId
    ? (store(api).table("trading").get(row.tradingId) as unknown as
        BusinessTradingMonth | undefined)
    : undefined;
  const from = previous?.date ?? row.since;
  const days = daysBetween(makeIsoDate(from), makeIsoDate(api.state.date));
  store(api).table("trading").put({
    id: tradingId,
    organizationId: row.id,
    date: api.state.date,
    from,
    days,
    salesMinor: sales,
    payrollMinor,
    costsMinor: costs,
    complianceMinor,
    lossMonths,
  });
  return {
    salesThrough: book.salesReceivedMinor,
    wagesThrough: book.wagesPaidMinor,
    operatingThrough: book.operatingPaidMinor,
    outsideThrough: outsidePaid,
    lossMonths,
    tradingId,
  };
}

const CLEAN_AIR_QUESTION =
  "us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties";

/**
 * A place out of attainment of an air quality standard (EPA Green Book) puts a
 * clean air plan's compliance duty on its stationary emitters; the duty slides
 * with how many standards the county misses and whether the designation covers
 * the whole county or part. A county that attains them all lifts it.
 */
function routeCompliance(api: CoreAPI): void {
  const c = core(api),
    table = store(api).table("operating");
  const county = c.placeMetadata?.housingCounty ?? "";
  // The duty is federal (Clean Air Act, nonattainment areas) whatever a state
  // says; where a state's clean air plan is law, the cost cites that row.
  const plan = c.modules.has(LAWS_MODULE_ID)
    ? lawInForce(api, CLEAN_AIR_QUESTION)
    : undefined;
  const governing = plan?.value === 1 ? plan.governing : null;
  const year = Number(c.date.slice(0, 4));
  const standards = county
    ? countyNonattainment(county, year).filter((row) => !row.revoked)
    : [];
  const weight = standards.reduce(
    (n, row) =>
      n +
      (row.extent === "whole"
        ? 1
        : api.parameter("businessComplianceInPartShare")),
    0,
  );
  const share = api.parameter("businessComplianceShareOfCosts") * weight;
  for (const [id, book] of c.finance.businesses) {
    if (book.closedAt || !businessData.compliance.kinds.includes(book.kindId))
      continue;
    const ruleId = `cost:${id}:${businessData.compliance.cause}`;
    const existing = table.get(ruleId) as
      { share: number; source?: { citation?: string } } | undefined;
    if (share <= 0) {
      if (existing) endOperatingRule(api, table, ruleId);
      continue;
    }
    // The cost stands while the same share and the same law row govern.
    const cited = governing
      ? `${governing.id}: ${String(governing.source)}; ${businessData.compliance.citation}`
      : businessData.compliance.citation;
    if (
      existing &&
      existing.share === share &&
      existing.source?.citation === cited
    )
      continue;
    stopgap("SG-WORLD-business-compliance-cost");
    addRegulatoryCost(api, table, {
      organizationId: id,
      shareOfCosts: share,
      cause: businessData.compliance.cause,
      source: {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: cited,
        estimatedFrom: `${county} misses ${standards.length} air quality standard(s) in ${year} (EPA Green Book); a clean air plan costs ${share} of other operating costs.`,
      },
    });
  }
}

/**
 * Each month every business with compliance rows pays them on the journal, to
 * the payee a row names or else the place's outside account, as such; each
 * payment is a record, and the books (operating results, so closures) read it.
 */
function payCompliance(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  for (const row of store(api)
    .table("operating")
    .query("all", [true]) as unknown as {
    id: string;
    organizationId: string;
    kind: string;
    share: number;
    cause: string;
    payeeId?: string;
    source: Parameters<typeof transferCash>[5];
  }[]) {
    if (row.kind !== "cost") continue;
    const book = c.finance.businesses.get(row.organizationId);
    if (!book || book.closedAt) continue;
    const placeId = c.organizations.get(row.organizationId)?.placeId;
    const outside = [...c.organizations.values()].find(
      (org) => org.placeId === placeId && org.outsideFlow !== undefined,
    )?.id;
    const to = row.payeeId ?? outside;
    if (!to) continue;
    const requested = Math.floor(
      (book.annualOtherCostsMinor * row.share) / p("macroMonthsPerYear"),
    );
    const paid = transferCash(
      api,
      `compliance:${row.id}:${c.date}`,
      row.organizationId,
      to,
      requested,
      row.source,
    );
    store(api)
      .table("compliance")
      .put({
        id: `compliance:${row.id}:${c.date}`,
        organizationId: row.organizationId,
        ruleId: row.id,
        cause: row.cause,
        date: c.date,
        requestedMinor: requested,
        paidMinor: paid,
        payeeId: to,
        outsideTheTown: to === outside,
      });
  }
}

/** The town's businesses that sell each kind of good, by place and classification. */
function townSellers(c: CoreState): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [id, book] of c.finance.businesses) {
    const org = c.organizations.get(id);
    if (book.closedAt || !org || org.outsideFlow) continue;
    const key = `${org.placeId}|${classificationOf(c, id)}`;
    index.set(key, [...(index.get(key) ?? []), id]);
  }
  for (const ids of index.values())
    ids.sort(
      (a, b) =>
        (c.finance.businesses.get(b)?.annualDemandMinor ?? 0) -
          (c.finance.businesses.get(a)?.annualDemandMinor ?? 0) ||
        a.localeCompare(b),
    );
  return index;
}

function classificationOf(c: CoreState, organizationId: string): string {
  return (
    c.organizations.get(organizationId)?.classification ??
    DEFAULT_BUSINESS_BOOKS_DATA.classifications.find(
      (row) => row.kindId === c.finance.businesses.get(organizationId)?.kindId,
    )?.classification ??
    ""
  );
}

/**
 * Costs a business pays outside the town are recorded as such: a row naming
 * the good (the cost's finance kind) and the amount paid since the last
 * record, and who got it. Where a town business sold the goods, its books
 * take the sale.
 */
function recordOutsideCosts(api: CoreAPI): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    const flow = rt.flows.get(`outside-costs:${row.id}`);
    if (!flow) continue;
    const amount = (flow.outsidePaidMinor ?? 0) - (row.outsideThrough ?? 0);
    if (!(amount > 0)) continue;
    const seller = c.finance.businesses.get(flow.payeeId);
    const inTown =
      seller !== undefined && !c.organizations.get(flow.payeeId)?.outsideFlow;
    store(api)
      .table("outsideCosts")
      .put({
        id: `outside-cost:${row.id}:${c.date}`,
        organizationId: row.id,
        date: c.date,
        good: flow.financeKind,
        amountMinor: amount,
        payeeId: flow.payeeId,
        paidInTown: inTown,
      });
    if (inTown) {
      seller.receivedMinor += amount;
      seller.salesReceivedMinor += amount;
    }
  }
}

/**
 * A business's outside costs are paid to the town business that sells that
 * classification of goods when one is open (the opening's supplier rules say
 * which classification sells to which buyer), else to the outside account.
 */
function routeOutsideCosts(api: CoreAPI): void {
  const c = core(api),
    rt = residentsRuntime(c);
  if (!rt) return;
  const sellers = townSellers(c);
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    const flow = rt.flows.get(`outside-costs:${row.id}`),
      book = c.finance.businesses.get(row.id);
    if (!flow || !book || book.closedAt) continue;
    const placeId = c.organizations.get(row.id)?.placeId;
    const rule = openingFinance.supplierRules.find((r) =>
      r.buyerClassifications.includes(classificationOf(c, row.id)),
    );
    const seller = (rule?.supplierClassifications ?? [])
      .flatMap(
        (classification) => sellers.get(`${placeId}|${classification}`) ?? [],
      )
      .find((id) => id !== row.id);
    const want = seller ?? flow.residentsId;
    if (flow.payeeId !== want) flow.payeeId = want;
    if (flow.endedReason === "payee-closed") {
      // The supplier it was paying closed: the costs go on, to another seller or outside.
      delete flow.endedAt;
      delete flow.endedReason;
      flow.nextAt = addDays(makeIsoDate(c.date), 1);
      const due = rt.due.get(flow.nextAt) ?? new Set<string>();
      due.add(flow.id);
      rt.due.set(flow.nextAt, due);
    }
  }
}

/** Read the withdrawal statute where farm production limits are set. */
function readGroundwaterLaw(api: CoreAPI): void {
  const c = core(api);
  if (!c.modules.has(LAWS_MODULE_ID)) return;
  const question =
    "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal";
  const law = lawInForce(api, question);
  const town = lawChain(api).townPlaceId;
  const table = store(api).table("operating");
  const prefix = `law:${question}:`;
  for (const [id, book] of c.finance.businesses) {
    if (c.organizations.get(id)?.placeId !== town) continue;
    const ruleId = `limit:${id}:groundwater`;
    const existing = table.get(ruleId);
    const owned = String(existing?.cause ?? "").startsWith(prefix);
    if (
      book.closedAt ||
      classificationOf(c, id) !== "enterprise:agriculture" ||
      law.value !== 1 ||
      !law.governing
    ) {
      if (owned) endOperatingRule(api, table, ruleId);
      continue;
    }
    // This input slot may already be owned by another recorded restriction.
    if (existing && !owned) continue;
    const cause = `${prefix}${law.governing.id}`;
    if (existing?.cause === cause) continue;
    // stopgapId: SG-GOV-REACH-B-business-cost — farm irrigation exposure,
    // pumping records and crop-specific responses are not present yet.
    api.stopgap("SG-GOV-REACH-B-business-cost");
    setOperatingLimit(api, table, {
      organizationId: id,
      input: "groundwater",
      share: 1 - resourceParameters.parameters.groundwaterWithdrawalShare.value,
      cause,
      source: {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: `${law.governing.id}: ${String(law.governing.source)}; ${resourceParameters.parameters.groundwaterWithdrawalShare.source}`,
        estimatedFrom:
          "Agricultural operating limit using the existing withdrawal estimate and irrigation-output elasticity; individual irrigation exposure is not recorded.",
      },
    });
  }
}

/**
 * A consumer data privacy law binds the town's employing businesses to honor
 * customers' requests to see and delete their data. The duty costs a share of
 * the business's other operating costs (paid monthly like any compliance
 * cost, so the books and a closure review read it); a repeal ends it.
 */
const DATA_PRIVACY_QUESTION =
  "us-policy-positions:technology-privacy.consumer-data-privacy-law";

function readDataPrivacyLaw(api: CoreAPI): void {
  const c = core(api);
  if (!c.modules.has(LAWS_MODULE_ID)) return;
  const law = lawInForce(api, DATA_PRIVACY_QUESTION);
  const town = lawChain(api).townPlaceId;
  const table = store(api).table("operating");
  const cause = `law:${DATA_PRIVACY_QUESTION}`;
  for (const [id, book] of c.finance.businesses) {
    const org = c.organizations.get(id);
    if (org?.placeId !== town) continue;
    const ruleId = `cost:${id}:${cause}`;
    const existing = table.get(ruleId);
    const employing = (c.finance.jobsByOrganization.get(id)?.size ?? 0) > 0;
    if (
      book.closedAt ||
      !classificationOf(c, id).startsWith("enterprise:") ||
      !employing ||
      law.value !== 1 ||
      !law.governing
    ) {
      if (existing) endOperatingRule(api, table, ruleId);
      continue;
    }
    // The cost stands while the same statute governs; a new one rewrites it.
    if (
      String(
        (existing?.source as { citation?: string } | undefined)?.citation,
      ).startsWith(`${law.governing.id}:`)
    )
      continue;
    addRegulatoryCost(api, table, {
      organizationId: id,
      shareOfCosts: api.parameter("businessDataPrivacyShareOfCosts"),
      cause,
      source: {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: `${law.governing.id}: ${String(law.governing.source)}; ${businessParameters.businessDataPrivacyShareOfCosts.citation}`,
        estimatedFrom:
          businessParameters.businessDataPrivacyShareOfCosts.estimatedFrom,
      },
    });
  }
}

function month(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  succeed(api);
  reviewClosures(api);
  membershipPayouts(api);
  readGroundwaterLaw(api);
  readDataPrivacyLaw(api);
  routeCompliance(api);
  payCompliance(api);
  recordOutsideCosts(api);
  routeOutsideCosts(api);
  for (const row of store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[]) {
    if (row.basis === OUTSIDE_FIRM) {
      sweepToParent(api, row);
      continue;
    }
    const book = c.finance.businesses.get(row.id),
      found = ownerPerson(c, row.ownerId),
      owner = found?.person,
      account = ownerAccount(c, row.ownerId);
    if (!book || book.closedAt || !owner || !found.alive || !account) continue;
    // Profit is what the business's net cash gained: every sale, wage, purchase and loan payment.
    const net = netCash(c, row.id);
    const profit = net - (row.netThrough ?? net);
    // Losses carry: an owner draws only from profit the business has kept, net of losses since.
    const retained = row.retainedMinor + profit;
    const cash = c.organizations.get(row.id)!.liquidMinor;
    const cushion = Math.round(
      (book.annualPayrollMinor / p("macroMonthsPerYear")) *
        p("businessCushionMonths"),
    );
    const ownerDays =
      owner.livingCostDailyMinor > 0
        ? owner.liquidMinor / owner.livingCostDailyMinor
        : Number.POSITIVE_INFINITY;
    const short = cushion > 0 ? Math.max(0, 1 - cash / cushion) : 0;
    // Cash beyond the cushion is profit the business doesn't need: on a sliding scale toward 1.
    const spare = cash > cushion ? 1 - cushion / cash : 0;
    const need = 1 / (1 + ownerDays / p("businessDaysPerMonth"));
    let drawn = 0,
      share = 0;
    if (retained > 0) {
      const selected = chooseAct(
        c,
        owner.id,
        businessData.drawShares.map((s) =>
          option(s, {
            need: p("businessDrawNeedWeight") * need * s,
            keep: -p("businessDrawKeepWeight") * short * s,
            surplus: p("businessDrawSurplusWeight") * spare * s,
            size: -p("businessDrawSizeWeight") * s * s,
          }),
        ),
      ).selected!;
      share = Number(selected.targetId.split(":").at(-1));
      if (share > 0) {
        const id = `owner-draw:${row.id}:${c.date}`;
        const source: Source = {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: businessData.source.citation,
          estimatedFrom: `The owner's draw: ${share} of ${retained} minor units of profit kept, chosen from their own money and the business's cash.`,
        };
        drawn = found.full
          ? transferCash(api, id, row.id, account, retained * share, source)
          : countedPayment(api, {
              id,
              placeId: owner.placeId,
              personId: owner.id,
              otherOwnerId: row.id,
              amountMinor: -Math.floor(retained * share),
              reasonKey: "owner-draw",
              source,
            });
      }
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
        ...bookedMonth(api, row, book),
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
      nominal: number;
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
      nominal: 0,
      capacity: 0,
      incumbents: [],
      staff: 0,
    };
    // Real demand, in the business's own opening prices.
    row.demand += book.annualDemandMinor / (book.price / book.anchorPrice || 1);
    row.nominal += book.annualDemandMinor;
    row.capacity += book.capacityMinor;
    row.incumbents.push(id);
    row.staff +=
      [...(c.finance.jobsByOrganization.get(id) ?? [])].filter(
        (jobId) => c.jobs.get(jobId)?.endsAt === undefined,
      ).length + countedHeadcountOf(c, id);
    out.set(key, row);
  }
  return [...out.values()].map((row) => ({
    placeId: row.placeId,
    kindId: row.kindId,
    room: Math.max(0, row.demand / row.capacity - 1),
    incumbents: row.incumbents,
    staff: row.staff,
    demandMinor: row.nominal,
  }));
}

/** What an entrant could make a month: an equal share of the market at its kind's margin. */
function prospectMonthly(api: CoreAPI, market: Market): number {
  const kind = DEFAULT_BUSINESS_BOOKS_DATA.kinds.find(
    (row) => row.id === market.kindId,
  );
  if (!kind) return 0;
  return (
    ((market.demandMinor / (market.incumbents.length + 1)) *
      api.parameter(kind.marginParameter)) /
    api.parameter("macroMonthsPerYear")
  );
}

/** What starting costs: a few months of an equal share's costs before sales come in. */
function startupCost(api: CoreAPI, market: Market): number {
  const kind = DEFAULT_BUSINESS_BOOKS_DATA.kinds.find(
    (row) => row.id === market.kindId,
  );
  if (!kind) return 0;
  return (
    ((market.demandMinor / (market.incumbents.length + 1)) *
      (1 - api.parameter(kind.marginParameter)) *
      api.parameter("businessStartupMonthsOfCosts")) /
    api.parameter("macroMonthsPerYear")
  );
}

/**
 * Where a place's market has the most room: the owners of strong businesses
 * of that kind choose first whether to open a location there, then the
 * place's working-age adults choose whether to found one.
 */
function foundings(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  // A typical adult's monthly pay in each place, the measure an owner's prospect is weighed against.
  const pay = new Map<string, number[]>();
  for (const [id] of c.finance.businesses) {
    const placeId = c.organizations.get(id)?.placeId;
    if (!placeId) continue;
    const list = pay.get(placeId) ?? [];
    for (const job of [
      ...[...(c.finance.jobsByOrganization.get(id) ?? [])]
        .map((jobId) => c.jobs.get(jobId)!)
        .filter((job) => job.endsAt === undefined),
      ...countedJobsOf(c, id),
    ])
      list.push(
        (job.wageDailyMinor * p("jobsDaysPerYear")) / p("macroMonthsPerYear"),
      );
    pay.set(placeId, list);
  }
  const medians = new Map<string, number>();
  const medianPay = (placeId: string) => {
    let value = medians.get(placeId);
    if (value === undefined) {
      const list = [...(pay.get(placeId) ?? [])].sort((a, b) => a - b);
      medians.set(placeId, (value = list[Math.floor(list.length / 2)] ?? 0));
    }
    return value;
  };
  // Room counted in average-sized businesses; past one gap, more pull.
  const gapsOf = (row: Market) =>
    Math.max(0, row.room * row.incumbents.length - 1);
  /** How far starting costs outrun the founder's cash and what a lender would advance on their income. */
  const capital = (row: Market, monthlyIncome: number, cashMinor: number) => {
    const reach =
      Math.max(0, cashMinor) +
      monthlyIncome *
        p("macroMonthsPerYear") *
        p("businessFounderLoanIncomeMultiple");
    return Math.max(0, Math.log((startupCost(api, row) + 1) / (reach + 1)));
  };
  /** The owner's prospect against what this person earns now (with a floor for the jobless). */
  const prospect = (row: Market, monthlyIncome: number) => {
    const floor =
      medianPay(row.placeId) * p("businessProspectIncomeFloorShare");
    const income = Math.max(monthlyIncome, floor);
    return income > 0 ? Math.log((prospectMonthly(api, row) + 1) / income) : 0;
  };
  const markets = marketRoom(api)
    .filter(
      (row) =>
        purchaseShareOf(
          c,
          new Set(row.incumbents),
          1 / (row.incumbents.length + 1),
        ) > 0,
    )
    .map((row) => ({
      row,
      score:
        p("businessFoundRoomWeight") * gapsOf(row) +
        p("businessFoundProspectWeight") *
          prospect(row, medianPay(row.placeId)) -
        p("businessFoundCapitalWeight") *
          capital(row, medianPay(row.placeId), 0),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.row.placeId.localeCompare(b.row.placeId) ||
        a.row.kindId.localeCompare(b.row.kindId),
    )
    .map(({ row }) => row);
  // Nothing below changes between markets (a founding returns out of this
  // function), so what does not depend on the market is worked out once.
  const monthlyPay = new Map<string, number>();
  const rt = residentsRuntime(c);
  for (const jobId of rt?.wageFlowByJob.keys() ?? []) {
    const job = rt!.jobs.get(jobId);
    if (job && job.endsAt === undefined)
      monthlyPay.set(
        job.personId,
        (job.wageDailyMinor * p("jobsDaysPerYear")) / p("macroMonthsPerYear"),
      );
  }
  for (const job of c.jobs.values())
    if (job.endsAt === undefined)
      monthlyPay.set(
        job.personId,
        (job.wageDailyMinor * p("jobsDaysPerYear")) / p("macroMonthsPerYear"),
      );
  const incomeOf = (personId: string) => monthlyPay.get(personId) ?? 0;
  // Counted people have no chooser, so their personality enters here once, on the chooser's weight; full people get it from the chooser alone.
  const foundLean = (person: Pick<PersonState, "traits">) =>
    traitLeanBetween(
      c,
      person,
      businessData.actions.found.actKinds,
      businessData.actions.notFound.actKinds,
    );
  const ownerRows = store(api)
    .table("owners")
    .query("all", [true]) as unknown as OwnerRow[];
  const owners = new Set(ownerRows.map((row) => row.ownerId));
  const seekers = c.modules.has("jobs")
    ? api.moduleState("jobs").table("seekers")
    : undefined;
  const peopleInOrder = [...c.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  /** A place's counted people of founding age: what weighs on them does not depend on the market. */
  const candidatesByPlace = new Map<
    string,
    {
      id: string;
      lean: number;
      unemployed: number;
      income: number;
      cash: number;
    }[]
  >();
  const countedCandidates = (placeId: string) => {
    const held = candidatesByPlace.get(placeId);
    if (held) return held;
    const out: {
      id: string;
      lean: number;
      unemployed: number;
      income: number;
      cash: number;
    }[] = [];
    candidatesByPlace.set(placeId, out);
    if (!c.modules.has("jobs")) return out;
    const countedSeekers = api.moduleState("jobs").table("countedSeekers");
    const counted = residentsRuntime(c)?.store;
    for (const h of counted?.liveHouseholds() ?? []) {
      if (h.placeId !== placeId) continue;
      for (const m of counted!.countedMembers(h)) {
        const personId = counted!.ids[m]!;
        const age =
          daysBetween(makeIsoDate(counted!.born[m]!), makeIsoDate(c.date)) /
          p("jobsDaysPerYear");
        if (
          owners.has(personId) ||
          age < p("businessFounderMinimumAge") ||
          age >= p("businessFounderMaximumAge")
        )
          continue;
        const seeker = countedSeekers.get(personId) as
          { employed: boolean } | undefined;
        out.push({
          id: personId,
          lean: foundLean({ traits: counted!.packedTraits(m) }),
          unemployed: seeker && !seeker.employed ? 1 : 0,
          income: incomeOf(personId),
          cash: counted!.liquid[m]! + founderSavings(c, personId).minor,
        });
      }
    }
    return out;
  };
  // An unaffordable market does not prevent an entrant in another market.
  for (const market of markets) {
    const gaps = gapsOf(market);
    // Owners of the kind's businesses anywhere, strongest books first.
    const growers = ownerRows
      .map((row) => {
        const book = c.finance.businesses.get(row.id);
        const owner = ownerPerson(c, row.ownerId);
        if (!book || book.closedAt || book.kindId !== market.kindId) return;
        if (!owner?.alive) return;
        const cash =
          c.organizations.get(row.id)!.liquidMinor + depositsHeld(c, row.id);
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
      const selected = chooseAct(c, ownerId, [
        option(0, {}),
        expandOption(market.kindId, {
          baseline: p("businessExpandBaseline"),
          // An owner opens another location into unmet demand: below one business-sized gap, it pulls against.
          room:
            p("businessFoundRoomWeight") *
            (market.room * market.incumbents.length - 1),
          books: p("businessExpandStrengthWeight") * grower.strength,
        }),
      ]).selected!;
      if (selected.definition.id !== businessData.actions.expand.id) continue;
      const opened = found(api, ownerId, market, {
        parentId: grower.row.id,
        // The parent funds the location from cash above its own cushion.
        fundsMinor: Math.max(0, grower.cash - grower.cushion),
        strength: grower.strength,
      });
      if (opened) return;
    }
    for (const person of peopleInOrder) {
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
          room: p("businessFoundRoomWeight") * gaps,
          lostWork: p("businessFoundUnemployedWeight") * unemployed,
          prospect:
            p("businessFoundProspectWeight") *
            prospect(market, incomeOf(person.id)),
          capital:
            -p("businessFoundCapitalWeight") *
            capital(
              market,
              incomeOf(person.id),
              person.liquidMinor + founderSavings(c, person.id).minor,
            ),
        }),
      ]);
      if (result.selected!.definition.id !== businessData.actions.found.id)
        continue;
      // A failed capital check must not block another willing founder.
      if (found(api, person.id, market)) return;
    }
    // The wider population weighs it by the same reasons, as summed pulls (stopgap), until filled in.
    if (!c.modules.has("jobs")) continue;
    const rows: { id: string; score: number }[] = [];
    for (const row of countedCandidates(market.placeId)) {
      rows.push({
        id: row.id,
        score:
          p("businessCountedFoundBaseline") +
          p("businessFoundRoomWeight") * gaps +
          p("traitWeight") * row.lean +
          p("businessFoundUnemployedWeight") * row.unemployed +
          p("businessFoundProspectWeight") * prospect(market, row.income) -
          p("businessFoundCapitalWeight") *
            capital(market, row.income, row.cash),
      });
    }
    for (const founder of strongestPulls(api, "found", rows)) {
      if (found(api, founder.id, market)) return;
    }
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
  const equal = 1 / (market.incumbents.length + 1);
  // No customers to win (no buyers reach this market's businesses): nothing to found.
  if (purchaseShareOf(c, new Set(market.incumbents), equal) <= 0) return false;
  // How big it opens: an equal share of the market is the most it could win;
  // it plans a typical startup's staff, smaller when the founder's own money
  // and what the bank will lend on it reach less (most new firms start small).
  const term = p("businessStartupTermMonths");
  const fullCost = startupCost(api, market),
    fullProfit = prospectMonthly(api, market),
    fullStaff = market.staff * equal;
  const ownerFrom = location ? location.parentId : ownerAccount(c, founderId);
  if (!ownerFrom) return false;
  const savings = location
    ? { holderId: location.parentId, minor: depositsHeld(c, location.parentId) }
    : founderSavings(c, founderId);
  const beforeSavings = founder.liquidMinor;
  const withdrawn = withdrawSavings(c, api, {
    id: `startup-savings:${id}`,
    holderId: savings.holderId,
    customerAccountId: api.accounts().main(ownerFrom),
    amountMinor: Math.min(savings.minor, Math.ceil(fullCost)),
    source,
  });
  const equityMinor = Math.min(
    Math.max(0, c.organizations.get(ownerFrom)?.liquidMinor ?? Infinity),
    location
      ? Math.max(0, location.fundsMinor)
      : Math.max(
          0,
          beforeSavings +
            withdrawn -
            founder.livingCostDailyMinor *
              p("businessDaysPerMonth") *
              p("businessFounderReserveMonths"),
        ),
  );
  const shortOfMoney = (size: number) =>
    size * fullCost >
    equityMinor +
      foundingLoanLimit(
        api,
        { equityMinor, monthlyProfitMinor: fullProfit * size },
        term,
      );
  let scale = Math.min(
    1,
    fullStaff > 0 ? p("businessStartupStaff") / fullStaff : 1,
  );
  if (shortOfMoney(scale)) {
    // The largest size the money reaches, by halving the interval.
    let low = 0,
      high = scale;
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      if (shortOfMoney(mid)) high = mid;
      else low = mid;
    }
    scale = low;
  }
  // Too little to open with even one worker (or the whole share, where that is less): the founder can't open it.
  if (scale <= 0 || (fullStaff > 0 && scale < Math.min(1, 1 / fullStaff)))
    return false;
  const share = equal * scale;
  api.addOrganization({
    id,
    placeId: market.placeId,
    // A location carries its business's name; a new business takes the first
    // of its kind's name styles that no business in town already carries.
    name:
      parentName ??
      businessName(
        kindId,
        businessNameContext(market.placeId, founder.familyName),
        new Set(
          [...c.organizations.values()]
            .filter((row) => row.placeId === market.placeId)
            .map((row) => row.name),
        ),
      ) ??
      founder.familyName,
    kind: "employer",
    liquidMinor: 0,
    source,
  });
  // Households' purchases are split again by the core among the sellers by capacity and price; outside buyers here.
  const rivals = market.incumbents
    .map((rid) => c.finance.businesses.get(rid))
    .filter((row) => row && !row.closedAt);
  const capacityMinor = rivals.length
    ? rivals.reduce((n, row) => n + row!.capacityMinor, 0) / rivals.length
    : market.demandMinor * share;
  const incumbents = new Set(market.incumbents);
  // The incumbent whose counted buyers the newcomer shares: the first with
  // residents' purchases here, not merely the first incumbent in the list
  // (which may sell only to outside buyers or full households).
  const countedFlows = [...(residentsRuntime(c)?.flows.values() ?? [])].filter(
    (flow) =>
      flow.kind === "purchase" &&
      !flow.endedAt &&
      flow.placeId === market.placeId &&
      incumbents.has(flow.payeeId) &&
      !c.people.has(flow.payerId),
  );
  const likeId = market.incumbents.find((rid) =>
    countedFlows.some((flow) => flow.payeeId === rid),
  );
  const households = !likeId
    ? 0
    : api
        .enterMarket({
          organizationId: id,
          placeId: market.placeId,
          like: likeId,
          capacityMinor: capacityMinor * scale,
        })
        .reduce((n, row) => n + row.annualDemandMinor, 0);
  const annualDemandMinor =
    households +
    shiftPurchaseShare(
      c,
      new Set(market.incumbents),
      id,
      share,
      // Outside buyers, and full households' own purchases (the core leaves those with their stores).
      (flow) => flow.kind === "outside-sales" || c.people.has(flow.payerId),
    );
  const monthly = Math.round(annualDemandMinor / p("macroMonthsPerYear"));
  // The incumbents' own markets shrink by the share they lost (books seam, for OPUS-CORE review).
  for (const incumbentId of market.incumbents) {
    const book = c.finance.businesses.get(incumbentId);
    if (!book) continue;
    // Never below a year of its own recorded supplier contracts (the core prices those against this anchor).
    let costs = 0;
    for (const id of book.costContractIds) {
      const row = c.finance.contracts.get(id);
      if (row && !row.endedAt)
        costs +=
          (row.amountMinor * p("macroMonthsPerYear")) / (row.periodMonths || 1);
    }
    const kept = Math.max(
      1 - share,
      costs / (book.anchorAnnualDemandMinor || 1),
    );
    book.anchorAnnualDemandMinor *= Math.min(1, kept);
    book.annualDemandMinor *= Math.min(1, kept);
  }
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
  // What a business that buys from outside suppliers doesn't buy locally, it buys outside, like every opening firm.
  const supplies = [...market.incumbents]
    .map((rid) => residentsRuntime(c)?.flows.get(`outside-costs:${rid}`))
    .find((flow) => flow && !flow.endedAt);
  if (supplies)
    addResidentFlow(c, {
      id: `outside-costs:${id}`,
      kind: "outside-costs",
      financeKind: supplies.financeKind,
      payerId: id,
      payeeId: supplies.payeeId,
      residentsId: supplies.residentsId,
      placeId: supplies.placeId,
      amountMinor: 0,
      firstAt: supplies.nextAt,
      cadence: supplies.cadence,
      salesReceipt: false,
      marketAdjusted: false,
      source: supplies.source,
    });
  const startup =
    ((annualPayrollMinor + annualOtherCostsMinor) / p("macroMonthsPerYear")) *
    p("businessStartupMonthsOfCosts");
  // A location is funded first from its parent's spare cash, a new business
  // from its founder's savings; a loan covers the rest.
  const funded = transferCash(
    api,
    `${location ? "location-funding" : "founder-equity"}:${id}`,
    ownerFrom,
    id,
    Math.min(startup, equityMinor),
    source,
  );
  // Funding a location moves the parent's cash, not its profit.
  if (location && funded > 0) {
    const parent = store(api).table("owners").get(location.parentId) as
      OwnerRow | undefined;
    if (parent?.netThrough !== undefined)
      store(api)
        .table("owners")
        .put({ ...parent, netThrough: parent.netThrough - funded });
  }
  const loan =
    startup - funded > 0
      ? lendForFounding(api, id, startup - funded, term, {
          founderId,
          equityMinor: funded,
          monthlyProfitMinor:
            (annualDemandMinor * p(kind.marginParameter)) /
            p("macroMonthsPerYear"),
        })
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
      // The founder's own money in it (a location's comes from its parent).
      ...(location ? {} : { equityMinor: funded }),
      parentFundsMinor: location ? funded : 0,
      scale,
      staff: Math.max(1, Math.round(market.staff * share)),
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

/**
 * A person who already owns a business the book was added for (an outlet's
 * publisher, say) is recorded as its owner, so the owner's draws, hiring and
 * closing decisions run on it like any owner-operator's. No profit is owed
 * before the day of enrollment.
 */
export function enrollBusinessOwner(
  api: CoreAPI,
  input: {
    readonly organizationId: string;
    readonly ownerId: string;
    /** Why this person owns it, kept on the record. */
    readonly basis: string;
  },
): void {
  store(api).table("owners").put({
    id: input.organizationId,
    isOwner: true,
    ownerId: input.ownerId,
    since: api.state.date,
    basis: input.basis,
    salesThrough: 0,
    wagesThrough: 0,
    operatingThrough: 0,
    retainedMinor: 0,
  });
}

const BDS = bdsRates as unknown as {
  states: Record<string, { entryPct: number; exitPct: number }>;
  nationExitPct: number;
};
const FIPS_OF_USPS = new Map(
  (regions.regions as { stateFips: string; stateUsps: string }[]).map((row) => [
    row.stateUsps,
    row.stateFips,
  ]),
);

/**
 * Businesses before the start (M1-14): every opening business gets a founding
 * date, so firms have ages. In a steady state where the state's businesses
 * exit at its BDS rate x a year, the share at least a years old is (1 - x)^a;
 * the largest businesses are the oldest. Foundings inside the window and each
 * year's exits (the same rate) are dated history.
 */
function businessHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const usps = c.placeMetadata?.housingState ?? "";
  const exit =
    (BDS.states[FIPS_OF_USPS.get(usps) ?? ""]?.exitPct ?? BDS.nationExitPct) /
    p("macroHundred");
  const firms = [...c.finance.businesses.values()]
    .filter((book) => !book.closedAt)
    .map((book) => ({
      id: book.organizationId,
      kindId: book.kindId,
      staff:
        [
          ...(c.finance.jobsByOrganization.get(book.organizationId) ?? []),
        ].filter((jobId) => c.jobs.get(jobId)?.endsAt === undefined).length +
        countedHeadcountOf(c, book.organizationId),
    }))
    .sort((a, b) => b.staff - a.staff || a.id.localeCompare(b.id));
  const start = makeIsoDate(c.date);
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation: (bdsRates as { source: { citation: string } }).source.citation,
    estimatedFrom: `Ages from the state's establishment exit rate (${(exit * 100).toFixed(1)}% a year); the largest businesses are the oldest.`,
  };
  firms.forEach((firm, i) => {
    const q = (i + 0.5) / firms.length;
    const years = Math.min(
      p("businessOldestFirmYears"),
      Math.log(q) / Math.log(1 - exit),
    );
    const foundedAt = makeIsoDate(
      addDays(start, -Math.round(years * p("jobsDaysPerYear"))),
    );
    store(api).table("ages").put({ id: firm.id, foundedAt, ageYears: years });
    if (foundedAt >= window.from && foundedAt <= window.through)
      history.record({
        id: `business.founded:${firm.id}`,
        date: foundedAt,
        kind: "business.founded",
        placeId: c.organizations.get(firm.id)?.placeId,
        facts: { organizationId: firm.id, kindId: firm.kindId },
        publicRecord: true,
        source,
      });
  });
  // Each year in the window, the businesses that closed (the same exit rate, a steady count).
  const first = Number(window.from.slice(0, 4)),
    last = Number(window.through.slice(0, 4));
  for (let year = first; year <= last; year++) {
    const date = makeIsoDate(
      `${year}-12-31` > window.through ? window.through : `${year}-12-31`,
    );
    if (date < window.from) continue;
    history.record({
      id: `business.exits:${year}`,
      date,
      kind: "business.exits",
      facts: { year, closed: Math.round(firms.length * exit) },
      publicRecord: true,
      source,
    });
  }
}

export const BUSINESS_MODULE: PreStartModule = {
  id: BUSINESS_MODULE_ID,
  preStart: { phase: "economy", run: businessHistory },
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      owners: { indexes: { all: { fields: ["isOwner"] } } },
      draws: { indexes: { byOrganization: { fields: ["organizationId"] } } },
      trading: {},
      foundings: {},
      successions: {},
      closures: {},
      ages: {},
      operating: { indexes: { all: { fields: ["isRule"] } } },
      compliance: {
        indexes: { byOrganization: { fields: ["organizationId"] } },
      },
      outsideCosts: {
        indexes: { byOrganization: { fields: ["organizationId"] } },
      },
      choices: {},
    },
  },
  reasonProviders: {
    [PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  eventKinds: ["organization.closed"],
  onEvent(api, event) {
    if (!store(api).table("state").get("business:state")) return;
    const c = core(api);
    // The closure event's id ends with the closed business.
    const organizationId = event.id.split(":").slice(2).join(":");
    const row = store(api).table("owners").get(organizationId) as
      OwnerRow | undefined;
    if (!row) return;
    const book = c.finance.businesses.get(organizationId);
    store(api)
      .table("closures")
      .put({
        id: `closure:${organizationId}`,
        organizationId,
        ownerId: row.ownerId,
        date: c.date,
        // The closing choice's recorded reason (by choice, insolvent, owner retired, no successor).
        ...(book?.closingReasonKey ? { cause: book.closingReasonKey } : {}),
        workersAffected: event.personIds.length,
        salesMinor: book?.salesReceivedMinor ?? 0,
        wagesMinor: book?.wagesPaidMinor ?? 0,
      });
    // The owner answers for it: drives about a closure name them (M1-11).
    api.emit({
      id: `event:business.closed:${organizationId}`,
      date: c.date,
      kind: "business.closed",
      personIds: c.people.get(row.ownerId)?.alive ? [row.ownerId] : [],
      placeId: c.organizations.get(organizationId)?.placeId ?? "",
      source: {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: businessData.source.citation,
        estimatedFrom: `${organizationId} closed; its owner ${row.ownerId} answers for it.`,
      },
      // The recorded reason rides on the event for the English engine to read.
      ...(book?.closingReasonKey
        ? {
            facts: {
              [`organization:${organizationId}:closing-reason`]:
                book.closingReasonKey,
            },
          }
        : {}),
      publicRecord: true,
      topic: organizationId,
    });
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

/** A law limits an input a business uses (groundwater): its output and sales fall (OPUS-GOV's law reach calls this). */
export function setBusinessOperatingLimit(
  api: CoreAPI,
  input: Parameters<typeof setOperatingLimit>[2],
): void {
  setOperatingLimit(api, store(api).table("operating"), input);
}

/** A law adds a compliance cost to a business's operations (a clean air plan). */
export function addBusinessComplianceCost(
  api: CoreAPI,
  input: Parameters<typeof addRegulatoryCost>[2],
): void {
  addRegulatoryCost(api, store(api).table("operating"), input);
}

/** A repeal: `limit:<organization>:<input>` or `cost:<organization>:<cause>`. */
export function endBusinessOperatingRule(api: CoreAPI, id: string): void {
  endOperatingRule(api, store(api).table("operating"), id);
}
