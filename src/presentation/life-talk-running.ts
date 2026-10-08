import { lifeReplyLine, type LifeReplyKey } from "./life-reply-english";
import type { ComposedPart } from "./english-composition";
import { recordDurableDecisionTrace } from "../simulation/decisions";
import { ageOnDate, daysBetween } from "../simulation/dates";
import { personTrait } from "../simulation/people-traits";
import { latestGoalStatesForPerson } from "../simulation/queries";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../simulation";
import { projectCampaignOffices } from "./campaign-office-discovery";
import { availableCampaignElectionDate } from "./campaign-projection";
import { conversationStanding } from "./conversation-consequences";
import { currentKnownMatter, matterAwareness } from "./current-matters";
import { MATTER_CHOICE_PREFIX } from "./life-conversation";
import { runForPhrase, tenseOf } from "./english-grammar";
import { PEOPLE_GOAL_VERSION } from "./people-goals";
import { proseDate } from "./prose-dates";
import {
  evaluateReplyMeaning,
  standingTone,
  type ReplyMeanings,
  type ReplyTraitLean,
} from "./reply-meaning";

/**
 * Telling somebody at home that you are thinking of running for office.
 *
 * A household talk with a reason to have it. It opens only when the player
 * holds the goal of running for office, and it runs three to eight exchanges.
 * Every later topic is a record the two of them share or the player holds:
 *
 * - the election itself, for an office the player can stand for, named only
 *   while its date is still ahead;
 * - the news matter the player knows of, with the listener answering from
 *   whether their own records say they know it;
 * - something the two of them shared before today: a scene they lived through,
 *   in its own words, or an earlier day's talk about the news;
 * - whether they would help, and what worries them, answered from their own
 *   temperament.
 *
 * The opening answer and the answer about helping are decisions the listener
 * makes from their temperament and their history with the player, kept with
 * their reasons, so the person card can learn a trait from them.
 *
 * PLACEHOLDER, NOT REVIEWED: every reply line here is interim copy awaiting
 * the owner's editorial review (civic-prose), in the same standing as the
 * lines in `life-talk-topics.ts`. The counts are the owner's brief of
 * September 27, 2026: three to eight exchanges.
 */

export const RUNNING_PREFIX = "running:";
export const RUNNING_STEPS = [
  "open",
  "when",
  "news",
  "remember",
  "help",
  "worry",
] as const;
export type RunningStep = (typeof RUNNING_STEPS)[number];
export type RunningIntent = `${typeof RUNNING_PREFIX}${RunningStep}`;

/** The talk is at least this long before the player can leave it. */
export const RUNNING_MIN_EXCHANGES = 3;
/** And at most this long. */
export const RUNNING_MAX_EXCHANGES = 8;

const SCENE_RESOLVED = "life.scene.resolved";

export function isRunningIntent(intent: string): intent is RunningIntent {
  return (
    intent.startsWith(RUNNING_PREFIX) &&
    (RUNNING_STEPS as readonly string[]).includes(
      intent.slice(RUNNING_PREFIX.length),
    )
  );
}

function stepOf(intent: RunningIntent): RunningStep {
  return intent.slice(RUNNING_PREFIX.length) as RunningStep;
}

/** The player's own recorded aim to run for office, when active. */
function seekingOffice(world: World, playerPersonId: EntityId): boolean {
  return latestGoalStatesForPerson(world, playerPersonId).some(
    (record) =>
      record.goalKey.startsWith(`${PEOPLE_GOAL_VERSION}:seek-office:`) &&
      record.status === "active",
  );
}

/** Their talk turns, oldest first, up to today. */
function talkTurns(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) =>
      event.type === "life.conversation" &&
      event.occurredAt <= world.currentDate &&
      event.participants.some(
        (p) => p.personId === playerPersonId && p.role === "focus:subject",
      ) &&
      event.participants.some(
        (p) => p.personId === personId && p.role === "coordination:counterpart",
      ),
  );
}

