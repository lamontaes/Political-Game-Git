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
import { decideCouncilVote } from "../simulation/governing/council-lawmaking";
import { requireMeasure } from "../simulation/legislation";
import {
  actOnCouncilMeasure,
  municipalExecutiveHolder,
  municipalOrdinanceStatuses,
  overrideCouncilVeto,
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
} from "../simulation/municipal-ordinance-procedure";
import { nextDcCouncilDesignation } from "../simulation/dc-council-sittings";
import { scheduledActivityState } from "../simulation/time-work";
import { resolvePlayerCapabilities } from "./player-capabilities";
import type {
  EntityId,
  LegislativeVoteDisposition,
  World,
} from "../simulation/types";

/** What a player's own ballot on an ordinance can be. */
export type OwnOrdinanceBallot = "yea" | "nay" | "present-not-voting";

/**
 * The note every colleague's ballot carries, in the vote record and on
 * screen. The owner accepted authored colleague ballots on 2026-09-14 only
 * until a councilor-decision producer existed; the councils' vote engine
 * (`council-lawmaking.ts`) is that producer, so each colleague now decides.
 */
export const COLLEAGUE_BALLOT_NOTE =
  "Your ballot is yours. Each other councilor decides their own ballot from their principles, their record, the ordinance's sponsor and the voters they answer to.";

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
    ordinances: municipalOrdinanceStatuses(world, government.key),
    managerAppointment: world.history.events.find(
      (event) =>
        event.stableKey === `municipal-manager-appointed:${government.key}`,
    ),
  };
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
) {
  const title = shortTitle?.trim() || designation;
  const noun = councilMeasureNoun(governmentKey);
  return introduceMunicipalOrdinance(world, {
    governmentKey,
    designation,
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

/** The next unused designation for a councilor's ordinance this year. */
export function nextOrdinanceDesignation(
  world: World,
  governmentKey: string,
): string {
  if (councilMeasureNoun(governmentKey) === "act")
    return nextDcCouncilDesignation(world);
  const year = world.currentDate.slice(2, 4);
  const taken = new Set(
    municipalOrdinanceStatuses(world, governmentKey).map(
      (status) => status.designation,
    ),
  );
  let number = 1;
  while (taken.has(`Ord. ${year}-${number}`)) number += 1;
  return `Ord. ${year}-${number}`;
}

export function placeProjectedOrdinanceOnAgenda(
  world: World,
  governmentKey: string,
  measureId: EntityId,
) {
  return placeMunicipalOrdinanceOnAgenda(world, { governmentKey, measureId });
}

export interface AuthoredCouncilBallotPreview {
  readonly dispositions: readonly LegislativeVoteDisposition[];
  readonly colleagues: readonly {
    readonly personId: EntityId;
    readonly seatLabel: string | null;
    readonly disposition: LegislativeVoteDisposition["disposition"];
  }[];
  readonly yea: number;
  readonly nay: number;
  readonly presentNotVoting: number;
  readonly note: string;
}

/**
 * The ballots a vote would record, before anything is written.
 *
 * The player's own ballot is exactly what they chose. Each other seated
 * councilor decides through the councils' vote engine (`decideCouncilVote`)
 * from what the world already holds, so previewing twice, reloading, or
 * navigating away never changes it, and the preview writes nothing.
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
    takeOrdinanceVote: takeProjectedOrdinanceVote,
    actOnCouncilMeasure: actOnProjectedCouncilMeasure,
    takeOverrideVote: takeProjectedOverrideVote,
  };
}
