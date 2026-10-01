import { councilSitsOnAuthoredCalendar } from "../simulation/municipal-seat-identity";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
  primaryReading,
} from "../simulation/municipal-government";
import {
  appointMunicipalManager,
  attendMunicipalPublicMeeting,
  introduceMunicipalOrdinance,
  municipalActionAuthority,
  municipalGovernmentJurisdictionId,
  municipalMeetings,
  municipalSeats,
  municipalStanding,
  scheduleMunicipalMeeting,
  installMunicipalGovernment,
} from "../simulation/municipal-public-work";
import { addSimulationMinutes } from "../simulation/dates";
import { futureDueItemStateAt } from "../simulation/future-transitions";
import { decideCouncilVote } from "../simulation/governing/council-lawmaking";
import { requireMeasure } from "../simulation/legislation";
import {
  actOnCouncilMeasure,
  COUNCIL_READING_DUE,
  decideOrdinaryCouncilReading,
  municipalExecutiveHolder,
  municipalReadingQuestion,
  municipalOrdinanceStatuses,
  overrideCouncilVeto,
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
  scheduleOrdinaryCouncilReading,
} from "../simulation/municipal-ordinance-procedure";
import {
  memberBallotOn,
  recordMemberBallot,
} from "../simulation/governing/member-ballots";
import type { MeasureDesignationInput } from "../simulation/measure-numbering";
import { scheduledActivityState } from "../simulation/time-work";
import { resolvePlayerCapabilities } from "./player-capabilities";
import type {
  EntityId,
  LegislativeMemberDisposition,
  LegislativeMeasureNumberingSession,
  LegislativeVoteDisposition,
  World,
} from "../simulation/types";

/** What a player's own ballot on an ordinance can be. */
export type OwnOrdinanceBallot = "yea" | "nay" | "present-not-voting";

/**
 * The note every colleague ballot on the D.C. Council carries, in the vote
 * record and on screen: each colleague decides through the councils' vote
 * engine.
 */
export const COLLEAGUE_BALLOT_NOTE =
  "Your ballot is yours. Each other councilor decides their own ballot from their principles, their record, the ordinance's sponsor and the voters they answer to.";

export const ORDINARY_COUNCIL_BALLOT_NOTE =
  "If the council voted now, each seated councilor would decide from their recorded reasons. Those decisions may change before the scheduled reading.";

/**
 * Feature-local ordinary municipal route for A / FABLE-UI.
 *
 * Read and write through canonical World records only. UI-core owns
 * registration; this file must not be imported from the recovered Fable shell.
 * Inspection projects existing records. It does not install a government,
 * schedule a sitting, or grant a seat.
 */
export function projectMunicipalGoverning(
  world: World,
  governmentKey?: string,
) {
  if (world.control.kind !== "person") return null;
  const personId = world.control.personId;
  const place = resolvePlayerCapabilities(world).homePlace;
  const home = place ? municipalGovernmentForLifePlace(place) : null;
  const government = governmentKey
    ? municipalGovernmentByKey(governmentKey)
    : home;
  if (!government) return null;
  const reading = primaryReading(government);
  const pack = municipalRulePackFor(government);
  const standing = municipalStanding(world, {
    governmentKey: government.key,
    personId,
    residentPlaceGeoid: place?.sourceGeoid ?? null,
  });
  return {
    governmentKey: government.key,
    measureNoun: councilMeasureNoun(government.key),
    /** "the Mayor", as the executive is named in ordinary prose. */
    executiveName: `the ${(reading.mayor?.title ?? "mayor").split(" of ")[0]}`,
    displayName: reading.displayName,
    bodyName: reading.bodyName,
    evidence: reading.evidence,
    procedureBasis: pack.ok ? pack.pack.basis : null,
    jurisdictionId: municipalGovernmentJurisdictionId(world, government.key),
    standing,
    seats: municipalSeats(world, government.key),
    attendance: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "attend-public-meeting",
    }),
    appointment: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "appoint-the-manager",
    }),
    ordinanceIntroduction: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "introduce-ordinance",
    }),
    ordinanceVote: municipalActionAuthority(world, {
      governmentKey: government.key,
      personId,
      residentPlaceGeoid: place?.sourceGeoid ?? null,
      action: "vote-on-ordinance",
    }),
    procedureGaps: pack.ok
      ? []
      : pack.missing.map((entry) => ({
          field: entry.field,
          reason: entry.reason,
        })),
    meetings: discoverMunicipalPublicMeetings(world, government.key),
    ordinances: municipalOrdinanceStatuses(world, government.key).map(
      (ordinance) => {
        const question = municipalReadingQuestion(
          world,
          government.key,
          ordinance.measureId,
        );
        return {
          ...ordinance,
          scheduledReadingOn: scheduledOrdinaryCouncilReadingOn(
            world,
            ordinance.measureId,
          ),
          savedBallot: question
            ? memberBallotOn(world, personId, question)
            : null,
        };
      },
    ),
    managerAppointment: world.history.events.find(
      (event) =>
        event.stableKey === `municipal-manager-appointed:${government.key}`,
    ),
  };
}

