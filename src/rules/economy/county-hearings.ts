/** Full retained county hearing/levy, forecast, assessed base, rate, calendar, sponsor/numbering and ordered requests. No World/store writer. */
import hearingData from "../../../data/research/local-government/county-budget-hearings.json";
import billIntroductionTable from "../../../data/research/laws/bill-introductions-2022.json";
import { addDays, makeIsoDate } from "../../simulation/dates";
import { money } from "./cost-money";
import { BUDGET_SOURCES } from "./budget-policy";
import { fiscalYearContaining } from "./budget-fiscal";
import {
  proposeNextYearBudget as nextBudget,
  type BudgetMonthFacts,
} from "./budget-month";
import {
  homePurchaseTerms as purchase,
  type HomePurchaseFacts,
} from "./home-purchase-records";
import { nextSessionCalendarDate } from "../legislatures/sitting-calendar";
import { LEGISLATIVE_SESSION_CALENDARS } from "../../simulation/legislative-session-calendar-data";
import {
  governmentUnit,
  countyGovernmentUnit,
  governmentUnitJurisdictionId,
} from "../../simulation/government-units";
import { chamberByKey } from "../../simulation/legislature-rules";
import { rulePackById } from "../../simulation/legislature-rule-packs";
import {
  stateBillNumberingStyle,
  stateChamberStyle,
} from "../../simulation/bill-numbering-styles";
import { isFederalDistrictUsps } from "../../simulation/state-reference";
import { LOCAL_MEMBER_AGENDA_VERSION } from "../../simulation/governing/member-agenda-settings";
import { PROPERTY_BASE_KEY } from "../../simulation/property-tax-bases";
import type { scheduleFutureDueItem } from "../../simulation/future-transitions";
import type { introduceMeasure } from "../../simulation/legislation";
import type { attachTaxProposal } from "../../simulation/tax-policy";
import type { recordWorldEvent } from "../../simulation/world";
import type * as ordinances from "../../simulation/municipal-ordinance-procedure";
import type { localFiscalAuthorityFor as nativeFiscal } from "../../simulation/local-fiscal-authority";
import type * as taxes from "../../simulation/local-tax-authority";
import type { councilRules as nativeCouncil } from "../../simulation/living-world/local-council-binding";
import type { sittingLocalOfficers as nativeOfficers } from "../../simulation/living-world/local-government-seats";
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type {
  ChamberRule,
  LegislativeRulePack,
} from "../../simulation/legislature-rules";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type { PublicBudgetGovernment } from "../../simulation/public-budgets/store";
import type {
  CountyBudgetHearing,
  CountyBudgetProposal,
} from "../../simulation/county-budget-record";
export interface CountyHearingFacts {
  readonly id: EntityId;
  readonly startedAt: IsoDate;
  readonly currentDate: IsoDate;
  readonly records: World["history"];
  readonly control: World["control"];
  readonly policyCatalog: World["policyCatalog"];
  readonly publicBudgets: World["publicBudgets"];
  readonly budget: BudgetMonthFacts;
  readonly housing: HomePurchaseFacts;
  readonly officers: ReadonlyMap<string, ReturnType<typeof nativeOfficers>>;
  readonly council: ReadonlyMap<string, ReturnType<typeof nativeCouncil>>;
  readonly fiscal: ReadonlyMap<string, ReturnType<typeof nativeFiscal>>;
  readonly taxGovernment: ReadonlyMap<
    string,
    ReturnType<typeof taxes.localTaxGovernment>
  >;
  readonly taxPower: ReadonlyMap<
    string,
    ReturnType<typeof taxes.localTaxPowerEvidenceFor>
  >;
  readonly agendaResponse: () => {
    readonly ok: boolean;
    readonly reason: string;
    readonly facts: CountyHearingFacts;
  };
}
export type CountyHearingResult = Omit<
  FutureTransitionHandlerResult,
  "world"
