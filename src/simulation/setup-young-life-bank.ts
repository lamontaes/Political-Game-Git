import type { DimensionNudge, HypothesisSupport } from "./player-model";
import type {
  AuthoredSource,
  QuestionnaireEligibility,
  QuestionnaireItem,
  QuestionnaireOption,
  TransparencyReview,
} from "./setup-questionnaire-bank";
import type { LifeVoiceBand } from "./voice-bands";

/**
 * The calibration, for a life that has not started yet.
 *
 * A player who asked for a ten-year-old was asked, before anything else, what
 * to do about the household bills at eleven at night — and offered "Say you'll
 * deal with the furnace" as one of four answers. Then a colleague's misuse of
 * a trip fund, and then a professional reference to co-sign. Every one of those
 * items is well written. Not one of them is a thing anybody is going to hand a
 * child, which means the calibration was measuring the player against decisions
 * the game was never going to offer them.
 *
 * That is what this file is for. Not a simplified bank — a bank of scenes that
 * belong to the life the player actually asked for.
 *
 * ## What a child's scene has in it
 *
 * The child is not the person who fixes the problem. They are the person the
 * problem happens near, and what they decide is what *they* do about their own
 * part of it: whether to ask, whether to tell, whether to keep it, whether to
 * go along, whether to stay out of it. Every option here is something a
 * ten-year-old could actually carry out on a Tuesday.
 *
 * There is no softening. Money is short in some of these, an adult is drinking
 * in one, and somebody lies. Children live through all of it. What they do not
 * do is settle it, and the options never pretend otherwise.
 *
 * ## The cast
 *
 * The same handful of people run through both bands, so five questions read as
 * five moments from one life rather than five unrelated cards — Dee, who looks
 * after you; Bea, your sister; Theo from up the street; Ms. Ruiz, who teaches
 * you; Kenny, who is in your class. In the adolescent items they are the same
 * people a few years on, which is why Bea can have left and Theo can have a
 * car.
 *
 * **They are not biography, and the setup screen says so out loud.** Nothing
 * here creates a person or a relationship in any world, and the questions are
 * about the person at the keyboard rather than about the character they are
 * about to be handed. That separation is load-bearing — see
 * `new-game-identity.ts` — and it is now stated to the player rather than
 * merely enforced in code, which is the honest fix for a five-question opening
 * that felt disconnected from the character it produced.
 */

const YOUNG_LIFE_AUTHORITY: AuthoredSource = {
  sourceDocument:
    "72_CLAUDE_PR87_HUMAN_PLAY_CONDITIONAL_FAIL_AND_CHARACTER_CONTEXT_REPAIR",
  reference:
    "Sections 3 and 4 — life-stage eligibility and the age-appropriate voice contract",
};

