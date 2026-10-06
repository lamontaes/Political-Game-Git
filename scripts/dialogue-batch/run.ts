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
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  activeWorkRelationshipsAt,
  ageOnDate,
  createCampaignElectionTransitionRegistry,
  personName,
} from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { LIFE_MIND_IDS } from "../../src/simulation/life-mind-content";
import { activeOrdinaryGoal } from "../../src/simulation/life-personality";
import { OPENING_LIFE_SCENES } from "../../src/simulation/opening-life-content";
import { describePersonContext } from "../../src/simulation/person-context";
import {
  latestPersonalValue,
  latestPersonalityTendency,
} from "../../src/simulation/queries";
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
  invitationAgreeLine,
  invitationDeclineLine,
} from "../../src/presentation/refusal-english";
import {
  matterUninformedLine,
  officialViewLine,
} from "../../src/presentation/small-talk-english";
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
}

export interface BatchOptions {
  readonly seed: string;
  /** The player's age in each world; one world per age (2 to 4). */
  readonly ages: readonly number[];
  /** Days the first adult world is moved forward so news and press exist. */
  readonly newsDays: number;
  /** How many lines to keep, in priority order. */
  readonly max: number;
}

export const DEFAULT_AGES: readonly number[] = [6, 17, 34, 52];

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
const isSibling = (person: Person) =>
  /brother|sister|sibling/.test(person.relation ?? "");

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

// The leisure and company answers, read the way the conversation reads them.
function leisureOf(world: World, id: EntityId): string {
  if (activeOrdinaryGoal(world, id, "learning")) return "explore";
  if (activeOrdinaryGoal(world, id, "connection")) return "company";
  if (
    latestPersonalValue(world, id, LIFE_MIND_IDS.learning)?.orientation ===
    "embraces"
  )
    return "explore";
  return (
    latestPersonalityTendency(world, id, LIFE_MIND_IDS.leisure)
      ?.expressionKey ?? "familiar"
  );
}

function acceptsGame(world: World, id: EntityId): boolean {
  return (
    !activeOrdinaryGoal(world, id, "privacy") &&
    leisureOf(world, id) !== "explore"
  );
}

function willingToDate(world: World, id: EntityId): boolean {
  return (
    !activeOrdinaryGoal(world, id, "privacy") &&
    latestPersonalValue(world, id, LIFE_MIND_IDS.connection)?.orientation ===
      "embraces"
  );
}

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
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

/** The scene question's key, as the conversation maps a scene to a reply. */
const SCENE_QUESTION: Readonly<Record<string, LifeReplyKey>> = {
  "early.school.lunchbox-swap": "do-you-want-to-keep-your-snack",
  "early.peer.sidewalk-game": "shall-we-try-one-round-with-that",
  "early.peer.secret-whisper": "do-you-want-to-talk-about-the",
  "early.peer.dropped-treat": "can-you-stay-with-me-for-a",
  "early.peer.roughhouse-line": "do-you-want-to-stop-playing-tag",
  "early.community.library-quiet": "should-we-move-farther-apart-so-we",
  "early.school.crayon-sharing": "can-i-use-the-crayon-when-you",
  "early.school.playground-turn": "do-you-want-a-turn-on-the",
  "early.school.spilled-paint": "can-you-help-blot-the-paper",
  "early.peer.toy-damage-accidental": "can-you-show-me-the-wheel",
  "adult.home.shared-time": "would-you-like-to-talk-about-your",
  "early.community.lost-pet-flyer": "shall-we-look-at-the-flyer-together",
  "early.community.sidewalk-curb": "will-you-wait-here-with-me",
  "early.family.packing-boxes": "is-there-a-toy-you-want-to",
  "adult.trans.college-vs-work": "what-would-you-like-to-know-before",
  "adult.trans.drop-class-keep-job": "do-you-want-to-ask-about-another",
  "young.home.ask-about-childhood": "what-would-you-like-to-know-about",
  "early.community.curious-neighbor": "do-you-like-your-teacher",
};
const SCENE_BY_PARENT: Readonly<
  Record<string, readonly [LifeReplyKey, LifeReplyKey]>
