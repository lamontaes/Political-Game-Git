import { ageOnDate } from "../simulation";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import {
  officialViewReflectionEventKey,
  strongestOfficialStanding,
} from "../simulation/official-view-reads";
import {
  LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
  LIVED_OUTCOME_SOURCE_TAG,
  officialsBehind,
} from "../simulation/living-world/official-views";
import {
  livedOutcomesOf,
  type LivedOutcome,
} from "../simulation/living-world/lived-outcomes";
import { TOWN_JOB_END_REASONS } from "../simulation/living-world/town-labor-market";
import { childhoodRecordEntries } from "../simulation/childhood-record";
import type {
  LawExposureRecord,
  OfficialViewRecord,
  PrivateBeliefRecord,
} from "../simulation/types";
import type { EntityId, HistoricalEvent, World } from "../simulation";
import {
  composeGroundedLine,
  linePartsOf,
  type ComposedLineBank,
  type ComposedPart,
  type RelationshipCondition,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

/**
 * Two small-talk replies built from reviewed parts: a person answering a
 * second greeting, and a person saying they had not heard about a matter the
 * player mentioned. Each replaces one fixed line ("Hi again." and "I hadn't
 * heard about that.") that the round-1 dialogue report found in 73 and 68 of
 * 567 turns. Drafted with the civic-prose writer from the packets below;
 * nothing here decides what anybody means, only how it is said.
 */

export interface SmallTalkLine {
  readonly text: string;
  readonly parts: readonly ComposedPart[];
}

const WARM: RelationshipCondition = {
  dimension: "warmth",
  bands: ["marked", "strong"],
  adverse: false,
};
const TENSE: RelationshipCondition = {
  dimension: "tension",
  bands: ["marked", "strong"],
};

/*
 * Cores start lower case (the engine capitalizes the first letter of the
 * line), and closers follow a finished sentence, so they start with a
 * capital.
 */
const GREET_AGAIN: ComposedLineBank = {
  key: "small-talk.greet-again",
  version: "1",
  surface: "dialogue",
  act: "greet",
  parts: {
    // Each core is a whole greeting. A separate opener stacked greetings
    // ("Hey, hello.", "Oh, hey, hi.") in the round-1 report, so an
    // interjection is written into the greeting it belongs to.
    core: {
      variants: [
        { key: "hi-plain", kind: "template", text: "hi." },
        { key: "hello-again", kind: "template", text: "hello again." },
        { key: "hi-name", kind: "template", text: "hi, {{player-name}}." },
        { key: "oh-hi", kind: "template", text: "oh, hi." },
        {
          key: "oh-hi-name",
          kind: "template",
          text: "oh, hi, {{player-name}}.",
        },
        { key: "hey-name", kind: "template", text: "hey, {{player-name}}." },
        { key: "back-again", kind: "template", text: "back again?" },
        { key: "hey-back-again", kind: "template", text: "hey, back again?" },
        {
          key: "we-just-talked",
          kind: "template",
          text: "we just talked {{earlier-today}}.",
        },
        {
          key: "good-to-see-you",
          kind: "template",
          text: "good to see you.",
          requiresRelationship: [WARM],
        },
        {
          key: "good-to-see-you-name",
          kind: "template",
          text: "good to see you, {{player-name}}.",
          requiresRelationship: [WARM],
        },
        {
          key: "you-again",
          kind: "template",
          text: "you again?",
          requiresRelationship: [TENSE],
        },
        {
          key: "hi-youre-back",
          kind: "template",
          text: "hi! You're back.",
          stages: ["child"],
        },
        { key: "hello-flat", kind: "template", text: "hello." },
      ],
    },
    closer: {
      variants: [
        {
          key: "did-you-need",
          kind: "template",
          text: "Did you need something?",
        },
        { key: "whats-up", kind: "template", text: "What's up?" },
        {
          key: "talk-some-more-adult",
          kind: "template",
          text: "Did you want to talk some more?",
          stages: ["adult"],
        },
        { key: "go-ahead", kind: "template", text: "Go ahead." },
        { key: "whats-going-on", kind: "template", text: "What's going on?" },
        {
          key: "talk-some-more",
          kind: "template",
          text: "Wanna talk some more?",
          stages: ["child"],
        },
      ],
    },
  },
};

const MATTER_UNINFORMED: ComposedLineBank = {
  key: "small-talk.matter-uninformed",
  version: "1",
  surface: "dialogue",
  act: "answer",
  parts: {
    core: {
      variants: [
        {
          key: "hadnt-heard",
          kind: "template",
          text: "I hadn't heard about that.",
        },
        {
          key: "news-to-me",
          kind: "template",
          text: "that's news to me.",
          stages: ["adult"],
        },
        {
          key: "first-hearing",
          kind: "template",
          text: "this is the first I'm hearing of it.",
          stages: ["adult"],
        },
        {
          key: "didnt-know",
          kind: "template",
          text: "no, I didn't know about that.",
        },
        {
          key: "not-a-thing",
          kind: "template",
          text: "I hadn't heard a thing about it.",
        },
        {
          key: "havent-seen",
          kind: "template",
          text: "I haven't seen anything about it.",
          stages: ["adult"],
        },
        {
          key: "child-didnt-know",
          kind: "template",
          text: "I didn't know that.",
          stages: ["child"],
        },
        { key: "huh-hadnt", kind: "template", text: "huh. I hadn't heard." },
      ],
    },
    closer: {
      variants: [
        { key: "what-happened", kind: "template", text: "What happened?" },
        { key: "tell-me-more", kind: "template", text: "Tell me more." },

        {
          key: "fill-me-in",
          kind: "template",
          text: "Fill me in.",
          requiresRelationship: [WARM],
        },
        { key: "when-was-this", kind: "template", text: "When was this?" },
        { key: "go-on", kind: "template", text: "Go on." },
      ],
    },
  },
};

/** Parts this speaker used with the player in their recent saved turns. */
const RECENT_TURNS = 6;

function recentPartKeys(history: readonly HistoricalEvent[]): string[] {
  return history
    .slice(-RECENT_TURNS)
    .flatMap((event) => linePartsOf(event.tags) ?? []);
}

function stageOf(world: World, personId: EntityId): "child" | "adult" {
  return ageOnDate(world.people[personId]!.birthDate, world.currentDate) < 13
    ? "child"
    : "adult";
}

function compose(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  packet: GroundedEnglishPacket,
  bank: ComposedLineBank,
): SmallTalkLine | null {
  const line = composeGroundedLine(packet, bank, {
    relationship: readRelationshipStanding(world, speakerId, playerPersonId),
    recentPartKeys: recentPartKeys(history),
  });
  return line.kind === "rendered"
    ? { text: line.text, parts: line.parts }
    : null;
}

/**
 * A person answering the player's greeting when the two have talked before.
 * `history` is their saved conversation, oldest first; the reply exists only
 * when there is an earlier turn to have learned the player's name from.
 */
export function greetAgainLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
): SmallTalkLine | null {
  const previous = history.at(-1);
  if (!previous) return null;
  const player = world.people[playerPersonId]!;
  const sameDay = previous.occurredAt === world.currentDate;
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `greet-again:${speakerId}:${playerPersonId}:${previous.id}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: GREET_AGAIN.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: [previous.id],
    facts: {
      "player-name": {
        text: player.givenName,
        sourceRecordIds: [playerPersonId],
      },
      ...(sameDay
        ? {
            "earlier-today": {
              text: "earlier today",
              sourceRecordIds: [previous.id],
            },
          }
        : {}),
    },
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    // The speaker learned the name, and that they talked, in that turn.
    knowledge: [
      {
        personId: speakerId,
        factKey: "player-name",
        sourceRecordIds: [previous.id],
      },
      ...(sameDay
        ? [
            {
              personId: speakerId,
              factKey: "earlier-today",
              sourceRecordIds: [previous.id],
            },
          ]
        : []),
    ],
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    GREET_AGAIN,
  );
}

/**
 * A person saying they had not heard about the matter the player raised.
 * The caller has already read from the speaker's records that they had not.
 */
export function matterUninformedLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  matterEventId: EntityId,
): SmallTalkLine | null {
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `matter-uninformed:${speakerId}:${playerPersonId}:${matterEventId}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: MATTER_UNINFORMED.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: [matterEventId],
    facts: {},
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    knowledge: [],
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    MATTER_UNINFORMED,
  );
}

