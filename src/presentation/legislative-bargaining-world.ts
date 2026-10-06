import { ensureContextPerson } from "./legislative-context-person";
import { hasRecordedLegislativeSitting } from "./legislative-authored-sitting";
import {
  legislativePackForJurisdiction,
  legislativeWorkKey,
} from "../simulation/legislative-institutions";
import { regularSessionActionRefusal } from "./legislative-session-window";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import {
  chamberByKey,
  characterHistoryContextPersonId,
  floorStageByKey,
  legislativeBlueprint,
  measurePosition,
  recordWorldEvent,
  seatBodyForPack,
  authoredScenarioSeatCount,
  personName,
} from "../simulation";
import type {
  EntityId,
  LegislativeBlueprint,
  SeatedBody,
  World,
} from "../simulation";
import {
  bargainingRoomContexts,
  bargainingScenePeople,
  formatPresentationTime,
  playerHasReadFiscalNoteFor,
  type LegislativeBargainingSeat,
} from "./legislative-bargaining-brief";
import {
  createLegislativeBargainingProgress,
  withAnalysisSeen,
} from "./legislative-bargaining";
import { bargainingSubjectFactsForDraft } from "./legislative-bargaining-brief";
import {
  docketBill,
  recompileRecordedMeasureDraft,
  recompileSavedBill,
  type DocketBill,
} from "./legislation-docket";
import { formatMinorUnits } from "../simulation/legislation-program-families";
import {
  resolvePlayerCapabilities,
  withheldReason,
} from "./player-capabilities";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { priorWorkEvidence } from "./prior-work-evidence";

/**
 * The one question a seated winner's route is allowed to ask:
 *
 *   "Given this canonical player World, does this player currently have a
 *    truthful legislative bargaining context?"
 *
 * Everything in the answer is derived from the world the player actually
 * carries — the seat their election win recorded, the jurisdiction that seat
 * governs (never the one they live in), the measure their own office
 * introduced and walked to the floor, and the colleagues this world models.
 * Nothing is accepted from a caller as a synthetic scenario, and nothing is
 * borrowed from the developer floor fixture, which this module does not
 * import.
 *
 * FAIL CLOSED. Every missing fact returns an explicit reason instead of a
 * substitute: no seat, no rule-pack surface, no authored sitting for this
 * legislature, no bill, or a bill that has not reached the floor. A player who
 * lost the election never gets past the first gate, because losing records no
 * legislative work relationship for capabilities to find.
 */

export type LegislativeBargainingEntry =
  | {
      readonly kind: "available";
      /** The player's world, with the sitting's canonical records ensured. */
      readonly world: World;
      readonly seat: LegislativeBargainingSeat;
    }
  | {
      readonly kind: "unavailable";
      /** Said plainly. Never a fixture, never another jurisdiction's chamber. */
      readonly reason: string;
    };

export interface OpenLegislativeBargainingInput {
  readonly playerPersonId: EntityId;
  /** Compatibility selector for a bill the player chose from the docket. */
  readonly docketKey?: string;
  /** A recorded agenda measure selected by its stable record identity. */
  readonly measureId?: EntityId;
}

