/**
 * What an ordinary life can actually do about its city government.
 *
 * The corpus says what a government is. This module is where a person meets it:
 * a resident who can go to a council meeting because the instrument says the
 * meetings are open, a member who can move an ordinance because the charter
 * gives the body that power, a manager who runs departments and cannot vote.
 * Every one of those is a standing somebody has, checked against the record,
 * and every refusal names the instrument that did not say what would have been
 * needed.
 *
 * ## Nothing here is a second engine
 *
 * The government is an `Organization` with a versioned profile. A seat is an
 * `OrganizationParticipation`. A meeting is a `ScheduledActivity`. An ordinance
 * is a `LegislativeMeasureRecord` moving through the same functions a state
 * bill moves through, under a rule pack derived from the city's own charter.
 * The only thing this file adds is the standing check and the writers that
 * assemble those canonical records for a municipal government — because who may
 * do what in a city is a fact about that city's law, and the law is in the
 * corpus rather than in the engine.
 *
 * ## A visitor is not a member
 *
 * The first refusal this module was written for is the one the activation names
 * outright: visiting a public meeting does not make the player a council
 * member. Attendance and authority are computed separately and a person can
 * hold the first without the second for as long as they like.
 */

import { createStableId } from "./ids";
import type { FutureTransitionHandlerRegistry } from "./types";
import { activeOrganizationParticipationsAt } from "./life-queries";
import { createOrganization, createOrganizationParticipation } from "./life";
import {
  lawReading,
  municipalGovernmentByKey,
  municipalRulePackFor,
  municipalRulePackId,
  primaryReading,
  municipalMeetingReading,
  reportedReading,
} from "./municipal-government";
import type {
  MunicipalGovernment,
  MunicipalMeetingSeries,
  MunicipalReading,
} from "./municipal-government";
import {
  createScheduledActivity,
  createWorkItem,
  performScheduledActivity,
  scheduledActivityState,
  workItemState,
} from "./time-work";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { addSimulationMinutes } from "./dates";
import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  Organization,
  OrganizationParticipation,
  ScheduledActivityRecord,
  SimulationMoment,
  World,
  WorkItemStateRecord,
} from "./types";

// ---------------------------------------------------------------------------
// Identity of the canonical records a municipal government owns
// ---------------------------------------------------------------------------

/** The organization stable key a government's body is installed under. */
export function municipalOrganizationKey(governmentKey: string): string {
  return `municipal-government:${governmentKey}`;
}

/** The participation stable key one person's seat is installed under. */
export function municipalSeatKey(
  governmentKey: string,
  personId: EntityId,
): string {
  return `municipal-seat:${governmentKey}:${personId}`;
}

/** The scheduled-activity stable key one sitting is installed under. */
export function municipalMeetingKey(
  governmentKey: string,
  seriesKey: string,
  date: IsoDate,
): string {
  return `municipal-meeting:${governmentKey}:${seriesKey}:${date}`;
}

