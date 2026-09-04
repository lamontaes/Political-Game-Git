import type {
  AuthoredSource,
  QuestionnaireItem,
  QuestionnaireOption,
  TransparencyReview,
} from "./setup-questionnaire-bank";
import type {
  AmbiguityDeclaration,
  DimensionNudge,
  HypothesisSupport,
} from "./player-model";

/**
 * The opening of a life, as the calibration a player actually meets.
 *
 * The human playtest was blunt about the bank this sits beside: it read as a
 * political personality survey with the axes showing, its options were
 * mini-essays that chose the action and then explained the whole ideology
 * behind it, and its weaker items were abstractions — "a family member needs
 * you while an opportunity matters a lot" — rather than anything that had
 * happened to anybody.
 *
 * These items are written against that. The rules are the authority's, and
 * they are worth having next to the copy they govern:
 *
 * *A scene, not a question.* Something is happening, somebody is in the room,
 * and the player is in it. The axis under test is never the subject of the
 * sentence.
 *
 * *Named people, who recur.* The same handful of people run through this bank
 * — Dana, Marcus, Priya, Ray, Ms. Whitfield, Curtis, Nell — so the opening
 * reads as one life rather than twenty unrelated hypotheticals. What is true
 * of them is not fixed: somebody who is a friend in one item is a problem in
 * another, and the bank never says which they will turn out to be.
 *
 * *Options are what you do.* Short, actionable, and silent about consequence.
 * No option both takes the action and explains the reasoning, because a player
 * who is handed the reasoning is being told what their choice meant.
 *
 * *A third way costs something.* Several items have one. Each pays in time,
 * money, somebody's patience, or a delay during which the problem carries on
 * being a problem. None of them makes the difficulty go away, which is the
 * specific failure the authority names.
 *
 * THESE PEOPLE ARE NOT BIOGRAPHY. Nothing here creates a person, a
 * relationship or a history in any world. The calibration is a set of weak
 * priors about the person at the keyboard and nothing else, and the separation
 * between it and world generation is load-bearing — see `new-game-identity.ts`.
 * Dana exists in this file and in no world.
 */

const OPENING_AUTHORITY: AuthoredSource = {
  sourceDocument:
    "60_CLAUDE_PR81_NARRATIVE_GRAPHICS_CONTENT_AND_LIFE_FLOW_REPAIR_MEGA_PATCH",
  reference:
    "Section C — calibration as the opening of a life, written against the 2026-09-03 playtest verdicts",
};

const LIVED: TransparencyReview = {
  verdict: "non-transparent",
  note: "A scene with named people and more than one defensible motive. The axis under test is not the subject of the sentence and no option is identifiable as the intended one.",
};

function nudge(
  dimension: DimensionNudge["dimension"],
  magnitude: number,
): DimensionNudge {
  return { dimension, magnitude };
}

function supports(
  ...entries: readonly (readonly [string, number])[]
): readonly HypothesisSupport[] {
  return entries.map(([hypothesisKey, support]) => ({
    hypothesisKey,
    support,
  }));
}

function ambiguity(
  key: string,
  hypothesisKeys: readonly string[],
  note: string,
): AmbiguityDeclaration {
  return { key, hypothesisKeys: [...hypothesisKeys], note };
}

function option(
  key: string,
  text: string,
  nudges: readonly DimensionNudge[],
  hypotheses: readonly HypothesisSupport[] = [],
  declared: AmbiguityDeclaration | null = null,
): QuestionnaireOption {
  return { key, text, nudges, hypotheses, ambiguity: declared };
}

function item(
  key: string,
  register: QuestionnaireItem["register"],
  reference: string,
  observationWeight: number,
  prompt: string,
  options: readonly QuestionnaireOption[],
  fixedOrdinal: number | null = null,
): QuestionnaireItem {
  return {
    key,
    source: { ...OPENING_AUTHORITY, reference },
    review: LIVED,
    register,
    fixedOrdinal,
    observationWeight,
    prompt,
    options,
  };
}

/* -------------------------------------------------------------------------- */
/* The three that open every run                                               */
/* -------------------------------------------------------------------------- */

/**
 * Personal, relational, and about somebody's word — in that order.
 *
 * The old openers led with a civic organization's policy initiative and a
 * public debate. Opening a life with that is the survey the authority is
 * trying to stop the game being. These three open with a kitchen, a corridor
 * and a phone call.
 */
