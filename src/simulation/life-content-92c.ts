import type {
  EpisodeAuthority,
  EpisodeFamily,
  EpisodeOption,
  EpisodeRequirement,
  EpisodeStage,
} from "./life-episodes";
import type { DimensionNudge, InterestTension } from "./player-model";

/**
 * The 92C life-content wave, at the two ends the game was thinnest.
 *
 * Human play and the 260-beat narrative corpus found the same two holes. A
 * five-year-old and a ten-year-old were handed the same situations, because
 * eligibility asked which coarse band somebody was in and nothing finer; and
 * the moment a life reached eighteen the game went straight from adolescence
 * to civic office, as though the ordinary years in between — a shift, a bus
 * timetable, a course somebody else did not do their half of — were not part
 * of the life.
 *
 * This file is the first wave against both, authored as data over the episode
 * machinery that already exists. It declares no schema, adds no record family
 * and owns no engine. Every stage here is offered because the world already
 * contains the thing it is about, and is not offered otherwise.
 *
 * ## Why the ages are narrow
 *
 * The early-childhood band runs from birth to eight, which is the right
 * granularity for pacing and the wrong one for content: at five a rule is an
 * absolute handed down by adults and fairness means identical shares; at seven
 * a rule is an agreement that can be changed if everybody agrees first, and a
 * child knows somebody can hide what they feel. Those are not the same scene
 * with a different word in it. So each early stage carries its own
 * `age-at-least`/`age-below` pair, and the ladder is the point rather than an
 * accident of where the band boundaries fell.
 *
 * ## What a child is allowed to decide
 *
 * 92C's agency triad is enforced here by what is written rather than by a
 * checker: a child chooses how to answer, whether to share, whether to join in
 * or hang back, whether to keep a thing that is theirs. A child witnesses and
 * reacts to an adult who is not all right. A child is never handed housing,
 * money, medical, custody, schooling or employment — not softened versions of
 * them either, because a softened adult decision is still an adult decision.
 * `without-capability: answers-for-themselves` is what makes that structural:
 * these stages are written for somebody who does not answer for the household,
 * and the record says who does.
 *
 * ## What the adult end is not
 *
 * It is not a four-year college. Nothing here requires, mentions or presumes
 * one: the education-gated stages ask only that an enrollment exists, so a
 * community college, a certificate programme or a training course reaches them
 * identically, and the work-gated stages ask only that a job exists. No
 * frequency is sampled and no probability is claimed anywhere in this file —
 * 92C's own demographic figures describe a population, not this person, and
 * turning them into arrival rates would be inventing a fact about a life.
 *
 * ## The long tail is a record, not a promise
 *
 * `companionship.the-friend-you-named` is the shape the wave is built to
 * demonstrate. A child names a best friend at six or seven; eight years and
 * more later the same person is at the next till. The later stage cannot fire
 * unless the earlier one is genuinely on this instance's record and the clock
 * genuinely shows the years — and because an instance is keyed by the person
 * bound to it, it is that friend or nobody.
 */

const RESEARCH_AUTHORITY: EpisodeAuthority = {
  sourceDocument:
    "92C_ANTIGRAVITY_LIFE_CONTENT_AND_PACING_RESEARCH — AGES_5_7_AND_18_PLUS — 2026-09-05",
  reference:
    "Section 2 (ages 5–7 developmental capability matrix and agency triad), Section 3 (ages 17–25 transition landscape), Section 8 (scenario family bank seeds)",
};

/* -------------------------------------------------------------------------- */
/* Authoring helpers                                                           */
/* -------------------------------------------------------------------------- */

function nudge(
  dimension: DimensionNudge["dimension"],
  magnitude: number,
): DimensionNudge {
  return { dimension, magnitude };
}

function tension(
  between: InterestTension["between"],
  poles: InterestTension["poles"],
  note: string,
): InterestTension {
  return { between, poles, note };
}

/** Somebody else is responsible for them, and the record is what says so. */
const isAChild: EpisodeRequirement = {
  kind: "without-capability",
  capability: "answers-for-themselves",
};

/** There is a school and they attend it. Never which kind, and never a name. */
const atSchool: EpisodeRequirement = { kind: "fact", fact: "school.enrolled" };

/** There is a job, with hours and a place. Never which job. */
const hasWork: EpisodeRequirement = {
  kind: "capability",
  capability: "paid-work",
};

/**
 * There is an enrollment.
 *
 * Deliberately the whole of the education gate for the adult stages. A
 * two-year programme, a certificate, an apprenticeship's classroom day and a
 * four-year degree all produce an enrollment record, and asking for anything
 * more here would quietly make the four-year path the default that 92C's
 * Track B exists to remove.
 */
const inTraining: EpisodeRequirement = {
  kind: "capability",
  capability: "in-school",
};

function aged(from: number, below: number): readonly EpisodeRequirement[] {
  return [
    { kind: "age-at-least", age: from },
    { kind: "age-below", age: below },
  ];
}

/* -------------------------------------------------------------------------- */
/* Kernel provenance                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Which 92C kernel each authored stage came from.
 *
 * Kept as data beside the families rather than in a comment so the mapping can
 * be tested and reported. A stage that is a continuation of a kernel rather
 * than a kernel of its own says so; the coverage count in the completion
 * report is taken from this table and not from a hand tally.
 */
export interface KernelProvenance {
  readonly kernelId: string;
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly track: "A" | "B" | "C" | "E";
  /** True for a stage authored as the kernel itself, false for its long tail. */
  readonly isKernel: boolean;
}

