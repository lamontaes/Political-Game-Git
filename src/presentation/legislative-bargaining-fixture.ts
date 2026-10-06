import {
  createLegislativeScenario,
  floorStageByKey,
  chamberByKey,
  measurePosition,
  recordEventKnowledge,
  recordFiledProvision,
  recordRelationshipInteraction,
  recordWorldEvent,
  type EntityId,
  type LegislativeScenario,
  type SeatedBody,
  type World,
  type LegislativeProvisionBeneficiary,
  type MetricSegmentKey,
} from "../simulation";
import { applyLegislativeStep } from "./legislation-session";
import { createLegislativeBargainingProgress } from "./legislative-bargaining";
import type { LegislativeBargainingSubjectFacts } from "./run-b-conversation-progress";
import {
  bargainingRoomContexts,
  bargainingScenePeople,
  formatPresentationTime,
  type LegislativeBargainingSeat,
} from "./legislative-bargaining-brief";

/** Test and development content for the authored bargaining demonstration. */

export const BARGAINING_BRIEF_SCENARIO_KEY = "kentucky";

export const PROGRAM_PROVISION_KEY = "pilot-support-limit";
export const REQUESTED_PROVISION_KEY = "local-project-match";

/**
 * The suffix the authored Kentucky sitting's adopted provision has always used.
 *
 * It is not `local-project-match`, and it is deliberately not being made to
 * match. This string is a persisted identity: worlds saved before the content
 * bank existed hold their adopted provision under a stable key ending in it,
 * and changing the string would orphan those records rather than rename them.
 * A migration would be the alternative, and a migration is a much larger
 * promise than keeping four characters.
 */
export const LEGACY_ADOPTED_PROVISION_SUFFIX = "section-4";

export const REQUESTED_SEGMENT_KEY: MetricSegmentKey =
  "transit.ashland-boyd-local-match";

// PLACEHOLDER(research: how-bargaining-limits-and-pay-counteroffers-are-set): the three amounts below and the $8,000,000
// in `fiscalNoteSummaryFor` are typed in, not sourced.
export const PROGRAM_AMOUNT_MINOR_UNITS = 800_000_000;
export const REQUESTED_AMOUNT_MINOR_UNITS = 140_000_000;
export const CAPPED_AMOUNT_MINOR_UNITS = 60_000_000;

/**
 * The place record the requested local match is about.
 *
 * The two labels below name a real Kentucky city. Until this constant they
 * named it only as text: nothing connected "Ashland" in a player-visible
 * clause to the game's own location corpus, so the sitting could have been
 * talking about a place the game does not know. The GEOID is the Census
 * identifier the places corpus is keyed by, and
 * `legislative-bargaining-place.test.ts` holds the labels to it — the record
 * has to exist, and it has to sit in the legislature this sitting belongs to.
 *
 * This grounds the claim; it does not yet generalize the sitting. The cast and
 * the place are still written for one Kentucky measure, and widening that
 * means authoring a second sitting rather than deleting this one.
 */
export const REQUESTED_MATCH_PLACE_GEOID = "2102368";

export const BENEFICIARY_LABEL = "the Ashland–Boyd County Transit Authority";
export const PLACE_LABEL = "Ashland";