> = {
  "early.home.broken-mug": [
    "tell-me-what-happened-leave-the-pieces",
    "we-should-ask-for-help-with-the",
  ],
  "early.home.bedtime-delay": [
    "it-is-bedtime-put-the-toy-away",
    "it-is-time-to-put-the-toy",
  ],
  "early.home.food-refusal": [
    "would-you-try-one-bite-you-can",
    "you-do-not-have-to-pretend-you",
  ],
};

function sceneQuestion(
  setting: "home" | "school" | "neighborhood",
): (ctx: WorldContext) => Produced {
  return (ctx) => {
    const options = OPENING_LIFE_SCENES.filter(
      (scene) =>
        scene.setting === setting &&
        ctx.playerAge >= scene.ages[0] &&
        ctx.playerAge <= scene.ages[1] &&
        (SCENE_QUESTION[scene.key] || SCENE_BY_PARENT[scene.key]),
    ).flatMap((scene) => {
      const speakers = ctx.cast.filter((person) =>
        scene.cast === "guardian"
          ? isParent(person)
          : scene.cast === "peer"
            ? isPeer(person)
            : scene.cast === "sibling"
              ? isSibling(person)
              : scene.cast === "housemate"
                ? /housemate|roommate|partner|spouse|husband|wife/.test(
                    person.relation ?? "",
                  )
                : false,
      );
      return speakers.map((speaker) => ({ scene, speaker }));
    });
    if (options.length === 0)
      skip(
        `no authored ${setting} scene fits a ${ctx.playerAge}-year-old with someone from the cast`,
      );
    const { scene, speaker } =
      options[Math.floor(ctx.random() * options.length)]!;
    const byParent = SCENE_BY_PARENT[scene.key];
    const key = byParent
      ? byParent[isParent(speaker) ? 0 : 1]
      : SCENE_QUESTION[scene.key]!;
    const line = reply(ctx, speaker, key);
    return {
      axis: "place",
      composer: "lifeReplyLine (scene question) in life-reply-english.ts",
      situation: `${setting === "home" ? "At home" : setting === "school" ? "At school" : "In the neighborhood"}, in the authored scene "${scene.key}" (${scene.premise.replace(/\{\w+\}/g, speaker.given)}), ${ctx.playerName} asks ${describeWho(speaker)} what is happening here.`,
      speaker,
      line: line.text,
      parts: line.parts,
      harness: [
        `The scene is authored content for ages ${scene.ages.join("-")}; it was not live in the world's own record, so the harness set it and chose the speaker whose relation the scene's cast asks for.`,
        `Reply key ${key} is the one the conversation maps this scene to.`,
      ],
    };
  };
}

function invitationAccept(ctx: WorldContext): Produced {
  const speaker = ctx.cast.find(
    (person) => person.age >= 5 && acceptsGame(ctx.world, person.id),
  );
  if (!speaker) return skip("nobody in the cast would take up a game");
  const line = worded(
    () =>
      invitationAgreeLine(
        ctx.world,
        speaker.id,
        ctx.playerId,
        [],
        "dialogue-batch:invite-game-accept",
        "game",
      ),
    "invitationAgreeLine game",
  );
  return {
    axis: "interaction",
    composer: "invitationAgreeLine in refusal-english.ts",
    situation: `${ctx.playerName} suggests playing a game together to ${describeWho(speaker)}, who is free to say yes (no privacy goal; leisure style "${leisureOf(ctx.world, speaker.id)}").`,
    speaker,
    line: line.text,
    parts: line.parts,
    harness: [
      "The suggestion is the harness's; the decision rule is the conversation's own.",
    ],
  };
}

