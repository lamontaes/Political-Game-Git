import { LOCAL_MEMBER_AGENDA_VERSION } from "../governing/member-agenda-settings";
import hearingData from "../../../data/research/local-government/county-budget-hearings.json" with { type: "json" };
import { addDays, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  countyGovernmentUnit,
  governmentUnit,
  governmentUnitJurisdictionId,
} from "../government-units";
import { homePurchaseTerms } from "../home-purchase";
import { introduceMeasure, measurePosition } from "../legislation";
import { LEGISLATIVE_SESSION_CALENDARS } from "../legislative-session-calendar-data";
import { nextSessionCalendarDate } from "../legislative-session-calendar";
import { localFiscalAuthorityFor } from "../local-fiscal-authority";
import {
  localTaxGovernment,
  localTaxPowerEvidenceFor,
} from "../local-tax-authority";
import { nextMeasureNumbering } from "../measure-numbering";
import {
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
} from "../municipal-ordinance-procedure";
import { PROPERTY_BASE_KEY } from "../property-tax-bases";
import { chamberByKey } from "../legislature-rules";
import { rulePackById } from "../legislature-rule-packs";
import {
  BUDGET_SOURCES,
  type PublicBudgetGovernment,
} from "../public-budgets/store";
import { fiscalYearContaining } from "../public-budgets/fiscal";
import { proposeNextYearBudget } from "../public-budgets/month";
import { attachTaxProposal } from "../tax-policy";
import { money } from "../resources";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import type {
  CountyBudgetHearing,
  CountyBudgetProposal,
} from "../county-budget-record";
import { councilRules } from "./local-council-binding";
import { sittingLocalOfficers } from "./local-government-seats";

/**
 * COUNTY BUDGET AND TAX HEARINGS (CO-5).
 *
 * Each year, before its fiscal year opens, a county's board holds a budget
 * hearing on one of its own sitting days. The books project next year's
 * spending and revenue; the property tax the budget needs is the levy the
 * board is asked to set, filed as the county's property tax terms through the
 * local tax seam (`local-fiscal-authority.ts`, `local-tax-authority.ts`) under
 * the state's own authority rule. The board's members vote it at their next
 * reading from their own principles and the day the county's offices close
 * without a budget (`governing/chamber-votes.ts`). A levy that passes is the
 * property tax households are assessed on its effective day, and the year's
 * adopted budget expects exactly that (`public-budgets/month.ts`).
 *
 * One rule for every county, from the books and the data file
 * (`data/research/local-government/county-budget-hearings.json`); no place is
 * named here.
 */

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
  `${hearingData.hearingLeadDays.basis}: ${LEAD_DAYS} days before the fiscal year (${hearingData.hearingLeadDays.source})`,
  `${hearingData.personsPerHousehold.basis}: ${PERSONS_PER_HOUSEHOLD} people per household (${hearingData.personsPerHousehold.source})`,
  `${hearingData.ownerOccupiedShare.basis}: ${OWNER_SHARE} of homes owner-occupied (${hearingData.ownerOccupiedShare.source})`,
];

function countyBooks(
  world: World,
  geoid: string | null,
): PublicBudgetGovernment | null {
  if (!geoid) return null;
  return (
    world.publicBudgets?.governments.find(
      (government) =>
        government.level === "county" && government.key === `county:${geoid}`,
    ) ?? null
  );
}

function boardCalendar(unitId: string) {
  const unit = governmentUnit(unitId);
  const rules = unit ? councilRules(unit) : null;
  return rules
    ? (rulePackById(rules.packId).session.sittingCalendar ??
        LEGISLATIVE_SESSION_CALENDARS.council)
    : LEGISLATIVE_SESSION_CALENDARS.council;
}

