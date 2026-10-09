import poseData from "../../../data/content/pose-by-activity.json" with { type: "json" };
import { stableHash } from "../../simulation/ids";
import type { FaceExpression } from "./pack";
import {
  presentationPose,
  type BodyPose,
  type BodyPresentation,
  type BodyView,
} from "./pack";

/**
 * WHAT A PERSON IS DOING IN THE SCENE, AND THE POSE THAT SHOWS IT.
 *
 * The scene says what each person present is doing, the kind of spot they
 * are in, and (when the scene has it) what their face shows; this picks the
 * pose the people engine draws them in. Which poses fit which activity and
 * spot is data, not code (data/content/pose-by-activity.json): every list
 * there is weighted, and the same person in the same situation is always
 * drawn the same way, because every choice between poses is drawn from the
 * person's own seed, never from the clock or the room.
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
  /** Meeting someone: at a door, a reception, a welcome. */
  | "greeting"
  /** One of a crowd: an audience, a rally. */
  | "crowd"
  /** One of a crowd facing away from the camera, toward a speaker. */
  | "audience"
  /** Going somewhere: a street, a corridor, a path. */
  | "transit"
  /** Nothing in particular. */
  | "idle";

/** The kind of spot a person is in (SCENE_SLOT_KINDS). */
export type PoseSpot = "stand" | "sit" | "podium" | "lean";

export interface PoseChoice {
  readonly activity: SceneActivity;
  /** Whether the place has them in a seat. */
  readonly seated: boolean;
  /**
   * The kind of spot, when it is more than standing or sitting (a podium, a
   * place to lean); absent means sit when seated and stand otherwise.
   */
  readonly spot?: PoseSpot;
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
  /** The view they are drawn in (chooseBodyView); front when absent. */
  readonly view?: BodyView;
  /** What their face shows in the scene, when it shows anything. */
  readonly expression?: FaceExpression;
}

interface PoseEntry {
  readonly pose: BodyPose;
  readonly weight?: number;
}
type PoseLists = Partial<
  Readonly<Record<BodyView, Partial<Readonly<Record<PoseSpot, PoseEntry[]>>>>>
>;
const ACTIVITIES = poseData.activities as unknown as Readonly<
  Partial<Record<SceneActivity, PoseLists>>
>;
const STANCE = poseData.stance as Readonly<
  Partial<Record<BodyPose, "guarded" | "open">>
>;
const BY_EXPRESSION = poseData.byExpression as unknown as Readonly<
  Partial<Record<FaceExpression, readonly BodyPose[]>>
> & { readonly share: number };

/** How far each step of `guarded` (-2..2) moves a pose's weight. */
const GUARDED_STEP = 0.3;

function draw(seed: string, question: string): number {
  return (
    Number.parseInt(stableHash(`${seed}:${question}`).slice(0, 8), 16) /
    0x100000000
  );
}

/**
 * One entry of a weighted list, by the seed's draw. A guarded person weighs
 * the guarded poses (arms folded, a stern look) up and the open ones down,
 * and an open person the other way: `guarded` -2..2 moves each by up to 60%.
 */
function pick(
  seed: string,
  question: string,
  entries: readonly PoseEntry[],
  guarded: number,
): BodyPose {
  const weights = entries.map((entry) => {
    const stance = STANCE[entry.pose];
    const lean = stance === "guarded" ? 1 : stance === "open" ? -1 : 0;
    return Math.max(
      0.1,
      (entry.weight ?? 1) * (1 + GUARDED_STEP * guarded * lean),
    );
  });
  let at = draw(seed, question) * weights.reduce((sum, w) => sum + w, 0);
  for (const [i, entry] of entries.entries()) {
    at -= weights[i]!;
    if (at < 0) return entry.pose;
  }
  return entries[entries.length - 1]!.pose;
}

/**
 * The pose for a person doing something. A seated person stays seated: the
 * scene gave them a chair, and only the seated poses fit one.
 *
 * Which poses each activity, view and spot allows is in
 * data/content/pose-by-activity.json, weighted. A standing person whose face
 * shows anger, sadness, worry, doubt, surprise or laughter may also stand the
 * way it reads (byExpression): those poses join the same weighted list, an
 * open person carrying the feeling in their stance more and a guarded one
 * less; a speech from a podium stays at the podium. The pose is then the
 * person's presentation's own (presentationPose).
 */