> & { readonly facts: CountyHearingFacts };
export type CountyHearingRequest = (
  | {
      readonly kind: "scheduleFutureDueItem";
      readonly input: Parameters<typeof scheduleFutureDueItem>[1];
    }
  | {
      readonly kind: "introduceMeasure";
      readonly input: Parameters<typeof introduceMeasure>[1];
    }
  | {
      readonly kind: "attachTaxProposal";
      readonly input: Parameters<typeof attachTaxProposal>[1];
    }
  | {
      readonly kind: "recordWorldEvent";
      readonly input: Parameters<typeof recordWorldEvent>[1];
    }
  | {
      readonly kind: "placeMunicipalOrdinanceOnAgenda";
      readonly input: Parameters<
        typeof ordinances.placeMunicipalOrdinanceOnAgenda
      >[1];
    }
  | {
      readonly kind: "scheduleOrdinaryCouncilReading";
      readonly input: readonly [string, EntityId];
    }
  | {
      readonly kind: "recordHearing";
      readonly input: readonly CountyBudgetHearing[];
    }
) & { readonly control: World["control"] };
export const countyHearingSourceKey = (...keys: unknown[]) =>
  JSON.stringify(keys);
function receipt<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  if (!map.has(key)) throw Error("Missing county hearing source: " + key);
  return map.get(key)!;
}
function sittingLocalOfficers(
  facts: CountyHearingFacts,
  unit: GovernmentUnitIdentity,
) {
  return receipt(facts.officers, unit.id);
}
function councilRules(facts: CountyHearingFacts, unit: GovernmentUnitIdentity) {
  return receipt(facts.council, unit.id);
}
function localFiscalAuthorityFor(
  facts: CountyHearingFacts,
  unit: string,
  question: string,
  kind: string,
) {
  return receipt(
    facts.fiscal,
    countyHearingSourceKey(facts.control, unit, question, kind),
  );
}
function localTaxGovernment(facts: CountyHearingFacts, id: string) {
  return receipt(facts.taxGovernment, id);
}
function localTaxPowerEvidenceFor(
  facts: CountyHearingFacts,
  input: Parameters<typeof taxes.localTaxPowerEvidenceFor>[0],
) {
  return receipt(facts.taxPower, countyHearingSourceKey(input));
}
function homePurchaseTerms(
  facts: CountyHearingFacts,
  id: EntityId,
  buyer: null,
) {
  return purchase(facts.housing, id, buyer);
}
function proposeNextYearBudget(
  facts: CountyHearingFacts,
  gov: PublicBudgetGovernment,
  state: PublicBudgetGovernment | null,
) {
  return nextBudget(facts.budget, gov, state);
}
export const COUNTY_BUDGET_HEARING_TRANSITION =
  "county:budget-hearing" as const;
export const COUNTY_BUDGET_ADOPTION_TRANSITION =
  "county:budget-adoption-check" as const;
