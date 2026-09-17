import {
  addDays,
  crisisProtectedDecisions,
  crisisRecordIndex,
  crisisRecords,
  disasterAssessment,
  healthDecisionsFor,
  internationalCrisisState,
  knowledgeForEvent,
  pendingDisasterDecisions,
  pendingInternationalDecisions,
  personName,
  stateJurisdictionForKey,
  type CrisisOptionKey,
  type EntityId,
  type HazardEpisodeRecord,
  type HealthAccess,
  type HealthEpisodeRecord,
  type HealthSeverity,
  type HealthState,
  type InternationalCrisisRecord,
  type IsoDate,
  type World,
} from "../simulation";
import { proseDate } from "./prose-dates";

/**
 * What CRISIS facts look like on the player's own screens.
 *
 * Reads only. Every sentence here is worded from a stored CRISIS record: a
 * health episode the character actually has, a disclosure they were actually
 * told, a hazard episode the World actually declared, a decision the office
 * they actually hold is actually being asked for. Nothing is counted,
 * estimated or filled in. When there is no record the caller gets an empty
 * list and says so plainly, because a missing illness is not a healthy
 * character and a missing assessment is not zero damage.
 *
 * The writers stay where they are: this module never calls one.
 */

const SEVERITY_TEXT: Record<HealthSeverity, string> = {
  acute: "An acute illness or injury",
  serious: "A serious illness or injury",
  chronic: "A continuing condition",
};

const STATE_TEXT: Record<HealthState, string> = {
  acute: "Still active.",
  serious: "Still active.",
  chronic: "Continuing.",
  "prognosis-limited": "The prognosis is limited.",
  "temporarily-incapacitated": "You cannot work through it right now.",
  recovering: "Recovering.",
  recovered: "Recovered.",
  deceased: "Ended in death.",
};

const ACCESS_TEXT: Record<HealthAccess, string> = {
  private: "Nobody else has been told.",
  "specific-people": "Told to the people you chose.",
  official: "The people responsible know.",
  public: "Publicly known.",
};

const DISCLOSE_TEXT: Record<Exclude<HealthAccess, "private">, string> = {
  "specific-people": "Tell specific people",
  official: "Tell the people responsible",
  public: "Make it public",
};

/** A health episode of the controlled character, and what they may disclose. */
export interface OwnHealthNotice {
  readonly episodeId: EntityId;
  /** What the record says it is. Never a diagnosis the record does not carry. */
  readonly headline: string;
  readonly onsetLabel: string;
  readonly stateLabel: string;
  readonly accessLabel: string;
  readonly access: HealthAccess;
  readonly disclosures: readonly {
    readonly access: Exclude<HealthAccess, "private">;
    readonly label: string;
  }[];
}

function episodeHeadline(episode: HealthEpisodeRecord): string {
  // A simulation episode names no disease, so neither does its sentence.
  return episode.label === "condition"
    ? "A recorded condition"
    : SEVERITY_TEXT[episode.severity];
}

function healthEpisode(
  world: World,
  episodeId: EntityId,
): HealthEpisodeRecord | null {
  const record = crisisRecordIndex(world).get(episodeId);
  return record && record.kind === "health-episode" ? record : null;
}

export function ownHealthNotices(
  world: World,
  personId: EntityId,
): readonly OwnHealthNotice[] {
  return healthDecisionsFor(world, personId).flatMap((decision) => {
    const episode = healthEpisode(world, decision.episodeId);
    if (!episode) return [];
    return [
      {
        episodeId: decision.episodeId,
        headline: episodeHeadline(episode),
        onsetLabel: `Recorded ${proseDate(episode.effectiveAt)}.`,
        stateLabel: STATE_TEXT[decision.state],
        accessLabel: ACCESS_TEXT[decision.access],
        access: decision.access,
        disclosures: decision.canDisclose.map((access) => ({
          access,
          label: DISCLOSE_TEXT[access],
        })),
      },
    ];
  });
}

/** Somebody else's health, as far as this character has actually been told. */
export interface KnownHealthNotice {
  readonly key: string;
  readonly personId: EntityId;
  readonly personLabel: string;
  readonly headline: string;
  readonly toldLabel: string;
  readonly accessLabel: string;
}

/**
 * A private illness reaches this list only through the knowledge path: the
 * character was a named recipient of the disclosure, or a knowledge record
 * says they learned the disclosed event. Public disclosure is public.
 */