/** Current scheduled reading, when an ordinary council has one pending. */
export function scheduledOrdinaryCouncilReadingOn(
  world: World,
  measureId: EntityId,
) {
  return (
    world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measureId) &&
        futureDueItemStateAt(world, item.id, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        })?.status === "scheduled",
    )?.dueAt ?? null
  );
}

/** Existing sittings already on the calendar. Inspection must not add one. */
export function discoverMunicipalPublicMeetings(
  world: World,
  governmentKey: string,
) {
  return municipalMeetings(world, governmentKey).map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    status: scheduledActivityState(world, meeting.id)?.status ?? null,
  }));
}

/**
 * Authored review convenience: one sitting in 60 minutes lasting 90 minutes.
 *
 * This is not ordinary meeting discovery, not a resident power, and not a
 * charter schedule. Call it only when a review world needs an explicit
 * game-authored occurrence.
 */
export function ensureAuthoredPublicMeeting(
  world: World,
  governmentKey: string,
  seriesKey: string,
) {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) {
    return { ok: false as const, world, reason: "No compiled government." };
  }
  if (world.control.kind !== "person")
    return {
      ok: false as const,
      world,
      reason: "Person control is required.",
    };
  const personId = world.control.personId;
  const place = resolvePlayerCapabilities(world).homePlace;
  const attendance = municipalActionAuthority(world, {
    governmentKey,
    personId,
    residentPlaceGeoid: place?.sourceGeoid ?? null,
    action: "attend-public-meeting",
  });
  if (!attendance.ok) {
    return { ok: false as const, world, reason: attendance.reason };
  }
  const existing = municipalMeetings(world, governmentKey).find(
    (meeting) =>
      meeting.stableKey.startsWith(
        `municipal-meeting:${governmentKey}:${seriesKey}:`,
      ) && scheduledActivityState(world, meeting.id)?.status === "scheduled",
  );
  if (existing) return { ok: true as const, world, activityId: existing.id };
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  );
  let next = installMunicipalGovernment(world, {
    governmentKey,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  const resolvedJurisdiction =
    municipalGovernmentJurisdictionId(next, governmentKey) ?? jurisdictionId;
  const start = addSimulationMinutes(next.currentMoment, 60);
  next = scheduleMunicipalMeeting(next, {
    governmentKey,
    seriesKey,
    start,
    end: addSimulationMinutes(start, 90),
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    jurisdictionId: resolvedJurisdiction,
    occurrenceNote:
      "Game session: timing and duration are authored for this world. No real published meeting notice or agenda is asserted. This helper is not ordinary municipal meeting discovery.",
  });
  const meeting = municipalMeetings(next, governmentKey).at(-1);
  if (!meeting)
    return {
      ok: false as const,
      world,
      reason: "The authored sitting was not recorded.",
    };
  return { ok: true as const, world: next, activityId: meeting.id };
}

export function attendProjectedPublicMeeting(
  world: World,
  governmentKey: string,
  activityId: EntityId,
) {
  return attendMunicipalPublicMeeting(world, governmentKey, activityId);
}

export function appointProjectedManager(
  world: World,
  governmentKey: string,
  appointeePersonId: EntityId,
  dispositions: readonly LegislativeVoteDisposition[],
) {
  return appointMunicipalManager(world, {
    governmentKey,
    appointeePersonId,
    dispositions,
  });
}

export function introduceProjectedOrdinance(
  world: World,
  governmentKey: string,
  designation: string,
  shortTitle?: string,
  numberingSession?: LegislativeMeasureNumberingSession,
) {
  const title = shortTitle?.trim() || designation;
  const noun = councilMeasureNoun(governmentKey);
  return introduceMunicipalOrdinance(world, {
    governmentKey,
    designation,
    ...(numberingSession ? { numberingSession } : {}),
    shortTitle: title,
    summary: `${noun === "act" ? "An act" : "A general ordinance"} a councilor introduced: ${title}.`,
  });
}

/**
 * What this council's measures are called: the District's Council passes
 * acts (D.C. Code § 1-204.12(a)), a town council ordinances.
 */
export function councilMeasureNoun(governmentKey: string): "act" | "ordinance" {
  const government = municipalGovernmentByKey(governmentKey);
  const types = government
    ? primaryReading(government).procedure.measureTypes
    : null;
  return types?.includes("act") && !types.includes("ordinance")
    ? "act"
    : "ordinance";
}

/** The executive signs, or returns, an act on their desk. */
export function actOnProjectedCouncilMeasure(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  decision: "sign" | "return",
) {
  return actOnCouncilMeasure(world, { governmentKey, measureId, decision });
}

/** The council's vote on reenacting a measure the executive returned. */
export function takeProjectedOverrideVote(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  own: OwnOrdinanceBallot,
) {
  const preview = previewAuthoredCouncilBallots(
    world,
    governmentKey,
    measureId,
    own,
  );
  if (!preview) {
    return {
      ok: false as const,
      world,
      reason: "Only a seated councilor votes to reenact it.",
    };
  }
  return overrideCouncilVeto(world, {
    governmentKey,
    measureId,
    dispositions: preview.dispositions,
    provenance: {
      method: "member-decisions",
      note: COLLEAGUE_BALLOT_NOTE,
      sourceEntityIds: [measureId],
    },
  });
}

/** Resolve the actual council context for the shared measure-numbering reader. */
export function municipalMeasureNumberingInput(
  world: World,
  governmentKey: string,
): MeasureDesignationInput | null {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) return null;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) return null;
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    governmentKey,
  );
  const originChamber = rules.pack.chambers.find(
    (chamber) => chamber.chamberKey === "council",
  );
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId] || !originChamber)
    return null;
  return { jurisdictionId, originChamber, rulePackId: rules.pack.packId };
}