const OPENERS: readonly QuestionnaireItem[] = [
  item(
    "kitchen_late",
    "lived-personal",
    "Opening 01 — the kitchen at eleven",
    1,
    "It is eleven at night and Dana is at the kitchen table with the bills spread out, which is not where Dana usually is. You have been out. She looks up and says the thing with the furnace is worse than she told you.",
    [
      option(
        "sit-down",
        "Sit down and go through them with her",
        [
          nudge("personal-ties", 0.5),
          nudge("care-obligation", 0.35),
          nudge("privacy-preference", -0.2),
        ],
        supports(["ties.turn-towards", 0.8], ["duty.share-the-load", 0.7]),
        ambiguity(
          "kitchen.why-sit-down",
          ["ties.turn-towards", "duty.share-the-load"],
          "Sitting down can be about her or about the furnace, and the choice does not tell them apart.",
        ),
      ),
      option(
        "ask-what-she-needs",
        "Ask what she actually needs from you",
        [nudge("decision-style", 0.4), nudge("personal-ties", 0.25)],
        supports(["style.name-the-ask", 0.75]),
      ),
      option(
        "say-youll-sort-it",
        "Say you'll deal with the furnace",
        [
          nudge("achievement-ambition", 0.3),
          nudge("privacy-preference", 0.25),
          nudge("care-obligation", 0.2),
        ],
        supports(["style.handle-it-alone", 0.8]),
      ),
      option(
        "not-tonight",
        "Tell her you can't do this tonight",
        [
          nudge("security-stability", 0.3),
          nudge("personal-ties", -0.35),
          nudge("privacy-preference", 0.3),
        ],
        supports(["ties.protect-the-margin", 0.7]),
      ),
    ],
    1,
  ),
  item(
    "marcus_and_the_trip_fund",
    "lived-relational",
    "Opening 02 — what Marcus said in the hallway",
    1,
    "Marcus tells you, in confidence, that he took money out of the trip fund and is going to put it back before anyone counts it. He is not asking for anything. He just wanted somebody to know.",
    [
      option(
        "keep-it",
        "Keep it to yourself",
        [
          nudge("personal-ties", 0.45),
          nudge("privacy-preference", 0.4),
          nudge("civic-order", -0.35),
        ],
        supports(["ties.loyalty-first", 0.85]),
      ),
      option(
        "make-him-tell",
        "Tell him to say it himself, this week",
        [
          nudge("civic-order", 0.35),
          nudge("decision-style", 0.4),
          nudge("personal-ties", 0.15),
        ],
        supports(
          ["order.rules-hold", 0.7],
          ["ties.loyalty-with-conditions", 0.75],
        ),
        ambiguity(
          "marcus.why-push",
          ["order.rules-hold", "ties.loyalty-with-conditions"],
          "Pushing him to confess can be about the fund or about him, and this choice does not separate them.",
        ),
      ),
      option(
        "lend-him",
        "Offer to cover the gap yourself",
        [
          nudge("personal-ties", 0.5),
          nudge("risk-appetite", 0.3),
          nudge("security-stability", -0.3),
        ],
        supports(["ties.absorb-the-cost", 0.8]),
      ),
      option(
        "tell-someone",
        "Tell whoever is responsible for the fund",
        [
          nudge("civic-order", 0.5),
          nudge("institutional-trust", 0.3),
          nudge("personal-ties", -0.45),
        ],
        supports(["order.rules-hold", 0.85]),
      ),
    ],
    2,
  ),
  item(
    "priya_reference",
    "lived-moral",
    "Opening 03 — the reference for Priya",
    1,
    "Priya has asked you to put your name to a reference. Most of it is accurate. One line about what she ran last year is not, and she wrote it herself.",
    [
      option(
        "sign-it",
        "Sign it as written",
        [
          nudge("personal-ties", 0.45),
          nudge("civic-order", -0.4),
          nudge("risk-appetite", 0.3),
        ],
        supports(["ties.loyalty-first", 0.8]),
      ),
      option(
        "fix-the-line",
        "Change the line and sign the rest",
        [
          nudge("decision-style", 0.45),
          nudge("civic-order", 0.3),
          nudge("personal-ties", 0.15),
        ],
        supports(["style.correct-quietly", 0.85]),
      ),
      option(
        "ask-her-first",
        "Tell her you'll sign a different version",
        [
          nudge("decision-style", 0.35),
          nudge("personal-ties", 0.3),
          nudge("privacy-preference", -0.2),
        ],
        supports(["style.name-the-ask", 0.7]),
      ),
      option(
        "decline",
        "Say you'd rather not write one",
        [
          nudge("civic-order", 0.35),
          nudge("privacy-preference", 0.4),
          nudge("personal-ties", -0.4),
        ],
        supports(["order.keep-your-name-clean", 0.8]),
      ),
    ],
    3,
  ),
];

/* -------------------------------------------------------------------------- */
/* Personal and household                                                      */
/* -------------------------------------------------------------------------- */

