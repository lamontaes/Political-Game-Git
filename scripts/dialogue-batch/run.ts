/**
 * The dialogue batch: real English-engine lines from varied situations.
 *
 *   node --import tsx scripts/dialogue-batch/run.ts --seed batch3-oct6 \
 *     --out test-results/dialogue-batch/batch3.json
 *
 * The dialogue report only opens the conversations a world offers, and those
 * are nearly all "wants to meet", which the engine does not word yet. This
 * tool builds real worlds through the ordinary new-game setup (the same place
 * draw as the report) and then asks the game's own English composers for the
 * line a real person from that world would say in a chosen situation. Every
 * line is exactly what a composer returned. Nothing here writes, edits or
 * fills in any wording: when a composer cannot word a situation from the
 * records, the situation is skipped and the reason is logged.
 *
 * Each situation varies one axis (pose, place, interaction, trait, experience,
 * belief, relationship, mood). A few situations need the harness to choose
 * which composer key a spoken intent maps to (the same mapping the
 * conversation uses); those are named in each line's `harness` notes, so a
 * reviewer can tell the record's facts from the harness's choices.
 *
 * This is a development tool for reviewing wording. It is never part of play.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { gradingBatchId, toGradingBatch, writeCoverageLedger } from "./grading";
import { readKinds } from "./kinds";
import { batchStats, statsSummary, type BatchStat } from "./stats";
import { LIFE_TALK_INTENTS } from "../../src/presentation/life-conversation";
import { dirname } from "node:path";
import {
  activeWorkRelationshipsAt,
  ageOnDate,
  createCampaignElectionTransitionRegistry,
  personName,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { activeOrdinaryGoal } from "../../src/simulation/life-personality";
import { describePersonContext } from "../../src/simulation/person-context";
import {
  chosenReasons,
  evaluateSentence,
  prepareJudge,
  sentencingJudge,
  type CourtCase,
} from "../../src/simulation/justice/court-reasoning";
import { householdMembershipsAt } from "../../src/simulation/life-queries";
import { stateKeyForJurisdiction } from "../../src/simulation/state-jurisdiction-id";
import { observedTraitLabels } from "../../src/simulation/people-traits";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "../../src/simulation/press-interviews";
import { createOpeningLifeController } from "../../src/presentation/opening-life";
import { explicitNewGameSetup } from "../../src/presentation/new-game-geography";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import { DEFAULT_INTERRUPTIONS } from "../../src/presentation/shell-navigation";
import {
  chooseStoryOption,
  projectStoryMoment,
} from "../../src/presentation/life-story";
import type { ComposedPart } from "../../src/presentation/english-composition";
import {
  LIFE_REPLY_BANKS,
  lifeReplyLine,
  type LifeReplyKey,
} from "../../src/presentation/life-reply-english";
import {
  composeSubjectReply,
  NEIGHBORHOOD_MENTION,
  SCHOOL_OFFER,
  SCHOOL_RAISE,
} from "../../src/presentation/subject-reply-english";
import {
  standingTone,
  type ReplyTone,
} from "../../src/presentation/reply-meaning";
import { everydayLine } from "../../src/presentation/everyday-english";
import {
  composePressLine,
  reporterQuestionPacket,
} from "../../src/presentation/press-english";
import {
  matterUninformedLine,
  officialViewLine,
  greetAgainLine,
} from "../../src/presentation/small-talk-english";
import {
  commitLifeConversation,
  projectLifeConversation,
} from "../../src/presentation/life-conversation";
import {
  currentKnownMatter,
  matterAwareness,
} from "../../src/presentation/current-matters";
import {
  tellableTopics,
  tellAnswer,
} from "../../src/presentation/life-talk-topics";
import {
  answerRunning,
  type RunningIntent,
} from "../../src/presentation/life-talk-running";
import { speakerTraits } from "../../src/presentation/speaker-traits";
import { placeFor, rng } from "../playtest/mass-play/driver";
import {
  composePressRequestPitch,
  composeReporterQuestion,
  plannedPressArrangementPlace,
} from "../../src/presentation/press-request";
import { pressAnswerPacket } from "../../src/presentation/press-english";
import {
  addSimulationMinutes,
  arrangeAcceptedPressInterview,
  producePressRequestResponse,
  projectEligiblePressReporters,
  projectPitchablePressBases,
  recordPressRequest,
} from "../../src/simulation";

export type BatchAxis =
  | "pose"
  | "place"
  | "interaction"
  | "trait"
  | "experience"
  | "belief"
  | "relationship"
  | "mood";

export interface BatchLine {
  readonly id: string;
  /** What this line calibrates. */
  readonly axis: BatchAxis;
  /** The composer function and file that produced the line. */
  readonly composer: string;
  /** Plain English, from the actual records: who, where, what happened. */
  readonly situation: string;
  readonly speaker: {
    readonly name: string;
    readonly age: number;
    /** How the player knows them ("your mom"), or null for a stranger. */
    readonly relation: string | null;
    /** True when the line is the player's own. */
    readonly isPlayer: boolean;
    /** The recorded voice cues the engine reads for this person. */
    readonly traits: Readonly<Record<string, string>>;
    /** The temperament words the person card shows, when any were recorded. */
    readonly observed: readonly string[];
  };
  /** Exactly what the composer returned. */
  readonly line: string;
  /** The part keys (bank:part:variant) the engine used. */
  readonly parts: readonly string[];
  /** Which world the situation came from. */
  readonly world: {
    readonly place: string;
    readonly player: string;
    readonly playerAge: number;
    readonly date: string;
  };
  /** What the harness chose, as opposed to what the records hold. */
  readonly harness: readonly string[];
  /** The turn this line answers, when the situation records one. */
  readonly prior?: string;
  /** The seed and world the line came from, when runs were combined. */
  readonly seed?: string;
}

export interface BatchSkip {
  readonly id: string;
  readonly reason: string;
}

export interface BatchWorldSummary {
  readonly index: number;
  readonly place: string;
  readonly player: string;
  readonly playerAge: number;
  readonly date: string;
  readonly advancedDays: number;
  readonly people: number;
}