export function requestedProvisionText(amountMinorUnits: number): string {
  const amount = `${(amountMinorUnits / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
  return `Of the amounts appropriated by Section 3 of this Act, not more than ${amount} may be awarded to ${BENEFICIARY_LABEL} as the local match required for pilot participation, and an award under this section shall not reduce the amount available to any other participating provider.`;
}

/** True when this legislature has an authored bargaining sitting at all. */
export function bargainingBriefSupports(scenarioKey: string): boolean {
  return scenarioKey === BARGAINING_BRIEF_SCENARIO_KEY;
}

/** One filed section of the bill, said the way the canonical record wants it. */
export interface FiledSectionBrief {
  readonly keySuffix: string;
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  readonly fiscalExposureLabel?: string;
  readonly fiscalExposureMinorUnits?: number;
}

/** HB 214 as filed: three sections, none of which names a provider. */
export const FILED_SECTION_BRIEFS: readonly FiledSectionBrief[] = [
  {
    keySuffix: "section-1",
    provisionKey: "purpose",
    sectionNumber: 1,
    heading: "Purpose and construction",
    text: "It is the purpose of this Act to test whether removing the fare barrier increases access to work, care and school for riders who already qualify for state assistance. Nothing in this Act creates an entitlement to service.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "everyone the Act reaches",
    },
  },
  {
    keySuffix: "section-2",
    provisionKey: "eligibility",
    sectionNumber: 2,
    heading: "Eligible riders",
    text: "A rider is eligible under this Act if the rider is enrolled in a state assistance program administered under KRS Chapter 205 at the time of boarding. A participating provider shall not require a separate application.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "every rider enrolled in a state assistance program",
    },
  },
  {
    keySuffix: "section-3",
    provisionKey: PROGRAM_PROVISION_KEY,
    sectionNumber: 3,
    heading: "Pilot support limit",
    text: "There is appropriated for the two-year pilot a sum not to exceed $8,000,000, to be distributed among participating providers in proportion to eligible boardings. No provider is named in this section.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel:
        "every participating provider, in proportion to eligible boardings",
    },
    fiscalExposureLabel: "$8,000,000 over the two-year pilot",
    fiscalExposureMinorUnits: PROGRAM_AMOUNT_MINOR_UNITS,
  },
];

/**
 * The fiscal note, about the bill this world actually filed.
 *
 * It used to name HB 214 outright, which was true only for as long as every
 * save was handed that one bill. A note is written about a measure, so the
 * measure's own designation is what it names.
 */
export function fiscalNoteSummaryFor(designation: string): string {
  return `A fiscal note on ${designation} as filed put the two-year exposure at $8,000,000, with the caveat that a named local match would sit on top of that figure rather than inside it.`;
}

export const PRIOR_ADVOCATE_HISTORY_SUMMARY =
  "The two carried a road-fund bill together last session and neither of them had to be chased for a vote.";
export const PRIOR_GUARDIAN_HISTORY_SUMMARY =
  "They sit two seats apart in committee and have never worked on anything together.";

/** The complete subject facts, minus the identities only a world can supply. */
export function bargainingSubjectFacts(input: {
  readonly measureId: EntityId;
  readonly measureStableKey: string;
  readonly designation: string;
  readonly shortTitle: string;
  readonly chamberName: string;
  readonly nextStepLabel: string;
  readonly fiscalNoteEventStableKey: string;
  readonly analystPersonId: EntityId;
  readonly advocatePersonId: EntityId;
  readonly guardianPersonId: EntityId;
}): LegislativeBargainingSubjectFacts {
  return {
    measureId: input.measureId,
    measureStableKey: input.measureStableKey,
    designation: input.designation,
    shortTitle: input.shortTitle,
    chamberName: input.chamberName,
    nextStepLabel: input.nextStepLabel,

    programProvisionKey: PROGRAM_PROVISION_KEY,
    programSectionLabel: "Section 3",
    programHeading: "Pilot support limit",
    programReach: {
      relation: "reaching",
      who: "every rider enrolled in a state assistance program",
    },
    billAmountLabel: "$8,000,000",

    requestedProvisionKey: REQUESTED_PROVISION_KEY,
    // Pinned, not derived. This sitting has written its adopted provision
    // under `...:section-4` since the sitting existed, and a saved world holds
    // it under that key.
    requestedProvisionStableKeySuffix: LEGACY_ADOPTED_PROVISION_SUFFIX,
    // The accepted #79 phrasing, held exactly. These three reach persisted
    // records, so they are identity-adjacent even though they read as prose.
    requestedExposurePhrase: "local match",
    requestedQuestionSubject: "local match amendment",
    requestedDescriptionSubject: "Section 4, a local project match",
    requestedSectionNumber: 4,
    requestedSectionLabel: "Section 4",
    requestedHeading: "Local project match",
    requestedText: requestedProvisionText(REQUESTED_AMOUNT_MINOR_UNITS),
    requestedBeneficiaryLabel: BENEFICIARY_LABEL,
    requestedPlaceLabel: PLACE_LABEL,
    requestedStatedGround:
      "The authority is the only fixed-route provider in the region and cannot raise the pilot's local match from fare revenue.",
    requestedAmountLabel: "$1,400,000",
    requestedAmountMinorUnits: REQUESTED_AMOUNT_MINOR_UNITS,
    requestedSegmentKey: REQUESTED_SEGMENT_KEY,

    cappedText: requestedProvisionText(CAPPED_AMOUNT_MINOR_UNITS),
    cappedAmountLabel: "$600,000",
    cappedAmountMinorUnits: CAPPED_AMOUNT_MINOR_UNITS,

    fiscalNoteEventStableKey: input.fiscalNoteEventStableKey,
    analystPersonId: input.analystPersonId,

    advocatePersonId: input.advocatePersonId,
    guardianPersonId: input.guardianPersonId,
    advocateVoice: "district-advocate",
    guardianVoice: "fiscal-guardian",
  };
}

/**
 * One bill, two colleagues, and a genuinely open question.
 *
 * HB 214 is on the House floor and still amendable. Section 3 funds the pilot
 * for everyone who qualifies statewide. One member wants a section written for
 * a transit authority in the place they represent; another has already said in
 * public what this session can afford. The player cannot give both of them what
 * they want with one button, and the game does not decide in advance which
 * answer is the right one.
 *
 * Everything institutional here is the merged legislation core doing its
 * ordinary work: the measure is referred, heard, reported and calendared
 * through the same steps the player would take themselves. Only the bill's
 * *text* and the politics around it are new.
 */

export const BARGAINING_SEED = "legislative-bargaining-2026";
/**
 * The bill this development fixture is about.
 *
 * A fixture literal, and only a fixture literal: the production route numbers
 * its measure from the world it files into, and nothing here reaches it.
 */
export const FIXTURE_DESIGNATION = "HB 214";

export const FISCAL_NOTE_EVENT_STABLE_KEY = "bargaining:hb-214:fiscal-note";

/**
 * The developer fixture is one way of producing a bargaining seat — a whole
 * synthetic world built for the `?view=floor` proof route. Production derives
 * the same seat shape from the player's canonical save instead, and the
 * surface cannot tell the two apart.
 */
export interface LegislativeBargainingFixture extends LegislativeBargainingSeat {
  readonly world: World;
  readonly scenario: LegislativeScenario;
}

export function createLegislativeBargainingFixture(
  seedInput?: string,
): LegislativeBargainingFixture {
  const base = createLegislativeScenario("kentucky");
  const seed = seedInput?.trim() ? seedInput.trim() : BARGAINING_SEED;

  const playerPersonId = base.playerPersonId;
  const advocatePersonId = requirePerson(base.world, 1);
  const guardianPersonId = requirePerson(base.world, 2);
  const analystPersonId = requirePerson(base.world, 3);

  // Only three people in this world sit in the chamber. The rest of the House
  // is seats without minds, and the game says so rather than pretending
  // otherwise.
  const seatedPeople = new Set([
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
  ]);
  const bodies: readonly SeatedBody[] = base.bodies.map((body, index) => ({
    ...body,
    members: body.members.map((member) =>
      index === 0 && member.personId && seatedPeople.has(member.personId)
        ? member
        : { ...member, personId: null },
    ),
  }));
  const scenario: LegislativeScenario = { ...base, bodies };

  const pack = scenario.pack;
  const house = chamberByKey(pack, "house");
  let world = scenario.world;

  world = recordBillText(world, scenario);
  world = recordFiscalNote(world, scenario, analystPersonId);
  world = recordPriorWorkingHistory(
    world,
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
  );

  // The measure walks to the floor through the ordinary steps.
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ] as const) {
    world = applyLegislativeStep(scenario, world, step).world;
  }

  const position = measurePosition(world, scenario.measureId);
  if (position.phase !== "on-floor") {
    throw new Error(
      `The bargaining fixture expected a bill on the floor, not '${position.phase}'.`,
    );
  }
  const stage = floorStageByKey(house, position.floorStageKey ?? "");

  const guardian = world.people[guardianPersonId]!;
  const scenePeople = bargainingScenePeople({
    chamberName: house.name,
    advocatePersonId,
    guardianPersonId,
    // The fixture's own synthetic prior-session setup below records this
    // shared work, so the read is true in the fixture world too.
    advocatePriorWork: "shared-work",
    cause: { sectionLabel: "Section 4", beneficiaryLabel: PLACE_LABEL },
  });

  const { roomContext, privateRoomContext } = bargainingRoomContexts({
    sceneKeyPrefix: `bargaining:${seed}`,
    chamberName: house.name,
    jurisdictionId: scenario.pack.chambers[0]
      ? world.history.legislativeMeasures![0]!.jurisdictionId
      : world.jurisdictionOrder[0]!,
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
    guardianFamilyName: guardian.familyName,
  });

  const progress = createLegislativeBargainingProgress(
    bargainingSubjectFacts({
      measureId: scenario.measureId,
      measureStableKey: "kentucky:measure",
      designation: FIXTURE_DESIGNATION,
      shortTitle: "Transit Access Pilot",
      chamberName: house.name,
      nextStepLabel: stage.label.toLowerCase(),
      fiscalNoteEventStableKey: FISCAL_NOTE_EVENT_STABLE_KEY,
      analystPersonId,
      advocatePersonId,
      guardianPersonId,
    }),
  );

  return {
    world,
    scenario,
    measureId: scenario.measureId,
    measureStableKey: "kentucky:measure",
    playerPersonId,
    advocatePersonId,
    guardianPersonId,
    analystPersonId,
    scenePeople,
    roomContext,
    privateRoomContext,
    progress,
    locationDisplayName: `${world.jurisdictions[roomContext.jurisdictionId]?.name ?? "Kentucky"} State Capitol`,
    locationLabel: "Capitol · Members' room",
    presentationTime: formatPresentationTime(world.currentMoment.minuteOfDay),
    floorIntents: ["offer-targeted-provision", "counter-with-cap"],
  };

  function requirePerson(source: World, index: number): EntityId {
    const personId = source.personOrder[index];
    if (!personId || !source.people[personId]) {
      throw new Error(`The bargaining fixture is missing person ${index}.`);
    }
    return personId;
  }
}

// ---------------------------------------------------------------------------
// The bill as filed
// ---------------------------------------------------------------------------

function recordBillText(world: World, scenario: LegislativeScenario): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === scenario.measureId,
  );
  if (!measure) throw new Error("The bargaining fixture lost its measure.");
  const scope = { jurisdictionId: measure.jurisdictionId, segmentKey: null };

  let next = world;
  for (const section of FILED_SECTION_BRIEFS) {
    next = recordFiledProvision(next, {
      stableKey: `bargaining:hb-214:${section.keySuffix}`,
      measureId: measure.id,
      provisionKey: section.provisionKey,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      text: section.text,
      beneficiary: section.beneficiary,
      applicationScope: scope,
      ...(section.fiscalExposureLabel
        ? {
            fiscalExposureLabel: section.fiscalExposureLabel,
            fiscalExposureMinorUnits: section.fiscalExposureMinorUnits,
          }
        : {}),
    });
  }
  return next;
}

/**
 * The fiscal note exists whether or not the player reads it.
 *
 * Recording it here and gating knowledge on an explicit review is the same
 * pattern the office working document uses: a document in the building is not
 * something you know until you have actually read it.
 */
function recordFiscalNote(
  world: World,
  scenario: LegislativeScenario,
  analystPersonId: EntityId,
): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === scenario.measureId,
  )!;
  return recordWorldEvent(world, {
    stableKey: FISCAL_NOTE_EVENT_STABLE_KEY,
    type: "legislation.fiscal-note-prepared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, measure.jurisdictionId, analystPersonId],
    participants: [
      {
        personId: analystPersonId,
        role: "agency:analyst",
        detail: "Prepared the fiscal note on the measure as filed",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["legislation", "legislation.fiscal-note"],
    summary: fiscalNoteSummaryFor(FIXTURE_DESIGNATION),
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: "Legislative staff office",
        setting: null,
      },
      socialContext: "Routine staff work on a filed bill.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/**
 * A little shared history, so the decision evaluator has something real to read
 * rather than deciding in a vacuum.
 */
function recordPriorWorkingHistory(
  world: World,
  playerPersonId: EntityId,
  advocatePersonId: EntityId,
  guardianPersonId: EntityId,
): World {
  let next = recordRelationshipInteraction(world, {
    stableKey: "bargaining:prior:advocate",
    personIds: canonicalPair(playerPersonId, advocatePersonId),
    eventId: null,
    occurredAt: world.currentDate,
    kind: "work:co-sponsored-bill",
    change: "strengthened",
    significance: "meaningful",
    summary: PRIOR_ADVOCATE_HISTORY_SUMMARY,
    tags: ["relationship.shared-work", "legislation.bargaining"],
  });
  next = recordRelationshipInteraction(next, {
    stableKey: "bargaining:prior:guardian",
    personIds: canonicalPair(playerPersonId, guardianPersonId),
    eventId: null,
    occurredAt: world.currentDate,
    kind: "contact:committee-acquaintance",
    change: "maintained",
    significance: "minor",
    summary: PRIOR_GUARDIAN_HISTORY_SUMMARY,
    tags: ["relationship.shared-work"],
  });
  return next;
}

function canonicalPair(
  first: EntityId,
  second: EntityId,
): readonly [EntityId, EntityId] {
  return first.localeCompare(second) <= 0 ? [first, second] : [second, first];
}

/** Records that the controlled person has actually read the fiscal note. */
export function reviewFiscalNote(
  world: World,
  fixture: LegislativeBargainingFixture,
): World {
  const event = world.history.events.find(
    (record) => record.stableKey === FISCAL_NOTE_EVENT_STABLE_KEY,
  );
  if (!event) throw new Error("The bargaining fixture lost its fiscal note.");
  const alreadyKnown = world.history.knowledge.some(
    (record) =>
      record.eventId === event.id && record.personId === fixture.playerPersonId,
  );
  if (alreadyKnown) return world;
  return recordEventKnowledge(world, {
    stableKey: `bargaining:fiscal-note:knowledge:${fixture.playerPersonId}`,
    personId: fixture.playerPersonId,
    eventId: event.id,
    learnedAt: world.currentDate,
    believedSummary: event.summary,
    accuracy: "accurate",
    confidence: "high",
    source: {
      kind: "public-record",
      reference: "Fiscal note filed with HB 214",
    },
  });
}

export function playerHasReadFiscalNote(
  world: World,
  fixture: LegislativeBargainingFixture,
): boolean {
  const event = world.history.events.find(
    (record) => record.stableKey === FISCAL_NOTE_EVENT_STABLE_KEY,
  );
  return (
    !!event &&
    world.history.knowledge.some(
      (record) =>
        record.eventId === event.id &&
        record.personId === fixture.playerPersonId,
    )
  );
}