const PERSONAL: readonly QuestionnaireItem[] = [
  item(
    "ray_car",
    "lived-personal",
    "Personal — Ray and the car",
    0.9,
    "Your brother Ray has borrowed the car three times this month and brought it back on an empty tank each time. He is between jobs. You need it on Thursday.",
    [
      option(
        "say-thursday",
        "Tell him Thursday is yours",
        [nudge("decision-style", 0.4), nudge("security-stability", 0.3)],
        supports(["style.state-the-limit", 0.8]),
      ),
      option(
        "say-nothing",
        "Sort out Thursday around him",
        [
          nudge("personal-ties", 0.4),
          nudge("care-obligation", 0.3),
          nudge("achievement-ambition", -0.2),
        ],
        supports(["ties.absorb-the-cost", 0.75]),
      ),
      option(
        "gas-rule",
        "Say he can have it if he fills it",
        [
          nudge("decision-style", 0.35),
          nudge("econ-distribution", -0.2),
          nudge("personal-ties", 0.2),
        ],
        supports(["style.conditions-not-refusal", 0.8]),
      ),
      option(
        "ask-why",
        "Ask him what is actually going on",
        [
          nudge("personal-ties", 0.35),
          nudge("care-obligation", 0.4),
          nudge("privacy-preference", -0.3),
        ],
        supports(["ties.turn-towards", 0.8]),
      ),
    ],
  ),
  item(
    "nell_moving",
    "lived-personal",
    "Personal — Nell wants to move",
    0.9,
    "Nell has found somewhere better for both of you, forty minutes further out. It is cheaper and it is not near anyone you know. She wants an answer by Friday.",
    [
      option(
        "go",
        "Say yes",
        [
          nudge("risk-appetite", 0.4),
          nudge("personal-ties", 0.35),
          nudge("security-stability", -0.25),
        ],
        supports(["risk.follow-the-person", 0.8]),
      ),
      option(
        "stay",
        "Say you want to stay where you are",
        [
          nudge("security-stability", 0.45),
          nudge("personal-ties", -0.15),
          nudge("risk-appetite", -0.35),
        ],
        supports(["security.stay-put", 0.8]),
      ),
      option(
        "ask-for-a-year",
        "Ask her to give it another year here",
        [
          nudge("decision-style", -0.2),
          nudge("security-stability", 0.3),
          nudge("personal-ties", 0.2),
        ],
        supports(["style.buy-time", 0.75]),
      ),
    ],
  ),
  item(
    "curtis_shift",
    "lived-personal",
    "Personal — the shift Curtis wants covering",
    0.85,
    "Curtis asks you to take his Saturday. He has asked twice before and you have said yes twice before. This Saturday is one you had plans for.",
    [
      option(
        "take-it",
        "Take it",
        [nudge("personal-ties", 0.4), nudge("care-obligation", 0.3)],
        supports(["ties.absorb-the-cost", 0.8]),
      ),
      option(
        "say-no",
        "Say no this time",
        [
          nudge("security-stability", 0.35),
          nudge("decision-style", 0.3),
          nudge("personal-ties", -0.3),
        ],
        supports(["style.state-the-limit", 0.8]),
      ),
      option(
        "swap",
        "Offer him a different day",
        [nudge("decision-style", 0.4), nudge("personal-ties", 0.25)],
        supports(["style.conditions-not-refusal", 0.75]),
      ),
      option(
        "say-its-the-last",
        "Take it and say it's the last one",
        [
          nudge("personal-ties", 0.3),
          nudge("decision-style", 0.35),
          nudge("privacy-preference", -0.15),
        ],
        supports(
          ["ties.absorb-the-cost", 0.5],
          ["style.state-the-limit", 0.55],
        ),
        ambiguity(
          "curtis.why-the-warning",
          ["ties.absorb-the-cost", "style.state-the-limit"],
          "Saying it is the last one is both giving in and drawing a line, and this option is both.",
        ),
      ),
    ],
  ),
  item(
    "money_that_arrived",
    "lived-personal",
    "Personal — the money nobody was expecting",
    0.85,
    "Eight hundred dollars arrives that nothing is already claiming. Dana does not know about it yet. The furnace is still the furnace, and you have not had a week away in two years.",
    [
      option(
        "furnace",
        "Put it toward the furnace",
        [
          nudge("security-stability", 0.45),
          nudge("care-obligation", 0.25),
          nudge("risk-appetite", -0.3),
        ],
        supports(["security.close-the-gap", 0.85]),
      ),
      option(
        "the-week",
        "Book the week away",
        [
          nudge("personal-ties", 0.4),
          nudge("risk-appetite", 0.3),
          nudge("security-stability", -0.3),
        ],
        supports(["ties.spend-it-on-people", 0.8]),
      ),
      option(
        "put-it-by",
        "Say nothing and put it by",
        [
          nudge("privacy-preference", 0.5),
          nudge("security-stability", 0.35),
          nudge("personal-ties", -0.25),
        ],
        supports(["security.keep-a-margin", 0.8]),
      ),
      option(
        "let-her-decide",
        "Tell her about it and let her decide",
        [
          nudge("personal-ties", 0.45),
          nudge("privacy-preference", -0.45),
          nudge("decision-style", -0.15),
        ],
        supports(["ties.turn-towards", 0.85]),
      ),
    ],
  ),
];

/* -------------------------------------------------------------------------- */
/* Relational and work                                                         */
/* -------------------------------------------------------------------------- */

