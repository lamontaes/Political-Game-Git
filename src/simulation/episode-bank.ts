import type {
  EpisodeAuthority,
  EpisodeFamily,
  EpisodeOption,
  EpisodeRequirement,
  EpisodeStage,
} from "./life-episodes";
import type { DimensionNudge, InterestTension } from "./player-model";

/**
 * The authored episode families.
 *
 * Declarative on purpose. Every family here is data — stages, requirements,
 * roles, copy, options — read by `life-episodes.ts` and by nothing else, so a
 * reviewer can read what the game is able to say without reading the code that
 * says it. That is the same separation the content-bank work asks for, and
 * this file is deliberately shaped to be adopted by a registry later rather
 * than to be one: it declares no schema of its own, exports no browser, and
 * has no export format. Wiring these into the generic bank is a mechanical
 * change in one direction.
 *
 * How the copy is written, and why:
 *
 * *A named person, or nobody.* Where a family needs somebody, it declares the
 * role and writes `{role:...}`. Composition binds a real person or the beat is
 * not offered. There is no "a family member" in this file.
 *
 * *Options are actions, not arguments.* A label says what the character does.
 * The description adds at most one clause of context. Neither states what will
 * follow, because none of them knows: consequence is decided later and from
 * the world.
 *
 * *No option solves the problem for free.* A third way is allowed and several
 * exist here, but each costs something legible in the same moment — time,
 * money, somebody's patience, a delay while the thing continues.
 *
 * *No chain has a destination.* A later stage lists what would have to be true
 * for it to be offered. Nothing here can force a family towards an outcome,
 * and every family has stages that simply end it quietly.
 */

const PLAYTEST_AUTHORITY: EpisodeAuthority = {
  sourceDocument:
    "58_PR81_HUMAN_PLAYTEST_PRODUCT_FEEDBACK_AND_NARRATIVE_REPAIR_AUTHORITY",
  reference: "Sections D, E and F — continuous life narrative",
};

const EPISODE_AUTHORITY: EpisodeAuthority = {
  sourceDocument:
    "60_CLAUDE_PR81_NARRATIVE_GRAPHICS_CONTENT_AND_LIFE_FLOW_REPAIR_MEGA_PATCH",
  reference: "Section O — modular causal episode composition",
};

/* -------------------------------------------------------------------------- */
/* Small authoring helpers                                                     */
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

const needsFamiliar: EpisodeRequirement = { kind: "role", role: "familiar" };
const needsHouseholdCompanion: EpisodeRequirement = {
  kind: "role",
  role: "household-companion",
};
const needsRelative: EpisodeRequirement = { kind: "role", role: "relative" };
const needsColleague: EpisodeRequirement = { kind: "role", role: "colleague" };
const needsCommunityMember: EpisodeRequirement = {
  kind: "role",
  role: "community-member",
};

/* -------------------------------------------------------------------------- */
/* Formative — somebody at home is not all right                               */
/* -------------------------------------------------------------------------- */

/**
 * The generalized version of the chain the packet uses as its example.
 *
 * What is deliberately absent is the ending. There is no stage that kills
 * anybody, no stage that guarantees recovery, and no stage that must follow
 * another. What the stages do is describe positions a household can be in, and
 * which of them is reachable is decided by what is actually on the record —
 * who is still in the house, what was said, whether anybody outside the family
 * ever found out, whether there was money. A run of this family that stops
 * after one beat is a correct run.
 */
const SOMEONE_AT_HOME: EpisodeFamily = {
  key: "home.someone-is-not-all-right",
  family: "household",
  authority: EPISODE_AUTHORITY,
  roles: ["household-companion"],
  stages: [
    {
      key: "noticing",
      requires: [
        needsHouseholdCompanion,
        { kind: "age-below", age: 18 },
        { kind: "fact", fact: "household.shared" },
      ],
      lines: [
        "{role:household-companion} has been getting in late, and the story about where changes each time.",
        "Nobody at home has said anything about it out loud yet, which is its own kind of decision.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "Saying something is looking after them; it is also going through their business.",
        ),
      ],
      mayLeadTo: ["asked-directly", "kept-quiet-and-it-continued"],
      options: [
        {
          key: "ask",
          label: "Ask them where they've been",
          description: "Straight out, while it is just the two of you.",
          nudges: [nudge("personal-ties", 0.4), nudge("privacy-preference", -0.3)],
          aftermath: null,
          memory:
            "You asked {role:household-companion} where they had been, and got an answer that did not fit.",
        },
        {
          key: "tell-someone",
          label: "Tell someone older",
          description: "It stops being only yours to carry.",
          nudges: [
            nudge("care-obligation", 0.35),
            nudge("privacy-preference", -0.45),
            nudge("institutional-trust", 0.2),
          ],
          aftermath: "grievance",
          memory:
            "You told somebody about {role:household-companion} coming in late, and they found out you had.",
        },
        {
          key: "watch",
          label: "Say nothing and keep track",
          description: "Wait until you actually know something.",
          nudges: [nudge("privacy-preference", 0.4), nudge("decision-style", -0.2)],
          aftermath: null,
          memory:
            "You said nothing about {role:household-companion}, and kept count of the nights.",
        },
        {
          key: "cover",
          label: "Cover for them",
          description: "Answer for where they were, if anyone asks.",
          nudges: [
            nudge("personal-ties", 0.5),
            nudge("civic-order", -0.35),
            nudge("risk-appetite", 0.25),
          ],
          aftermath: "goodwill",
          memory:
            "You covered for {role:household-companion} once, and they knew you had.",
        },
      ],
    },
    {
      key: "asked-directly",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-choice", stage: "noticing", option: "ask" },
        { kind: "days-since-stage", stage: "noticing", days: 60 },
      ],
      lines: [
        "{role:household-companion} has not brought up the conversation again, and neither have you.",
        "Tonight they ask you for money, and do not say what for.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["personal-ties", "security-stability"],
          [1, 1],
          "Refusing is the safer thing and the colder one.",
        ),
      ],
      mayLeadTo: ["it-got-worse", "it-steadied"],
      options: [
        {
          key: "give",
          label: "Give it to them",
          description: "Without asking again.",
          nudges: [nudge("personal-ties", 0.45), nudge("risk-appetite", 0.3)],
          aftermath: "goodwill",
          memory:
            "You gave {role:household-companion} the money and did not ask what for.",
        },
        {
          key: "conditions",
          label: "Give it, on a condition",
          description: "They tell you what it is for first.",
          nudges: [
            nudge("decision-style", 0.35),
            nudge("care-obligation", 0.3),
            nudge("privacy-preference", -0.2),
          ],
          aftermath: "obligation",
          memory:
            "You made {role:household-companion} say what the money was for before you handed it over.",
        },
        {
          key: "refuse",
          label: "Refuse",
          description: "And say why.",
          nudges: [
            nudge("security-stability", 0.4),
            nudge("personal-ties", -0.35),
            nudge("decision-style", 0.2),
          ],
          aftermath: "grievance",
          memory:
            "You told {role:household-companion} no, and said out loud why.",
        },
      ],
    },
    {
      key: "kept-quiet-and-it-continued",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-choice", stage: "noticing", option: "watch" },
        { kind: "days-since-stage", stage: "noticing", days: 120 },
      ],
      lines: [
        "It has been months, and the nights have not stopped.",
        "{role:household-companion} looks through you at breakfast now, which is new.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["care-obligation", "privacy-preference"],
          [1, 1],
          "You know more than you were meant to, and doing nothing with it is a choice you are still making.",
        ),
      ],
      mayLeadTo: ["it-got-worse", "it-steadied"],
      options: [
        {
          key: "say-it-now",
          label: "Say what you've seen",
          description: "All of it, at once.",
          nudges: [
            nudge("personal-ties", 0.4),
            nudge("privacy-preference", -0.4),
            nudge("decision-style", 0.25),
          ],
          aftermath: "grievance",
          memory:
            "You finally said out loud what you had been counting about {role:household-companion}.",
        },
        {
          key: "keep-watching",
          label: "Keep it to yourself",
          description: "Nothing has actually happened yet.",
          nudges: [nudge("privacy-preference", 0.45), nudge("risk-appetite", 0.2)],
          aftermath: null,
          memory:
            "You kept what you had seen about {role:household-companion} to yourself, again.",
        },
      ],
    },
    {
      key: "it-got-worse",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-stage", stage: "noticing" },
        { kind: "days-since-stage", stage: "noticing", days: 400 },
        { kind: "without-choice", stage: "noticing", option: "tell-someone" },
      ],
      lines: [
        "There is a phone call at an hour when phone calls are never good, and it is about {role:household-companion}.",
        "By the time anybody explains it to you properly, the part where you could have said something has been over for a year.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["care-obligation", "personal-ties"],
          [1, 1],
          "Being the one who steps in and being the one they still speak to are not the same job.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "go",
          label: "Go, and stay",
          description: "Whatever else was happening this week.",
          nudges: [nudge("care-obligation", 0.55), nudge("personal-ties", 0.4)],
          aftermath: "goodwill",
          memory:
            "You went when the call came about {role:household-companion}, and you stayed.",
        },
        {
          key: "handle-it",
          label: "Handle the practical end",
          description: "Somebody has to make the calls.",
          nudges: [
            nudge("decision-style", 0.4),
            nudge("institutional-trust", 0.3),
            nudge("personal-ties", 0.1),
          ],
          aftermath: "standing",
          memory:
            "You took the practical end of what happened to {role:household-companion}, because nobody else was going to.",
        },
        {
          key: "stay-back",
          label: "Keep out of it",
          description: "You have been kept out of it for a year already.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("personal-ties", -0.45),
          ],
          aftermath: "grievance",
          memory:
            "You kept out of what happened to {role:household-companion}, and everybody noticed which way you went.",
        },
      ],
    },
    {
      key: "it-steadied",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-stage", stage: "noticing" },
        { kind: "days-since-stage", stage: "noticing", days: 400 },
        { kind: "after-choice", stage: "noticing", option: "tell-someone" },
      ],
      lines: [
        "{role:household-companion} is up before you most mornings now, and has been for a while.",
        "Neither of you has ever gone back over the year it took, and there is a version of this evening where one of you does.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "privacy-preference"],
          [1, 1],
          "Naming it might close it, or reopen it.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "name-it",
          label: "Bring it up",
          description: "Say that you were the one who told.",
          nudges: [nudge("personal-ties", 0.35), nudge("decision-style", 0.3)],
          aftermath: "grievance",
          memory:
            "You told {role:household-companion} it had been you, in the end.",
        },
        {
          key: "let-it-lie",
          label: "Let it lie",
          description: "It is going well. That can be enough.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("security-stability", 0.25),
          ],
          aftermath: null,
          memory:
            "You never told {role:household-companion} it had been you, and the mornings went on being fine.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "no-longer-in-the-house",
      when: [{ kind: "absent", fact: "household.shared" }],
      reason:
        "Nobody else is on the household record any more, so there is no household this could still be about.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Formative — a friendship over years                                         */