const LIVED: TransparencyReview = {
  verdict: "non-transparent",
  note: "A scene with named people and more than one defensible motive, at the life stage it is offered to. The axis under test is not the subject of the sentence and no option is identifiable as the intended one.",
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

function option(
  key: string,
  text: string,
  nudges: readonly DimensionNudge[],
  hypotheses: readonly HypothesisSupport[] = [],
): QuestionnaireOption {
  return { key, text, nudges, hypotheses, ambiguity: null };
}

function childScene(
  relationships: QuestionnaireEligibility["relationships"],
  settings: QuestionnaireEligibility["settings"],
  agency: QuestionnaireEligibility["agency"] = [],
): QuestionnaireEligibility {
  return { bands: ["middle-childhood"], agency, relationships, settings };
}

function teenScene(
  relationships: QuestionnaireEligibility["relationships"],
  settings: QuestionnaireEligibility["settings"],
  agency: QuestionnaireEligibility["agency"] = [],
): QuestionnaireEligibility {
  return { bands: ["adolescence"], agency, relationships, settings };
}

function item(
  key: string,
  band: LifeVoiceBand,
  register: QuestionnaireItem["register"],
  reference: string,
  observationWeight: number,
  prompt: string,
  options: readonly QuestionnaireOption[],
  eligibility: QuestionnaireEligibility,
  fixedOrdinal: number | null = null,
): QuestionnaireItem {
  void band;
  return {
    key,
    source: { ...YOUNG_LIFE_AUTHORITY, reference },
    review: LIVED,
    register,
    fixedOrdinal,
    observationWeight,
    prompt,
    options,
    eligibility,
  };
}

/* -------------------------------------------------------------------------- */
/* Middle childhood — the three that open a childhood                          */
/* -------------------------------------------------------------------------- */

/**
 * A kitchen, a friend and a rule, in that order.
 *
 * Deliberately the same three shapes the adult opening uses — something at
 * home, something between you and somebody, something about the truth — so a
 * childhood opens the way a life opens rather than the way a children's book
 * opens. What changes is who is in a position to do what.
 */
const MIDDLE_CHILDHOOD_OPENERS: readonly QuestionnaireItem[] = [
  item(
    "child_kitchen_late",
    "middle-childhood",
    "lived-personal",
    "Childhood opening 01 — the light still on",
    1,
    "You get up for water and the kitchen light is still on. Dee is at the table with a calculator and the mail in two piles, and does not hear you come in. When she does she says go back to bed, in the voice that means it, and then says sorry in a different voice.",
    [
      option(
        "go-back",
        "Go back to bed",
        [nudge("privacy-preference", 0.35), nudge("personal-ties", -0.1)],
        supports(["ties.keep-the-peace", 0.6]),
      ),
      option(
        "ask-what-is-wrong",
        "Ask what is wrong",
        [nudge("personal-ties", 0.4), nudge("privacy-preference", -0.35)],
        supports(["style.say-it-to-their-face", 0.6]),
      ),
      option(
        "sit-on-the-stairs",
        "Sit on the stairs and listen",
        [nudge("privacy-preference", -0.2), nudge("security-stability", 0.3)],
        supports(["style.buy-time", 0.5]),
      ),
      option(
        "tell-bea",
        "Wake Bea and tell her",
        [nudge("personal-ties", 0.45), nudge("care-obligation", 0.2)],
        supports(["ties.tell-somebody", 0.6]),
      ),
    ],
    childScene(["adult-at-home", "sibling"], ["home"]),
    1,
  ),
  item(
    "child_theo_took_it",
    "middle-childhood",
    "lived-relational",
    "Childhood opening 02 — what Theo had in his bag",
    1,
    "Theo shows you a handheld game that belongs to Kenny, who has been telling everyone it went missing. Theo says he is giving it back on Monday and that it is not the same as stealing it. He says this to you and to nobody else.",
    [
      option(
        "keep-it-quiet",
        "Say nothing to anyone",
        [nudge("personal-ties", 0.4), nudge("privacy-preference", 0.4)],
        supports(["ties.keep-the-peace", 0.7]),
      ),
      option(
        "make-him-do-it",
        "Tell him to give it back Monday, and check",
        [nudge("care-obligation", 0.35), nudge("decision-style", 0.2)],
        supports(["style.name-the-ask", 0.7]),
      ),
      option(
        "tell-kenny",
        "Tell Kenny where it is",
        [nudge("civic-order", 0.3), nudge("personal-ties", -0.35)],
        supports(["order.the-record-matters", 0.6]),
      ),
      option(
        "tell-ms-ruiz",
        "Tell Ms. Ruiz",
        [nudge("institutional-trust", 0.4), nudge("personal-ties", -0.4)],
        supports(["order.rules-hold", 0.7]),
      ),
    ],
    childScene(["friend", "classmate", "teacher"], ["school"], ["in-school"]),
    2,
  ),
  item(
    "child_the_note",
    "middle-childhood",
    "lived-moral",
    "Childhood opening 03 — the note that has to be signed",
    1,
    "The trip note has to come back signed by Friday and it costs eleven dollars. You have had it in your bag since Monday and you have not shown it to Dee, because you already know what she will say about the eleven dollars.",
    [
      option(
        "hand-it-over",
        "Give her the note tonight",
        [nudge("personal-ties", 0.35), nudge("privacy-preference", -0.3)],
        supports(["style.say-it-to-their-face", 0.7]),
      ),
      option(
        "lose-it",
        "Say the note never came",
        [nudge("privacy-preference", 0.45), nudge("security-stability", 0.2)],
        supports(["style.avoid-the-choice", 0.7]),
      ),
      option(
        "ask-bea-for-it",
        "Ask Bea for the money",
        [nudge("personal-ties", 0.3), nudge("risk-appetite", 0.2)],
        supports(["ties.ask-the-person-close", 0.6]),
      ),
      option(
        "ask-about-the-fund",
        "Ask Ms. Ruiz if anyone else is not going",
        [nudge("institutional-trust", 0.35), nudge("decision-style", 0.25)],
        supports(["style.change-the-question", 0.6]),
      ),
    ],
    childScene(["adult-at-home", "sibling", "teacher"], ["home", "school"]),
    3,
  ),
];

/* -------------------------------------------------------------------------- */
/* Middle childhood — the rest                                                 */
/* -------------------------------------------------------------------------- */

const MIDDLE_CHILDHOOD_ITEMS: readonly QuestionnaireItem[] = [
  item(
    "child_bea_took_the_blame",
    "middle-childhood",
    "lived-relational",
    "Childhood — the broken door",
    0.95,
    "The bathroom door does not shut properly any more and it was you who swung it. Bea says it was her, before you have said anything at all, and Dee believes her because Bea is the one who breaks things.",
    [
      option(
        "say-it-was-you",
        "Say it was you",
        [nudge("civic-order", 0.35), nudge("personal-ties", 0.2)],
        supports(["order.the-record-matters", 0.7]),
      ),
      option(
        "let-it-stand",
        "Let it stand",
        [nudge("privacy-preference", 0.4), nudge("security-stability", 0.3)],
        supports(["style.avoid-the-choice", 0.6]),
      ),
      option(
        "square-it-with-bea",
        "Say nothing now and square it with Bea after",
        [nudge("personal-ties", 0.45), nudge("privacy-preference", 0.2)],
        supports(["style.direct-not-official", 0.6]),
      ),
    ],
    childScene(["sibling", "adult-at-home"], ["home"]),
  ),
  item(
    "child_kenny_on_his_own",
    "middle-childhood",
    "lived-relational",
    "Childhood — where Kenny eats",
    0.9,
    "Kenny has eaten at the end of the far table on his own for two weeks. Theo says he is weird and that if Kenny sits with you, Theo will sit somewhere else. Kenny is standing there with his tray.",
    [
      option(
        "call-him-over",
        "Tell Kenny to sit down",
        [nudge("care-obligation", 0.45), nudge("social-pluralism", 0.35)],
        supports(["fairness.worst-off-first", 0.7]),
      ),
      option(
        "stay-with-theo",
        "Stay where you are and say nothing",
        [nudge("personal-ties", 0.35), nudge("risk-appetite", -0.3)],
        supports(["ties.keep-the-peace", 0.6]),
      ),
      option(
        "go-sit-with-kenny",
        "Take your tray over to Kenny",
        [nudge("care-obligation", 0.4), nudge("risk-appetite", 0.35)],
        supports(["style.say-it-to-their-face", 0.5]),
      ),
      option(
        "work-on-theo",
        "Work on Theo about it later",
        [nudge("decision-style", 0.3), nudge("personal-ties", 0.25)],
        supports(["style.broker-it", 0.7]),
      ),
    ],
    childScene(["friend", "classmate"], ["school"], ["in-school"]),
  ),
  item(
    "child_the_answer_sheet",
    "middle-childhood",
    "lived-moral",
    "Childhood — what was on the desk",
    0.95,
    "Ms. Ruiz went out and left the answers face up on her desk. Four people have already been up to look. She comes back and asks the class whether anyone went near the desk, and waits.",
    [
      option(
        "own-up",
        "Say you looked",
        [nudge("civic-order", 0.4), nudge("institutional-trust", 0.25)],
        supports(["order.the-record-matters", 0.7]),
      ),
      option(
        "say-nothing",
        "Say nothing",
        [nudge("privacy-preference", 0.4), nudge("risk-appetite", -0.2)],
        supports(["order.not-my-job", 0.6]),
      ),
      option(
        "name-them",
        "Say how many people went up",
        [nudge("civic-order", 0.35), nudge("personal-ties", -0.4)],
        supports(["order.rules-hold", 0.6]),
      ),
      option(
        "after-class",
        "Tell her afterwards, on your own",
        [nudge("decision-style", 0.3), nudge("privacy-preference", 0.25)],
        supports(["style.correct-quietly", 0.7]),
      ),
    ],
    childScene(["teacher", "classmate"], ["school"], ["in-school"]),
  ),
  item(
    "child_the_shortcut",
    "middle-childhood",
    "lived-personal",
    "Childhood — the way home past the yard",
    0.85,
    "There is a way home through the yard behind the shops that saves ten minutes, and Dee has said not to go that way. Theo goes that way every day. It is starting to get dark at four.",
    [
      option(
        "go-the-long-way",
        "Go the long way",
        [nudge("security-stability", 0.4), nudge("risk-appetite", -0.35)],
        supports(["security.stay-put", 0.6]),
      ),
      option(
        "go-with-theo",
        "Go through with Theo",
        [nudge("risk-appetite", 0.4), nudge("personal-ties", 0.25)],
        supports(["risk.follow-the-person", 0.7]),
      ),
      option(
        "ask-again",
        "Ask Dee again, now it is dark early",
        [nudge("institutional-trust", 0.2), nudge("decision-style", 0.35)],
        supports(["style.name-the-ask", 0.7]),
      ),
    ],
    childScene(["adult-at-home", "friend"], ["street"]),
  ),
  item(
    "child_what_you_heard",
    "middle-childhood",
    "lived-personal",
    "Childhood — through the wall",
    0.9,
    "Through the wall you hear Dee on the phone saying the word moving, twice, and a month. Nobody has said anything to you or to Bea. In the morning everything is completely normal.",
    [
      option(
        "ask-outright",
        "Ask her at breakfast",
        [nudge("personal-ties", 0.4), nudge("privacy-preference", -0.4)],
        supports(["style.say-it-to-their-face", 0.7]),
      ),
      option(
        "tell-bea",
        "Tell Bea what you heard",
        [nudge("personal-ties", 0.45), nudge("privacy-preference", -0.2)],
        supports(["ties.tell-somebody", 0.7]),
      ),
      option(
        "wait",
        "Wait and see if anyone says anything",
        [nudge("privacy-preference", 0.45), nudge("security-stability", 0.2)],
        supports(["style.buy-time", 0.7]),
      ),
      option(
        "tell-theo",
        "Tell Theo you might be moving",
        [nudge("personal-ties", 0.3), nudge("risk-appetite", 0.2)],
        supports(["ties.tell-somebody", 0.4]),
      ),
    ],
    childScene(["adult-at-home", "sibling", "friend"], ["home"]),
  ),
  item(
    "child_the_bus_stop",
    "middle-childhood",
    "civic-lived",
    "Childhood — the stop they took away",
    0.85,
    "The bus that stopped at the end of your road does not stop there any more, so getting to school is a walk to the main road in the rain. Ms. Ruiz says the class can write to the transit people, and half the class thinks that is pointless.",
    [
      option(
        "write-it",
        "Write yours",
        [nudge("institutional-trust", 0.4), nudge("civic-order", 0.2)],
        supports(["civic.use-the-channel", 0.7]),
      ),
      option(
        "get-the-class-to",
        "Get the others to write theirs",
        [nudge("decision-style", 0.4), nudge("institutional-trust", 0.2)],
        supports(["civic.organise-it", 0.75]),
      ),
      option(
        "say-it-is-pointless",
        "Say out loud that it will not work",
        [nudge("institutional-trust", -0.45), nudge("risk-appetite", 0.2)],
        supports(["local.not-my-fight", 0.5]),
      ),
      option(
        "tell-dee-instead",
        "Tell Dee, and let her deal with it",
        [nudge("personal-ties", 0.3), nudge("institutional-trust", -0.15)],
        supports(["style.handle-it-alone", 0.3]),
      ),
    ],
    childScene(["teacher", "classmate", "adult-at-home"], ["school", "street"]),
  ),
  item(
    "child_the_field_gate",
    "middle-childhood",
    "policy-lived",
    "Childhood — the gate on the field",
    0.85,
    "The field everyone plays on has a gate on it now and a sign about insurance. The man from the club says under-twelves can use it Tuesdays if an adult signs them in. Theo says everyone should just climb it like before.",
    [
      option(
        "climb-it",
        "Climb it like before",
        [nudge("civic-order", -0.4), nudge("risk-appetite", 0.35)],
        supports(["order.the-people-who-live-there", 0.5]),
      ),
      option(
        "tuesdays",
        "Go on Tuesdays with somebody signed in",
        [nudge("civic-order", 0.35), nudge("institutional-trust", 0.3)],
        supports(["order.rules-hold", 0.6]),
      ),
      option(
        "ask-for-more-days",
        "Ask the man for more than Tuesdays",
        [nudge("decision-style", 0.4), nudge("institutional-trust", 0.2)],
        supports(["style.conditions-not-refusal", 0.6]),
      ),
      option(
        "play-somewhere-else",
        "Find somewhere else to play",
        [nudge("security-stability", 0.3), nudge("civic-order", 0.1)],
        supports(["local.not-my-fight", 0.5]),
      ),
    ],
    childScene(["friend", "neighbor"], ["street"]),
  ),
];

/* -------------------------------------------------------------------------- */
/* Adolescence — the three that open a teenage life                            */
/* -------------------------------------------------------------------------- */

const ADOLESCENCE_OPENERS: readonly QuestionnaireItem[] = [
  item(
    "teen_the_shift_and_the_test",
    "adolescence",
    "lived-personal",
    "Adolescent opening 01 — Thursday, both ways",
    1,
    "You have the Thursday shift and a test Friday you have not opened a book for. Marisol, who does the schedule, has already moved two shifts around for you this month and made a point of saying so.",
    [
      option(
        "work-it",
        "Work the shift",
        [nudge("security-stability", 0.35), nudge("care-obligation", 0.3)],
        supports(["order.the-work-first", 0.7]),
      ),
      option(
        "ask-again",
        "Ask Marisol one more time",
        [nudge("achievement-ambition", 0.35), nudge("personal-ties", -0.2)],
        supports(["style.name-the-ask", 0.7]),
      ),
      option(
        "swap-with-someone",
        "Find somebody to swap with yourself",
        [nudge("decision-style", 0.4), nudge("achievement-ambition", 0.2)],
        supports(["style.handle-it-alone", 0.7]),
      ),
      option(
        "wing-it",
        "Work it and take the test cold",
        [nudge("risk-appetite", 0.4), nudge("security-stability", 0.1)],
        supports(["risk.take-the-hit", 0.6]),
      ),
    ],
    teenScene(["coworker", "boss"], ["workplace", "school"], ["paid-work"]),
    1,
  ),
  item(
    "teen_theo_driving",
    "adolescence",
    "lived-relational",
    "Adolescent opening 02 — who is driving",
    1,
    "Theo has had his license three weeks and has had two drinks. He is holding the keys and there are four of you and it is eleven miles home. He says he is completely fine and he is annoyed that you looked at him.",
    [
      option(
        "get-in",
        "Get in",
        [nudge("personal-ties", 0.3), nudge("risk-appetite", 0.45)],
        supports(["risk.follow-the-person", 0.7]),
      ),
      option(
        "take-the-keys",
        "Take the keys off him",
        [nudge("care-obligation", 0.45), nudge("civic-order", 0.3)],
        supports(["style.say-it-to-their-face", 0.7]),
      ),
      option(
        "get-a-lift",
        "Say you are getting a ride and take whoever will come",
        [nudge("security-stability", 0.4), nudge("personal-ties", -0.15)],
        supports(["security.keep-a-margin", 0.7]),
      ),
      option(
        "call-home",
        "Call home and get picked up",
        [nudge("institutional-trust", 0.25), nudge("privacy-preference", -0.4)],
        supports(["ties.tell-somebody", 0.6]),
      ),
    ],
    teenScene(["friend", "adult-at-home"], ["street"]),
    2,
  ),
  item(
    "teen_the_essay",
    "adolescence",
    "lived-moral",
    "Adolescent opening 03 — whose paragraph it is",
    1,
    "Bea left for college and left two years of her old coursework in the room. One paragraph of it would fit your assignment almost exactly. Nobody has read it since her teacher did, and Ms. Ruiz has stopped believing you about deadlines.",
    [
      option(
        "use-it",
        "Use the paragraph",
        [nudge("achievement-ambition", 0.4), nudge("civic-order", -0.4)],
        supports(["order.the-rule-not-the-outcome", -0.6]),
      ),
      option(
        "write-your-own",
        "Write your own and hand it in late",
        [nudge("civic-order", 0.4), nudge("achievement-ambition", -0.2)],
        supports(["order.rules-hold", 0.7]),
      ),
      option(
        "ask-for-time",
        "Ask Ms. Ruiz for two more days",
        [nudge("institutional-trust", 0.35), nudge("decision-style", 0.3)],
        supports(["style.name-the-ask", 0.7]),
      ),
      option(
        "ask-bea",
        "Ask Bea if you can use it",
        [nudge("personal-ties", 0.35), nudge("privacy-preference", -0.25)],
        supports(["style.direct-not-official", 0.6]),
      ),
    ],
    teenScene(["sibling", "teacher"], ["home", "school"], ["in-school"]),
    3,
  ),
];

const ADOLESCENCE_ITEMS: readonly QuestionnaireItem[] = [
  item(
    "teen_the_till_short",
    "adolescence",
    "lived-moral",
    "Adolescent — forty dollars short",
    0.95,
    "The register is forty dollars short at the end of your shift. You did not take it. Marisol says she will write it off as a miscount rather than send it up, and that she is doing you a favor by saying so.",
    [
      option(
        "let-her",
        "Let her write it off",
        [nudge("personal-ties", 0.35), nudge("privacy-preference", 0.3)],
        supports(["ties.keep-the-peace", 0.6]),
      ),
      option(
        "send-it-up",
        "Ask her to send it up anyway",
        [nudge("civic-order", 0.45), nudge("institutional-trust", 0.3)],
        supports(["order.the-record-matters", 0.75]),
      ),
      option(
        "pay-it-in",
        "Put forty dollars in yourself",
        [nudge("security-stability", -0.3), nudge("care-obligation", 0.35)],
        supports(["style.handle-it-alone", 0.7]),
      ),
      option(
        "find-out-first",
        "Say you want to know what happened first",
        [nudge("decision-style", 0.4), nudge("risk-appetite", 0.15)],
        supports(["style.change-the-question", 0.7]),
      ),
    ],
    teenScene(["coworker", "boss"], ["workplace"], ["paid-work"]),
  ),
  item(
    "teen_where_bea_went",
    "adolescence",
    "lived-relational",
    "Adolescent — the week Bea did not call",
    0.9,
    "Bea has not called in three weeks and Dee has stopped asking out loud whether she is going to. You have Bea's number and you know she reads messages and does not answer them.",
    [
      option(
        "keep-messaging",
        "Keep messaging her",
        [nudge("personal-ties", 0.45), nudge("care-obligation", 0.25)],
        supports(["ties.tell-somebody", 0.5]),
      ),
      option(
        "tell-dee",
        "Tell Dee she is reading them",
        [nudge("privacy-preference", -0.4), nudge("care-obligation", 0.3)],
        supports(["ties.tell-somebody", 0.7]),
      ),
      option(
        "leave-it",
        "Leave her alone until she is ready",
        [nudge("privacy-preference", 0.45), nudge("personal-ties", -0.1)],
        supports(["style.buy-time", 0.7]),
      ),
      option(
        "go-there",
        "Get on a bus and turn up",
        [nudge("risk-appetite", 0.4), nudge("personal-ties", 0.4)],
        supports(["style.say-it-to-their-face", 0.7]),
      ),
    ],
    teenScene(["sibling", "adult-at-home"], ["home"]),
  ),
  item(
    "teen_the_petition_at_school",
    "adolescence",
    "civic-lived",
    "Adolescent — the letter about the coach",
    0.9,
    "Somebody has started a letter about the coach, and about half of what is in it you saw happen and half you did not. Signing it means putting your name to all of it. Two of the people who did see the rest of it will not sign.",
    [
      option(
        "sign",
        "Sign it",
        [nudge("civic-order", 0.3), nudge("risk-appetite", 0.35)],
        supports(["civic.make-it-public", 0.7]),
      ),
      option(
        "sign-your-part",
        "Write down only what you saw, and sign that",
        [nudge("decision-style", 0.45), nudge("civic-order", 0.25)],
        supports(["style.on-the-record", 0.75]),
      ),
      option(
        "refuse",
        "Say no and say why",
        [nudge("civic-order", 0.2), nudge("institutional-trust", 0.2)],
        supports(["order.the-record-matters", 0.6]),
      ),
      option(
        "get-the-others",
        "Go and talk to the two who will not sign",
        [nudge("decision-style", 0.4), nudge("personal-ties", 0.2)],
        supports(["civic.organise-it", 0.7]),
      ),
    ],
    teenScene(["classmate", "teacher"], ["school"], ["in-school"]),
  ),
  item(
    "teen_the_money_for_the_car",
    "adolescence",
    "lived-personal",
    "Adolescent — nine hundred saved",
    0.9,
    "You have nine hundred dollars saved from eleven months of shifts. There is a car for eleven hundred that would end the two-bus commute, and there is a course in the spring that costs eight hundred and takes the whole summer.",
    [
      option(
        "the-car",
        "Put it toward the car",
        [nudge("security-stability", 0.35), nudge("risk-appetite", -0.1)],
        supports(["security.keep-a-margin", 0.5]),
      ),
      option(
        "the-course",
        "Book the course",
        [nudge("achievement-ambition", 0.5), nudge("risk-appetite", 0.3)],
        supports(["ambition.claim-it", 0.7]),
      ),
      option(
        "keep-saving",
        "Keep it where it is",
        [nudge("security-stability", 0.45), nudge("risk-appetite", -0.35)],
        supports(["security.stay-put", 0.7]),
      ),
      option(
        "give-it-to-dee",
        "Give some of it to Dee for the house",
        [nudge("care-obligation", 0.5), nudge("personal-ties", 0.3)],
        supports(["ties.the-house-first", 0.7]),
      ),
    ],
    teenScene(["adult-at-home"], ["home", "workplace"], ["paid-work"]),
  ),
  item(
    "teen_the_room_at_the_back",
    "adolescence",
    "policy-lived",
    "Adolescent — the room they are closing",
    0.85,
    "The library room that stays open until eight is closing at five from January, because the person who staffed it went to four days. Some of the people who use it have somewhere else to be until eight and some have nowhere.",
    [
      option(
        "go-to-the-meeting",
        "Go to the meeting about it",
        [nudge("institutional-trust", 0.4), nudge("civic-order", 0.2)],
        supports(["civic.use-the-channel", 0.7]),
      ),
      option(
        "get-names",
        "Get the names of everyone who uses it",
        [nudge("decision-style", 0.45), nudge("institutional-trust", 0.2)],
        supports(["civic.organise-it", 0.75]),
      ),
      option(
        "ask-for-two-nights",
        "Ask for two nights a week instead of five",
        [nudge("decision-style", 0.35), nudge("econ-distribution", 0.2)],
        supports(["style.conditions-not-refusal", 0.7]),
      ),
      option(
        "find-somewhere-else",
        "Work out where else to go",
        [nudge("security-stability", 0.35), nudge("institutional-trust", -0.25)],
        supports(["local.not-my-fight", 0.5]),
      ),
    ],
    teenScene(["classmate", "neighbor"], ["institution", "public-meeting"]),
  ),
  item(
    "teen_what_marisol_said",
    "adolescence",
    "lived-relational",
    "Adolescent — what Marisol said about the new one",
    0.85,
    "Marisol has started saying things about the new girl on evenings that are not true, in front of people who repeat them. Marisol writes the schedule and has been good to you since your first week.",
    [
      option(
        "say-it-to-her",
        "Tell Marisol it is not true",
        [nudge("civic-order", 0.35), nudge("risk-appetite", 0.4)],
        supports(["style.say-it-to-their-face", 0.75]),
      ),
      option(
        "tell-the-girl",
        "Tell the new girl what is being said",
        [nudge("care-obligation", 0.4), nudge("privacy-preference", -0.3)],
        supports(["ties.tell-somebody", 0.7]),
      ),
      option(
        "say-nothing",
        "Stay out of it",
        [nudge("privacy-preference", 0.45), nudge("personal-ties", 0.2)],
        supports(["order.not-my-job", 0.7]),
      ),
      option(
        "stop-repeating",
        "Stop it going any further where you are standing",
        [nudge("decision-style", 0.35), nudge("care-obligation", 0.25)],
        supports(["style.correct-quietly", 0.7]),
      ),
    ],
    teenScene(["coworker", "boss"], ["workplace"], ["paid-work"]),
  ),
];

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

export const MIDDLE_CHILDHOOD_FIXED_ITEMS: readonly QuestionnaireItem[] =
  MIDDLE_CHILDHOOD_OPENERS;

export const ADOLESCENCE_FIXED_ITEMS: readonly QuestionnaireItem[] =
  ADOLESCENCE_OPENERS;

export const YOUNG_LIFE_BANK_ITEMS: readonly QuestionnaireItem[] = [
  ...MIDDLE_CHILDHOOD_OPENERS,
  ...MIDDLE_CHILDHOOD_ITEMS,
  ...ADOLESCENCE_OPENERS,
  ...ADOLESCENCE_ITEMS,
];