const RELATIONAL: readonly QuestionnaireItem[] = [
  item(
    "whitfield_grant",
    "lived-relational",
    "Relational — the numbers in Ms. Whitfield's application",
    1,
    "Ms. Whitfield taught you and got you the placement you are in. You are checking the grant application she asked you to proofread, and the participation numbers in it are not the numbers you have been keeping.",
    [
      option(
        "tell-her",
        "Tell her the numbers are wrong",
        [nudge("decision-style", 0.45), nudge("civic-order", 0.3)],
        supports(["style.say-it-to-their-face", 0.85]),
      ),
      option(
        "fix-quietly",
        "Correct them and say nothing",
        [
          nudge("privacy-preference", 0.35),
          nudge("personal-ties", 0.3),
          nudge("decision-style", 0.2),
        ],
        supports(["style.correct-quietly", 0.85]),
      ),
      option(
        "leave-it",
        "Leave it as she wrote it",
        [
          nudge("personal-ties", 0.4),
          nudge("civic-order", -0.4),
          nudge("institutional-trust", -0.2),
        ],
        supports(["ties.loyalty-first", 0.8]),
      ),
      option(
        "ask-where-from",
        "Ask her where the figures came from",
        [
          nudge("decision-style", 0.35),
          nudge("institutional-trust", 0.25),
          nudge("personal-ties", 0.2),
        ],
        supports(["style.name-the-ask", 0.8]),
      ),
    ],
  ),
  item(
    "who_gets_the_credit",
    "lived-relational",
    "Relational — whose work it was",
    0.9,
    "In the meeting, Marcus describes the thing you spent three weeks on as something the team put together. He is not wrong exactly. Two people in the room think it was his.",
    [
      option(
        "say-it-there",
        "Say it was yours, in the room",
        [
          nudge("decision-style", 0.45),
          nudge("achievement-ambition", 0.4),
          nudge("personal-ties", -0.3),
        ],
        supports(["ambition.claim-it", 0.85]),
      ),
      option(
        "say-it-after",
        "Raise it with him afterwards",
        [nudge("privacy-preference", 0.35), nudge("decision-style", 0.3)],
        supports(["style.correct-quietly", 0.75]),
      ),
      option(
        "leave-it",
        "Leave it",
        [
          nudge("achievement-ambition", -0.35),
          nudge("personal-ties", 0.3),
          nudge("security-stability", 0.2),
        ],
        supports(["ties.keep-the-peace", 0.8]),
      ),
      option(
        "put-it-in-writing",
        "Send round a note listing who did what",
        [
          nudge("decision-style", 0.4),
          nudge("institutional-trust", 0.3),
          nudge("achievement-ambition", 0.25),
        ],
        supports(["ambition.claim-it", 0.5], ["style.use-the-process", 0.7]),
        ambiguity(
          "credit.why-the-note",
          ["ambition.claim-it", "style.use-the-process"],
          "A written record is both a way of getting the credit and a way of not having the argument.",
        ),
      ),
    ],
  ),
  item(
    "the_friend_who_was_wrong",
    "lived-relational",
    "Relational — Priya, in public, wrong",
    0.9,
    "Priya says something at the meeting that is straightforwardly untrue, about a person who is not there. Nobody corrects her. You know it is untrue because you were the one who told her the true version.",
    [
      option(
        "correct-her",
        "Correct her there",
        [
          nudge("civic-order", 0.4),
          nudge("decision-style", 0.45),
          nudge("personal-ties", -0.35),
        ],
        supports(["order.the-record-matters", 0.85]),
      ),
      option(
        "after",
        "Take it up with her afterwards",
        [nudge("privacy-preference", 0.4), nudge("personal-ties", 0.3)],
        supports(["style.correct-quietly", 0.8]),
      ),
      option(
        "tell-the-person",
        "Tell the person it was about",
        [
          nudge("personal-ties", 0.2),
          nudge("civic-order", 0.3),
          nudge("privacy-preference", -0.35),
        ],
        supports(["order.the-record-matters", 0.6]),
      ),
      option(
        "nothing",
        "Say nothing to anyone",
        [
          nudge("privacy-preference", 0.45),
          nudge("security-stability", 0.25),
          nudge("civic-order", -0.3),
        ],
        supports(["ties.keep-the-peace", 0.75]),
      ),
    ],
  ),
  item(
    "the_job_ray_wants",
    "lived-relational",
    "Relational — putting Ray forward",
    0.85,
    "There is an opening where you work and Ray would be adequate at it. Somebody else who applied would be better and you do not know them. You are asked, informally, what you think.",
    [
      option(
        "back-ray",
        "Put Ray forward",
        [
          nudge("personal-ties", 0.5),
          nudge("civic-order", -0.35),
          nudge("institutional-trust", -0.2),
        ],
        supports(["ties.look-after-your-own", 0.85]),
      ),
      option(
        "say-the-truth",
        "Say the other candidate is stronger",
        [
          nudge("civic-order", 0.45),
          nudge("institutional-trust", 0.3),
          nudge("personal-ties", -0.4),
        ],
        supports(["order.the-record-matters", 0.8]),
      ),
      option(
        "declare-it",
        "Say he's your brother and step out of it",
        [
          nudge("institutional-trust", 0.45),
          nudge("decision-style", 0.35),
          nudge("privacy-preference", -0.25),
        ],
        supports(["style.use-the-process", 0.85]),
      ),
    ],
  ),
];

/* -------------------------------------------------------------------------- */
/* Moral and everyday                                                          */
/* -------------------------------------------------------------------------- */

