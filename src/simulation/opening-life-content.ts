import type {
  EpisodeFamily,
  EpisodeRoleKey,
  EpisodeRequirement,
} from "./life-episodes";
import { LIFE_CONTENT_92C_KERNELS } from "./life-content-92c";
/** Authored premises adapted from 92C kernels. None is an empirical frequency. */
export type LifeSceneCast =
  "alone" | "guardian" | "sibling" | "peer" | "housemate";
export interface LifeSceneChoice {
  readonly key: string;
  readonly label: string;
  readonly aftermath: string;
  readonly elapsedMinutes?: number;
  readonly approach?: "ask" | "listen" | "direct";
}
export type LifeSceneSetting = "home" | "school" | "neighborhood";
export interface LifeSceneDefinition {
  readonly key: string;
  readonly recurrence?: "daily";
  readonly ages: readonly [number, number];
  readonly setting: LifeSceneSetting;
  readonly cast: LifeSceneCast;
  readonly minutes: number;
  readonly premise: string;
  readonly choices: readonly LifeSceneChoice[];
  readonly source: string;
}
/** No fixed quiet-time scene is offered as an optional activity. */
export const OPTIONAL_OPENING_LIFE_ACTIVITY_KEYS: ReadonlySet<string> =
  new Set();
const SOURCE =
  "https://drive.google.com/file/d/1NhCLh2tPzoWWaTr1vH41Mz1yj8gdMXWR/view";
/** The reviewed packets, outputs and verdicts behind the PT3 first-session copy. */
const PT3_FIRST_SESSION_SOURCE = "prose-review/pt3-first-session";

/** Retired routine scenes are no longer offered in ordinary play. */
export function isArchivedRoutineOpeningSceneKey(key: string): boolean {
  return key === "young.home.choose-activity" || key === "adult.home.free-time";
}

/** Only these choices actually perform a sustained activity. Conversational
 * choices inside a game/reading/meeting do not complete that whole activity. */
const PERFORMED_OPENING_CHOICES: Readonly<Record<string, readonly string[]>> = {
  "young.home.choose-activity": ["read", "rest", "draw", "add"],
  "adult.home.free-time": ["read", "rest", "draw"],
  "early.family.packing-boxes": ["help-label"],
  "early.peer.sidewalk-game": ["give-in-play", "trial"],
  "early.peer.roughhouse-line": ["brush-off-tough", "return"],
  "early.home.bedtime-delay": ["continue"],
};
export function openingChoiceMinutes(
  definition: LifeSceneDefinition,
  choice: LifeSceneChoice,
): number {
  // ordinary-scenes-v1 reserves mod. and authors one explicit activity
  // duration for its choices. Preserve that frozen API/save contract.
  if (definition.key.startsWith("mod.")) return definition.minutes;
  const isReadMore =
    definition.key === "adult.home.free-time" && choice.key === "more";
  if (isReadMore) return 5;
  return (
    choice.elapsedMinutes ??
    (PERFORMED_OPENING_CHOICES[definition.key]?.includes(choice.key)
      ? definition.minutes
      : 0)
  );
}

function scene(
  key: string,
  ages: readonly [number, number],
  setting: LifeSceneSetting,
  cast: LifeSceneCast,
  premise: string,
  choices: readonly LifeSceneChoice[],
  minutes = 10,
  source?: string,
): LifeSceneDefinition {
  return {
    key,
    ...(key === "young.home.choose-activity" || key === "adult.home.free-time"
      ? { recurrence: "daily" as const }
      : {}),
    ages,
    setting,
    cast,
    premise,
    choices,
    minutes,
    source:
      source ??
      (key.startsWith("adult.home.") || key.startsWith("young.home.")
        ? "https://docs.google.com/document/d/1a0yze5v9dmmpljkNyK24ObigE9NjShDzWkGWwq6UrOA/edit"
        : SOURCE),
  };
}
/** Deliberately empty (owner, Oct 6): the authored scene bank is removed. Scenes start from world records. */
export const OPENING_LIFE_SCENES: readonly LifeSceneDefinition[] = [];

/** Authored continuations require the actual earlier choice, never a inferred outcome. */
export const OPENING_LIFE_FOLLOWUPS: Readonly<
  Record<
    string,
    {
      readonly afterChoice: string;
      readonly premise: string;
      readonly choices: readonly LifeSceneChoice[];
    }
  >
> = {};

/**
 * A later answer to an earlier choice: the same person, days or weeks on.
 *
 * Offered only when the record holds the named choice at the scene's first
 * moment and at least `afterDays` have passed since it, so two children who
 * answered the same moment differently meet different later moments. Nothing
 * here is scheduled or owed: a later stage is one more opportunity for the
 * scene selector to weigh, and it plays at most once.
 */
export interface OpeningLifeLater {
  /** Stage key suffix; the stage itself is `later.<key>`. */
  readonly key: string;
  readonly afterChoice: string;
  readonly afterDays: number;
  readonly premise: string;
  readonly choices: readonly LifeSceneChoice[];
}