function invitationDecline(ctx: WorldContext): Produced {
  for (const speaker of ctx.cast) {
    if (speaker.age < 5 || acceptsGame(ctx.world, speaker.id)) continue;
    let line: { text: string; parts: readonly ComposedPart[] } | null = null;
    try {
      line = invitationDeclineLine(
        ctx.world,
        speaker.id,
        ctx.playerId,
        [],
        "dialogue-batch:invite-game-decline",
        "game",
      );
    } catch {
      line = null;
    }
    if (!line) continue;
    const why = activeOrdinaryGoal(ctx.world, speaker.id, "privacy")
      ? "an active goal to keep to themselves"
      : `a leisure style of "${leisureOf(ctx.world, speaker.id)}"`;
    return {
      axis: "interaction",
      composer: "invitationDeclineLine in refusal-english.ts",
      situation: `${ctx.playerName} suggests playing a game together to ${describeWho(speaker)}, whose record gives ${why}.`,
      speaker,
      line: line.text,
      parts: line.parts,
      harness: [
        "The suggestion is the harness's; the refusal reason is read from the person's own records.",
      ],
    };
  }
  return skip("nobody in the cast has a recorded reason to turn down a game");
}

function dateDecline(ctx: WorldContext): Produced {
  const speaker = ctx.cast.find(
    (person) =>
      person.age >= 18 &&
      ctx.playerAge >= 18 &&
      !isParent(person) &&
      !isSibling(person) &&
      !/grand|uncle|aunt|cousin/.test(person.relation ?? "") &&
      !willingToDate(ctx.world, person.id),
  );
  if (!speaker)
    return skip("no adult non-relative in the cast who would decline");
  const line = worded(
    () =>
      invitationDeclineLine(
        ctx.world,
        speaker.id,
        ctx.playerId,
        [],
        "dialogue-batch:invite-date-decline",
        "date",
      ),
    "invitationDeclineLine date",
  );
  return {
    axis: "relationship",
    composer: "invitationDeclineLine (date) in refusal-english.ts",
    situation: `${ctx.playerName} asks ${describeWho(speaker)} if they would like this to be a date; their record shows no openness to it.`,
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
      speaker,
      line: line.text,
      parts: line.parts,
    };
  }
  return skip("no one in this world has formed a view of an official yet");
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
    speaker,
    line: line.text,
    parts: line.parts,
  };
}

const SITUATIONS: readonly Situation[] = [
  // The sixteen kept first, spread across the composers.
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
  { id: "scene-home", run: sceneQuestion("home") },
  { id: "scene-school", run: sceneQuestion("school") },
  { id: "invite-game-accept", run: invitationAccept },
  { id: "invite-game-decline", run: invitationDecline },
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
  // Fallbacks, used only when one above cannot be worded in any world.
  { id: "told-plan-second-listener", run: toldPlan(1) },
  { id: "scene-neighborhood", run: sceneQuestion("neighborhood") },
  { id: "school-offer", run: schoolReply("offer") },
  { id: "invite-date-decline", run: dateDecline },
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

export function runDialogueBatch(options: BatchOptions): BatchResult {
  if (options.ages.length < 1 || options.ages.length > 4)
    throw new Error("Use one to four worlds.");
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
  SITUATIONS.forEach((situation, order) => {
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
      });
      return;
    }
    skipped.push({ id: situation.id, reason: reasons.join(" | ") });
  });
  return { seed: options.seed, worlds: summaries, lines, skipped };
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
  for (const line of result.lines)
    out.push(
      `[${line.axis}] ${line.id} — ${line.speaker.name} (${line.speaker.age}): "${line.line}"`,
    );
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
    max: Number(opt("max", "16")),
  };
  if (
    options.ages.some((age) => !Number.isInteger(age) || age < 0) ||
    !Number.isInteger(options.newsDays) ||
    options.newsDays < 0 ||
    !Number.isInteger(options.max) ||
    options.max < 1
  )
    throw new Error(
      "Use --seed S, --ages a,b,c (1 to 4), --news-days N, --max N and --out FILE.",
    );
  const out = opt("out", `test-results/dialogue-batch/${options.seed}.json`);
  const result = runDialogueBatch(options);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(batchSummary(result));
  console.log(`\nWrote ${out}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