export function knownHealthNotices(
  world: World,
  viewerId: EntityId,
): readonly KnownHealthNotice[] {
  return crisisRecords(world).flatMap((record) => {
    if (record.kind !== "health-disclosure") return [];
    if (record.personId === viewerId) return [];
    const told =
      record.access === "public" ||
      record.recipientIds.includes(viewerId) ||
      (record.eventId !== null &&
        knowledgeForEvent(world, record.eventId).some(
          (entry) => entry.personId === viewerId,
        ));
    if (!told) return [];
    const episode = healthEpisode(world, record.episodeId);
    const person = world.people[record.personId];
    if (!episode || !person) return [];
    return [
      {
        key: record.stableKey,
        personId: record.personId,
        personLabel: personName(person),
        headline: episodeHeadline(episode),
        toldLabel: `Known to you since ${proseDate(record.effectiveAt)}.`,
        accessLabel: ACCESS_TEXT[record.access],
      },
    ];
  });
}

/** What a player calls the state. A USPS code is data, not a place name. */
function stateNameFor(usps: string): string {
  return stateJurisdictionForKey(`US-${usps}`)?.name ?? usps;
}

const HAZARD_TEXT: Record<HazardEpisodeRecord["family"], string> = {
  flood: "flood",
  "severe-storm": "severe storm",
};

/** A decision the office this character actually holds is being asked for. */
export interface AuthorityDecision {
  readonly key: string;
  readonly kind:
    | "disaster-state-request"
    | "disaster-federal-declaration"
    | "international-decision";
  readonly subjectId: EntityId;
  readonly title: string;
  /** Sentences drawn from the record. Empty when the record carries none. */
  readonly detail: readonly string[];
  readonly options: readonly {
    readonly key: string;
    readonly label: string;
    readonly note: string | null;
    readonly recommended: boolean;
  }[];
}

function hazardEpisode(
  world: World,
  episodeId: EntityId,
): HazardEpisodeRecord | null {
  const record = crisisRecordIndex(world).get(episodeId);
  return record && record.kind === "hazard-episode" ? record : null;
}