const MORAL: readonly QuestionnaireItem[] = [
  item(
    "the_till_and_the_kid",
    "lived-moral",
    "Moral — the register and the kid",
    0.9,
    "The kid on the register has undercharged you by nine dollars and has not noticed. There is a line behind you. The manager is the one who took Curtis's hours off him last month for less.",
    [
      option(
        "say-so",
        "Say so at the register",
        [nudge("civic-order", 0.4), nudge("decision-style", 0.35)],
        supports(["order.rules-hold", 0.7]),
      ),
      option(
        "leave-it",
        "Leave it and go",
        [nudge("civic-order", -0.35), nudge("privacy-preference", 0.3)],
        supports(["order.not-my-job", 0.7]),
      ),
      option(
        "tell-the-kid-outside",
        "Catch them outside and hand it back",
        [
          nudge("personal-ties", 0.4),
          nudge("civic-order", 0.25),
          nudge("privacy-preference", 0.25),
        ],
        supports(["order.rules-hold", 0.45], ["ties.protect-the-person", 0.7]),
        ambiguity(
          "register.why-outside",
          ["order.rules-hold", "ties.protect-the-person"],
          "Doing it outside is both paying what is owed and keeping somebody out of trouble.",
        ),
      ),
    ],
  ),
  item(
    "the_thing_you_saw",
    "lived-moral",
    "Moral — what you saw from the bus",
    0.85,
    "From the bus you watched a van clip a parked car and drive on. You have the plate. The car belongs to nobody you know and the police non-emergency line takes about forty minutes.",
    [
      option(
        "report",
        "Ring it in",
        [nudge("civic-order", 0.45), nudge("institutional-trust", 0.35)],
        supports(["order.rules-hold", 0.8]),
      ),
      option(
        "note-on-the-car",
        "Leave the plate under the wiper",
        [
          nudge("decision-style", 0.35),
          nudge("institutional-trust", -0.25),
          nudge("civic-order", 0.2),
        ],
        supports(["style.direct-not-official", 0.8]),
      ),
      option(
        "nothing",
        "Do nothing",
        [
          nudge("civic-order", -0.4),
          nudge("privacy-preference", 0.35),
          nudge("institutional-trust", -0.2),
        ],
        supports(["order.not-my-job", 0.8]),
      ),
    ],
  ),
  item(
    "the_form",
    "lived-moral",
    "Moral — the box on the form",
    0.85,
    "The form asks a question you can answer two ways, both defensible. One way gets Dana's hours covered from next month. The other is the one you would give if somebody asked you out loud.",
    [
      option(
        "the-useful-answer",
        "Answer the way that gets the hours",
        [
          nudge("care-obligation", 0.45),
          nudge("civic-order", -0.35),
          nudge("risk-appetite", 0.25),
        ],
        supports(["ties.look-after-your-own", 0.8]),
      ),
      option(
        "the-plain-answer",
        "Answer the way you would say it",
        [nudge("civic-order", 0.45), nudge("institutional-trust", 0.3)],
        supports(["order.keep-your-name-clean", 0.8]),
      ),
      option(
        "ask",
        "Ring and ask which they mean",
        [
          nudge("institutional-trust", 0.4),
          nudge("decision-style", 0.35),
          nudge("care-obligation", 0.15),
        ],
        supports(["style.use-the-process", 0.8]),
      ),
    ],
  ),
  item(
    "the_petition_at_the_door",
    "lived-moral",
    "Moral — the clipboard at the door",
    0.85,
    "Somebody at the door wants your name on a petition about the road. You agree with about two-thirds of what is on the sheet. The third you disagree with is the part that will get quoted.",
    [
      option(
        "sign",
        "Sign it",
        [nudge("civic-order", 0.2), nudge("governance-scale", -0.35)],
        supports(["civic.get-it-moving", 0.75]),
      ),
      option(
        "sign-with-a-note",
        "Sign it and write your objection on it",
        [
          nudge("decision-style", 0.45),
          nudge("privacy-preference", -0.25),
          nudge("governance-scale", -0.2),
        ],
        supports(["style.on-the-record", 0.8]),
      ),
      option(
        "refuse",
        "Say no and say which part",
        [
          nudge("decision-style", 0.4),
          nudge("civic-order", 0.2),
          nudge("personal-ties", -0.2),
        ],
        supports(["order.keep-your-name-clean", 0.75]),
      ),
      option(
        "take-it-away",
        "Say you'll read it properly first",
        [
          nudge("decision-style", -0.2),
          nudge("privacy-preference", 0.3),
          nudge("institutional-trust", 0.15),
        ],
        supports(["style.buy-time", 0.7]),
      ),
    ],
  ),
  item(
    "the_rule_and_curtis",
    "lived-moral",
    "Moral — the rule, and Curtis",
    0.95,
    "The rule about the fire door is clear and Curtis has been propping it open every shift because the alternative is walking the long way round twelve times a night. You are the one who has been asked whether it happens.",
    [
      option(
        "say-yes",
        "Say that it happens",
        [
          nudge("civic-order", 0.5),
          nudge("institutional-trust", 0.3),
          nudge("personal-ties", -0.4),
        ],
        supports(["order.rules-hold", 0.85]),
      ),
      option(
        "say-no",
        "Say it doesn't",
        [
          nudge("personal-ties", 0.5),
          nudge("civic-order", -0.45),
          nudge("risk-appetite", 0.3),
        ],
        supports(["ties.loyalty-first", 0.85]),
      ),
      option(
        "answer-the-other-question",
        "Say why the long way round exists",
        [
          nudge("decision-style", 0.45),
          nudge("institutional-trust", 0.2),
          nudge("civic-order", 0.15),
        ],
        supports(["style.change-the-question", 0.8]),
      ),
      option(
        "warn-him-first",
        "Tell Curtis you're going to be asked again",
        [
          nudge("personal-ties", 0.35),
          nudge("privacy-preference", 0.3),
          nudge("decision-style", 0.2),
        ],
        supports(["ties.loyalty-first", 0.5], ["style.correct-quietly", 0.55]),
        ambiguity(
          "firedoor.why-warn",
          ["ties.loyalty-first", "style.correct-quietly"],
          "Warning him is both taking his side and getting it stopped without a report.",
        ),
      ),
    ],
  ),
];

/* -------------------------------------------------------------------------- */
/* Civic, but lived                                                            */
/* -------------------------------------------------------------------------- */