export const LIFE_CONTENT_92C_KERNELS: readonly KernelProvenance[] = [
  {
    kernelId: "early.school.cubby-space",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "cubby-space",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.school.partner-pairing",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "partner-pairing",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.school.recess-race",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "recess-race",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.school.tattle-boundary",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "tattle-boundary",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.school.tattle-boundary",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "it-was-still-there",
    track: "A",
    isKernel: false,
  },
  {
    kernelId: "early.home.chore-resistance",
    episodeKey: "home.someone-is-not-all-right",
    stageKey: "chore-resistance",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.home.parent-exhaustion",
    episodeKey: "home.someone-is-not-all-right",
    stageKey: "parent-exhaustion",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.home.sibling-toy-snatch",
    episodeKey: "home.someone-is-not-all-right",
    stageKey: "sibling-toy-snatch",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "early.peer.best-friend-pact",
    episodeKey: "companionship.the-friend-you-named",
    stageKey: "best-friend-pact",
    track: "A",
    isKernel: true,
  },
  {
    kernelId: "rel.encounter.dormant-callback-reunion",
    episodeKey: "companionship.the-friend-you-named",
    stageKey: "across-the-checkout",
    track: "C",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.shift-call-in",
    episodeKey: "work.the-shift-you-were-asked-for",
    stageKey: "called-in",
    track: "B",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.coworker-cover-shift",
    episodeKey: "work.the-shift-you-were-asked-for",
    stageKey: "asked-by-a-colleague",
    track: "B",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.coworker-cover-shift",
    episodeKey: "work.the-shift-you-were-asked-for",
    stageKey: "it-came-back-round",
    track: "B",
    isKernel: false,
  },
  {
    kernelId: "adult.trans.tip-pooling-dispute",
    episodeKey: "work.the-money-nobody-counts",
    stageKey: "pooled-tips",
    track: "B",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.tip-pooling-dispute",
    episodeKey: "work.the-money-nobody-counts",
    stageKey: "what-you-said-stuck",
    track: "B",
    isKernel: false,
  },
  {
    kernelId: "adult.trans.commuter-strain",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "the-commute",
    track: "B",
    isKernel: true,
  },
  {
    kernelId: "rel.encounter.study-group-freeloader",
    episodeKey: "school.the-thing-you-got-blamed-for",
    stageKey: "carrying-the-group",
    track: "C",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.family-business-obligation",
    episodeKey: "kin.the-work-that-is-not-paid",
    stageKey: "the-family-shop",
    track: "B",
    isKernel: true,
  },
  {
    kernelId: "adult.trans.family-business-obligation",
    episodeKey: "kin.the-work-that-is-not-paid",
    stageKey: "the-third-weekend",
    track: "B",
    isKernel: false,
  },
  {
    kernelId: "civic.encounter.flooding-sandbag-effort",
    episodeKey: "civic.the-thing-nobody-else-turned-up-for",
    stageKey: "sandbag-line",
    track: "E",
    isKernel: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Track A — the first room                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Being placed, at five and at seven.
 *
 * Two stages that are the same subject at two ages and are not the same scene.
 * At five the collision is with a rule about a hook; at seven it is with what
 * the rest of the room saw. Neither can reach the other's age.
 */
const FIRST_ROOM: EpisodeFamily = {
  key: "early-school.the-first-room",
  family: "school",
  authority: RESEARCH_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "cubby-space",
      requires: [atSchool, isAChild, ...aged(5, 6)],
      lines: [
        "Your name is on the hook.",
        "One of the other kids has put their coat on it.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["civic-order", "personal-ties"],
          [1, 1],
          "The hook is yours because you were told it was; the other kid is standing right there.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "take-the-coat-off",
          label: "Take the coat off",
          description: "Lift their coat off your hook.",
          nudges: [nudge("civic-order", 0.3), nudge("risk-appetite", 0.2)],
          aftermath: null,
          memory: "You took the other kid's coat off your hook.",
        },
        {
          key: "say-it-is-yours",
          label: "Tell them it's yours",
          description: "Say that hook has your name on it.",
          nudges: [nudge("decision-style", 0.25), nudge("civic-order", 0.2)],
          aftermath: null,
          memory: "You told them the hook had your name on it.",
        },
        {
          key: "leave-it",
          label: "Don't touch the coat",
          description: "Don't touch the coat and don't say anything.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory: "You left the coat where it was.",
        },
      ],
    },
    {
      key: "partner-pairing",
      requires: [atSchool, isAChild, ...aged(7, 8)],
      lines: [
        "The class is being put into pairs for a piece of work, and you've been put with the kid nobody else asked for.",
        "You can tell the other kids noticed who you got.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "Getting on with the work, against what the room saw.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "start-the-work",
          label: "Start the work",
          description: "Get going on the work with your partner.",
          nudges: [nudge("personal-ties", 0.3), nudge("decision-style", 0.2)],
          aftermath: null,
          memory: "You got started on the work with the kid you were put with.",
        },
        {
          key: "look-around",
          label: "Look around the room",
          description: "Look at the other kids who noticed.",
          nudges: [nudge("privacy-preference", 0.25)],
          aftermath: null,
          memory: "You looked around at the other kids.",
        },
        {
          key: "ask-for-another",
          label: "Ask for a different partner",
          description: "Ask if you can be with someone else.",
          nudges: [
            nudge("personal-ties", -0.3),
            nudge("achievement-ambition", 0.2),
          ],
          aftermath: null,
          memory: "You asked if you could be with someone else.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-school",
      when: [{ kind: "absent", fact: "school.enrolled" }],
      reason: "The enrollment these are about has ended.",
    },
  ],
};