/*
 * A person saying what they think of an official over a law that reached them
 * (spec 5, "conversation lines"). Every clause copies a recorded fact: who
 * acted, how (voted for, voted against, signed), the law's short title,
 * whether the speaker blames or credits them, and how it reached the speaker
 * (their own money, a family member's, or what a friend told them). Nothing
 * shows the size of the view as a number. Drafted for Lamontae's editorial
 * review; not yet reviewed.
 */
const OFFICIAL_VIEW: ComposedLineBank = {
  key: "small-talk.official-view",
  version: "1",
  surface: "dialogue",
  act: "answer",
  parts: {
    core: {
      variants: [
        {
          key: "blame-voted-for",
          kind: "template",
          text: "{{official-name}} voted for {{law-name}}, and I'm not happy about it.",
          requiresFacts: ["blame", "voted-for"],
        },
        {
          key: "blame-voted-for-think",
          kind: "template",
          text: "{{official-name}} voted for {{law-name}}. I don't think much of that.",
          requiresFacts: ["blame", "voted-for"],
        },
        {
          key: "blame-signed",
          kind: "template",
          text: "{{official-name}} signed {{law-name}}, and I hold it against them.",
          requiresFacts: ["blame", "signed"],
        },
        {
          key: "blame-voted-against",
          kind: "template",
          text: "{{official-name}} voted against {{law-name}}, and I hold that against them.",
          requiresFacts: ["blame", "voted-against"],
        },
        {
          key: "credit-voted-for",
          kind: "template",
          text: "{{official-name}} voted for {{law-name}}, and I'm glad they did.",
          requiresFacts: ["credit", "voted-for"],
        },
        {
          key: "credit-signed",
          kind: "template",
          text: "{{official-name}} signed {{law-name}}. I give them credit for that.",
          requiresFacts: ["credit", "signed"],
        },
        {
          key: "credit-voted-against",
          kind: "template",
          text: "{{official-name}} voted against {{law-name}}. I appreciate that.",
          requiresFacts: ["credit", "voted-against"],
        },
      ],
    },
    reason: {
      required: true,
      variants: [
        {
          key: "own-cost",
          kind: "template",
          text: "It cost me money.",
          requiresFacts: ["own", "cost"],
        },
        {
          key: "own-cost-felt",
          kind: "template",
          text: "I felt it in my own pocket.",
          requiresFacts: ["own", "cost"],
        },
        {
          key: "own-gain",
          kind: "template",
          text: "It put money in my pocket.",
          requiresFacts: ["own", "gain"],
        },
        {
          key: "family-cost",
          kind: "template",
          text: "It cost {{relative-name}} money.",
          requiresFacts: ["family", "cost"],
        },
        {
          key: "family-gain",
          kind: "template",
          text: "{{relative-name}} came out ahead on it.",
          requiresFacts: ["family", "gain"],
        },
        {
          key: "friend-told",
          kind: "template",
          text: "{{friend-name}} told me what it did to them.",
          requiresFacts: ["friend"],
        },
      ],
    },
  },
};

