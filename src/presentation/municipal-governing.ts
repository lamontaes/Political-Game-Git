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
import { stableHash } from "../simulation/ids";
import { requireMeasure } from "../simulation/legislation";
import {
  municipalOrdinanceStatuses,
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
} from "../simulation/municipal-ordinance-procedure";
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
 * The disclosure every authored colleague ballot carries, in the vote record
 * and on screen. The owner accepted authored colleague ballots for ordinary
 * council play on 2026-09-14 until a councilor-decision producer exists.
 */
export const AUTHORED_COUNCIL_BALLOT_NOTE =
  "Your ballot is yours. The other councilors' ballots are game-authored stand-ins: the game does not yet model how a councilor decides, so these are not any real council member's position.";

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
  return introduceMunicipalOrdinance(world, {
    governmentKey,
    designation,
    shortTitle: title,
    summary: `A general ordinance a councilor introduced: ${title}.`,
  });
}

/** The next unused designation for a councilor's ordinance this year. */
export function nextOrdinanceDesignation(
  world: World,
  governmentKey: string,
): string {
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
    readonly disposition: "yea" | "nay";
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
 * councilor's ballot is authored from a stable hash of this world, this
 * ordinance and that councilor, so previewing twice, reloading, or navigating
 * away never changes it. Nobody is marked absent: an authored absence would
 * decide the quorum rather than the question.
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
  const colleagues = seats
    .filter((seat) => seat.personId !== playerId)
    .map((seat) => {
      const digest = stableHash(
        `${world.id}:${measure.stableKey}:authored-ballot:${seat.personId}`,
      );
      const disposition: "yea" | "nay" =
        Number.parseInt(digest.slice(-1), 16) % 2 === 0 ? "yea" : "nay";
      return {
        personId: seat.personId,
        seatLabel: seat.seatLabel,
        disposition,
      };
    });
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
    note: AUTHORED_COUNCIL_BALLOT_NOTE,
  };
}

/** Record the council's passage vote with the player's ballot and the disclosed authored ones. */
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
      method: "authored-fixture",
      note: AUTHORED_COUNCIL_BALLOT_NOTE,
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
  };
}