const CIVIC_LIVED: readonly QuestionnaireItem[] = [
  item(
    "the_bus_route",
    "civic-lived",
    "Civic — the route they are cutting",
    0.95,
    "The transit authority is cutting the bus that Dana takes to work and that about forty other people on your street use. Comments close Monday, and the replacement route leaves a two-mile walk at either end.",
    [
      option(
        "write",
        "Write to the consultation",
        [
          nudge("institutional-trust", 0.4),
          nudge("governance-scale", -0.25),
          nudge("decision-style", 0.2),
        ],
        supports(["civic.use-the-channel", 0.8]),
      ),
      option(
        "get-the-road-out",
        "Knock on doors and get others to write",
        [
          nudge("governance-scale", -0.4),
          nudge("achievement-ambition", 0.3),
          nudge("privacy-preference", -0.3),
        ],
        supports(["civic.organise-it", 0.85]),
      ),
      option(
        "sort-dana",
        "Work out how Dana gets to work instead",
        [
          nudge("care-obligation", 0.45),
          nudge("governance-scale", 0.2),
          nudge("institutional-trust", -0.3),
        ],
        supports(["ties.look-after-your-own", 0.8]),
      ),
      option(
        "go-to-the-council-member",
        "Corner your council member about it",
        [
          nudge("decision-style", 0.4),
          nudge("institutional-trust", -0.2),
          nudge("achievement-ambition", 0.25),
        ],
        supports(
          ["civic.organise-it", 0.45],
          ["style.direct-not-official", 0.7],
        ),
        ambiguity(
          "bus.why-the-council-member",
          ["civic.organise-it", "style.direct-not-official"],
          "Going straight to a person is both effective politics and a way round the process.",
        ),
      ),
    ],
  ),
  item(
    "the_yard_at_the_end",
    "civic-lived",
    "Civic — the yard at the end of the road",
    1,
    "The trucking yard at the end of the street has applied to run overnight. It employs about thirty people, four of whom live on your street. The trucks would pass Nell's window every eleven minutes.",
    [
      option(
        "object",
        "Object to the application",
        [
          nudge("ecological-priority", 0.4),
          nudge("civic-order", 0.25),
          nudge("econ-distribution", 0.15),
        ],
        supports(["local.the-street-first", 0.8]),
      ),
      option(
        "support",
        "Support it",
        [
          nudge("econ-distribution", -0.3),
          nudge("ecological-priority", -0.4),
          nudge("achievement-ambition", 0.2),
        ],
        supports(["local.the-work-first", 0.8]),
      ),
      option(
        "conditions",
        "Object unless they cut the night hours",
        [
          nudge("decision-style", 0.45),
          nudge("ecological-priority", 0.2),
          nudge("econ-distribution", 0.1),
        ],
        supports(["style.conditions-not-refusal", 0.85]),
      ),
      option(
        "stay-out",
        "Stay out of it",
        [
          nudge("privacy-preference", 0.4),
          nudge("governance-scale", 0.2),
          nudge("civic-order", -0.15),
        ],
        supports(["local.not-my-fight", 0.75]),
      ),
    ],
  ),
  item(
    "the_school_place",
    "civic-lived",
    "Civic — the attendance boundary",
    0.95,
    "The school attendance boundary is being redrawn. Under the new line the kids on your street go to the school two miles further out, and the kids on the street behind take those seats. Both streets have shown up to the board meeting.",
    [
      option(
        "argue-for-yours",
        "Argue for your own road",
        [
          nudge("personal-ties", 0.4),
          nudge("governance-scale", -0.35),
          nudge("care-obligation", 0.3),
        ],
        supports(["local.the-street-first", 0.85]),
      ),
      option(
        "argue-for-the-rule",
        "Argue for whichever line is defensible",
        [
          nudge("civic-order", 0.4),
          nudge("governance-scale", 0.35),
          nudge("institutional-trust", 0.25),
        ],
        supports(["order.the-rule-not-the-outcome", 0.85]),
      ),
      option(
        "argue-for-the-worst-off",
        "Argue for whoever has the furthest to travel",
        [
          nudge("econ-distribution", 0.45),
          nudge("care-obligation", 0.3),
          nudge("governance-scale", 0.15),
        ],
        supports(["fairness.worst-off-first", 0.85]),
      ),
      option(
        "ask-for-more-places",
        "Argue that the line is the wrong argument",
        [
          nudge("decision-style", 0.4),
          nudge("econ-distribution", 0.25),
          nudge("institutional-trust", -0.2),
        ],
        supports(["style.change-the-question", 0.8]),
      ),
    ],
  ),
  item(
    "the_sold_field",
    "civic-lived",
    "Civic — the field behind the apartments",
    0.95,
    "The field behind the apartments is going to be built on. Ninety units, a third of them at rents people on your street could actually pay. It is also the only open ground within a mile.",
    [
      option(
        "back-the-homes",
        "Back the development",
        [
          nudge("econ-distribution", 0.4),
          nudge("ecological-priority", -0.35),
          nudge("social-pluralism", 0.2),
        ],
        supports(["housing.build-it", 0.85]),
      ),
      option(
        "oppose",
        "Oppose it",
        [
          nudge("ecological-priority", 0.45),
          nudge("econ-distribution", -0.2),
          nudge("social-pluralism", -0.25),
        ],
        supports(["local.the-street-first", 0.8]),
      ),
      option(
        "push-the-share",
        "Back it only if the affordable share goes up",
        [
          nudge("econ-distribution", 0.45),
          nudge("decision-style", 0.35),
          nudge("risk-appetite", 0.2),
        ],
        supports(["style.conditions-not-refusal", 0.8]),
      ),
      option(
        "the-other-site",
        "Push for the empty site by the depot instead",
        [
          nudge("decision-style", 0.4),
          nudge("ecological-priority", 0.25),
          nudge("econ-distribution", 0.15),
        ],
        supports(["style.change-the-question", 0.75]),
      ),
    ],
  ),
  item(
    "the_night_the_power_went",
    "civic-lived",
    "Civic — the night the power went",
    0.9,
    "The building has been without power for two days. The utility says Thursday. There is a man on the next floor who needs a refrigerator for what he takes, and a council member who has not returned three calls.",
    [
      option(
        "go-to-the-press",
        "Get it in the paper",
        [
          nudge("institutional-trust", -0.4),
          nudge("decision-style", 0.4),
          nudge("privacy-preference", -0.3),
        ],
        supports(["civic.make-it-public", 0.85]),
      ),
      option(
        "sort-the-fridge",
        "Sort out the fridge yourself",
        [
          nudge("care-obligation", 0.5),
          nudge("personal-ties", 0.3),
          nudge("governance-scale", -0.2),
        ],
        supports(["ties.fix-what-is-in-front-of-you", 0.85]),
      ),
      option(
        "log-everything",
        "Log every hour and every call",
        [
          nudge("institutional-trust", 0.35),
          nudge("decision-style", 0.45),
          nudge("civic-order", 0.2),
        ],
        supports(["style.use-the-process", 0.85]),
      ),
      option(
        "get-the-floor-together",
        "Get the whole floor to go down there together",
        [
          nudge("governance-scale", -0.35),
          nudge("achievement-ambition", 0.3),
          nudge("civic-order", -0.15),
        ],
        supports(["civic.organise-it", 0.8]),
      ),
    ],
  ),
  item(
    "the_man_at_the_meeting",
    "civic-lived",
    "Civic — the man who keeps talking",
    0.85,
    "The same man has spoken for eleven of the meeting's twenty minutes, on something the meeting is not about. Two people who came to say something specific have not spoken and are putting their coats on.",
    [
      option(
        "cut-him-off",
        "Cut him off",
        [
          nudge("decision-style", 0.45),
          nudge("civic-order", 0.3),
          nudge("personal-ties", -0.25),
        ],
        supports(["order.the-meeting-is-the-thing", 0.8]),
      ),
      option(
        "let-him-finish",
        "Let him finish",
        [
          nudge("social-pluralism", 0.35),
          nudge("civic-order", -0.2),
          nudge("decision-style", -0.25),
        ],
        supports(["pluralism.everyone-speaks", 0.8]),
      ),
      option(
        "ask-the-two",
        "Ask the two in coats to go next",
        [
          nudge("decision-style", 0.4),
          nudge("social-pluralism", 0.25),
          nudge("care-obligation", 0.2),
        ],
        supports(["style.change-the-question", 0.7]),
      ),
      option(
        "propose-a-limit",
        "Propose a time limit for everyone",
        [
          nudge("civic-order", 0.4),
          nudge("institutional-trust", 0.3),
          nudge("governance-scale", 0.2),
        ],
        supports(["style.use-the-process", 0.8]),
      ),
    ],
  ),
];