/** The first fiscal year whose hearing lies ahead, and the board's sitting day for it. */
export function nextCountyBudgetHearing(
  world: World,
  unitId: string,
  fiscalYearStart: string,
): {
  readonly fiscalYear: number;
  readonly startsOn: IsoDate;
  readonly hearingOn: IsoDate;
} {
  const today = world.currentDate;
  const containing = fiscalYearContaining(
    addDays(today, LEAD_DAYS),
    fiscalYearStart,
  );
  const startsOn = addDays(containing.endsOn, 1);
  const target = addDays(startsOn, -LEAD_DAYS);
  const hearingOn = nextSessionCalendarDate(
    boardCalendar(unitId),
    addDays(target, -1),
    "sitting",
  );
  return {
    fiscalYear: fiscalYearContaining(startsOn, fiscalYearStart).fiscalYear,
    startsOn,
    hearingOn,
  };
}

function hearingDueKey(unitId: string, fiscalYear: number): string {
  return `${HEARING_PREFIX}${unitId}:${fiscalYear}`;
}

function scheduleHearing(
  world: World,
  unitId: string,
  countyJurisdictionId: EntityId,
  plan: ReturnType<typeof nextCountyBudgetHearing>,
): World {
  const stableKey = hearingDueKey(unitId, plan.fiscalYear);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: plan.hearingOn,
    transitionKey: COUNTY_BUDGET_HEARING_TRANSITION,
    entityIds: [countyJurisdictionId],
    jurisdictionId: countyJurisdictionId,
    provenance: {
      kind: "authored",
      note: `The board's sitting day nearest ${LEAD_DAYS} days before fiscal ${plan.fiscalYear} opens on ${plan.startsOn}.`,
    },
  });
}

/**
 * Puts the next budget hearing on the calendar of every county whose board is
 * seated and whose books are open. Idempotent: one due item per county and
 * fiscal year, and each hearing sets the next one.
 */
export function ensureCountyBudgetHearings(world: World): World {
  let next = world;
  for (const government of world.publicBudgets?.governments ?? []) {
    if (government.level !== "county") continue;
    const geoid = government.key.slice("county:".length);
    const unit = countyGovernmentUnit(geoid);
    if (!unit || sittingLocalOfficers(next, unit).length === 0) continue;
    next = scheduleHearing(
      next,
      unit.id,
      government.jurisdictionId,
      nextCountyBudgetHearing(next, unit.id, government.fiscalYearStart),
    );
  }
  return next;
}