/*
 * A person saying what they hold against the official who answers for
 * something that happened to them (LIVES slice, step 3). Every clause copies
 * a recorded fact: the official, that the speaker blames them, and what
 * happened (a layoff or a closed workplace, from the ended job's own record;
 * a child who left school mid-year, from the child's own record).
 * Nothing shows the size of the view as a number. Drafted for Lamontae's
 * editorial review; not yet reviewed.
 */
const LIVED_OUTCOME_VIEW: ComposedLineBank = {
  key: "small-talk.lived-outcome-view",
  version: "1",
  surface: "dialogue",
  act: "answer",
  parts: {
    core: {
      variants: [
        {
          key: "laid-off-blame",
          kind: "template",
          text: "I got laid off on {{official-name}}'s watch, and I haven't forgotten it.",
          requiresFacts: ["blame", "laid-off"],
        },
        {
          key: "laid-off-blame-hold",
          kind: "template",
          text: "I lost my job in a layoff, and I hold it against {{official-name}}.",
          requiresFacts: ["blame", "laid-off"],
        },
        {
          key: "closed-blame",
          kind: "template",
          text: "The place I worked shut down on {{official-name}}'s watch, and I haven't forgotten it.",
          requiresFacts: ["blame", "business-closed"],
        },
        {
          key: "closed-blame-hold",
          kind: "template",
          text: "I lost my job when the place I worked closed, and I hold it against {{official-name}}.",
          requiresFacts: ["blame", "business-closed"],
        },
        {
          key: "school-move-blame",
          kind: "template",
          text: "{{child-name}} had to leave school in the middle of the year, and I hold it against {{official-name}}.",
          requiresFacts: ["blame", "school-move", "child-name"],
        },
        {
          key: "school-move-watch",
          kind: "template",
          text: "We moved partway through the school year and {{child-name}} had to leave school. That was on {{official-name}}'s watch, and I haven't forgotten it.",
          requiresFacts: ["blame", "school-move", "child-name"],
        },
      ],
    },
  },
};

