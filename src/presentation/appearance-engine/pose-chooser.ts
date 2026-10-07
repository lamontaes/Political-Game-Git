import { stableHash } from "../../simulation/ids";
import poseByTraitData from "../../../data/content/pose-by-trait.json" with { type: "json" };
import {
  isSeatedPose,
  presentationPose,
  type BodyPose,
  type BodyPresentation,
  type BodyView,
} from "./pack";

/**
 * WHAT A PERSON IS DOING IN THE SCENE, AND THE POSE THAT SHOWS IT.
 *
 * The scene says what each person present is doing; this picks the pose the
 * people engine draws them in. Recorded traits and the present activity
 * decide the highest-weight pose; the person's seed only resolves exact ties.
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
  /** Recorded traits only; unknown traits have no visual effect. */
  readonly traits?: readonly {
    readonly qualifiedKey: string;
    readonly value: number;
  }[];
  /** Whether another person is present in this scene. */
  readonly hasCompanion?: boolean;
  /** Their presentation, whose own poses are the only ones chosen. */
  readonly presentation?: BodyPresentation;
}

type TraitPoseWeights = Partial<
  Record<SceneActivity, Readonly<Record<string, number>>>
>;

interface TraitPoseRule {
  readonly reason?: string;
  readonly high?: TraitPoseWeights;
  readonly low?: TraitPoseWeights;
}

const TRAIT_POSE_RULES = poseByTraitData.traits as Record<
  string,
  TraitPoseRule
>;

function poseCandidates(
  activity: SceneActivity,
  seated: boolean,
  hasCompanion: boolean,
): readonly BodyPose[] {
  switch (activity) {
    case "speaking":
      return seated ? ["seated-leaning"] : ["explaining", "hand-on-hip"];
    case "speech":
      return seated ? ["seated-leaning"] : ["podium"];
    case "listening":
      return seated
        ? ["seated-hands-folded", "seated-listening", "seated-leaning"]
        : ["arms-folded", "hand-on-hip"];
    case "waiting":
      return seated
        ? ["seated-legs-crossed", "seated-phone"]
        : ["arms-folded", "hand-on-hip"];
    case "desk":
      return seated ? ["seated-writing", "seated-reading"] : ["standing"];
    case "meeting":
      return seated ? ["seated-hands-folded", "seated-leaning"] : ["standing"];
    case "idle":
      if (!hasCompanion)
        return seated ? ["seated", "seated-relaxed"] : ["standing"];
      return seated
        ? ["seated", "seated-relaxed", "seated-hands-folded", "seated-leaning"]
        : ["standing", "hand-on-hip", "arms-folded"];
  }
}

/** Highest recorded trait weight wins; a stable hash only breaks exact ties. */
function weightedPose(choice: PoseChoice): BodyPose {
  const candidates = new Set<BodyPose>(
    poseCandidates(
      choice.activity,
      choice.seated,
      choice.hasCompanion ?? false,
    ),
  );
  const scores = new Map<BodyPose, number>();
  for (const trait of choice.traits ?? []) {
    if (trait.value === 0) continue;
    const rule = TRAIT_POSE_RULES[trait.qualifiedKey];
    const pole = trait.value > 0 ? rule?.high : rule?.low;
    const weights = pole?.[choice.activity] ?? {};
    for (const [pose, weight] of Object.entries(weights)) {
      if (isSeatedPose(pose as BodyPose) !== choice.seated) continue;
      candidates.add(pose as BodyPose);
      scores.set(
        pose as BodyPose,
        (scores.get(pose as BodyPose) ?? 0) + Math.abs(trait.value) * weight,
      );
    }
  }
  const highest = Math.max(
    ...[...candidates].map((pose) => scores.get(pose) ?? 0),
  );
  const tied = [...candidates].filter(
    (pose) => (scores.get(pose) ?? 0) === highest,
  );
  return tied.sort((left, right) =>
    stableHash(`${choice.seed}:${choice.activity}:${left}`).localeCompare(
      stableHash(`${choice.seed}:${choice.activity}:${right}`),
    ),
  )[0]!;
}

/**
 * The pose for a person doing something. A seated person stays seated: the
 * scene gave them a chair, and only the seated poses fit one.
 *
 * - speaking: explaining or an open stance; seated speakers lean in
 * - listening: a data-mapped trait pose, or a stable tie among attentive poses
 * - waiting: a stable tie among standing or seated waiting poses
 * - speech: at the podium (from a chair, leaning in)
 * - desk: writing or reading; meeting: hands folded or leaning in; standing
 *   when there is no chair
 * - idle: standing alone; with others present, a data-mapped pose or stable tie
 *   among available gestures
 */
export function chooseBodyPose(choice: PoseChoice): BodyPose {
  const pose = choosePose(choice);
  return choice.presentation
    ? presentationPose(pose, choice.presentation)
    : pose;
}

function choosePose(choice: PoseChoice): BodyPose {
  return weightedPose(choice);
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
