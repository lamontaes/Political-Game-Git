import { activeCampaignForCandidate, campaignState } from "./campaign-queries";
import { addDays, ageOnDate } from "./dates";
import { evaluateDecision } from "./decisions";
import {
  electionContestStatus,
  requireElectionContest,
} from "./election-contests";
import { favorRecords, favorStandingBetween } from "./favors";
import { recordLifeCommitment } from "./life";
import { activeWorkRelationshipsAt } from "./life-queries";
import { personName } from "./people";
import { confidantsOf } from "./confidants";
import { ensureOwnTies } from "./people-own-ties";
import { ensurePeopleTraits, traitConsiderations } from "./people-traits";
import {
  recordClaim,
  recordEventKnowledge,
  recordRelationshipInteraction,
} from "./records";
import type { StandingBand } from "./relationship-standing";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  FavorRecord,
  FavorWeight,
  HistoricalEvent,
  IsoDate,
  World,
} from "./types";
import { recordWorldEvent } from "./world";

/**
 * People come to collect.
 *
 * Somebody who once helped the player, who still expects something back and
 * who now needs something real, may decide to ask. Nothing here counts down
 * and no share of people asks: each helper decides from what they expect,
 * what they need and who they are. Somebody shy may never ask at all, and
 * somebody who helped out of kindness expects nothing, so never does.
 *
 * The player answers as their character: say they will help, say not now, or
 * say no. Saying they will help is a promise to return the favor, judged
 * later from what they actually do; saying no costs something between them.
 */

export const FAVOR_ASKED_EVENT = "favor.asked-back";
export const FAVOR_ASK_ANSWERED_EVENT = "favor.ask-answered";
const FAVOR_ASK_TAG = "favor-collection-v1";

/**
 * How long an ask stays open before it has gone unanswered.
 *
 * SET BY HAND: a week, the life of a phone message somebody means to return.
 * It affects only how long the player can still answer.
 */
export const FAVOR_ASK_OPEN_DAYS = 7;

/**
 * How long a helper waits after asking before they would ask the same person
 * again.
 *
 * SET BY HAND: about three months, so an ask that was put off is not repeated
 * every week. It affects how often one person can press another.
 */
export const FAVOR_ASK_SPACING_DAYS = 90;

/** Something real the helper needs, read from their own record. */
export type FavorNeed =
  | {
      readonly kind: "campaign";
      readonly campaignId: EntityId;
      readonly electionDate: IsoDate;
      readonly words: string;
    }
  | { readonly kind: "work"; readonly words: string };

/**
 * What this person needs now that somebody could help with, or null.
 *
 * Only needs the world already records: a race they are running, or being of
 * working age with no job. A need the world does not record is not invented.
 */
export function favorNeed(world: World, personId: EntityId): FavorNeed | null {
  const person = world.people[personId];
  if (!person) return null;
  const campaign = activeCampaignForCandidate(world, personId);
  if (
    campaign &&
    campaignState(world, campaign.id).status === "active" &&
    electionContestStatus(world, campaign.contestId) === "pending"
  ) {
    return {
      kind: "campaign",
      campaignId: campaign.id,
      electionDate: requireElectionContest(world, campaign.contestId)
        .electionDate,
      words: "their campaign",
    };
  }
  const age = ageOnDate(person.birthDate, world.currentDate);
  // SET BY HAND: the ages at which being without a job reads as a need
  // rather than school or retirement.
  if (
    age >= 22 &&
    age < 65 &&
    activeWorkRelationshipsAt(world, personId).length === 0
  ) {
    return { kind: "work", words: "finding work" };
  }
  return null;
}

export interface FavorAsk {
  readonly eventId: EntityId;
  readonly askerPersonId: EntityId;
  readonly askedPersonId: EntityId;
  readonly favorId: EntityId;
  readonly need: FavorNeed["kind"];
  readonly needWords: string;
  readonly askedOn: IsoDate;
  readonly answer: FavorAskAnswer | null;
  /** Open while unanswered and not yet a week old. */
  readonly open: boolean;
}

/**
 * Help, offer something smaller, not now, or no. Something smaller is still a
 * promise to return the favor, made with less behind it.
 */
export type FavorAskAnswer = "help" | "offer-less" | "not-now" | "refuse";