export interface BatchResult {
  readonly seed: string;
  readonly worlds: readonly BatchWorldSummary[];
  readonly lines: readonly BatchLine[];
  readonly skipped: readonly BatchSkip[];
  /** Kinds of text no world produced, each with why. */
  readonly absent?: readonly {
    readonly kind: string;
    readonly reason: string;
  }[];
  /** The lines measured against the everyday register card. */
  readonly stats: readonly BatchStat[];
}

export interface BatchOptions {
  readonly seed: string;
  /** The player's age in each world; one world per age (2 to 8). */
  readonly ages: readonly number[];
  /** Days the first adult world is moved forward so news and press exist. */
  readonly newsDays: number;
  /** How many lines to keep, in priority order. */
  readonly max: number;
}

export const DEFAULT_AGES: readonly number[] = [28, 34, 42, 50, 58, 64, 68, 70];

// ---------------------------------------------------------------------------
// Worlds and the people in them
// ---------------------------------------------------------------------------

const PARENT_RELATIONS = new Set([
  "your mom",
  "your dad",
  "your parent",
  "your guardian",
]);

interface Person {
  readonly id: EntityId;
  readonly name: string;
  readonly given: string;
  readonly age: number;
  /** How the player knows them, or null for a local with no recorded tie. */
  readonly relation: string | null;
  readonly tone: ReplyTone;
}

interface WorldContext {
  readonly index: number;
  readonly world: World;
  readonly playerId: EntityId;
  readonly place: string;
  readonly playerName: string;
  readonly playerAge: number;
  readonly cast: readonly Person[];
  readonly hasNews: boolean;
  readonly random: () => number;
  /** Per-world memory shared by situations (for example the first listener used). */
  readonly memo: Map<string, unknown>;
}

class Skip extends Error {}
const skip = (reason: string): never => {
  throw new Skip(reason);
};

function personOf(
  world: World,
  playerId: EntityId,
  id: EntityId,
  relation: string | null,
): Person {
  const record = world.people[id]!;
  return {
    id,
    name: personName(record),
    given: record.givenName,
    age: ageOnDate(record.birthDate, world.currentDate),
    relation,
    tone: standingTone(world, id, playerId),
  };
}

function castOf(world: World, playerId: EntityId): readonly Person[] {
  const cast: Person[] = [];
  for (const id of world.personOrder) {
    if (id === playerId) continue;
    const relation = describePersonContext(world, playerId, id)?.relationship;
    if (relation) cast.push(personOf(world, playerId, id, relation));
  }
  return cast;
}

const isParent = (person: Person) =>
  PARENT_RELATIONS.has(person.relation ?? "");
const isPeer = (person: Person) =>
  /classmate|from your school/.test(person.relation ?? "");
/** Scans the whole world for a person the cast does not already hold. */
function findLocal(
  ctx: WorldContext,
  matches: (person: Person) => boolean,
  adultsOnly = true,
): Person | null {
  const known = new Set(ctx.cast.map((person) => person.id));
  for (const id of ctx.world.personOrder) {
    if (id === ctx.playerId || known.has(id)) continue;
    const record = ctx.world.people[id]!;
    if (adultsOnly && ageOnDate(record.birthDate, ctx.world.currentDate) < 18)
      continue;
    const person = personOf(ctx.world, ctx.playerId, id, null);
    if (matches(person)) return person;
  }
  return null;
}

function voiceOf(world: World, id: EntityId): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [key, fact] of Object.entries(speakerTraits(world, id)))
    if (key.startsWith("expression:") || key.startsWith("principle:"))
      out[key] = fact.text;
  return out;
}

function speakerOf(ctx: WorldContext, person: Person): BatchLine["speaker"] {
  return {
    name: person.name,
    age: person.age,
    relation: person.relation,
    isPlayer: person.id === ctx.playerId,
    traits: voiceOf(ctx.world, person.id),
    observed: observedTraitLabels(ctx.world, person.id),
  };
}

const hasVoice = (ctx: WorldContext, person: Person, key: string) =>
  Object.hasOwn(voiceOf(ctx.world, person.id), key);

function describeWho(person: Person): string {
  return person.relation
    ? `${person.relation}, ${person.name} (${person.age})`
    : `${person.name} (${person.age}), a local resident with no recorded tie to the player`;
}

function buildWorld(
  seed: string,
  index: number,
  age: number,
): { world: World; playerId: EntityId; place: string } {
  const states = lifePlaceStateIdentities();
  const random = rng(`${seed}:${index}`);
  // A state with no startable locality is skipped for the next draw.
  let place: ReturnType<typeof placeFor> = null;
  while (!place) {
    const state = states[Math.floor(random() * states.length)]!;
    place = placeFor(state.usps, random);
  }
  const setup = explicitNewGameSetup({
    placeKey: place.key,
    seed: `${seed}-${index}`,
    startAge: age as never,
    depth: "summarize-earlier-life",
  });
  const game = createOpeningLifeController(setup).finishTransition().game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
    place: place.displayName,
  };
}

/** Moves a world forward the way the Day button does, so news and press exist. */
function advanceDays(
  start: World,
  playerId: EntityId,
  days: number,
  seed: string,
  random: () => number,
): { world: World; advanced: number } {
  const handlers = createCampaignElectionTransitionRegistry();
  let world = start;
  let advanced = 0;
  for (let day = 0; day < days; day += 1) {
    for (let answered = 0; answered < 5; answered += 1) {
      const { scene } = projectStoryMoment(world, playerId);
      if (scene.kind === "ordinary-stretch" || scene.options.length === 0)
        break;
      const option =
        scene.options[Math.floor(random() * scene.options.length)]!;
      world = chooseStoryOption(world, {
        personId: playerId,
        scene,
        optionKey: option.key,
        transitionHandlers: handlers,
      });
    }
    const result = submitTimeCommand(world, {
      requestId: `${seed}-batch-day-${day}`,
      personId: playerId,
      sourceMoment: world.currentMoment,
      command: { kind: "days", days: 1 },
      interruptions: DEFAULT_INTERRUPTIONS,
    });
    world = result.world;
    // A Day held by a meeting or a refusal ends the advance; the world as it
    // stands is still a real world.
    if (result.receipt.status !== "accepted") break;
    advanced += 1;
  }
  return { world, advanced };
}