/** The levy the books need next year and the rate on the county's homes that raises it. */
function proposeLevy(
  world: World,
  government: PublicBudgetGovernment,
  state: PublicBudgetGovernment | null,
): CountyBudgetProposal {
  const prior = government.years.at(-1)!;
  const proposed = proposeNextYearBudget(world, government, state);
  const spending = proposed.appropriations.reduce((a, b) => a + b, 0);
  const revenue = proposed.expectedRevenue.reduce((a, b) => a + b, 0);
  // The balance carried in is spent across the year once; it pays for part
  // of the spending, so only what it and the revenue leave uncovered is levied.
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
    homePurchaseTerms(world, government.jurisdictionId, null).priceMinor / 100;
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

function withHearing(world: World, hearing: CountyBudgetHearing): World {
  const store = world.publicBudgets;
  if (!store) return world;
  const rows = store.countyBudgetHearings ?? [];
  return {
    ...world,
    publicBudgets: {
      ...store,
      countyBudgetHearings: [
        ...rows.filter((row) => row.key !== hearing.key),
        hearing,
      ],
    },
  };
}

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function hearingEvent(
  world: World,
  hearing: CountyBudgetHearing,
  kind: "held" | "adopted" | "rejected" | "lapsed",
  involved: readonly EntityId[],
): World {
  return recordWorldEvent(world, {
    stableKey: `event:${hearing.key}:${kind}`,
    type: `county.budget-${kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
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
  });
}

/**
 * The hearing day: the books' proposal is put to the board as the county's
 * property tax terms, on the board's agenda, and its reading is set. Where the
 * state gives counties no property tax, the county holds none and the next
 * year's is scheduled all the same.
 */
export function countyBudgetHearingHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const tail = dueItem.stableKey.slice(HEARING_PREFIX.length);
  const unitId = tail.slice(0, tail.lastIndexOf(":"));
  const fiscalYear = Number(tail.slice(tail.lastIndexOf(":") + 1));
  const unit = unitId ? governmentUnit(unitId) : null;
  const geoid = unit?.countyGeoid ?? null;
  const government = countyBooks(world, geoid);
  if (!unit || !government || sittingLocalOfficers(world, unit).length === 0)
    return done(world, "This county keeps no seated board or open books.");
  // The next year's hearing is set whatever this one does.
  const following = (next: World): World => {
    const books = countyBooks(next, geoid);
    return books
      ? scheduleHearing(
          next,
          unit.id,
          books.jurisdictionId,
          nextCountyBudgetHearing(next, unit.id, books.fiscalYearStart),
        )
      : next;
  };
  const key = `county-budget:${government.key}:${fiscalYear}`;
  if (
    (world.publicBudgets?.countyBudgetHearings ?? []).some(
      (row) => row.key === key,
    )
  )
    return done(following(world), "This hearing was already held.");
  const officers = sittingLocalOfficers(world, unit);
  const playerId =
    world.control.kind === "person" ? world.control.personId : null;
  const sponsor =
    officers.find((seat) => !seat.mayor && seat.personId !== playerId) ??
    officers.find((seat) => seat.personId !== playerId);
  if (!sponsor)
    return done(following(world), "No member can bring the budget.");
  const asSponsor: World = {
    ...world,
    control: { kind: "person", personId: sponsor.personId },
  };
  const questionKey = "us-tax-terms:county.property-tax-terms";
  const granted = localFiscalAuthorityFor(
    asSponsor,
    unit.id,
    questionKey,
    "typed-proposal",
  );
  const government_ = localTaxGovernment(unit.id);
  if (!granted.ok || !government_)
    return done(
      following(world),
      `The county sets no property tax levy: ${granted.ok ? "no taxing government" : granted.reason}`,
    );
  const state =
    world.publicBudgets?.governments.find(
      (row) => row.level === "state" && row.stateKey === government.stateKey,
    ) ?? null;
  const proposal = proposeLevy(world, government, state);
  const opening = fiscalYearContaining(
    addDays(dueItem.dueAt, LEAD_DAYS),
    government.fiscalYearStart,
  );
  if (opening.fiscalYear !== fiscalYear)
    return done(following(world), "This hearing's fiscal year has moved.");
  const fiscalStart = opening.startsOn;
  const voteDay = nextSessionCalendarDate(
    boardCalendar(unit.id),
    world.currentDate,
    "reading",
  );
  const proposition = world.policyCatalog.propositions[granted.propositionId]!;
  const pack = rulePackById(granted.authority.rulePackId);
  const numbering = nextMeasureNumbering(asSponsor, {
    jurisdictionId: granted.jurisdictionId,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: granted.authority.rulePackId,
  });
  let next = introduceMeasure(asSponsor, {
    // The board's own agenda key: the council reading reads its government
    // from it, as it does for every measure a member brings.
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
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = attachTaxProposal(next, {
    stableKey: `${key}:tax`,
    measureId,
    sponsorPersonId: sponsor.personId,
    publicGovernmentIdentity: {
      kind: "local-government",
      governmentKey: unit.id,
      jurisdictionId: granted.jurisdictionId,
    },
    power: localTaxPowerEvidenceFor({
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
  });
  const taxProposalId = next.history.taxProposals!.at(-1)!.id;
  const placed = placeMunicipalOrdinanceOnAgenda(
    { ...next, control: asSponsor.control },
    { governmentKey: unit.id, measureId },
  );
  if (!placed.ok)
    return done(
      following({ ...next, control: world.control }),
      `The budget could not go on the agenda: ${placed.reason}`,
    );
  next = scheduleOrdinaryCouncilReading(
    { ...placed.world, control: world.control },
    unit.id,
    measureId,
  );
  const hearing: CountyBudgetHearing = {
    key,
    governmentKey: government.key,
    unitId: unit.id,
    fiscalYear,
    startsOn: fiscalStart,
    hearingOn: makeIsoDate(world.currentDate),
    stage: "heard",
    proposal,
    measureId,
    taxProposalId,
    sponsorPersonId: sponsor.personId,
    decidedOn: null,
    adoptedPropertyTaxLevy: null,
  };
  next = withHearing(next, hearing);
  next = hearingEvent(next, hearing, "held", [
    measureId,
    ...officers.map((seat) => seat.personId),
  ]);
  // The vote lands at the board's reading; its outcome is read the day after.
  const reading = next.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === "civic:council-reading-due" &&
        item.entityIds.includes(measureId),
    )
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt))[0];
  const checkOn = addDays(reading?.dueAt ?? voteDay, 1);
  next = scheduleFutureDueItem(next, {
    stableKey: `${ADOPTION_PREFIX}${hearing.key}:${checkOn}`,
    dueAt: checkOn,
    transitionKey: COUNTY_BUDGET_ADOPTION_TRANSITION,
    entityIds: [measureId],
    jurisdictionId: granted.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [measureId] },
  });
  return done(following(next), "The board heard the county's budget.");
}

/**
 * The day after the board's reading: a levy the board passed is adopted, one it
 * did not is rejected and the county keeps its current rate; a measure still
 * waiting is looked at again a week on, until the fiscal year opens.
 */
export function countyBudgetAdoptionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  const measureId = dueItem.entityIds[0]!;
  const hearing = (world.publicBudgets?.countyBudgetHearings ?? []).find(
    (row) => row.measureId === measureId,
  );
  if (!hearing || hearing.stage !== "heard")
    return done(world, "No open county budget hearing has this measure.");
  const position = measurePosition(world, measureId);
  const officers = sittingLocalOfficers(
    world,
    governmentUnit(hearing.unitId)!,
  ).map((seat) => seat.personId);
  if (!position.terminal) {
    const again = addDays(world.currentDate, 7);
    if (again >= hearing.startsOn) {
      const lapsed: CountyBudgetHearing = {
        ...hearing,
        stage: "lapsed",
        decidedOn: world.currentDate,
      };
      return done(
        hearingEvent(withHearing(world, lapsed), lapsed, "lapsed", [
          measureId,
          ...officers,
        ]),
        "The board did not vote the levy before the year opened.",
      );
    }
    return done(
      scheduleFutureDueItem(world, {
        stableKey: `${ADOPTION_PREFIX}${hearing.key}:${again}`,
        dueAt: again,
        transitionKey: COUNTY_BUDGET_ADOPTION_TRANSITION,
        entityIds: [measureId],
        jurisdictionId: dueItem.jurisdictionId,
        provenance: { kind: "simulated", sourceEntityIds: [measureId] },
      }),
      "The board's reading is still to come.",
    );
  }
  const passed = position.phase === "enacted";
  const decided: CountyBudgetHearing = {
    ...hearing,
    stage: passed ? "adopted" : "rejected",
    decidedOn: world.currentDate,
    adoptedPropertyTaxLevy: passed ? hearing.proposal.propertyTaxLevy : null,
  };
  return done(
    hearingEvent(
      withHearing(world, decided),
      decided,
      passed ? "adopted" : "rejected",
      [measureId, ...officers],
    ),
    passed
      ? "The board adopted the levy."
      : "The board did not adopt the levy.",
  );
}

export function countyBudgetHearingHandlers() {
  return [
    [COUNTY_BUDGET_HEARING_TRANSITION, countyBudgetHearingHandler],
    [COUNTY_BUDGET_ADOPTION_TRANSITION, countyBudgetAdoptionHandler],
  ] as const;
}
