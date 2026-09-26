import {
  describePersonContext,
  type EntityId,
  type World,
} from "../simulation";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";
import type { RecapEntry } from "./world-recap";

/** A spoken greeting for a person who is present in the current scene. */
const GREETING: AuthoredEnglishBank = {
  key: "ordinary-talk:greeting",
  version: "1",
  surface: "dialogue",
  variants: [
    { key: "hello", kind: "template", text: "Hi, {{address}}." },
    { key: "hey", kind: "template", text: "Hey, {{address}}." },
  ],
};

const PUBLIC_DEATH_QUESTION: AuthoredEnglishBank = {
  key: "ordinary-talk:public-death-question",
  version: "1",
  surface: "dialogue",
  variants: [
    {
      key: "ask-about-person",
      kind: "template",
      text: "Did you hear about {{subject}}?",
    },
  ],
};

const PUBLIC_DEATH_STATEMENT: AuthoredEnglishBank = {
  key: "ordinary-talk:public-death-statement",
  version: "1",
  surface: "dialogue",
  variants: [
    {
      key: "tell-reported-death",
      kind: "template",
      text: "{{subject}} died.",
    },
  ],
};

const UNINFORMED_PUBLIC_DEATH_REPLY: AuthoredEnglishBank = {
  key: "ordinary-talk:uninformed-public-death-reply",
  version: "1",
  surface: "dialogue",
  variants: [
    {
      key: "ask-what-happened",
      kind: "template",
      text: "No. What happened?",
      weight: 3,
    },
    {
      key: "ask-if-okay",
      kind: "template",
      text: "No. Is everything okay?",
      weight: 1,
    },
  ],
};

/**
 * The relationship and presence records choose an address, while the shared
 * English renderer chooses stable wording. A quiet room is enough for a
 * greeting, but never supplies a topic, motive or claim on its own.
 */
export function ordinaryGreetingWords(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  sceneId: string,
): string | null {
  const person = world.people[personId];
  const player = world.people[playerPersonId];
  if (!person || !player) return null;
  const relation = describePersonContext(
    world,
    playerPersonId,
    personId,
  )?.relationship;
  const address =
    relation === "your mom"
      ? "Mom"
      : relation === "your dad"
        ? "Dad"
        : person.givenName;
  const relationshipRecordIds = [
    ...world.history.kinshipRelationships
      .filter(
        (row) =>
          row.personIds.includes(playerPersonId) &&
          row.personIds.includes(personId),
      )
      .map((row) => row.id),
    ...world.history.childAuthorities
      .filter(
        (row) =>
          row.childPersonId === playerPersonId &&
          row.holder.kind === "person" &&
          row.holder.personId === personId,
      )
      .map((row) => row.id),
  ];
  if (
    (address === "Mom" || address === "Dad") &&
    relationshipRecordIds.length === 0
  )
    return null;
  const sourceRecordIds = [
    person.id,
    ...relationshipRecordIds,
    ...world.history.events
      .filter((event) => event.id === sceneId)
      .map((event) => event.id),
  ];
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `${sceneId}:${playerPersonId}:${personId}:greet:${world.history.nextSequence}`,
    worldSeed: world.seed,
    bankVersion: GREETING.version,
    stage: "greeting",
    sourceRecordIds,
    facts: { address: { text: address, sourceRecordIds } },
    speaker: { personId: playerPersonId, traits: {} },
    knowledge: [
      { personId: playerPersonId, factKey: "address", sourceRecordIds },
    ],
  };
  const rendered = renderGroundedEnglish(packet, GREETING);
  return rendered.kind === "rendered" ? rendered.text : null;
}

/**
 * A known death can be raised without asserting its cause or how the listener
 * feels. The saved report or knowledge record must actually name the person;
 * a public governor title is used only when a saved tenure supports it.
 */
export function publicDeathQuestionWords(
  world: World,
  playerPersonId: EntityId,
  matter: RecapEntry,
): string | null {
  return publicDeathWords(world, playerPersonId, matter, PUBLIC_DEATH_QUESTION);
}

/** Reported death is spoken as the player's claim only after the listener asks. */
export function publicDeathStatementWords(
  world: World,
  playerPersonId: EntityId,
  matter: RecapEntry,
): string | null {
  return publicDeathWords(
    world,
    playerPersonId,
    matter,
    PUBLIC_DEATH_STATEMENT,
  );
}

/** The listener has no knowledge record for this report at this moment. */
export function uninformedPublicDeathReplyWords(
  world: World,
  listenerPersonId: EntityId,
  matter: RecapEntry,
): string | null {
  const person = world.people[listenerPersonId];
  const event = world.history.events.find((row) => row.id === matter.eventId);
  if (!person || !event) return null;
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `${event.stableKey}:${listenerPersonId}:unaware-reply`,
    worldSeed: world.seed,
    bankVersion: UNINFORMED_PUBLIC_DEATH_REPLY.version,
    stage: "unaware-reported-death",
    sourceRecordIds: [event.id, person.id],
    facts: {},
    speaker: { personId: listenerPersonId, traits: {} },
    knowledge: [],
  };
  const rendered = renderGroundedEnglish(packet, UNINFORMED_PUBLIC_DEATH_REPLY);
  return rendered.kind === "rendered" ? rendered.text : null;
}

function publicDeathWords(
  world: World,
  playerPersonId: EntityId,
  matter: RecapEntry,
  bank: AuthoredEnglishBank,
): string | null {
  const event = world.history.events.find((row) => row.id === matter.eventId);
  if (
    event?.type !== "person.died" &&
    event?.type !== "crisis.officeholder-died"
  )
    return null;
  const deceasedId = event.participants.find(
    (row) =>
      row.role === "impact:deceased" || row.role === "focus:officeholder",
  )?.personId;
  const person = deceasedId ? world.people[deceasedId] : null;
  if (!person?.familyName.trim()) return null;
  const knowledge = world.history.knowledge
    .filter(
      (row) =>
        row.personId === playerPersonId &&
        row.eventId === event.id &&
        row.learnedAt <= world.currentDate,
    )
    .at(-1);
  if (!knowledge) return null;
  const account = `${matter.headline} ${knowledge.believedSummary}`;
  if (!account.toLowerCase().includes(person.familyName.toLowerCase()))
    return null;
  const tenure = world.history.events
    .filter(
      (row) =>
        row.type === "world.office-tenure" &&
        row.visibility === "public" &&
        row.occurredAt <= event.occurredAt &&
        row.participants.some(
          (participant) =>
            participant.role === "focus:subject" &&
            participant.personId === person.id &&
            participant.detail?.startsWith("Governor of "),
        ),
    )
    .at(-1);
  const saysGovernor = /\bgovernor\b/i.test(account);
  const subject =
    tenure && saysGovernor
      ? `Governor ${person.familyName}`
      : `${person.givenName} ${person.familyName}`;
  const sourceRecordIds = [
    event.id,
    knowledge.id,
    person.id,
    ...(tenure && saysGovernor ? [tenure.id] : []),
  ];
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `${event.stableKey}:${playerPersonId}:${bank.key}`,
    worldSeed: world.seed,
    bankVersion: bank.version,
    stage: "known-public-death",
    sourceRecordIds,
    facts: { subject: { text: subject, sourceRecordIds } },
    speaker: { personId: playerPersonId, traits: {} },
    knowledge: [
      { personId: playerPersonId, factKey: "subject", sourceRecordIds },
    ],
  };
  const rendered = renderGroundedEnglish(packet, bank);
  return rendered.kind === "rendered" ? rendered.text : null;
}
