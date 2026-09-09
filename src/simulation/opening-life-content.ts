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
  readonly approach?: "ask" | "listen" | "direct";
}
export type LifeSceneSetting = "home" | "school" | "neighborhood";
export interface LifeSceneDefinition {
  readonly key: string;
  readonly ages: readonly [number, number];
  readonly setting: LifeSceneSetting;
  readonly cast: LifeSceneCast;
  readonly minutes: number;
  readonly premise: string;
  readonly choices: readonly LifeSceneChoice[];
  readonly source: string;
}
const SOURCE =
  "https://drive.google.com/file/d/1NhCLh2tPzoWWaTr1vH41Mz1yj8gdMXWR/view";
function scene(
  key: string,
  ages: readonly [number, number],
  setting: LifeSceneSetting,
  cast: LifeSceneCast,
  premise: string,
  choices: readonly LifeSceneChoice[],
  minutes = 10,
): LifeSceneDefinition {
  return {
    key,
    ages,
    setting,
    cast,
    premise,
    choices,
    minutes,
    source:
      key.startsWith("adult.home.") || key.startsWith("young.home.")
        ? "https://docs.google.com/document/d/1a0yze5v9dmmpljkNyK24ObigE9NjShDzWkGWwq6UrOA/edit"
        : SOURCE,
  };
}
export const OPENING_LIFE_SCENES: readonly LifeSceneDefinition[] = [
  scene(
    "early.school.crayon-sharing",
    [5, 7],
    "school",
    "peer",
    "You're drawing with the blue crayon. {person} asks for it to draw water.",
    [
      {
        key: "hand-over",
        label: "Hand over the crayon",
        aftermath:
          "You hand {person} the blue crayon and choose another color.",
      },
      {
        key: "finish-first",
        label: "Ask to finish first",
        aftermath: "You ask {person} to wait while you finish coloring.",
        approach: "ask",
      },
      {
        key: "keep",
        label: "Keep using it",
        aftermath: "You keep the blue crayon. {person} chooses another color.",
      },
    ],
  ),
  scene(
    "early.school.playground-turn",
    [5, 7],
    "school",
    "peer",
    "{person} is on a swing. You're waiting for a turn.",
    [
      {
        key: "ask-turn",
        label: "Ask for a turn",
        aftermath: "You ask {person} when you can have a turn.",
        approach: "ask",
      },
      {
        key: "wait",
        label: "Wait beside the swing",
        aftermath: "You wait beside the swing.",
      },
      {
        key: "leave",
        label: "Choose another game",
        aftermath: "You leave the swing and play on the slide.",
      },
    ],
  ),
  scene(
    "early.school.spilled-paint",
    [6, 7],
    "school",
    "peer",
    "Your elbow knocks a cup of paint water across {person}'s drawing.",
    [
      {
        key: "apologize",
        label: "Apologize and help blot it",
        aftermath: "You apologize and blot the wet paper with towels.",
      },
      {
        key: "explain",
        label: "Explain it was an accident",
        aftermath: "You tell {person} your elbow knocked the cup over.",
        approach: "direct",
      },
      {
        key: "freeze",
        label: "Stand still",
        aftermath: "You stand still beside the wet drawing.",
      },
    ],
  ),
  scene(
    "early.home.bedtime-delay",
    [5, 7],
    "home",
    "guardian",
    "It's bedtime. You're still playing with a toy when {person} asks you to put it away.",
    [
      {
        key: "stop",
        label: "Put the toy away",
        aftermath: "You put the toy away.",
      },
      {
        key: "ask",
        label: "Ask for a few more minutes",
        aftermath: "You ask {person} for a few more minutes to play.",
        approach: "ask",
      },
      {
        key: "continue",
        label: "Keep playing",
        aftermath: "You keep playing with the toy.",
      },
    ],
  ),
  scene(
    "early.home.broken-mug",
    [5, 7],
    "home",
    "guardian",
    "Your sleeve catches a mug. It falls and breaks. {person} asks what happened.",
    [
      {
        key: "tell",
        label: "Say you knocked it over",
        aftermath: "You tell {person} that your sleeve caught the mug.",
        approach: "direct",
      },
      {
        key: "help",
        label: "Ask for help with the pieces",
        aftermath: "You ask {person} to help with the broken pieces.",
        approach: "ask",
      },
      {
        key: "quiet",
        label: "Say nothing",
        aftermath: "You don't answer the question.",
      },
    ],
  ),
  scene(
    "early.home.food-refusal",
    [5, 7],
    "home",
    "guardian",
    "There's broccoli on your plate. {person} asks you to try a bite.",
    [
      {
        key: "try",
        label: "Try a bite",
        aftermath: "You try a bite of broccoli.",
      },
      {
        key: "no",
        label: "Say you don't want it",
        aftermath: "You tell {person} you don't want the broccoli.",
        approach: "direct",
      },
      {
        key: "ask",
        label: "Ask to leave it",
        aftermath: "You ask {person} if you can leave the broccoli.",
        approach: "ask",
      },
    ],
  ),
  scene(
    "early.home.closet-fear",
    [5, 7],
    "home",
    "alone",
    "A branch casts a moving shadow across your closet door.",
    [
      {
        key: "lamp",
        label: "Turn on the lamp",
        aftermath: "You turn on the lamp and look at the closet door.",
      },
      {
        key: "covers",
        label: "Pull up the covers",
        aftermath: "You pull the covers up.",
      },
      {
        key: "look",
        label: "Look out the window",
        aftermath: "You look through the window at the branch.",
      },
    ],
  ),
  scene(
    "early.peer.toy-damage-accidental",
    [6, 7],
    "school",
    "peer",
    "While you play together, a wheel snaps off {person}'s toy truck in your hands.",
    [
      {
        key: "show",
        label: "Show them the wheel",
        aftermath: "You show {person} the broken wheel and apologize.",
        approach: "direct",
      },
      {
        key: "repair",
        label: "Try putting it back",
        aftermath: "You try to fit the wheel back onto the truck.",
      },
      {
        key: "hide",
        label: "Put the truck aside",
        aftermath: "You put the truck aside without saying what happened.",
      },
    ],
  ),
  scene(
    "young.home.choose-activity",
    [5, 17],
    "home",
    "alone",
    "You have a little free time at home. What would you like to do?",
    [
      {
        key: "draw",
        label: "Draw something",
        aftermath: "You spend a little time drawing.",
      },
      {
        key: "read",
        label: "Read a book",
        aftermath: "You spend a little time reading.",
      },
      {
        key: "rest",
        label: "Take a quiet break",
        aftermath: "You take a quiet break.",
      },
    ],
    15,
  ),
  scene(
    "young.home.ask-about-childhood",
    [8, 17],
    "home",
    "guardian",
    "You and {person} have time for a conversation.",
    [
      {
        key: "ask",
        label: "Ask what school was like",
        aftermath: "You ask {person} what school was like for them.",
        approach: "ask",
      },
      {
        key: "listen",
        label: "Let them choose a topic",
        aftermath: "You let {person} choose what to talk about.",
        approach: "listen",
      },
      {
        key: "own",
        label: "Talk about your day",
        aftermath: "You talk to {person} about your day.",
        approach: "direct",
      },
    ],
  ),
  scene(
    "adult.home.free-time",
    [18, 110],
    "home",
    "alone",
    "You have a little free time at home. What would you like to do?",
    [
      {
        key: "read",
        label: "Read for a while",
        aftermath: "You spend a little time reading.",
      },
      {
        key: "rest",
        label: "Take a quiet break",
        aftermath: "You take a quiet break.",
      },
      {
        key: "draw",
        label: "Draw something",
        aftermath: "You spend a little time drawing.",
      },
    ],
    15,
  ),
  scene(
    "adult.home.shared-time",
    [18, 110],
    "home",
    "housemate",
    "You and {person} are both at home with time to talk.",
    [
      {
        key: "ask",
        label: "Ask how their day is going",
        aftermath: "You ask {person} how their day is going.",
        approach: "ask",
      },
      {
        key: "listen",
        label: "Let them choose a topic",
        aftermath: "You let {person} choose a topic.",
        approach: "listen",
      },
      {
        key: "quiet",
        label: "Ask for some quiet time",
        aftermath: "You tell {person} you'd like a little quiet time.",
        approach: "direct",
      },
    ],
  ),

  scene(
    "early.community.lost-pet-flyer",
    [6, 7],
    "neighborhood",
    "guardian",
    "Walking with {person}, you spot a white cat with an orange ear under a bush. It looks like the cat on a lost-pet flyer nearby.",
    [
      {
        key: "show",
        label: "Point out the cat",
        aftermath: "You point out the cat and the flyer to {person}.",
        approach: "direct",
      },
      {
        key: "watch",
        label: "Stop and watch",
        aftermath: "You stop beside {person} and watch the cat.",
      },
      {
        key: "ask",
        label: "Ask if it might be the missing cat",
        aftermath:
          "You ask {person} whether this might be the cat on the flyer.",
        approach: "ask",
      },
    ],
    5,
  ),
  scene(
    "early.community.sidewalk-curb",
    [5, 6],
    "neighborhood",
    "guardian",
    "You run ahead toward a street corner. {person} calls for you to stop at the curb and wait.",
    [
      {
        key: "wait",
        label: "Stop and wait",
        aftermath: "You stop at the curb. {person} catches up.",
      },
      {
        key: "look",
        label: "Look around the corner",
        aftermath:
          "You look around the corner while keeping your feet on the sidewalk.",
      },
      {
        key: "back",
        label: "Go back to them",
        aftermath: "You turn back and walk beside {person}.",
      },
    ],
    5,
  ),
];