/**
 * The view the speaker holds most strongly of an official, when it was formed
 * from something that happened to them rather than from a law: the saved
 * view, the outcome it weighed and the reflection that weighed it.
 */
export function strongestLivedOutcomeView(
  world: World,
  speakerId: EntityId,
): {
  readonly officialId: EntityId;
  readonly points: number;
  readonly belief: PrivateBeliefRecord;
  readonly outcome: LivedOutcome;
  readonly reflectionEventId: EntityId;
} | null {
  const view = strongestOfficialStanding(world, speakerId);
  if (!view?.belief) return null;
  const formedFrom = new Set(view.belief.formation.relevantEventIds);
  const reflection = world.history.events.find(
    (event) =>
      formedFrom.has(event.id) &&
      event.type === LIVED_OUTCOME_REFLECTION_EVENT_TYPE,
  );
  const recordId = reflection?.tags
    .find((tag) => tag.startsWith(LIVED_OUTCOME_SOURCE_TAG))
    ?.slice(LIVED_OUTCOME_SOURCE_TAG.length);
  const outcome = recordId
    ? livedOutcomesOf(world, speakerId).find(
        (row) => row.sourceRecordId === recordId,
      )
    : undefined;
  if (!reflection || !outcome) return null;
  return {
    officialId: view.officialId,
    points: view.points,
    belief: view.belief,
    outcome,
    reflectionEventId: reflection.id,
  };
}

/** What happened, as facts read from the outcome's own record. */
function outcomeFacts(
  world: World,
  outcome: LivedOutcome,
): GroundedEnglishPacket["facts"] | null {
  const source = [outcome.sourceRecordId];
  switch (outcome.kind) {
    case "job-lost": {
      const reason = world.history.workStatuses.find(
        (row) => row.id === outcome.sourceRecordId,
      )?.reason;
      const how =
        reason === TOWN_JOB_END_REASONS.laidOff
          ? "laid-off"
          : reason === TOWN_JOB_END_REASONS.businessClosed
            ? "business-closed"
            : null;
      return how ? { [how]: { text: how, sourceRecordIds: source } } : null;
    }
    case "school-move": {
      const childId = childhoodRecordEntries(world).find(
        (entry) => entry.id === outcome.sourceRecordId,
      )?.personId;
      const child = childId ? world.people[childId] : undefined;
      if (!childId || !child) return null;
      return {
        "school-move": { text: "school-move", sourceRecordIds: source },
        "child-name": {
          text: child.givenName,
          sourceRecordIds: [childId, outcome.sourceRecordId],
        },
      };
    }
  }
}