export function openLegislativeBargaining(
  world: World,
  input: OpenLegislativeBargainingInput,
): LegislativeBargainingEntry {
  const capabilities = resolvePlayerCapabilities(world);
  if (capabilities.personId !== input.playerPersonId) {
    throw new Error(
      "The bargaining route can only be opened for the controlled character.",
    );
  }
  // Voting membership is not the office capability. Staff legitimately hold
  // the office and its bill; only a seat the canonical winner chain actually
  // supports may enter the members' room, and the resolver says which.
  const membership = resolveActiveMemberSeat(world, input.playerPersonId);
  if (membership.kind !== "seated") {
    return {
      kind: "unavailable",
      reason:
        capabilities.office && !capabilities.legislation
          ? (withheldReason(capabilities, "legislation") ?? membership.reason)
          : membership.reason,
    };
  }
  const memberSeat = membership.seat;
  const governingJurisdictionId = memberSeat.governingJurisdictionId;
  // The scenario surface belongs to the governing state the seat records —
  // never to where the member lives.
  const governingPack = legislativePackForJurisdiction(governingJurisdictionId);
  const scenarioKey = governingPack ? legislativeWorkKey(governingPack) : null;
  if (!scenarioKey) {
    return {
      kind: "unavailable",
      reason: "The governing state has no accepted rule-pack surface.",
    };
  }
  const docketKey = input.docketKey ?? null;
  const blueprint = legislativeBlueprint(scenarioKey);
  const sessionRefusal = regularSessionActionRefusal(
    legislativeRulePackForWorld(world, blueprint.pack.packId),
    world.currentDate,
  );
  if (sessionRefusal) return { kind: "unavailable", reason: sessionRefusal };

  // Every visit is grounded in an actual filed measure with saved draft
  // lineage. The default is a measure this chamber has on its floor; callers
  // with a selection pass its measure ID.
  let docket: DocketBill | null = null;
  let measureId: EntityId | null = input.measureId ?? null;
  if (docketKey !== null) {
    docket = docketBill(world, {
      scenarioKey,
      playerPersonId: input.playerPersonId,
      docketKey,
    });
    if (!docket) {
      return {
        kind: "unavailable",
        reason: "That bill is not on this character's docket.",
      };
    }
    measureId = docket.measureId;
  } else {
    const agendaMeasures = (world.history.legislativeMeasures ?? []).filter(
      (measure) => {
        if (measure.jurisdictionId !== governingJurisdictionId) return false;
        const position = measurePosition(world, measure.id);
        return (
          position.phase === "on-floor" &&
          position.chamberKey === memberSeat.chamberKey
        );
      },
    );
    if (measureId === null) {
      measureId =
        agendaMeasures.find((measure) =>
          (world.history.legislativeDraftLineages ?? []).some(
            (lineage) => lineage.measureId === measure.id,
          ),
        )?.id ?? null;
    }
  }
  if (measureId === null) {
    return {
      kind: "unavailable",
      reason: "No measure with recorded bill text is on this chamber's floor.",
    };
  }
  const selectedMeasureId = measureId;
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.id === selectedMeasureId,
  );
  if (!measure) {
    return {
      kind: "unavailable",
      // No measure is on file, so this world has no bill number to name. The
      // refusal says what is true of the world rather than naming a bill from
      // the bank that nobody here has filed.
      reason:
        "The bill has not been taken up in this world; open it through the office first.",
    };
  }
  const activeMeasureId = measure.id;
  if (hasRecordedLegislativeSitting(world, measureId))
    return {
      kind: "unavailable",
      reason:
        "This recorded fictional sitting supplies ballots, not deliberation decisions. Follow its supported procedure from the office.",
    };
  if (measure.jurisdictionId !== governingJurisdictionId) {
    return {
      kind: "unavailable",
      reason: "The bill on file belongs to a different jurisdiction.",
    };
  }
  const position = measurePosition(world, measureId);
  if (position.phase !== "on-floor") {
    return {
      kind: "unavailable",
      reason: `${measure.designation} is not on the floor yet; the members' room has nothing to bargain over until it is.`,
    };
  }
  if (blueprint.pack.packId !== memberSeat.legislativeRulePackId) {
    return {
      kind: "unavailable",
      reason: "The seat's rule pack does not match this legislature's bill.",
    };
  }
  // The sitting happens on the member's own floor. A bill before the other
  // chamber, or one whose position names no chamber, is truthfully not in
  // front of this member — there is no default chamber.
  if (position.chamberKey !== memberSeat.chamberKey) {
    return {
      kind: "unavailable",
      reason: `${measure.designation} is not before this member's chamber.`,
    };
  }
  const chamber = chamberByKey(blueprint.pack, memberSeat.chamberKey);
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");

  // The colleagues this sitting models, persisted through the same accepted
  // context-person seam the sponsoring member already uses. Created once,
  // found thereafter — a reload reaches the same people by the same stable
  // keys.
  let next = world;
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:advocate`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:guardian`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  next = ensureContextPerson(next, {
    stableKey: `legislative-work:${scenarioKey}:analyst`,
    playerPersonId: input.playerPersonId,
    jurisdictionId: governingJurisdictionId,
  });
  const advocatePersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:advocate`,
  );
  const guardianPersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:guardian`,
  );
  const analystPersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:analyst`,
  );

  const reread = docket
    ? recompileSavedBill(next, docket)
    : recompileRecordedMeasureDraft(next, activeMeasureId);
  if ("unavailable" in reread) {
    return { kind: "unavailable", reason: reread.unavailable };
  }
  next = ensureFiscalNote(next, {
    scenarioKey,
    measureId: activeMeasureId,
    jurisdictionId: measure.jurisdictionId,
    analystPersonId,
    stableKey: fiscalNoteStableKeyFor(measure.stableKey),
    summary: draftFiscalNoteSummary(measure.designation, reread),
  });
  const sponsorPersonId = characterHistoryContextPersonId(
    next,
    `legislative-work:${scenarioKey}:member`,
  );
  const bodies = seatBargainingBodies(next, blueprint, {
    playerPersonId: input.playerPersonId,
    sponsorPersonId,
    advocatePersonId,
    guardianPersonId,
  });

  const facts = bargainingSubjectFactsForDraft({
    draft: reread,
    measureId: activeMeasureId,
    measureStableKey: measure.stableKey,
    chamberName: chamber.name,
    nextStepLabel: stage.label.toLowerCase(),
    fiscalNoteEventStableKey: fiscalNoteStableKeyFor(measure.stableKey),
    analystPersonId,
    advocatePersonId,
    guardianPersonId,
  });
  let progress = createLegislativeBargainingProgress(facts);

  const guardian = next.people[guardianPersonId]!;
  const { roomContext, privateRoomContext } = bargainingRoomContexts({
    sceneKeyPrefix: `legislative-work:${scenarioKey}:floor`,
    chamberName: chamber.name,
    jurisdictionId: measure.jurisdictionId,
    playerPersonId: input.playerPersonId,
    advocatePersonId,
    guardianPersonId,
    guardianFamilyName: guardian.familyName,
  });

  const seat: LegislativeBargainingSeat = {
    memberSeatStableKey: memberSeat.relationshipStableKey,
    openedChamberKey: memberSeat.chamberKey,
    scenario: {
      pack: blueprint.pack,
      measureId: activeMeasureId,
      bodies,
      committeeMemberCount:
        blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7,
      votePlan: blueprint.votePlan,
      governorAction: blueprint.governorAction,
      governorRationale: blueprint.governorRationale,
    },
    measureId: activeMeasureId,
    measureStableKey: measure.stableKey,
    playerPersonId: input.playerPersonId,
    advocatePersonId,
    guardianPersonId,
    analystPersonId,
    scenePeople: bargainingScenePeople({
      chamberName: chamber.name,
      advocatePersonId,
      guardianPersonId,
      // What the read claims about the past is read from the record, never
      // asserted for it, and never widened past the kind of history the
      // record actually establishes.
      advocatePriorWork: priorWorkEvidence(
        next,
        input.playerPersonId,
        advocatePersonId,
      ),
      cause: {
        sectionLabel: facts.requestedSectionLabel,
        beneficiaryLabel: facts.requestedBeneficiaryLabel,
      },
    }),
    roomContext,
    privateRoomContext,
    progress,
    locationDisplayName: `${next.jurisdictions[measure.jurisdictionId]?.name ?? blueprint.label} State Capitol`,
    locationLabel: "Capitol · Members' room",
    presentationTime: formatPresentationTime(next.currentMoment.minuteOfDay),
    floorIntents: ["offer-targeted-provision", "counter-with-cap"],
  };

  // What the player already canonically knows survives a save and a reload;
  // the sitting's opening state reads it back rather than starting the memory
  // over.
  if (playerHasReadFiscalNoteFor(next, seat)) {
    progress = withAnalysisSeen(progress);
  }

  return { kind: "available", world: next, seat: { ...seat, progress } };
}

/* -------------------------------------------------------------------------- */
/* Canonical record seeding, all idempotent                                    */
/* -------------------------------------------------------------------------- */

/** Each bill gets its own note; two bills do not share one staff analysis. */
function fiscalNoteStableKeyFor(measureStableKey: string): string {
  return `bargaining:${measureStableKey}:fiscal-note`;
}

/**
 * What the staff note says about a bill the player configured.
 *
 * It states the ceiling the bill's own sections carry and the fact that the
 * requested section would sit on top of that rather than inside it. It does
 * not forecast anything: a cap is arithmetic on stated text, and an effect
 * would need a baseline and a responsible institution this world does not
 * have.
 */
function draftFiscalNoteSummary(
  designation: string,
  reread: Exclude<
    ReturnType<typeof recompileSavedBill>,
    { unavailable: string }
  >,
): string {
  const invited = formatMinorUnits(
    reread.amendmentInvitation.requestedMinorUnits,
    "USD",
  );
  const section = reread.amendmentInvitation.sectionNumber;
  // An appropriation provides money and states no ceiling, so it is read
  // first; reading only the ceiling told every spending bill it gave nothing.
  if (reread.appropriatedLabel !== null)
    return `A fiscal note on ${designation} as filed records that the Act appropriates ${reread.appropriatedLabel}, and that the ${invited} requested under Section ${section} would be added to that sum rather than drawn from it.`;
  if (reread.authorizedCeilingLabel !== null)
    return `A fiscal note on ${designation} as filed put the stated exposure at ${reread.authorizedCeilingLabel}, with the caveat that the ${invited} requested under Section ${section} would sit on top of that figure rather than inside it.`;
  if (reread.revenueLabel !== null)
    return `A fiscal note on ${designation} as filed records a charge of ${reread.revenueLabel} for each covered payment; what it raises in total is unknown until the number of covered payments is known. The ${invited} requested under Section ${section} would be a new appropriation.`;
  return `A fiscal note on ${designation} as filed records that the Act appropriates nothing, and that the ${invited} requested under Section ${section} would be a new appropriation rather than a call on an existing one.`;
}

function ensureFiscalNote(
  world: World,
  input: {
    readonly scenarioKey: string;
    readonly measureId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly analystPersonId: EntityId;
    readonly stableKey: string;
    readonly summary: string;
  },
): World {
  const stableKey = input.stableKey;
  if (world.history.events.some((record) => record.stableKey === stableKey)) {
    return world;
  }
  return recordWorldEvent(world, {
    stableKey,
    type: "legislation.fiscal-note-prepared",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.measureId,
      input.jurisdictionId,
      input.analystPersonId,
    ],
    participants: [
      {
        personId: input.analystPersonId,
        role: "agency:analyst",
        detail: "Prepared the fiscal note on the measure as filed",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["legislation", "legislation.fiscal-note"],
    summary: input.summary,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
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
 * Seats the chambers with every member this world actually models: the player
 * (an elected member, not a staffer, on this route), the sponsoring colleague,
 * and the sitting's two counterparts. Every other seat stays authored, and the
 * vote writer still refuses a disposition naming somebody the world does not
 * contain.
 */
function seatBargainingBodies(
  world: World,
  blueprint: LegislativeBlueprint,
  people: {
    readonly playerPersonId: EntityId;
    readonly sponsorPersonId: EntityId;
    readonly advocatePersonId: EntityId;
    readonly guardianPersonId: EntityId;
  },
): readonly SeatedBody[] {
  const linked = [
    people.playerPersonId,
    people.sponsorPersonId,
    people.advocatePersonId,
    people.guardianPersonId,
  ]
    .filter((personId, index, all) => all.indexOf(personId) === index)
    .map((personId) => world.people[personId])
    .filter((person) => person !== undefined)
    .map((person) => ({ personId: person.id, name: personName(person) }));
  return blueprint.pack.chambers.map((chamber, index) =>
    seatBodyForPack(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      index === 0 ? linked : [],
      blueprint.nonpartisan,
    ),
  );
}
