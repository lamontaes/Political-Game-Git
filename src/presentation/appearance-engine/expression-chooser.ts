import { claimStanceOf } from "../../simulation/claim-stances";
import { personTrait } from "../../simulation/people-traits";
import { readTrait } from "../../simulation/trait-readings";
import { traitRegistryFor } from "../../simulation/trait-registry";
import type { EntityId, HistoricalEvent, World } from "../../simulation/types";
import {
  linePartsOf,
  type ComposedLineBank,
  type SpeechAct,
} from "../english-composition";
import { standingTone, type ReplyTone } from "../reply-meaning";
import type { ConversationExchangeTurn } from "../scene-conversation";
import { SMALL_TALK_BANKS } from "../small-talk-english";
import { stableHash } from "../../simulation/ids";
import type { FaceExpression } from "./pack";

/**
 * THE FACE A PERSON MAKES, FROM WHAT IS BEING SAID AND WHO THEY ARE.
 *
 * A face that never changes reads as a mannequin. Here each person present in
 * a conversation gets an expression from two things, both already recorded:
 *
 * - the line: the tone of the turn just said, read from the turn's own event
 *   (its outcome and answer tags, the speaker's claim stance, the
 *   relationship interaction it wrote, the speech act of its composed line).
 *   The speaker shows the tone; a listener reacts to it through how they
 *   stand with the speaker (standingTone) and whether the turn strained
 *   things with them;
 * - the person: recorded traits give a resting face (a warm or cheerful
 *   person's is a soft smile, an anxious one's leans concerned, a guarded
 *   one's is neutral or skeptical) and a tilt (the quick-tempered turn angry
 *   sooner, the calm later). Unrecorded traits are never read.
 *
 * A reaction holds for its line and the next, then eases back to the resting
 * face: it is measured in turns, never in time, so nothing twitches on a
 * timer. Deterministic: every choice between two faces is drawn from the
 * person's seed. It reads the record and writes nothing.
 */

/** What a line does, as far as the record says. */
export type LineTone =
  | "agree"
  | "warm"
  | "joke"
  | "bad-news"
  | "threat"
  | "accusation"
  | "lie"
  | "refusal"
  | "praise"
  /** Nothing in the record says more than that it was said. */
  | "plain";

const OUTCOME_TONE: Readonly<Record<string, LineTone>> = {
  "proposal-accepted": "agree",
  committed: "agree",
  "commitment-offered": "agree",
  reassured: "warm",
  "proposal-refused": "refusal",
  "boundary-held": "refusal",
  "inducement-refused": "refusal",
};

const ACT_TONE: Partial<Record<SpeechAct, LineTone>> = {
  greet: "warm",
  praise: "praise",
  agree: "agree",
  offer: "warm",
  apologize: "warm",
  decline: "refusal",
  deflect: "refusal",
  complain: "accusation",
  threaten: "threat",
  lie: "lie",
};

function answerTone(answer: string): LineTone | null {
  if (
    /-accepted$|^running-open-encourage$|^running-help-will-help$/.test(answer)
  )
    return "agree";
  if (
    /-declined$|^not-now$|^private$|^running-open-discourage$|^running-help-will-not-help$/.test(
      answer,
    )
  )
    return "refusal";
  if (/^running-(worry|news-)/.test(answer)) return "bad-news";
  return null;
}

function interactionTone(
  world: World,
  event: HistoricalEvent,
): LineTone | null {
  for (const interaction of world.history.relationshipInteractions) {
    if (interaction.eventId !== event.id) continue;
    if (interaction.kind === "conflict:misled") return "accusation";
    if (interaction.kind === "conflict:pressed-for-answer") return "threat";
    if (
      interaction.kind.startsWith("conflict:") &&
      (interaction.change === "strained" || interaction.change === "ended")
    )
      return "accusation";
    if (interaction.kind === "support:celebration") return "praise";
    if (
      interaction.kind.startsWith("support:") ||
      interaction.kind === "contact:shared-moment"
    )
      return "warm";
  }
  return null;
}

