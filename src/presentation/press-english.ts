import {
  projectPressInterview,
  projectEligiblePressReporters,
  type World,
  type EntityId,
} from "../simulation";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";
import { speakerTraits } from "./speaker-traits";

export const PRESS_BANKS: Readonly<Record<string, ComposedLineBank>> = {
  "reporter-known-topic": {
    key: "press.reporter-known-topic",
    version: "1",
    surface: "dialogue",
    act: "ask",
    parts: {
      opener: {
        required: true,
        variants: [
          { key: "development", kind: "template", text: "{{subject}}" },
        ],
      },
      core: {
        variants: [
          {
            key: "question",
            kind: "template",
            text: "What is established, and what is still open?",
          },
        ],
      },
    },
  },
  "reporter-unknown-topic": {
    key: "press.reporter-unknown-topic",
    version: "1",
    surface: "dialogue",
    act: "ask",
    parts: {
      core: {
        variants: [{ key: "ask", kind: "template", text: "What happened?" }],
      },
    },
  },
  "answer-directly": {
    key: "press.answer-directly",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: { variants: [{ key: "fact", kind: "template", text: "{{fact}}" }] },
      closer: {
        variants: [
          {
            key: "ask-followup",
            kind: "template",
            text: "Does that answer your question?",
            requiresTraits: [{ holder: "speaker", traitKey: "expression:ask" }],
          },
        ],
      },
    },
  },
  "answer-unknown": {
    key: "press.answer-unknown",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: {
        variants: [
          {
            key: "not-yet",
            kind: "template",
            text: "I can't answer that yet.",
          },
        ],
      },
    },
  },
  "add-context": {
    key: "press.add-context",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: { variants: [{ key: "fact", kind: "template", text: "{{fact}}" }] },
      closer: {
        variants: [
          {
            key: "limit",
            kind: "template",
            text: "That doesn't tell us what happens next.",
          },
        ],
      },
    },
  },
  "context-unknown": {
    key: "press.context-unknown",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: {
        variants: [
          {
            key: "no-more",
            kind: "template",
            text: "I don't have anything else to add.",
          },
        ],
      },
    },
  },
  "challenge-premise": {
    key: "press.challenge-premise",
    version: "1",
    surface: "dialogue",
    act: "answer",
    parts: {
      core: {
        variants: [
          {
            key: "point-to-fact",
            kind: "template",
            text: "The fact I can point to is this: {{fact}}",
          },
        ],
      },
    },
  },
  "challenge-unknown": {
    key: "press.challenge-unknown",
    version: "1",
    surface: "dialogue",
    act: "ask",
    parts: {
      core: {
        variants: [
          { key: "ask-basis", kind: "template", text: "What makes you ask?" },
        ],
      },
    },
  },
};