/**
 * Rules, at six and seven, when a rule is still a thing adults hand down.
 *
 * The second stage is the same rule a good half-year later, and it is
 * deliberately not a verdict on the first: what the child did the first time
 * is on the record but is not restated to them, and neither option here closes
 * anything. Every option leaves nothing behind, which is what lets a childhood
 * contain a thread that simply stops mattering.
 */
const RULES_AS_WRITTEN: EpisodeFamily = {
  key: "early-school.rules-as-written",
  family: "school",
  authority: RESEARCH_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "recess-race",
      requires: [atSchool, isAChild, ...aged(6, 8)],
      lines: [
        "You lose the race across the yard.",
        "Nobody was watching the start except the two of you, and you know it was fair.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["civic-order", "achievement-ambition"],
          [1, 1],
          "What happened, against what you would rather had happened.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "say-they-cheated",
          label: "Say they cheated",
          description: "Tell the other kid the start wasn't fair.",
          nudges: [
            nudge("achievement-ambition", 0.3),
            nudge("civic-order", -0.3),
          ],
          aftermath: null,
          memory: "You said the other kid cheated at the start.",
        },
        {
          key: "race-again",
          label: "Ask to race again",
          description: "Say that one didn't count and ask to run it again.",
          nudges: [
            nudge("achievement-ambition", 0.3),
            nudge("risk-appetite", 0.2),
          ],
          aftermath: null,
          memory: "You asked for another race.",
        },
        {
          key: "say-nothing",
          label: "Say nothing about it",
          description: "Don't bring the start up.",
          nudges: [nudge("privacy-preference", 0.3), nudge("civic-order", 0.2)],
          aftermath: null,
          memory: "You lost and didn't say anything about the start.",
        },
      ],
    },
    {
      key: "tattle-boundary",
      requires: [atSchool, isAChild, ...aged(6, 8)],
      lines: [
        "During quiet work you're supposed to stay at your table, and while the adult was out of the room another kid got up and went to the window.",
        "The adult is back and hasn't said anything about it.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["civic-order", "personal-ties"],
          [1, 1],
          "The rule, against the kid standing next to you.",
        ),
      ],
      mayLeadTo: ["it-was-still-there"],
      options: [
        {
          key: "tell-the-adult",
          label: "Tell the adult",
          description:
            "You say that the other kid went to the window during quiet work.",
          nudges: [nudge("civic-order", 0.35), nudge("personal-ties", -0.25)],
          aftermath: null,
          memory:
            "You told the adult that another kid went to the window during quiet work.",
        },
        {
          key: "keep-working",
          label: "Keep working",
          description:
            "You stay at your table and don't say anything about it.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory:
            "You stayed at your table and didn't say anything about the other kid going to the window.",
        },
        {
          key: "ask-about-the-rule",
          label: "Ask about the rule",
          description:
            "You ask the adult if you have to stay at your table during quiet work.",
          nudges: [
            nudge("institutional-trust", 0.3),
            nudge("decision-style", -0.2),
          ],
          aftermath: null,
          memory:
            "You asked the adult whether you had to stay at your table during quiet work.",
        },
      ],
    },
    {
      key: "it-was-still-there",
      requires: [
        { kind: "after-stage", stage: "tattle-boundary" },
        { kind: "days-since-stage", stage: "tattle-boundary", days: 180 },
        atSchool,
        isAChild,
        { kind: "age-below", age: 9 },
      ],
      lines: [
        "It's quiet work, and a kid is at the window again.",
        "You remember what you did the first time.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["civic-order", "risk-appetite"],
          [1, 1],
          "The rule is still the rule, and the window is still over there.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "go-to-the-window",
          label: "Go to the window",
          description: "Get up and stand at the window too.",
          nudges: [nudge("risk-appetite", 0.35), nudge("civic-order", -0.25)],
          aftermath: null,
          memory: "You got up and went to the window too.",
        },
        {
          key: "stay-at-your-table",
          label: "Stay at your table",
          description: "Keep doing your quiet work.",
          nudges: [nudge("civic-order", 0.3), nudge("security-stability", 0.2)],
          aftermath: null,
          memory: "You stayed at your table and kept working.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-school",
      when: [{ kind: "absent", fact: "school.enrolled" }],
      reason: "The enrollment these are about has ended.",
    },
  ],
};

/**
 * The house, from the position of somebody who does not run it.
 *
 * All three stages require that somebody else holds authority over the child,
 * and none of them lets the child decide anything about the household. The
 * middle one is 92C's witness category in its plainest form: an adult is not
 * all right, the child can see it, nobody has told them why, and what is
 * theirs to decide is only what they themselves do next.
 */