/**
 * Deliberately empty. The owner rejected all eight drafted later scenes on
 * 2026-09-22 (research question `which-later-answers-an-early-choice-deserves`)
 * and approves any replacement individually, by exact text. A later scene
 * returns to an earlier choice only when it changes a relationship, creates a
 * real opportunity or presents a meaningful new decision. The mechanism below
 * is exercised by tests against a placeholder entry that is not content.
 */
export const OPENING_LIFE_LATER: Readonly<
  Record<string, readonly OpeningLifeLater[]>
> = {};

/** Stage key of a later answer. */
export function openingLaterStageKey(later: OpeningLifeLater): string {
  return `later.${later.key}`;
}

/**
 * The scene as it reads at one of its stages, or undefined for a stage this
 * scene does not have. The one place that maps a played stage back to its
 * premise and choices, so the scene flow and the story surface cannot
 * disagree about how long a later choice takes.
 */
export function openingLifeSceneAtStage(
  scene: LifeSceneDefinition,
  stageKey: string,
  laters: Readonly<
    Record<string, readonly OpeningLifeLater[]>
  > = OPENING_LIFE_LATER,
): LifeSceneDefinition | undefined {
  if (stageKey === "moment") return scene;
  if (stageKey === "follow-through") {
    const followup = OPENING_LIFE_FOLLOWUPS[scene.key];
    return followup
      ? {
          ...scene,
          minutes: 5,
          premise: followup.premise,
          choices: followup.choices,
        }
      : undefined;
  }
  const later = laters[scene.key]?.find(
    (entry) => openingLaterStageKey(entry) === stageKey,
  );
  return later
    ? { ...scene, minutes: 5, premise: later.premise, choices: later.choices }
    : undefined;
}

/**
 * Scenes whose premise is only true at one time of day, as local minutes.
 *
 * A bedtime scene at bedtime, a moving shadow on a closet door after dark,
 * a plate of broccoli at dinner — not at ten past nine in the morning, which
 * is where the first session opens.
 */
export const OPENING_SCENE_TIME_WINDOWS: Readonly<
  Record<string, readonly [number, number] | undefined>
> = {
  "early.home.bedtime-delay": [19 * 60, 24 * 60],
  "early.home.closet-fear": [19 * 60, 24 * 60],
  "early.home.food-refusal": [17 * 60, 20 * 60 + 30],
};

/** Opening kernels that require a circumstance writer; not offered in a bare world. */
export const OPENING_LIFE_PREMISE_GATED_KEYS = new Set([
  "early.family.packing-boxes",
  "adult.trans.college-vs-work",
  "adult.trans.drop-class-keep-job",
]);

