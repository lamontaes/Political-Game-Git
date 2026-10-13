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
import { traitLeanBetween } from "../trait-decisions";
import type { ActOffer, CoreAPI, CoreState, PersonState } from "../types";
import type {
  HistoryWriter,
  PreStartModule,
  PreStartWindow,
} from "../pre-start";
import bdsRates from "../data/business/bds-rates.json" with { type: "json" };
import ownership from "../data/business/ownership.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import { DEFAULT_BUSINESS_BOOKS_DATA } from "../business-books";
import {
  addResidentFlow,
  countedJobsOf,
  purchaseShareOf,
  shiftPurchaseShare,
} from "../residents-economy";
import {
  residentPerson,
  residentsRuntime,
  supplierBillsOwed,
} from "./residents";
import { foundingLoanLimit, lendForFounding } from "./credit";
import { registerEmployer, strongestPulls } from "./jobs";
import { transferCash } from "../world-transfer";
import {
  addRegulatoryCost,
  endOperatingRule,
  payOperatingCosts,
  setOperatingLimit,
} from "../business-operating-rules";

import { LAWS_MODULE_ID, lawInForce } from "./laws";
import lawParameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import reach from "../data/laws/reach-group-a.json" with { type: "json" };

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
        ).length + countedJobsOf(c, id).length,
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
  let owed = supplierBillsOwed(c, organizationId);
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
  if (c.people.has(personId) || c.organizations.has(personId)) return personId;
  const placeId = residentPerson(c, personId)?.placeId;
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
        : (c.households
            .get(c.people.get(row.ownerId)?.householdId ?? "")
            ?.memberIds.find((id) => c.people.get(id)?.alive) ?? row.ownerId);
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
    ownerAccountId: api.accounts().main(account),
    reasonKey,
    source: {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: businessData.source.citation,
      estimatedFrom: `${ownerId} closed ${organizationId}: ${reasonKey}.`,
    },
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
 * Each owner weighs closing against carrying on: losses kept over the
 * months (in months of the business's costs) and the owner's years past
 * the usual retirement age pull toward closing. A full owner decides
 * through the shared chooser; counted owners by summed pulls, at a baseline
 * set from the state's establishment exit rate.
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
    const monthlyCosts =
      (book.annualPayrollMinor + book.annualOtherCostsMinor) /
      p("macroMonthsPerYear");
    const losses =
      monthlyCosts > 0 ? Math.max(0, -row.retainedMinor) / monthlyCosts : 0;
    // A firm based elsewhere weighs a branch's losses; it doesn't age out.
    const age = found
      ? Number(c.date.slice(0, 4)) - Number(found.person.birthDate.slice(0, 4))
      : p("jobsEarliestRetirementAge");
    const reasons = {
      baseline: p("businessCloseBaseline"),
      losses: p("businessCloseLossWeight") * losses,
      age:
        (p("businessCloseAgeWeight") *
          Math.max(0, age - p("jobsEarliestRetirementAge"))) /
        p("businessCloseAgeYears"),
    };
    const score = reasons.baseline + reasons.losses + reasons.age;
    if (c.people.has(row.ownerId)) {
      const chosen = chooseAct(c, row.ownerId, [
        closeOffer(false, row.id, {}),
        closeOffer(true, row.id, reasons),
      ]).selected!;
      if (chosen.definition.id === businessData.actions.close.id)
        closeByChoice(
          api,
          row.id,
          row.ownerId,
          losses > 0
            ? businessData.reasons.losses
            : businessData.reasons.retiring,
        );
    } else counted.push({ id: row.id, ownerId: row.ownerId, score, reasons });
  }
  if (!counted.length) return;
  for (const row of strongestPulls(api, "business-close", counted)) {
    const owner = store(api).table("owners").get(row.id) as unknown as OwnerRow;
    closeByChoice(
      api,
      row.id,
      row.ownerId,
      Math.max(0, -owner.retainedMinor) > 0
        ? businessData.reasons.losses
        : businessData.reasons.retiring,
      row.reasons,
    );
  }
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
      salesThrough: book.salesReceivedMinor,
      wagesThrough: book.wagesPaidMinor,
      operatingThrough: book.operatingPaidMinor,
      retainedMinor: retained - swept,
      netThrough: net - swept,
    });
}

