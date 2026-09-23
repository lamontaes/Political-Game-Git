import {
  characterHistoryContextPersonId,
  generateQuickCharacterHistory,
  type CharacterHistoryPlan,
  type CharacterHistoryTransition,
  type ChildhoodGenerationVersion,
} from "./character-history";
import { dateAtAge } from "./dates";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  type GivenNameGenerationVersion,
} from "./people";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";

export type EarlierLifeGenerationVersion = "context-v2";

/**
 * A bounded, canonical background, without assuming an employer, school,
 * credential or service organization from the character's current hometown.
 * The legacy constructor remains byte-for-byte available to old replay inputs.
 * This is an initialization plan; no reader or questionnaire answer invokes it.
 */
export function generateContextualCharacterHistory(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly jurisdictionId: EntityId;
    // Forwarded untouched to the legacy constructor below, which is where the
    // parent, peer and teacher names are actually drawn. The contextual pass
    // re-draws them from each person's own recorded gender regardless.
    readonly givenNameGenerationVersion?: GivenNameGenerationVersion;
    // Forwarded the same way: the parent, peer and teacher keep the birth
    // dates the legacy constructor gives them.
    readonly childhoodGenerationVersion?: ChildhoodGenerationVersion;
  },
): CharacterHistoryPlan {
  // Existing canonical background wins, including older school/work records.
  // Reopening or a retry must never rename people or replay household writes.
  if (
    world.history.households.some(
      (household) => household.stableKey === `${input.stableKey}:household`,
    )
  ) {
    return {
      stableKey: input.stableKey,
      mode: "quick-generated",
      personId: input.personId,
      transitions: [],
    };
  }
  const legacy = generateQuickCharacterHistory(world, input);
  const key = (suffix: string) => `${input.stableKey}:${suffix}`;
  // Reuse established family IDs, birth dates and canonical writer semantics.
  // An explicit allowlist prevents an unrelated legacy demo record leaking in.
  const retained = new Set([
    key("parent"),
    key("peer"),
    key("household"),
    key("household:location:birth"),
    key("household:child"),
    key("household:parent"),
    key("kinship"),
    key("care"),
    key("authority"),
    key("authority:ended"),
  ]);
  const rng = new SeededRng(world.seed).fork(
    `character-history-context-v2:${input.personId}:${input.stableKey}`,
  );
  const player = world.people[input.personId]!;
  const spokenFor = [player.givenName];
  const transitions: CharacterHistoryTransition[] = legacy.transitions
    .filter((entry) => retained.has(entry.input.stableKey))
    .map((entry) => {
      if (entry.kind !== "context-person") return entry;
      const name = drawCanonicalNameForGender(
        rng.fork(entry.input.stableKey),
        entry.input.identity?.gender ?? "unstated",
        undefined,
        DISTINCT_GIVEN_NAME_GENERATION_VERSION,
        spokenFor,
      );
      spokenFor.push(name.givenName);
      return {
        ...entry,
        input: {
          ...entry.input,
          ...name,
          ...(entry.input.stableKey === key("parent")
            ? { familyName: player.familyName }
            : {}),
        },
      };
    });
  const peerId = characterHistoryContextPersonId(world, key("peer"));
  const occurredAt = dateAtAge(player.birthDate, 10);
  const peer = transitions.find(
    (entry) =>
      entry.kind === "context-person" && entry.input.stableKey === key("peer"),
  );
  const peerName =
    peer?.kind === "context-person" ? peer.input.givenName : "a neighbor";
  // Authored alternatives, not demographic probabilities or personality tests.
  // The chosen event is recorded first; prose and later contact read that fact.
  const shared = rng.fork("shared-neighborhood-event").pick([
    {
      key: "ball",
      summary: `You and ${peerName} got to know each other while playing ball near home.`,
    },
    {
      key: "books",
      summary: `You and ${peerName} got to know each other by lending each other books.`,
    },
    {
      key: "walks",
      summary: `You and ${peerName} got to know each other on walks around the neighborhood.`,
    },
  ]);
  const eventKey = key(`event:neighbor:${shared.key}`);
  transitions.push(
    {
      kind: "event",
      input: {
        stableKey: eventKey,
        type: "life.neighborhood-acquaintance",
        occurredAt,
        recordedAt: occurredAt,
        jurisdictionId: input.jurisdictionId,
        involvedEntityIds: [input.personId, peerId],
        participants: [input.personId, peerId].map((personId) => ({
          personId,
          role: "presence:participant",
          detail: null,
        })),
        personFactConstraints: [],
        visibility: "limited",
        tags: ["life.neighborhood-acquaintance"],
        summary: shared.summary,
        context: {
          location: {
            jurisdictionId: input.jurisdictionId,
            label: "Childhood neighborhood",
            setting: null,
          },
          socialContext: "Neighbors getting to know each other",
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      },
    },
    {
      kind: "knowledge",
      input: {
        stableKey: `${eventKey}:knowledge`,
        personId: input.personId,
        eventStableKey: eventKey,
        learnedAt: occurredAt,
        believedSummary: shared.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      },
    },
    {
      kind: "interaction",
      input: {
        stableKey: `${eventKey}:interaction`,
        personIds: [input.personId, peerId],
        eventStableKey: eventKey,
        occurredAt,
        kind: "experience:shared-neighborhood",
        change: "formed",
        significance: "meaningful",
        summary: shared.summary,
        tags: ["life.neighborhood-acquaintance"],
      },
    },
  );
  return { ...legacy, transitions };
}