function runningStepOf(event: HistoricalEvent): RunningStep | null {
  const tag = event.tags.find((entry) =>
    entry.startsWith(`life.talk:${RUNNING_PREFIX}`),
  );
  if (!tag) return null;
  const step = tag.slice(`life.talk:${RUNNING_PREFIX}`.length);
  return (RUNNING_STEPS as readonly string[]).includes(step)
    ? (step as RunningStep)
    : null;
}

/**
 * The talk under way today, if the player's last words to this person were
 * part of it: the steps taken so far, in order. Anything else said since
 * closes it.
 */
export function runningThread(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): readonly RunningStep[] | null {
  const turns = talkTurns(world, playerPersonId, personId);
  const steps: RunningStep[] = [];
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index]!;
    if (turn.occurredAt !== world.currentDate) return null;
    const step = runningStepOf(turn);
    if (!step) return null;
    steps.unshift(step);
    if (step === "open") return steps;
  }
  return null;
}

function everOpened(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): boolean {
  return talkTurns(world, playerPersonId, personId).some(
    (event) => runningStepOf(event) === "open",
  );
}

/** The soonest election still ahead for an office the player can stand for. */
function electionAhead(
  world: World,
  playerPersonId: EntityId,
): { readonly title: string; readonly date: IsoDate } | null {
  const person = world.people[playerPersonId]!;
  let best: { title: string; date: IsoDate } | null = null;
  for (const office of projectCampaignOffices(world, playerPersonId)) {
    if (!office.eligible) continue;
    const recorded = (world.history.electionContests ?? [])
      .filter(
        (contest) =>
          contest.jurisdictionId === person.homeJurisdictionId &&
          contest.office.officeKey === office.officeKey &&
          tenseOf(contest.electionDate, world.currentDate) === "upcoming",
      )
      .map((contest) => contest.electionDate)
      .sort()[0];
    const date =
      recorded ??
      availableCampaignElectionDate(
        world,
        person.homeJurisdictionId,
        office.officeKey,
      );
    // Never a date that has come and gone, and never today: an election on
    // the day of the talk is not something to be "thinking of" running in.
    if (date === null || tenseOf(date, world.currentDate) !== "upcoming")
      continue;
    if (!best || date < best.date) best = { title: office.title, date };
  }
  return best;
}

/**
 * Something the two of them shared before today, in words the record already
 * holds: the latest scene they lived through, else the latest earlier day on
 * which the player raised the news with them. Nothing from today, so nothing
 * still under way is recalled as past.
 */
function sharedMemory(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): { readonly on: IsoDate; readonly words: string } | null {
  const between = (event: HistoricalEvent) =>
    tenseOf(event.occurredAt, world.currentDate) === "past" &&
    event.participants.some(
      (p) => p.personId === playerPersonId && p.role === "focus:subject",
    ) &&
    event.participants.some(
      (p) => p.personId === personId && p.role === "coordination:counterpart",
    );
  const events = [...world.history.events].reverse();
  const scene = events.find(
    (event) =>
      event.type === SCENE_RESOLVED &&
      between(event) &&
      (event.context.immediateReaction ?? "").trim().length > 0,
  );
  if (scene)
    return {
      on: scene.occurredAt,
      words: `: ${lowerFirst(withoutFinalStop(scene.context.immediateReaction!))}`,
    };
  const talk = events.find(
    (event) =>
      event.type === "life.conversation" &&
      between(event) &&
      event.tags.some((tag) => tag.startsWith("life.matter:")) &&
      (event.context.choice ?? "").startsWith(MATTER_CHOICE_PREFIX),
  );
  if (talk)
    return {
      on: talk.occurredAt,
      words: `, when you talked about the news: ${withoutFinalStop(
        talk.context.choice!.slice(MATTER_CHOICE_PREFIX.length),
      )}`,
    };
  return null;
}

export interface RunningTopic {
  readonly key: RunningIntent;
  readonly label: string;
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1);
}

function withoutFinalStop(text: string): string {
  return text.trim().replace(/[.!]+$/, "");
}