const HOUSE_RULES: EpisodeFamily = {
  key: "early-home.the-house-rules",
  family: "household",
  authority: RESEARCH_AUTHORITY,
  roles: ["guardian", "household-peer"],
  stages: [
    {
      key: "chore-resistance",
      requires: [
        { kind: "fact", fact: "household.shared" },
        { kind: "role", role: "guardian" },
        isAChild,
        ...aged(5, 7),
      ],
      lines: [
        "The blocks are out on the floor and you're not done with them.",
        "{role:guardian} has told you to put them away before dinner.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["civic-order", "privacy-preference"],
          [1, 1],
          "What you were told, against what you were in the middle of.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "keep-playing",
          label: "Keep playing",
          description: "You go on with what you were doing with the blocks.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("civic-order", -0.25),
          ],
          aftermath: null,
          memory:
            "You kept going with the blocks after {role:guardian} told you to put them away.",
        },
        {
          key: "put-them-away",
          label: "Put them away",
          description: "You start picking the blocks up off the floor.",
          nudges: [nudge("civic-order", 0.3), nudge("care-obligation", 0.2)],
          aftermath: null,
          memory: "You put the blocks away when {role:guardian} told you to.",
        },
        {
          key: "ask-to-finish",
          label: "Ask to finish first",
          description: "You ask {role:guardian} to let you finish first.",
          nudges: [nudge("decision-style", 0.25), nudge("personal-ties", 0.2)],
          aftermath: null,
          memory:
            "You asked {role:guardian} if you could finish with the blocks first.",
        },
      ],
    },
    {
      key: "parent-exhaustion",
      requires: [
        { kind: "fact", fact: "household.shared" },
        { kind: "role", role: "guardian" },
        isAChild,
        ...aged(6, 8),
      ],
      lines: [
        "{role:guardian} is at the table with their head down.",
        "They haven't seen you yet, and you can tell they're not all right.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "Going over there, against leaving them to it.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "sit-down-next-to-them",
          label: "Sit down next to them",
          description:
            "Sit at the table next to {role:guardian} without saying anything.",
          nudges: [
            nudge("personal-ties", 0.35),
            nudge("care-obligation", 0.25),
          ],
          aftermath: null,
          memory:
            "You sat down at the table next to {role:guardian} and didn't say anything.",
        },
        {
          key: "ask-what-is-wrong",
          label: "Ask what's wrong",
          description: "Ask {role:guardian} what's wrong.",
          nudges: [nudge("decision-style", 0.3), nudge("personal-ties", 0.25)],
          aftermath: null,
          memory: "You asked {role:guardian} what was wrong.",
        },
        {
          key: "go-do-something-else",
          label: "Go do something else",
          description: "Go do something else without saying anything.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory:
            "You saw {role:guardian} at the table with their head down and went to do something else.",
        },
      ],
    },
    {
      key: "sibling-toy-snatch",
      requires: [
        { kind: "fact", fact: "household.shared" },
        { kind: "role-age-below", role: "household-peer", age: 5 },
        isAChild,
        ...aged(5, 8),
      ],
      lines: [
        "{role:household-peer} has just pulled what you were playing with right out of your hands.",
        "It's yours, and no adult is in the room.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["privacy-preference", "care-obligation"],
          [1, 1],
          "It is yours, and they are much smaller than you.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "take-it-back",
          label: "Take it back",
          description: "Pull it out of {role:household-peer}'s hands.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("risk-appetite", 0.2),
          ],
          aftermath: null,
          memory: "You took it back out of {role:household-peer}'s hands.",
        },
        {
          key: "let-it-go",
          label: "Let it go",
          description: "Leave it with {role:household-peer}.",
          nudges: [nudge("care-obligation", 0.3), nudge("personal-ties", 0.2)],
          aftermath: null,
          memory: "You left it with {role:household-peer}.",
        },
        {
          key: "go-get-somebody",
          label: "Go get somebody",
          description: "Go looking for a grown-up.",
          nudges: [
            nudge("institutional-trust", 0.25),
            nudge("decision-style", -0.2),
          ],
          aftermath: null,
          memory: "You went looking for a grown-up.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "no-longer-a-household",
      when: [{ kind: "absent", fact: "household.shared" }],
      reason: "The shared household these are about has ended.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* The long tail — a childhood friend, and the same person years later         */
/* -------------------------------------------------------------------------- */

/**
 * The friend you named at six, at the next till at twenty.
 *
 * The second stage is the whole reason this family is one family. It needs the
 * first stage on this instance's record, and it needs the clock to show eight
 * years — and because an instance is keyed by who is bound to it, it can only
 * ever be about the person the child actually named. Neither the years nor the
 * friend is authored; both are read.
 *
 * Nothing here says what happened in between, because nothing knows. The
 * asymmetry 92C asks for is in the options rather than in a hidden variable:
 * you may bring it up and find it meant less to them than to you, and the game
 * does not tell you in advance which.
 */
const FRIEND_YOU_NAMED: EpisodeFamily = {
  key: "companionship.the-friend-you-named",
  family: "companionship",
  authority: RESEARCH_AUTHORITY,
  roles: ["familiar"],
  stages: [
    {
      key: "best-friend-pact",
      requires: [{ kind: "role", role: "familiar" }, isAChild, ...aged(6, 8)],
      lines: [
        "{role:familiar} says the two of you are best friends, and it should be just the two of you.",
        "There's a third child who has been playing with you both.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "social-pluralism"],
          [1, -1],
          "Having a best friend is being offered on the condition of leaving somebody out.",
        ),
      ],
      mayLeadTo: ["across-the-checkout"],
      options: [
        {
          key: "say-yes",
          label: "Say yes",
          description: "Agree it's just the two of you.",
          nudges: [
            nudge("personal-ties", 0.4),
            nudge("social-pluralism", -0.25),
          ],
          aftermath: "goodwill",
          memory: "You told {role:familiar} yes, just the two of you.",
        },
        {
          key: "ask-about-the-third",
          label: "Ask about the third child",
          description: "Ask what about the third child.",
          nudges: [
            nudge("social-pluralism", 0.35),
            nudge("decision-style", 0.2),
          ],
          aftermath: null,
          memory: "You asked {role:familiar} what about the third child.",
        },
        {
          key: "say-nothing-back",
          label: "Don't answer either way",
          description: "Don't answer either way.",
          nudges: [nudge("privacy-preference", 0.3)],
          aftermath: null,
          memory: "You didn't say anything back.",
        },
      ],
    },
    {
      key: "across-the-checkout",
      requires: [
        { kind: "after-choice", stage: "best-friend-pact", option: "say-yes" },
        { kind: "days-since-stage", stage: "best-friend-pact", days: 2920 },
        { kind: "role", role: "familiar" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "You're both in the queue at the checkout, and {role:familiar} has recognised you.",
        "You remember the two of you agreeing, as kids, that you were best friends.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "Picking it up again, against letting it stay where it was.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "say-hello",
          label: "Say hello",
          description: "Speak to {role:familiar} in the queue.",
          nudges: [nudge("personal-ties", 0.3)],
          aftermath: null,
          memory: "You said hello to {role:familiar} at the checkout.",
        },
        {
          key: "bring-up-being-kids",
          label: "Bring up being kids",
          description: "Say you remember the two of you being best friends.",
          nudges: [nudge("personal-ties", 0.4), nudge("risk-appetite", 0.2)],
          aftermath: "goodwill",
          memory:
            "You told {role:familiar} you remembered the two of you being best friends as kids.",
        },
        {
          key: "eyes-forward",
          label: "Keep your eyes forward",
          description: "Say nothing and look at what's in front of you.",
          nudges: [nudge("privacy-preference", 0.35)],
          aftermath: null,
          memory:
            "You kept your eyes on the checkout and said nothing to {role:familiar}.",
        },
      ],
    },
  ],
  exits: [],
};