/** A person saying what they hold against an official over what happened to them. */
function livedOutcomeViewLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
): SmallTalkLine | null {
  const view = strongestLivedOutcomeView(world, speakerId);
  const official = view ? world.people[view.officialId] : undefined;
  if (!view || !official || view.points >= 0) return null;
  const sources = [view.belief.id, view.reflectionEventId];
  const what = outcomeFacts(world, view.outcome);
  if (!what) return null;
  const facts: GroundedEnglishPacket["facts"] = {
    "official-name": {
      text: `${official.givenName} ${official.familyName}`,
      sourceRecordIds: [view.officialId, view.belief.id],
    },
    blame: { text: "blame", sourceRecordIds: sources },
    ...what,
  };
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `lived-outcome-view:${speakerId}:${playerPersonId}:${view.belief.id}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: LIVED_OUTCOME_VIEW.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: sources,
    facts,
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    // The speaker's own saved view and the record of what happened to them
    // are how they know each of these.
    knowledge: Object.keys(facts).map((factKey) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: [...sources, view.outcome.sourceRecordId],
    })),
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    LIVED_OUTCOME_VIEW,
  );
}

/**
 * The view the speaker holds most strongly of an official, with the law and
 * the exposure behind it: their saved view (a private belief formed through
 * the belief pipeline) and the reflection that formed it, or, in a save from
 * before saved views, their latest old reflection row.
 */
export function strongestOfficialView(
  world: World,
  speakerId: EntityId,
): {
  readonly officialId: EntityId;
  readonly points: number;
  readonly belief: PrivateBeliefRecord | null;
  readonly measureId: EntityId;
  readonly act: OfficialViewRecord["act"];
  readonly exposure: LawExposureRecord;
  /** The saved view, or the old reflection row, the line speaks from. */
  readonly sourceRecordId: EntityId;
} | null {
  const view = strongestOfficialStanding(world, speakerId);
  if (!view) return null;
  if (view.belief) {
    const formedFrom = new Set(view.belief.formation.relevantEventIds);
    const reflection = world.history.events.find(
      (event) =>
        formedFrom.has(event.id) && event.type === "people.law-reflection",
    );
    const exposure = reflection
      ? world.history.lawExposures?.find(
          (row) => officialViewReflectionEventKey(row) === reflection.stableKey,
        )
      : undefined;
    if (!exposure) return null;
    const act = officialsBehind(world, exposure.measureId).find(
      (row) => row.officialId === view.officialId,
    )?.act;
    if (!act) return null;
    return {
      officialId: view.officialId,
      points: view.points,
      belief: view.belief,
      measureId: exposure.measureId,
      act,
      exposure,
      sourceRecordId: view.belief.id,
    };
  }
  const latest = view.rows.at(-1);
  const exposure = latest
    ? world.history.lawExposures?.find((row) => row.id === latest.exposureId)
    : undefined;
  if (!latest || !exposure) return null;
  return {
    officialId: view.officialId,
    points: view.points,
    belief: null,
    measureId: latest.measureId,
    act: latest.act,
    exposure,
    sourceRecordId: latest.id,
  };
}

/** A person saying what they think of an official over a law, or null. */
export function officialViewLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
): SmallTalkLine | null {
  const view = strongestOfficialView(world, speakerId);
  if (!view)
    return livedOutcomeViewLine(world, speakerId, playerPersonId, history);
  const official = world.people[view.officialId];
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === view.measureId,
  );
  const exposure = view.exposure;
  if (!official || !measure) return null;
  const via = exposure.viaPersonId ? world.people[exposure.viaPersonId] : null;
  const sources = [view.sourceRecordId, exposure.id];
  const flag = (key: string, ids: readonly EntityId[] = sources) => ({
    [key]: { text: key, sourceRecordIds: ids },
  });
  const facts: GroundedEnglishPacket["facts"] = {
    "official-name": {
      text: `${official.givenName} ${official.familyName}`,
      sourceRecordIds: [view.officialId, view.sourceRecordId],
    },
    "law-name": {
      text: measure.shortTitle,
      sourceRecordIds: [measure.id],
    },
    ...flag(view.points < 0 ? "blame" : "credit"),
    ...flag(view.act),
    ...flag(exposure.relation),
    ...(exposure.direction === "none" ? {} : flag(exposure.direction)),
    ...(via && exposure.relation === "family"
      ? {
          "relative-name": {
            text: via.givenName,
            sourceRecordIds: [via.id, exposure.id],
          },
        }
      : {}),
    ...(via && exposure.relation === "friend"
      ? {
          "friend-name": {
            text: via.givenName,
            sourceRecordIds: [via.id, exposure.id],
          },
        }
      : {}),
  };
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `official-view:${speakerId}:${playerPersonId}:${view.sourceRecordId}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: OFFICIAL_VIEW.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: sources,
    facts,
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    // The speaker's own saved view and exposure are the record of their
    // learning each of these: whom they judged, for what, and how it reached
    // them.
    knowledge: Object.keys(facts).map((factKey) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: sources,
    })),
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    OFFICIAL_VIEW,
  );
}

/** Exported for review tooling and tests. */
export const SMALL_TALK_BANKS = [
  GREET_AGAIN,
  MATTER_UNINFORMED,
  OFFICIAL_VIEW,
  LIVED_OUTCOME_VIEW,
] as const;
