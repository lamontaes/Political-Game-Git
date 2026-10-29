/**
 * Out-of-pocket medical bills and the medical debt they leave, the coverage
 * engine's monthly pass (modules/coverage.ts runs it on the 1st, after the
 * premiums). Background simulation from research (owner, Oct 29 13:30 UTC):
 * the player takes no step.
 *
 * Each household's average is the Consumer Expenditure Survey's medical
 * services line for its own place's region and its size (BLS series
 * CXUMEDSERVSLB0101M, 2024, the opening-customer parent parameters), less
 * the clinic component its everyday-living plan already buys, at the world's
 * price level. Each member's part of it follows two records read the day it
 * is billed:
 *
 * - the care their health asks: the health engine's care need (one for a
 *   serious illness under way, a share for held conditions, none otherwise;
 *   a counted member's serious illness is the counted-illness row), on a
 *   sliding scale up to the top 5 percent of spenders' care (MEPS #533); the
 *   town's people are scaled so their average is the survey's;
 * - the part of that care their coverage leaves them: their coverage record
 *   (an employer plan, Medicare at 65), their Medicaid coverage where the
 *   law reach keeps it by person id (coverageSpellsNow, named and counted
 *   alike), or none, at the share MEPS #441 finds each pays out of pocket,
 *   against the average share.
 *
 * The household pays the bill from what its members hold, less what they
 * keep back for their home (as for everyday living, cost-of-living.ts), to
 * the town's hospital or clinic (the one its living plan already buys from
 * first), else the outside account. A counted household pays the same bill
 * times its weight through its group's account (counted-money.ts
 * chargeGroups), its housing arrears kept back. What a household cannot pay
 * it still owes, oldest bill first, and asks again each month; a bill unpaid
 * 120 days after it was billed (26 CFR 1.501(r)-6) is placed for collection
 * as a medical-debt record on its books (the credit engine's loans, kind
 * "medical"), at the share providers send to collections rather than write
 * off, times the outcome web's factor for finance.medical-debt-in-collections,
 * the measure the expansion's medicaid-expansion-to-medical-debt link moves.
 * No roll: the bill goes unpaid because the household's cash and coverage
 * say so.
 *
 * One cause, one path: the law reach keeps the Medicaid coverage of the
 * town's residents, full and counted, by person id, and pays no one for it,
 * so a town household meets the expansion only through its own coverage (a
 * covered member's smaller bill) and the place-level row is left out of its
 * factor. A household in another place the world keeps (the places around
 * the town), whose coverage the reach does not keep, meets it through the
 * place-level row on the share sent to collections.
 *
 * Only households in the places whose money the world keeps are billed
 * (billedPlaces); the care norm is theirs.
 */