export function placeProjectedOrdinanceOnAgenda(
  world: World,
  governmentKey: string,
  measureId: EntityId,
) {
  const placed = placeMunicipalOrdinanceOnAgenda(world, {
    governmentKey,
    measureId,
  });
  return placed.ok && !councilSitsOnAuthoredCalendar(governmentKey)
    ? {
        ok: true as const,
        world: scheduleOrdinaryCouncilReading(
          placed.world,
          governmentKey,
          measureId,
        ),
      }
    : placed;
}

/** A councilor's choice remains in World history until this reading occurs. */
export function saveProjectedOrdinanceBallot(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  ballot: OwnOrdinanceBallot,
) {
  if (
    world.control.kind !== "person" ||
    councilSitsOnAuthoredCalendar(governmentKey)
  )
    return {
      ok: false as const,
      world,
      reason: "No ordinary council ballot is available to save here.",
    };
  const personId = world.control.personId;
  const place = resolvePlayerCapabilities(world).homePlace;
  const authority = municipalActionAuthority(world, {
    governmentKey,
    personId,
    residentPlaceGeoid: place?.sourceGeoid ?? null,
    action: "vote-on-ordinance",
  });
  if (!authority.ok)
    return { ok: false as const, world, reason: authority.reason };
  const question = municipalReadingQuestion(world, governmentKey, measureId);
  if (!question)
    return {
      ok: false as const,
      world,
      reason: "This ordinance has no pending council reading.",
    };
  if (memberBallotOn(world, personId, question) === ballot)
    return { ok: true as const, world };
  const measure = requireMeasure(world, measureId);
  return {
    ok: true as const,
    world: recordMemberBallot(world, {
      personId,
      jurisdictionId: measure.jurisdictionId,
      question,
      ballot,
      summary: `Decided to vote ${ballot === "yea" ? "yea" : ballot === "nay" ? "nay" : "present, not voting"} on ${measure.designation}, ${measure.shortTitle}, at its next council reading.`,
    }),
  };
}

