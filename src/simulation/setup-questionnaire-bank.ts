import type {
  AmbiguityDeclaration,
  DimensionNudge,
  HypothesisSupport,
} from "./player-model";
import { OPENING_BANK_ITEMS, OPENING_FIXED_ITEMS } from "./setup-opening-bank";

/**
 * The authored setup bank.
 *
 * Every prompt and every option sentence in this file came from a Drive
 * research authority. None of it was written here, and that restriction is
 * deliberate rather than fussy: the settled semantics say the implementing
 * agent is not authorised to invent questionnaire copy, because copy is where
 * the measurement actually lives. A plausible-sounding item written by the
 * thing being calibrated is not a calibration.
 *
 * What *was* derived here is the numbers — which dimensions an option loads,
 * how far, and how heavily the item counts. The research states the direction
 * of every loading in prose ("nudges toward populist skepticism", "establishes
 * a prior for local subsidiarity") and states whether a dimension is primary or
 * secondary for the item in its coverage matrix; the magnitudes are read off
 * that, at 0.6 for a primary loading and 0.3 for a secondary one. The exported
 * export lost the original magnitude figures with the equation objects that
 * carried them, so this is a reconstruction from the prose and the matrix, and
 * is recorded as one. It is engine calibration, which is implementation work,
 * and not content, which is not.
 *
 * Two provenances are represented:
 *
 * - the questionnaire calibration research, whose three fixed prompts open
 *   every path and whose fifteen further items cover the civic axes;
 * - the first-session life and adaptive challenge research, whose eight
 *   situational items cover the everyday axes.
 *
 * The transparency review on each item is not decoration. The audit that
 * commissioned this wave found the fifteen civic items readable as a policy
 * docket — a politically literate player can see which axis is being probed —
 * and asked for them to be re-authored against a non-transparency standard by
 * the research lane, not by this one. They are therefore carried with that
 * verdict recorded against them, ranked below the items that pass, and counted
 * honestly in the shortfall report. Marking them is what makes the gap
 * visible; deleting them would hide it.
 *
 * WHO MAY WRITE THIS COPY — SUPERSEDED, AND BY WHAT
 *
 * The paragraph above used to end "and rewriting them would be the invention
 * the semantics forbid", and that was the standing rule until the packet that
 * commissioned this wave. Packet 60's Section C reverses it explicitly: it
 * hands the implementing lane the calibration, states the style direction in
 * detail, gives per-item verdicts from the 2026-09-03 human playtest, and asks
 * for enough authored content to prove the system in ordinary play. Section M
 * says the same thing in one line — "Claude owns the implementation and enough
 * authored content to prove the system".
 *
 * So the copy authored under that instruction exists, and it does not hide in
 * here. It lives in `setup-opening-bank.ts`, where every item names the packet
 * and the section it was written against, so a reader can tell at a glance
 * which items came from the research lane and which came from this one. The
 * items in THIS file are still research-derived and are still not rewritten,
 * with two exceptions the playtest named as errors rather than as taste: a
 * budget deficit that was written as "ten-million-dollar" and a grant item
 * that referred to a "central ministry", which is not a thing any American
 * jurisdiction has. Both are corrected in place, because leaving a factual
 * error standing to preserve a provenance claim would be the wrong trade.
 */

export const SETUP_BANK_VERSION = "pg-setup-bank-v4";

export interface AuthoredSource {
  /** The Drive research authority the copy came from, named as it is named there. */
  readonly sourceDocument: string;
  /** Where inside it, precisely enough to find again. */
  readonly reference: string;
}

export type TransparencyVerdict =
  /** Reads as a life fragment with several defensible motives. */
  | "non-transparent"
  /**
   * Reads as a policy question. Balanced and scenario-framed, but the axis is
   * legible to a player who follows politics, which is the standard this
   * wave was asked to hold.
   */
  | "policy-docket-flagged"
  /**
   * Named by a human reviewer as too abstract to be a scene: a shape rather
   * than a situation, with nobody in it and nothing at stake that a person
   * could point at.
   *
   * Kept rather than deleted, with the verdict attached. Deleting it would
   * hide that the bank once shipped it; rewriting it in place would lose which
   * copy the reviewer actually saw. It is ranked behind everything that passed
   * review, so a calibration reaches it only after exhausting the rest.
   */
  | "playtest-abstraction-flagged";

/**
 * What kind of moment an item is, for the widening order.
 *
 * The calibration is supposed to feel like the opening of a life rather than a
 * political survey, which means the first things it asks about are a kitchen
 * and a friend, and the civic and policy registers open later — and only as
 * far as the model still needs them. The register is what makes that ordering
 * expressible; see `setup-questionnaire.ts` for the gate that uses it.
 */
export type QuestionnaireRegister =
  /** Money, home, time, the person themselves. */
  | "lived-personal"
  /** Somebody else, and what is owed between them. */
  | "lived-relational"
  /** A rule, a truth, or somebody's word. */
  | "lived-moral"
  /** A shared thing in a real place, met as a resident. */
  | "civic-lived"
  /** A decision about a policy, set somewhere and among people. */
  | "policy-lived"
  /** A policy question with no place and no people in it. */
  | "policy-docket";

export interface TransparencyReview {
  readonly verdict: TransparencyVerdict;
  readonly note: string;
}

export interface QuestionnaireOption {
  readonly key: string;
  /** The authored sentence. This is what the player reads. */
  readonly text: string;
  readonly nudges: readonly DimensionNudge[];
  readonly hypotheses: readonly HypothesisSupport[];
  /** Set when the source itself records that this choice reads two ways. */
  readonly ambiguity: AmbiguityDeclaration | null;
}

export interface QuestionnaireItem {
  readonly key: string;
  readonly source: AuthoredSource;
  readonly review: TransparencyReview;
  readonly register: QuestionnaireRegister;
  /** 1, 2 or 3 for the mandatory openers; null for everything else. */
  readonly fixedOrdinal: number | null;
  readonly prompt: string;
  readonly options: readonly QuestionnaireOption[];
  /** How much this item is worth, before the setup ceiling. On [0, 1]. */
  readonly observationWeight: number;
}

const CALIBRATION_RESEARCH =
  "Political Game Questionnaire Calibration Research";
const LIFE_RESEARCH = "90_FIRST_SESSION_LIFE_AND_ADAPTIVE_CHALLENGE_RESEARCH";

const SITUATIONAL: TransparencyReview = {
  verdict: "non-transparent",
  note: "A life fragment with more than one defensible reading, and no option a player can identify as the intended one.",
};