/* -------------------------------------------------------------------------- */

const FRIEND_OVER_YEARS: EpisodeFamily = {
  key: "growing-up.a-friend-over-years",
  family: "companionship",
  authority: PLAYTEST_AUTHORITY,
  roles: ["familiar"],
  stages: [
    {
      key: "the-year-you-were-inseparable",
      requires: [needsFamiliar, { kind: "age-below", age: 18 }],
      lines: [
        "You and {role:familiar} have spent most of this year in each other's houses.",
        "This afternoon they want you to come somewhere you have already said you would not go.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "risk-appetite"],
          [1, -1],
          "Going keeps them; not going keeps your word to somebody else.",
        ),
      ],
      mayLeadTo: ["the-year-it-cooled", "still-there-later"],
      options: [
        {
          key: "go",
          label: "Go with them",
          description: "Sort the rest out afterwards.",
          nudges: [nudge("personal-ties", 0.45), nudge("risk-appetite", 0.35)],
          aftermath: "goodwill",
          memory: "You went with {role:familiar} instead, and it was worth it.",
        },
        {
          key: "stay",
          label: "Stay where you said you'd be",
          description: "They will be annoyed.",
          nudges: [
            nudge("decision-style", 0.3),
            nudge("civic-order", 0.25),
            nudge("personal-ties", -0.3),
          ],
          aftermath: "grievance",
          memory:
            "You did not go with {role:familiar}, and they did not let it drop for a while.",
        },
        {
          key: "bring-them",
          label: "Ask them to come with you instead",
          description: "It is duller and they will say so.",
          nudges: [
            nudge("personal-ties", 0.3),
            nudge("decision-style", 0.35),
            nudge("achievement-ambition", 0.15),
          ],
          aftermath: null,
          memory:
            "You talked {role:familiar} into coming with you, and they were bored the whole way through.",
        },
      ],
    },
    {
      key: "the-year-it-cooled",
      requires: [
        needsFamiliar,
        { kind: "after-stage", stage: "the-year-you-were-inseparable" },
        {
          kind: "days-since-stage",
          stage: "the-year-you-were-inseparable",
          days: 500,
        },
      ],
      lines: [
        "You and {role:familiar} are down to running into each other.",
        "Neither of you did anything. There is a version of this where you call them, and a version where the year goes past.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "achievement-ambition"],
          [1, 1],
          "Keeping this one going takes time you have been spending elsewhere.",
        ),
      ],
      mayLeadTo: ["still-there-later"],
      options: [
        {
          key: "call",
          label: "Call them",
          description: "No occasion.",
          nudges: [nudge("personal-ties", 0.45)],
          aftermath: null,
          memory:
            "You called {role:familiar} for no reason, and it was easy, which surprised you both.",
        },
        {
          key: "let-it-go",
          label: "Let it go",
          description: "People drift. This is what that looks like.",
          nudges: [
            nudge("personal-ties", -0.3),
            nudge("achievement-ambition", 0.25),
          ],
          aftermath: null,
          memory: "You and {role:familiar} stopped ringing each other.",
        },
      ],
    },
    {
      key: "still-there-later",
      requires: [
        needsFamiliar,
        { kind: "age-at-least", age: 21 },
        { kind: "after-stage", stage: "the-year-you-were-inseparable" },
        {
          kind: "days-since-stage",
          stage: "the-year-you-were-inseparable",
          days: 1200,
        },
      ],
      lines: [
        "{role:familiar} is in touch, years on, and it is not small talk.",
        "They want something specific, and they have clearly been working up to asking.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["personal-ties", "security-stability"],
          [1, 1],
          "What they want is real, and so is what it would cost you.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "yes",
          label: "Say yes",
          description: "Before hearing the whole of it.",
          nudges: [nudge("personal-ties", 0.5), nudge("risk-appetite", 0.3)],
          aftermath: "obligation",
          memory:
            "You said yes to {role:familiar} before you had heard the whole of what they wanted.",
        },
        {
          key: "hear-it-out",
          label: "Hear the whole of it first",
          description: "Then decide.",
          nudges: [
            nudge("decision-style", 0.35),
            nudge("security-stability", 0.25),
          ],
          aftermath: null,
          memory:
            "You made {role:familiar} say the whole of it before you would answer.",
        },
        {
          key: "no",
          label: "Say no",
          description: "It has been years, and this is a lot.",
          nudges: [
            nudge("security-stability", 0.4),
            nudge("personal-ties", -0.4),
          ],
          aftermath: "grievance",
          memory:
            "You turned {role:familiar} down after all those years, and heard how it landed.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "nobody-left",
      when: [{ kind: "absent", fact: "person.recurring" }],
      reason:
        "There is no longer anybody on the record this could be about.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Formative — school                                                          */
/* -------------------------------------------------------------------------- */

const SCHOOL_TROUBLE: EpisodeFamily = {
  key: "school.the-thing-you-got-blamed-for",
  family: "school",
  authority: PLAYTEST_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "blamed",
      requires: [
        { kind: "fact", fact: "school.enrolled" },
        { kind: "age-below", age: 18 },
      ],
      lines: [
        "Something got broken in the corridor at your school and your name is the one that came up.",
        "You were there. You did not do it. The person who did is standing four feet away saying nothing.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["civic-order", "personal-ties"],
          [1, 1],
          "The truth costs somebody else; the silence costs you.",
        ),
      ],
      mayLeadTo: ["it-stuck", "it-came-out"],
      options: [
        {
          key: "name-them",
          label: "Say who did it",
          description: "Out loud, in front of them.",
          nudges: [
            nudge("civic-order", 0.45),
            nudge("personal-ties", -0.4),
            nudge("decision-style", 0.3),
          ],
          aftermath: "grievance",
          memory: "You said who had actually done it, in front of them.",
        },
        {
          key: "take-it",
          label: "Take it",
          description: "Whatever it costs this week.",
          nudges: [
            nudge("personal-ties", 0.4),
            nudge("security-stability", -0.35),
          ],
          aftermath: "goodwill",
          memory: "You took the blame for it and never said otherwise.",
        },
        {
          key: "deny",
          label: "Say only that it wasn't you",
          description: "Without saying who it was.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("decision-style", 0.2),
          ],
          aftermath: null,
          memory:
            "You said it had not been you, and stopped talking there.",
        },
      ],
    },
    {
      key: "it-stuck",
      requires: [
        { kind: "after-choice", stage: "blamed", option: "take-it" },
        { kind: "days-since-stage", stage: "blamed", days: 200 },
        { kind: "fact", fact: "school.enrolled" },
      ],
      lines: [
        "It is a year later and it is still on your record at school, in a sentence somebody else wrote about you.",
        "A teacher who was not there brings it up as though it settles something.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["institutional-trust", "personal-ties"],
          [-1, 1],
          "Correcting the record means naming the person you covered for.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "correct-it",
          label: "Correct the record",
          description: "A year late, and it names somebody.",
          nudges: [
            nudge("civic-order", 0.35),
            nudge("institutional-trust", 0.25),
            nudge("personal-ties", -0.4),
          ],
          aftermath: "grievance",
          memory:
            "A year on you told them what had actually happened in the corridor.",
        },
        {
          key: "let-it-stand",
          label: "Let it stand",
          description: "It is a sentence on a file.",
          nudges: [
            nudge("institutional-trust", -0.3),
            nudge("personal-ties", 0.3),
          ],
          aftermath: null,
          memory:
            "You let the school keep the version of the corridor that was not true.",
        },
      ],
    },
    {
      key: "it-came-out",
      requires: [
        { kind: "after-choice", stage: "blamed", option: "name-them" },
        { kind: "days-since-stage", stage: "blamed", days: 200 },
      ],
      lines: [
        "The person you named has not spoken to you since, and has told other people their own version.",
        "One of them asks you, straight out, what actually happened.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["decision-style", "personal-ties"],
          [1, 1],
          "Going over it again either settles it or restarts it.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "tell-it-again",
          label: "Tell it again",
          description: "The same way you told it the first time.",
          nudges: [nudge("decision-style", 0.3), nudge("civic-order", 0.3)],
          aftermath: "standing",
          memory:
            "You told the corridor story again, the same way, to somebody who had only heard the other one.",
        },
        {
          key: "drop-it",
          label: "Say it's over",
          description: "And leave it there.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("security-stability", 0.2),
          ],
          aftermath: null,
          memory:
            "You refused to go through the corridor business again with anybody.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "left-school",
      when: [{ kind: "absent", fact: "school.enrolled" }],
      reason: "The enrollment this was about has ended.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adult — the household load                                                  */
/* -------------------------------------------------------------------------- */

const HOUSEHOLD_LOAD: EpisodeFamily = {
  key: "home.the-week-that-does-not-balance",
  family: "household",
  authority: PLAYTEST_AUTHORITY,
  roles: ["household-companion"],
  stages: [
    {
      key: "the-first-time-it-is-said",
      requires: [
        needsHouseholdCompanion,
        { kind: "age-at-least", age: 18 },
        { kind: "fact", fact: "household.shared" },
      ],
      lines: [
        "{role:household-companion} says, not for the first time but for the first time out loud, that the week does not divide evenly.",
        "They are right, and they have picked a bad evening to be right on.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "achievement-ambition"],
          [1, 1],
          "Taking more of the week back means taking it off something else.",
        ),
      ],
      mayLeadTo: ["it-was-taken-seriously", "it-came-back-harder"],
      options: [
        {
          key: "take-it-on",
          label: "Take some of it back",
          description: "Name which parts, tonight.",
          nudges: [
            nudge("care-obligation", 0.4),
            nudge("personal-ties", 0.35),
            nudge("achievement-ambition", -0.25),
          ],
          aftermath: "obligation",
          memory:
            "You named which parts of the week you would take back off {role:household-companion}.",
        },
        {
          key: "explain",
          label: "Explain what your week looks like",
          description: "It is also true, and it is not an answer.",
          nudges: [
            nudge("achievement-ambition", 0.35),
            nudge("personal-ties", -0.2),
          ],
          aftermath: "grievance",
          memory:
            "You told {role:household-companion} what your own week looked like instead of answering.",
        },
        {
          key: "pay-for-it",
          label: "Offer to pay someone",
          description: "It costs money you would notice.",
          nudges: [
            nudge("econ-distribution", -0.3),
            nudge("security-stability", -0.25),
            nudge("decision-style", 0.3),
          ],
          aftermath: null,
          memory:
            "You offered to pay somebody to take the part of the week you and {role:household-companion} were arguing about.",
        },
        {
          key: "later",
          label: "Say you'll sort it at the weekend",
          description: "You mean it when you say it.",
          nudges: [
            nudge("decision-style", -0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: "obligation",
          memory:
            "You told {role:household-companion} you would sort the week out at the weekend.",
        },
      ],
    },
    {
      key: "it-was-taken-seriously",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-choice", stage: "the-first-time-it-is-said", option: "take-it-on" },
        {
          kind: "days-since-stage",
          stage: "the-first-time-it-is-said",
          days: 150,
        },
      ],
      lines: [
        "Five months on, the parts you took are still yours, and nobody has had to mention it again.",
        "Tonight {role:household-companion} asks whether you would rather swap two of them.",
      ],
      stakes: "ordinary",
      tensions: [],
      mayLeadTo: [],
      options: [
        {
          key: "swap",
          label: "Swap them",
          description: "It costs nothing to try.",
          nudges: [nudge("personal-ties", 0.3), nudge("risk-appetite", 0.15)],
          aftermath: null,
          memory:
            "You and {role:household-companion} swapped two parts of the week over, and it held.",
        },
        {
          key: "keep",
          label: "Keep it as it is",
          description: "It is working.",
          nudges: [
            nudge("security-stability", 0.3),
            nudge("decision-style", -0.15),
          ],
          aftermath: null,
          memory:
            "You left the week as it was, because it was working for once.",
        },
      ],
    },
    {
      key: "it-came-back-harder",
      requires: [
        needsHouseholdCompanion,
        { kind: "after-stage", stage: "the-first-time-it-is-said" },
        { kind: "without-choice", stage: "the-first-time-it-is-said", option: "take-it-on" },
        {
          kind: "days-since-stage",
          stage: "the-first-time-it-is-said",
          days: 200,
        },
      ],
      lines: [
        "{role:household-companion} raises it again, and this time they have the specifics: dates, which weeks, what they did instead.",
        "It is not an argument about the washing any more.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["personal-ties", "achievement-ambition"],
          [1, 1],
          "The version of your life that made this happen is the one you have been building on purpose.",
        ),
        tension(
          ["care-obligation", "security-stability"],
          [1, 1],
          "Fixing it properly means giving up something that is currently holding the money together.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "change-something",
          label: "Change something real",
          description: "Hours, or a standing commitment.",
          nudges: [
            nudge("care-obligation", 0.5),
            nudge("achievement-ambition", -0.4),
            nudge("personal-ties", 0.35),
          ],
          aftermath: "obligation",
          writes: {
            kind: "take-on-commitment",
            label: "The half of the week you agreed to hold",
            commitmentKind: "personal:household-share",
            weeklyHours: [4, 9],
          },
          memory:
            "You changed something real about your week after {role:household-companion} brought the dates.",
        },
        {
          key: "concede-nothing",
          label: "Say it isn't going to change",
          description: "Honestly, and without an excuse.",
          nudges: [
            nudge("achievement-ambition", 0.45),
            nudge("personal-ties", -0.45),
            nudge("decision-style", 0.3),
          ],
          aftermath: "grievance",
          memory:
            "You told {role:household-companion} plainly that it was not going to change.",
        },
        {
          key: "buy-time",
          label: "Ask for six months",
          description: "You say what happens at the end of them.",
          nudges: [
            nudge("decision-style", -0.25),
            nudge("achievement-ambition", 0.3),
            nudge("security-stability", 0.2),
          ],
          aftermath: "obligation",
          memory:
            "You asked {role:household-companion} for six months, and said what would happen at the end of them.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "household-dissolved",
      when: [{ kind: "absent", fact: "household.shared" }],
      reason: "There is no longer a shared household on the record.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adult — work                                                                */
/* -------------------------------------------------------------------------- */

const WORK_STANDING: EpisodeFamily = {
  key: "work.where-you-stand-there",
  family: "work",
  authority: PLAYTEST_AUTHORITY,
  roles: ["colleague"],
  stages: [
    {
      key: "the-rule-and-the-person",
      requires: [
        needsColleague,
        { kind: "fact", fact: "work.employed" },
        { kind: "age-at-least", age: 18 },
      ],
      lines: [
        "The rule is clear and applying it to the person in front of you would be obviously wrong.",
        "{role:colleague} is watching to see which way you go, and will remember.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["civic-order", "care-obligation"],
          [1, 1],
          "The rule exists for a reason and this is not the case it was written for.",
        ),
      ],
      mayLeadTo: ["it-was-noticed", "the-offer"],
      options: [
        {
          key: "apply-it",
          label: "Apply the rule",
          description: "And say that you did.",
          nudges: [
            nudge("civic-order", 0.45),
            nudge("institutional-trust", 0.3),
            nudge("care-obligation", -0.3),
          ],
          aftermath: "standing",
          memory:
            "You applied the rule with {role:colleague} watching, and said so afterwards.",
        },
        {
          key: "bend-it",
          label: "Let it go this once",
          description: "Nobody else needs to know.",
          nudges: [
            nudge("care-obligation", 0.45),
            nudge("civic-order", -0.4),
            nudge("risk-appetite", 0.25),
          ],
          aftermath: "goodwill",
          memory:
            "You let it go once, and {role:colleague} saw you do it.",
        },
        {
          key: "escalate",
          label: "Put it up the line",
          description: "It sits with somebody else, and it takes a fortnight.",
          nudges: [
            nudge("institutional-trust", 0.4),
            nudge("decision-style", 0.25),
            nudge("care-obligation", -0.15),
          ],
          aftermath: null,
          memory:
            "You put the decision up the line rather than making it, and it took a fortnight.",
        },
      ],
    },
    {
      key: "it-was-noticed",
      requires: [
        needsColleague,
        { kind: "after-stage", stage: "the-rule-and-the-person" },
        { kind: "fact", fact: "work.employed" },
        {
          kind: "days-since-stage",
          stage: "the-rule-and-the-person",
          days: 90,
        },
      ],
      lines: [
        "{role:colleague} brings up what you did that morning, in front of two people who were not there.",
        "The way they tell it is not quite the way it happened.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["decision-style", "personal-ties"],
          [1, 1],
          "Correcting them in the room costs you them.",
        ),
      ],
      mayLeadTo: ["the-offer"],
      options: [
        {
          key: "correct",
          label: "Correct it there",
          description: "In front of the same people.",
          nudges: [
            nudge("decision-style", 0.4),
            nudge("civic-order", 0.2),
            nudge("personal-ties", -0.3),
          ],
          aftermath: "grievance",
          memory:
            "You corrected {role:colleague}'s version of it in the room.",
        },
        {
          key: "after",
          label: "Say something afterwards",
          description: "Quietly, to them.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("personal-ties", 0.25),
          ],
          aftermath: null,
          memory:
            "You waited and said it to {role:colleague} afterwards, on your own.",
        },
        {
          key: "leave-it",
          label: "Leave it",
          description: "It is a story about a morning.",
          nudges: [
            nudge("security-stability", 0.25),
            nudge("achievement-ambition", -0.15),
          ],
          aftermath: null,
          memory:
            "You let {role:colleague}'s version of that morning stand.",
        },
      ],
    },
    {
      key: "the-offer",
      requires: [
        { kind: "fact", fact: "work.employed" },
        { kind: "after-stage", stage: "the-rule-and-the-person" },
        {
          kind: "days-since-stage",
          stage: "the-rule-and-the-person",
          days: 300,
        },
      ],
      lines: [
        "Somebody who heard about how you handled that morning wants you somewhere else.",
        "It pays better and it is further away, and they want an answer this week.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["achievement-ambition", "security-stability"],
          [1, 1],
          "Everything about the new one is better except that you know nothing about it.",
        ),
        tension(
          ["achievement-ambition", "personal-ties"],
          [1, 1],
          "The distance is the part somebody at home will feel.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "take-it",
          label: "Take it",
          description: "Hand your notice in this week.",
          nudges: [
            nudge("achievement-ambition", 0.5),
            nudge("risk-appetite", 0.4),
            nudge("security-stability", -0.3),
          ],
          aftermath: "standing",
          memory: "You took the job that came out of that morning.",
        },
        {
          key: "decline",
          label: "Turn it down",
          description: "And stay where people know you.",
          nudges: [
            nudge("security-stability", 0.45),
            nudge("personal-ties", 0.3),
            nudge("achievement-ambition", -0.35),
          ],
          aftermath: null,
          memory:
            "You turned down the job and stayed where people already knew how you worked.",
        },
        {
          key: "use-it",
          label: "Tell your own side you have it",
          description: "It may get you something. It may not go down well.",
          nudges: [
            nudge("achievement-ambition", 0.4),
            nudge("risk-appetite", 0.35),
            nudge("institutional-trust", -0.2),
          ],
          aftermath: "grievance",
          memory:
            "You told your own side about the offer, and watched what they did with it.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "job-ended",
      when: [{ kind: "absent", fact: "work.employed" }],
      reason: "The work relationship this was about has ended.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adult — money                                                               */
/* -------------------------------------------------------------------------- */

const MONEY_OWED: EpisodeFamily = {
  key: "money.the-thing-you-are-behind-on",
  family: "money",
  authority: PLAYTEST_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "the-first-letter",
      requires: [
        { kind: "fact", fact: "money.obligation" },
        { kind: "age-at-least", age: 18 },
      ],
      lines: [
        "The letter is polite and the number at the bottom is not one you can pay this month.",
        "There is a phone number on it, and a date fourteen days out.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["security-stability", "privacy-preference"],
          [1, 1],
          "Sorting it out means telling somebody the state of it.",
        ),
      ],
      mayLeadTo: ["arrangement-held", "it-got-further-behind"],
      options: [
        {
          key: "call",
          label: "Call the number",
          description: "And say what you can actually manage.",
          nudges: [
            nudge("institutional-trust", 0.35),
            nudge("decision-style", 0.35),
            nudge("privacy-preference", -0.25),
          ],
          aftermath: "obligation",
          memory:
            "You rang the number on the letter and said what you could actually manage.",
        },
        {
          key: "pay-part",
          label: "Send what you have",
          description: "It is not the number on the letter.",
          nudges: [
            nudge("security-stability", 0.3),
            nudge("decision-style", 0.2),
          ],
          aftermath: null,
          memory:
            "You sent part of it and hoped that would be read as good faith.",
        },
        {
          key: "wait",
          label: "Wait for the next one",
          description: "There is always a next one.",
          nudges: [
            nudge("risk-appetite", 0.35),
            nudge("institutional-trust", -0.3),
          ],
          aftermath: null,
          memory: "You put the letter in a drawer and waited for the next one.",
        },
      ],
    },
    {
      key: "arrangement-held",
      requires: [
        { kind: "after-choice", stage: "the-first-letter", option: "call" },
        { kind: "days-since-stage", stage: "the-first-letter", days: 240 },
      ],
      lines: [
        "The arrangement has held for eight months, which is longer than you expected of yourself.",
        "The last payment is close enough now to see, and there is a version of the next few months where you clear it early.",
      ],
      stakes: "ordinary",
      tensions: [],
      mayLeadTo: [],
      options: [
        {
          key: "clear-it",
          label: "Clear it early",
          description: "It empties everything else out.",
          nudges: [
            nudge("security-stability", 0.4),
            nudge("risk-appetite", -0.2),
          ],
          aftermath: null,
          memory: "You cleared it early and had nothing behind you for a month.",
        },
        {
          key: "run-it-out",
          label: "Run it to the end",
          description: "Keep something back.",
          nudges: [
            nudge("security-stability", 0.25),
            nudge("decision-style", 0.15),
          ],
          aftermath: null,
          memory: "You ran the arrangement out to the end and kept a margin.",
        },
      ],
    },
    {
      key: "it-got-further-behind",
      requires: [
        { kind: "after-stage", stage: "the-first-letter" },
        { kind: "without-choice", stage: "the-first-letter", option: "call" },
        { kind: "days-since-stage", stage: "the-first-letter", days: 200 },
        { kind: "fact", fact: "money.obligation" },
      ],
      lines: [
        "It is not letters any more. Somebody rings during the day, and they have your work number.",
        "The number is larger than it was and the reason it is larger is on the second page.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["security-stability", "personal-ties"],
          [1, 1],
          "The way out that is actually available means asking somebody.",
        ),
        tension(
          ["privacy-preference", "security-stability"],
          [1, 1],
          "Any of this getting sorted involves somebody else knowing about it.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "ask-someone",
          label: "Ask someone for help",
          description: "You will have to say how it got here.",
          nudges: [
            nudge("personal-ties", 0.4),
            nudge("privacy-preference", -0.45),
          ],
          aftermath: "obligation",
          memory:
            "You asked somebody for help with it, and had to say how it had got that far.",
        },
        {
          key: "deal-with-it",
          label: "Deal with it yourself",
          description: "It takes longer and costs more.",
          nudges: [
            nudge("privacy-preference", 0.45),
            nudge("security-stability", -0.25),
            nudge("decision-style", 0.2),
          ],
          aftermath: null,
          memory:
            "You dealt with it on your own, which took twice as long as it needed to.",
        },
        {
          key: "challenge",
          label: "Challenge the second page",
          description: "It might be wrong. It will take months either way.",
          nudges: [
            nudge("institutional-trust", -0.35),
            nudge("decision-style", 0.35),
            nudge("risk-appetite", 0.25),
          ],
          aftermath: "standing",
          memory:
            "You challenged how the number had grown, and it took months to find out whether you were right.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "obligation-closed",
      when: [{ kind: "absent", fact: "money.obligation" }],
      reason: "The obligation this was about is no longer open.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adult — care                                                                */
/* -------------------------------------------------------------------------- */

const CARING: EpisodeFamily = {
  key: "care.the-person-you-look-after",
  family: "care",
  authority: PLAYTEST_AUTHORITY,
  roles: ["relative"],
  stages: [
    {
      key: "it-became-yours",
      requires: [
        needsRelative,
        { kind: "fact", fact: "care.responsibility" },
        { kind: "age-at-least", age: 18 },
      ],
      lines: [
        "Nobody decided that {role:relative} would be mostly your job. It arrived one week at a time.",
        "This week the question is whether to say out loud that it has.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["care-obligation", "achievement-ambition"],
          [1, 1],
          "Naming it makes it permanent; not naming it makes it invisible.",
        ),
      ],
      mayLeadTo: ["shared-out", "it-stayed-yours"],
      options: [
        {
          key: "say-it",
          label: "Say it out loud",
          description: "To the people who could take some.",
          nudges: [
            nudge("decision-style", 0.35),
            nudge("care-obligation", 0.25),
            nudge("privacy-preference", -0.3),
          ],
          aftermath: "grievance",
          memory:
            "You said out loud that {role:relative} had become mostly yours.",
        },
        {
          key: "carry-it",
          label: "Carry it",
          description: "It is easier than the conversation.",
          nudges: [
            nudge("care-obligation", 0.45),
            nudge("privacy-preference", 0.3),
            nudge("achievement-ambition", -0.25),
          ],
          aftermath: null,
          writes: {
            kind: "take-on-commitment",
            label: "Looking after someone, without saying so",
            commitmentKind: "personal:informal-care",
            weeklyHours: [5, 14],
          },
          memory:
            "You went on carrying {role:relative} without saying anything about it.",
        },
        {
          key: "get-help",
          label: "Look into paid help",
          description: "You do not know yet what it costs.",
          nudges: [
            nudge("institutional-trust", 0.3),
            nudge("econ-distribution", 0.2),
            nudge("decision-style", 0.3),
          ],
          aftermath: null,
          memory:
            "You started looking into what paid help for {role:relative} would actually cost.",
        },
      ],
    },
    {
      key: "shared-out",
      requires: [
        needsRelative,
        { kind: "after-choice", stage: "it-became-yours", option: "say-it" },
        { kind: "days-since-stage", stage: "it-became-yours", days: 180 },
      ],
      lines: [
        "Some of it did get taken off you, and some of it came back within the month.",
        "{role:relative} has started ringing you first regardless of whose week it is.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["care-obligation", "personal-ties"],
          [1, 1],
          "Answering keeps them steady and keeps the arrangement broken.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "answer",
          label: "Keep answering",
          description: "It is easier than the alternative.",
          nudges: [nudge("care-obligation", 0.4), nudge("personal-ties", 0.3)],
          aftermath: null,
          memory:
            "You went on answering whenever {role:relative} rang, whoever's week it was.",
        },
        {
          key: "redirect",
          label: "Send them to whoever's week it is",
          description: "Every time, until it sticks.",
          nudges: [
            nudge("decision-style", 0.4),
            nudge("care-obligation", -0.2),
            nudge("security-stability", 0.2),
          ],
          aftermath: "grievance",
          memory:
            "You started sending {role:relative} to whoever's week it actually was.",
        },
      ],
    },
    {
      key: "it-stayed-yours",
      requires: [
        needsRelative,
        { kind: "after-choice", stage: "it-became-yours", option: "carry-it" },
        { kind: "days-since-stage", stage: "it-became-yours", days: 300 },
        { kind: "fact", fact: "commitment.open" },
      ],
      lines: [
        "A year of it, and you have stopped counting the hours because counting them was making it worse.",
        "Something you wanted to do this year is now not going to happen, and it is not going to happen because of this.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["care-obligation", "achievement-ambition"],
          [1, 1],
          "There is no version of the year with both in it.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "give-it-up",
          label: "Give up the other thing",
          description: "Say so, so it stops hanging over the year.",
          nudges: [
            nudge("care-obligation", 0.5),
            nudge("achievement-ambition", -0.45),
          ],
          aftermath: null,
          memory:
            "You gave up the other thing outright rather than let it hang over the year.",
        },
        {
          key: "ask-now",
          label: "Ask for help now",
          description: "A year later than you could have.",
          nudges: [
            nudge("personal-ties", 0.35),
            nudge("privacy-preference", -0.4),
            nudge("decision-style", 0.25),
          ],
          aftermath: "obligation",
          memory:
            "You asked for help with {role:relative} a year after you could have.",
        },
        {
          key: "both-badly",
          label: "Try to do both",
          description: "You already know how that goes.",
          nudges: [
            nudge("achievement-ambition", 0.4),
            nudge("risk-appetite", 0.3),
            nudge("security-stability", -0.35),
          ],
          aftermath: "grievance",
          memory:
            "You tried to do both, and did the year badly in two directions.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "care-ended",
      when: [{ kind: "absent", fact: "care.responsibility" }],
      reason: "The care responsibility this was about has ended.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Adult — the neighbourhood, and where it can lead                            */
/* -------------------------------------------------------------------------- */

const NEIGHBOURHOOD: EpisodeFamily = {
  key: "civic.the-thing-nobody-else-turned-up-for",
  family: "civic",
  authority: PLAYTEST_AUTHORITY,
  roles: [],
  stages: [
    {
      key: "the-meeting",
      requires: [{ kind: "age-at-least", age: 18 }],
      lines: [
        "There is a notice on the door of the building at the end of the road about what is going to happen to it.",
        "The meeting is on Tuesday and nobody you know is going.",
      ],
      stakes: "ordinary",
      tensions: [
        tension(
          ["personal-ties", "governance-scale"],
          [-1, -1],
          "Going costs an evening for something that may already be decided.",
        ),
      ],
      mayLeadTo: ["you-said-something", "you-stayed-out"],
      options: [
        {
          key: "go",
          label: "Go on Tuesday",
          description: "And see who else does.",
          nudges: [
            nudge("governance-scale", -0.3),
            nudge("institutional-trust", 0.2),
            nudge("achievement-ambition", 0.1),
          ],
          aftermath: null,
          writes: {
            kind: "join-community-organization",
            organizationLabel: "The group about the building",
            participationKind: "membership:neighbourhood",
            roleKind: "member:resident",
          },
          memory:
            "You went to the meeting about the building at the end of the road.",
        },
        {
          key: "read-it",
          label: "Read the notice properly",
          description: "There is a comment address on it.",
          nudges: [
            nudge("decision-style", 0.3),
            nudge("institutional-trust", 0.25),
          ],
          aftermath: null,
          memory:
            "You read the notice about the building properly and wrote to the address on it.",
        },
        {
          key: "skip",
          label: "Leave it to whoever turns up",
          description: "Somebody always does.",
          nudges: [
            nudge("governance-scale", 0.2),
            nudge("personal-ties", 0.15),
            nudge("institutional-trust", -0.2),
          ],
          aftermath: null,
          memory:
            "You left the meeting about the building to whoever else turned up.",
        },
      ],
    },
    {
      key: "you-said-something",
      requires: [
        { kind: "after-choice", stage: "the-meeting", option: "go" },
        { kind: "fact", fact: "civic.participation" },
        { kind: "days-since-stage", stage: "the-meeting", days: 60 },
      ],
      lines: [
        "The group has settled into eight people and one of them keeps looking at you when a decision needs making.",
        "There is a position going that nobody wants and that somebody has to hold.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["achievement-ambition", "security-stability"],
          [1, 1],
          "It is a name on a piece of paper and it is a name on a piece of paper.",
        ),
      ],
      mayLeadTo: ["the-issue-got-bigger", "it-wound-down"],
      options: [
        {
          key: "take-the-role",
          label: "Take it",
          description: "It has a title and about six hours a month.",
          nudges: [
            nudge("achievement-ambition", 0.4),
            nudge("care-obligation", 0.25),
            nudge("privacy-preference", -0.25),
          ],
          aftermath: "standing",
          writes: {
            kind: "take-on-commitment",
            label: "Holding a position in the group about the building",
            commitmentKind: "civic:local-position",
            weeklyHours: [1, 3],
          },
          memory:
            "You took the position in the group about the building, six hours a month and a title.",
        },
        {
          key: "help-without-title",
          label: "Do the work without the title",
          description: "Somebody else's name goes on it.",
          nudges: [
            nudge("privacy-preference", 0.35),
            nudge("care-obligation", 0.3),
            nudge("achievement-ambition", -0.2),
          ],
          aftermath: null,
          memory:
            "You did the work for the group and let somebody else's name go on it.",
        },
        {
          key: "step-back",
          label: "Step back from it",
          description: "You came about one building.",
          nudges: [
            nudge("security-stability", 0.3),
            nudge("achievement-ambition", -0.3),
          ],
          aftermath: null,
          memory:
            "You stepped back from the group once it stopped being about the building.",
        },
      ],
    },
    {
      key: "the-issue-got-bigger",
      requires: [
        { kind: "after-choice", stage: "you-said-something", option: "take-the-role" },
        { kind: "days-since-stage", stage: "you-said-something", days: 240 },
        { kind: "fact", fact: "civic.participation" },
      ],
      lines: [
        "It is not one building now. The same decision is being made about four streets, and somebody has asked you to put your name to a position on it in public.",
        "You have read enough by now to have one. That is not the same as wanting it attached to you.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["governance-scale", "privacy-preference"],
          [-1, 1],
          "Having a view about the four streets and being publicly the person with that view are different things.",
        ),
        tension(
          ["civic-order", "econ-distribution"],
          [1, 1],
          "The position that protects who is there now is the one that stops anything being built.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "put-your-name",
          label: "Put your name to it",
          description: "In public, with the position spelled out.",
          nudges: [
            nudge("achievement-ambition", 0.4),
            nudge("privacy-preference", -0.5),
            nudge("governance-scale", -0.3),
          ],
          aftermath: "standing",
          memory:
            "You put your name in public to a position about the four streets.",
        },
        {
          key: "brief-someone",
          label: "Give it to somebody who wants it",
          description: "They take the position and the attention.",
          nudges: [
            nudge("privacy-preference", 0.4),
            nudge("decision-style", 0.3),
            nudge("achievement-ambition", -0.25),
          ],
          aftermath: "goodwill",
          memory:
            "You handed the four streets to somebody who wanted the attention, and briefed them properly.",
        },
        {
          key: "narrow-it",
          label: "Hold it to the one building",
          description: "It is what you actually know about.",
          nudges: [
            nudge("decision-style", 0.35),
            nudge("governance-scale", -0.35),
            nudge("achievement-ambition", -0.1),
          ],
          aftermath: null,
          memory:
            "You kept to the one building you actually knew about, and said so.",
        },
      ],
    },
    {
      key: "it-wound-down",
      requires: [
        { kind: "after-choice", stage: "you-said-something", option: "step-back" },
        { kind: "days-since-stage", stage: "you-said-something", days: 300 },
      ],
      lines: [
        "The building went the way it was always going to go, and the group stopped meeting some time in the spring.",
        "Somebody from it asks whether you would come back for one evening about something else entirely.",
      ],
      stakes: "ordinary",
      tensions: [],
      mayLeadTo: [],
      options: [
        {
          key: "one-evening",
          label: "Give them the evening",
          description: "One, and say so.",
          nudges: [nudge("personal-ties", 0.3), nudge("care-obligation", 0.2)],
          aftermath: null,
          memory:
            "You gave them one more evening, and said at the start it was one.",
        },
        {
          key: "no",
          label: "Say no",
          description: "You did the building.",
          nudges: [
            nudge("security-stability", 0.3),
            nudge("privacy-preference", 0.25),
          ],
          aftermath: null,
          memory:
            "You said no to going back, on the grounds that you had done the building.",
        },
      ],
    },
  ],
  exits: [],
};

/* -------------------------------------------------------------------------- */
/* Adult — political life, short of a campaign                                 */
/* -------------------------------------------------------------------------- */

/**
 * Where an ordinary civic life starts touching party politics.
 *
 * It stops deliberately short of standing for anything. Candidacy, committees,
 * fundraising and elections belong to the campaign work on its own branch, and
 * duplicating them here would create exactly the collision the routing
 * authority is trying to avoid. What this family covers is the part before
 * that: being asked, being courted, and deciding what your name is for.
 */
const POLITICAL_APPROACH: EpisodeFamily = {
  key: "political.what-your-name-is-for",
  family: "political",
  authority: EPISODE_AUTHORITY,
  roles: ["community-member"],
  stages: [
    {
      key: "the-approach",
      requires: [
        needsCommunityMember,
        { kind: "fact", fact: "civic.participation" },
        { kind: "age-at-least", age: 21 },
      ],
      lines: [
        "{role:community-member} asks whether you would meet somebody from the party that has been losing this ward for twenty years.",
        "They are not asking you to join anything. They say that twice, which is once more than necessary.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["institutional-trust", "privacy-preference"],
          [-1, 1],
          "The people who can actually change the streets are the people you would have to be seen with.",
        ),
      ],
      mayLeadTo: ["the-ask", "kept-your-distance"],
      options: [
        {
          key: "meet",
          label: "Take the meeting",
          description: "Coffee, an hour, no commitment.",
          nudges: [
            nudge("institutional-trust", 0.3),
            nudge("achievement-ambition", 0.35),
            nudge("privacy-preference", -0.25),
          ],
          aftermath: null,
          memory:
            "You took the meeting {role:community-member} set up, and did not commit to anything.",
        },
        {
          key: "decline",
          label: "Say you're not interested",
          description: "Plainly, so it does not come round again.",
          nudges: [
            nudge("privacy-preference", 0.4),
            nudge("institutional-trust", -0.3),
            nudge("achievement-ambition", -0.3),
          ],
          aftermath: null,
          memory:
            "You told {role:community-member} plainly that you were not interested in meeting the party.",
        },
        {
          key: "conditions",
          label: "Meet, but say what you won't do",
          description: "Up front, before anybody has asked.",
          nudges: [
            nudge("decision-style", 0.4),
            nudge("institutional-trust", 0.15),
            nudge("civic-order", 0.15),
          ],
          aftermath: "standing",
          memory:
            "You met them, and said what you would not do before anybody had asked you to.",
        },
      ],
    },
    {
      key: "the-ask",
      requires: [
        { kind: "after-choice", stage: "the-approach", option: "meet" },
        { kind: "days-since-stage", stage: "the-approach", days: 120 },
        { kind: "fact", fact: "civic.participation" },
      ],
      lines: [
        "They want your name on something. Not a ballot — a letter, with about forty other names on it, about the four streets.",
        "One of the other names is somebody you have spent two years disagreeing with in public.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["civic-order", "personal-ties"],
          [1, -1],
          "Signing means standing next to somebody you have said things about.",
        ),
        tension(
          ["decision-style", "institutional-trust"],
          [1, -1],
          "The letter will work, and it will work because of who else is on it.",
        ),
      ],
      mayLeadTo: ["what-it-cost", "nothing-came-of-it"],
      options: [
        {
          key: "sign",
          label: "Sign it",
          description: "Alongside all forty.",
          nudges: [
            nudge("decision-style", 0.35),
            nudge("institutional-trust", 0.3),
            nudge("personal-ties", -0.2),
          ],
          aftermath: "standing",
          memory:
            "You signed the letter about the four streets, next to a name you had spent two years arguing with.",
        },
        {
          key: "own-letter",
          label: "Write your own instead",
          description: "It carries less. It carries only you.",
          nudges: [
            nudge("privacy-preference", 0.3),
            nudge("decision-style", 0.3),
            nudge("institutional-trust", -0.25),
          ],
          aftermath: "standing",
          memory:
            "You wrote your own letter about the four streets rather than sign theirs.",
        },
        {
          key: "refuse",
          label: "Keep your name off it",
          description: "And tell them why.",
          nudges: [
            nudge("privacy-preference", 0.45),
            nudge("achievement-ambition", -0.3),
          ],
          aftermath: "grievance",
          memory:
            "You kept your name off the letter and told them exactly why.",
        },
      ],
    },
    {
      key: "what-it-cost",
      requires: [
        { kind: "after-choice", stage: "the-ask", option: "sign" },
        { kind: "days-since-stage", stage: "the-ask", days: 200 },
      ],
      lines: [
        "The letter worked. Two of the streets came off the list, and the two that stayed on are the ones with nobody organised in them.",
        "Somebody who lives in one of them stops you outside the shop to ask what happened.",
      ],
      stakes: "pressing",
      tensions: [
        tension(
          ["econ-distribution", "decision-style"],
          [1, 1],
          "The deal you were part of protected the people who had somebody arguing for them.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "own-it",
          label: "Tell them what happened",
          description: "Including the part where you signed.",
          nudges: [
            nudge("decision-style", 0.4),
            nudge("civic-order", 0.25),
            nudge("privacy-preference", -0.3),
          ],
          aftermath: "standing",
          memory:
            "You told them how the two streets came off the list, including your part in it.",
        },
        {
          key: "take-it-up",
          label: "Say you'll take their street up",
          description: "You do not know yet whether you can.",
          nudges: [
            nudge("care-obligation", 0.4),
            nudge("achievement-ambition", 0.25),
            nudge("risk-appetite", 0.2),
          ],
          aftermath: "obligation",
          memory:
            "You told somebody outside the shop you would take their street up, without knowing whether you could.",
        },
        {
          key: "deflect",
          label: "Point them at the council",
          description: "It is where the decision was actually made.",
          nudges: [
            nudge("institutional-trust", 0.35),
            nudge("care-obligation", -0.3),
          ],
          aftermath: null,
          memory:
            "You pointed them at the council, which was true and was not an answer.",
        },
      ],
    },
    {
      key: "nothing-came-of-it",
      requires: [
        { kind: "after-choice", stage: "the-ask", option: "refuse" },
        { kind: "days-since-stage", stage: "the-ask", days: 300 },
      ],
      lines: [
        "The letter went out without you and did about as well as these things do.",
        "Nobody has mentioned it since, and nobody has asked you for anything since either.",
      ],
      stakes: "ordinary",
      tensions: [],
      mayLeadTo: [],
      options: [
        {
          key: "fine",
          label: "Leave it there",
          description: "You said what you thought at the time.",
          nudges: [nudge("privacy-preference", 0.3)],
          aftermath: null,
          memory:
            "Nothing came of keeping your name off the letter, one way or the other.",
        },
        {
          key: "reopen",
          label: "Go back to them",
          description: "On your own terms this time.",
          nudges: [
            nudge("achievement-ambition", 0.35),
            nudge("decision-style", 0.3),
          ],
          aftermath: null,
          memory:
            "You went back to them a year later, on terms you set yourself.",
        },
      ],
    },
    {
      key: "kept-your-distance",
      requires: [
        { kind: "after-choice", stage: "the-approach", option: "decline" },
        { kind: "days-since-stage", stage: "the-approach", days: 400 },
        { kind: "fact", fact: "civic.participation" },
      ],
      lines: [
        "The ward went the way it always goes, and the group you are still in is now dealing with the consequences of a decision nobody in it was at the table for.",
        "Somebody says, not unkindly, that you had the chance.",
      ],
      stakes: "notable",
      tensions: [
        tension(
          ["institutional-trust", "privacy-preference"],
          [-1, 1],
          "Being at the table and being clean about it were not both available.",
        ),
      ],
      mayLeadTo: [],
      options: [
        {
          key: "reconsider",
          label: "Say you'd take the meeting now",
          description: "A year later, with less standing.",
          nudges: [
            nudge("institutional-trust", 0.3),
            nudge("achievement-ambition", 0.3),
            nudge("privacy-preference", -0.3),
          ],
          aftermath: null,
          memory:
            "You said, a year late, that you would take the meeting after all.",
        },
        {
          key: "hold",
          label: "Say you'd do the same again",
          description: "And mean it.",
          nudges: [
            nudge("privacy-preference", 0.4),
            nudge("decision-style", 0.35),
            nudge("institutional-trust", -0.3),
          ],
          aftermath: "standing",
          memory:
            "You said you would do the same again, and the room heard you say it.",
        },
      ],
    },
  ],
  exits: [
    {
      key: "no-civic-life",
      when: [{ kind: "absent", fact: "civic.participation" }],
      reason:
        "The participation this ran through is no longer active, so there is nothing for it to run through.",
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

export const EPISODE_BANK_VERSION = "pg-episode-bank-v1";

export const EPISODE_FAMILIES: readonly EpisodeFamily[] = [
  SOMEONE_AT_HOME,
  FRIEND_OVER_YEARS,
  SCHOOL_TROUBLE,
  HOUSEHOLD_LOAD,
  WORK_STANDING,
  MONEY_OWED,
  CARING,
  NEIGHBOURHOOD,
  POLITICAL_APPROACH,
];

export function episodeFamily(key: string): EpisodeFamily | null {
  return EPISODE_FAMILIES.find((family) => family.key === key) ?? null;
}

export function episodeStage(
  familyKey: string,
  stageKey: string,
): EpisodeStage | null {
  return (
    episodeFamily(familyKey)?.stages.find((stage) => stage.key === stageKey) ??
    null
  );
}

export function episodeOption(
  familyKey: string,
  stageKey: string,
  optionKey: string,
): EpisodeOption | null {
  return (
    episodeStage(familyKey, stageKey)?.options.find(
      (option) => option.key === optionKey,
    ) ?? null
  );
}

/** Counts a reviewer can check against the file without reading it all. */
export interface EpisodeBankSummary {
  readonly version: string;
  readonly families: number;
  readonly stages: number;
  readonly options: number;
  readonly familiesWithBranching: number;
  readonly familiesWithQuietEnding: number;
}

export function episodeBankSummary(): EpisodeBankSummary {
  const stages = EPISODE_FAMILIES.flatMap((family) => family.stages);
  return {
    version: EPISODE_BANK_VERSION,
    families: EPISODE_FAMILIES.length,
    stages: stages.length,
    options: stages.reduce((total, stage) => total + stage.options.length, 0),
    // A family branches when two of its stages depend on different answers to
    // the same earlier stage. That is the property that makes the second beat
    // depend on the first rather than merely follow it.
    familiesWithBranching: EPISODE_FAMILIES.filter((family) =>
      family.stages.some((stage) =>
        stage.requires.some(
          (requirement) =>
            requirement.kind === "after-choice" ||
            requirement.kind === "without-choice",
        ),
      ),
    ).length,
    // A family ends quietly when it has at least one terminal stage whose
    // options all leave nothing behind. Without those, every thread would owe
    // the player a payoff, which is the failure mode the authority names.
    familiesWithQuietEnding: EPISODE_FAMILIES.filter((family) =>
      family.stages.some(
        (stage) =>
          stage.mayLeadTo.length === 0 &&
          stage.options.every((option) => option.aftermath === null),
      ),
    ).length,
  };
}