const LESS: Readonly<Record<FavorRecord["weight"], FavorRecord["weight"]>> = {
  slight: "slight",
  moderate: "slight",
  great: "moderate",
  "life-changing": "great",
};

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((entry) => entry.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** Every ask for a favor back made of this person, oldest first. */
export function favorAsksOf(world: World, personId: EntityId): FavorAsk[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === FAVOR_ASKED_EVENT &&
        event.participants.some(
          (entry) =>
            entry.personId === personId && entry.role === "focus:asked-of",
        ),
    )
    .map((event) => {
      const answered = world.history.events.find(
        (candidate) =>
          candidate.type === FAVOR_ASK_ANSWERED_EVENT &&
          candidate.tags.includes(`favor.ask:${event.id}`),
      );
      const answer = answered
        ? (tagValue(answered, "favor.answer:") as FavorAskAnswer)
        : null;
      return {
        eventId: event.id,
        askerPersonId: event.participants.find(
          (entry) => entry.role === "agency:asked",
        )!.personId,
        askedPersonId: personId,
        favorId: tagValue(event, "favor.id:")! as EntityId,
        need: tagValue(event, "favor.need:") as FavorNeed["kind"],
        needWords: event.context.choice ?? "",
        askedOn: event.occurredAt,
        answer,
        open:
          answer === null &&
          world.currentDate <= addDays(event.occurredAt, FAVOR_ASK_OPEN_DAYS),
      };
    });
}

/** The ask waiting on this person's answer, if there is one. */
export function openFavorAsk(
  world: World,
  personId: EntityId,
): FavorAsk | null {
  return favorAsksOf(world, personId).find((ask) => ask.open) ?? null;
}

const EXPECTATION_IMPORTANCE: Readonly<
  Record<Exclude<StandingBand, "none">, DecisionImportance>
> = {
  slight: "slight",
  marked: "moderate",
  strong: "strong",
};

function alive(world: World, personId: EntityId): boolean {
  return !world.history.personDeaths.some(
    (death) => death.personId === personId && death.diedAt <= world.currentDate,
  );
}

/**
 * Lets one person who helped this person decide whether to ask for something
 * back today. Writes at most one ask, and nothing when nobody decides to.
 */