const POLICY_DOCKET: TransparencyReview = {
  verdict: "policy-docket-flagged",
  note: "Balanced and scenario-framed, but the axis under test is legible to a politically literate player. Carried as authored supply pending re-authoring by the research lane.",
};

const PLAYTEST_ABSTRACTION: TransparencyReview = {
  verdict: "playtest-abstraction-flagged",
  note: "Named in the 2026-09-03 human playtest as a generic abstraction rather than a lived situation — nobody in it, nothing specific at stake. Kept with the verdict attached and ranked behind everything that passed; the lived replacements are in `setup-opening-bank.ts`.",
};

function nudge(
  dimension: DimensionNudge["dimension"],
  magnitude: number,
): DimensionNudge {
  return { dimension, magnitude };
}

function supports(
  ...entries: readonly (readonly [string, number] | readonly [])[]
): readonly HypothesisSupport[] {
  return entries
    .filter((entry): entry is readonly [string, number] => entry.length === 2)
    .map(([hypothesisKey, support]) => ({ hypothesisKey, support }));
}

function ambiguity(
  key: string,
  hypothesisKeys: readonly string[],
  note: string,
): AmbiguityDeclaration {
  return { key, hypothesisKeys: [...hypothesisKeys], note };
}

/* -------------------------------------------------------------------------- */
/* The items that used to open every run                                       */
/* -------------------------------------------------------------------------- */

/**
 * These three were the fixed openers until the human playtest.
 *
 * They open on a civic organization's policy initiative, a friend's
 * exaggeration at a professional event, and an inside-or-outside question
 * about an institution — which is a reasonable start to a political survey and
 * a poor start to a life. The opening is now three scenes with people in them,
 * authored in `setup-opening-bank.ts` against the same review standard.
 *
 * They keep their content and their weight and stay in the pool; only their
 * fixed position is gone, so a run reaches them when the model has a reason to
 * ask rather than because they were first.
 */