function bankOf(partKey: string): ComposedLineBank | undefined {
  return (SMALL_TALK_BANKS as readonly ComposedLineBank[]).find((bank) =>
    partKey.startsWith(`${bank.key}:`),
  );
}

/**
 * The tone of one recorded turn. The speaker's own stance comes first (a
 * deliberate lie is a lie whatever else the turn did), then what it did to
 * the relationship, then how it ended, then how the line was composed.
 */
export function lineTone(world: World, event: HistoricalEvent): LineTone {
  const stance = claimStanceOf(event);
  if (stance?.intent === "deceive") return "lie";
  if (stance?.intent === "evade") return "refusal";
  const byInteraction = interactionTone(world, event);
  if (byInteraction) return byInteraction;
  for (const tag of event.tags) {
    if (tag.startsWith("conversation.outcome.")) {
      const tone = OUTCOME_TONE[tag.slice("conversation.outcome.".length)];
      if (tone) return tone;
    }
    if (tag.startsWith("life.answer:")) {
      const tone = answerTone(tag.slice("life.answer:".length));
      if (tone) return tone;
    }
  }
  // Suggesting a game is the one recorded line that is play.
  if (event.tags.includes("life.talk:suggestGame")) return "joke";
  for (const key of linePartsOf(event.tags) ?? []) {
    const act = bankOf(key)?.act;
    const tone = act ? ACT_TONE[act] : undefined;
    if (tone) return tone;
  }
  return "plain";
}

/** A recorded catalogue quality's value, or null when it is not recorded. */
function recordedQuality(
  world: World,
  personId: EntityId,
  key: string,
): number | null {
  const trait = traitRegistryFor(world).traits.get(`personality-v1:${key}`);
  if (!trait) return null;
  const reading = readTrait(world, personId, trait);
  return reading.state === "recorded" ? reading.value : null;
}

function recordedCore(
  world: World,
  personId: EntityId,
  trait: "sociability" | "conflict",
): number | null {
  const reading = personTrait(world, personId, trait);
  return reading.recordId === null ? null : reading.value;
}

/** What a person's recorded temperament does to their face. */
export interface FaceTemperament {
  /** Their face when nothing is happening. */
  readonly rest: FaceExpression;
  /** Anger shows sooner (quick) or later (calm) than in most people. */
  readonly temper: "quick" | "calm" | null;
}

function draw(seed: string, question: string): number {
  return (
    Number.parseInt(stableHash(`${seed}:${question}`).slice(0, 8), 16) /
    0x100000000
  );
}

/**
 * The face a person rests in and how quickly they anger, from recorded
 * traits only. Nobody recorded rests neutral with an ordinary temper.
 */
export function faceTemperament(
  world: World,
  personId: EntityId,
  seed: string,
): FaceTemperament {
  const q = (key: string) => recordedQuality(world, personId, key);
  const leans = (value: number | null) => value !== null && value > 0;
  const lowers = (value: number | null) => value !== null && value < 0;

  const quick =
    leans(q("facet-hot-headed")) ||
    leans(q("facet-hostile")) ||
    lowers(q("patience")) ||
    leans(recordedCore(world, personId, "conflict"));
  const calm = leans(q("facet-calm")) || leans(q("patience"));
  const temper = quick ? "quick" : calm ? "calm" : null;

  const warm =
    leans(q("playful-manner")) ||
    leans(q("facet-light-hearted")) ||
    leans(q("facet-friendly")) ||
    leans(q("facet-affectionate")) ||
    leans(q("uncertain-outlook"));
  const anxious =
    lowers(q("self-confidence")) ||
    leans(q("facet-self-conscious")) ||
    leans(q("facet-sensitive")) ||
    leans(q("facet-brooding")) ||
    lowers(q("uncertain-outlook"));
  const guarded =
    lowers(recordedCore(world, personId, "sociability")) ||
    leans(q("facet-defensive"));

  // A person can be recorded as more than one; the most guarded reading
  // wins, since the face shows the wall before what is behind it.
  if (guarded)
    return {
      rest: draw(seed, "face:guarded") < 0.5 ? "neutral" : "skeptical",
      temper,
    };
  if (anxious) return { rest: "concerned", temper };
  if (warm) return { rest: "smile", temper };
  return { rest: "neutral", temper };
}