function month(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  succeed(api);
  reviewClosures(api);
  membershipPayouts(api);
  if (c.modules.has(LAWS_MODULE_ID)) {
    const privacy = lawInForce(
      api,
      "us-policy-positions:technology-privacy.consumer-data-privacy-law",
    );
    const ageCheck = lawInForce(
      api,
      "us-policy-positions:technology-privacy.age-verification-for-social-media",
    );
    for (const [organizationId, book] of c.finance.businesses) {
      if (book.closedAt) continue;
      const org = c.organizations.get(organizationId);
      if (!org) continue;
      const sync = (question: string, law: typeof privacy, share: number) => {
        const cause = question;
        if (law.value !== 1 || !law.governing) {
          endOperatingRule(
            api,
            store(api).table("operating"),
            `cost:${organizationId}:${cause}`,
          );
          return;
        }
        addRegulatoryCost(api, store(api).table("operating"), {
          organizationId,
          cause,
          shareOfCosts: share,
          source: {
            tag: "ESTIMATED",
            asOf: c.date,
            citation: String(law.governing.source),
            estimatedFrom:
              "data/laws/reach-group-a-parameters.json recurring compliance cost share.",
          },
        });
      };
      sync(
        "us-policy-positions:technology-privacy.consumer-data-privacy-law",
        privacy,
        lawParameters.parameters.privacyComplianceShareOfCosts.value,
      );
      if (reach.selectors.online.includes(org.classification ?? ""))
        sync(
          "us-policy-positions:technology-privacy.age-verification-for-social-media",
          ageCheck,
          lawParameters.parameters.ageVerificationShareOfCosts.value,
        );
    }
  }
  payOperatingCosts(api, store(api).table("operating"));
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
    const cushion =
      (book.annualPayrollMinor / p("macroMonthsPerYear")) *
      p("businessCushionMonths");
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
      const selected = decide(
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
      ).length + countedJobsOf(c, id).length;
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
  const market = marketRoom(api)
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
    )[0]?.row;
  if (!market) return;
  const gaps = gapsOf(market);
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
  // Every trait's lean toward founding or opening over staying put.
  const foundLean = (person: Pick<PersonState, "traits">) =>
    traitLeanBetween(
      c,
      person,
      businessData.actions.found.actKinds,
      businessData.actions.notFound.actKinds,
    );
  const traitPull = (personId: string) =>
    foundLean(ownerPerson(c, personId)!.person);
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
        // An owner opens another location into unmet demand: below one business-sized gap, it pulls against.
        room:
          p("businessFoundRoomWeight") *
          (market.room * market.incumbents.length - 1),
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
        room: p("businessFoundRoomWeight") * gaps,
        traits: p("businessFoundTraitWeight") * traitPull(person.id),
        lostWork: p("businessFoundUnemployedWeight") * unemployed,
        prospect:
          p("businessFoundProspectWeight") *
          prospect(market, incomeOf(person.id)),
        capital:
          -p("businessFoundCapitalWeight") *
          capital(market, incomeOf(person.id), person.liquidMinor),
      }),
    ]);
    if (result.selected!.definition.id !== businessData.actions.found.id)
      continue;
    found(api, person.id, market);
    // One opening a month; the next month's room is measured afresh.
    return;
  }
  // The wider population weighs it by the same reasons, as summed pulls (stopgap), until filled in.
  if (!c.modules.has("jobs")) return;
  const countedSeekers = api.moduleState("jobs").table("countedSeekers");
  const rows: { id: string; score: number }[] = [];
  for (const record of residentsRuntime(c)?.households.values() ?? []) {
    if (record.household.placeId !== market.placeId) continue;
    for (const person of record.people) {
      const age =
        daysBetween(makeIsoDate(person.birthDate), makeIsoDate(c.date)) /
        p("jobsDaysPerYear");
      if (
        owners.has(person.id) ||
        age < p("businessFounderMinimumAge") ||
        age >= p("businessFounderMaximumAge")
      )
        continue;
      const seeker = countedSeekers.get(person.id) as
        { employed: boolean } | undefined;
      rows.push({
        id: person.id,
        score:
          p("businessCountedFoundBaseline") +
          p("businessFoundRoomWeight") * gaps +
          p("businessFoundTraitWeight") * foundLean(person) +
          p("businessFoundUnemployedWeight") *
            (seeker && !seeker.employed ? 1 : 0) +
          p("businessFoundProspectWeight") *
            prospect(market, incomeOf(person.id)) -
          p("businessFoundCapitalWeight") *
            capital(market, incomeOf(person.id), person.liquidMinor),
      });
    }
  }
  const founder = strongestPulls(api, "found", rows)[0];
  if (founder) found(api, founder.id, market);
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
  const equityMinor = Math.min(
    Math.max(0, c.organizations.get(ownerFrom)?.liquidMinor ?? Infinity),
    location
      ? Math.max(0, location.fundsMinor)
      : Math.max(
          0,
          founder.liquidMinor -
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
    name:
      parentName ??
      businessData.namePattern
        .replace("{founder}", founder.familyName)
        .replace("{kind}", kindId),
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
  const countedBuyers = [...(residentsRuntime(c)?.flows.values() ?? [])].some(
    (flow) =>
      flow.kind === "purchase" &&
      !flow.endedAt &&
      incumbents.has(flow.payeeId) &&
      !c.people.has(flow.payerId),
  );
  const households = !countedBuyers
    ? 0
    : api
        .enterMarket({
          organizationId: id,
          placeId: market.placeId,
          like: market.incumbents[0]!,
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
        countedJobsOf(c, book.organizationId).length,
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
      foundings: {},
      successions: {},
      closures: {},
      ages: {},
      operating: { indexes: { all: { fields: ["isRule"] } } },
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
        // A closure the owner chose carries its reason; any other is one the business couldn't pay its way out of.
        cause:
          (
            store(api)
              .table("choices")
              .get(`choice:${organizationId}:${c.date}`) as
              { reasonKey?: string } | undefined
          )?.reasonKey ?? "could-not-pay",
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
        estimatedFrom: `${organizationId} closed when it could not pay what it owed; its owner ${row.ownerId} answers for it.`,
      },
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