const FORMER_OPENERS: readonly QuestionnaireItem[] = [
  {
    key: "career_evenings",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Fixed Seed Prompts — Question 01: career_evenings",
    },
    review: SITUATIONAL,
    register: "lived-personal",
    fixedOrdinal: null,
    observationWeight: 1,
    prompt:
      "You have spent three months preparing a comprehensive policy initiative for your civic organization. A competing organization abruptly schedules a decisive public debate tomorrow evening to challenge your findings. Simultaneously, your family is gathering for an important personal milestone that has been scheduled for months. You can attend only one.",
    options: [
      {
        key: "a",
        text: "Attend the public debate; personal commitments must yield when professional and civic achievements reach a critical turning point.",
        nudges: [
          nudge("decision-style", -0.6),
          nudge("achievement-ambition", 0.6),
          nudge("personal-ties", -0.35),
          nudge("institutional-trust", 0.2),
        ],
        hypotheses: supports(
          ["ambition.advancement-first", 0.8],
          ["duty.civic-obligation", 0.75],
        ),
        ambiguity: ambiguity(
          "career.debate-or-family",
          ["ambition.advancement-first", "duty.civic-obligation"],
          "Going could be about getting further, or about owing the work an answer. The choice does not tell them apart.",
        ),
      },
      {
        key: "b",
        text: "Attend the family milestone; professional opportunities recur, but sacrificing personal trust and stability causes lasting damage.",
        nudges: [
          nudge("personal-ties", 0.6),
          nudge("achievement-ambition", -0.45),
          nudge("social-pluralism", -0.3),
          nudge("decision-style", -0.15),
        ],
        hypotheses: supports(["ties.family-first", 0.85]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Spend the morning training an articulate colleague to handle the debate on your behalf, while you attend the gathering as promised.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("institutional-trust", 0.35),
          nudge("achievement-ambition", 0.2),
          nudge("personal-ties", 0.25),
        ],
        hypotheses: supports(
          ["style.delegation-as-competence", 0.8],
          ["ambition.advancement-first", 0.15],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Attend the first half of the family dinner, leave before the main event to speak at the debate, and return late to apologize.",
        nudges: [
          nudge("decision-style", 0.45),
          nudge("achievement-ambition", 0.35),
          nudge("personal-ties", 0.2),
          nudge("civic-order", -0.1),
        ],
        hypotheses: supports(["ambition.advancement-first", 0.5]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "friend_exaggeration",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Fixed Seed Prompts — Question 02: friend_exaggeration",
    },
    review: SITUATIONAL,
    register: "lived-relational",
    fixedOrdinal: null,
    observationWeight: 1,
    prompt:
      "A close political ally and personal mentor has submitted a formal grant application for a vital community clinic. Reviewing the documentation privately, you notice they significantly overstated their matching funds and past performance metrics. If challenged publicly, the clinic will lose funding and your ally will face professional disgrace; if ignored, fraudulent data enters the official civic record.",
    options: [
      {
        key: "a",
        text: "Demand privately that your mentor correct the records immediately, stating you will withdraw your endorsement if they refuse.",
        nudges: [
          nudge("institutional-trust", 0.6),
          nudge("decision-style", -0.35),
          nudge("personal-ties", -0.25),
        ],
        hypotheses: supports(["trust.record-must-be-true", 0.85]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Overlook the discrepancies; securing funding for an urgent community service outweighs administrative technicalities.",
        nudges: [
          nudge("institutional-trust", -0.6),
          nudge("econ-distribution", 0.3),
          nudge("personal-ties", 0.35),
          nudge("care-obligation", 0.3),
        ],
        hypotheses: supports(
          ["trust.rules-are-obstacles", 0.8],
          ["care.welfare-first", 0.8],
        ),
        ambiguity: ambiguity(
          "integrity.overlooking-the-numbers",
          ["trust.rules-are-obstacles", "care.welfare-first"],
          "Letting it stand could mean the paperwork is not the point, or that the clinic is. The source itself warns against reading this as dishonesty.",
        ),
      },
      {
        key: "c",
        text: "Quietly report the calculation errors to the reviewing board's compliance auditor without naming your mentor directly.",
        nudges: [
          nudge("civic-order", 0.35),
          nudge("institutional-trust", 0.4),
          nudge("privacy-preference", 0.3),
        ],
        hypotheses: supports(
          ["trust.record-must-be-true", 0.6],
          ["style.avoids-confrontation", 0.55],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Help your mentor quickly secure legitimate bridge financing or in-kind pledges overnight to match the inflated numbers before review.",
        nudges: [
          nudge("decision-style", 0.55),
          nudge("institutional-trust", 0.25),
          nudge("personal-ties", 0.3),
        ],
        hypotheses: supports(
          ["ties.loyalty-first", 0.6],
          ["care.welfare-first", 0.35],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "inside_outside",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Fixed Seed Prompts — Question 03: inside_outside",
    },
    review: SITUATIONAL,
    register: "lived-relational",
    fixedOrdinal: null,
    observationWeight: 1,
    prompt:
      "A municipal board is poised to pass an ordinance that will disrupt working-class transit access across three neighborhoods. A senior official offers you a seat on an advisory commission if you agree to work quietly through regulatory amendments over the next eighteen months. Community organizers urge you instead to lead an immediate street demonstration and boycott outside the council chambers to force an emergency vote.",
    options: [
      {
        key: "a",
        text: "Accept the advisory seat; enduring policy reform is achieved by mastering administrative procedures and shaping rules from within.",
        nudges: [
          nudge("institutional-trust", 0.6),
          nudge("decision-style", 0.35),
          nudge("achievement-ambition", 0.2),
        ],
        hypotheses: supports(["trust.process-delivers", 0.8]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Lead the street demonstration; institutions respond to visible public disruption and moral pressure, not closed-door panels.",
        nudges: [
          nudge("institutional-trust", -0.6),
          nudge("civic-order", -0.35),
          nudge("risk-appetite", 0.3),
        ],
        hypotheses: supports(
          ["trust.institutions-unresponsive", 0.8],
          ["style.public-pressure-works", 0.8],
        ),
        ambiguity: ambiguity(
          "outsider.why-the-street",
          ["trust.institutions-unresponsive", "style.public-pressure-works"],
          "Going outside can mean the inside does not work, or that noise is simply the faster lever. The source notes both left and right use it.",
        ),
      },
      {
        key: "c",
        text: "Decline the advisory seat but organize an orderly, highly publicized petition and research presentation during the public comment period.",
        nudges: [
          nudge("institutional-trust", 0.2),
          nudge("civic-order", 0.3),
          nudge("decision-style", 0.3),
        ],
        hypotheses: supports(
          ["style.public-pressure-works", 0.55],
          ["trust.institutions-unresponsive", 0.15],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Accept the appointment to gather internal leverage and intelligence, while covertly coordinating with organizers outside to amplify pressure.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("institutional-trust", -0.2),
          nudge("privacy-preference", 0.45),
          nudge("risk-appetite", 0.3),
        ],
        hypotheses: supports(["style.public-pressure-works", 0.45]),
        ambiguity: null,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* The everyday items                                                          */
/* -------------------------------------------------------------------------- */

const LIFE_ITEMS: readonly QuestionnaireItem[] = [
  {
    key: "friend_in_trouble",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q1",
    },
    review: SITUATIONAL,
    register: "lived-relational",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "A close friend did something that could get them in real trouble. Someone asks you directly what happened.",
    options: [
      {
        key: "a",
        text: "Tell the truth, even if the friend is angry.",
        nudges: [
          nudge("personal-ties", -0.55),
          nudge("institutional-trust", 0.3),
          nudge("privacy-preference", -0.5),
        ],
        hypotheses: supports(["trust.record-must-be-true", 0.6]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Protect the friend unless someone could be hurt.",
        nudges: [
          nudge("personal-ties", 0.6),
          nudge("privacy-preference", 0.4),
          nudge("decision-style", 0.2),
        ],
        hypotheses: supports(
          ["ties.loyalty-first", 0.8],
          ["style.avoids-confrontation", 0.75],
        ),
        ambiguity: ambiguity(
          "loyalty.protecting-a-friend",
          ["ties.loyalty-first", "style.avoids-confrontation"],
          "Covering for somebody can be loyalty, or it can be a general reluctance to be the one who starts the row.",
        ),
      },
      {
        key: "c",
        text: "Refuse to get pulled into it if you can.",
        nudges: [
          nudge("privacy-preference", 0.55),
          nudge("personal-ties", 0.15),
          nudge("risk-appetite", -0.3),
        ],
        hypotheses: supports(
          ["style.avoids-confrontation", 0.85],
          ["ties.loyalty-first", 0.1],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "safe_or_risky",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q2",
    },
    review: SITUATIONAL,
    register: "lived-personal",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "You have a safe path that is going fine and a riskier path with a real chance to get much farther.",
    options: [
      {
        key: "a",
        text: "Keep the safer path.",
        nudges: [
          nudge("risk-appetite", -0.6),
          nudge("security-stability", 0.45),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Take the risk if the upside matters enough.",
        nudges: [
          nudge("risk-appetite", 0.6),
          nudge("achievement-ambition", 0.45),
        ],
        hypotheses: supports(["ambition.advancement-first", 0.6]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Learn more before committing either way.",
        nudges: [
          nudge("risk-appetite", -0.2),
          nudge("decision-style", 0.35),
          nudge("security-stability", 0.2),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "unfair_rule",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q3",
    },
    review: PLAYTEST_ABSTRACTION,
    register: "lived-moral",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "A rule is being applied consistently, but the result seems unfair.",
    options: [
      {
        key: "a",
        text: "Follow it for now and work to change it properly.",
        nudges: [
          nudge("institutional-trust", 0.55),
          nudge("civic-order", 0.3),
          nudge("decision-style", 0.35),
        ],
        hypotheses: supports(["trust.process-delivers", 0.75]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Challenge it immediately.",
        nudges: [
          nudge("institutional-trust", -0.55),
          nudge("civic-order", -0.35),
          nudge("risk-appetite", 0.3),
        ],
        hypotheses: supports(
          ["trust.institutions-unresponsive", 0.7],
          ["style.avoids-confrontation", 0],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Find a way to protect the person affected without blowing up the whole process.",
        nudges: [
          nudge("care-obligation", 0.5),
          nudge("decision-style", 0.45),
          nudge("privacy-preference", 0.3),
        ],
        hypotheses: supports(
          ["care.welfare-first", 0.7],
          ["trust.rules-are-obstacles", 0.2],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "family_or_opportunity",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q4",
    },
    review: PLAYTEST_ABSTRACTION,
    register: "lived-personal",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "A family member needs you at the same time as an opportunity that matters a lot to you.",
    options: [
      {
        key: "a",
        text: "Be there for the family member.",
        nudges: [
          nudge("personal-ties", 0.6),
          nudge("care-obligation", 0.5),
          nudge("achievement-ambition", -0.35),
        ],
        hypotheses: supports(
          ["ties.family-first", 0.85],
          ["duty.civic-obligation", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Take the opportunity.",
        nudges: [
          nudge("achievement-ambition", 0.6),
          nudge("personal-ties", -0.45),
        ],
        hypotheses: supports(
          ["ambition.advancement-first", 0.85],
          ["duty.civic-obligation", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Try to rearrange both, even if neither gets everything it wanted.",
        nudges: [
          nudge("decision-style", 0.55),
          nudge("care-obligation", 0.25),
          nudge("achievement-ambition", 0.2),
        ],
        hypotheses: supports(["style.delegation-as-competence", 0.4]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "public_mistake",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q5",
    },
    review: SITUATIONAL,
    register: "lived-moral",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "You make a public mistake and could probably avoid taking the blame.",
    options: [
      {
        key: "a",
        text: "Admit it plainly.",
        nudges: [
          nudge("privacy-preference", -0.6),
          nudge("institutional-trust", 0.25),
          nudge("decision-style", -0.2),
        ],
        hypotheses: supports(
          ["duty.repair-first", 0.5],
          ["image.manage-exposure", 0],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Fix the damage first, then decide what needs to be said.",
        nudges: [
          nudge("decision-style", 0.55),
          nudge("privacy-preference", 0.3),
        ],
        hypotheses: supports(
          ["duty.repair-first", 0.8],
          ["image.manage-exposure", 0.75],
        ),
        ambiguity: ambiguity(
          "exposure.after-the-mistake",
          ["duty.repair-first", "image.manage-exposure"],
          "Repair before disclosure can be responsibility taken seriously, or an interval in which the story gets better.",
        ),
      },
      {
        key: "c",
        text: "Say nothing unless someone asks directly.",
        nudges: [
          nudge("privacy-preference", 0.6),
          nudge("risk-appetite", -0.2),
        ],
        hypotheses: supports(
          ["image.manage-exposure", 0.85],
          ["duty.repair-first", 0.05],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "offered_leadership",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q6",
    },
    review: SITUATIONAL,
    register: "lived-personal",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt: "You are offered leadership over a group you care about.",
    options: [
      {
        key: "a",
        text: "Take it; you want the responsibility.",
        nudges: [
          nudge("achievement-ambition", 0.6),
          nudge("privacy-preference", -0.3),
        ],
        hypotheses: supports(
          ["ambition.advancement-first", 0.85],
          ["duty.civic-obligation", 0.15],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Take it only if the group clearly wants you there.",
        nudges: [
          nudge("achievement-ambition", 0.25),
          nudge("personal-ties", 0.45),
          nudge("institutional-trust", 0.25),
        ],
        hypotheses: supports(
          ["duty.civic-obligation", 0.8],
          ["ambition.advancement-first", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "You would rather influence the result without holding the title.",
        nudges: [
          nudge("privacy-preference", 0.6),
          nudge("achievement-ambition", 0.3),
          nudge("decision-style", 0.3),
        ],
        hypotheses: supports(["style.avoids-confrontation", 0.4]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "letter_of_the_rule",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q7",
    },
    review: SITUATIONAL,
    register: "lived-moral",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt:
      "Your side can win by doing something technically allowed but clearly against the spirit of the rules.",
    options: [
      {
        key: "a",
        text: "Use the opening; winning matters.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("achievement-ambition", 0.5),
          nudge("civic-order", -0.25),
        ],
        hypotheses: supports(
          ["trust.rules-are-obstacles", 0.65],
          ["ambition.advancement-first", 0.5],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Do not use it; the standard matters more than the result.",
        nudges: [
          nudge("decision-style", -0.6),
          nudge("institutional-trust", 0.35),
        ],
        hypotheses: supports(
          ["trust.record-must-be-true", 0.75],
          ["trust.rules-are-obstacles", 0],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Push for another way to win without crossing that line.",
        nudges: [
          nudge("decision-style", 0.4),
          nudge("achievement-ambition", 0.3),
          nudge("institutional-trust", 0.2),
        ],
        hypotheses: supports(["style.delegation-as-competence", 0.3]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "respected_disagreement",
    source: {
      sourceDocument: LIFE_RESEARCH,
      reference: "§14D candidate questionnaire — Q8",
    },
    review: SITUATIONAL,
    register: "lived-relational",
    fixedOrdinal: null,
    observationWeight: 0.9,
    prompt: "A person you respect disagrees with you on something important.",
    options: [
      {
        key: "a",
        text: "Argue the point directly.",
        nudges: [
          nudge("risk-appetite", 0.35),
          nudge("privacy-preference", -0.45),
          nudge("decision-style", -0.3),
        ],
        hypotheses: supports(
          ["style.avoids-confrontation", 0],
          ["ties.loyalty-first", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Ask questions until you understand how they got there.",
        nudges: [
          nudge("decision-style", 0.45),
          nudge("institutional-trust", 0.2),
          nudge("care-obligation", 0.25),
        ],
        hypotheses: supports(["style.avoids-confrontation", 0.25]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Let the disagreement sit unless it actually requires a decision.",
        nudges: [
          nudge("privacy-preference", 0.5),
          nudge("decision-style", 0.25),
          nudge("risk-appetite", -0.3),
        ],
        hypotheses: supports(
          ["style.avoids-confrontation", 0.85],
          ["ties.loyalty-first", 0.05],
        ),
        ambiguity: null,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* The civic items                                                             */
/* -------------------------------------------------------------------------- */

const CIVIC_ITEMS: readonly QuestionnaireItem[] = [
  {
    key: "municipal_fiscal_shortfall",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 04",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "A regional downturn opens a $10 million hole in the city budget. Essential emergency services, road maintenance, and subsidized child care programs face immediate suspension unless new funding is secured within sixty days.",
    options: [
      {
        key: "a",
        text: "Institute an emergency commercial activity tax surcharge on large logistics and corporate centers operating in the district.",
        nudges: [
          nudge("econ-distribution", 0.6),
          nudge("governance-scale", 0.3),
        ],
        hypotheses: supports(
          ["econ.redistributive-conviction", 0.8],
          ["econ.emergency-pragmatism", 0.75],
        ),
        ambiguity: ambiguity(
          "fiscal.why-the-surcharge",
          ["econ.redistributive-conviction", "econ.emergency-pragmatism"],
          "The source records this as genuinely unresolved: a standing belief about who should pay, or the nearest sixty-day answer.",
        ),
      },
      {
        key: "b",
        text: "Implement an across-the-board spending freeze and reduce operational subsidies to non-essential civic and cultural programs.",
        nudges: [
          nudge("econ-distribution", -0.6),
          nudge("decision-style", -0.3),
        ],
        hypotheses: supports(
          ["econ.market-autonomy-conviction", 0.8],
          ["trust.government-competence-doubt", 0.8],
        ),
        ambiguity: ambiguity(
          "fiscal.why-the-freeze",
          [
            "econ.market-autonomy-conviction",
            "trust.government-competence-doubt",
          ],
          "Holding spending down can be a view about markets, or a low opinion of what this council turns money into. Nothing here separates them.",
        ),
      },
      {
        key: "c",
        text: "Issue high-yield municipal revenue bonds backed by future parking and utility fees to spread the fiscal burden over thirty years.",
        nudges: [
          nudge("econ-distribution", 0.15),
          nudge("decision-style", 0.45),
          nudge("risk-appetite", 0.25),
        ],
        hypotheses: supports(["econ.emergency-pragmatism", 0.5]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Negotiate a public-private partnership offering long-term commercial zoning concessions to private developers in exchange for immediate infrastructure funding.",
        nudges: [
          nudge("econ-distribution", -0.3),
          nudge("institutional-trust", -0.2),
          nudge("decision-style", 0.35),
        ],
        hypotheses: supports(
          ["econ.market-autonomy-conviction", 0.5],
          ["trust.government-competence-doubt", 0.45],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "assembly_and_curfew",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 05",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "Following weeks of unresolved public grievances regarding neighborhood policing, unpermitted evening demonstrations consistently block arterial roadways and disrupt small merchant districts. Community leaders defend the demonstrations as necessary civil disruption; downtown business owners and emergency service dispatchers report mounting losses and delayed response times.",
    options: [
      {
        key: "a",
        text: "Enact and enforce an immediate nighttime curfew across the commercial corridor, directing municipal officers to arrest persistent demonstrators who block roadways.",
        nudges: [nudge("civic-order", 0.6), nudge("institutional-trust", 0.3)],
        hypotheses: supports(["trust.institutions-unresponsive", 0]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Barricade perimeter roads to protect demonstration zones from vehicle traffic, accepting traffic diversions and commercial disruption to safeguard the right of assembly.",
        nudges: [nudge("civic-order", -0.6), nudge("social-pluralism", 0.3)],
        hypotheses: supports(
          ["style.public-pressure-works", 0.7],
          ["trust.institutions-unresponsive", 0.2],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Establish designated protest zones adjacent to civic buildings and require twenty-four-hour advance notice for marches affecting major transit arteries.",
        nudges: [nudge("civic-order", 0.25), nudge("decision-style", 0.5)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Prohibit police deployment at demonstration sites and personally facilitate continuous open forums between merchant associations and protest leaders.",
        nudges: [
          nudge("civic-order", -0.3),
          nudge("institutional-trust", -0.3),
          nudge("decision-style", 0.3),
        ],
        hypotheses: supports(["trust.institutions-unresponsive", 0.55]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "heritage_and_density",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 06",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "A historical residential neighborhood characterized by century-old architecture and stable multigenerational families faces severe regional housing pressure. An urban development consortium proposes rezoning five blocks to construct high-density, mixed-income apartment towers, dramatically lowering rents for young working families while fundamentally transforming the architectural character and traffic patterns of the district.",
    options: [
      {
        key: "a",
        text: "Approve the high-density rezoning; addressing the acute regional housing shortage and lowering living costs for new residents supersedes aesthetic preservation.",
        nudges: [
          nudge("social-pluralism", 0.6),
          nudge("econ-distribution", 0.3),
          nudge("security-stability", -0.3),
        ],
        hypotheses: supports(["culture.continuity-matters", 0]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Reject the rezoning; preserving neighborhood historical character, social stability, and established homeowner communities is an essential public duty.",
        nudges: [
          nudge("social-pluralism", -0.6),
          nudge("governance-scale", -0.3),
          nudge("security-stability", 0.4),
        ],
        hypotheses: supports(
          ["culture.continuity-matters", 0.7],
          ["eco.place-preservation", 0.6],
          ["econ.owner-interest", 0.65],
        ),
        ambiguity: ambiguity(
          "preservation.why-keep-it",
          [
            "culture.continuity-matters",
            "eco.place-preservation",
            "econ.owner-interest",
          ],
          "The source lists three readings of the same refusal and says none of them is measured by it.",
        ),
      },
      {
        key: "c",
        text: "Restrict rezoning to adaptive reuse of existing vacant structures and allow accessory dwelling units, permitting modest growth without multi-story towers.",
        nudges: [nudge("decision-style", 0.5), nudge("social-pluralism", -0.2)],
        hypotheses: supports(["eco.place-preservation", 0.4]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Mandate that fifty percent of all new units be reserved exclusively for existing low-income neighborhood residents at subsidized rates, or block construction entirely.",
        nudges: [
          nudge("econ-distribution", 0.55),
          nudge("decision-style", -0.25),
        ],
        hypotheses: supports(
          ["econ.redistributive-conviction", 0.6],
          ["econ.owner-interest", 0.05],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "watershed_industrial_jobs",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 07",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "A major industrial processing plant offers to bring twelve hundred skilled manufacturing jobs to an economically depressed riverfront valley. Hydrogeologists warn that the plant's runoff, even within minimum statutory limits, poses a cumulative long-term risk of degrading the watershed and harming downstream wetlands over the next twenty years.",
    options: [
      {
        key: "a",
        text: "Deny the development permits; long-term ecological integrity and drinking water protection must take absolute precedence over short-term employment gains.",
        nudges: [
          nudge("ecological-priority", 0.6),
          nudge("decision-style", -0.3),
        ],
        hypotheses: supports(
          ["eco.place-preservation", 0.85],
          ["econ.owner-interest", 0],
          ["culture.continuity-matters", 0.05],
          ["eco.urgency-conviction", 0.7],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Grant the permits unconditionally; reviving the region's economic base, wages, and family livelihood is the urgent priority for a struggling community.",
        nudges: [
          nudge("ecological-priority", -0.6),
          nudge("econ-distribution", 0.25),
        ],
        hypotheses: supports(
          ["eco.urgency-conviction", 0],
          ["eco.indifference-to-displacement", 0],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Grant conditional approval requiring the enterprise to fund a closed-loop water treatment facility and deposit ten percent of net profits into an ecological restoration endowment.",
        nudges: [
          nudge("ecological-priority", 0.3),
          nudge("decision-style", 0.55),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Commission an independent eighteen-month regional environmental impact study while offering the firm alternative inland industrial sites outside the critical watershed.",
        nudges: [
          nudge("institutional-trust", 0.5),
          nudge("decision-style", 0.3),
        ],
        hypotheses: supports(["trust.process-delivers", 0.6]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "central_grant_conditions",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 08",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "The federal transportation department offers the county a $50 million infrastructure grant. Taking it means adopting federal standards for school-district zoning, transit scheduling and municipal contracting that cut across how things have been done here for decades.",
    options: [
      {
        key: "a",
        text: "Accept the grant and enforce national standards; uniform criteria and high-capacity central funding modernize the region far more effectively than local fragmentation.",
        nudges: [
          nudge("governance-scale", 0.6),
          nudge("institutional-trust", 0.3),
        ],
        hypotheses: supports(["trust.government-competence-doubt", 0]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Reject the grant; federal money with policy strings compromises local self-determination and forces alien administrative models on the community.",
        nudges: [
          nudge("governance-scale", -0.6),
          nudge("institutional-trust", -0.3),
        ],
        hypotheses: supports(["trust.government-competence-doubt", 0.55]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Join with neighboring counties to seek federal waivers on the conditions, and take the grant if they come through.",
        nudges: [
          nudge("governance-scale", -0.2),
          nudge("decision-style", 0.55),
        ],
        hypotheses: supports(["trust.process-delivers", 0.4]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Accept only the highway and bridge funds while filing a formal administrative challenge against the educational and municipal zoning conditions.",
        nudges: [
          nudge("civic-order", 0.3),
          nudge("decision-style", 0.35),
          nudge("governance-scale", -0.25),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "compromise_and_continuity",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 09",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "You have drafted an ethics reform measure that establishes public oversight over municipal procurement contracts. To achieve a legislative majority, an opposing faction insists on removing the provision that audits existing contracts held by veteran-owned and legacy businesses. Without this compromise, the bill dies and no new oversight is enacted.",
    options: [
      {
        key: "a",
        text: "Accept the exclusion; establishing partial oversight now creates a foundation that can be expanded in future legislative sessions.",
        nudges: [
          nudge("decision-style", 0.6),
          nudge("institutional-trust", 0.3),
        ],
        hypotheses: supports(["trust.process-delivers", 0.6]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Refuse the concession and let the measure fail; accepting deliberate loopholes legitimizes corrupt practices and betrays your public principles.",
        nudges: [
          nudge("decision-style", -0.6),
          nudge("institutional-trust", -0.2),
        ],
        hypotheses: supports(
          ["trust.record-must-be-true", 0.7],
          ["style.avoids-confrontation", 0],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Delay the vote to initiate a public media campaign exposing the specific exemptions demanded by the opposing faction.",
        nudges: [
          nudge("decision-style", -0.25),
          nudge("institutional-trust", -0.4),
          nudge("privacy-preference", -0.35),
        ],
        hypotheses: supports(
          ["style.public-pressure-works", 0.75],
          ["trust.institutions-unresponsive", 0.5],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Propose an automatic three-year sunset clause on the legacy exemptions, ensuring they terminate unless reauthorized by a supermajority vote.",
        nudges: [
          nudge("decision-style", 0.45),
          nudge("institutional-trust", 0.35),
        ],
        hypotheses: supports(["trust.process-delivers", 0.55]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "supply_chain_reshoring",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Core Candidate Bank — Question 10",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.85,
    prompt:
      "An overseas geopolitical crisis disrupts the supply of specialized medical sensors and pharmaceutical precursors. Domestic manufacturers offer to establish production facilities within your region, but require guaranteed municipal purchasing quotas and tariff protections that will increase hospital operational costs by twenty-five percent.",
    options: [
      {
        key: "a",
        text: "Guarantee domestic purchasing quotas; sovereign self-reliance in vital healthcare materials outweighs short-term consumer costs.",
        nudges: [
          nudge("security-posture", -0.6),
          nudge("econ-distribution", 0.3),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Reject domestic purchasing guarantees; hospitals must remain free to procure supplies globally to minimize healthcare costs for the public.",
        nudges: [
          nudge("security-posture", 0.6),
          nudge("econ-distribution", -0.3),
        ],
        hypotheses: supports(["econ.market-autonomy-conviction", 0.5]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Provide temporary five-year municipal tax credits to domestic producers while maintaining open competitive bidding across domestic and allied foreign suppliers.",
        nudges: [nudge("econ-distribution", 0.2), nudge("decision-style", 0.5)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Establish a regional strategic equipment reserve that stockpiles critical foreign supplies without interfering with private market procurement.",
        nudges: [
          nudge("civic-order", 0.25),
          nudge("decision-style", 0.35),
          nudge("security-stability", 0.3),
        ],
        hypotheses: supports([]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "regulatory_discretion",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 11",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "State safety inspectors find technical ventilation and electrical violations in forty small family-owned eateries across the urban core. Strict statutory enforcement requires immediate closure until tens of thousands of dollars in repairs are completed, which will permanently bankrupt half of the businesses.",
    options: [
      {
        key: "a",
        text: "Enforce the mandatory closures immediately; public safety codes admit no exceptions, and granting discretion creates dangerous legal precedents.",
        nudges: [nudge("institutional-trust", 0.6), nudge("civic-order", 0.3)],
        hypotheses: supports(
          ["trust.rules-are-obstacles", 0],
          ["care.welfare-first", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Suspend the closure orders and grant a twelve-month conditional grace period for compliance while businesses remain open.",
        nudges: [
          nudge("institutional-trust", -0.6),
          nudge("econ-distribution", -0.3),
        ],
        hypotheses: supports(
          ["trust.rules-are-obstacles", 0.8],
          ["care.welfare-first", 0.2],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Establish a low-interest municipal emergency loan fund to finance immediate life-safety repairs while deferring cosmetic electrical updates.",
        nudges: [
          nudge("econ-distribution", 0.5),
          nudge("decision-style", 0.35),
        ],
        hypotheses: supports(
          ["care.welfare-first", 0.8],
          ["trust.rules-are-obstacles", 0.15],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Grant permanent variances for small businesses under fifty employees, holding large corporate food chains to the rigorous standard.",
        nudges: [
          nudge("econ-distribution", 0.35),
          nudge("institutional-trust", -0.25),
        ],
        hypotheses: supports(["trust.rules-are-obstacles", 0.5]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "emergency_curfew_and_commerce",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 12",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "Following severe flood damage and localized electrical failures across three neighborhoods, sporadic property damage occurs after dark. The regional police commander requests authority to declare an emergency curfew that forbids all civilians from leaving their homes between dusk and dawn.",
    options: [
      {
        key: "a",
        text: "Authorize the mandatory curfew and deploy mutual-aid patrols to protect private property and restore civic stability.",
        nudges: [nudge("civic-order", 0.6), nudge("institutional-trust", 0.3)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Reject the curfew; natural disasters do not justify suspending constitutional freedom of movement and treating citizens as suspects.",
        nudges: [nudge("civic-order", -0.6), nudge("social-pluralism", 0.25)],
        hypotheses: supports(["trust.institutions-unresponsive", 0.35]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Authorize a voluntary evening travel advisory and redirect patrols to protect critical supply distribution depots and medical clinics.",
        nudges: [nudge("civic-order", 0.2), nudge("decision-style", 0.5)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Empower local neighborhood watch associations and volunteer community councils to organize local security patrols without municipal curfew orders.",
        nudges: [nudge("governance-scale", -0.55), nudge("civic-order", -0.2)],
        hypotheses: supports(["trust.government-competence-doubt", 0.45]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "curriculum_governance",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 13",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "A dispute divides a regional school district: a state educational commission issues modern history and social science standards that introduce broader perspectives on national history, while a coalition of local parent-teacher associations demands the right to veto textbooks that contradict regional traditional heritage.",
    options: [
      {
        key: "a",
        text: "Enforce the state commission's standards; public education must be grounded in professional scholarly consensus, not regional cultural preferences.",
        nudges: [
          nudge("social-pluralism", 0.55),
          nudge("governance-scale", 0.55),
          nudge("institutional-trust", 0.3),
        ],
        hypotheses: supports(["culture.continuity-matters", 0]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Uphold local parental authority; communities have the fundamental right to determine the moral and cultural values taught to their children.",
        nudges: [
          nudge("social-pluralism", -0.55),
          nudge("governance-scale", -0.55),
        ],
        hypotheses: supports(
          ["culture.continuity-matters", 0.85],
          ["eco.place-preservation", 0.05],
          ["econ.owner-interest", 0.05],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Permit school districts to offer alternative specialized elective tracks, allowing families to choose between traditional and modern curricula.",
        nudges: [nudge("decision-style", 0.5), nudge("social-pluralism", -0.2)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Establish an independent citizen review panel composed equally of parents, professional educators, and students to curate reading lists locally.",
        nudges: [
          nudge("institutional-trust", -0.4),
          nudge("governance-scale", -0.4),
        ],
        hypotheses: supports(["trust.government-competence-doubt", 0.4]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "public_debt_infrastructure",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 14",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "The regional transit authority proposes constructing an electrified light rail line connecting low-income outer districts to major hospital and university corridors. The project requires taking on substantial long-term municipal debt, which will consume fifteen percent of the city's borrowing capacity for twenty-five years.",
    options: [
      {
        key: "a",
        text: "Issue the municipal bonds and construct the rail line; high-capacity public investment in connective infrastructure pays intergenerational social dividends.",
        nudges: [
          nudge("econ-distribution", 0.6),
          nudge("decision-style", 0.25),
          nudge("risk-appetite", 0.25),
        ],
        hypotheses: supports(
          ["econ.redistributive-conviction", 0.7],
          ["econ.market-autonomy-conviction", 0],
          ["trust.government-competence-doubt", 0],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Reject the debt expansion; incurring heavy public debt constrains future generations and exposes the municipality to insolvency during economic contractions.",
        nudges: [
          nudge("econ-distribution", -0.6),
          nudge("civic-order", 0.2),
          nudge("security-stability", 0.4),
        ],
        // The separator for the freeze ambiguity: a debt-prudence answer is
        // well explained by a view about markets and poorly explained by
        // doubting this council in particular.
        hypotheses: supports(
          ["econ.market-autonomy-conviction", 0.85],
          ["trust.government-competence-doubt", 0.1],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Implement a phased bus rapid transit system utilizing existing roadways, reducing capital costs and debt exposure by seventy percent.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("econ-distribution", 0.15),
        ],
        hypotheses: supports(["econ.emergency-pragmatism", 0.4]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Require that the project be financed through a franchise model where a private developer builds and operates the line, recovering costs through rider fares.",
        nudges: [
          nudge("econ-distribution", -0.5),
          nudge("institutional-trust", -0.25),
        ],
        hypotheses: supports(
          ["econ.market-autonomy-conviction", 0.6],
          ["trust.government-competence-doubt", 0.55],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "biometric_surveillance_safety",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 15",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "Following a spike in organized retail thefts and violent transit platform muggings, the regional transit commission proposes deploying automated biometric facial recognition software across all public rail stations. Independent legal analysts warn that the system creates an intrusive surveillance architecture that risks misidentifying innocent citizens.",
    options: [
      {
        key: "a",
        text: "Approve the facial recognition deployment; modern technical surveillance provides essential deterrence and protects public safety.",
        nudges: [nudge("civic-order", 0.6), nudge("institutional-trust", 0.35)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Ban facial recognition technology across all public transportation; preserving individual privacy and freedom from warrantless tracking outweighs law enforcement efficiency.",
        nudges: [
          nudge("civic-order", -0.6),
          nudge("institutional-trust", -0.3),
          nudge("privacy-preference", 0.4),
        ],
        hypotheses: supports(["trust.government-competence-doubt", 0.4]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Permit algorithmic tracking only in real-time response to verified active felony warrants, requiring judicial authorization for any database search.",
        nudges: [
          nudge("civic-order", 0.2),
          nudge("decision-style", 0.5),
          nudge("institutional-trust", 0.3),
        ],
        hypotheses: supports(["trust.process-delivers", 0.5]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Reject biometric tracking and reallocate the technology budget to double the number of human transit security personnel on station platforms.",
        nudges: [nudge("civic-order", -0.25), nudge("econ-distribution", 0.3)],
        hypotheses: supports([]),
        ambiguity: null,
      },
    ],
  },
  {
    key: "administrative_whistleblower",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 16",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "A mid-level civil service analyst leaks internal municipal audit reports to your office, revealing that a high-profile public welfare program spent forty percent of its budget on outside consulting fees without showing measurable improvements in community health. The department director asserts that the leak violated confidentiality protocols and threatens criminal prosecution against the employee.",
    options: [
      {
        key: "a",
        text: "Shield the whistleblower publicly, release the audit to the press, and demand the immediate resignation of the department director.",
        // The other separator for the freeze ambiguity, from the opposite
        // side: this is a strong reading of "the money is not being turned
        // into anything" with no market view attached to it at all.
        nudges: [
          nudge("institutional-trust", -0.6),
          nudge("decision-style", -0.45),
          nudge("privacy-preference", -0.5),
        ],
        hypotheses: supports(
          ["trust.government-competence-doubt", 0.85],
          ["econ.market-autonomy-conviction", 0.05],
          ["style.public-pressure-works", 0.7],
          ["trust.institutions-unresponsive", 0.65],
          ["style.avoids-confrontation", 0],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Condemn the unauthorized disclosure and refer the analyst for disciplinary review, while quietly demanding an executive review of the consulting contracts.",
        nudges: [nudge("institutional-trust", 0.6), nudge("civic-order", 0.35)],
        hypotheses: supports(
          ["trust.process-delivers", 0.7],
          ["style.public-pressure-works", 0],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Introduce legislation establishing structured, confidential channels for civil service whistleblowers while refusing to comment on this specific leak.",
        nudges: [
          nudge("institutional-trust", 0.35),
          nudge("decision-style", 0.45),
        ],
        hypotheses: supports(["trust.process-delivers", 0.6]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Leverage the leaked document in confidential budget negotiations to force administrative reforms without generating public scandal.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("institutional-trust", -0.2),
          nudge("privacy-preference", 0.55),
        ],
        hypotheses: supports(
          ["style.avoids-confrontation", 0.5],
          ["trust.government-competence-doubt", 0.4],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "energy_transition_labor",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 17",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "Regional clean-air mandates require closing two older coal-fired power generating stations within three years, cutting regional carbon emissions by twenty percent. The closures will eliminate four hundred high-paying union boiler and maintenance positions in a rural municipality where the plant provides sixty percent of local property tax revenue.",
    options: [
      {
        key: "a",
        text: "Enforce the closure timeline strictly; mitigating environmental degradation and protecting regional respiratory health cannot be delayed for industrial jobs.",
        nudges: [
          nudge("ecological-priority", 0.6),
          nudge("social-pluralism", 0.2),
        ],
        hypotheses: supports(
          ["eco.urgency-conviction", 0.8],
          ["eco.indifference-to-displacement", 0.75],
        ),
        ambiguity: ambiguity(
          "ecology.closing-the-plant",
          ["eco.urgency-conviction", "eco.indifference-to-displacement"],
          "The source records this exact pair as unresolved by the item: principled urgency, or not much thought for the four hundred.",
        ),
      },
      {
        key: "b",
        text: "Extend the plant licenses for ten years while funding scrubbers, prioritizing community economic survival and municipal fiscal stability over emission mandates.",
        nudges: [
          nudge("ecological-priority", -0.6),
          nudge("governance-scale", -0.3),
          nudge("security-stability", 0.35),
        ],
        hypotheses: supports(["eco.urgency-conviction", 0]),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Establish a state transition fund providing full salary replacement for displaced workers for four years, financed by a temporary surcharge on regional electricity bills.",
        // The separator for the plant ambiguity: paying for the four hundred
        // is well explained by urgency-with-conscience and badly explained by
        // indifference to them.
        nudges: [
          nudge("econ-distribution", 0.6),
          nudge("decision-style", 0.35),
        ],
        hypotheses: supports(
          ["eco.urgency-conviction", 0.7],
          ["eco.indifference-to-displacement", 0.05],
          ["econ.redistributive-conviction", 0.6],
        ),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Condition the plant closures on the immediate construction of a utility-scale battery storage facility on the same site, guaranteeing union hiring preferences.",
        nudges: [
          nudge("decision-style", 0.5),
          nudge("ecological-priority", 0.3),
        ],
        hypotheses: supports(
          ["eco.urgency-conviction", 0.5],
          ["eco.indifference-to-displacement", 0.1],
        ),
        ambiguity: null,
      },
    ],
  },
  {
    key: "intermunicipal_tax_sharing",
    source: {
      sourceDocument: CALIBRATION_RESEARCH,
      reference: "Reserve Bank — Question 18",
    },
    review: POLICY_DOCKET,
    register: "policy-docket",
    fixedOrdinal: null,
    observationWeight: 0.8,
    prompt:
      "An affluent suburban enclave attracts major technology and corporate parks, generating massive local property tax surpluses that fund luxury schools and community amenities. Adjacent working-class industrial suburbs suffer from decaying roads and underfunded schools. A regional bill proposes pooling twenty-five percent of suburban commercial property taxes into an equalization fund distributed by student population.",
    options: [
      {
        key: "a",
        text: "Support the regional tax-sharing bill; children across an economic region deserve equitable educational funding regardless of municipal borders.",
        nudges: [
          nudge("econ-distribution", 0.6),
          nudge("governance-scale", 0.55),
        ],
        hypotheses: supports(
          ["econ.redistributive-conviction", 0.8],
          ["econ.owner-interest", 0],
        ),
        ambiguity: null,
      },
      {
        key: "b",
        text: "Oppose the bill; communities that invest wisely to attract commercial development must retain their local revenues rather than subsidize neighboring jurisdictions.",
        // The separator for the preservation ambiguity: keeping what is yours
        // is an owner's answer, and neither a cultural nor an ecological one.
        nudges: [
          nudge("econ-distribution", -0.6),
          nudge("governance-scale", -0.55),
        ],
        hypotheses: supports(
          ["econ.owner-interest", 0.85],
          ["culture.continuity-matters", 0.1],
          ["eco.place-preservation", 0.05],
          ["econ.market-autonomy-conviction", 0.55],
        ),
        ambiguity: null,
      },
      {
        key: "c",
        text: "Establish an incentive fund where the central state matches suburban funds contributed voluntarily to collaborative regional vocational institutes.",
        nudges: [nudge("decision-style", 0.5), nudge("governance-scale", 0.25)],
        hypotheses: supports([]),
        ambiguity: null,
      },
      {
        key: "d",
        text: "Authorize suburban enclaves to satisfy the requirement by annexing distressed residential neighborhoods and directly administering their municipal services.",
        nudges: [nudge("decision-style", 0.35), nudge("governance-scale", 0.4)],
        hypotheses: supports([]),
        ambiguity: null,
      },
    ],
  },
];

export const SETUP_QUESTIONNAIRE_BANK: readonly QuestionnaireItem[] = [
  ...OPENING_BANK_ITEMS,
  ...FORMER_OPENERS,
  ...LIFE_ITEMS,
  ...CIVIC_ITEMS,
];

/**
 * The three every run opens with, in order.
 *
 * A life starts somewhere specific, so the calibration does too. What changes
 * after these three is decided by what the model still needs, which is why
 * only the opening is fixed.
 */
export const FIXED_OPENING_KEYS: readonly string[] = OPENING_FIXED_ITEMS.map(
  (item) => item.key,
);