/** Canonical press projection includes the records of actual preparation and its fallible facts. */
export function pressAnswerPacket(
  world: World,
  activityId: EntityId,
): GroundedEnglishPacket | null {
  const view = projectPressInterview(world, activityId);
  if (!view) return null;
  const facts: Record<string, GroundedEnglishFact> = {
    "primary-question": {
      text: view.primaryQuestion,
      sourceRecordIds: [view.arrangementEventId],
    },
  };
  if (view.preparationEventId) {
    view.likelyFollowUps.forEach((text, index) => {
      facts[`followup-${index}`] = {
        text,
        sourceRecordIds: [view.preparationEventId!],
      };
    });
    view.knownFacts.forEach((text, index) => {
      const knowledge = world.history.knowledge.find(
        (record) => record.id === view.preparationKnowledgeIds[index],
      );
      if (
        !knowledge ||
        knowledge.personId !== view.adviserPersonId ||
        knowledge.learnedAt > world.currentDate ||
        knowledge.believedSummary.trim() !== text.trim()
      )
        return;
      facts[`fact-${index}`] = {
        text,
        sourceRecordIds: [
          view.preparationEventId!,
          knowledge.id,
          knowledge.eventId,
        ],
      };
    });
  }
  return {
    surface: "dialogue",
    worldSeed: world.seed,
    bankVersion: "1",
    stage: "press-answer",
    momentKey: `press:${activityId}:${world.currentDate}:${world.history.nextSequence}`,
    sourceRecordIds: [
      view.arrangementEventId,
      ...(view.preparationEventId ? [view.preparationEventId] : []),
    ],
    speaker: {
      personId: view.subjectPersonId,
      traits: speakerTraits(world, view.subjectPersonId),
    },
    viewer: {
      personId: view.reporterPersonId,
      traits: speakerTraits(world, view.reporterPersonId),
    },
    facts,
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: view.subjectPersonId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
}

export function reporterQuestionPacket(
  world: World,
  sourcePersonId: EntityId,
  reporterPersonId: EntityId,
  subjectEventId: EntityId,
): GroundedEnglishPacket | null {
  const reporter = projectEligiblePressReporters(world, {
    sourcePersonId,
    questionBasisEventIds: [subjectEventId],
  }).find((person) => person.personId === reporterPersonId);
  if (!reporter) return null;
  const event = world.history.events.find(
    (entry) => entry.id === subjectEventId,
  )!;
  const belief = world.history.knowledge
    .filter(
      (record) =>
        record.personId === reporterPersonId &&
        record.eventId === subjectEventId &&
        record.learnedAt <= world.currentDate,
    )
    .at(-1);
  const publication = (world.history.publications ?? []).find(
    (record) =>
      record.sourceEventId === subjectEventId &&
      record.publishedAt <= world.currentDate &&
      record.correctsPublicationId === null,
  );
  // Beliefs and published accounts remain fallible; neither unlocks canonical prose.
  // A published account is asked about by its headline: its body carries the
  // byline and who declined to comment, which a reporter does not say aloud.
  const subject = belief
    ? { text: belief.believedSummary, sourceRecordIds: [belief.id, event.id] }
    : publication
      ? {
          text: publication.headline,
          sourceRecordIds: [publication.id, event.id],
        }
      : null;
  const facts: Record<string, GroundedEnglishFact> = subject ? { subject } : {};

  return {
    surface: "dialogue",
    worldSeed: world.seed,
    bankVersion: "1",
    stage: "reporter-question",
    momentKey: `press-question:${reporterPersonId}:${subjectEventId}:${world.history.nextSequence}`,
    sourceRecordIds: [event.id, reporter.workRoleId],
    facts,
    speaker: {
      personId: reporterPersonId,
      traits: speakerTraits(world, reporterPersonId),
    },
    viewer: {
      personId: sourcePersonId,
      traits: speakerTraits(world, sourcePersonId),
    },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: reporterPersonId,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
}

/** Aliases reuse already supplied knowledge; they never grant knowledge of an unreviewed fact. */
export function composePressLine(
  packet: GroundedEnglishPacket,
  key: string,
  slots: Readonly<Record<string, string>> = {},
) {
  const facts: Record<string, GroundedEnglishFact> = {};
  for (const [slot, text] of Object.entries(slots)) {
    const found = Object.entries(packet.facts).find(
      ([factKey, fact]) =>
        fact?.text.trim() === text.trim() &&
        fact.sourceRecordIds.length > 0 &&
        packet.knowledge.some(
          (known) =>
            known.personId === packet.speaker?.personId &&
            known.factKey === factKey,
        ),
    );
    if (!found?.[1]) return null;
    facts[slot] = found[1];
  }
  const bank = PRESS_BANKS[key];
  if (!bank) throw new Error(`Unknown press bank ${key}`);
  const result = composeGroundedLine(
    {
      ...packet,
      facts,
      stage: key,
      knowledge: Object.entries(facts).map(([factKey, fact]) => ({
        personId: packet.speaker!.personId,
        factKey,
        sourceRecordIds: fact.sourceRecordIds,
      })),
    },
    bank,
  );
  return result.kind === "rendered" ? result : null;
}