export function municipalOrganizationFor(
  world: World,
  governmentKey: string,
): Organization | null {
  const stableKey = municipalOrganizationKey(governmentKey);
  return (
    world.history.organizations.find(
      (organization) => organization.stableKey === stableKey,
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// Standing
// ---------------------------------------------------------------------------

/**
 * What a person is to this government.
 *
 * `resident` is about where they live and nothing else; it is what makes the
 * public side of a public meeting theirs to attend. The rest are held offices
 * and staff positions, and a person holds one only because a canonical record
 * says so.
 */
export type MunicipalRole =
  | "resident"
  | "member"
  | "presiding-member"
  | "mayor"
  | "professional-manager"
  | "clerk";

export interface MunicipalStanding {
  readonly governmentKey: string;
  readonly personId: EntityId;
  readonly roles: readonly MunicipalRole[];
  readonly organizationId: EntityId | null;
  /** The seat's own words, where the participation carries them. */
  readonly seatContext: string | null;
}

const SEAT_ROLE_KINDS: Readonly<Record<string, MunicipalRole>> = {
  "leader:municipal-member": "member",
  "leader:municipal-presiding-member": "presiding-member",
  "leader:municipal-mayor": "mayor",
  "leader:municipal-manager": "professional-manager",
  "leader:municipal-clerk": "clerk",
};

function activeParticipations(
  world: World,
  organizationId: EntityId,
  personId: EntityId,
): readonly OrganizationParticipation[] {
  return activeOrganizationParticipationsAt(world, personId)
    .filter(
      ({ participation }) => participation.organizationId === organizationId,
    )
    .map(({ participation }) => participation);
}

function latestParticipationState(world: World, participationId: EntityId) {
  return world.history.organizationParticipationStates
    .filter(
      (state) =>
        state.participationId === participationId &&
        state.effectiveAt <= world.currentDate &&
        state.sequence < world.history.nextSequence,
    )
    .reduce<
      (typeof world.history.organizationParticipationStates)[number] | null
    >(
      (latest, state) =>
        latest === null || state.sequence > latest.sequence ? state : latest,
      null,
    );
}

/**
 * Everything a person is to this government, from canonical records only.
 *
 * `residentPlaceGeoid` is supplied by the caller rather than derived here,
 * because where a person lives is a fact the place layer owns and this module
 * must not re-derive it from a name.
 */
export function municipalStanding(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly personId: EntityId;
    readonly residentPlaceGeoid: string | null;
  },
): MunicipalStanding {
  const government = municipalGovernmentByKey(input.governmentKey);
  const organization = municipalOrganizationFor(world, input.governmentKey);
  const roles: MunicipalRole[] = [];
  let seatContext: string | null = null;

  if (
    government &&
    government.placeGeoid !== null &&
    input.residentPlaceGeoid === government.placeGeoid
  ) {
    roles.push("resident");
  }

  if (organization) {
    for (const participation of activeParticipations(
      world,
      organization.id,
      input.personId,
    )) {
      const state = latestParticipationState(world, participation.id);
      if (!state || state.status !== "active") continue;
      const role = state.roleKind ? SEAT_ROLE_KINDS[state.roleKind] : undefined;
      if (role && !roles.includes(role)) roles.push(role);
      if (state.context) seatContext = state.context;
    }
  }

  return {
    governmentKey: input.governmentKey,
    personId: input.personId,
    roles,
    organizationId: organization?.id ?? null,
    seatContext,
  };
}

// ---------------------------------------------------------------------------
// Authority
// ---------------------------------------------------------------------------

export type MunicipalAction =
  | "inspect-government"
  | "attend-public-meeting"
  | "address-the-body"
  | "introduce-ordinance"
  | "vote-on-ordinance"
  | "act-on-adopted-ordinance"
  | "appoint-the-manager";

export interface MunicipalAuthorityGranted {
  readonly ok: true;
  readonly action: MunicipalAction;
  /** The words in the record that grant it, for a surface to show. */
  readonly basis: string;
}

export interface MunicipalAuthorityRefused {
  readonly ok: false;
  readonly action: MunicipalAction;
  /** Why, said plainly. Never "not available". */
  readonly reason: string;
  /**
   * Whether the refusal is about this person or about the evidence.
   *
   * A resident who is not a councilmember is refused a vote because of who they
   * are; a councilmember in a city whose passage rule nobody read is refused
   * because of what nobody established. Those are different sentences and a
   * surface should not blur them.
   */
  readonly kind: "standing" | "evidence";
}

export type MunicipalAuthority =
  MunicipalAuthorityGranted | MunicipalAuthorityRefused;

function refuse(
  action: MunicipalAction,
  kind: MunicipalAuthorityRefused["kind"],
  reason: string,
): MunicipalAuthorityRefused {
  return { ok: false, action, kind, reason };
}

function grant(
  action: MunicipalAction,
  basis: string,
): MunicipalAuthorityGranted {
  return { ok: true, action, basis };
}

/** The series a person could sit in on, with the rule that opens it. */
export function publicMeetingSeries(
  reading: MunicipalReading,
): readonly MunicipalMeetingSeries[] {
  return reading.meetingSeries.filter(
    (series) => series.publicAttendance?.openToPublic === true,
  );
}

/**
 * Whether this person may take this action in this government, and why not.
 *
 * The order matters: standing is checked before evidence, so a resident who
 * asks to vote is told they are not a member rather than told the city's
 * passage threshold is unread. Both are true; only one is about them.
 */
export function municipalActionAuthority(
  world: World,
  input: {
    readonly governmentKey: string;
    readonly personId: EntityId;
    readonly residentPlaceGeoid: string | null;
    readonly action: MunicipalAction;
    readonly seriesKey?: string;
  },
): MunicipalAuthority {
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) {
    return refuse(
      input.action,
      "evidence",
      `No municipal government is compiled as "${input.governmentKey}".`,
    );
  }
  const reading = primaryReading(government);
  if (
    ["act-on-adopted-ordinance", "appoint-the-manager"].includes(
      input.action,
    ) &&
    reading.evidence !== "enacted-text"
  ) {
    return refuse(
      input.action,
      "evidence",
      "An attributed report does not establish operative office authority. A scoped enacted reading is required for this action.",
    );
  }
  const standing = municipalStanding(world, input);
  const isMember =
    standing.roles.includes("member") ||
    standing.roles.includes("presiding-member");

  switch (input.action) {
    case "inspect-government":
      return grant(
        input.action,
        `${reading.displayName} is compiled from ${
          reading.evidence === "enacted-text"
            ? "enacted text this repository retrieved"
            : "a research transcription of official municipal pages"
        }, and anybody may read what it says.`,
      );

    case "attend-public-meeting": {
      const open = publicMeetingSeries(
        municipalMeetingReading(government, input.seriesKey),
      );
      if (open.length === 0) {
        return refuse(
          input.action,
          "evidence",
          `Nothing read for ${reading.displayName} establishes that any of its sittings are open to the public, so the game will not put you in the room on an assumption.`,
        );
      }
      const series = input.seriesKey
        ? open.find((entry) => entry.seriesKey === input.seriesKey)
        : open[0];
      if (!series) {
        return refuse(
          input.action,
          "evidence",
          `No sitting of ${reading.displayName} called "${input.seriesKey}" was established as open to the public.`,
        );
      }
      return grant(
        input.action,
        series.publicAttendance?.note ??
          "The instrument read establishes that this sitting is open.",
      );
    }

    case "address-the-body": {
      const open = publicMeetingSeries(
        municipalMeetingReading(government, input.seriesKey),
      );
      const series = input.seriesKey
        ? open.find((entry) => entry.seriesKey === input.seriesKey)
        : open[0];
      if (!series) {
        return refuse(
          input.action,
          "evidence",
          `No open sitting of ${reading.displayName} was established, so there is nowhere to be heard.`,
        );
      }
      const comment = series.publicAttendance?.publicCommentOffered;
      if (comment === true) {
        return grant(
          input.action,
          series.publicAttendance?.note ??
            "The instrument read establishes a right to be heard at this sitting.",
        );
      }
      if (comment === false) {
        return refuse(
          input.action,
          "evidence",
          `${series.bodyName ?? reading.displayName} does not take public comment at this sitting: ${series.publicAttendance?.note ?? "the instrument read says so."}`,
        );
      }
      return refuse(
        input.action,
        "evidence",
        `Whether ${reading.displayName} lets a member of the public speak at this sitting was not established by anything read. The room is open; a right to address it is a separate rule and nobody has read one.`,
      );
    }

    case "introduce-ordinance":
    case "vote-on-ordinance": {
      if (!isMember) {
        return refuse(
          input.action,
          "standing",
          `Sitting in on a meeting of ${reading.bodyName ?? reading.displayName} does not put you on it. ${
            input.action === "vote-on-ordinance"
              ? "Only its members vote."
              : "Only its members move an ordinance."
          }`,
        );
      }
      const rules = municipalRulePackFor(government);
      if (!rules.ok) {
        return refuse(
          input.action,
          "evidence",
          `${reading.displayName} cannot carry an ordinance here yet: ${rules.missing
            .map((entry) => `${entry.field} — ${entry.reason}`)
            .join(" ")}`,
        );
      }
      return grant(
        input.action,
        reading.procedure.passageText ??
          "The instruments read establish how this body adopts an ordinance.",
      );
    }

    case "act-on-adopted-ordinance": {
      const mayorTitle = reading.mayor?.title ?? "the mayor";
      const veto = reading.powers.find(
        (power) => power.power === "VETO" && power.heldByRole === "MAYOR",
      );
      if (veto?.held !== true) {
        return refuse(
          input.action,
          "evidence",
          `Nothing read gives ${mayorTitle} of ${reading.displayName} any action on an ordinance the body has adopted: ${
            reading.procedure.overrideAbsence ??
            "the instruments establish no veto."
          }`,
        );
      }
      if (!standing.roles.includes("mayor")) {
        return refuse(
          input.action,
          "standing",
          `Only ${mayorTitle} acts on an adopted ordinance here.`,
        );
      }
      return grant(input.action, veto.conditions.join(" "));
    }

    case "appoint-the-manager": {
      const appointment = reading.powers.find(
        (power) =>
          power.power === "APPOINTMENT" &&
          (power.heldByRole === "COUNCIL" || power.heldByRole === "COMMISSION"),
      );
      if (!appointment || appointment.held !== true) {
        return refuse(
          input.action,
          "evidence",
          `Nothing read gives ${reading.bodyName ?? reading.displayName} the appointment of a professional manager.`,
        );
      }
      if (!isMember) {
        return refuse(
          input.action,
          "standing",
          `Only members of ${reading.bodyName ?? reading.displayName} appoint its manager.`,
        );
      }
      return grant(
        input.action,
        `${appointment.target ?? "The manager"} — ${appointment.conditions.join(" ")}`.trim(),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

/**
 * Where a municipal record came from, dated honestly against the world clock.
 *
 * `source-record` provenance may not postdate the record it explains, and it
 * should not: a corpus that speaks as of September cannot be evidence about a
 * city in the January before it. A world already past the corpus date gets the
 * source-record kind with the corpus's own as-of. A world running earlier than
 * the corpus gets an authored provenance that names the same reference and the
 * same date in words, which says what actually happened — this repository put
 * a later reading into an earlier world — instead of backdating the reading.
 */
function corpusProvenance(
  reference: string,
  reading: MunicipalReading,
  recordDate: IsoDate,
): LifeRecordProvenance {
  const asOf = reading.asOf as IsoDate;
  if (asOf <= recordDate) {
    return {
      kind: "source-record",
      reference: `municipal-governance/${reference} (${reading.evidence})`,
      asOf,
    };
  }
  return {
    kind: "authored",
    note: `Installed from municipal-governance/${reference} (${reading.evidence}), which speaks as of ${asOf} — after this world's ${recordDate}. The reading is not backdated; this record is an authored placement of a later reading.`,
  };
}

export interface InstallMunicipalGovernmentInput {
  readonly governmentKey: string;
  /** The canonical jurisdiction this government sits in, supplied by the caller. */
  readonly jurisdictionId: EntityId | null;
  readonly formedAt: IsoDate;
}

/**
 * Put the government in the world as an organization.
 *
 * The classification is `service:municipal-government` and the provenance is a
 * `source-record` naming the compiled record and the date it speaks as of, so
 * a reader of the world can get back to the charter without this module having
 * copied any of it into the organization.
 */
export function installMunicipalGovernment(
  world: World,
  input: InstallMunicipalGovernmentInput,
): World {
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) {
    throw new Error(
      `No municipal government is compiled as "${input.governmentKey}".`,
    );
  }
  const existing = municipalOrganizationFor(world, input.governmentKey);
  if (existing) return world;
  const reading = primaryReading(government);
  const withOrganization = createOrganization(world, {
    stableKey: municipalOrganizationKey(input.governmentKey),
    formedAt: input.formedAt,
    detailLevel: "detailed",
    provenance: corpusProvenance(government.key, reading, input.formedAt),
    initialProfile: {
      name: reading.bodyName ?? reading.displayName,
      classification: "service:municipal-government",
      locationJurisdictionId: input.jurisdictionId,
    },
  });
  const organization = municipalOrganizationFor(
    withOrganization,
    input.governmentKey,
  );
  if (!organization) {
    throw new Error("Failed to install the municipal government.");
  }
  // The recognition event is what everything municipal later cites as its
  // provenance. An organization is not an accepted provenance anchor for a
  // scheduled activity or a work item — an event is — so the government's
  // arrival in this world is recorded as something that happened, with the
  // corpus reading named in its summary.
  return recordWorldEvent(withOrganization, {
    stableKey: municipalRecognitionKey(input.governmentKey),
    type: "municipal.government-recognized",
    occurredAt: withOrganization.currentDate,
    recordedAt: withOrganization.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      organization.id,
      ...(input.jurisdictionId ? [input.jurisdictionId] : []),
    ],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["municipal", `government:${input.governmentKey}`],
    summary: `${reading.displayName} is governed by ${reading.bodyName ?? "a body the record does not name"}, read from ${
      reading.evidence === "enacted-text"
        ? "its own enacted law"
        : "a research transcription of official municipal pages"
    } as of ${reading.asOf}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: reading.displayName,
        setting: null,
      },
      socialContext: reading.basisType,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The event stable key a government's arrival in a world is recorded under. */
export function municipalRecognitionKey(governmentKey: string): string {
  return `municipal-recognized:${governmentKey}`;
}

/** The recognition event, which municipal records cite as their provenance. */
export function municipalRecognitionEventId(
  world: World,
  governmentKey: string,
): EntityId | null {
  const stableKey = municipalRecognitionKey(governmentKey);
  return (
    world.history.events.find((event) => event.stableKey === stableKey)?.id ??
    null
  );
}

export interface SeatMunicipalMemberInput {
  readonly governmentKey: string;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  readonly role: MunicipalRole;
  /** The seat in the body's own words — "Ward 3", "at large", "Mayor". */
  readonly seatLabel: string;
}

const ROLE_KIND_BY_ROLE: Readonly<Record<MunicipalRole, string>> = {
  resident: "",
  member: "leader:municipal-member",
  "presiding-member": "leader:municipal-presiding-member",
  mayor: "leader:municipal-mayor",
  "professional-manager": "leader:municipal-manager",
  clerk: "leader:municipal-clerk",
};

/**
 * Seat one person in the government.
 *
 * Refuses to seat more members than the record says the body has. A body whose
 * size nobody established can be seated freely, because refusing on a number
 * nobody read would be inventing one in the other direction.
 */
export function seatMunicipalMember(
  world: World,
  input: SeatMunicipalMemberInput,
): World {
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) {
    throw new Error(
      `No municipal government is compiled as "${input.governmentKey}".`,
    );
  }
  if (input.role === "resident") {
    throw new Error(
      "Residency is where a person lives, not a seat somebody is given.",
    );
  }
  const organization = municipalOrganizationFor(world, input.governmentKey);
  if (!organization) {
    throw new Error(
      `Install ${input.governmentKey} before seating anybody in it.`,
    );
  }
  const reading = primaryReading(government);
  if (
    (input.role === "member" || input.role === "presiding-member") &&
    reading.bodySize !== null
  ) {
    const seated = municipalSeats(world, input.governmentKey).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    ).length;
    if (seated >= reading.bodySize) {
      throw new Error(
        `${reading.bodyName ?? reading.displayName} has ${reading.bodySize} seats and ${seated} are filled.`,
      );
    }
  }
  return createOrganizationParticipation(world, {
    stableKey: municipalSeatKey(input.governmentKey, input.personId),
    personId: input.personId,
    organizationId: organization.id,
    startedAt: input.startedAt,
    kind: "leadership:municipal-office",
    roleKind: ROLE_KIND_BY_ROLE[input.role] as never,
    context: input.seatLabel,
    provenance: corpusProvenance(
      `${government.key} seat`,
      reading,
      input.startedAt,
    ),
  });
}

export interface ScheduleMunicipalMeetingInput {
  /** Explicit provenance for this game's dated occurrence, distinct from sourced procedure. */
  readonly occurrenceNote?: string;
  readonly governmentKey: string;
  readonly seriesKey: string;
  readonly start: SimulationMoment;
  readonly end: SimulationMoment;
  /** Members and staff expected in the room, plus anybody attending. */
  readonly participantPersonIds: readonly EntityId[];
  readonly responsiblePersonId: EntityId | null;
  readonly jurisdictionId: EntityId | null;
}

/**
 * Put one sitting on the calendar.
 *
 * A sitting the record says is open gets `office` access, which is this
 * substrate's word for "not private to named people" — the public side of a
 * public meeting. A sitting the record says is closed gets `private` access
 * limited to the people the caller names, which is how Fargo's executive
 * session differs from Fargo's commission meeting.
 */
export function scheduleMunicipalMeeting(
  world: World,
  input: ScheduleMunicipalMeetingInput,
): World {
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) {
    throw new Error(
      `No municipal government is compiled as "${input.governmentKey}".`,
    );
  }
  const reading = municipalMeetingReading(government, input.seriesKey);
  const series = reading.meetingSeries.find(
    (entry) => entry.seriesKey === input.seriesKey,
  );
  if (!series) {
    throw new Error(
      `${reading.displayName} has no sitting called "${input.seriesKey}" in the record.`,
    );
  }
  const anchor = municipalRecognitionEventId(world, input.governmentKey);
  if (!anchor) {
    throw new Error(
      `Install ${input.governmentKey} before putting its meetings on the calendar.`,
    );
  }
  const open = series.publicAttendance?.openToPublic === true;
  const reportedVenue = reportedReading(government)?.meetingSeries.find(
    (entry) => entry.seriesKey === input.seriesKey,
  )?.venue;
  const venue =
    series.venue ??
    reading.meetingPlaces.find((place) => place.kind === "REGULAR_MEETING")
      ?.location ??
    reportedVenue ??
    null;

  return createScheduledActivity(world, {
    stableKey: municipalMeetingKey(
      input.governmentKey,
      input.seriesKey,
      input.start.date,
    ),
    title: `Game-authored session: ${series.bodyName ?? reading.displayName}: ${humanSeries(series.kind)}`,
    summary:
      "Game-authored occurrence; no real meeting notice or published agenda is asserted. " +
      (input.occurrenceNote ? `${input.occurrenceNote} ` : "") +
      (venue
        ? `${humanSeries(series.kind)} of ${series.bodyName ?? reading.displayName}, at ${venue}.${!series.venue && reportedVenue ? " Venue is from the separately attributed research report." : ""}`
        : `${humanSeries(series.kind)} of ${series.bodyName ?? reading.displayName}. Nothing read names where it sits, so no room is asserted.`) +
      ` Reference: ${reading.evidence}, snapshot ${reading.asOf}. ${series.publicAttendance?.note ?? "Public access was not established."}`,
    kind: "confirmed",
    start: input.start,
    end: input.end,
    participantPersonIds: input.participantPersonIds,
    responsiblePersonId: input.responsiblePersonId,
    location: {
      locationKey: `municipal:${input.governmentKey}:${input.seriesKey}`,
      label: venue ?? `${reading.displayName} — meeting place not established`,
      jurisdictionId: input.jurisdictionId,
    },
    sourceEntityIds: [anchor],
    flexibility: { kind: "fixed" },
    access: open
      ? { kind: "office" }
      : { kind: "private", personIds: input.participantPersonIds },
  });
}

function humanSeries(kind: string): string {
  switch (kind) {
    case "REGULAR_MEETING":
      return "regular meeting";
    case "SPECIAL_MEETING":
      return "special meeting";
    case "WORK_SESSION":
      return "work session";
    case "CAUCUS":
      return "caucus";
    case "COMMITTEE":
      return "committee meeting";
    case "PUBLIC_HEARING":
      return "public hearing";
    case "ANNUAL_TOWN_MEETING":
      return "annual town meeting";
    case "DELIBERATIVE_SESSION":
      return "deliberative session";
    default:
      return "sitting";
  }
}

export interface RecordMunicipalAttendanceInput {
  readonly governmentKey: string;
  readonly personId: EntityId;
  readonly activityId: EntityId;
  readonly jurisdictionId: EntityId | null;
  /** What the person went to do; a refusal is recorded as truthfully as a turn. */
  readonly note: string;
}

/**
 * Record that somebody was in the room.
 *
 * Deliberately separate from any authority: this writes attendance and nothing
 * else, so a resident who sits through a whole meeting still holds no office
 * afterwards and the world's records say exactly that.
 */
export function recordMunicipalAttendance(
  world: World,
  input: RecordMunicipalAttendanceInput,
): World {
  const activity = world.history.scheduledActivities.find(
    (candidate) => candidate.id === input.activityId,
  );
  if (!activity) {
    throw new Error("That municipal sitting is not on the calendar.");
  }
  const government = municipalGovernmentByKey(input.governmentKey);
  if (!government) {
    throw new Error(
      `No municipal government is compiled as "${input.governmentKey}".`,
    );
  }
  const anchor = municipalRecognitionEventId(world, input.governmentKey);
  const state = scheduledActivityState(world, activity.id);
  const origin = municipalMeetings(world, input.governmentKey).find(
    (candidate) =>
      candidate.id === activity.id ||
      activity.sourceEntityIds.includes(candidate.id),
  );
  const series =
    origin &&
    government.readings
      .flatMap((reading) => reading.meetingSeries)
      .find((candidate) =>
        origin.stableKey.startsWith(
          `municipal-meeting:${input.governmentKey}:${candidate.seriesKey}:`,
        ),
      );
  if (!series || series.publicAttendance?.openToPublic !== true) {
    throw new Error(
      "Public attendance requires a sourced public meeting series.",
    );
  }
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId ||
    !anchor ||
    !activity.sourceEntityIds.includes(anchor) ||
    activity.location.jurisdictionId !== input.jurisdictionId ||
    state?.status !== "completed" ||
    !activity.participantPersonIds.includes(input.personId)
  ) {
    throw new Error(
      "Attendance requires this person's completed canonical municipal activity.",
    );
  }
  return recordWorldEvent(world, {
    stableKey: `municipal-attendance:${input.governmentKey}:${input.personId}:${activity.stableKey}`,
    type: "municipal.public-meeting-attended",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId, activity.id],
    participants: [
      {
        personId: input.personId,
        role: "agency:attendee",
        detail: input.note,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["municipal", "public-meeting", `government:${input.governmentKey}`],
    summary: `${input.note} — ${activity.title}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label: activity.location.label,
        setting: null,
      },
      socialContext: `A sitting of ${series.bodyName ?? government.displayName}.`,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export interface OpenMunicipalWorkInput {
  readonly governmentKey: string;
  readonly personId: EntityId;
  readonly title: string;
  readonly summary: string;
  readonly jurisdictionId: EntityId | null;
  readonly requiredMinutes: number;
  readonly scheduledActivityId: EntityId | null;
  readonly targetKey: string;
}

export type MunicipalVisitResult =
  | { readonly ok: true; readonly world: World }
  | { readonly ok: false; readonly world: World; readonly reason: string };

/** Public attendance consumes canonical time and never creates a seat. */
export function attendMunicipalPublicMeeting(
  world: World,
  governmentKey: string,
  activityId: EntityId,
  transitionHandlers?: FutureTransitionHandlerRegistry,
): MunicipalVisitResult {
  const no = (reason: string): MunicipalVisitResult => ({
    ok: false,
    world,
    reason,
  });
  if (world.control.kind !== "person") return no("Person control is required.");
  const personId = world.control.personId;
  const government = municipalGovernmentByKey(governmentKey);
  const activity = municipalMeetings(world, governmentKey).find(
    (row) => row.id === activityId,
  );
  const anchor = municipalRecognitionEventId(world, governmentKey);
  if (
    !government ||
    !activity ||
    !anchor ||
    !activity.sourceEntityIds.includes(anchor)
  )
    return no("This government has no such canonical meeting.");
  const series = government.readings
    .flatMap((reading) => reading.meetingSeries)
    .find((row) =>
      activity.stableKey.startsWith(
        `municipal-meeting:${governmentKey}:${row.seriesKey}:`,
      ),
    );
  if (!series) return no("The meeting series is unresolved.");
  const authority = municipalActionAuthority(world, {
    governmentKey,
    personId,
    residentPlaceGeoid: null,
    action: "attend-public-meeting",
    seriesKey: series.seriesKey,
  });
  if (!authority.ok) return no(authority.reason);
  const state = scheduledActivityState(world, activityId);
  if (state?.status !== "scheduled")
    return no("The meeting is no longer scheduled.");
  const visitKey = `municipal-visit:${activityId}:${personId}`;
  if (
    world.history.scheduledActivities.some((row) => row.stableKey === visitKey)
  )
    return no("This attendance is already recorded.");
  try {
    let next = world;
    let visit = activity;
    if (activity.responsiblePersonId !== personId) {
      next = createScheduledActivity(world, {
        stableKey: visitKey,
        title: `Attend ${activity.title}`,
        summary: activity.summary,
        kind: "confirmed",
        start: state.start,
        end: state.end,
        participantPersonIds: [personId],
        responsiblePersonId: personId,
        location: activity.location,
        sourceEntityIds: [anchor, activityId],
        flexibility: { kind: "fixed" },
        access: { kind: "private", personIds: [personId] },
      });
      visit = next.history.scheduledActivities.find(
        (row) => row.stableKey === visitKey,
      )!;
    }
    const performed = performScheduledActivity(
      next,
      visit.id,
      transitionHandlers,
    );
    if (scheduledActivityState(performed, visit.id)?.status !== "completed")
      return no("An existing calendar commitment prevents attendance.");
    return {
      ok: true,
      world: recordMunicipalAttendance(performed, {
        governmentKey,
        personId,
        activityId: visit.id,
        jurisdictionId: visit.location.jurisdictionId,
        note: "Attended the public meeting",
      }),
    };
  } catch (error) {
    if (error instanceof Error && /conflict|past/.test(error.message))
      return no(error.message);
    throw error;
  }
}

/**
 * Open a piece of municipal work for somebody who actually holds the office.
 *
 * A work item is the canonical "this is on your desk" record, and it is created
 * here only after `municipalActionAuthority` has granted the action, so the
 * refusal path never leaves a task behind for a person who could not do it.
 */
export function openMunicipalWork(
  world: World,
  input: OpenMunicipalWorkInput,
): World {
  const standing = municipalStanding(world, {
    ...input,
    residentPlaceGeoid: null,
  });
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId ||
    !standing.roles.some((role) =>
      [
        "member",
        "presiding-member",
        "mayor",
        "professional-manager",
        "clerk",
      ].includes(role),
    )
  ) {
    throw new Error(
      "Municipal work requires a current canonical role in this government.",
    );
  }
  const anchor = municipalRecognitionEventId(world, input.governmentKey);
  if (!anchor) {
    throw new Error(
      `Install ${input.governmentKey} before opening work for it.`,
    );
  }
  const organization = municipalOrganizationFor(world, input.governmentKey);
  if (!organization) throw new Error("Municipal organization is unresolved.");
  if (input.scheduledActivityId !== null) {
    const meeting = municipalMeetings(world, input.governmentKey).find(
      (row) => row.id === input.scheduledActivityId,
    );
    if (!meeting || meeting.location.jurisdictionId !== input.jurisdictionId)
      throw new Error(
        "Work must refer to this government's canonical meeting.",
      );
  }
  return createWorkItem(world, {
    stableKey: `municipal-work:${input.governmentKey}:${input.targetKey}:${input.personId}`,
    title: input.title,
    summary: input.summary,
    jurisdictionId: input.jurisdictionId,
    sourceEntityIds: [anchor],
    focus: {
      kind: "other",
      targetKey: input.targetKey,
      sourceEntityId: anchor,
    },
    effort: {
      kind: "authored-duration",
      requiredMinutes: input.requiredMinutes,
    },
    access: { kind: "private", personIds: [input.personId] },
    assignedPersonIds: [input.personId],
    playerRequirement: "action",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: input.scheduledActivityId,
  });
}

/** Explicit personal work uses the existing calendar and appends a canonical
 * Work state. No role, cash, legislative authority or published agenda is made.
 */
export function performMunicipalMeetingNotes(
  world: World,
  governmentKey: string,
  meetingId: EntityId,
  transitionHandlers?: FutureTransitionHandlerRegistry,
): MunicipalVisitResult {
  const no = (reason: string): MunicipalVisitResult => ({
    ok: false,
    world,
    reason,
  });
  if (world.control.kind !== "person") return no("Person control is required.");
  const personId = world.control.personId;
  const hasRole = (candidate: World) =>
    municipalStanding(candidate, {
      governmentKey,
      personId,
      residentPlaceGeoid: null,
    }).roles.some((role) => role !== "resident");
  if (!hasRole(world))
    return no("A current role in this government is required.");
  const meeting = municipalMeetings(world, governmentKey).find(
    (entry) => entry.id === meetingId,
  );
  const item = world.history.workItems.find(
    (entry) =>
      entry.stableKey ===
      `municipal-work:${governmentKey}:meeting-notes:${meetingId}:${personId}`,
  );
  if (!meeting || !item?.effort)
    return no(
      "No meeting-notes work is recorded for this person and government.",
    );
  const before = workItemState(world, item.id);
  if (before.status !== "active")
    return no("Meeting notes are already complete or unavailable.");
  if (
    before.blocker ||
    before.waitingOnPersonIds.length ||
    !before.assignedPersonIds.includes(personId)
  )
    return no("This meeting-notes work is blocked or assigned elsewhere.");
  const minutes = item.effort.requiredMinutes - before.completedEffortMinutes;
  if (minutes <= 0) return no("No remaining work is established.");
  const stableKey = `municipal-notes-session:${item.id}:${before.id}`;
  if (
    world.history.scheduledActivities.some(
      (entry) => entry.stableKey === stableKey,
    )
  )
    return no("This work session is already recorded.");
  try {
    const planned = createScheduledActivity(world, {
      stableKey,
      title: `Prepare meeting notes: ${meeting.title}`,
      summary:
        "Game-authored work duration: review the recorded meeting references and measure history. This does not create a published agenda or exercise legislative authority.",
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, minutes),
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        jurisdictionId: item.jurisdictionId,
        locationKey: `municipal-notes:${governmentKey}:${personId}`,
        label: "Private meeting preparation; no chamber presence is asserted",
      },
      sourceEntityIds: [item.id, meeting.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
    const activity = planned.history.scheduledActivities.find(
      (entry) => entry.stableKey === stableKey,
    )!;
    const performed = performScheduledActivity(
      planned,
      activity.id,
      transitionHandlers,
    );
    const completion = scheduledActivityState(performed, activity.id);
    if (completion.status !== "completed")
      return no("An existing calendar commitment prevents this work.");
    if (
      !hasRole(performed) ||
      workItemState(performed, item.id).id !== before.id
    )
      return no("The role or work assignment changed during this session.");
    const stateKey = `municipal-notes-completed:${item.id}:${activity.id}`;
    const recorded = recordWorldEvent(performed, {
      stableKey: `${stateKey}:event`,
      type: "municipal.meeting-notes-prepared",
      occurredAt: performed.currentDate,
      recordedAt: performed.currentDate,
      jurisdictionId: item.jurisdictionId,
      involvedEntityIds: [item.id, meeting.id, activity.id, personId],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["municipal", "work.completed"],
      summary: `Prepared private meeting notes for ${meeting.title} using the recorded references and measure history.`,
      context: {
        location: null,
        socialContext:
          "Explicitly performed private municipal work; no published agenda or chamber presence is asserted.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const state: WorkItemStateRecord = {
      ...before,
      id: createStableId("work-item-state", `${world.id}:${stateKey}`),
      stableKey: stateKey,
      sequence: recorded.history.nextSequence,
      recordedAt: performed.currentMoment,
      status: "completed",
      playerRequirement: "none",
      completedEffortMinutes: item.effort.requiredMinutes,
      outcomeEventId: recorded.history.events.at(-1)!.id,
      supersedesStateId: before.id,
    };
    const next: World = {
      ...recorded,
      history: {
        ...recorded.history,
        nextSequence: recorded.history.nextSequence + 1,
        workItemStates: [...recorded.history.workItemStates, state],
      },
    };
    assertWorldIntegrity(next);
    return { ok: true, world: next };
  } catch (error) {
    if (error instanceof Error && /conflict|past/.test(error.message))
      return no(error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Reading the government back out of the world
// ---------------------------------------------------------------------------

export interface MunicipalSeat {
  readonly personId: EntityId;
  readonly role: MunicipalRole;
  readonly seatLabel: string | null;
}

/** Who currently sits in this government, from the participation records. */
export function municipalSeats(
  world: World,
  governmentKey: string,
): readonly MunicipalSeat[] {
  const organization = municipalOrganizationFor(world, governmentKey);
  if (!organization) return [];
  const seats: MunicipalSeat[] = [];
  for (const participation of world.history.organizationParticipations) {
    if (participation.organizationId !== organization.id) continue;
    if (
      participation.startedAt > world.currentDate ||
      participation.recordedAt > world.currentDate
    )
      continue;
    const state = latestParticipationState(world, participation.id);
    if (!state || state.status !== "active" || !state.roleKind) continue;
    const role = SEAT_ROLE_KINDS[state.roleKind];
    if (!role) continue;
    seats.push({
      personId: participation.personId,
      role,
      seatLabel: state.context,
    });
  }
  return seats.sort((left, right) =>
    left.personId.localeCompare(right.personId),
  );
}

/** Every municipal sitting on this world's calendar for one government. */
export function municipalMeetings(
  world: World,
  governmentKey: string,
): readonly ScheduledActivityRecord[] {
  const prefix = `municipal-meeting:${governmentKey}:`;
  return world.history.scheduledActivities.filter((activity) =>
    activity.stableKey.startsWith(prefix),
  );
}

/**
 * Every ordinance before this government, in the canonical measure family.
 *
 * The measures are ordinary `legislativeMeasures` carrying this government's
 * derived pack id, which is what makes the agenda a view over the same records
 * a state bill lives in rather than a municipal copy of them.
 */
export function municipalMeasures(world: World, governmentKey: string) {
  const government = municipalGovernmentByKey(governmentKey);
  if (!government) return [];
  const packId = municipalRulePackId(primaryReading(government));
  return (world.history.legislativeMeasures ?? []).filter(
    (measure) => measure.rulePackId === packId,
  );
}

/** The id a municipal ordinance's measure record is created under. */
export function municipalMeasureKey(
  governmentKey: string,
  designation: string,
): string {
  return `municipal-measure:${governmentKey}:${designation}`;
}

/** A stable canonical id for a municipal government's organization, pre-install. */
export function municipalOrganizationId(
  world: World,
  governmentKey: string,
): EntityId {
  return createStableId(
    "organization",
    `${world.id}:${municipalOrganizationKey(governmentKey)}`,
  );
}

/** The two readings of one government, for a surface that shows both. */
export function municipalReadings(government: MunicipalGovernment): {
  readonly law: MunicipalReading | null;
  readonly reported: MunicipalReading | null;
} {
  return {
    law: lawReading(government),
    reported: reportedReading(government),
  };
}