/** Every step still open to the player, with its words. */
function candidateTopics(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): readonly RunningTopic[] {
  const topics: RunningTopic[] = [];
  const election = electionAhead(world, playerPersonId);
  if (election)
    topics.push({
      key: `${RUNNING_PREFIX}when`,
      label: `Tell them the election for ${runForPhrase(election.title)} is on ${proseDate(election.date)}`,
    });
  const matter = currentKnownMatter(world, playerPersonId);
  if (matter)
    topics.push({
      key: `${RUNNING_PREFIX}news`,
      label: `Bring up the news: ${withoutFinalStop(matter.headline)}`,
    });
  const memory = sharedMemory(world, playerPersonId, personId);
  if (memory)
    topics.push({
      key: `${RUNNING_PREFIX}remember`,
      label: `Remind them of ${proseDate(memory.on)}${memory.words}`,
    });
  topics.push(
    {
      key: `${RUNNING_PREFIX}help`,
      label: "Ask whether they would help",
    },
    {
      key: `${RUNNING_PREFIX}worry`,
      label: "Ask what worries them about it",
    },
  );
  return topics;
}

/**
 * What the player can say in this talk now, and whether they may leave it.
 *
 * Before the talk: the opening, when the player holds the aim and has not
 * told this person before. During it: each topic once, until eight exchanges;
 * leaving is offered from the third.
 */
export function runningTopics(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): {
  readonly topics: readonly RunningTopic[];
  readonly inThread: boolean;
  readonly mayLeave: boolean;
} {
  const thread = runningThread(world, playerPersonId, personId);
  if (!thread) {
    const open =
      seekingOffice(world, playerPersonId) &&
      ageOnDate(world.people[personId]!.birthDate, world.currentDate) >= 13 &&
      !everOpened(world, playerPersonId, personId);
    return {
      topics: open
        ? [
            {
              key: `${RUNNING_PREFIX}open`,
              label: "Tell them you are thinking of running for office",
            },
          ]
        : [],
      inThread: false,
      mayLeave: true,
    };
  }
  const mayLeave = thread.length >= RUNNING_MIN_EXCHANGES;
  if (thread.length >= RUNNING_MAX_EXCHANGES)
    return { topics: [], inThread: true, mayLeave: true };
  const used = new Set(thread);
  return {
    topics: candidateTopics(world, playerPersonId, personId).filter(
      (topic) => !used.has(stepOf(topic.key)),
    ),
    inThread: true,
    mayLeave,
  };
}

export function runningTopicLabel(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: RunningIntent,
): string {
  if (intent === `${RUNNING_PREFIX}open`)
    return "Tell them you are thinking of running for office";
  return (
    candidateTopics(world, playerPersonId, personId).find(
      (topic) => topic.key === intent,
    )?.label ?? "Say more about running"
  );
}

const OPEN_MEANINGS: ReplyMeanings = {
  agree: { key: "encourage", description: "Tell them to go ahead." },
  decline: {
    key: "discourage",
    description: "Say they are not sure it is wise.",
  },
  undecided: { key: "ask-more", description: "Ask to hear more first." },
};

const OPEN_LEANS: readonly ReplyTraitLean[] = [
  {
    meaning: "agree",
    trait: "risk",
    pole: "high",
    explanation: "They like a chance taken.",
  },
  {
    meaning: "decline",
    trait: "risk",
    pole: "low",
    explanation: "They worry about what it could cost.",
  },
  {
    meaning: "undecided",
    trait: "deliberation",
    pole: "low",
    explanation: "They want to think a thing through before they say.",
  },
  {
    meaning: "agree",
    trait: "sociability",
    pole: "high",
    explanation: "They like a life lived among people.",
  },
];

const HELP_MEANINGS: ReplyMeanings = {
  agree: { key: "will-help", description: "Say they will help." },
  decline: { key: "will-not-help", description: "Say they will not campaign." },
  undecided: {
    key: "think-about-helping",
    description: "Say they will think about it.",
  },
};