const HEARING_PREFIX = "county-budget-hearing:";
const ADOPTION_PREFIX = "county-budget-adoption:";
const SERIES_KEY = "tax:county-property";
const PROPERTY_SOURCE = BUDGET_SOURCES.indexOf("propertyTax");
const LEAD_DAYS = hearingData.hearingLeadDays.value;
const PERSONS_PER_HOUSEHOLD = hearingData.personsPerHousehold.value;
const OWNER_SHARE = hearingData.ownerOccupiedShare.value;
const RATE_DENOMINATOR = hearingData.rateDenominator;
const ESTIMATE_NOTES: readonly string[] = [
  `${hearingData.hearingLeadDays.basis}: ${LEAD_DAYS} days (${hearingData.hearingLeadDays.source})`,
  `${hearingData.personsPerHousehold.basis}: ${PERSONS_PER_HOUSEHOLD} people per household (${hearingData.personsPerHousehold.source})`,
  `${hearingData.ownerOccupiedShare.basis}: ${OWNER_SHARE} of homes owner-occupied (${hearingData.ownerOccupiedShare.source})`,
];
// STOPGAP: economy.county-hearing-reserve-rate
function countyBooks(
  facts: CountyHearingFacts,
  geoid: string | null,
): PublicBudgetGovernment | null {
  if (!geoid) return null;
  return (
    facts.publicBudgets?.governments.find(
      (government) =>
        government.level === "county" && government.key === `county:${geoid}`,
    ) ?? null
  );
}
function boardCalendar(facts: CountyHearingFacts, unitId: string) {
  const unit = governmentUnit(unitId);
  const rules = unit ? councilRules(facts, unit) : null;
  return rules
    ? (rulePackById(rules.packId).session.sittingCalendar ??
        LEGISLATIVE_SESSION_CALENDARS.council)
    : LEGISLATIVE_SESSION_CALENDARS.council;
}
export function nextCountyBudgetHearing(
  facts: CountyHearingFacts,
  unitId: string,
  fiscalYearStart: string,
): {
  readonly fiscalYear: number;
  readonly startsOn: IsoDate;
  readonly hearingOn: IsoDate;
} {
  const today = facts.currentDate;
  const containing = fiscalYearContaining(
    addDays(today, LEAD_DAYS),
    fiscalYearStart,
  );
  const startsOn = addDays(containing.endsOn, 1);
  const target = addDays(startsOn, -LEAD_DAYS);
  const hearingOn = nextSessionCalendarDate(
    boardCalendar(facts, unitId),
    addDays(target, -1),
    "sitting",
  );
  return {
    fiscalYear: fiscalYearContaining(startsOn, fiscalYearStart).fiscalYear,
    startsOn,
    hearingOn: makeIsoDate(hearingOn),
  };
}
function hearingDueKey(unitId: string, fiscalYear: number): string {
  return `${HEARING_PREFIX}${unitId}:${fiscalYear}`;
}
function* scheduleHearing(
  facts: CountyHearingFacts,
  unitId: string,
  countyJurisdictionId: EntityId,
  plan: ReturnType<typeof nextCountyBudgetHearing>,
): Generator<CountyHearingRequest, CountyHearingFacts, CountyHearingFacts> {
  const stableKey = hearingDueKey(unitId, plan.fiscalYear);
  if (facts.records.futureDueItems.some((item) => item.stableKey === stableKey))
    return facts;
  return yield {
    kind: "scheduleFutureDueItem",
    input: {
      stableKey,
      dueAt: plan.hearingOn,
      transitionKey: COUNTY_BUDGET_HEARING_TRANSITION,
      entityIds: [countyJurisdictionId],
      jurisdictionId: countyJurisdictionId,
      provenance: {
        kind: "authored",
        note: `The board's sitting day nearest ${LEAD_DAYS} days before fiscal ${plan.fiscalYear} opens on ${plan.startsOn}.`,
      },
    },
    control: facts.control,
  };
}
export function* ensureCountyBudgetHearings(
  facts: CountyHearingFacts,
): Generator<CountyHearingRequest, CountyHearingFacts, CountyHearingFacts> {
  let next = facts;
  for (const government of facts.publicBudgets?.governments ?? []) {
    if (government.level !== "county") continue;
    const geoid = government.key.slice("county:".length);
    const unit = countyGovernmentUnit(geoid);
    if (!unit || sittingLocalOfficers(next, unit).length === 0) continue;
    next = yield* scheduleHearing(
      next,
      unit.id,
      government.jurisdictionId,
      nextCountyBudgetHearing(next, unit.id, government.fiscalYearStart),
    );
  }
  return next;
}
// STOPGAP: economy.county-levy-home-basis
function proposeLevy(
  facts: CountyHearingFacts,
  government: PublicBudgetGovernment,
  state: PublicBudgetGovernment | null,
): CountyBudgetProposal {
  const prior = government.years.at(-1)!;
  const proposed = proposeNextYearBudget(facts, government, state);
  const spending = proposed.appropriations.reduce((a, b) => a + b, 0);
  const revenue = proposed.expectedRevenue.reduce((a, b) => a + b, 0);
  const gap = Math.max(
    0,
    Math.round(
      spending +
        proposed.reserveDeposit -
        (proposed.carriedBalance ?? 0) -
        revenue,
    ),
  );
  const levy = (proposed.expectedRevenue[PROPERTY_SOURCE] ?? 0) + gap;
  const households = government.population / PERSONS_PER_HOUSEHOLD;
  const homeValue =
    homePurchaseTerms(facts, government.jurisdictionId, null).priceMinor / 100;
  const assessedBase = Math.round(households * OWNER_SHARE * homeValue);
  return {
    appropriations: Math.round(spending),
    expectedRevenue: Math.round(revenue),
    propertyTaxLevy: Math.round(levy),
    priorPropertyTaxLevy: prior.expectedRevenue[PROPERTY_SOURCE] ?? 0,
    gap,
    basis: gap > 0 ? "books-projection-plus-gap" : "books-projection",
    rateNumerator:
      assessedBase > 0
        ? Math.round((levy / assessedBase) * RATE_DENOMINATOR)
        : 0,
    rateDenominator: RATE_DENOMINATOR,
    assessedBase,
    estimates: ESTIMATE_NOTES,
  };
}
function* withHearing(
  facts: CountyHearingFacts,
  hearing: CountyBudgetHearing,
): Generator<CountyHearingRequest, CountyHearingFacts, CountyHearingFacts> {
  const store = facts.publicBudgets;
  if (!store) return facts;
  const rows = store.countyBudgetHearings ?? [];
  return yield {
    kind: "recordHearing",
    input: [...rows.filter((row) => row.key !== hearing.key), hearing],
    control: facts.control,
  };
}
function done(facts: CountyHearingFacts, context: string): CountyHearingResult {
  return {
    facts,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}
function* hearingEvent(
  facts: CountyHearingFacts,
  hearing: CountyBudgetHearing,
  kind: "held" | "adopted" | "rejected" | "lapsed",
  involved: readonly EntityId[],
): Generator<CountyHearingRequest, CountyHearingFacts, CountyHearingFacts> {
  return yield {
    kind: "recordWorldEvent",
    input: {
      stableKey: `event:${hearing.key}:${kind}`,
      type: `county.budget-${kind}`,
      occurredAt: facts.currentDate,
      recordedAt: facts.currentDate,
      jurisdictionId: governmentUnitJurisdictionId(
        governmentUnit(hearing.unitId)!,
      ),
      involvedEntityIds: [...involved],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "county-budget",
        `fiscal-year:${hearing.fiscalYear}`,
        `levy:${hearing.proposal.propertyTaxLevy}`,
      ],
      summary: `county-budget-${kind}:${hearing.unitId}:${hearing.fiscalYear}`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    },
    control: facts.control,
  };
}
// STOPGAP: economy.county-hearing-dto-transport
export function* countyBudgetHearingHandler(
  facts: CountyHearingFacts,
  dueItem: FutureDueItem,
): Generator<CountyHearingRequest, CountyHearingResult, CountyHearingFacts> {
  const tail = dueItem.stableKey.slice(HEARING_PREFIX.length);
  const unitId = tail.slice(0, tail.lastIndexOf(":"));
  const fiscalYear = Number(tail.slice(tail.lastIndexOf(":") + 1));
  const unit = unitId ? governmentUnit(unitId) : null;
  const geoid = unit?.countyGeoid ?? null;
  const government = countyBooks(facts, geoid);
  if (!unit || !government || sittingLocalOfficers(facts, unit).length === 0)
    return done(facts, "This county keeps no seated board or open books.");
  const following = function* (
    next: CountyHearingFacts,
  ): Generator<CountyHearingRequest, CountyHearingFacts, CountyHearingFacts> {
    const books = countyBooks(next, geoid);
    return books
      ? yield* scheduleHearing(
          next,
          unit.id,
          books.jurisdictionId,
          nextCountyBudgetHearing(next, unit.id, books.fiscalYearStart),
        )
      : next;
  };
  const key = `county-budget:${government.key}:${fiscalYear}`;
  if (
    (facts.publicBudgets?.countyBudgetHearings ?? []).some(
      (row) => row.key === key,
    )
  )
    return done(yield* following(facts), "This hearing was already held.");
  const officers = sittingLocalOfficers(facts, unit);
  const playerId =
    facts.control.kind === "person" ? facts.control.personId : null;
  const sponsor =
    officers.find((seat) => !seat.mayor && seat.personId !== playerId) ??
    officers.find((seat) => seat.personId !== playerId);
  if (!sponsor)
    return done(yield* following(facts), "No member can bring the budget.");
  const asSponsor: CountyHearingFacts = {
    ...facts,
    control: { kind: "person", personId: sponsor.personId },
  };
  const questionKey = "us-tax-terms:county.property-tax-terms";
  const granted = localFiscalAuthorityFor(
    asSponsor,
    unit.id,
    questionKey,
    "typed-proposal",
  );
  const government_ = localTaxGovernment(facts, unit.id);
  if (!granted.ok || !government_)
    return done(
      yield* following(facts),
      `The county sets no property tax levy: ${granted.ok ? "no taxing government" : granted.reason}`,
    );
  const state =
    facts.publicBudgets?.governments.find(
      (row) => row.level === "state" && row.stateKey === government.stateKey,
    ) ?? null;
  const proposal = proposeLevy(facts, government, state);
  const opening = fiscalYearContaining(
    addDays(dueItem.dueAt, LEAD_DAYS),
    government.fiscalYearStart,
  );
  if (opening.fiscalYear !== fiscalYear)
    return done(yield* following(facts), "This hearing has moved.");
  const fiscalStart = opening.startsOn;
  const voteDay = nextSessionCalendarDate(
    boardCalendar(facts, unit.id),
    facts.currentDate,
    "reading",
  );
  const proposition = facts.policyCatalog.propositions[granted.propositionId]!;
  const pack = rulePackById(granted.authority.rulePackId);
  const numbering = nextMeasureNumbering(asSponsor, {
    jurisdictionId: granted.jurisdictionId,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: granted.authority.rulePackId,
  });
  let next = yield {
    kind: "introduceMeasure",
    input: {
      stableKey: `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(unit.id)}:county-budget:${fiscalYear}`,
      jurisdictionId: granted.jurisdictionId,
      rulePackId: granted.authority.rulePackId,
      ...numbering,
      shortTitle: `${proposition.name}, fiscal ${fiscalYear}`,
      summary: proposition.question,
      origin: "member-introduction",
      subjectClass: "revenue",
      originChamberKey: "council",
      sponsorPersonId: sponsor.personId,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
    },
    control: asSponsor.control,
  };
  const measureId = next.records.legislativeMeasures!.at(-1)!.id;
  next = yield {
    kind: "attachTaxProposal",
    input: {
      stableKey: `${key}:tax`,
      measureId,
      sponsorPersonId: sponsor.personId,
      publicGovernmentIdentity: {
        kind: "local-government",
        governmentKey: unit.id,
        jurisdictionId: granted.jurisdictionId,
      },
      power: localTaxPowerEvidenceFor(next, {
        asOf: next.currentDate,
        ...government_,
        governmentKey: unit.id,
        instrument: "property",
      }),
      terms: {
        seriesKey: SERIES_KEY,
        baseKey: PROPERTY_BASE_KEY,
        baseLabel: "tax-base:property-value",
        rateNumerator: proposal.rateNumerator,
        rateDenominator: proposal.rateDenominator,
        allowanceMinorUnits: 0,
        exemptBaseKeys: [],
        currency: money(0, "USD").currency,
        effectiveDelayDays: 90,
        collectionLagDays: 30,
        publicPurpose: `county-budget:${fiscalYear}`,
        assumptionNote: proposal.estimates.join(" | "),
        legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
        instrument: "property",
      },
    },
    control: next.control,
  };
  const taxProposalId = next.records.taxProposals!.at(-1)!.id;
  const placed = (yield {
    kind: "placeMunicipalOrdinanceOnAgenda",
    input: { governmentKey: unit.id, measureId },
    control: { ...next, control: asSponsor.control }.control,
  }).agendaResponse();
  if (!placed.ok)
    return done(
      yield* following({ ...next, control: facts.control }),
      `The budget could not go on the agenda: ${placed.reason}`,
    );
  next = yield {
    kind: "scheduleOrdinaryCouncilReading",
    input: [unit.id, measureId],
    control: { ...placed.facts, control: facts.control }.control,
  };
  const hearing: CountyBudgetHearing = {
    key,
    governmentKey: government.key,
    unitId: unit.id,
    fiscalYear,
    startsOn: fiscalStart,
    hearingOn: makeIsoDate(facts.currentDate),
    stage: "heard",
    proposal,
    measureId,
    taxProposalId,
    sponsorPersonId: sponsor.personId,
    decidedOn: null,
    adoptedPropertyTaxLevy: null,
  };
  next = yield* withHearing(next, hearing);
  next = yield* hearingEvent(next, hearing, "held", [
    measureId,
    ...officers.map((seat) => seat.personId),
  ]);
  const reading = next.records.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === "civic:council-reading-due" &&
        item.entityIds.includes(measureId),
    )
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt))[0];
  const checkOn = addDays(makeIsoDate(reading?.dueAt ?? voteDay), 1);
  next = yield {
    kind: "scheduleFutureDueItem",
    input: {
      stableKey: `${ADOPTION_PREFIX}${hearing.key}:${checkOn}`,
      dueAt: checkOn,
      transitionKey: COUNTY_BUDGET_ADOPTION_TRANSITION,
      entityIds: [measureId],
      jurisdictionId: granted.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [measureId] },
    },
    control: next.control,
  };
  return done(yield* following(next), "The board heard the county's budget.");
}
interface BillIntroductionRow {
  readonly usps: string;
  readonly billsIntroduced: number | null;
}
const BILL_INTRODUCTION_ROWS: readonly BillIntroductionRow[] = (
  billIntroductionTable as {
    readonly rows: readonly BillIntroductionRow[];
  }
).rows;
const MIDDLE_BILLS_INTRODUCED: number = (() => {
  const counts = BILL_INTRODUCTION_ROWS.flatMap((row) =>
    row.billsIntroduced === null ? [] : [row.billsIntroduced],
  ).sort((left, right) => left - right);
  return counts[Math.floor((counts.length - 1) / 2)]!;
})();
export function openingBillNumber(
  jurisdictionKey: string | null,
  chambers: number,
  startedAt: string,
): number {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey ?? "")?.[1];
  const counted = BILL_INTRODUCTION_ROWS.find(
    (row) => row.usps === usps,
  )?.billsIntroduced;
  const perYear = counted ?? MIDDLE_BILLS_INTRODUCED;
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  const daysGone = Math.floor((date.getTime() - january) / 86400000);
  return 1 + Math.floor((perYear / Math.max(1, chambers)) * (daysGone / 365));
}
export function councilOpeningNumber(startedAt: string): number {
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  return 1 + Math.floor((date.getTime() - january) / (7 * 86400000));
}
export interface MeasureDesignationInput {
  readonly jurisdictionId: EntityId;
  readonly originChamber: ChamberRule;
  readonly rulePackId?: string;
}
export interface MeasureNumbering {
  readonly designation: string;
  readonly numberingSession: LegislativeMeasureNumberingSession;
}
type NumberingKind = "state" | "congress" | "dc-council" | "council" | "plain";
interface NumberingScheme {
  readonly kind: NumberingKind;
  readonly template: string;
  readonly sessionOf: (year: number) => SessionIdentity;
  readonly firstNumberOf: (session: SessionIdentity) => number;
}
const FROM_ONE = (): number => 1;
interface SessionIdentity {
  readonly key: string;
  readonly label: string;
  readonly openingYear: number;
  readonly period: number;
}
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
function annualSession(year: number, label: string): SessionIdentity {
  return { key: `${year}`, label, openingYear: year, period: year };
}
export function congressNumberForYear(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}
export function dcCouncilPeriodForYear(year: number): number {
  return Math.floor((year - 1975) / 2) + 1;
}
const DC_COUNCIL_TEMPLATE = "B{period}-{n4}";
function schemeFor(
  pack: LegislativeRulePack | null,
  chamber: ChamberRule,
): NumberingScheme {
  const plainTemplate = `${chamber.billDesignationPrefix} {n}`;
  if (pack === null) {
    return {
      kind: "plain",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year, `${year} Regular Session`),
      firstNumberOf: FROM_ONE,
    };
  }
  if (pack.institution?.numberingCycle === "biennial-congress") {
    return {
      kind: "congress",
      template: plainTemplate,
      firstNumberOf: FROM_ONE,
      sessionOf: (year) => {
        const congress = congressNumberForYear(year);
        return {
          key: `congress-${congress}`,
          label: `${ordinal(congress)} Congress`,
          openingYear: 1789 + (congress - 1) * 2,
          period: congress,
        };
      },
    };
  }
  if (chamber.chamberKey === "council") {
    if (isFederalDistrictUsps(pack.jurisdictionKey.replace(/^US-/, ""))) {
      return {
        kind: "dc-council",
        template: DC_COUNCIL_TEMPLATE,
        firstNumberOf: FROM_ONE,
        sessionOf: (year) => {
          const period = dcCouncilPeriodForYear(year);
          return {
            key: `council-period-${period}`,
            label: `Council Period ${period}`,
            openingYear: 1975 + (period - 1) * 2,
            period,
          };
        },
      };
    }
    return {
      kind: "council",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year, `${year}`),
      firstNumberOf: FROM_ONE,
    };
  }
  const style = stateBillNumberingStyle(pack.jurisdictionKey);
  const chamberStyle = stateChamberStyle(style, chamber.chamberKey);
  const template = chamberStyle.template;
  const firstNumberOf = (session: SessionIdentity): number =>
    chamberStyle.evenYearFirstNumber !== null && session.openingYear % 2 === 0
      ? chamberStyle.evenYearFirstNumber
      : chamberStyle.firstNumber;
  if (style.period === "biennial") {
    const opensOdd = style.biennialOpensIn === "odd";
    return {
      kind: "state",
      template,
      firstNumberOf,
      sessionOf: (year) => {
        const opening = (year % 2 === 1) === opensOdd ? year : year - 1;
        return {
          key: `${opening}-${opening + 1}`,
          label: `${opening}-${opening + 1} Regular Session`,
          openingYear: opening,
          period: opening,
        };
      },
    };
  }
  return {
    kind: "state",
    template,
    sessionOf: (year) => annualSession(year, `${year} Regular Session`),
    firstNumberOf,
  };
}
function formatDesignation(
  template: string,
  number: number,
  session: SessionIdentity,
): string {
  return template
    .replace("{yy}", String(session.openingYear % 100).padStart(2, "0"))
    .replace("{period}", String(session.period))
    .replace("{n4}", String(number).padStart(4, "0"))
    .replace("{n}", String(number));
}
function fullDesignationOf(
  kind: NumberingKind,
  designation: string,
  label: string,
): string {
  if (kind === "congress") return `${designation}, ${label}`;
  if (kind === "dc-council") return designation;
  return `${designation} (${label})`;
}
function numberOf(designation: string): number | null {
  const digits = /(\d+)[A-Z]?$/.exec(designation.trim())?.[1];
  return digits === undefined ? null : Number(digits);
}
function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}
function packOrNull(
  rulePackId: string | undefined,
): LegislativeRulePack | null {
  if (rulePackId === undefined) return null;
  try {
    return rulePackById(rulePackId);
  } catch {
    return null;
  }
}
function sessionKeyOf(
  record: LegislativeMeasureRecord,
  scheme: NumberingScheme,
): string {
  return (
    record.numberingSession?.key ??
    scheme.sessionOf(yearOf(record.introducedAt)).key
  );
}
// STOPGAP: economy.county-board-numbering-frontier
export function nextMeasureNumbering(
  facts: CountyHearingFacts,
  input: MeasureDesignationInput,
): MeasureNumbering {
  const pack = packOrNull(input.rulePackId);
  const scheme = schemeFor(pack, input.originChamber);
  const originChamberKey = input.originChamber.chamberKey;
  const session = scheme.sessionOf(yearOf(facts.currentDate));
  const openingSession = scheme.sessionOf(yearOf(facts.startedAt));
  const inThisSession = (facts.records.legislativeMeasures ?? []).filter(
    (record) =>
      record.jurisdictionId === input.jurisdictionId &&
      sessionKeyOf(record, scheme) === session.key,
  );
  const inThisChamber = inThisSession.filter(
    (record) => record.originChamberKey === originChamberKey,
  );
  const alreadyInThisChamber = inThisChamber.length;
  const recordedStart = scheme.firstNumberOf(session);
  const sessionStart = inThisChamber.some(
    (record) => (numberOf(record.designation) ?? recordedStart) < recordedStart,
  )
    ? 1
    : recordedStart;
  const firstNumber =
    session.key !== openingSession.key
      ? sessionStart
      : scheme.kind === "council"
        ? councilOpeningNumber(facts.startedAt)
        : sessionStart -
          1 +
          openingBillNumber(
            pack?.jurisdictionKey ?? null,
            pack?.chambers.length ?? 1,
            facts.startedAt,
          );
  const taken = new Set(inThisSession.map((record) => record.designation));
  const highest = Math.max(
    0,
    ...inThisChamber.map((record) => numberOf(record.designation) ?? 0),
  );
  let number =
    session.key === openingSession.key && highest > 0
      ? highest + 1
      : firstNumber + alreadyInThisChamber;
  let designation = formatDesignation(scheme.template, number, session);
  while (taken.has(designation)) {
    number += 1;
    designation = formatDesignation(scheme.template, number, session);
  }
  return {
    designation,
    numberingSession: {
      key: session.key,
      label: session.label,
      fullDesignation: fullDesignationOf(
        scheme.kind,
        designation,
        session.label,
      ),
    },
  };
}
