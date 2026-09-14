import {
  activeLifeCommitmentsAt,
  ageOnDate,
  currentLifeCutoff,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  factsForPerson,
  lifePlaceByJurisdictionId,
  organizationProfileAt,
  personName,
  privateBeliefHistory,
  publicPositionHistory,
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";

/**
 * Chronological biographical account of one played life.
 *
 * Sentences come from recorded identity, history, choices and outcomes.
 * Intention, agreement and performance stay labelled separately. Beliefs are
 * attributed. Unsupported emotion, cause, "You chose to" and proof-ledger
 * wording are omitted rather than invented.
 */

export type BiographyAspect =
  | "identity"
  | "intention"
  | "agreement"
  | "performance"
  | "belief"
  | "experience";

export interface BiographyPassage {
  readonly key: string;
  readonly at: IsoDate;
  readonly aspect: BiographyAspect;
  readonly sentence: string;
  readonly recordId: string;
}

export interface LifeBiography {
  readonly personName: string;
  readonly age: number;
  readonly summary: string;
  readonly passages: readonly BiographyPassage[];
  readonly emptyReason: string | null;
}

const LEDGER_OR_CHOSE =
  /\byou chose to\b|\byou decided to\b|\bproof[- ]ledger\b|\bstanding for membership\b|\bnot represented in this save\b|\bsource pack\b/i;
const INVENTED_CAUSE_OR_FEELING =
  /\bbecause you (felt|were|wanted)\b|\bmade you (feel|angry|sad|happy|afraid)\b|\byou were (angry|sad|lonely|afraid|proud|ashamed)\b|\bthis (reminds|inspired|forced) you\b/i;

export function projectLifeBiography(
  world: World,
  personId: EntityId,
): LifeBiography {
  const person = world.people[personId];
  if (!person) {
    return {
      personName: "",
      age: 0,
      summary: "",
      passages: [],
      emptyReason: "No character is recorded for this journal.",
    };
  }

  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const passages = collectPassages(world, personId).sort(byDateThenKey);

  return {
    personName: name,
    age,
    summary: place
      ? `${name}, ${age}, in ${place.displayName}.`
      : `${name}, ${age}.`,
    passages,
    emptyReason:
      passages.length === 0
        ? "No identity, history, choices or outcomes are recorded for this life yet."
        : null,
  };
}

function collectPassages(world: World, personId: EntityId): BiographyPassage[] {
  const person = world.people[personId]!;
  const name = personName(person);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const cutoff = currentLifeCutoff(world);
  const passages: BiographyPassage[] = [];

  const identity = place
    ? `${name} was born ${person.birthDate} and lives in ${place.displayName}.`
    : `${name} was born ${person.birthDate}.`;
  pushPassage(passages, {
    key: `identity:${person.id}`,
    at: person.birthDate,
    aspect: "identity",
    sentence: identity,
    recordId: person.id,
  });

  for (const fact of factsForPerson(person)) {
    if (fact.kind === "education") {
      pushPassage(passages, {
        key: `fact:${fact.id}`,
        at: fact.occurredAt,
        aspect: "performance",
        sentence: fact.field
          ? `${name} has a recorded education fact: ${fact.institution}, ${fact.field}.`
          : `${name} has a recorded education fact: ${fact.institution}.`,
        recordId: fact.id,
      });
    }
    if (fact.kind === "occupation") {
      pushPassage(passages, {
        key: `fact:${fact.id}`,
        at: fact.occurredAt,
        aspect: fact.status === "ongoing" ? "performance" : "performance",
        sentence:
          fact.status === "ongoing"
            ? `${name} works as ${fact.title} at ${fact.employer}.`
            : `${name} worked as ${fact.title} at ${fact.employer}.`,
        recordId: fact.id,
      });
    }
  }

  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
    cutoff,
  )) {
    const status = workStatusAt(world, relationship.id, cutoff);
    const role = workRoleAt(world, relationship.id, cutoff);
    if (!status || !role) continue;
    const orgName = relationship.organizationId
      ? (organizationProfileAt(world, relationship.organizationId, cutoff)
          ?.name ?? null)
      : null;
    const where = orgName ? ` at ${orgName}` : "";
    if (status.status === "expected") {
      pushPassage(passages, {
        key: `work-intention:${relationship.id}`,
        at: relationship.recordedAt,
        aspect: "intention",
        sentence: `${name} has recorded expected work as ${role.title}${where}, to start ${relationship.startedAt}.`,
        recordId: relationship.id,
      });
    } else if (status.status === "active") {
      pushPassage(passages, {
        key: `work-performance:${relationship.id}`,
        at: role.effectiveAt,
        aspect: "performance",
        sentence: `${name} holds the recorded role of ${role.title}${where}.`,
        recordId: relationship.id,
      });
    } else if (status.status === "ended") {
      pushPassage(passages, {
        key: `work-ended:${relationship.id}`,
        at: status.effectiveAt,
        aspect: "performance",
        sentence: `The recorded ${role.title} work${where} ended on ${status.effectiveAt}${status.reason ? `: ${status.reason}` : "."}`,
        recordId: relationship.id,
      });
    }
  }

  for (const enrollment of educationEnrollmentHistoryForPerson(
    world,
    personId,
    cutoff,
  )) {
    const state = educationEnrollmentStateAt(world, enrollment.id, cutoff);
    if (!state) continue;
    const orgName =
      organizationProfileAt(world, enrollment.organizationId, cutoff)?.name ??
      "a recorded school";
    if (state.status === "expected") {
      pushPassage(passages, {
        key: `school-agreement:${enrollment.id}`,
        at: enrollment.recordedAt,
        aspect: "agreement",
        sentence: `${name} has a recorded expected enrollment at ${orgName}, to start ${enrollment.startedAt}.`,
        recordId: enrollment.id,
      });
    } else if (state.status === "active") {
      pushPassage(passages, {
        key: `school-performance:${enrollment.id}`,
        at: state.effectiveAt,
        aspect: "performance",
        sentence: `${name} is enrolled at ${orgName}.`,
        recordId: enrollment.id,
      });
    } else if (state.status === "completed") {
      pushPassage(passages, {
        key: `school-completed:${enrollment.id}`,
        at: state.effectiveAt,
        aspect: "performance",
        sentence: `${name} completed enrollment at ${orgName} on ${state.effectiveAt}.`,
        recordId: enrollment.id,
      });
    }
  }

  for (const commitment of activeLifeCommitmentsAt(world, personId, cutoff)) {
    pushPassage(passages, {
      key: `commitment:${commitment.id}`,
      at: commitment.startsAt,
      aspect: "intention",
      sentence: `${name} has a recorded commitment: ${commitment.label}.`,
      recordId: commitment.id,
    });
  }

  const seenEvents = new Set<EntityId>();
  for (const memory of world.history.memories) {
    if (memory.personId !== personId) continue;
    if (memory.formedAt > world.currentDate) continue;
    const sentence = livedSentence(memory.rememberedSummary);
    if (!sentence) continue;
    seenEvents.add(memory.eventId);
    pushPassage(passages, {
      key: `memory:${memory.id}`,
      at: memory.formedAt,
      aspect: "experience",
      sentence,
      recordId: memory.id,
    });
  }

  for (const event of world.history.events) {
    if (!event.involvedEntityIds.includes(personId)) continue;
    if (event.occurredAt > world.currentDate) continue;
    if (seenEvents.has(event.id)) continue;
    if (
      event.visibility === "private" &&
      !event.involvedEntityIds.includes(personId)
    ) {
      continue;
    }
    if (!event.tags.some((tag) => tag.startsWith("choice."))) continue;
    const sentence = livedSentence(event.summary);
    if (!sentence) continue;
    pushPassage(passages, {
      key: `event:${event.id}`,
      at: event.occurredAt,
      aspect: "experience",
      sentence,
      recordId: event.id,
    });
  }

  const latestBelief = new Map<
    EntityId,
    (typeof world.history.privateBeliefs)[number]
  >();
  for (const belief of privateBeliefHistory(world, personId)) {
    latestBelief.set(belief.propositionId, belief);
  }
  for (const belief of latestBelief.values()) {
    const proposition = world.policyCatalog.propositions[belief.propositionId];
    if (!proposition) continue;
    pushPassage(passages, {
      key: `belief:${belief.id}`,
      at: belief.formedAt,
      aspect: "belief",
      sentence: `${name} has a recorded ${belief.position} view on ${proposition.name}.`,
      recordId: belief.id,
    });
  }

  const latestPosition = new Map<
    EntityId,
    (typeof world.history.publicPositions)[number]
  >();
  for (const position of publicPositionHistory(world, personId)) {
    if (position.audience !== "public") continue;
    latestPosition.set(position.propositionId, position);
  }
  for (const position of latestPosition.values()) {
    pushPassage(passages, {
      key: `position:${position.id}`,
      at: position.statedAt,
      aspect: "belief",
      sentence: `${name} stated publicly: ${position.statement}`,
      recordId: position.id,
    });
  }

  for (const commitment of world.history.campaignCommitments) {
    if (commitment.personId !== personId) continue;
    const proposition =
      world.policyCatalog.propositions[commitment.propositionId];
    if (!proposition) continue;
    pushPassage(passages, {
      key: `campaign-commitment:${commitment.id}`,
      at: commitment.madeAt,
      aspect: "agreement",
      sentence: `${name} recorded a ${commitment.level} to ${commitment.stance} ${proposition.name}.`,
      recordId: commitment.id,
    });
  }

  return passages;
}

function pushPassage(
  passages: BiographyPassage[],
  passage: BiographyPassage,
): void {
  if (!livedSentence(passage.sentence)) return;
  passages.push({ ...passage, sentence: livedSentence(passage.sentence)! });
}

function livedSentence(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 8) return null;
  const stripped = trimmed
    .replace(/^You chose to /i, "You ")
    .replace(/^You decided to /i, "You ");
  if (LEDGER_OR_CHOSE.test(stripped)) return null;
  if (INVENTED_CAUSE_OR_FEELING.test(stripped)) return null;
  return stripped;
}

function byDateThenKey(
  left: BiographyPassage,
  right: BiographyPassage,
): number {
  const byDate = left.at.localeCompare(right.at);
  if (byDate !== 0) return byDate;
  return left.key.localeCompare(right.key);
}
