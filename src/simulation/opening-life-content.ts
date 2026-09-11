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
  readonly recurrence?: "daily";
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
      key.startsWith("adult.home.") || key.startsWith("young.home.")
        ? "https://docs.google.com/document/d/1a0yze5v9dmmpljkNyK24ObigE9NjShDzWkGWwq6UrOA/edit"
        : SOURCE,
  };
}
export const OPENING_LIFE_SCENES: readonly LifeSceneDefinition[] = [
  // Adapted ordinary school contexts keep the source's choices without inventing
  // a pool/library/neighbor address or importing a school discipline engine.
  scene(
    "early.school.lunchbox-swap",
    [5, 7],
    "school",
    "peer",
    "At lunch, {person} offers to swap snacks. The lunch monitor has just said to keep your own food.",
    [
      {
        key: "make-secret-swap",
        label: "Make the swap quietly",
        aftermath: "You and {person} exchange snacks under the table.",
      },
      {
        key: "decline-cite-rule",
        label: "Say trading isn't allowed",
        aftermath:
          "You tell {person} what the monitor said and keep your snack.",
        approach: "direct",
      },
      {
        key: "eat-own-food",
        label: "Keep the snack you brought",
        aftermath: "You tell {person} you prefer your own snack.",
      },
    ],
    5,
  ),
  scene(
    "early.peer.sidewalk-game",
    [6, 7],
    "school",
    "peer",
    "You and {person} have drawn a chalk game in the schoolyard. {person} wants to add a rule that changes how you play.",
    [
      {
        key: "compromise-rule",
        label: "Suggest trying the rule for one round",
        aftermath: "You suggest one trial round to {person} before deciding.",
        approach: "ask",
      },
      {
        key: "insist-house-rules",
        label: "Ask to keep the rules you agreed",
        aftermath:
          "You remind {person} of the rules you agreed before starting.",
        approach: "direct",
      },
      {
        key: "give-in-play",
        label: "Try their rule",
        aftermath: "You play the next round using the rule {person} suggested.",
        approach: "listen",
      },
    ],
  ),
  scene(
    "early.peer.secret-whisper",
    [6, 7],
    "school",
    "peer",
    "During story time, {person} whispers an embarrassing story about another child. You don't know whether it happened.",
    [
      {
        key: "keep-secret",
        label: "Say it sounds unkind",
        aftermath:
          "You tell {person} the story sounds unkind and turn back to the book.",
        approach: "direct",
      },
      {
        key: "decline-to-pass",
        label: "Keep it to yourself",
        aftermath: "You don't repeat what {person} told you.",
      },
      {
        key: "question-story",
        label: "Ask how they know",
        aftermath: "You ask {person} how they know the story is true.",
        approach: "ask",
      },
    ],
    5,
  ),
  scene(
    "early.peer.dropped-treat",
    [5, 7],
    "school",
    "peer",
    "During the school break, {person} drops a snack into a puddle and starts crying. You still have your own snack.",
    [
      {
        key: "break-half-share",
        label: "Offer some of your snack",
        aftermath: "You offer {person} a clean piece of your snack.",
      },
      {
        key: "comfort-words",
        label: "Stay and comfort them",
        aftermath:
          "You stay beside {person} and say you're sorry their snack fell.",
        approach: "listen",
      },
      {
        key: "walk-past-eat",
        label: "Move away quietly",
        aftermath: "You move away from {person} with your own snack.",
      },
    ],
    5,
  ),
  scene(
    "early.peer.roughhouse-line",
    [6, 7],
    "school",
    "peer",
    "During tag, {person} knocks you over while trying to catch you. You sit up on the grass, startled.",
    [
      {
        key: "state-boundary",
        label: "Say tag doesn't mean pushing",
        aftermath: "You tell {person} you don't want to be pushed during tag.",
        approach: "direct",
      },
      {
        key: "stop-playing",
        label: "Stop playing for now",
        aftermath: "You tell {person} you're stopping the game and step away.",
      },
      {
        key: "brush-off-tough",
        label: "Get up and keep playing",
        aftermath: "You get up and rejoin the game with {person}.",
      },
    ],
    5,
  ),
  scene(
    "early.community.library-quiet",
    [5, 6],
    "school",
    "peer",
    "During a quiet reading activity at school, {person} whispers a joke. You feel yourself starting to laugh.",
    [
      {
        key: "stifle-face",
        label: "Try to hold in the laugh",
        aftermath: "You cover your mouth and turn back to the book.",
      },
      {
        key: "laugh-out-loud",
        label: "Laugh with them",
        aftermath:
          "You laugh out loud with {person} during the quiet reading activity.",
      },
      {
        key: "scoot-away",
        label: "Move a little farther away",
        aftermath:
          "You move away from {person} so you can listen to the reading.",
        approach: "listen",
      },
    ],
    5,
  ),
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
        label: "Ask to finish coloring first",
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
        label: "Keep playing with the bedtime toy",
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
        label: "Rest for a few minutes",
        aftermath: "You take a quiet break.",
      },
      {
        key: "draw",
        label: "Spend time sketching",
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
        label: "Leave the topic to your housemate",
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
        label: "Walk back beside them",
        aftermath: "You turn back and walk beside {person}.",
      },
    ],
    5,
  ),
  scene(
    "early.community.curious-neighbor",
    [5, 7],
    "neighborhood",
    "guardian",
    "A neighbor working in the front yard leans on the fence and asks what grade you are in and what your name is. {person} is beside you.",
    [
      {
        key: "answer-politely",
        label: "Give your first name and grade",
        aftermath:
          "You tell the neighbor your first name and grade, then step back beside {person}.",
        approach: "direct",
      },
      {
        key: "wave-say-nothing",
        label: "Wave and stay quiet",
        aftermath: "You wave at the neighbor and stay beside {person}.",
      },
      {
        key: "let-adult-answer",
        label: "Let {person} answer",
        aftermath: "You stay quiet and let {person} speak to the neighbor.",
        approach: "listen",
      },
    ],
    5,
  ),
  scene(
    "early.family.packing-boxes",
    [5, 7],
    "home",
    "guardian",
    "Cardboard boxes are stacked in the living room. Some of your things are in a crate and some are in a bag marked for donation. {person} is sorting the last shelf.",
    [
      {
        key: "cling-old-toy",
        label: "Keep a toy from the donation pile",
        aftermath:
          "You take a worn toy out of the donation bag and hold onto it.",
        approach: "direct",
      },
      {
        key: "help-label",
        label: "Help write labels on the boxes",
        aftermath: "You help {person} write labels on the boxes.",
      },
      {
        key: "stay-out-way",
        label: "Stay out of the way",
        aftermath: "You sit in the corner and stay out of the way.",
      },
    ],
    10,
  ),
  scene(
    "adult.trans.college-vs-work",
    [17, 19],
    "home",
    "guardian",
    "Further study and full-time work are both open to you right now. {person} asks what you are leaning toward.",
    [
      {
        key: "lean-study",
        label: "Say you want to keep studying",
        aftermath: "You tell {person} you want to keep studying.",
        approach: "direct",
      },
      {
        key: "lean-work",
        label: "Say you want to start working",
        aftermath: "You tell {person} you want to start working full time.",
        approach: "direct",
      },
      {
        key: "ask-time",
        label: "Ask for more time to decide",
        aftermath: "You ask {person} for more time before deciding.",
        approach: "ask",
      },
    ],
    15,
  ),
  scene(
    "adult.trans.drop-class-keep-job",
    [18, 23],
    "home",
    "housemate",
    "Your supervisor wants Thursday afternoon shifts that collide with a required lab. {person} asks what you are going to do about it.",
    [
      {
        key: "keep-lab",
        label: "Keep the lab and accept fewer hours",
        aftermath:
          "You tell {person} you will keep the lab and accept fewer hours.",
        approach: "direct",
      },
      {
        key: "change-shifts",
        label: "Open the Thursday shifts",
        aftermath:
          "You tell {person} you will open the Thursday shifts and miss the lab.",
        approach: "direct",
      },
      {
        key: "ask-supervisor",
        label: "Ask your supervisor for another option",
        aftermath: "You tell {person} you will ask your supervisor first.",
        approach: "ask",
      },
    ],
    15,
  ),
];

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
> = {
  "early.school.lunchbox-swap": {
    afterChoice: "make-secret-swap",
    premise:
      "You traded snacks with {person} despite the lunch rule. The exchanged snack is still in front of you.",
    choices: [
      {
        key: "return",
        label: "Offer to undo the snack trade",
        aftermath: "You offer {person} their snack back and ask for yours.",
      },
      {
        key: "keep",
        label: "Keep the exchanged snack",
        aftermath: "You keep the snack you received from {person}.",
      },
    ],
  },
  "early.peer.sidewalk-game": {
    afterChoice: "compromise-rule",
    premise:
      "You suggested a trial round to {person}; you have not yet agreed to keep the new rule.",
    choices: [
      {
        key: "trial",
        label: "Play the proposed trial round",
        aftermath: "You play one round with the new rule alongside {person}.",
      },
      {
        key: "original",
        label: "Withdraw the trial and use the agreed rules",
        aftermath:
          "You tell {person} you want to stick with the rules you agreed first.",
      },
    ],
  },
  "early.peer.secret-whisper": {
    afterChoice: "question-story",
    premise:
      "You asked {person} how they knew the story. You still have no evidence that it happened.",
    choices: [
      {
        key: "leave",
        label: "Leave the unverified story alone",
        aftermath:
          "You stop asking about the story and turn back to the reading.",
      },
      {
        key: "boundary",
        label: "Say you will not repeat an unverified story",
        aftermath:
          "You tell {person} you will not repeat the story without knowing it is true.",
      },
    ],
  },
  "early.peer.dropped-treat": {
    afterChoice: "comfort-words",
    premise:
      "You stayed beside {person} after their snack fell. Your own snack is still yours.",
    choices: [
      {
        key: "offer",
        label: "Offer a piece after comforting them",
        aftermath: "You offer {person} a piece of your snack.",
      },
      {
        key: "stay",
        label: "Stay beside them without offering food",
        aftermath: "You stay with {person} and keep your snack.",
      },
    ],
  },
  "early.peer.roughhouse-line": {
    afterChoice: "state-boundary",
    premise:
      "You told {person} that you do not want pushing during tag. You can decide whether to join another round.",
    choices: [
      {
        key: "return",
        label: "Rejoin tag with the no-pushing boundary",
        aftermath:
          "You rejoin the game and repeat that you do not want pushing.",
      },
      {
        key: "end",
        label: "End your tag game after naming the boundary",
        aftermath: "You tell {person} you are done with tag for now.",
      },
    ],
  },
  "early.community.library-quiet": {
    afterChoice: "laugh-out-loud",
    premise:
      "You laughed with {person} during the quiet reading. The reading is still going on.",
    choices: [
      {
        key: "settle",
        label: "Settle down and listen to the reading",
        aftermath: "You stop laughing and listen to the reading.",
      },
      {
        key: "move",
        label: "Choose a quieter spot for the reading",
        aftermath: "You move away from {person} and listen from another spot.",
      },
    ],
  },
  "early.school.crayon-sharing": {
    afterChoice: "hand-over",
    premise:
      "You handed the blue crayon to {person} and chose another color. Your drawing is still in front of you.",
    choices: [
      {
        key: "other",
        label: "Continue the drawing in the other color",
        aftermath: "You keep drawing with the color you chose after sharing.",
      },
      {
        key: "ask",
        label: "Ask for the blue crayon when they finish",
        aftermath:
          "You ask {person} to pass the blue crayon back when they finish.",
      },
    ],
  },
  "early.school.playground-turn": {
    afterChoice: "ask-turn",
    premise:
      "You asked {person} for a turn on the swing. Asking has not given you a turn yet.",
    choices: [
      {
        key: "wait",
        label: "Wait after asking for the swing",
        aftermath: "You stay beside the swing to wait for a turn.",
      },
      {
        key: "leave",
        label: "Leave the swing after asking",
        aftermath: "You tell {person} you are going to play somewhere else.",
      },
    ],
  },
  "early.school.spilled-paint": {
    afterChoice: "apologize",
    premise:
      "You apologized and blotted the wet drawing. The spill still happened; you cannot undo it by apologizing.",
    choices: [
      {
        key: "offer",
        label: "Offer a fresh sheet for the drawing",
        aftermath: "You offer {person} a fresh sheet of paper.",
      },
      {
        key: "ask",
        label: "Ask what help they want with the drawing",
        aftermath: "You ask {person} what they want you to do next.",
      },
    ],
  },
  "early.home.bedtime-delay": {
    afterChoice: "ask",
    premise:
      "You asked {person} for more time with the toy. You have not been given permission to stay up.",
    choices: [
      {
        key: "put-away",
        label: "Put the toy away while the request stands",
        aftermath:
          "You put away the toy rather than treating your request as permission.",
      },
      {
        key: "clarify",
        label: "Ask whether they can give you a few minutes",
        aftermath: "You ask {person} whether a few more minutes are possible.",
      },
    ],
  },
  "early.home.broken-mug": {
    afterChoice: "tell",
    premise:
      "You told {person} how the mug broke. Pieces are still on the floor.",
    choices: [
      {
        key: "step",
        label: "Step away from the broken mug pieces",
        aftermath: "You step away from the pieces and leave them for an adult.",
      },
      {
        key: "warn",
        label: "Point out where the mug pieces fell",
        aftermath:
          "You point out the broken pieces to {person} without touching them.",
      },
    ],
  },
  "early.home.food-refusal": {
    afterChoice: "try",
    premise: "You tried a bite of broccoli. There is still some on your plate.",
    choices: [
      {
        key: "another",
        label: "Choose another bite of broccoli",
        aftermath: "You take another bite of broccoli.",
      },
      {
        key: "enough",
        label: "Say one bite is enough for now",
        aftermath:
          "You tell {person} you have tried it and do not want another bite.",
      },
    ],
  },
  "early.home.closet-fear": {
    afterChoice: "lamp",
    premise:
      "You turned on the lamp. You can see the closet door while the branch moves outside.",
    choices: [
      {
        key: "look",
        label: "Look at the branch with the lamp on",
        aftermath:
          "You look from the window to the door and watch the shadow move.",
      },
      {
        key: "leave-on",
        label: "Leave the lamp on and settle back down",
        aftermath: "You leave the lamp on and settle back down.",
      },
    ],
  },
  "early.peer.toy-damage-accidental": {
    afterChoice: "show",
    premise:
      "You showed {person} the broken wheel and apologized. The toy is still broken.",
    choices: [
      {
        key: "help",
        label: "Ask before trying to repair their truck",
        aftermath:
          "You ask {person} whether they want you to try putting the wheel back.",
      },
      {
        key: "return",
        label: "Return the truck and loose wheel together",
        aftermath: "You give {person} the truck and its loose wheel.",
      },
    ],
  },
  "young.home.choose-activity": {
    afterChoice: "draw",
    premise:
      "You spent some time drawing. You can decide what to do with the picture you made.",
    choices: [
      {
        key: "add",
        label: "Add one more detail to your picture",
        aftermath: "You add another detail to your drawing.",
      },
      {
        key: "keep",
        label: "Put your picture somewhere safe",
        aftermath: "You put your drawing aside to keep it.",
      },
    ],
  },
  "young.home.ask-about-childhood": {
    afterChoice: "ask",
    premise:
      "You asked {person} about school. Your question does not establish any facts about their childhood.",
    choices: [
      {
        key: "space",
        label: "Give them room to answer the school question",
        aftermath: "You leave space for {person} to answer if they want to.",
      },
      {
        key: "change",
        label: "Ask if they would prefer a different subject",
        aftermath:
          "You ask {person} whether they would rather talk about something else.",
      },
    ],
  },
  "adult.home.free-time": {
    afterChoice: "read",
    premise:
      "You spent some of your free time reading. You can keep going or put the book aside.",
    choices: [
      {
        key: "more",
        label: "Read a little more before putting the book down",
        aftermath: "You spend a few more minutes reading.",
      },
      {
        key: "mark",
        label: "Mark your place and put the book aside",
        aftermath: "You mark your place and put the book aside.",
      },
    ],
  },
  "adult.home.shared-time": {
    afterChoice: "quiet",
    premise:
      "You asked {person} for quiet time. You have stated what you need, not made a shared agreement.",
    choices: [
      {
        key: "alone",
        label: "Take a few quiet minutes on your own",
        aftermath: "You take a few quiet minutes on your own.",
      },
      {
        key: "explain",
        label: "Explain that you would like to talk another time",
        aftermath: "You tell {person} you would like to talk another time.",
      },
    ],
  },
  "early.community.lost-pet-flyer": {
    afterChoice: "show",
    premise:
      "You pointed out the cat and flyer to {person}. A resemblance does not establish that this is the missing cat.",
    choices: [
      {
        key: "watch",
        label: "Watch the cat without approaching it",
        aftermath:
          "You stay beside {person} and watch the cat from a distance.",
      },
      {
        key: "compare",
        label: "Ask them to compare the cat with the flyer",
        aftermath:
          "You ask {person} to look at the flyer and the cat together.",
      },
    ],
  },
  "early.community.sidewalk-curb": {
    afterChoice: "wait",
    premise:
      "You stopped at the curb and {person} caught up. You are still on the sidewalk.",
    choices: [
      {
        key: "beside",
        label: "Continue along the sidewalk beside them",
        aftermath: "You continue along the sidewalk beside {person}.",
      },
      {
        key: "hand",
        label: "Ask to hold their hand at the curb",
        aftermath: "You ask {person} to hold your hand before going farther.",
      },
    ],
  },
  "early.community.curious-neighbor": {
    afterChoice: "answer-politely",
    premise:
      "The neighbor smiles and asks whether you like your teacher this year.",
    choices: [
      {
        key: "say-yes",
        label: "Say yes",
        aftermath: "You tell the neighbor you like your teacher.",
      },
      {
        key: "say-not-really",
        label: "Say not really",
        aftermath: "You tell the neighbor you do not really like your teacher.",
      },
      {
        key: "shrug",
        label: "Shrug",
        aftermath: "You shrug and stay beside {person}.",
      },
    ],
  },
  "early.family.packing-boxes": {
    afterChoice: "cling-old-toy",
    premise:
      "{person} kneels beside you and asks whether the toy still fits in the crate.",
    choices: [
      {
        key: "put-in-crate",
        label: "Put it in the crate",
        aftermath: "You put the toy in the crate.",
      },
      {
        key: "keep-holding",
        label: "Keep holding it",
        aftermath: "You keep holding the toy.",
      },
    ],
  },
  "adult.trans.college-vs-work": {
    afterChoice: "lean-study",
    premise:
      "{person} asks which program you are looking at first.",
    choices: [
      {
        key: "certificate",
        label: "Mention the certificate path",
        aftermath: "You mention the certificate path.",
      },
      {
        key: "unsure-yet",
        label: "Say you are still comparing options",
        aftermath: "You say you are still comparing options.",
      },
    ],
  },
  "adult.trans.drop-class-keep-job": {
    afterChoice: "keep-lab",
    premise:
      "{person} asks whether your supervisor knows you are cutting hours.",
    choices: [
      {
        key: "tell-them",
        label: "Say you will tell your supervisor",
        aftermath: "You say you will tell your supervisor.",
      },
      {
        key: "not-yet",
        label: "Say you have not decided yet",
        aftermath: "You say you have not decided yet.",
      },
    ],
  },
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
      ...(scene.key === "early.family.packing-boxes"
        ? [{ kind: "fact" as const, fact: "household.move-preparation" as const }]
        : []),
      ...(scene.key === "adult.trans.college-vs-work"
        ? [{ kind: "fact" as const, fact: "life.education-work-crossroad" as const }]
        : []),
      ...(scene.key === "adult.trans.drop-class-keep-job"
        ? [{ kind: "fact" as const, fact: "work.class-schedule-conflict" as const }]
        : []),
    ];
    return {
      key: `opening.${scene.key}`,
      ...(scene.recurrence ? { recurrence: scene.recurrence } : {}),
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
            label: choice.label.replaceAll("{person}", slot),
            description: `${scene.minutes} minutes`,
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
                    description: "5 minutes",
                    memory: choice.aftermath.replaceAll("{person}", slot),
                    nudges: [],
                    aftermath: null,
                  }),
                ),
              },
            ]
          : []),
      ],
    };
  });
