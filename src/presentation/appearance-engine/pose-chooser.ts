import { stableHash } from "../../simulation/ids";
import {
  presentationPose,
  type BodyPose,
  type BodyPresentation,
  type BodyView,
} from "./pack";

/**
 * WHAT A PERSON IS DOING IN THE SCENE, AND THE POSE THAT SHOWS IT.
 *
 * The scene says what each person present is doing; this picks the pose the
 * people engine draws them in. The same person doing the same thing is
 * always drawn the same way: every choice between two poses is drawn from
 * the person's own seed, never from the clock or the room.
 */
export type SceneActivity =
  /** Talking, or answering, in a conversation. */
  | "speaking"
  /** Listening to someone else in a conversation. */
  | "listening"
  /** Present, waiting their turn or waiting on something. */
  | "waiting"
  /** Giving a speech, at a lectern or podium. */
  | "speech"
  /** At a desk or table, working. */
  | "desk"
  /** At a meeting table with others. */
  | "meeting"
  /** Nothing in particular. */
  | "idle";

export interface PoseChoice {
  readonly activity: SceneActivity;
  /** Whether the place has them in a seat. */
  readonly seated: boolean;
  /** The person's appearance seed (or their id). */
  readonly seed: string;
  /**
   * How guarded the person is, from -2 (open) to 2 (guarded), from a
   * recorded trait only; absent when nothing is recorded, which leaves the
   * seed alone to decide.
   */
  readonly guarded?: number;
  /** Their presentation, whose own poses are the only ones chosen. */
  readonly presentation?: BodyPresentation;
}

function draw(seed: string, question: string): number {
  return (
    Number.parseInt(stableHash(`${seed}:${question}`).slice(0, 8), 16) /
    0x100000000
  );
}

/** Of two poses, the seed's; `lean` shifts the odds toward the first. */
function either(
  seed: string,
  question: string,
  first: BodyPose,
  second: BodyPose,
  lean = 0,
): BodyPose {
  const odds = Math.min(0.9, Math.max(0.1, 0.5 + lean));
  return draw(seed, question) < odds ? first : second;
}

/**
 * The pose for a person doing something. A seated person stays seated: the
 * scene gave them a chair, and only the seated poses fit one.
 *
 * - speaking: explaining, or leaning in from a chair
 * - listening: arms folded or a hand on the hip (a guarded person folds their
 *   arms more), or in a chair with hands folded or leaning in to listen
 * - waiting: standing the same way, or in a chair with legs crossed or on
 *   the phone
 * - speech: at the podium (from a chair, leaning in)
 * - desk: writing or reading; meeting: hands folded or leaning in; standing
 *   when there is no chair
 * - idle: standing, or seated plainly or leaning back
 */
export function chooseBodyPose(choice: PoseChoice): BodyPose {
  const pose = choosePose(choice);
  return choice.presentation
    ? presentationPose(pose, choice.presentation)
    : pose;
}

function choosePose(choice: PoseChoice): BodyPose {
  const { activity, seated, seed } = choice;
  // PLACEHOLDER(wave2): 0.15 per trait step, picked by eye.
  const guarded = (choice.guarded ?? 0) * 0.15;
  switch (activity) {
    case "speaking":
      return seated ? "seated-leaning" : "explaining";
    case "speech":
      return seated ? "seated-leaning" : "podium";
    case "listening":
      // A guarded listener keeps their hands folded; an open one leans in.
      return seated
        ? either(
            seed,
            "pose:listening:seated",
            "seated-hands-folded",
            "seated-listening",
            guarded,
          )
        : either(seed, "pose:listening", "arms-folded", "hand-on-hip", guarded);
    case "waiting":
      return seated
        ? either(
            seed,
            "pose:waiting:seated",
            "seated-legs-crossed",
            "seated-phone",
            guarded,
          )
        : either(seed, "pose:listening", "arms-folded", "hand-on-hip", guarded);
    case "desk":
      return seated
        ? either(seed, "pose:desk", "seated-writing", "seated-reading")
        : "standing";
    case "meeting":
      return seated
        ? either(
            seed,
            "pose:table",
            "seated-hands-folded",
            "seated-leaning",
            guarded,
          )
        : "standing";
    case "idle":
      return seated
        ? either(seed, "pose:idle:seated", "seated", "seated-relaxed")
        : "standing";
  }
}

/**
 * Which way a person turns for what they are doing: someone listening turns
 * three quarters toward the one speaking; everyone else faces front, the one
 * speaking included, since they answer the player, who is the camera.
 */
export function chooseBodyView(activity: SceneActivity): BodyView {
  return activity === "listening" ? "three-quarter" : "front";
}

/** Anchor types that are a lectern or a podium. */
const PODIUM = /\b(lectern|podium|rostrum|dais)\b/;
/** Anchor types that are a seat at a desk, a table or a meeting. */
const TABLE = /\b(desk|table|meeting|conference|bench|counter)\b/;

/**
 * What a person is doing in a scene, from the conversation and the place
 * they are in: the one who is answering speaks and the others listen; a
 * lectern means a speech; a chair at a desk or table means working there.
 * An anchor's type is split on hyphens and underscores before it is read.
 */
export function sceneActivity(input: {
  readonly personId: string;
  /** Who is answering in the room's conversation, or null. */
  readonly speakerId: string | null;
  /** The anchor's type, as the scene registry names it. */
  readonly anchorType: string;
  readonly seated: boolean;
}): SceneActivity {
  const type = input.anchorType.toLowerCase().replace(/[-_]/g, " ");
  const speaking = input.personId === input.speakerId;
  if (PODIUM.test(type) && (input.speakerId === null || speaking))
    return "speech";
  if (input.speakerId !== null) return speaking ? "speaking" : "listening";
  if (input.seated && TABLE.test(type)) return "desk";
  return "idle";
}
