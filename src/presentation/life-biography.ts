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
import { proseDate, proseMonthYear, proseYear } from "./prose-dates";

/**
 * Chronological account of one played life, told to the player in the second
 * person from what the World actually holds: identity, education and work,
 * enrollment, commitments, what was lived through, what the character
 * privately thinks, and what they said in public.
 *
 * Intention, agreement and performance stay labelled separately on each
 * passage so a reader can tell a plan from a result. Beliefs are attributed.
 * Unsupported emotion, cause, "You chose to" and proof-ledger wording are
 * omitted rather than invented. Nothing here says "recorded": the account is
 * the life, not a description of the save.
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
  /** Tie-break inside one day: the order the World wrote these down. */
  readonly sequence: number;
}

export interface BiographyChapter {
  readonly key: string;
  readonly heading: string;
  readonly year: string;
  readonly passages: readonly BiographyPassage[];
}

export interface LifeBiography {
  readonly personName: string;
  readonly age: number;
  readonly summary: string;
  readonly passages: readonly BiographyPassage[];
  readonly chapters: readonly BiographyChapter[];
  readonly emptyReason: string | null;
}

const LEDGER_OR_CHOSE =
  /\byou chose to\b|\byou decided to\b|\bproof[- ]ledger\b|\bstanding for membership\b|\bnot represented in this save\b|\bsource pack\b/i;
const INVENTED_CAUSE_OR_FEELING =
  /\bbecause you (felt|were|wanted)\b|\bmade you (feel|angry|sad|happy|afraid)\b|\byou were (angry|sad|lonely|afraid|proud|ashamed)\b|\bthis (reminds|inspired|forced) you\b/i;

function noLifeYet(): string {
  return "There is no life to tell yet.";
}

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
      chapters: [],
      emptyReason: noLifeYet(),
    };
  }

  const name = personName(person);
  const age = ageOnDate(person.birthDate, world.currentDate);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const passages = collectPassages(world, personId).sort(byDateThenSequence);

  return {
    personName: name,
    age,
    summary: place
      ? `${name}, ${age}, in ${place.displayName}.`
      : `${name}, ${age}.`,
    passages,
    chapters: groupBiographyByYear(passages, person.birthDate),
    emptyReason: passages.length === 0 ? noLifeYet() : null,
  };
}

/**
 * One chapter per calendar year that has something in it, oldest first. The
 * heading carries the age the year began at for this life, so a year that
 * holds a birthday still reads as the age the reader lived most of it at.
 */
export function groupBiographyByYear(
  passages: readonly BiographyPassage[],
  birthDate: IsoDate,
): readonly BiographyChapter[] {
  const chapters: BiographyChapter[] = [];
  for (const passage of passages) {
    const year = proseYear(passage.at);
    const last = chapters[chapters.length - 1];
    if (last && last.year === year) {
      chapters[chapters.length - 1] = {
        ...last,
        passages: [...last.passages, passage],
      };
      continue;
    }
    const ageAtStart = ageOnDate(birthDate, passage.at);
    chapters.push({
      key: `year:${year}`,
      year,
      heading: ageAtStart > 0 ? `${year}, age ${ageAtStart}` : year,
      passages: [passage],
    });
  }
  return chapters;
}