/** Anger shown sooner or later by temper. */
function tempered(
  face: FaceExpression,
  temper: FaceTemperament["temper"],
): FaceExpression {
  if (temper === "quick" && face === "skeptical") return "angry";
  if (temper === "calm" && face === "angry") return "skeptical";
  return face;
}

/** The speaker's face for the tone of their own line. */
function speakerFace(tone: LineTone): FaceExpression | null {
  switch (tone) {
    case "agree":
    case "warm":
    case "praise":
      return "smile";
    case "joke":
      return "laugh";
    case "bad-news":
      return "concerned";
    case "threat":
    case "accusation":
      return "angry";
    // A lie is told with a straight face, and a refusal plainly.
    case "lie":
    case "refusal":
      return "neutral";
    case "plain":
      return null;
  }
}

/**
 * A listener's face for a line, through how they stand with the speaker.
 * A lie looks like any plain line to someone who does not know it is one.
 */
function listenerFace(
  tone: LineTone,
  feeling: ReplyTone,
  hurt: boolean,
): FaceExpression | null {
  if (hurt) return tone === "accusation" || tone === "threat" ? "angry" : "sad";
  switch (tone) {
    case "joke":
      return feeling === "warm"
        ? "laugh"
        : feeling === "worn"
          ? "skeptical"
          : "smile";
    case "agree":
    case "warm":
    case "praise":
      return feeling === "worn" ? "skeptical" : "smile";
    case "bad-news":
      return feeling === "warm" ? "sad" : "concerned";
    case "threat":
      return feeling === "worn" ? "angry" : "concerned";
    case "accusation":
      return feeling === "worn" ? "angry" : "surprised";
    case "refusal":
      return feeling === "warm"
        ? "sad"
        : feeling === "worn"
          ? "skeptical"
          : null;
    case "lie":
    case "plain":
      return feeling === "worn" ? "skeptical" : null;
  }
}

/** Whether a turn strained or ended things between this person and anyone. */
function hurtBy(world: World, event: HistoricalEvent, personId: EntityId) {
  return world.history.relationshipInteractions.some(
    (interaction) =>
      interaction.eventId === event.id &&
      interaction.personIds.includes(personId) &&
      (interaction.change === "strained" || interaction.change === "ended"),
  );
}

/** One person's reaction to one turn, or null when it does not move them. */
function reactionTo(
  world: World,
  turn: ConversationExchangeTurn,
  personId: EntityId,
): FaceExpression | null {
  const event = world.history.events.find((entry) => entry.id === turn.eventId);
  if (!event) return null;
  const tone = lineTone(world, event);
  if (turn.speakerPersonId === personId) return speakerFace(tone);
  if (!turn.heardByPersonIds.includes(personId)) return null;
  const feeling = turn.speakerPersonId
    ? standingTone(world, personId, turn.speakerPersonId)
    : "even";
  return listenerFace(tone, feeling, hurtBy(world, event, personId));
}

/**
 * The face a person present in the conversation makes now. `turns` are the
 * conversation's recorded turns, oldest first (conversationExchangeTurns).
 * A reaction to the newest turn wins; without one, a reaction to the turn
 * before holds; otherwise the person rests.
 */
export function conversationExpression(
  world: World,
  personId: EntityId,
  seed: string,
  turns: readonly ConversationExchangeTurn[],
): FaceExpression {
  const temperament = faceTemperament(world, personId, seed);
  const recent = turns.slice(-2).reverse();
  if (recent[0]?.current)
    for (const turn of recent) {
      if (!turn.current) break;
      const face = reactionTo(world, turn, personId);
      if (face) return tempered(face, temperament.temper);
    }
  return temperament.rest;
}
