import nominationRules from "../../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";

const REGISTRATION = "election.party-registration";
const SELECTION = "election.primary-ballot-selection";
const ACCESS_RECORDS = new WeakMap<
  readonly HistoricalEvent[],
  Map<string, HistoricalEvent[]>
>();

function accessRecords(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  type: typeof REGISTRATION | typeof SELECTION,
) {
  let index = ACCESS_RECORDS.get(world.history.events);
  if (!index) {
    index = new Map();
    for (const event of world.history.events) {
      if (event.type !== REGISTRATION && event.type !== SELECTION) continue;
      for (const participant of event.participants) {
        const key = JSON.stringify([
          participant.personId,
          event.jurisdictionId,
          event.type,
        ]);
        const rows = index.get(key) ?? [];
        rows.push(event);
        index.set(key, rows);
      }
    }
    ACCESS_RECORDS.set(world.history.events, index);
  }
  return index.get(JSON.stringify([personId, jurisdictionId, type])) ?? [];
}

/** Record an actual registration action, never a public-affiliation inference.
 * The caller supplies its recorded legal action; this writer creates no deadline
 * exemption, invitation, or retrospective registration.
 */
export function recordPrimaryPartyRegistration(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly registeredPartyId: string | null;
  },
): World {
  return recordAccessAction(
    world,
    input,
    REGISTRATION,
    input.registeredPartyId,
    null,
  );
}

/** The elector's actual chosen ballot for this field, shared with its runoff. */
export function recordPrimaryBallotSelection(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly electionStableKey: string;
    readonly selectedPartyId: string;
    readonly selectedAt?: IsoDate;
  },
): World {
  if (!input.electionStableKey.trim() || !input.selectedPartyId.trim())
    throw new Error("A ballot selection needs an election and party.");
  const prior = accessRecords(
    world,
    input.personId,
    input.jurisdictionId,
    SELECTION,
  ).find((event) => event.context.socialContext === input.electionStableKey);
  if (prior) {
    if (prior.participants[0]?.detail !== input.selectedPartyId)
      throw new Error(
        "An elector cannot select two party ballots for one primary.",
      );
    return world;
  }
  return recordAccessAction(
    world,
    input,
    SELECTION,
    input.selectedPartyId,
    input.electionStableKey,
  );
}

function recordAccessAction(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly selectedAt?: IsoDate;
  },
  type: typeof REGISTRATION | typeof SELECTION,
  party: string | null,
  election: string | null,
): World {
  if (
    !world.people[input.personId] ||
    !world.jurisdictions[input.jurisdictionId]
  )
    throw new Error("Ballot access references missing records.");
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type,
    occurredAt: input.selectedAt ?? world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: "presence:participant", detail: party },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["recorded-primary-access/v1"],
    summary:
      type === REGISTRATION
        ? "The elector recorded a party registration."
        : "The elector selected one party ballot.",
    context: {
      location: null,
      socialContext: election,
      pressure: null,
      choice: party,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Actual latest registration action, distinct from affiliation and absence. */
export function recordedPrimaryPartyRegistrationAt(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly electionDate: IsoDate;
  },
): string | null | undefined {
  const registrations = accessRecords(
    world,
    input.personId,
    input.jurisdictionId,
    REGISTRATION,
  ).filter((event) => event.occurredAt <= input.electionDate);
  const registration = registrations.reduce<HistoricalEvent | null>(
    (latest, event) =>
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
        ? event
        : latest,
    null,
  );
  return registration
    ? (registration.participants[0]?.detail ?? null)
    : undefined;
}

export function recordedPrimaryBallotSelectionAt(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly electionStableKey: string;
    readonly electionDate: IsoDate;
  },
): string | null | undefined {
  const selection = accessRecords(
    world,
    input.personId,
    input.jurisdictionId,
    SELECTION,
  ).find(
    (event) =>
      event.occurredAt <= input.electionDate &&
      event.context.socialContext === input.electionStableKey,
  );
  return selection?.participants[0]?.detail;
}

/** Read only actions effective on this date in this jurisdiction and field. */
export function recordedPrimaryPartyAdmission(
  world: World,
  input: {
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly electionStableKey: string;
    readonly electionDate: IsoDate;
    readonly stateUsps: string;
    readonly primaryPartyId: string;
  },
): boolean | null {
  const admission = primaryPartyBallotAdmission(
    input.stateUsps,
    input.primaryPartyId,
    recordedPrimaryPartyRegistrationAt(world, input),
    recordedPrimaryBallotSelectionAt(world, input),
  );
  return admission === "requires-record" ? null : admission === "eligible";
}

/** The sourced access category, not a person's affiliation or registration. */
export function primaryVoterAccessFor(stateUsps: string): string | null {
  const key = stateUsps.toUpperCase();
  const place = Object.entries(nominationRules.places).find(
    ([placeKey]) => placeKey === (key.startsWith("US-") ? key : `US-${key}`),
  )?.[1];
  return place?.voterAccess ?? null;
}

/**
 * Party-ballot admission after the shared counter's ordinary voter admission.
 * Inputs must be actual registration and ballot-selection records. Public party
 * affiliation is not registration. A missing selection does not assign a voter
 * to a primary; the shared voter decision must choose their one ballot first.
 * Party-dependent and crossover rules retain their sourced category until the
 * required party invitation or registration-change record is supplied by its
 * existing producer. They never silently become an open or closed primary.
 */
export function primaryPartyBallotAdmission(
  stateUsps: string,
  primaryPartyId: string,
  registeredPartyId: string | null | undefined,
  selectedPrimaryPartyId: string | null | undefined,
): "eligible" | "ineligible" | "requires-record" {
  const access = primaryVoterAccessFor(stateUsps);
  if (access === null) return "requires-record";
  if (selectedPrimaryPartyId == null) return "requires-record";
  if (selectedPrimaryPartyId !== primaryPartyId) return "ineligible";
  switch (access) {
    case "Open":
      return "eligible";
    case "Closed":
      if (registeredPartyId === undefined) return "requires-record";
      return registeredPartyId === primaryPartyId ? "eligible" : "ineligible";
    case "Partially closed":
    case "Partially open":
      // Enrollment in this party admits its own ballot. Crossover and
      // unaffiliated access still need the missing election-specific rule.
      return registeredPartyId === primaryPartyId
        ? "eligible"
        : "requires-record";
    case "Open to unaffiliated voters":
      if (registeredPartyId === undefined) return "requires-record";
      return registeredPartyId === null || registeredPartyId === primaryPartyId
        ? "eligible"
        : "ineligible";
    default:
      return "requires-record";
  }
}