// ---------------------------------------------------------------------------
// What a situation returns
// ---------------------------------------------------------------------------

interface Produced {
  readonly axis: BatchAxis;
  readonly composer: string;
  readonly situation: string;
  readonly speaker: Person;
  readonly line: string;
  readonly parts: readonly ComposedPart[];
  readonly harness?: readonly string[];
  /** The turn the line answers, when the situation records one. */
  readonly prior?: string;
}

const partKeys = (parts: readonly ComposedPart[]) =>
  parts.map((part) => part.partKey);

/** A composer that cannot word the situation says so; the situation is skipped. */
function worded<T>(attempt: () => T | null, what: string): T {
  let result: T | null = null;
  try {
    result = attempt();
  } catch (error) {
    skip(`${what}: ${String((error as Error).message ?? error)}`);
  }
  return result ?? skip(`${what}: the composer returned no line`);
}

function reply(
  ctx: WorldContext,
  speaker: Person,
  key: LifeReplyKey,
  facts: Parameters<typeof lifeReplyLine>[5] = {},
) {
  if (!LIFE_REPLY_BANKS[key]) skip(`no life reply bank named ${key}`);
  return worded(
    () => lifeReplyLine(ctx.world, speaker.id, ctx.playerId, [], key, facts),
    `lifeReplyLine ${key}`,
  );
}

function playerFact(ctx: WorldContext) {
  return {
    listener: {
      text: ctx.world.people[ctx.playerId]!.givenName,
      sourceRecordIds: [ctx.playerId],
    },
  };
}

const youngPlayer = (ctx: WorldContext) => ctx.playerAge < 13;

// ---------------------------------------------------------------------------
// The situations, in priority order
// ---------------------------------------------------------------------------

interface Situation {
  readonly id: string;
  readonly run: (ctx: WorldContext) => Produced;
}