/* -------------------------------------------------------------------------- */
/* Track B — work, and work against everything else                            */
/* -------------------------------------------------------------------------- */

/**
 * Being asked for a shift, from above and from beside.
 *
 * The first stage needs a job and an enrollment at once, which is the ordinary
 * arrangement 92C's Track B says the game was skipping. The second needs only
 * the job. The third is the first one's answer coming back: it is offered only
 * where the record shows the favour was actually done and months have actually
 * passed, and it still says nothing about whether it will be returned.
 */
const SHIFT_ASKED_FOR: EpisodeFamily = {
  key: "work.the-shift-you-were-asked-for",
  family: "work",
  authority: RESEARCH_AUTHORITY,
  roles: ["colleague"],
  stages: [
    {
      key: "called-in",
      requires: [hasWork, inTraining, ...aged(17, 26)],
      lines: [
        "Your supervisor has asked you to pick up a shift you weren't scheduled for.",
        "It's the evening you'd put aside for the coursework you have due.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["security-stability", "achievement-ambition"],
          [1, 1],
          "The shift and the coursework want the same evening.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "take-the-shift",
          label: "Take the shift",
          description: "Say yes to the extra shift.",
          nudges: [
            nudge("security-stability", 0.35),
            nudge("achievement-ambition", -0.25),
          ],
          aftermath: "goodwill",
          memory: "You took the shift your supervisor asked you to pick up.",
        },
        {
          key: "turn-it-down",
          label: "Turn it down",
          description: "Tell your supervisor you can't take it.",
          nudges: [
            nudge("achievement-ambition", 0.35),
            nudge("security-stability", -0.25),
          ],
          aftermath: "grievance",
          memory: "You turned down the extra shift.",
        },
        {
          key: "offer-another",
          label: "Offer to work another one",
          description:
            "Say that evening is taken and offer to work another one.",
          nudges: [
            nudge("decision-style", 0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory: "You asked your supervisor for a different shift instead.",
        },
      ],
    },
    {
      key: "asked-by-a-colleague",
      requires: [
        hasWork,
        { kind: "role", role: "colleague" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "{role:colleague} has asked you to take their shift.",
        "They say it's for a funeral.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "A reason you cannot check, attached to a favour you can.",
        ),
      ],
      mayLeadTo: ["it-came-back-round"],
      options: [
        {
          key: "cover-it",
          label: "Cover it",
          description: "Tell {role:colleague} you'll cover it.",
          nudges: [
            nudge("personal-ties", 0.35),
            nudge("care-obligation", 0.25),
          ],
          aftermath: "goodwill",
          memory:
            "You agreed to take the shift {role:colleague} asked you to cover.",
        },
        {
          key: "turn-them-down",
          label: "Won't take the shift",
          description: "Tell {role:colleague} you won't take the shift.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("personal-ties", -0.3),
          ],
          aftermath: "grievance",
          memory:
            "You turned {role:colleague} down when they asked you to take their shift.",
        },
        {
          key: "ask-whose-funeral",
          label: "Ask whose funeral",
          description: "Ask {role:colleague} who the funeral is for.",
          nudges: [
            nudge("decision-style", 0.3),
            nudge("institutional-trust", -0.2),
          ],
          aftermath: null,
          memory:
            "You asked {role:colleague} whose funeral it was before giving an answer.",
        },
      ],
    },
    {
      key: "it-came-back-round",
      requires: [
        {
          kind: "after-choice",
          stage: "asked-by-a-colleague",
          option: "cover-it",
        },
        {
          kind: "days-since-stage",
          stage: "asked-by-a-colleague",
          days: 120,
        },
        hasWork,
        { kind: "role", role: "colleague" },
      ],
      lines: [
        "You need a shift covered, and {role:colleague} is on the rota that day.",
        "Some months ago you took their shift when they asked.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "decision-style"],
          [1, 1],
          "Spending the favour, and whether to say out loud that it is one.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "ask-and-bring-it-up",
          label: "Ask and bring it up",
          description:
            "You ask {role:colleague} to cover the shift and mention the one you took for them.",
          nudges: [nudge("decision-style", 0.35), nudge("personal-ties", -0.2)],
          aftermath: "obligation",
          memory:
            "You asked {role:colleague} to cover the shift and brought up the one you took for them.",
        },
        {
          key: "ask-without-bringing-it-up",
          label: "Ask without bringing it up",
          description:
            "You ask {role:colleague} to cover the shift and leave the earlier one out of it.",
          nudges: [
            nudge("personal-ties", 0.3),
            nudge("privacy-preference", 0.2),
          ],
          aftermath: null,
          memory:
            "You asked {role:colleague} to cover the shift and didn't mention the one you took for them.",
        },
        {
          key: "do-not-ask",
          label: "Don't ask {role:colleague}",
          description: "You don't ask them to cover the shift.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("security-stability", -0.2),
          ],
          aftermath: null,
          memory: "You didn't ask {role:colleague} to cover the shift.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-the-job",
      when: [{ kind: "without-capability", capability: "paid-work" }],
      reason: "The work relationship these are about has ended.",
    },
  ],
};