const HELP_LEANS: readonly ReplyTraitLean[] = [
  {
    meaning: "agree",
    trait: "reliability",
    pole: "high",
    explanation: "They follow through when they say they will.",
  },
  {
    meaning: "agree",
    trait: "sociability",
    pole: "high",
    explanation: "They enjoy meeting people.",
  },
  {
    meaning: "decline",
    trait: "sociability",
    pole: "low",
    explanation: "Knocking on strangers' doors is not for them.",
  },
  {
    meaning: "undecided",
    trait: "deliberation",
    pole: "low",
    explanation: "They want to think it over.",
  },
];

/** What worries them, from the first of their recorded traits that speaks to it. */
function worryReplyKey(world: World, personId: EntityId): LifeReplyKey {
  const recorded = (trait: Parameters<typeof personTrait>[2]) => {
    const reading = personTrait(world, personId, trait);
    return reading.recordId === null ? 0 : reading.value;
  };
  if (recorded("risk") < 0) return "running-worry-risk";
  if (recorded("conflict") < 0) return "running-worry-conflict";
  if (recorded("sociability") < 0) return "running-worry-sociability";
  return "running-worry-none";
}

export interface RunningAnswer {
  readonly world: World;
  readonly reply: string;
  readonly parts: readonly ComposedPart[];
  /** The `life.answer:` tag the turn records. */
  readonly answer: string;
}

/**
 * The listener's answer to one step. The opening and the question about
 * helping are decisions, kept with their reasons; the rest read the records
 * the topic rests on.
 */
export function answerRunning(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
  intent: RunningIntent,
  turnKey: string,
): RunningAnswer {
  const step = stepOf(intent);
  const answer = (
    current: World,
    key: LifeReplyKey,
    tag: string,
  ): RunningAnswer => {
    const line = lifeReplyLine(
      current,
      personId,
      playerPersonId,
      talkTurns(current, playerPersonId, personId),
      key,
    );
    return { world: current, reply: line.text, parts: line.parts, answer: tag };
  };
  if (step === "open" || step === "help") {
    const decided = evaluateReplyMeaning(world, {
      turnKey,
      actorPersonId: personId,
      playerPersonId,
      decisionType: `life-talk.running-${step}`,
      subjectKind: "context:running-for-office",
      subjectKey: step,
      standing: conversationStanding(
        world,
        playerPersonId,
        personId,
        "life.talk.running",
      ),
      meanings: step === "open" ? OPEN_MEANINGS : HELP_MEANINGS,
      traitLeans: step === "open" ? OPEN_LEANS : HELP_LEANS,
      playerLeans: [],
    });
    const traced = recordDurableDecisionTrace(
      decided.world,
      decided.evaluation,
    );
    const tone = standingTone(traced, personId, playerPersonId);
    const meaning =
      decided.meaning === "counter" ? "undecided" : decided.meaning;
    const key: LifeReplyKey =
      step === "open"
        ? `running-open-${meaning}-${tone}`
        : `running-help-${meaning}`;
    return answer(
      traced,
      key,
      `running-${step}-${decided.evaluation.selectedOptionKey ?? "none"}`,
    );
  }
  if (step === "when") {
    const election = electionAhead(world, playerPersonId);
    return answer(
      world,
      election
        ? daysBetween(world.currentDate, election.date) <= 60
          ? "running-election-soon"
          : "running-election-later"
        : "running-election-unknown",
      "running-when",
    );
  }
  if (step === "news") {
    const matter = currentKnownMatter(world, playerPersonId);
    const awareness = matter
      ? matterAwareness(world, personId, matter.eventId)
      : "uninformed";
    return answer(
      world,
      `running-news-${awareness}`,
      `running-news-${awareness}`,
    );
  }
  if (step === "remember")
    return answer(
      world,
      sharedMemory(world, playerPersonId, personId)
        ? "running-remember"
        : "running-no-memory",
      "running-remember",
    );
  return answer(world, worryReplyKey(world, personId), "running-worry");
}