/* -------------------------------------------------------------------------- */
/* Policy, embedded in a place                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Policy questions the playtest asked for: substantial, and set somewhere.
 *
 * The verdict on the existing policy bank was not that policy is unwelcome —
 * the housing-pressure and protest items were called excellent — but that the
 * weak ones floated free of any place and the options explained themselves.
 * These keep the substance and put it on a named street with named people.
 */
const POLICY_LIVED: readonly QuestionnaireItem[] = [
  item(
    "the_ward_budget",
    "policy-lived",
    "Policy — what the district has left",
    1,
    "The district has about $400,000 left and three claims on it: the senior center Ray's neighbor uses, repaving the street the buses were pulled off, and the two youth workers whose positions end in April.",
    [
      option(
        "senior-center",
        "Keep the senior center open",
        [
          nudge("care-obligation", 0.45),
          nudge("econ-distribution", 0.35),
          nudge("ecological-priority", 0.05),
        ],
        supports(["fairness.worst-off-first", 0.8]),
      ),
      option(
        "the-road",
        "Do the road",
        [
          nudge("econ-distribution", -0.2),
          nudge("governance-scale", 0.25),
          nudge("decision-style", 0.3),
        ],
        supports(["policy.the-thing-most-people-use", 0.8]),
      ),
      option(
        "youth-workers",
        "Keep the youth workers",
        [
          nudge("econ-distribution", 0.35),
          nudge("civic-order", 0.25),
          nudge("care-obligation", 0.3),
        ],
        supports(["policy.spend-early", 0.8]),
      ),
      option(
        "split-it",
        "Split it three ways and shorten all three",
        [
          nudge("decision-style", -0.35),
          nudge("social-pluralism", 0.2),
          nudge("institutional-trust", -0.15),
        ],
        supports(["style.avoid-the-choice", 0.8]),
      ),
    ],
  ),
  item(
    "the_licence",
    "policy-lived",
    "Policy — the licence at the corner",
    0.95,
    "The shop on the corner has applied to sell alcohol until two. It is the only shop within half a mile that opens late. The three residents who objected all live above it.",
    [
      option(
        "grant",
        "Grant it",
        [
          nudge("social-pluralism", 0.35),
          nudge("econ-distribution", -0.25),
          nudge("civic-order", -0.3),
        ],
        supports(["policy.let-the-business-trade", 0.8]),
      ),
      option(
        "refuse",
        "Refuse it",
        [
          nudge("civic-order", 0.4),
          nudge("care-obligation", 0.25),
          nudge("social-pluralism", -0.3),
        ],
        supports(["order.the-people-who-live-there", 0.8]),
      ),
      option(
        "midnight",
        "Grant it to midnight and review it in a year",
        [
          nudge("decision-style", 0.4),
          nudge("institutional-trust", 0.3),
          nudge("civic-order", 0.15),
        ],
        supports(["style.conditions-not-refusal", 0.85]),
      ),
    ],
  ),
  item(
    "the_inspection",
    "policy-lived",
    "Policy — the inspector and the bakery",
    1,
    "The bakery on the block fails on two counts. One is paperwork. The other would cost about $9,000 to put right, which the family who run it do not have, and the inspector has to decide what to write.",
    [
      option(
        "enforce",
        "Enforce both, on the same terms as anyone",
        [
          nudge("civic-order", 0.45),
          nudge("institutional-trust", 0.35),
          nudge("econ-distribution", 0.1),
        ],
        supports(["order.the-rule-not-the-outcome", 0.85]),
      ),
      option(
        "time-to-fix",
        "Give them six months on the expensive one",
        [
          nudge("care-obligation", 0.4),
          nudge("decision-style", 0.3),
          nudge("civic-order", -0.2),
        ],
        supports(["style.conditions-not-refusal", 0.8]),
      ),
      option(
        "paperwork-only",
        "Write up the paperwork failure only",
        [
          nudge("civic-order", -0.4),
          nudge("personal-ties", 0.3),
          nudge("institutional-trust", -0.35),
        ],
        supports(["ties.protect-the-person", 0.8]),
      ),
      option(
        "find-the-money",
        "Enforce it and go looking for a grant for them",
        [
          nudge("econ-distribution", 0.4),
          nudge("institutional-trust", 0.3),
          nudge("decision-style", 0.35),
        ],
        supports(
          ["order.the-rule-not-the-outcome", 0.5],
          ["fairness.worst-off-first", 0.55],
        ),
        ambiguity(
          "bakery.why-the-grant",
          ["order.the-rule-not-the-outcome", "fairness.worst-off-first"],
          "Enforcing and then finding money is both holding the line and refusing the outcome the line produces.",
        ),
      ),
    ],
  ),
  item(
    "the_camera",
    "policy-lived",
    "Policy — the camera on the block",
    0.95,
    "There is money for a camera on the block, where two people were assaulted last year. It would also record every person going in and out of the legal aid office and the mosque next to it.",
    [
      option(
        "put-it-up",
        "Put it up",
        [
          nudge("civic-order", 0.45),
          nudge("privacy-preference", -0.4),
          nudge("security-posture", 0.2),
        ],
        supports(["order.safety-first", 0.85]),
      ),
      option(
        "no",
        "Don't",
        [
          nudge("privacy-preference", 0.5),
          nudge("civic-order", -0.35),
          nudge("social-pluralism", 0.25),
        ],
        supports(["liberty.not-watched", 0.85]),
      ),
      option(
        "angle-it",
        "Put it up pointing only at the two entrances",
        [
          nudge("decision-style", 0.4),
          nudge("privacy-preference", 0.2),
          nudge("civic-order", 0.2),
        ],
        supports(["style.conditions-not-refusal", 0.8]),
      ),
      option(
        "lighting-instead",
        "Spend it on lighting and a warden instead",
        [
          nudge("econ-distribution", 0.3),
          nudge("privacy-preference", 0.35),
          nudge("decision-style", 0.3),
        ],
        supports(["style.change-the-question", 0.8]),
      ),
    ],
  ),
  item(
    "the_strike_at_the_depot",
    "policy-lived",
    "Policy — the week the trash stopped",
    0.95,
    "The sanitation yard has been out for nine days. The trash has not been collected on your street or the one behind it. Marcus is on the picket line, and Nell has started using the word disgrace about people you both know.",
    [
      option(
        "back-them",
        "Back the strike out loud",
        [
          nudge("econ-distribution", 0.45),
          nudge("civic-order", -0.3),
          nudge("personal-ties", 0.25),
        ],
        supports(["labour.with-the-workers", 0.85]),
      ),
      option(
        "back-the-service",
        "Say the trash has to get collected",
        [
          nudge("civic-order", 0.45),
          nudge("econ-distribution", -0.3),
          nudge("institutional-trust", 0.2),
        ],
        supports(["order.the-service-first", 0.85]),
      ),
      option(
        "get-them-in-a-room",
        "Try to get both sides in a room",
        [
          nudge("decision-style", 0.4),
          nudge("institutional-trust", 0.3),
          nudge("social-pluralism", 0.2),
        ],
        supports(["style.broker-it", 0.8]),
      ),
      option(
        "keep-out",
        "Say nothing to either of them",
        [
          nudge("privacy-preference", 0.45),
          nudge("personal-ties", 0.2),
          nudge("decision-style", -0.3),
        ],
        supports(["ties.keep-the-peace", 0.8]),
      ),
    ],
  ),
];

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

export const OPENING_FIXED_ITEMS: readonly QuestionnaireItem[] = OPENERS;

export const OPENING_BANK_ITEMS: readonly QuestionnaireItem[] = [
  ...OPENERS,
  ...PERSONAL,
  ...RELATIONAL,
  ...MORAL,
  ...CIVIC_LIVED,
  ...POLICY_LIVED,
];
