import type { OpeningLifeLater } from "../simulation/opening-life-content";

/**
 * PROPOSED, NOT SHIPPED. Eight later answers drafted to exercise the
 * later-stage mechanism and filed with ChatGPT as research question
 * `which-later-answers-an-early-choice-deserves`. Nothing here reaches a
 * player; shipped play reads `OPENING_LIFE_LATER`, which stays empty until
 * that question is answered.
 */
export const PROPOSED_OPENING_LIFE_LATER: Readonly<
  Record<string, readonly OpeningLifeLater[]>
> = {
  "early.school.crayon-sharing": [
    {
      key: "crayon-kept",
      afterChoice: "keep",
      afterDays: 10,
      premise:
        "It's drawing time again at the same table. Last time you kept the blue crayon when {person} asked for it. Today {person} has it, and you want blue.",
      choices: [
        {
          key: "ask-for-blue",
          label: "Ask {person} for the blue crayon",
          aftermath: "You ask {person} if you can use the blue crayon.",
        },
        {
          key: "wait-turn",
          label: "Wait until {person} is done",
          aftermath:
            "You use another color and wait for {person} to finish with the blue crayon.",
        },
        {
          key: "take-crayon",
          label: "Take the blue crayon",
          aftermath: "You take the blue crayon from beside {person}'s paper.",
        },
      ],
    },
    {
      key: "crayon-given",
      afterChoice: "hand-over",
      afterDays: 10,
      premise:
        "It's drawing time again at the same table. Last time you handed {person} the blue crayon. Today {person} has it and holds it out to you before you ask.",
      choices: [
        {
          key: "accept",
          label: "Take the crayon and say thanks",
          aftermath:
            "You take the blue crayon from {person} and say thank you.",
        },
        {
          key: "share-turns",
          label: "Suggest taking turns with it",
          aftermath:
            "You tell {person} you can each use the blue crayon for a while.",
        },
        {
          key: "decline",
          label: "Say {person} can keep using it",
          aftermath:
            "You tell {person} to keep the blue crayon and pick another color.",
        },
      ],
    },
  ],
  "early.home.broken-mug": [
    {
      key: "mug-unanswered",
      afterChoice: "quiet",
      afterDays: 3,
      premise:
        "When the mug broke, you didn't answer {person}'s question. Now, at home, {person} asks you again what happened to the mug.",
      choices: [
        {
          key: "tell-truth",
          label: "Say your sleeve caught it",
          aftermath:
            "You tell {person} your sleeve caught the mug and it fell.",
        },
        {
          key: "say-dont-know",
          label: "Say you don't know what happened",
          aftermath:
            "You tell {person} you don't know what happened to the mug.",
        },
        {
          key: "stay-silent",
          label: "Don't answer again",
          aftermath: "You don't answer {person}'s question about the mug.",
        },
      ],
    },
  ],
  "early.peer.roughhouse-line": [
    {
      key: "tag-after-boundary",
      afterChoice: "state-boundary",
      afterDays: 7,
      premise:
        "You're playing tag with {person} again. Last time you said you didn't want to be pushed. This time {person} tags you on the arm without pushing.",
      choices: [
        {
          key: "keep-playing",
          label: "Keep playing tag",
          aftermath: "You keep playing tag with {person}.",
        },
        {
          key: "say-good-tag",
          label: "Tell {person} that was a good tag",
          aftermath:
            "You tell {person} that's how you like to be tagged and keep playing.",
        },
      ],
    },
    {
      key: "tag-after-brush-off",
      afterChoice: "brush-off-tough",
      afterDays: 7,
      premise:
        "You're playing tag with {person} again. Last time you got knocked over and rejoined the game. This time {person} knocks you over again.",
      choices: [
        {
          key: "speak-up",
          label: "Say you don't want to be pushed",
          aftermath:
            "You tell {person} you don't want to be pushed during tag.",
        },
        {
          key: "rejoin-again",
          label: "Get up and play on",
          aftermath: "You get up and rejoin the game with {person}.",
        },
        {
          key: "leave-game",
          label: "Leave the game",
          aftermath: "You walk away from the tag game.",
        },
      ],
    },
  ],
  "early.peer.toy-damage-accidental": [
    {
      key: "truck-hidden",
      afterChoice: "hide",
      afterDays: 5,
      premise:
        "The wheel came off {person}'s toy truck in your hands, and you put the truck aside without saying anything. Now {person} asks if you know how the wheel came off.",
      choices: [
        {
          key: "admit",
          label: "Say it came off in your hands",
          aftermath:
            "You tell {person} the wheel snapped off while you were holding the truck.",
        },
        {
          key: "deny",
          label: "Say you don't know how",
          aftermath: "You tell {person} you don't know how the wheel came off.",
        },
        {
          key: "half-answer",
          label: "Say wheels come off sometimes",
          aftermath:
            "You tell {person} that wheels come off sometimes and leave it there.",
        },
      ],
    },
    {
      key: "truck-shown",
      afterChoice: "show",
      afterDays: 7,
      premise:
        "{person} has the toy truck with the wheel taped back on and asks you to play with it. Last time you showed {person} the broken wheel and apologized.",
      choices: [
        {
          key: "play",
          label: "Play trucks with {person}",
          aftermath: "You play with {person} and the taped-up truck.",
        },
        {
          key: "play-careful",
          label: "Say you'll be careful this time",
          aftermath:
            "You tell {person} you'll be careful with the truck and start playing.",
        },
        {
          key: "decline",
          label: "Say no thanks",
          aftermath: "You tell {person} you don't want to play with the truck.",
        },
      ],
    },
  ],
  "adult.home.shared-time": [
    {
      key: "quiet-asked-for",
      afterChoice: "quiet",
      afterDays: 14,
      premise:
        "You and {person} are both home. A while back you asked for a little quiet time. {person} asks whether you want quiet again or company.",
      choices: [
        {
          key: "quiet",
          label: "Ask for quiet again",
          aftermath: "You tell {person} you'd like some quiet now.",
        },
        {
          key: "company",
          label: "Say you'd like company",
          aftermath: "You tell {person} you'd like company now.",
        },
        {
          key: "quiet-then-company",
          label: "Ask for quiet first, then company",
          aftermath:
            "You tell {person} you'd like some quiet first and company after.",
        },
      ],
    },
  ],
};