function greeting(
  ctx: WorldContext,
  speaker: Person,
  label: string,
  note: string,
): Produced {
  const line = reply(ctx, speaker, "first-greeting", playerFact(ctx));
  return {
    axis: "trait",
    composer: "lifeReplyLine (first-greeting) in life-reply-english.ts",
    situation: `${ctx.playerName} says hello for the first time to ${describeWho(speaker)}${label}. ${note}`,
    prior: LIFE_TALK_INTENTS.greet,
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

function rememberTopic(ctx: WorldContext): Produced {
  const matter = currentKnownMatter(ctx.world, ctx.playerId);
  if (!matter) return skip("no current news in this world to remember");
  const speaker = ctx.cast.find((person) => person.age >= 13);
  if (!speaker) return skip("nobody old enough in the cast");
  const line = reply(ctx, speaker, "remembered-topic", {
    topic: { text: matter.headline, sourceRecordIds: [matter.eventId] },
  });
  return {
    axis: "experience",
    composer: "lifeReplyLine (remembered-topic) in life-reply-english.ts",
    situation: `${ctx.playerName} asks ${describeWho(speaker)} about an earlier conversation, which was about this real item of news: "${matter.headline}"`,
    prior: LIFE_TALK_INTENTS.remember,
    speaker,
    line: line.text,
    parts: line.parts,
    harness: [
      "The earlier conversation is not in the world's record; the headline and its event are real, and the harness set the memory.",
    ],
  };
}

interface TellCandidate {
  readonly speaker: Person;
  readonly topicKey: string;
  readonly topicLabel: string;
  readonly reply: string;
  readonly parts: readonly ComposedPart[];
}

function tellCandidates(ctx: WorldContext): readonly TellCandidate[] {
  const cached = ctx.memo.get("tell") as readonly TellCandidate[] | undefined;
  if (cached) return cached;
  const out: TellCandidate[] = [];
  for (const speaker of ctx.cast) {
    const topic = tellableTopics(ctx.world, ctx.playerId, speaker.id)[0];
    if (!topic) continue;
    try {
      const answer = tellAnswer(ctx.world, ctx.playerId, speaker.id, topic, {
        parentOfYoungPlayer: isParent(speaker) && youngPlayer(ctx),
      });
      out.push({
        speaker,
        topicKey: topic.key,
        topicLabel: topic.label,
        reply: answer.reply,
        parts: answer.parts,
      });
    } catch {
      // A listener the composer cannot word is left out.
    }
  }
  ctx.memo.set("tell", out);
  return out;
}

function toldPlan(which: 0 | 1): (ctx: WorldContext) => Produced {
  return (ctx) => {
    const all = tellCandidates(ctx);
    // The second listener is the first whose answer differs from the first's.
    const first = all[0];
    const chosen =
      which === 0
        ? first
        : first
          ? all.find((entry) => entry.reply !== first.reply)
          : undefined;
    if (!chosen)
      return skip(
        which === 0
          ? "no one in the cast has a plan of the player's to be told"
          : "every listener answered the same, so there is no contrast",
      );
    return {
      axis: "relationship",
      composer: "tellAnswer in life-talk-topics.ts",
      situation: `${ctx.playerName} tells ${describeWho(chosen.speaker)} something from their own life ("${chosen.topicLabel}"); the listener's answer comes from how they stand with the player (${chosen.speaker.tone}).`,
      speaker: chosen.speaker,
      line: chosen.reply,
      parts: chosen.parts,
      prior: chosen.topicLabel,
    };
  };
}

function running(step: "open" | "worry"): (ctx: WorldContext) => Produced {
  return (ctx) => {
    if (ctx.playerAge < 17) skip("the player is too young to run for office");
    const speaker = ctx.cast.find((person) => person.age >= 13);
    if (!speaker) return skip("nobody old enough in the cast");
    const answer = worded(
      () =>
        answerRunning(
          ctx.world,
          ctx.playerId,
          speaker.id,
          `running:${step}` as RunningIntent,
          `dialogue-batch:running:${step}:${speaker.id}`,
        ),
      `answerRunning ${step}`,
    );
    return {
      axis: "trait",
      composer: "answerRunning in life-talk-running.ts",
      situation:
        step === "open"
          ? `${ctx.playerName} tells ${describeWho(speaker)} they are thinking of running for office; the listener decides from their recorded temperament and how they stand with the player.`
          : `${ctx.playerName} asks ${describeWho(speaker)} what worries them about running for office; the answer reads their recorded traits.`,
      speaker,
      line: answer.reply,
      parts: answer.parts,
      harness: [
        "The player has not recorded an aim to run; the harness raised the step so the listener's reply could be read.",
      ],
    };
  };
}

function schoolReply(
  bankName: "raise" | "offer",
): (ctx: WorldContext) => Produced {
  return (ctx) => {
    const speaker = ctx.cast.find(isPeer);
    if (!speaker) return skip("no classmate or schoolmate in the cast");
    const result = worded(
      () =>
        composeSubjectReply(
          ctx.world,
          `dialogue-batch:school:${bankName}`,
          speaker.tone,
          bankName === "raise" ? SCHOOL_RAISE : SCHOOL_OFFER,
          speaker.id,
          ctx.playerId,
        ),
      `composeSubjectReply school ${bankName}`,
    );
    return {
      axis: "relationship",
      composer: "composeSubjectReply (school) in subject-reply-english.ts",
      situation:
        bankName === "raise"
          ? `At school, ${ctx.playerName} says nobody has started the shared project, to ${describeWho(speaker)}, who stands "${speaker.tone}" toward the player.`
          : `At school, ${ctx.playerName} offers to take on the part of the shared project nobody started, to ${describeWho(speaker)}, who stands "${speaker.tone}" toward the player.`,
      speaker,
      line: result.text,
      parts: result.parts,
      harness: [
        "The project conversation was set by the harness; the tone is read from the recorded relationship.",
      ],
    };
  };
}

function neighborhoodMention(ctx: WorldContext): Produced {
  const speaker =
    ctx.cast.find((person) => person.age >= 13 && !isParent(person)) ??
    ctx.cast.find((person) => person.age >= 13);
  if (!speaker) return skip("nobody old enough in the cast");
  const result = worded(
    () =>
      composeSubjectReply(
        ctx.world,
        "dialogue-batch:neighborhood:mention",
        speaker.tone,
        NEIGHBORHOOD_MENTION,
        speaker.id,
        ctx.playerId,
      ),
    "composeSubjectReply neighborhood",
  );
  return {
    axis: "relationship",
    composer: "composeSubjectReply (neighborhood) in subject-reply-english.ts",
    situation: `In the neighborhood, ${ctx.playerName} mentions the posted meeting to ${describeWho(speaker)}, who stands "${speaker.tone}" toward the player.`,
    speaker,
    line: result.text,
    parts: result.parts,
    harness: [
      "The meeting mention was set by the harness; the tone is read from the recorded relationship.",
    ],
  };
}

function everyday(
  key: "social-accept-reply" | "social-decline-reply",
): (ctx: WorldContext) => Produced {
  return (ctx) => {
    const speaker = ctx.cast.find((person) => person.age >= 8);
    if (!speaker) return skip("nobody old enough in the cast");
    const line = worded(
      () =>
        everydayLine(
          ctx.world,
          speaker.id,
          key,
          [speaker.id, ctx.playerId],
          {},
          ctx.playerId,
        ),
      `everydayLine ${key}`,
    );
    return {
      axis: "interaction",
      composer: "everydayLine in everyday-english.ts",
      situation: `${ctx.playerName} invites ${describeWho(speaker)} over; the reply is the ${key === "social-accept-reply" ? "accepting" : "declining"} one.`,
      speaker,
      line: line.text,
      parts: line.parts,
      harness: [
        "Whether they accept is the harness's choice of key; the wording is the engine's.",
      ],
    };
  };
}

function pressQuestion(ctx: WorldContext): Produced {
  const events = [
    ...new Set(
      (ctx.world.history.publications ?? []).map((row) => row.sourceEventId),
    ),
  ];
  if (events.length === 0) return skip("no published account exists yet");
  const journalists = ctx.world.personOrder.filter(
    (id) =>
      id !== ctx.playerId &&
      activeWorkRelationshipsAt(ctx.world, id).some(
        ({ role }) =>
          role.occupationClassification ===
          JOURNALISM_OCCUPATION_CLASSIFICATION,
      ),
  );
  for (const reporterId of journalists)
    for (const eventId of events) {
      let packet: ReturnType<typeof reporterQuestionPacket> = null;
      try {
        packet = reporterQuestionPacket(
          ctx.world,
          ctx.playerId,
          reporterId,
          eventId,
        );
      } catch {
        packet = null;
      }
      if (!packet) continue;
      const subject = packet.facts.subject?.text;
      const result = composePressLine(
        packet,
        subject ? "reporter-known-topic" : "reporter-unknown-topic",
        subject ? { subject } : {},
      );
      if (!result) continue;
      const event = ctx.world.history.events.find((row) => row.id === eventId)!;
      const reporter = personOf(ctx.world, ctx.playerId, reporterId, null);
      return {
        axis: "interaction",
        composer: "composePressLine (reporter question) in press-english.ts",
        situation: `A reporter, ${reporter.name}, asks ${ctx.playerName} about a real public development (${event.summary}), ${subject ? "which the reporter has recorded knowing" : "which the reporter has no recorded account of"}.`,
        speaker: reporter,
        line: result.text,
        parts: result.parts,
      };
    }
  return skip("no reporter can be asked about a published development");
}

function matterUninformed(ctx: WorldContext): Produced {
  const matter = currentKnownMatter(ctx.world, ctx.playerId);
  if (!matter) return skip("no current news in this world");
  const speaker = ctx.cast.find(
    (person) =>
      person.age >= 13 &&
      matterAwareness(ctx.world, person.id, matter.eventId) === "uninformed",
  );
  if (!speaker) return skip("everyone in the cast already knows the news");
  const line = worded(
    () =>
      matterUninformedLine(
        ctx.world,
        speaker.id,
        ctx.playerId,
        [],
        matter.eventId,
      ),
    "matterUninformedLine",
  );
  return {
    axis: "experience",
    composer: "matterUninformedLine in small-talk-english.ts",
    situation: `${ctx.playerName} brings up the news ("${matter.headline}") with ${describeWho(speaker)}, who has no record of learning it.`,
    prior: LIFE_TALK_INTENTS.matter,
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

function matterHeard(ctx: WorldContext): Produced {
  const matter = currentKnownMatter(ctx.world, ctx.playerId);
  if (!matter) return skip("no current news in this world");
  const knower = ctx.world.history.knowledge.find(
    (record) =>
      record.eventId === matter.eventId &&
      record.personId !== ctx.playerId &&
      matterAwareness(ctx.world, record.personId, matter.eventId) !==
        "uninformed",
  );
  if (!knower) return skip("nobody has a recorded knowledge of the news");
  const speaker = personOf(ctx.world, ctx.playerId, knower.personId, null);
  const awareness = matterAwareness(ctx.world, speaker.id, matter.eventId);
  const line = reply(
    ctx,
    speaker,
    awareness === "involved" ? "i-was-involved-in-that" : "i-heard-about-that",
  );
  return {
    axis: "experience",
    composer: "lifeReplyLine (matter awareness) in life-reply-english.ts",
    situation: `${ctx.playerName} brings up the news ("${matter.headline}") with ${describeWho(speaker)}, who ${awareness === "involved" ? "was part of it" : "has a record of learning it"}.`,
    prior: LIFE_TALK_INTENTS.matter,
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

function officialsView(ctx: WorldContext): Produced {
  for (const id of ctx.world.personOrder) {
    if (id === ctx.playerId) continue;
    if (ageOnDate(ctx.world.people[id]!.birthDate, ctx.world.currentDate) < 18)
      continue;
    let line: { text: string; parts: readonly ComposedPart[] } | null = null;
    try {
      line = officialViewLine(ctx.world, id, ctx.playerId, []);
    } catch {
      line = null;
    }
    if (!line) continue;
    const speaker = personOf(ctx.world, ctx.playerId, id, null);
    return {
      axis: "belief",
      composer: "officialViewLine in small-talk-english.ts",
      situation: `${ctx.playerName} asks ${describeWho(speaker)} what they think of the people in office; they hold a saved view of an official over a law or something that happened to them.`,
      prior: LIFE_TALK_INTENTS.officials,
      speaker,
      line: line.text,
      parts: line.parts,
    };
  }
  return skip("no one in this world has formed a view of an official yet");
}

function greetAgain(ctx: WorldContext): Produced {
  for (const person of ctx.cast) {
    const conversation = projectLifeConversation(
      ctx.world,
      ctx.playerId,
      person.id,
    );
    if (!conversation?.intents.some((intent) => intent.key === "greet"))
      continue;
    let greeted: World;
    try {
      greeted = commitLifeConversation(ctx.world, {
        playerPersonId: ctx.playerId,
        personId: person.id,
        intent: "greet",
        revision: conversation.revision,
      });
    } catch {
      continue;
    }
    const history = greeted.history.events.filter(
      (event) =>
        event.type === "life.conversation" &&
        event.participants.some(
          (participant) =>
            participant.personId === ctx.playerId &&
            participant.role === "focus:subject",
        ) &&
        event.participants.some(
          (participant) =>
            participant.personId === person.id &&
            participant.role === "coordination:counterpart",
        ) &&
        event.occurredAt <= greeted.currentDate,
    );
    const line = greetAgainLine(greeted, person.id, ctx.playerId, history);
    if (!line) continue;
    return {
      axis: "interaction",
      composer: "greetAgainLine in small-talk-english.ts",
      situation: `${ctx.playerName} says hello again to ${describeWho(person)} after their saved conversation.`,
      prior: LIFE_TALK_INTENTS.greet,
      speaker: personOf(greeted, ctx.playerId, person.id, person.relation),
      line: line.text,
      parts: line.parts,
      harness: [
        "The batch records a first ordinary greeting in the current scene, then reads the next greeting from that saved conversation.",
      ],
    };
  }
  return skip(
    "no present person has a current scene where a greeting can be recorded",
  );
}

/**
 * A judge's sentence, in the justice code's own fixed sentences (CTO, 6:30
 * p.m. Oct 6: the first kind of text beyond conversation). The judge is the
 * sitting trial judge for the player's home court, drawn by the court's own
 * docket rule; the case is the harness's, and the judge decides it through
 * the shared decision engine. The line is exactly the reasons the code gives
 * for the sentence the judge chose.
 */
function judgeSentence(
  offenseKey: string,
  offenseLabel: string,
  pleaded: boolean,
  standingFindings: number,
) {
  return (ctx: WorldContext): Produced => {
    const home = householdMembershipsAt(ctx.world, ctx.playerId).find(
      (row) => row.location,
    )?.location;
    if (!home) return skip("the player has no recorded home");
    const defendant = findLocal(ctx, () => true);
    if (!defendant) return skip("no adult outside the player's circle");
    const jurisdiction = ctx.world.jurisdictions[home.jurisdictionId];
    const courtCase: CourtCase = {
      caseKey: `dialogue-batch:case:${offenseKey}:${pleaded ? "plea" : "trial"}:${standingFindings}`,
      defendantId: defendant.id,
      offenseKey,
      offenseLabel,
      evidence: "documentary",
      standingFindings,
      venueJurisdictionId: home.jurisdictionId,
      stateKey: jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null,
    };
    const judgeId = sentencingJudge(ctx.world, courtCase, 0);
    if (!judgeId) return skip("the home court has no sitting judge");
    const world = prepareJudge(ctx.world, judgeId);
    const decision = evaluateSentence(world, judgeId, courtCase, pleaded);
    const line = chosenReasons(decision);
    if (!line) return skip("the judge's sentence gave no reasons");
    const chosen = decision.selectedOptionKey.endsWith("jail")
      ? "jail"
      : "probation";
    return {
      axis: "interaction",
      composer: "chosenReasons (evaluateSentence) in court-reasoning.ts",
      situation: `Judge ${personName(world.people[judgeId]!)} sentences ${defendant.name} (${defendant.age}) for ${offenseLabel}${pleaded ? " after a guilty plea" : " after a trial"}. The judge chose ${chosen}.`,
      speaker: personOf(world, ctx.playerId, judgeId, "judge"),
      line,
      // Each reason is a fixed sentence in the justice code, keyed by the
      // consideration it explains, so a grade points at the sentence.
      parts: decision.context.considerations
        .filter(
          (row) =>
            row.optionKey === decision.selectedOptionKey &&
            row.direction === "supports",
        )
        .map((row) => {
          const variant = row.stableKey.split(":sentence:")[1] ?? row.stableKey;
          return {
            part: "core" as const,
            partKey: `justice.sentence:core:${variant}`,
            variantKey: variant,
            text: row.explanation,
            usedFactKeys: [],
          };
        }),
      harness: [
        `The case (${offenseLabel}, ${pleaded ? "plea" : "trial"}, ${standingFindings} standing findings) is the harness's; the judge and defendant are real people in this world.`,
      ],
    };
  };
}

/**
 * A press interview answer: the player asks a reporter for an exchange through
 * the press desk's own writers, the reporter decides from their record, and
 * if they accept the exchange is arranged and the player answers the
 * reporter's question with the answer banks.
 */
function pressAnswer(ctx: WorldContext): Produced {
  const reasons: string[] = [];
  for (const topic of projectPitchablePressBases(ctx.world, ctx.playerId)) {
    const reporters = projectEligiblePressReporters(ctx.world, {
      sourcePersonId: ctx.playerId,
      questionBasisEventIds: [topic.eventId],
    });
    for (const reporter of reporters) {
      const pitch = composePressRequestPitch({
        subjectSummary: topic.summary,
        intent: "request-exchange",
        stance: "report-what-is-recorded",
        channel: "spoken",
        terms: "on-record",
        backgroundAttribution: null,
      });
      const question = composeReporterQuestion({
        subjectSummary: topic.summary,
        terms: "on-record",
        grounding: reporterQuestionPacket(
          ctx.world,
          ctx.playerId,
          reporter.personId,
          topic.eventId,
        ),
      });
      if (!pitch.ok || !question.ok) {
        reasons.push(
          !pitch.ok ? pitch.reason : (question as { reason: string }).reason,
        );
        continue;
      }
      try {
        const asked = recordPressRequest(ctx.world, {
          stableKey: `dialogue-batch:press:${topic.eventId}:${reporter.personId}`,
          reporterPersonId: reporter.personId,
          reporterWorkRoleId: reporter.workRoleId,
          jurisdictionId: topic.jurisdictionId,
          channel: "spoken",
          terms: "on-record",
          backgroundAttribution: null,
          pitch: pitch.statement,
          primaryQuestion: question.statement,
          questionBasisEventIds: [topic.eventId],
        });
        const answered = producePressRequestResponse(asked.world, {
          stableKey: `${asked.requestEventId}:reporter-response`,
          requestEventId: asked.requestEventId,
        });
        const response = answered.world.history.events.find(
          (event) => event.id === answered.responseEventId,
        );
        if (response?.context.choice !== "accepted") {
          reasons.push(`${reporter.personName} declined`);
          continue;
        }
        const start = addSimulationMinutes(answered.world.currentMoment, 60);
        const arranged = arrangeAcceptedPressInterview(answered.world, {
          stableKey: `${asked.requestEventId}:arrangement`,
          requestEventId: asked.requestEventId,
          reporterResponseEventId: answered.responseEventId,
          adviserResponseEventId: null,
          start,
          end: addSimulationMinutes(start, 30),
          preparationMinutes: 0,
          location: {
            locationKey: `press-planned:${asked.requestEventId}`,
            label: plannedPressArrangementPlace("spoken").label,
          },
        });
        // With no preparation the player holds no recorded fact, so the
        // answer bank composePressAnswer uses is answer-unknown.
        const packet = pressAnswerPacket(arranged.world, arranged.activityId);
        const answer = packet
          ? composePressLine(packet, "answer-unknown", {
              question: question.statement,
            })
          : null;
        if (!answer) {
          reasons.push("the answer bank could not word it from the record");
          continue;
        }
        const speaker = personOf(
          arranged.world,
          ctx.playerId,
          ctx.playerId,
          null,
        );
        return {
          axis: "interaction",
          composer: "composePressLine (answer-unknown) in press-english.ts",
          situation: `In an arranged spoken interview with ${reporter.personName} about "${topic.summary}", ${ctx.playerName} answers the reporter's question with no preparation.`,
          prior: question.statement,
          speaker,
          line: answer.text,
          parts: answer.parts,
          harness: [
            "Key answer-unknown is the one composePressAnswer picks when the player holds no recorded fact.",
            "The request, the reporter's own decision and the arrangement were written through the press desk's producers; the world they wrote is discarded after this line.",
          ],
        };
      } catch (error) {
        reasons.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  return skip(
    reasons.length
      ? reasons.slice(0, 3).join("; ")
      : "no development a reporter knows",
  );
}

function privacyMood(ctx: WorldContext): Produced {
  const speaker =
    ctx.cast.find(
      (person) =>
        person.age >= 8 && activeOrdinaryGoal(ctx.world, person.id, "privacy"),
    ) ??
    findLocal(ctx, (person) =>
      Boolean(activeOrdinaryGoal(ctx.world, person.id, "privacy")),
    );
  if (!speaker) return skip("no one has an active goal to keep to themselves");
  const line = reply(ctx, speaker, "i-need-some-privacy-right-now-lets");
  return {
    axis: "mood",
    composer: "lifeReplyLine (privacy) in life-reply-english.ts",
    situation: `${ctx.playerName} asks ${describeWho(speaker)} what they would like to do; their record holds an active goal to keep to themselves.`,
    prior: LIFE_TALK_INTENTS.activity,
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

// Kept available for situation-specific tests; grading batches exclude these
// authored menu scenarios until they are backed by real played records.
export const SITUATIONS: readonly Situation[] = [
  // Core conversation, narrative and record-backed situations come first.
  {
    id: "greet-ask",
    run: (ctx) => {
      const speaker = ctx.cast.find(
        (person) =>
          person.age >= 8 &&
          !(isParent(person) && youngPlayer(ctx)) &&
          hasVoice(ctx, person, "expression:ask"),
      );
      if (!speaker)
        return skip('nobody in the cast has the recorded voice "ask"');
      return greeting(
        ctx,
        speaker,
        "",
        "Their recorded conversation style is to ask.",
      );
    },
  },
  {
    id: "greet-other-voice",
    run: (ctx) => {
      const listener = (person: Person) =>
        hasVoice(ctx, person, "expression:listen");
      const speaker =
        ctx.cast.find((person) => person.age >= 8 && listener(person)) ??
        findLocal(ctx, listener) ??
        ctx.cast.find(
          (person) =>
            person.age >= 8 &&
            !(isParent(person) && youngPlayer(ctx)) &&
            !hasVoice(ctx, person, "expression:ask"),
        ) ??
        findLocal(ctx, (person) => !hasVoice(ctx, person, "expression:ask"));
      if (!speaker) return skip('nobody has a recorded voice other than "ask"');
      return greeting(
        ctx,
        speaker,
        "",
        hasVoice(ctx, speaker, "expression:listen")
          ? "Their recorded conversation style is to listen."
          : 'Their record holds no "ask" style.',
      );
    },
  },
  { id: "greet-again", run: greetAgain },
  { id: "remember-news-topic", run: rememberTopic },
  { id: "told-plan-first-listener", run: toldPlan(0) },
  { id: "running-open", run: running("open") },
  { id: "running-worry", run: running("worry") },
  { id: "school-raise", run: schoolReply("raise") },
  { id: "neighborhood-mention", run: neighborhoodMention },
  { id: "everyday-decline", run: everyday("social-decline-reply") },
  { id: "press-reporter-question", run: pressQuestion },
  { id: "matter-uninformed", run: matterUninformed },
  { id: "officials-view", run: officialsView },
  { id: "press-answer", run: pressAnswer },
  {
    id: "judge-sentence-vandalism-plea",
    run: judgeSentence("crime:vandalism", "vandalism", true, 1),
  },
  {
    id: "judge-sentence-assault-trial",
    run: judgeSentence("crime:assault", "assault", false, 1),
  },
  {
    id: "judge-sentence-burglary-repeat",
    run: judgeSentence("crime:burglary", "burglary", false, 3),
  },
  {
    id: "judge-sentence-bribery-plea",
    run: judgeSentence("public-bribery", "public bribery", true, 1),
  },
  // Fallbacks, used only when one above cannot be worded in any world.
  { id: "told-plan-second-listener", run: toldPlan(1) },
  { id: "school-offer", run: schoolReply("offer") },
  { id: "matter-heard", run: matterHeard },
  { id: "privacy-mood", run: privacyMood },
  { id: "everyday-accept", run: everyday("social-accept-reply") },
  {
    id: "greet-parent-child",
    run: (ctx) => {
      if (!youngPlayer(ctx)) return skip("the player is not a young child");
      const speaker = ctx.cast.find(isParent);
      if (!speaker) return skip("no parent in the cast");
      const line = reply(ctx, speaker, "hi-sweetheart");
      return {
        axis: "relationship",
        composer: "lifeReplyLine (hi-sweetheart) in life-reply-english.ts",
        situation: `${ctx.playerName}, a young child, says hello to ${describeWho(speaker)}.`,
        prior: LIFE_TALK_INTENTS.greet,
        speaker,
        line: line.text,
        parts: line.parts,
        harness: [
          "Key hi-sweetheart is the one the conversation uses for a parent greeting a young child.",
        ],
      };
    },
  },
];

// ---------------------------------------------------------------------------
// The batch
// ---------------------------------------------------------------------------

/**
 * When two texts are the same thing to grade. A bank line is its part, filled
 * with other facts; any other text is its sentences' openings with names and
 * figures set aside, so "I lived in Ames. I began working at a store." and the
 * same chapter in another life count once.
 */
export function repeatKey(kind: string, text: string, partKey: string): string {
  if (partKey.startsWith("bank:")) return partKey;
  // Names and figures are the facts that differ, not the shape.
  const openings = text.split(/(?<=[.?!])\s+/).map((sentence) =>
    sentence
      .split(/\s+/)
      .slice(0, 3)
      .map((word) =>
        word === "I" ? "i" : /^[A-Z\d]/.test(word) ? "@" : word.toLowerCase(),
      )
      .join(" "),
  );
  return `${kind}|${openings.join("|")}`;
}

export function runDialogueBatch(options: BatchOptions): BatchResult {
  if (options.ages.length < 1 || options.ages.length > 8)
    throw new Error("Use one to eight worlds.");
  // The first adult world is the one moved forward, so news and press exist.
  const newsIndex = Math.max(
    0,
    options.ages.findIndex((age) => age >= 18),
  );
  const summaries: BatchWorldSummary[] = [];
  const contexts: WorldContext[] = options.ages.map((age, index) => {
    const random = rng(`${options.seed}:choices:${index}`);
    const built = buildWorld(options.seed, index, age);
    let { world } = built;
    let advancedDays = 0;
    if (index === newsIndex && options.newsDays > 0) {
      const moved = advanceDays(
        world,
        built.playerId,
        options.newsDays,
        `${options.seed}-${index}`,
        random,
      );
      world = moved.world;
      advancedDays = moved.advanced;
    }
    const playerName = personName(world.people[built.playerId]!);
    const context: WorldContext = {
      index,
      world,
      playerId: built.playerId,
      place: built.place,
      playerName,
      playerAge: ageOnDate(
        world.people[built.playerId]!.birthDate,
        world.currentDate,
      ),
      cast: castOf(world, built.playerId),
      hasNews: currentKnownMatter(world, built.playerId) !== null,
      random,
      memo: new Map(),
    };
    summaries.push({
      index,
      place: built.place,
      player: playerName,
      playerAge: context.playerAge,
      date: world.currentDate,
      advancedDays,
      people: world.personOrder.length,
    });
    return context;
  });

  const lines: BatchLine[] = [];
  const skipped: BatchSkip[] = [];
  const seenText = new Set<string>();
  // Every menu prompt is excluded: this grading batch contains only text
  // read from records created in the played worlds.
  const recordedSituations: readonly Situation[] = [];
  recordedSituations.forEach((situation, order) => {
    if (lines.length >= options.max) {
      skipped.push({ id: situation.id, reason: "over the line cap" });
      return;
    }
    const reasons: string[] = [];
    // Each situation starts in a different world, and falls through the rest.
    for (let step = 0; step < contexts.length; step += 1) {
      const ctx = contexts[(order + step) % contexts.length]!;
      let made: Produced;
      try {
        made = situation.run(ctx);
      } catch (error) {
        if (!(error instanceof Skip)) throw error;
        reasons.push(
          `world ${ctx.index} (age ${ctx.playerAge}): ${error.message}`,
        );
        continue;
      }
      if (seenText.has(made.line)) {
        reasons.push(
          `world ${ctx.index} (age ${ctx.playerAge}): the line repeats an earlier one`,
        );
        continue;
      }
      seenText.add(made.line);
      lines.push({
        id: situation.id,
        axis: made.axis,
        composer: made.composer,
        situation: made.situation,
        speaker: speakerOf(ctx, made.speaker),
        line: made.line,
        parts: partKeys(made.parts),
        world: {
          place: ctx.place,
          player: ctx.playerName,
          playerAge: ctx.playerAge,
          date: ctx.world.currentDate,
        },
        harness: made.harness ?? [],
        ...(made.prior !== undefined ? { prior: made.prior } : {}),
      });
      return;
    }
    skipped.push({ id: situation.id, reason: reasons.join(" | ") });
  });
  // The other kinds of text, read from the game's own producers: up to ten
  // each across the worlds, shared out among the worlds so no single life or
  // body fills a kind, and a reason for every kind none produced.
  const perWorld = Math.max(2, Math.ceil(10 / contexts.length));
  const perKind = new Map<string, number>();
  const why = new Map<string, string[]>();
  for (const ctx of contexts) {
    const reading = readKinds(ctx.world, ctx.playerId);
    const fromWorld = new Map<string, number>();
    for (const text of reading.texts) {
      const shape = repeatKey(text.kind, text.text, text.partKey);
      if (
        (perKind.get(text.kind) ?? 0) >= 10 ||
        (fromWorld.get(text.kind) ?? 0) >= perWorld ||
        seenText.has(shape)
      )
        continue;
      seenText.add(shape);
      fromWorld.set(text.kind, (fromWorld.get(text.kind) ?? 0) + 1);
      perKind.set(text.kind, (perKind.get(text.kind) ?? 0) + 1);
      lines.push({
        id: `text-${text.kind}-${perKind.get(text.kind)}`,
        axis: "place",
        composer: text.composer,
        situation: text.situation,
        speaker: speakerOf(
          ctx,
          personOf(ctx.world, ctx.playerId, ctx.playerId, null),
        ),
        line: text.text,
        parts: [text.partKey],
        world: {
          place: ctx.place,
          player: ctx.playerName,
          playerAge: ctx.playerAge,
          date: ctx.world.currentDate,
        },
        harness: [],
      });
    }
    for (const row of reading.absent)
      why.set(row.kind, [
        ...(why.get(row.kind) ?? []),
        `${ctx.place}: ${row.reason}`,
      ]);
  }
  const absent = [...why]
    .filter(([kind]) => !perKind.has(kind))
    .map(([kind, reasons]) => ({
      kind,
      reason: [...new Set(reasons)].join("; "),
    }));
  return {
    seed: options.seed,
    worlds: summaries,
    lines,
    skipped,
    absent,
    stats: batchStats(lines),
  };
}

export function batchSummary(result: BatchResult): string {
  const out: string[] = [
    `Dialogue batch ${result.seed}: ${result.lines.length} lines from ${result.worlds.length} worlds.`,
  ];
  for (const world of result.worlds)
    out.push(
      `  world ${world.index}: ${world.player}, age ${world.playerAge}, ${world.place}, ${world.date}${world.advancedDays ? ` (moved ${world.advancedDays} days)` : ""}`,
    );
  out.push("");
  // The whole exchange, so a grade is of the reply to something, not a line
  // on its own: the situation, the turn before (as the player saw it), then
  // the reply the engine composed.
  for (const line of result.lines)
    out.push(
      `[${line.axis}] ${line.id}`,
      `  Situation: ${line.situation}`,
      ...(line.prior !== undefined
        ? [`  ${line.world.player}: "${line.prior}"`]
        : []),
      `  ${line.speaker.name} (${line.speaker.age}): "${line.line}"`,
    );
  out.push("", "Against the everyday card:", ...statsSummary(result.stats));
  if (result.skipped.length) {
    out.push("", "Skipped:");
    for (const entry of result.skipped)
      out.push(`  ${entry.id}: ${entry.reason}`);
  }
  return out.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name: string, fallback: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1]! : fallback;
  };
  const options: BatchOptions = {
    seed: opt("seed", "dialogue-batch"),
    ages: opt("ages", DEFAULT_AGES.join(",")).split(",").map(Number),
    newsDays: Number(opt("news-days", "10")),
    max: Number(opt("max", "48")),
  };
  if (
    options.ages.some((age) => !Number.isInteger(age) || age < 0) ||
    !Number.isInteger(options.newsDays) ||
    options.newsDays < 0 ||
    !Number.isInteger(options.max) ||
    options.max < 1
  )
    throw new Error(
      "Use --seed S, --ages a,b,c (1 to 8), --news-days N, --max N and --out FILE.",
    );
  const out = opt("out", `test-results/dialogue-batch/${options.seed}.json`);
  const result = runDialogueBatch(options);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(batchSummary(result));
  console.log(`\nWrote ${out}.`);
  // The grading page's file: only exchanges that pass the rules; the rest go
  // to the bin beside it.
  const at = new Date();
  const batchId = opt("batch-id", gradingBatchId(at));
  const head =
    opt("head", "") || execSync("git rev-parse HEAD").toString().trim();
  const { batch, bin } = toGradingBatch(result, { id: batchId, head, at });
  const gradingOut = `test-results/dialogue-batch/${batchId}.json`;
  mkdirSync(dirname(gradingOut), { recursive: true });
  writeFileSync(gradingOut, `${JSON.stringify(batch, null, 2)}\n`);
  writeFileSync(
    `test-results/dialogue-batch/${batchId}.bin.json`,
    `${JSON.stringify(bin, null, 2)}\n`,
  );
  console.log(
    `Wrote ${gradingOut}: ${batch.items.length} exchanges to grade, ${bin.length} in the bin.`,
  );
  if (args.includes("--write-ledger")) {
    writeCoverageLedger(batch);
    console.log("Updated data/english/coverage.json.");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