function internationalCrisis(
  world: World,
  crisisId: EntityId,
): InternationalCrisisRecord | null {
  const record = crisisRecordIndex(world).get(crisisId);
  return record && record.kind === "international-crisis" ? record : null;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Only the recorded counts, said as the represented records they are. */
function damageSentences(world: World, episodeId: EntityId): string[] {
  const assessment = disasterAssessment(world, episodeId);
  if (!assessment) return ["No damage assessment has been recorded yet."];
  const homesDamaged =
    assessment.damaged.household + assessment.damaged.dwelling;
  const homesDestroyed =
    assessment.destroyed.household + assessment.destroyed.dwelling;
  const parts = [
    `${plural(homesDamaged, "recorded home damaged", "recorded homes damaged")}, ${plural(homesDestroyed, "destroyed", "destroyed")}.`,
  ];
  if (assessment.injuredPersonIds.length > 0)
    parts.push(
      `${plural(assessment.injuredPersonIds.length, "person", "people")} recorded as injured.`,
    );
  if (assessment.deceasedPersonIds.length > 0)
    parts.push(
      `${plural(assessment.deceasedPersonIds.length, "person", "people")} recorded as killed.`,
    );
  return parts;
}

const OPTION_LABEL: Record<CrisisOptionKey, string> = {
  diplomatic: "Pursue talks",
  economic: "Impose economic measures",
  "force-posture": "Move forces toward the dispute",
};

export function authorityDecisions(world: World): readonly AuthorityDecision[] {
  const decisions: AuthorityDecision[] = [];
  for (const pending of pendingDisasterDecisions(world)) {
    const episode = hazardEpisode(world, pending.episodeId);
    if (!episode) continue;
    const where = `${HAZARD_TEXT[episode.family]} in ${stateNameFor(episode.stateUsps)}`;
    const detail = [
      `Declared ${proseDate(episode.effectiveAt)}, magnitude ${episode.magnitude}.`,
      ...damageSentences(world, episode.id),
    ];
    decisions.push(
      pending.decision === "state-request"
        ? {
            key: `disaster-state-request:${episode.id}`,
            kind: "disaster-state-request",
            subjectId: episode.id,
            title: `Whether to ask for a federal disaster declaration after the ${where}`,
            detail,
            options: [
              {
                key: "request",
                label: "Ask the President for a declaration",
                note: null,
                recommended: false,
              },
              {
                key: "decline",
                label: "Do not ask",
                note: null,
                recommended: false,
              },
            ],
          }
        : {
            key: `disaster-federal-declaration:${episode.id}`,
            kind: "disaster-federal-declaration",
            subjectId: episode.id,
            title: `Whether to declare a major disaster after the ${where}`,
            detail,
            options: [
              {
                key: "declare",
                label: "Declare a major disaster",
                note: null,
                recommended: false,
              },
              {
                key: "deny",
                label: "Deny the request",
                note: null,
                recommended: false,
              },
            ],
          },
    );
  }
  for (const pending of pendingInternationalDecisions(world)) {
    const crisis = internationalCrisis(world, pending.crisisId);
    if (!crisis) continue;
    const state = internationalCrisisState(world, pending.crisisId);
    const assessment = state.assessments.at(-1);
    decisions.push({
      key: `international-decision:${pending.crisisId}:${pending.sequence}`,
      kind: "international-decision",
      subjectId: pending.crisisId,
      title: `What to do about the ${crisis.subject} dispute with ${crisis.counterpartyLabel}`,
      detail: [
        `Tension is ${state.tension}.`,
        ...(assessment
          ? [
              `Intelligence judges the intent ${assessment.assessedIntent.replace("-", " ")}, at ${assessment.confidence} confidence.`,
            ]
          : []),
      ],
      options: pending.options.map((option) => ({
        key: option.key,
        label: OPTION_LABEL[option.key],
        note: `Advisers: ${option.advisers} Risk: ${option.risk}. ${option.legal}`,
        recommended: option.key === pending.recommended,
      })),
    });
  }
  return decisions;
}

/** A public CRISIS event, as the event itself worded it. */
export interface PublicCrisisEvent {
  readonly key: string;
  readonly dateLabel: string;
  readonly summary: string;
}

/**
 * The declared-emergency record kinds. An emergency is a hazard the World
 * declared, the official response to one, an international dispute and what
 * was done about it. A health disclosure is public information about a
 * person, not an emergency, so it stays on the health sections where the
 * player met it and is never relabelled as one here.
 */
const PUBLIC_EMERGENCY_KINDS = new Set([
  "hazard-episode",
  "disaster-response",
  "international-crisis",
  "crisis-decision",
  "counterparty-response",
  "war-powers",
]);

/**
 * What an ordinary resident can read: the public record of the last `days`
 * days, with no decision attached to it. Read from the records themselves
 * rather than the consumer envelope, because the envelope drops the declared
 * hazard and the state request — the two things a resident notices first.
 */
export function publicCrisisEvents(
  world: World,
  days = 60,
): readonly PublicCrisisEvent[] {
  const from: IsoDate = addDays(world.currentDate, -Math.max(1, days));
  const to: IsoDate = addDays(world.currentDate, 1);
  const events = new Map(
    world.history.events.map((event) => [event.id, event] as const),
  );
  return crisisRecords(world).flatMap((record) => {
    if (
      record.visibility !== "public" ||
      !PUBLIC_EMERGENCY_KINDS.has(record.kind) ||
      record.effectiveAt < from ||
      record.effectiveAt >= to
    )
      return [];
    const event = record.eventId === null ? null : events.get(record.eventId);
    if (!event) return [];
    return [
      {
        key: record.id,
        dateLabel: proseDate(record.effectiveAt),
        summary: event.summary,
      },
    ];
  });
}

export type CrisisStopTarget = "health" | "authority";

/** Why time should not simply run on, and where the decision lives. */
export interface CrisisStop {
  readonly sentence: string;
  readonly target: CrisisStopTarget;
}

const STOP_TEXT = {
  "own-health-disclosure": {
    text: "a health matter only you can disclose",
    target: "health",
  },
  "disaster-state-request": {
    text: "a federal disaster request only the governor can make",
    target: "authority",
  },
  "disaster-federal-declaration": {
    text: "a disaster declaration only the President can decide",
    target: "authority",
  },
  "international-decision": {
    text: "an international decision only the President can make",
    target: "authority",
  },
} as const satisfies Record<
  string,
  { readonly text: string; readonly target: CrisisStopTarget }
>;

/**
 * The protected CRISIS decisions raised after `afterSequence`, worded for the
 * player. The death of the played character is deliberately absent: that is
 * PEOPLE's continuation panel, and saying it twice would offer the player a
 * second, weaker version of the same moment.
 */
export function crisisStopAfter(
  world: World,
  afterSequence: number,
): CrisisStop | null {
  const raised = crisisProtectedDecisions(world, afterSequence).flatMap(
    (decision) =>
      decision.kind in STOP_TEXT
        ? [STOP_TEXT[decision.kind as keyof typeof STOP_TEXT]]
        : [],
  );
  if (raised.length === 0) return null;
  const unique = [...new Set(raised.map((entry) => entry.text))];
  const list =
    unique.length === 1
      ? unique[0]!
      : `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)!}`;
  return {
    sentence: `While time was passing, something came up that only you can decide: ${list}.`,
    target: raised[0]!.target,
  };
}

/** The history sequence a later `crisisStopAfter` should read from. */
export function crisisStopBaseline(world: World): number {
  return world.history.nextSequence - 1;
}