export function produceFavorCollection(
  world: World,
  personId: EntityId,
): World {
  if (!world.people[personId] || openFavorAsk(world, personId)) return world;
  const favors = favorRecords(world).filter(
    (favor) => favor.receiverPersonId === personId,
  );
  const helpers = [...new Set(favors.map((favor) => favor.giverPersonId))];
  const earlier = favorAsksOf(world, personId);
  for (const helperId of helpers) {
    if (!world.people[helperId] || !alive(world, helperId)) continue;
    const lastAsked = earlier
      .filter((ask) => ask.askerPersonId === helperId)
      .at(-1);
    if (
      lastAsked &&
      world.currentDate < addDays(lastAsked.askedOn, FAVOR_ASK_SPACING_DAYS)
    )
      continue;
    const standing = favorStandingBetween(world, personId, helperId);
    if (standing.giverExpectation === "none") continue;
    const need = favorNeed(world, helperId);
    if (!need) continue;
    const favor = favors
      .filter((entry) => standing.openFavorIds.includes(entry.id))
      .at(-1);
    if (!favor) continue;
    const key = `favor-ask:${helperId}:${personId}:${world.currentDate}`;
    const withTraits = ensurePeopleTraits(world, [helperId]);
    const considerations: DecisionConsideration[] = [
      {
        stableKey: `${key}:owed`,
        optionKey: "ask",
        sourceType: "social:favor",
        direction: "supports",
        importance: EXPECTATION_IMPORTANCE[standing.giverExpectation],
        confidence: "high",
        explanation: `They once ${favor.description}, and expect something back.`,
        sourceRefs: [{ kind: "historical-event", eventId: favor.eventId }],
      },
      {
        stableKey: `${key}:need`,
        optionKey: "ask",
        sourceType: "context:need",
        direction: "supports",
        importance: need.kind === "campaign" ? "moderate" : "strong",
        confidence: "high",
        explanation: `They need help with ${need.words}.`,
        sourceRefs: [],
      },
      ...traitConsiderations(withTraits, helperId, key, [
        {
          optionKey: "leave-it",
          trait: "sociability",
          pole: "low",
          explanation: "Asking anybody for anything is hard for them.",
        },
        {
          optionKey: "ask",
          trait: "conflict",
          pole: "high",
          explanation: "They say what they want.",
        },
        {
          optionKey: "leave-it",
          trait: "conflict",
          pole: "low",
          explanation: "They would rather not impose.",
        },
      ]),
    ];
    const evaluation = evaluateDecision(withTraits, {
      stableKey: key,
      decisionType: "people.ask-favor-back",
      actorPersonId: helperId,
      cutoff: {
        asOfDate: withTraits.currentDate,
        historySequenceExclusive: withTraits.history.nextSequence,
      },
      subject: { kind: "context:life", key: "favor-back", entityId: null },
      options: [
        {
          key: "ask",
          label: "Ask",
          description: "Ask them to help in return.",
        },
        {
          key: "leave-it",
          label: "Leave it",
          description: "Say nothing about it.",
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "close-choices",
      retention: "ephemeral",
    });
    if (evaluation.selectedOptionKey !== "ask") continue;
    const asker = withTraits.people[helperId]!;
    const asked = withTraits.people[personId]!;
    return recordWorldEvent(withTraits, {
      stableKey: `${key}:asked`,
      type: FAVOR_ASKED_EVENT,
      occurredAt: withTraits.currentDate,
      recordedAt: withTraits.currentDate,
      jurisdictionId: asker.homeJurisdictionId,
      involvedEntityIds: [helperId, personId],
      participants: [
        { personId: helperId, role: "agency:asked", detail: "Asked for help" },
        { personId, role: "focus:asked-of", detail: "Was asked" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        FAVOR_ASK_TAG,
        `favor.id:${favor.id}`,
        `favor.need:${need.kind}`,
        ...(need.kind === "campaign" ? [`campaign:${need.campaignId}`] : []),
      ],
      summary: `${personName(asker)} asked ${personName(asked)} for help with ${need.words}, remembering the time they ${favor.description}.`,
      context: {
        location: null,
        socialContext: "Somebody who once helped asks for help back.",
        pressure: null,
        choice: need.words,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return world;
}

/**
 * The player's answer to an ask for a favor back.
 *
 * Saying they will help is a promise to return the favor, owed to the asker
 * and judged later from what they do; offering something smaller is the same
 * promise, hedged and worth one size less. Saying no strains what is between
 * them. Saying not now closes this ask and promises nothing.
 */
export function answerFavorAsk(
  world: World,
  askEventId: EntityId,
  answer: FavorAskAnswer,
): World {
  const event = world.history.events.find(
    (candidate) =>
      candidate.id === askEventId && candidate.type === FAVOR_ASKED_EVENT,
  );
  if (!event) throw new Error("There is no such ask.");
  const askedId = event.participants.find(
    (entry) => entry.role === "focus:asked-of",
  )!.personId;
  const ask = favorAsksOf(world, askedId).find(
    (entry) => entry.eventId === askEventId,
  )!;
  if (!ask.open) {
    throw new Error(
      ask.answer ? "That has already been answered." : "That ask has passed.",
    );
  }
  const favor: FavorRecord = favorRecords(world).find(
    (entry) => entry.id === ask.favorId,
  )!;
  const asker = world.people[ask.askerPersonId]!;
  const asked = world.people[askedId]!;
  const said: Record<FavorAskAnswer, string> = {
    help: `said they would help ${personName(asker)} with ${ask.needWords}`,
    "offer-less": `offered ${personName(asker)} a little help with ${ask.needWords}`,
    "not-now": `told ${personName(asker)} not now`,
    refuse: `told ${personName(asker)} they would not help`,
  };
  let next = recordWorldEvent(world, {
    stableKey: `favor-answer:${askEventId}`,
    type: FAVOR_ASK_ANSWERED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: event.jurisdictionId,
    involvedEntityIds: [askedId, ask.askerPersonId],
    participants: [
      { personId: askedId, role: "agency:answered", detail: "Answered" },
      {
        personId: ask.askerPersonId,
        role: "focus:answered",
        detail: "Heard the answer",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [FAVOR_ASK_TAG, `favor.ask:${askEventId}`, `favor.answer:${answer}`],
    summary: `${personName(asked)} ${said[answer]}.`,
    context: {
      location: null,
      socialContext: "An answer to an ask for a favor back.",
      pressure: null,
      choice: answer,
      motivation: null,
      immediateReaction: null,
    },
  });
  const answered = next.history.events.at(-1)!;
  if (answer === "help" || answer === "offer-less") {
    const smaller = answer === "offer-less";
    const campaign = event.tags
      .find((tag) => tag.startsWith("campaign:"))
      ?.slice("campaign:".length);
    const electionDate =
      ask.need === "campaign" && campaign
        ? ((
            favorNeed(world, ask.askerPersonId) as Extract<
              FavorNeed,
              { kind: "campaign" }
            > | null
          )?.electionDate ?? null)
        : null;
    next = recordLifeCommitment(next, {
      stableKey: `favor-answer:${askEventId}:commitment`,
      personId: askedId,
      startsAt: next.currentDate,
      endsAt: null,
      kind: "personal:returning-a-favor",
      label: `${smaller ? "helping a little" : "helping"} ${personName(asker)} with ${ask.needWords}`,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 2 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
      provenance: { kind: "simulated-event", eventId: answered.id },
      undertaking: {
        owedToPersonIds: [ask.askerPersonId],
        act: {
          kind: "repay",
          favorId: favor.id,
          description: `help with ${ask.needWords}`,
        },
        firmness: smaller ? "qualified" : "explicit",
        audience: "private",
        heardByPersonIds: [ask.askerPersonId],
        statement: smaller
          ? `Said they could help a little with ${ask.needWords}.`
          : `Said they would help with ${ask.needWords}.`,
        claimId: null,
        mattered: smaller ? LESS[favor.weight] : favor.weight,
        dueBy: electionDate,
      },
    });
  }
  if (answer === "refuse") {
    next = recordRelationshipInteraction(next, {
      stableKey: `favor-answer:${askEventId}:refused`,
      personIds: [askedId, ask.askerPersonId],
      eventId: answered.id,
      occurredAt: next.currentDate,
      kind: "conflict:favor-refused",
      change: "strained",
      significance: favor.weight === "slight" ? "minor" : "meaningful",
      summary: `${personName(asked)} would not help ${personName(asker)} after ${personName(asker)} had ${favor.description}.`,
      tags: [FAVOR_ASK_TAG],
    });
    next = tellOfRefusal(next, {
      answered,
      askerId: ask.askerPersonId,
      refuserId: askedId,
      favor,
      needWords: ask.needWords,
    });
  }
  return next;
}

/* -------------------------------------------------------------------------- */
/* Word travels                                                               */
/* -------------------------------------------------------------------------- */

/** SET BY HAND: how much a refusal stings, by how much the favor mattered. */
const STING: Readonly<Record<FavorWeight, DecisionImportance>> = {
  slight: "slight",
  moderate: "moderate",
  great: "strong",
  "life-changing": "strong",
};

interface RefusalToTell {
  readonly answered: HistoricalEvent;
  readonly askerId: EntityId;
  readonly refuserId: EntityId;
  readonly favor: FavorRecord;
  readonly needWords: string;
}

/**
 * The one who was refused decides whether to tell the people they confide in
 * (`confidantsOf`), and anybody who saw the favor done. Whether they tell is their own choice,
 * from how much the favor mattered and who they are; those who hear it know
 * it secondhand, from them, and it counts against the one who refused when
 * they later ask those people for something.
 */
function tellOfRefusal(start: World, input: RefusalToTell): World {
  const { answered, askerId, refuserId, favor } = input;
  // Somebody written around the played life may know nobody but the player;
  // the same few neighbors and friends their own goals would reach are
  // recorded first, drawn from people who already live in their town.
  const world = ensureOwnTies(start, askerId, refuserId);
  const listeners = [
    ...new Set([
      ...favor.witnessPersonIds.filter(
        (id) => !!world.people[id] && alive(world, id),
      ),
      ...confidantsOf(world, askerId),
    ]),
  ].filter((id) => id !== refuserId && id !== askerId);
  if (listeners.length === 0) return start;
  const key = `favor-answer:${answered.id}:word`;
  const withTraits = ensurePeopleTraits(world, [askerId]);
  const evaluation = evaluateDecision(withTraits, {
    stableKey: key,
    decisionType: "people.tell-of-refusal",
    actorPersonId: askerId,
    cutoff: {
      asOfDate: withTraits.currentDate,
      historySequenceExclusive: withTraits.history.nextSequence,
    },
    subject: { kind: "context:life", key: "favor-refused", entityId: null },
    options: [
      {
        key: "tell",
        label: "Tell people",
        description: "Tell the people they talk to what happened.",
      },
      {
        key: "keep-it",
        label: "Keep it to themselves",
        description: "Say nothing about it.",
      },
    ],
    constraints: [],
    considerations: [
      {
        stableKey: `${key}:sting`,
        optionKey: "tell",
        sourceType: "social:favor",
        direction: "supports",
        importance: STING[favor.weight],
        confidence: "high",
        explanation: `They had ${favor.description}, and were turned down.`,
        sourceRefs: [{ kind: "historical-event", eventId: answered.id }],
      },
      ...traitConsiderations(withTraits, askerId, key, [
        {
          optionKey: "tell",
          trait: "sociability",
          pole: "high",
          explanation: "They talk to people about what happens to them.",
        },
        {
          optionKey: "keep-it",
          trait: "sociability",
          pole: "low",
          explanation: "They keep things to themselves.",
        },
        {
          optionKey: "tell",
          trait: "conflict",
          pole: "high",
          explanation: "They do not let a slight pass.",
        },
        {
          optionKey: "keep-it",
          trait: "conflict",
          pole: "low",
          explanation: "They would rather not make trouble for anybody.",
        },
      ]),
    ],
    perceptionIds: [],
    randomness: "close-choices",
    retention: "ephemeral",
  });
  if (evaluation.selectedOptionKey !== "tell") return start;
  const asker = withTraits.people[askerId]!;
  const refuser = withTraits.people[refuserId]!;
  let next = recordClaim(withTraits, {
    stableKey: `${key}:claim`,
    speakerPersonId: askerId,
    eventId: answered.id,
    madeAt: withTraits.currentDate,
    audience: "limited",
    statement: `${personName(refuser)} would not help me with ${input.needWords}, after I had ${favor.description}.`,
    relationshipToTruth: "consistent",
    provenance: { kind: "direct-record" },
  });
  const claimId = next.history.claims.at(-1)!.id;
  for (const listenerId of listeners) {
    next = recordEventKnowledge(next, {
      stableKey: `${key}:heard:${listenerId}`,
      personId: listenerId,
      eventId: answered.id,
      learnedAt: next.currentDate,
      believedSummary: `${personName(refuser)} would not help ${personName(asker)} with ${input.needWords}, after ${personName(asker)} had ${favor.description}.`,
      accuracy: "accurate",
      // SET BY HAND: heard from the one it happened to, so believed, but
      // secondhand.
      confidence: "medium",
      source: { kind: "told-by", sourcePersonId: askerId, claimId },
    });
  }
  return next;
}

/**
 * What a person asked for something has heard about the one asking turning
 * down somebody who had helped them, as a reason to say no. Nothing when they
 * heard nothing. Heard secondhand, so it weighs slight.
 */
export function heardOfRefusalConsiderations(
  world: World,
  actorPersonId: EntityId,
  askerPersonId: EntityId,
  keyPrefix: string,
  optionKey: string,
): readonly DecisionConsideration[] {
  const heard = world.history.knowledge.filter((record) => {
    if (record.personId !== actorPersonId || record.source.kind !== "told-by")
      return false;
    const event = world.history.events.find(
      (entry) => entry.id === record.eventId,
    );
    return (
      !!event &&
      event.type === FAVOR_ASK_ANSWERED_EVENT &&
      event.tags.includes("favor.answer:refuse") &&
      event.participants.some(
        (entry) =>
          entry.role === "agency:answered" && entry.personId === askerPersonId,
      )
    );
  });
  const latest = heard.at(-1);
  if (!latest) return [];
  return [
    {
      stableKey: `${keyPrefix}:heard-refused:${askerPersonId}`,
      optionKey,
      sourceType: "social:favor",
      direction: "opposes",
      importance: "slight",
      confidence: "medium",
      explanation: `They heard that ${latest.believedSummary}`,
      sourceRefs: [{ kind: "event-knowledge", knowledgeId: latest.id }],
    },
  ];
}