/**
 * Money that passes through a job without being counted.
 *
 * The second stage is the first one's answer still in circulation, and it is
 * offered only where the record shows the thing was actually said out loud. It
 * asserts no outcome — nobody was cleared or punished, because nothing in the
 * world says so — and both of its options leave nothing behind, so the thread
 * is allowed to end without owing anybody a payoff.
 */
const MONEY_NOBODY_COUNTS: EpisodeFamily = {
  key: "work.the-money-nobody-counts",
  family: "work",
  authority: RESEARCH_AUTHORITY,
  roles: ["colleague"],
  stages: [
    {
      key: "pooled-tips",
      requires: [
        hasWork,
        { kind: "role", role: "colleague" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "You saw {role:colleague} take cash out of the tip pool before it was counted.",
        "Nobody else was looking.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["civic-order", "personal-ties"],
          [1, 1],
          "It comes out of everybody's split, and they have been there longer than you.",
        ),
      ],
      mayLeadTo: ["what-you-said-stuck"],
      options: [
        {
          key: "ask-them-about-it",
          label: "Ask {role:colleague} about the cash",
          description:
            "Ask {role:colleague} about the cash you saw come out of the pool.",
          nudges: [nudge("decision-style", 0.3), nudge("personal-ties", 0.2)],
          aftermath: null,
          memory:
            "You asked {role:colleague} about the cash you saw them take out of the tip pool before it was counted.",
        },
        {
          key: "say-it-to-the-others",
          label: "Tell the others",
          description: "Tell the people you split tips with what you saw.",
          nudges: [nudge("civic-order", 0.4), nudge("personal-ties", -0.3)],
          aftermath: "standing",
          memory:
            "You told the people you split tips with that you saw {role:colleague} take cash out of the pool before it was counted.",
        },
        {
          key: "keep-it-to-yourself",
          label: "Keep what you saw",
          description: "Keep what you saw to yourself.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory:
            "You saw {role:colleague} take cash out of the tip pool before it was counted and said nothing.",
        },
      ],
    },
    {
      key: "what-you-said-stuck",
      requires: [
        {
          kind: "after-choice",
          stage: "pooled-tips",
          option: "say-it-to-the-others",
        },
        { kind: "days-since-stage", stage: "pooled-tips", days: 120 },
        hasWork,
      ],
      lines: [
        "Somebody who wasn't there when you said it asks you directly whether cash was coming out of the tip pool before the count.",
        "People at work still bring it up, and you remember what you said and why.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["decision-style", "privacy-preference"],
          [1, 1],
          "Going over it again either settles it or starts it up.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "say-it-again",
          label: "Say it again",
          description: "Tell them what you saw at the tip pool.",
          nudges: [nudge("decision-style", 0.3), nudge("civic-order", 0.25)],
          aftermath: null,
          memory: "You told them again what you'd seen at the tip pool.",
        },
        {
          key: "leave-it-alone",
          label: "Leave it alone",
          description: "Say you'd rather not go over it.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory: "You didn't go over what you'd said about the tip pool.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-the-job",
      when: [{ kind: "without-capability", capability: "paid-work" }],
      reason: "The work relationship these are about has ended.",
    },
  ],
};

/**
 * Getting there, and carrying somebody once you have.
 *
 * Both stages need an enrollment and nothing about what kind. The first also
 * needs a job, and is the plainest thing in the wave: a timetable that does
 * not fit a rota. Nothing dramatic happens in it, which is the point — 92C's
 * pacing contract asks for ordinary weeks that are still decisions.
 */
const THE_LONG_WAY_IN: EpisodeFamily = {
  key: "school.the-long-way-in",
  family: "school",
  authority: RESEARCH_AUTHORITY,
  roles: ["familiar"],
  stages: [
    {
      key: "the-commute",
      requires: [inTraining, hasWork, ...aged(17, 26)],
      lines: [
        "The bus that gets you to class on time leaves before your shift ends.",
        "It's a long ride each way, and the timetable and your shift don't fit together.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["achievement-ambition", "security-stability"],
          [1, 1],
          "One of the two has to give, every week, and the timetable will not move.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "leave-early",
          label: "Leave the shift early",
          description: "Go before the shift ends so you make the bus.",
          nudges: [
            nudge("achievement-ambition", 0.35),
            nudge("security-stability", -0.3),
          ],
          aftermath: "grievance",
          memory: "You left your shift early to catch the bus to class.",
        },
        {
          key: "work-the-full-shift",
          label: "Work the full shift",
          description: "Stay to the end and miss that bus.",
          nudges: [
            nudge("security-stability", 0.35),
            nudge("achievement-ambition", -0.3),
          ],
          aftermath: null,
          memory:
            "You worked the whole shift and missed the bus that would have got you to class on time.",
        },
        {
          key: "ask-for-another-shift",
          label: "Ask for a different shift",
          description: "Ask for a shift that ends before the bus leaves.",
          nudges: [nudge("decision-style", 0.3)],
          aftermath: null,
          memory: "You asked for a shift that ended before the bus left.",
        },
      ],
    },
    {
      key: "carrying-the-group",
      requires: [
        inTraining,
        { kind: "role", role: "familiar" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "The shared work you're on with {role:familiar} is due, and it counts as one piece.",
        "{role:familiar} hasn't done their part.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["achievement-ambition", "personal-ties"],
          [1, 1],
          "Your mark and their part are the same piece of paper.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "do-their-part",
          label: "Do their part",
          description: "Finish {role:familiar}'s part yourself.",
          nudges: [
            nudge("achievement-ambition", 0.3),
            nudge("care-obligation", 0.25),
          ],
          aftermath: "goodwill",
          memory: "You did {role:familiar}'s part of the shared work yourself.",
        },
        {
          key: "hand-it-in-as-is",
          label: "Hand it in as is",
          description: "Turn it in with their part not done.",
          nudges: [nudge("civic-order", 0.25), nudge("personal-ties", -0.3)],
          aftermath: "grievance",
          memory:
            "You handed in the shared work with {role:familiar}'s part not done.",
        },
        {
          key: "tell-them",
          label: "Tell {role:familiar}",
          description: "Say their part isn't done and it's due.",
          nudges: [nudge("decision-style", 0.35)],
          aftermath: null,
          memory:
            "You told {role:familiar} their part wasn't done and the work was due.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-the-programme",
      when: [{ kind: "without-capability", capability: "in-school" }],
      reason: "The enrollment these are about has ended.",
    },
  ],
};

/**
 * Work asked for as family.
 *
 * The one place in this wave where a choice writes something beyond the record
 * of the choice: saying yes takes on a commitment, with hours, which is a real
 * claim on every week afterwards and is why the second stage can exist at all.
 * The second stage is offered only where that yes is on the record and two
 * months have actually gone by, and it settles nothing either way.
 */
const WORK_NOT_PAID: EpisodeFamily = {
  key: "kin.the-work-that-is-not-paid",
  family: "kin",
  authority: RESEARCH_AUTHORITY,
  roles: ["relative"],
  stages: [
    {
      key: "the-family-shop",
      requires: [
        { kind: "fact", fact: "kin.present" },
        { kind: "role", role: "relative" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "{role:relative} has asked you to work weekends at the business where the family works.",
        "There's no pay in it.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["care-obligation", "achievement-ambition"],
          [1, 1],
          "It is family asking, and it is every weekend.",
        ),
      ],
      mayLeadTo: ["the-third-weekend"],
      options: [
        {
          key: "say-yes",
          label: "Work the weekends",
          description: "Tell {role:relative} you'll work the weekends.",
          nudges: [
            nudge("care-obligation", 0.4),
            nudge("achievement-ambition", -0.2),
          ],
          aftermath: "obligation",
          writes: {
            kind: "take-on-commitment",
            label: "Weekends at the family business",
            commitmentKind: "personal:family-labour",
            weeklyHours: [8, 16],
          },
          memory:
            "You told {role:relative} you would work weekends at the business, unpaid.",
        },
        {
          key: "say-no",
          label: "Say no",
          description: "Tell {role:relative} you won't.",
          nudges: [
            nudge("care-obligation", -0.3),
            nudge("achievement-ambition", 0.3),
          ],
          aftermath: "grievance",
          memory:
            "You told {role:relative} you wouldn't work weekends at the business.",
        },
        {
          key: "offer-some-weekends",
          label: "Offer some weekends",
          description: "Tell {role:relative} you can do some, not all.",
          nudges: [nudge("decision-style", 0.3), nudge("care-obligation", 0.2)],
          aftermath: "obligation",
          writes: {
            kind: "take-on-commitment",
            label: "Some weekends at the family business",
            commitmentKind: "personal:family-labour",
            weeklyHours: [3, 8],
          },
          memory:
            "You told {role:relative} you would work some weekends at the business, not every one.",
        },
      ],
    },
    {
      key: "the-third-weekend",
      requires: [
        { kind: "after-choice", stage: "the-family-shop", option: "say-yes" },
        { kind: "days-since-stage", stage: "the-family-shop", days: 60 },
        { kind: "role", role: "relative" },
      ],
      lines: [
        "Two months in, you're still working weekends at the business {role:relative} runs, unpaid, the way you agreed to.",
        "Nothing has been said about it ending.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["decision-style", "care-obligation"],
          [1, 1],
          "Asking how long it goes on is itself a thing you would be saying.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "bring-it-up",
          label: "Ask {role:relative} how long",
          description:
            "Ask {role:relative} how long the weekends are meant to go on.",
          nudges: [nudge("decision-style", 0.35)],
          aftermath: null,
          memory:
            "You asked {role:relative} how long the unpaid weekends were meant to go on.",
        },
        {
          key: "say-nothing-about-it",
          label: "Don't raise it",
          description: "Don't raise it with {role:relative}.",
          nudges: [
            nudge("care-obligation", 0.3),
            nudge("privacy-preference", 0.2),
          ],
          aftermath: null,
          memory:
            "You didn't say anything to {role:relative} about when the weekends would end.",
        },
      ],
    },
  ],
  exits: [],
};

/**
 * Neighbours, in an emergency the incident engine actually produced.
 *
 * Gated on an active incident rather than on a date, a place name or an
 * authored disaster, which is the whole of 92C's historical-encounter contract
 * applied at the smallest scale it has: the water is up because the world says
 * it is up. No institution is in the frame, nobody is in charge, and the scene
 * ends at whether you join the line.
 */
const WATER_CAME_UP: EpisodeFamily = {
  key: "civic.the-water-came-up",
  family: "civic",
  authority: RESEARCH_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "sandbag-line",
      requires: [
        { kind: "fact", fact: "incident.active" },
        { kind: "age-at-least", age: 17 },
      ],
      lines: [
        "The water is rising.",
        "People from around here are filling sandbags and passing them down a line, and there aren't enough of them on it.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["civic-order", "security-stability"],
          [1, 1],
          "The line is short, and nobody has asked you.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "join-the-line",
          label: "Join the line",
          description: "Take a place in the line and start passing bags.",
          nudges: [nudge("civic-order", 0.35), nudge("care-obligation", 0.3)],
          aftermath: "standing",
          writes: {
            kind: "take-on-commitment",
            label: "The sandbag line",
            commitmentKind: "community:flood-response",
            weeklyHours: [2, 10],
          },
          memory: "You joined the sandbag line.",
        },
        {
          key: "ask-if-they-need-hands",
          label: "Ask if they need hands",
          description: "Ask the people on the line whether they want one more.",
          nudges: [nudge("decision-style", 0.25), nudge("civic-order", 0.2)],
          aftermath: null,
          memory:
            "You asked the people on the sandbag line if they needed another pair of hands.",
        },
        {
          key: "stay-out-of-it",
          label: "Stay out of it",
          description: "Don't join the line.",
          nudges: [
            nudge("security-stability", 0.3),
            nudge("privacy-preference", 0.2),
          ],
          aftermath: null,
          memory: "You stayed out of the sandbag line.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "the-water-went-down",
      when: [{ kind: "absent", fact: "incident.active" }],
      reason: "The incident this was about is no longer active.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* The wave                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Independent 92C moments that extend an accepted family with the same domain.
 *
 * An EpisodeFamily is a causal thread, not a folder for similar cards. The
 * school, household and incident kernels below do not invent answer-dependent
 * consequences merely to make a new family branch. They instead join the
 * accepted school, formative-household and neighbourhood families, whose
 * stable ids, record shapes and real branches already exist. The player-facing
 * prose and kernel ids remain 92C-owned and are enumerated by
 * `lifeContent92cStages` for review and coverage.
 */
export const LIFE_CONTENT_92C_SCHOOL_STAGES: readonly EpisodeStage[] = [
  ...FIRST_ROOM.stages,
  ...RULES_AS_WRITTEN.stages,
  ...THE_LONG_WAY_IN.stages,
].map((stage) => ({ ...stage, authority: RESEARCH_AUTHORITY }));

export const LIFE_CONTENT_92C_HOME_STAGES: readonly EpisodeStage[] = [
  ...HOUSE_RULES.stages,
].map((stage) => ({ ...stage, authority: RESEARCH_AUTHORITY }));

export const LIFE_CONTENT_92C_CIVIC_STAGES: readonly EpisodeStage[] = [
  ...WATER_CAME_UP.stages,
].map((stage) => ({ ...stage, authority: RESEARCH_AUTHORITY }));

/** New causal families whose reviewed 92C stages genuinely turn on answers. */
export const LIFE_CONTENT_92C_FAMILIES: readonly EpisodeFamily[] = [
  FRIEND_YOU_NAMED,
  SHIFT_ASKED_FOR,
  MONEY_NOBODY_COUNTS,
  WORK_NOT_PAID,
];

const LIFE_CONTENT_92C_HOSTED_STAGES: readonly {
  readonly episodeKey: string;
  readonly stages: readonly EpisodeStage[];
}[] = [
  {
    episodeKey: "school.the-thing-you-got-blamed-for",
    stages: LIFE_CONTENT_92C_SCHOOL_STAGES,
  },
  {
    episodeKey: "home.someone-is-not-all-right",
    stages: LIFE_CONTENT_92C_HOME_STAGES,
  },
  {
    episodeKey: "civic.the-thing-nobody-else-turned-up-for",
    stages: LIFE_CONTENT_92C_CIVIC_STAGES,
  },
];

/** Every stage in the wave, for the tests and the coverage report. */
export function lifeContent92cStages(): readonly {
  readonly episodeKey: string;
  readonly stage: EpisodeStage;
}[] {
  return [
    ...LIFE_CONTENT_92C_FAMILIES.flatMap((family) =>
      family.stages.map((stage) => ({ episodeKey: family.key, stage })),
    ),
    ...LIFE_CONTENT_92C_HOSTED_STAGES.flatMap(({ episodeKey, stages }) =>
      stages.map((stage) => ({ episodeKey, stage })),
    ),
  ];
}

/** Every option in the wave, flattened, for the tests. */
export function lifeContent92cOptions(): readonly {
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly option: EpisodeOption;
}[] {
  return lifeContent92cStages().flatMap(({ episodeKey, stage }) =>
    stage.options.map((option) => ({
      episodeKey,
      stageKey: stage.key,
      option,
    })),
  );
}