function collectPassages(world: World, personId: EntityId): BiographyPassage[] {
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const cutoff = currentLifeCutoff(world);
  const passages: BiographyPassage[] = [];

  pushPassage(passages, {
    key: `identity:${person.id}`,
    at: person.birthDate,
    aspect: "identity",
    sentence: identitySentence(person.birthDate, place?.displayName ?? null),
    recordId: person.id,
    sequence: 0,
  });

  for (const fact of factsForPerson(person)) {
    if (fact.kind === "education") {
      pushPassage(passages, {
        key: `fact:${fact.id}`,
        at: fact.occurredAt,
        aspect: "performance",
        sentence: educationFactSentence(fact),
        recordId: fact.id,
        sequence: 0,
      });
    }
    if (fact.kind === "occupation") {
      pushPassage(passages, {
        key: `fact:${fact.id}`,
        at: fact.occurredAt,
        aspect: "performance",
        sentence: occupationFactSentence(fact),
        recordId: fact.id,
        sequence: 0,
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
    const served = isElectedOrAppointedOffice(relationship.kind);
    if (status.status === "expected") {
      pushPassage(passages, {
        key: `work-intention:${relationship.id}`,
        at: relationship.recordedAt,
        aspect: "intention",
        sentence: workSentence(
          "expected",
          served,
          role.title,
          where,
          relationship.startedAt,
        ),
        recordId: relationship.id,
        sequence: relationship.sequence,
      });
    } else if (status.status === "active") {
      pushPassage(passages, {
        key: `work-performance:${relationship.id}`,
        at: relationship.startedAt,
        aspect: "performance",
        sentence: workSentence(
          "active",
          served,
          role.title,
          where,
          relationship.startedAt,
        ),
        recordId: relationship.id,
        sequence: relationship.sequence,
      });
    } else if (status.status === "ended") {
      // The status reason is the engine's explanation of the record, not
      // something the character would write about their own life.
      pushPassage(passages, {
        key: `work-ended:${relationship.id}`,
        at: status.effectiveAt,
        aspect: "performance",
        sentence: workSentence(
          "ended",
          served,
          role.title,
          where,
          status.effectiveAt,
        ),
        recordId: relationship.id,
        sequence: relationship.sequence,
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
      "school";
    if (state.status === "expected") {
      pushPassage(passages, {
        key: `school-agreement:${enrollment.id}`,
        at: enrollment.recordedAt,
        aspect: "agreement",
        sentence: enrollmentSentence("expected", orgName, enrollment.startedAt),
        recordId: enrollment.id,
        sequence: enrollment.sequence,
      });
    } else if (state.status === "active") {
      pushPassage(passages, {
        key: `school-performance:${enrollment.id}`,
        at: state.effectiveAt,
        aspect: "performance",
        sentence: enrollmentSentence("active", orgName, state.effectiveAt),
        recordId: enrollment.id,
        sequence: enrollment.sequence,
      });
    } else if (state.status === "completed") {
      pushPassage(passages, {
        key: `school-completed:${enrollment.id}`,
        at: state.effectiveAt,
        aspect: "performance",
        sentence: enrollmentSentence("completed", orgName, state.effectiveAt),
        recordId: enrollment.id,
        sequence: enrollment.sequence,
      });
    }
  }

  for (const commitment of activeLifeCommitmentsAt(world, personId, cutoff)) {
    pushPassage(passages, {
      key: `commitment:${commitment.id}`,
      at: commitment.startsAt,
      aspect: "intention",
      sentence: commitmentSentence(commitment.label),
      recordId: commitment.id,
      sequence: commitment.sequence,
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
      sequence: memory.sequence,
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
      sequence: event.sequence,
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
      sentence: beliefSentence(belief.position, proposition.name),
      recordId: belief.id,
      sequence: belief.sequence,
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
      sentence: publicPositionSentence(position.statement),
      recordId: position.id,
      sequence: position.sequence,
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
      sentence: campaignCommitmentSentence(
        commitment.level,
        commitment.stance,
        proposition.name,
        commitment.statement,
      ),
      recordId: commitment.id,
      sequence: commitment.sequence,
    });
  }

  return passages;
}

function identitySentence(
  birthDate: IsoDate,
  placeName: string | null,
): string {
  return placeName
    ? `You were born on ${proseDate(birthDate)}, and live in ${placeName}.`
    : `You were born on ${proseDate(birthDate)}.`;
}

function occupationFactSentence(fact: {
  readonly title: string;
  readonly employer: string;
  readonly status: "ended" | "ongoing";
}): string {
  return fact.status === "ongoing"
    ? `You work as ${fact.title} at ${fact.employer}.`
    : `You worked as ${fact.title} at ${fact.employer}.`;
}

function workSentence(
  status: "expected" | "active" | "ended",
  served: boolean,
  title: string,
  where: string,
  at: IsoDate,
): string {
  switch (status) {
    case "expected":
      return `You are due to start as ${title}${where} on ${proseDate(at)}.`;
    case "active":
      return served
        ? `You have served as ${title}${where} since ${proseMonthYear(at)}.`
        : `You have worked as ${title}${where} since ${proseMonthYear(at)}.`;
    case "ended":
    default:
      return served
        ? `Your time as ${title}${where} ended in ${proseMonthYear(at)}.`
        : `Your work as ${title}${where} ended in ${proseMonthYear(at)}.`;
  }
}

function enrollmentSentence(
  status: "expected" | "active" | "completed",
  school: string,
  at: IsoDate,
): string {
  switch (status) {
    case "expected":
      return `You are due to start at ${school} on ${proseDate(at)}.`;
    case "active":
      return `You are enrolled at ${school}.`;
    case "completed":
    default:
      return `You finished at ${school} in ${proseMonthYear(at)}.`;
  }
}

function commitmentSentence(label: string): string {
  return `You have a standing commitment: ${label}.`;
}

function publicPositionSentence(statement: string): string {
  return `In public you said: ${quoted(statement)}`;
}

function educationFactSentence(fact: {
  readonly institution: string;
  readonly field: string | null;
  readonly credential: string | null;
  readonly status: "attended" | "completed" | "ongoing" | "withdrew";
}): string {
  const { institution, field, credential } = fact;
  switch (fact.status) {
    case "ongoing":
      return field
        ? `You are studying ${field} at ${institution}.`
        : `You attend ${institution}.`;
    case "completed":
      if (credential) {
        return field
          ? `You earned ${credential} in ${field} at ${institution}.`
          : `You earned ${credential} at ${institution}.`;
      }
      return field
        ? `You finished ${field} at ${institution}.`
        : `You finished at ${institution}.`;
    case "withdrew":
      return `You left ${institution} before finishing.`;
    case "attended":
    default:
      return field
        ? `You attended ${institution}, studying ${field}.`
        : `You attended ${institution}.`;
  }
}

function beliefSentence(
  position: "support" | "oppose" | "uncertain" | "conflicted",
  propositionName: string,
): string {
  switch (position) {
    case "support":
      return `Privately, you support ${propositionName}.`;
    case "oppose":
      return `Privately, you oppose ${propositionName}.`;
    case "conflicted":
      return `Privately, you are torn over ${propositionName}.`;
    case "uncertain":
    default:
      return `Privately, you are unsure about ${propositionName}.`;
  }
}

function campaignCommitmentSentence(
  level: "aspiration" | "conditional" | "pledge",
  stance: "support" | "oppose" | "seek-modification" | "defer",
  propositionName: string,
  statement: string,
): string {
  const verb =
    stance === "support"
      ? "support"
      : stance === "oppose"
        ? "oppose"
        : stance === "seek-modification"
          ? "seek changes to"
          : "hold off on";
  const words = quoted(statement);
  switch (level) {
    case "pledge":
      return `You pledged to ${verb} ${propositionName}: ${words}`;
    case "conditional":
      return `You said you would ${verb} ${propositionName} on conditions: ${words}`;
    case "aspiration":
    default:
      return `You said you hoped to ${verb} ${propositionName}: ${words}`;
  }
}

function quoted(statement: string): string {
  const trimmed = statement.trim().replace(/^["“]|["”]$/g, "");
  const closed = /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `“${closed}”`;
}

function isElectedOrAppointedOffice(kind: string): boolean {
  return (
    kind === "employment:executive-office" ||
    kind === "employment:legislative-member" ||
    kind === "employment:judicial-office-practice"
  );
}

function pushPassage(
  passages: BiographyPassage[],
  passage: BiographyPassage,
): void {
  const sentence = livedSentence(passage.sentence);
  if (!sentence) return;
  passages.push({ ...passage, sentence });
}

function livedSentence(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 8) return null;
  const stripped = trimmed
    .replace(/^You chose to /i, "You ")
    .replace(/^You decided to /i, "You ")
    .replace(/^I remember /, "You remember ");
  if (LEDGER_OR_CHOSE.test(stripped)) return null;
  if (INVENTED_CAUSE_OR_FEELING.test(stripped)) return null;
  return stripped;
}

function byDateThenSequence(
  left: BiographyPassage,
  right: BiographyPassage,
): number {
  const byDate = left.at.localeCompare(right.at);
  if (byDate !== 0) return byDate;
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  return left.key.localeCompare(right.key);
}