export function chooseBodyPose(choice: PoseChoice): BodyPose {
  const pose = choosePose(choice);
  return choice.presentation
    ? presentationPose(pose, choice.presentation)
    : pose;
}

function choosePose(choice: PoseChoice): BodyPose {
  const { activity, seated, seed } = choice;
  const view = choice.view ?? "front";
  const spot: PoseSpot = choice.spot ?? (seated ? "sit" : "stand");
  const guarded = choice.guarded ?? 0;
  const standing = spot === "stand" || spot === "lean";
  const lists = ACTIVITIES[activity];
  const entries: readonly PoseEntry[] =
    lists?.[view]?.[spot] ??
    lists?.front?.[spot] ??
    ([{ pose: seated ? "seated" : "standing" }] as const);
  const reaction = choice.expression && BY_EXPRESSION[choice.expression];
  const reacts =
    reaction &&
    reaction.length > 0 &&
    standing &&
    view !== "back" &&
    activity !== "speech";
  return pick(
    seed,
    `pose:${activity}:${spot}:${view}`,
    reacts
      ? [...entries, ...reactionEntries(entries, reaction, guarded)]
      : entries,
    guarded,
  );
}

/**
 * The poses a feeling reads in, as entries beside the activity's own. For a
 * person neither open nor guarded they carry `share` of the list's weight
 * (the data's "how many carry it in the pose"); an open person carries it
 * more and a guarded one less, by the same 30% per step as the stances.
 */
function reactionEntries(
  entries: readonly PoseEntry[],
  reaction: readonly BodyPose[],
  guarded: number,
): PoseEntry[] {
  const own = entries.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
  const share = BY_EXPRESSION.share;
  const total = ((own * share) / (1 - share)) * (1 - GUARDED_STEP * guarded);
  return reaction.map((pose) => ({ pose, weight: total / reaction.length }));
}

/**
 * Which way a person turns for what they are doing: someone listening turns
 * three quarters toward the one speaking, and someone at a spot facing away
 * from the camera (an audience facing a speaker, a crowd at a rally) is seen
 * from behind; everyone else faces front, the one speaking included, since
 * they answer the player, who is the camera.
 */
export function chooseBodyView(
  activity: SceneActivity,
  facing?: "viewer" | "left" | "right" | "away",
): BodyView {
  if (facing === "away") return "back";
  return activity === "listening" ? "three-quarter" : "front";
}

/** Anchor types that are a lectern or a podium. */
const PODIUM = /\b(lectern|podium|rostrum|dais)\b/;
/** Anchor types that are a seat at a desk, a table or a meeting. */
const TABLE = /\b(desk|table|meeting|conference|bench|counter)\b/;
/** Anchor types where people meet one another. */
const GREETING = /\b(doorway|entrance|reception|lobby|foyer|greeter|welcome)\b/;
/** Anchor types that hold a crowd. */
const CROWD = /\b(audience|crowd|rally|gallery|bleachers?|pews?|stands)\b/;
/** Anchor types people pass along. */
const TRANSIT = /\b(street|sidewalk|crosswalk|corridor|hallway|path|walkway)\b/;

/**
 * What a person is doing in a scene, from the conversation and the place
 * they are in: the one who is answering speaks and the others listen; a
 * lectern means a speech; a chair at a desk or table means working there; a
 * door or reception means greeting, a crowd's place means being one of the
 * crowd (and, facing away, the audience), and a street or corridor means
 * passing through. An anchor's type is split on hyphens and underscores
 * before it is read.
 */
export function sceneActivity(input: {
  readonly personId: string;
  /** Who is answering in the room's conversation, or null. */
  readonly speakerId: string | null;
  /** The anchor's type, as the scene registry names it. */
  readonly anchorType: string;
  readonly seated: boolean;
  /** Which way the spot faces, when it is known. */
  readonly facing?: "viewer" | "left" | "right" | "away";
}): SceneActivity {
  const type = input.anchorType.toLowerCase().replace(/[-_]/g, " ");
  const speaking = input.personId === input.speakerId;
  if (PODIUM.test(type) && (input.speakerId === null || speaking))
    return "speech";
  if (input.speakerId !== null) return speaking ? "speaking" : "listening";
  if (input.seated && TABLE.test(type)) return "desk";
  if (CROWD.test(type)) return input.facing === "away" ? "audience" : "crowd";
  if (!input.seated && GREETING.test(type)) return "greeting";
  if (!input.seated && TRANSIT.test(type)) return "transit";
  return "idle";
}