export interface AuthoredCouncilBallotPreview {
  readonly method: "authored-fixture" | "member-decisions";
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly colleagues: readonly {
    readonly personId: EntityId;
    readonly seatLabel: string | null;
    readonly disposition: LegislativeMemberDisposition;
  }[];
  readonly yea: number;
  readonly nay: number;
  readonly presentNotVoting: number;
  readonly note: string;
}

/**
 * The ballots a vote would record, before anything is written.
 *
 * An ordinary council reads individual decisions; the D.C. authored sitting
 * retains its disclosed stand-ins. No preview writes a vote.
 */
export function previewAuthoredCouncilBallots(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  own: OwnOrdinanceBallot,
): AuthoredCouncilBallotPreview | null {
  if (world.control.kind !== "person") return null;
  const playerId = world.control.personId;
  const seats = municipalSeats(world, governmentKey).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  if (!seats.some((seat) => seat.personId === playerId)) return null;
  if (!councilSitsOnAuthoredCalendar(governmentKey)) {
    const dispositions = decideOrdinaryCouncilReading(
      world,
      governmentKey,
      measureId,
      own,
    );
    if (!dispositions) return null;
    return {
      method: "member-decisions",
      dispositions,
      colleagues: dispositions
        .filter(
          (entry) => entry.personId !== playerId && entry.personId !== null,
        )
        .map((entry) => ({
          personId: entry.personId!,
          seatLabel:
            seats.find((seat) => seat.personId === entry.personId)?.seatLabel ??
            null,
          disposition: entry.disposition,
        })),
      yea: dispositions.filter((entry) => entry.disposition === "yea").length,
      nay: dispositions.filter((entry) => entry.disposition === "nay").length,
      presentNotVoting: dispositions.filter(
        (entry) => entry.disposition === "present-not-voting",
      ).length,
      note: ORDINARY_COUNCIL_BALLOT_NOTE,
    };
  }
  const measure = requireMeasure(world, measureId);
  const government = municipalGovernmentByKey(governmentKey);
  const decided = decideCouncilVote(world, {
    stableKey: `${measure.stableKey}:colleague-ballots`,
    measureId,
    jurisdictionId: measure.jurisdictionId,
    members: seats.map((seat) => ({ personId: seat.personId })),
    playerPersonId: playerId,
    questionLabel: `Pass ${measure.designation}`,
    executivePersonId: municipalExecutiveHolder(world, governmentKey),
    // A council elected without party labels gives its members no party
    // cue, as the town council meetings do (`body-partisanship.ts`).
    nonpartisan:
      government !== null &&
      primaryReading(government).partisanship.includes("NONPARTISAN"),
  });
  const colleagues = seats
    .filter((seat) => seat.personId !== playerId)
    .map((seat) => ({
      personId: seat.personId,
      seatLabel: seat.seatLabel,
      disposition:
        decided.find((row) => row.personId === seat.personId)?.disposition ??
        "absent",
    }));
  const dispositions: LegislativeVoteDisposition[] = seats.map(
    (seat, index) => ({
      memberKey: `council:${index + 1}`,
      personId: seat.personId,
      disposition:
        seat.personId === playerId
          ? own
          : colleagues.find((entry) => entry.personId === seat.personId)!
              .disposition,
    }),
  );
  return {
    method: "member-decisions",
    dispositions,
    colleagues,
    yea: dispositions.filter((entry) => entry.disposition === "yea").length,
    nay: dispositions.filter((entry) => entry.disposition === "nay").length,
    presentNotVoting: dispositions.filter(
      (entry) => entry.disposition === "present-not-voting",
    ).length,
    note: COLLEAGUE_BALLOT_NOTE,
  };
}