import data from "./data/health/medical-bills.json" with { type: "json" };
import customers from "./data/opening-customers.json" with { type: "json" };
import { chargeGroups, fundGroups } from "./counted-money";
import { incomeBandOf, fullHouseholdIncomes } from "./counted-income-fifth";
import { countedIllnessOf } from "./counted-illness";
import { coverageSpellsNow, spellOn } from "./health-own";
import {
  addDays,
  ageOnDate,
  daysBetweenText,
  makeIsoDate,
} from "./kernel/dates";
import { outsideAccountOf } from "./modules/budgets";
import {
  housingKeptBack,
  livingPlan,
  mainBalance,
  recordMedicalDebt,
} from "./modules/business";
import { careNeedOf } from "./modules/health";
import { stateOfCountedPlace } from "./modules/counted-moves";
import { lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { webReach, type WebReach } from "./modules/outcome-web";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { parameter, type Parameter } from "./parameters";
import {
  livingCostsRegionForState,
  type LivingCostsRegion,
} from "./reference/living-costs-data";
import { worldLevel } from "./world-draw";
import type {
  CoreAPI,
  CoreState,
  IsoDate,
  PersonId,
  PlaceId,
  Source,
} from "./types";

export const MEDICAL_BILL_KIND = "health.medical-bill";
export const MEDICAL_DEBT_OUTCOME = data.outcome;
const PLACE_TWIN = data.personLevel.placeTwin;

const PARAMETERS = data.parameters as unknown as Readonly<
  Record<string, Parameter>
>;
const q = (key: string) => parameter(key, PARAMETERS);

/** What a member's care is covered by, as the coverage engine and the law reach record it. */
export type BillPlan = "employer" | "medicaid" | "medicare" | "none";

const SHARE_KEY: Readonly<Record<BillPlan, string>> = {
  employer: "medicalPatientShareEmployer",
  medicaid: "medicalPatientShareMedicaid",
  medicare: "medicalPatientShareMedicare",
  none: "medicalPatientShareUninsured",
};

/** One member's part of a month's bill. */
export interface BilledMember {
  readonly personId: string;
  readonly plan: BillPlan;
  /** The health engine's care need (0 to 1) the bill read. */
  readonly careNeed: number;
  readonly billMinor: number;
}

/** A bill still owed to the provider: the day it was billed and what is left of it. */
export interface OwedBill {
  readonly billedAt: IsoDate;
  readonly minor: number;
}

/** A household's latest month of medical bills (one row per household, the latest kept). */
export interface MedicalBillRow {
  readonly id: string;
  readonly householdId: string;
  readonly placeId: string;
  readonly date: IsoDate;
  readonly counted: boolean;
  /** Real households the row stands for (one for a full household). */
  readonly weight: number;
  readonly members: readonly BilledMember[];
  /** One real household's bill this month, what it was asked with what it still owed, what it paid and what it could not. */
  readonly billMinor: number;
  readonly askedMinor: number;
  readonly paidMinor: number;
  readonly unpaidMinor: number;
  /** Bills still owed to the provider, oldest first, within the wait before collection. */
  readonly owed: readonly OwedBill[];
  /** What was still unpaid past the wait this month: the part the web's share sends to collections. */
  readonly pastWaitMinor: number;
  /** What the members held and kept back for their home (full households). */
  readonly heldMinor?: number;
  readonly keptBackMinor?: number;
  /** Who was paid, and the cash journal entries that paid them. */
  readonly sellerId: string | null;
  readonly journalIds: readonly string[];
  /** The share of what is unpaid past the wait sent to collections (the web's factor; the rest the provider writes off), and the web month row. */
  readonly collectionsShare: number;
  readonly webRecordId: string | null;
  readonly webLinks: readonly string[];
  /** Links read from the household's own records instead of the web (the place-level twin). */
  readonly ownRecordsFor: readonly string[];
  readonly toCollectionsMinor: number;
  /** The medical-debt record on the household's books, if any part went to collections. */
  readonly debtId: string | null;
  readonly source: Source;
}

/** The survey's region for a place's own state, national where it has none. */
function regionOf(placeId: string): LivingCostsRegion {
  return livingCostsRegionForState(stateOfCountedPlace(placeId) ?? null);
}

/**
 * The places whose households' money the world keeps: those the residents
 * runtime models (the town and the places around it), else the town alone.
 * Null where neither is open (every household is billed). A household
 * elsewhere (a national figure with no books, such as a press outlet's head
 * or a central-bank governor) is not billed (stopgap
 * SG-HEALTH-medical-bill-shape).
 */
function billedPlaces(api: CoreAPI): ReadonlySet<string> | null {
  const rt = residentsRuntime(api.state as CoreState);
  if (rt) return new Set(rt.input.accounts.map((row) => row.placeId));
  return api.state.modules.has(LAWS_MODULE_ID)
    ? new Set([lawChain(api).townPlaceId])
    : null;
}

const PARENT = (
  customers.parents as Record<
    string,
    {
      nationalParameter: string;
      regionalParameters: Record<string, string>;
      sizeParameters: Record<string, string>;
    }
  >
)[data.medicalServicesParent]!;
/** The parent's components the opening's customers already buy in everyday living (the clinic's nonphysician services). */
const BOUGHT_COMPONENTS = customers.householdServices
  .filter((row) => row.parentKey === data.medicalServicesParent)
  .map((row) => row.componentAnnualParameter);

/**
 * One consumer unit's yearly medical services for its region and size, as
 * the living-cost estimate joins the survey's tables (size times the region's
 * ratio to the nation), less the components bought in everyday living.
 */
function annualOutOfPocketUsd(
  api: CoreAPI,
  region: LivingCostsRegion,
  size: number,
): number {
  const p = (key: string) => api.parameter(key);
  const top = p("openingCustomerSizeTopCode");
  const column = size >= top ? "5plus" : String(Math.max(1, size));
  const national = p(PARENT.nationalParameter);
  const regional = p(
    PARENT.regionalParameters[region] ?? PARENT.nationalParameter,
  );
  const sized = p(PARENT.sizeParameters[column] ?? PARENT.nationalParameter);
  const bought = BOUGHT_COMPONENTS.reduce((n, key) => n + p(key), 0);
  const parent = national > 0 ? sized * (regional / national) : sized;
  return national > 0 ? parent * (1 - bought / national) : parent;
}

interface Person {
  readonly personId: string;
  readonly plan: BillPlan;
  readonly careNeed: number;
}

interface Household {
  readonly householdId: string;
  readonly placeId: string;
  /** The survey's region for the household's own place. */
  readonly region: LivingCostsRegion;
  readonly counted: boolean;
  readonly weight: number;
  readonly incomeFifth: number;
  readonly members: readonly Person[];
  /** Whether the household's members' Medicaid coverage is read from their own records (the town's, whose coverage the law reach keeps). */
  readonly ownMedicaid: boolean;
}

function sourceFor(today: string): Source {
  return {
    tag: "ESTIMATED",
    asOf: today,
    citation:
      "BLS Consumer Expenditure Survey 2024, medical services (CXUMEDSERVSLB0101M, Table 1800 by region and size), less the clinic component bought in everyday living; each member's part by the care their health record asks (MEPS Statistical Brief #533, 2018: the top 5 percent of spenders, 48.3 percent of spending) and the share of care their coverage leaves them (MEPS Statistical Brief #441, 2011, Figure 6). What goes unpaid goes to collections (CFPB, Medical Debt Burden in the United States, 2022).",
    estimatedFrom:
      "A household's month of out-of-pocket medical services, from its members' coverage and health records; what its cash cannot cover is placed for collection.",
  };
}

/** The town's sellers of medical care, the largest staff first. */
function medicalSellers(api: CoreAPI, placeId: string): string[] {
  const core = api.state as CoreState;
  const kinds = new Set(data.medicalSellerClassifications);
  const staff = new Map<string, number>();
  for (const job of core.jobs.values())
    if (job.endsAt === undefined)
      staff.set(job.organizationId, (staff.get(job.organizationId) ?? 0) + 1);
  return [...core.organizations.values()]
    .filter(
      (org) =>
        org.placeId === placeId &&
        kinds.has(org.classification ?? "") &&
        !core.finance.businesses.get(org.id)?.closedAt &&
        core.cashJournal.residualAccountByOwner.has(org.id),
    )
    .sort(
      (a, b) =>
        (staff.get(b.id) ?? 0) - (staff.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id),
    )
    .map((org) => org.id);
}

/**
 * Each person's plan today, full or counted, by the same rule: Medicare at
 * its age, Medicaid where the law reach keeps their coverage
 * (coverageSpellsNow, by person id), an employer plan, or none. Their own
 * Medicaid record is read in the town, the place whose residents' coverage
 * the reach keeps; null spells mean the world does not model it.
 */
function plans(
  api: CoreAPI,
  today: string,
): {
  readonly plan: (personId: string, age: number, employer: boolean) => BillPlan;
  readonly ownMedicaid: (placeId: string) => boolean;
} {
  const spells = coverageSpellsNow(api);
  const medicare = api.parameter("healthMedicareAge");
  const town = api.state.modules.has(LAWS_MODULE_ID)
    ? lawChain(api).townPlaceId
    : null;
  return {
    ownMedicaid: (placeId) => spells !== null && placeId === town,
    plan: (personId, age, employer) => {
      if (age >= medicare) return "medicare";
      if (spells && spellOn(spells.get(personId), today)) return "medicaid";
      return employer ? "employer" : "none";
    },
  };
}

/**
 * Everyone the pass bills this month, full and counted, by household: the
 * households of the places whose money the world keeps (billedPlaces).
 */
function householdsToBill(
  api: CoreAPI,
  coverage: ReadonlyMap<string, string>,
  countedHolders: ReadonlySet<string>,
): Household[] {
  const core = api.state as CoreState;
  const today = makeIsoDate(core.date);
  const { plan, ownMedicaid } = plans(api, today);
  const billed = billedPlaces(api);
  const regions = new Map<string, LivingCostsRegion>();
  const region = (placeId: string) => {
    let found = regions.get(placeId);
    if (!found) regions.set(placeId, (found = regionOf(placeId)));
    return found;
  };
  const incomes = fullHouseholdIncomes(core);
  const out: Household[] = [];
  const byHousehold = new Map<string, Person[]>();
  for (const person of core.people.values()) {
    if (!person.alive || person.id.startsWith("official:")) continue;
    const home = core.households.get(person.householdId);
    if (!home?.memberIds.includes(person.id)) continue;
    if (billed && !billed.has(home.placeId)) continue;
    const age = ageOnDate(makeIsoDate(person.birthDate), today);
    const list = byHousehold.get(person.householdId) ?? [];
    list.push({
      personId: person.id,
      plan: plan(person.id, age, coverage.get(person.id) === "employer"),
      careNeed: careNeedOf(core, person.id),
    });
    byHousehold.set(person.householdId, list);
  }
  for (const [householdId, members] of byHousehold) {
    const placeId = core.households.get(householdId)!.placeId;
    out.push({
      householdId,
      placeId,
      region: region(placeId),
      counted: false,
      weight: 1,
      incomeFifth: incomeBandOf(incomes.get(householdId) ?? 0),
      members,
      ownMedicaid: ownMedicaid(placeId),
    });
  }
  const rt = residentsRuntime(core);
  if (rt) {
    for (const h of rt.store.liveHouseholds()) {
      if (core.households.has(h.id)) continue;
      if (billed && !billed.has(h.placeId)) continue;
      const members = rt.store.countedMembers(h).map((m) => {
        const personId = rt.store.ids[m]!;
        const age = ageOnDate(makeIsoDate(rt.store.born[m]!), today);
        return {
          personId,
          plan: plan(personId, age, countedHolders.has(h.id)),
          careNeed: countedIllnessOf(api, personId as PersonId) ? 1 : 0,
        };
      });
      if (!members.length) continue;
      out.push({
        householdId: h.id,
        placeId: h.placeId,
        region: region(h.placeId),
        counted: true,
        weight: rt.store.weightOf(h),
        incomeFifth: incomeBandOf(householdIncome(rt, h)),
        members,
        ownMedicaid: ownMedicaid(h.placeId),
      });
    }
  }
  return out.sort((a, b) => a.householdId.localeCompare(b.householdId));
}

/** Each member's bill this month, in minor units. */
function billMembers(
  api: CoreAPI,
  households: readonly Household[],
): Map<string, BilledMember[]> {
  const core = api.state as CoreState;
  // stopgapId: SG-HEALTH-medical-bill-shape — no age profile or use gap by
  // coverage; a counted member's care need is one while ill, else none.
  api.stopgap("SG-HEALTH-medical-bill-shape");
  const ratio = q("medicalSeriousIllnessCostRatio");
  const one = api.parameter("one");
  const care = (need: number) => one + (ratio - one) * need;
  // The town's average care is the survey's: everyone's care need, scaled.
  let people = 0,
    weighted = 0;
  for (const h of households)
    for (const m of h.members) {
      people += h.weight;
      weighted += h.weight * care(m.careNeed);
    }
  const norm = people > 0 && weighted > 0 ? weighted / people : one;
  const level = worldLevel(
    one,
    core.seed,
    "world-living-cost-level",
    "worldLivingCostSpreadShare",
  );
  const average = q("medicalPatientShareAverage");
  const perMonth =
    api.parameter("minorPerDollar") / api.parameter("monthsPerYear");
  const out = new Map<string, BilledMember[]>();
  for (const h of households) {
    const size = h.members.length;
    const perMember =
      (annualOutOfPocketUsd(api, h.region, size) * level) / size;
    out.set(
      h.householdId,
      h.members.map((m) => ({
        personId: m.personId,
        plan: m.plan,
        careNeed: m.careNeed,
        billMinor: Math.round(
          perMember *
            perMonth *
            (care(m.careNeed) / norm) *
            (q(SHARE_KEY[m.plan]) / average),
        ),
      })),
    );
  }
  return out;
}

/**
 * The share of a household's bills unpaid past the wait that its provider
 * sends to collections rather than writing off as financial assistance (the
 * hospitals' bad debt against their charity care), times the web's factor.
 */
function collectionsShare(
  api: CoreAPI,
  h: Household,
): { share: number; reach: WebReach; except: readonly string[] } {
  const except = h.ownMedicaid ? [PLACE_TWIN] : [];
  const reach = webReach(
    api,
    h.placeId,
    "finance.medical-debt-in-collections",
    { incomeFifth: h.incomeFifth },
    except.length ? new Set(except) : undefined,
  );
  return {
    share: Math.min(
      api.parameter("one"),
      q("medicalCollectionsBaseShare") * reach.factor,
    ),
    reach,
    except,
  };
}

const journalId = (date: string, sequence: number | undefined) =>
  sequence === undefined ? null : `journal:${date}:${sequence}`;

/** A full household pays from what its members hold, less what they keep back for their home. */
function payFull(
  api: CoreAPI,
  h: Household,
  askedMinor: number,
  sellers: readonly string[],
  source: Source,
): Pick<
  MedicalBillRow,
  "paidMinor" | "heldMinor" | "keptBackMinor" | "sellerId" | "journalIds"
> {
  const core = api.state as CoreState;
  const today = core.date;
  const members = h.members
    .map((m) => core.people.get(m.personId as PersonId)!)
    .filter((person) => core.cashJournal.residualAccountByOwner.has(person.id));
  const held = members.reduce(
    (n, person) => n + mainBalance(core, person.id),
    0,
  );
  // Rent or the mortgage first, as for everyday living: what falls due by
  // the next bill day, less the pay due in before then.
  const until = nextFirst(today);
  let pay = 0;
  for (const person of members) {
    const job = core.jobs.get(person.jobId ?? "");
    if (job && job.endsAt === undefined) pay += job.wageDailyMinor;
  }
  const keptBack = housingKeptBack(core, h.householdId, until, pay);
  const plan = livingPlan(core, h.householdId);
  const own = sellers.find((id) => plan?.sellers.has(id));
  const payee = own ?? sellers[0] ?? outsideAccountOf(api);
  const budget = Math.max(0, Math.min(askedMinor, held - keptBack));
  const journalIds: string[] = [];
  let paid = 0;
  if (payee && budget > 0)
    for (const [leg, person] of members.entries()) {
      if (paid >= budget) break;
      const receipt = api.accounts().transfer({
        id: `medical:${h.householdId}:${today}:${leg}`,
        from: api.accounts().main(person.id),
        to: api.accounts().main(payee),
        amountMinor: budget - paid,
        reasonKey: MEDICAL_BILL_KIND,
        partial: true,
        source,
      });
      paid += receipt.paidMinor;
      const id = journalId(today, receipt.journalSequence);
      if (id && receipt.paidMinor > 0) journalIds.push(id);
    }
  bookSale(core, payee, paid);
  return {
    paidMinor: paid,
    heldMinor: held,
    keptBackMinor: keptBack,
    sellerId: payee ?? null,
    journalIds,
  };
}

/** The 1st of the next month. */
function nextFirst(today: string): IsoDate {
  const next = addDays(makeIsoDate(`${today.slice(0, 7)}-01`), 32);
  return makeIsoDate(`${next.slice(0, 7)}-01`);
}

/** The seller's books take the sale, as everyday living's do. */
function bookSale(core: CoreState, sellerId: string | undefined, paid: number) {
  if (!sellerId || paid <= 0) return;
  const book = core.finance.businesses.get(sellerId);
  if (!book) return;
  book.receivedMinor += paid;
  book.salesReceivedMinor += paid;
}

/**
 * The counted households pay through their groups' accounts in one entry per
 * place, each group up to what it holds less its housing arrears; a group's
 * shortfall falls on its households in proportion to what they were asked.
 */
function payCounted(
  api: CoreAPI,
  households: readonly Household[],
  askedOf: (householdId: string) => number,
  sellersOf: (placeId: string) => readonly string[],
  source: Source,
): Map<
  string,
  { paid: number; sellerId: string | null; journalId: string | null }
> {
  const core = api.state as CoreState;
  const rt = residentsRuntime(core);
  const out = new Map<
    string,
    { paid: number; sellerId: string | null; journalId: string | null }
  >();
  if (!rt) return out;
  fundGroups(api, rt);
  const byPlace = new Map<string, Household[]>();
  for (const h of households)
    if (h.counted)
      byPlace.set(h.placeId, [...(byPlace.get(h.placeId) ?? []), h]);
  for (const [placeId, list] of byPlace) {
    const amountByContract: Record<string, number> = {};
    let requested = 0;
    for (const h of list) {
      const asked = askedOf(h.householdId);
      if (asked <= 0) continue;
      amountByContract[`hh:${h.householdId}`] = asked;
      requested += Math.round(asked * h.weight);
    }
    const sellerId = sellersOf(placeId)[0] ?? outsideAccountOf(api) ?? null;
    const account = sellerId
      ? core.cashJournal.residualAccountByOwner.get(sellerId)
      : undefined;
    if (!account || requested <= 0) continue;
    const id = `medical:counted:${placeId}:${core.date}`;
    const sequence = core.cashJournal.nextSequence;
    const charged = chargeGroups(api, rt, {
      id,
      flow: {
        id,
        kind: "purchase",
        financeKind: MEDICAL_BILL_KIND,
        placeId: placeId as PlaceId,
        amountByContract,
      },
      requested,
      toAccount: account,
      reasonKey: MEDICAL_BILL_KIND,
      source,
      // Rent or the mortgage first: a group's housing arrears stay back.
      reserveOf: (group) => rt.arrears.get(group) ?? 0,
    });
    bookSale(core, sellerId ?? undefined, charged.paid);
    const entry = charged.paid > 0 ? journalId(core.date, sequence) : null;
    for (const h of list) {
      const asked = amountByContract[`hh:${h.householdId}`] ?? 0;
      const ix = rt.store.householdOf.get(h.householdId);
      const group = ix === undefined ? -1 : rt.store.households[ix]!.group;
      const row = charged.byGroup.get(group);
      const share = row && row.asked > 0 ? row.paid / row.asked : 0;
      out.set(h.householdId, {
        paid: Math.min(asked, Math.round(asked * share)),
        sellerId,
        journalId: entry,
      });
    }
  }
  return out;
}

const table = (api: CoreAPI, module: string) =>
  api.moduleState(module).table("medicalBills");

/**
 * What a household owes its provider after paying: payments settle the
 * oldest bills first, and this month's bill joins what is left.
 */
function settleOwed(
  owed: readonly OwedBill[],
  billMinor: number,
  paidMinor: number,
  today: IsoDate,
): OwedBill[] {
  let left = paidMinor;
  const out: OwedBill[] = [];
  for (const row of [...owed, { billedAt: today, minor: billMinor }]) {
    const settled = Math.min(left, row.minor);
    left -= settled;
    if (row.minor - settled > 0)
      out.push({ billedAt: row.billedAt, minor: row.minor - settled });
  }
  return out;
}

/**
 * The month's bills: every household's members billed by their coverage and
 * health, paid with what it still owed from what the household holds, and
 * the bills unpaid past the wait placed for collection on its books.
 */
export function billMedicalCare(
  api: CoreAPI,
  input: {
    readonly module: string;
    /** Each full person's current coverage plan, by person id. */
    readonly coverage: ReadonlyMap<string, string>;
    /** Counted households holding an employer plan now. */
    readonly countedHolders: ReadonlySet<string>;
  },
): void {
  const core = api.state as CoreState;
  const today = makeIsoDate(core.date);
  const source = sourceFor(today);
  const households = householdsToBill(
    api,
    input.coverage,
    input.countedHolders,
  );
  if (!households.length) return;
  const bills = billMembers(api, households);
  const billOf = (householdId: string) =>
    (bills.get(householdId) ?? []).reduce((n, m) => n + m.billMinor, 0);
  const prior = new Map(
    households.map((h) => [
      h.householdId,
      (table(api, input.module).get(`medical-bill:${h.householdId}`) as
        MedicalBillRow | undefined) ?? undefined,
    ]),
  );
  // stopgapId: SG-HEALTH-medical-owed-fill-in — a counted household's owed
  // bills stand for its whole weight, but a fill-in carries one household's
  // worth onto the new full household and none onto the records that take
  // the rest of its weight (the same root as the pool item
  // world-fill-in-strands-group-living-arrears).
  const owedOf = (householdId: string) =>
    (prior.get(householdId)?.owed ?? []).reduce((n, row) => n + row.minor, 0);
  const sellers = new Map<string, string[]>();
  const sellersOf = (placeId: string) => {
    let list = sellers.get(placeId);
    if (!list) sellers.set(placeId, (list = medicalSellers(api, placeId)));
    return list;
  };
  const counted = payCounted(
    api,
    households,
    (id) => billOf(id) + owedOf(id),
    sellersOf,
    source,
  );
  // A bill unpaid this long is placed for collection (26 CFR 1.501(r)-6).
  const wait = q("medicalCollectionsWaitDays");
  for (const h of households) {
    const members = bills.get(h.householdId) ?? [];
    const billMinor = billOf(h.householdId);
    const askedMinor = billMinor + owedOf(h.householdId);
    const paid = h.counted
      ? {
          paidMinor: counted.get(h.householdId)?.paid ?? 0,
          sellerId: counted.get(h.householdId)?.sellerId ?? null,
          journalIds: [counted.get(h.householdId)?.journalId].filter(
            (id): id is string => !!id,
          ),
        }
      : payFull(api, h, askedMinor, sellersOf(h.placeId), source);
    const owing = settleOwed(
      prior.get(h.householdId)?.owed ?? [],
      billMinor,
      paid.paidMinor,
      today,
    );
    const due = owing.filter(
      (row) => daysBetweenText(row.billedAt, today) >= wait,
    );
    const owed = owing.filter((row) => !due.includes(row));
    const pastWait = due.reduce((n, row) => n + row.minor, 0);
    const { share, reach, except } = collectionsShare(api, h);
    const toCollections = Math.round(pastWait * share);
    // stopgapId: SG-HEALTH-medical-debt-collections — the debt is never paid
    // down or sold, and the provider's write-off keeps no record.
    if (pastWait > 0) api.stopgap("SG-HEALTH-medical-debt-collections");
    const head = [...h.members].sort((a, b) =>
      a.personId.localeCompare(b.personId),
    )[0]!;
    const debtId =
      toCollections > 0
        ? recordMedicalDebt(api, {
            householdId: h.householdId,
            borrowerId: head.personId,
            creditorId:
              paid.sellerId ??
              prior.get(h.householdId)?.sellerId ??
              outsideAccountOf(api) ??
              "",
            amountMinor: toCollections,
            billId: `medical-bill:${h.householdId}`,
            webRecordId: reach.recordId,
            source,
          })
        : null;
    const row: MedicalBillRow = {
      id: `medical-bill:${h.householdId}`,
      householdId: h.householdId,
      placeId: h.placeId,
      date: today,
      counted: h.counted,
      weight: h.weight,
      members,
      billMinor,
      askedMinor,
      ...paid,
      unpaidMinor: Math.max(0, askedMinor - paid.paidMinor),
      owed,
      pastWaitMinor: pastWait,
      collectionsShare: share,
      webRecordId: reach.recordId,
      webLinks: reach.parts.map((part) => part.link),
      ownRecordsFor: except,
      toCollectionsMinor: toCollections,
      debtId: debtId ?? prior.get(h.householdId)?.debtId ?? null,
      source,
    };
    table(api, input.module).put(row as never);
  }
}

/** A household's latest month of medical bills, if it was billed. */
export function medicalBillOf(
  api: CoreAPI,
  module: string,
  householdId: string,
): MedicalBillRow | undefined {
  return table(api, module).get(`medical-bill:${householdId}`) as
    MedicalBillRow | undefined;
}