/** Retain accepted 92C stages; only genuinely additional kernels enter this bank. */
export const OPENING_LIFE_ADDITIONS = OPENING_LIFE_SCENES.filter(
  (scene) =>
    !LIFE_CONTENT_92C_KERNELS.some(
      (kernel) => kernel.kernelId === scene.key && kernel.isKernel,
    ),
);
export const OPENING_LIFE_FAMILIES: readonly EpisodeFamily[] =
  OPENING_LIFE_ADDITIONS.map((scene) => {
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
      ...(scene.key === "early.home.bedtime-delay"
        ? [
            {
              kind: "local-time-window" as const,
              startMinute: 19 * 60,
              endMinuteExclusive: 24 * 60,
            },
          ]
        : []),
      ...(role ? [{ kind: "role" as const, role }] : []),
      ...(scene.setting === "school"
        ? [{ kind: "fact" as const, fact: "school.enrolled" as const }]
        : []),
    ];
    return {
      key: `opening.${scene.key}`,
      family: scene.setting === "school" ? "school" : "household",
      authority: {
        sourceDocument: "OPENING-LIFE1 / 92C",
        reference: scene.source,
      },
      roles: role ? [role] : [],
      peerRoles: role === "school-peer" ? [role] : [],
      exits: [],
      stages: [
        {
          key: "moment",
          requires: requirements,
          recordSceneContext: true,
          lines: [scene.premise.replaceAll("{person}", slot)],
          stakes: "ordinary",
          tensions: [],
          mayLeadTo: [],
          options: scene.choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            description: `${scene.minutes} minutes`,
            memory: choice.aftermath.replaceAll("{person}", slot),
            nudges: [],
            aftermath: null,
          })),
        },
      ],
    };
  });