/** Record the council's passage vote with the player's ballot and each colleague's own. */
export function takeProjectedOrdinanceVote(
  world: World,
  governmentKey: string,
  measureId: EntityId,
  own: OwnOrdinanceBallot,
) {
  if (!councilSitsOnAuthoredCalendar(governmentKey)) {
    const readingOn = scheduledOrdinaryCouncilReadingOn(world, measureId);
    if (readingOn && world.currentDate < readingOn)
      return {
        ok: false as const,
        world,
        reason: `The council reading is scheduled for ${readingOn}.`,
      };
    const saved = saveProjectedOrdinanceBallot(
      world,
      governmentKey,
      measureId,
      own,
    );
    if (!saved.ok) return saved;
    const dispositions = decideOrdinaryCouncilReading(
      saved.world,
      governmentKey,
      measureId,
    );
    if (!dispositions)
      return {
        ok: false as const,
        world,
        reason: "This council has no pending reading to decide.",
      };
    const taken = passMunicipalOrdinance(saved.world, {
      governmentKey,
      measureId,
      dispositions,
      provenance: {
        method: "member-decisions",
        note: "The seated councilors decided this reading from their recorded reasons and the player's own ballot.",
        sourceEntityIds: [measureId],
      },
    });
    return taken.ok ? taken : { ...taken, world };
  }
  const preview = previewAuthoredCouncilBallots(
    world,
    governmentKey,
    measureId,
    own,
  );
  if (!preview) {
    return {
      ok: false as const,
      world,
      reason: "Only a seated councilor votes on an ordinance.",
    };
  }
  return passMunicipalOrdinance(world, {
    governmentKey,
    measureId,
    dispositions: preview.dispositions,
    provenance: {
      method: "member-decisions",
      note: COLLEAGUE_BALLOT_NOTE,
      sourceEntityIds: [measureId],
    },
  });
}

/**
 * The small ordinary-route mount A consumes. Recovered MunicipalWorkspace is
 * not redesigned here; UI-core registers this adapter.
 */
export function mountOrdinaryMunicipalRoute() {
  return {
    inspect: projectMunicipalGoverning,
    discoverPublicMeetings: discoverMunicipalPublicMeetings,
    authorPublicMeetingForReview: ensureAuthoredPublicMeeting,
    attendPublicMeeting: attendProjectedPublicMeeting,
    appointManager: appointProjectedManager,
    introduceOrdinance: introduceProjectedOrdinance,
    placeOrdinanceOnAgenda: placeProjectedOrdinanceOnAgenda,
    previewOrdinanceVote: previewAuthoredCouncilBallots,
    saveOrdinanceBallot: saveProjectedOrdinanceBallot,
    takeOrdinanceVote: takeProjectedOrdinanceVote,
    actOnCouncilMeasure: actOnProjectedCouncilMeasure,
    takeOverrideVote: takeProjectedOverrideVote,
  };
}