/** Retain accepted 92C stages; only genuinely additional kernels enter this bank. */
export const OPENING_LIFE_ADDITIONS = OPENING_LIFE_SCENES.filter(
  (scene) =>
    !LIFE_CONTENT_92C_KERNELS.some(
      (kernel) => kernel.kernelId === scene.key && kernel.isKernel,
    ),
);
export function openingLifeFamily(
  scene: LifeSceneDefinition,
  sourceDocument = "OPENING-LIFE1 / 92C",
  laters: Readonly<
    Record<string, readonly OpeningLifeLater[]>
  > = OPENING_LIFE_LATER,
): EpisodeFamily {
  const role: EpisodeRoleKey | null =
    scene.cast === "alone"
      ? null
      : scene.cast === "peer"
        ? "school-peer"
        : scene.cast === "sibling"
          ? "household-peer"
          : scene.cast === "housemate"
            ? "household-companion"
            : "guardian";
  const slot = role ? `{role:${role}}` : "";
  const requirements: EpisodeRequirement[] = [
    { kind: "age-at-least", age: scene.ages[0] },
    { kind: "age-below", age: scene.ages[1] + 1 },
    ...(scene.setting === "home" ? [{ kind: "home-recorded" as const }] : []),
    ...(OPENING_SCENE_TIME_WINDOWS[scene.key]
      ? [
          {
            kind: "local-time-window" as const,
            startMinute: OPENING_SCENE_TIME_WINDOWS[scene.key]![0],
            endMinuteExclusive: OPENING_SCENE_TIME_WINDOWS[scene.key]![1],
          },
        ]
      : []),
    ...(role ? [{ kind: "role" as const, role }] : []),
    ...(scene.setting === "school"
      ? [{ kind: "fact" as const, fact: "school.enrolled" as const }]
      : []),
  ];
  // The circumstance that makes the scene possible gates the moment only.
  // Answering the moment closes the circumstance — that is what closing it
  // means — so requiring the same fact again on the continuation would make
  // the continuation unreachable. The continuation already requires the
  // saved answer to the moment, which is the stronger claim anyway.
  const circumstance: readonly EpisodeRequirement[] =
    scene.key === "early.family.packing-boxes"
      ? [{ kind: "fact", fact: "household.move-preparation" }]
      : scene.key === "adult.trans.college-vs-work"
        ? [{ kind: "fact", fact: "life.education-work-crossroad" }]
        : scene.key === "adult.trans.drop-class-keep-job"
          ? [{ kind: "fact", fact: "work.class-schedule-conflict" }]
          : [];
  return {
    key: `opening.${scene.key}`,
    ...(scene.recurrence ? { recurrence: scene.recurrence } : {}),
    family: scene.setting === "school" ? "school" : "household",
    authority: {
      sourceDocument,
      reference: scene.source,
    },
    roles: role ? [role] : [],
    peerRoles: role === "school-peer" ? [role] : [],
    exits: [],
    stages: [
      {
        key: "moment",
        requires: [...requirements, ...circumstance],
        recordSceneContext: true,
        // `{who}` introduces the person with how the record relates them
        // to the player ("Sierra Tucker, your housemate"). Authored only
        // where it ends a clause, because the introduction carries its own
        // comma and no closing one.
        lines: [
          scene.premise
            .replaceAll("{who}", role ? `{who:${role}}` : "")
            .replaceAll("{person}", slot),
        ],
        stakes: "ordinary",
        tensions: [],
        mayLeadTo: [],
        options: scene.choices.map((choice) => ({
          key: choice.key,
          label: choice.label.replaceAll("{person}", slot),
          // An instant choice carries no time label; the label itself is the
          // description, which the conversation renderer does not repeat.
          description: openingChoiceMinutes(scene, choice)
            ? `${openingChoiceMinutes(scene, choice)} minutes`
            : choice.label.replaceAll("{person}", slot),
          memory: choice.aftermath.replaceAll("{person}", slot),
          nudges: [],
          aftermath: null,
        })),
      },
      ...(OPENING_LIFE_FOLLOWUPS[scene.key]
        ? [
            {
              key: "follow-through",
              requires: [
                ...requirements,
                {
                  kind: "after-choice" as const,
                  stage: "moment",
                  option: OPENING_LIFE_FOLLOWUPS[scene.key]!.afterChoice,
                },
              ],
              recordSceneContext: true,
              lines: [
                OPENING_LIFE_FOLLOWUPS[scene.key]!.premise.replaceAll(
                  "{person}",
                  slot,
                ),
              ],
              stakes: "ordinary" as const,
              tensions: [],
              mayLeadTo: [],
              options: OPENING_LIFE_FOLLOWUPS[scene.key]!.choices.map(
                (choice) => ({
                  key: choice.key,
                  label: choice.label.replaceAll("{person}", slot),
                  description: openingChoiceMinutes(
                    { ...scene, minutes: 5 },
                    choice,
                  )
                    ? `${openingChoiceMinutes({ ...scene, minutes: 5 }, choice)} minutes`
                    : choice.label.replaceAll("{person}", slot),
                  memory: choice.aftermath.replaceAll("{person}", slot),
                  nudges: [],
                  aftermath: null,
                }),
              ),
            },
          ]
        : []),
      ...(laters[scene.key] ?? []).map((later) => {
        const atStage = openingLifeSceneAtStage(
          scene,
          openingLaterStageKey(later),
          laters,
        )!;
        return {
          key: openingLaterStageKey(later),
          requires: [
            // A later answer may land a little after the first moment's own
            // age window closes; the window is for when the moment can
            // start, not for when its consequences may still arrive.
            { kind: "age-at-least" as const, age: scene.ages[0] },
            { kind: "age-below" as const, age: scene.ages[1] + 2 },
            ...(scene.setting === "home"
              ? [{ kind: "home-recorded" as const }]
              : []),
            ...(role ? [{ kind: "role" as const, role }] : []),
            ...(scene.setting === "school"
              ? [{ kind: "fact" as const, fact: "school.enrolled" as const }]
              : []),
            {
              kind: "after-choice" as const,
              stage: "moment",
              option: later.afterChoice,
            },
            {
              kind: "days-since-stage" as const,
              stage: "moment",
              days: later.afterDays,
            },
          ],
          recordSceneContext: true,
          lines: [
            later.premise
              .replaceAll("{who}", role ? `{who:${role}}` : "")
              .replaceAll("{person}", slot),
          ],
          stakes: "ordinary" as const,
          tensions: [],
          mayLeadTo: [],
          options: later.choices.map((choice) => ({
            key: choice.key,
            label: choice.label.replaceAll("{person}", slot),
            description: openingChoiceMinutes(atStage, choice)
              ? `${openingChoiceMinutes(atStage, choice)} minutes`
              : choice.label.replaceAll("{person}", slot),
            memory: choice.aftermath.replaceAll("{person}", slot),
            nudges: [],
            aftermath: null,
          })),
        };
      }),
    ],
  };
}

export const OPENING_LIFE_FAMILIES: readonly EpisodeFamily[] =
  OPENING_LIFE_ADDITIONS.map((scene) => openingLifeFamily(scene));
