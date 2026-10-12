/**
 * PRODUCTION CARGO — the physical scene families the approved plates serve.
 *
 * `scene-families.ts` holds five metadata-only families that exercise the
 * contract. These six are different: each one has an approved master behind it,
 * and each is the physical identity that a `SceneAuthoringScaffold` in
 * `production-scenes.ts` and a dynamic-surface record in
 * `dynamic-surface-authoring.ts` both point at.
 *
 * Read the `semanticUses` lists as the reason the environment library is this
 * small. Three apartments cover a whole political life's worth of homes — the
 * one someone grew up in, the one they rent at twenty-six, the one they own at
 * fifty, and every friend's, colleague's and parent's home in between —
 * because none of them asserts whose home it is. That is a fact about the
 * World, and the World says it at runtime.
 *
 * Two of the six are `jurisdiction-specific`, and both say so. The Lexington
 * staff office is painted with Lexington's own street map on the wall, and the
 * executive suite's left window frames a real capitol dome. Pretending either
 * is generic would be a hero asset in reusable clothing, and the validator
 * refuses the combination outright.
 */

import type { PhysicalSceneFamily } from "../semantic-context";

/**
 * The starter apartment: one seat group, a corner chair, a short hallway.
 *
 * Distinct from the other two by SIZE and FURNISHING rather than by story. It
 * is the smallest of the three, and it is the one that reads as recently moved
 * into — which is why the stateful-prop work will hang moving boxes here first.
 */
export const HOME_APARTMENT_STARTER_01: PhysicalSceneFamily = {
  familyId: "HOME_APARTMENT_STARTER_01",
  label: "Starter apartment living room",
  environmentTags: ["residential", "interior", "domestic", "small-scale"],
  accessClass: "household-private",
  lifeStageSuitability: ["young-adulthood", "adulthood"],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: [],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "player-first-home",
      description:
        "The player's own residence early in a life, when the World records them living alone or with one other person.",
      lifeStages: ["young-adulthood"],
    },
    {
      useId: "acquaintance-home",
      description:
        "Someone else's residence. Whose it is comes from the World, never from the plate.",
      lifeStages: ["young-adulthood", "adulthood"],
    },
    {
      useId: "volunteer-doorstep-conversation",
      description:
        "A small political conversation held somewhere domestic rather than institutional.",
      lifeStages: ["young-adulthood", "adulthood"],
    },
  ],
  note: "Decor stays non-semantic. The shelf print and the clipped wall frame at the right edge are painted art, not slots — 37C measured both and refused to promote either.",
};

/**
 * The ordinary apartment: a full sofa, an armchair, a coffee table, a hallway.
 *
 * The working-class room of the three, and the one whose wall carries a real
 * painted landscape rather than an empty frame. That painting is the clearest
 * case in the library for `wall-artwork` staying baked: it is good, it is
 * neutral across every player background, and there is nothing the simulation
 * knows that it should be replaced with.
 */
export const HOME_APARTMENT_ORDINARY_02: PhysicalSceneFamily = {
  familyId: "HOME_APARTMENT_ORDINARY_02",
  label: "Ordinary apartment living room",
  environmentTags: ["residential", "interior", "domestic"],
  accessClass: "household-private",
  lifeStageSuitability: [
    "childhood",
    "adolescence",
    "young-adulthood",
    "adulthood",
    "later-life",
  ],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: [],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "parents-home",
      description:
        "The home the player grew up in, when the World records their parents living here.",
      lifeStages: ["childhood", "adolescence"],
    },
    {
      useId: "player-home",
      description: "The player's own residence.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "acquaintance-home",
      description:
        "A friend's, colleague's or relative's residence, named by the World.",
      lifeStages: ["adolescence", "young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "living-room-meeting",
      description:
        "A handful of people talking politics somewhere nobody had to be invited.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
  ],
  note: "The autumn landscape on the left wall is baked ambient decor and carries no slot. The side-table micro-frame is 1.5% by 3% of the plate and stays a painted rectangle forever.",
};

/**
 * The settled apartment: club chair, full sofa, coffee table, bookcase, window.
 *
 * The benchmark room of the three — the one with the most furniture, the widest
 * seat group and the only authored window large enough to carry time of day and
 * weather. Its bookcase also carries four tabletop micro-frames, which is why
 * it is the scene the promotion threshold was written against.
 */
export const HOME_APARTMENT_SETTLED_03: PhysicalSceneFamily = {
  familyId: "HOME_APARTMENT_SETTLED_03",
  label: "Settled apartment living room",
  environmentTags: ["residential", "interior", "domestic", "benchmark"],
  accessClass: "household-private",
  // Young adulthood is here for the visitor, not the owner: someone in their
  // twenties visits a mentor's settled home long before they have one.
  lifeStageSuitability: ["young-adulthood", "adulthood", "later-life"],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: [],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "player-home",
      description:
        "The player's own residence once the World records a settled household.",
      lifeStages: ["adulthood", "later-life"],
    },
    {
      useId: "mentor-home",
      description:
        "The home of an established figure the player visits. Who they are comes from the World.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "private-meeting",
      description:
        "A political conversation held at home rather than in an institution.",
      lifeStages: ["adulthood", "later-life"],
    },
    {
      useId: "election-night-at-home",
      description:
        "Watching results come in, when the World has an election running and the television slot has something true to show.",
      lifeStages: ["adulthood", "later-life"],
    },
  ],
  note: "Four bookcase micro-frames, between 3% and 4% of plate width, stay ambient decor permanently. The left wall art is angled on a side wall and stays decor too.",
};

/**
 * The civic community meeting hall, as a title tableau and a gathering space.
 *
 * The only family here with a required slot. A podium with a blank placard is a
 * podium; a podium with a jurisdiction seal and an event name painted on is one
 * meeting, forever. Requiring the placard makes the whole tableau reusable,
 * which is the argument for the environment library in miniature.
 */
export const CIVIC_COMMUNITY_MEETING_HALL_01: PhysicalSceneFamily = {
  familyId: "CIVIC_COMMUNITY_MEETING_HALL_01",
  label: "Civic community meeting hall",
  environmentTags: ["civic", "interior", "public", "gathering", "title"],
  accessClass: "public",
  lifeStageSuitability: [
    "adolescence",
    "young-adulthood",
    "adulthood",
    "later-life",
  ],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["podium-front-placard"],
  // No role tags. The hall is public: anyone may be here, so a tag naming who
  // might unlock it would gate nothing and grant nothing.
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "title-tableau",
      description:
        "The title screen. The hero slot holds the player's own current figure, and the banner area is left clear for the shell.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "public-comment-meeting",
      description:
        "An ordinary meeting with a public-comment period, named by the World.",
      lifeStages: ["adolescence", "young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "campaign-meet-and-greet",
      description:
        "A campaign event in a hired hall, when a campaign the World owns is running.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "neighbourhood-association",
      description:
        "A local association meeting with no candidacy attached to it at all.",
      lifeStages: ["adulthood", "later-life"],
    },
  ],
  note: "The audience is baked illustrated sprites. Only the podium hero slot and the right foreground chair accept modular people; 37C is explicit that the rest of the hall does not.",
};

/**
 * The executive private office: a partner's desk, two guest chairs, a flag.
 *
 * `jurisdiction-specific`, and for a reason worth stating plainly: the left
 * window frames a real classical capitol dome. Bound to a jurisdiction that
 * does not have one, the room is quietly lying about where it is, and that is a
 * declared mismatch rather than something to paint over.
 */
export const EXECUTIVE_PRIVATE_OFFICE_01: PhysicalSceneFamily = {
  familyId: "EXECUTIVE_PRIVATE_OFFICE_01",
  label: "Executive private office (capitol view)",
  environmentTags: ["institutional", "interior", "executive", "office"],
  accessClass: "role-restricted",
  lifeStageSuitability: ["adulthood", "later-life"],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["jurisdiction-state-flag"],
  roleEligibilityTags: [
    "governor",
    "mayor",
    "executive-staff",
    "invited-guest",
  ],
  architectureScope: "jurisdiction-specific",
  jurisdictionScope: "classical-capitol-dome-jurisdictions",
  semanticUses: [
    {
      useId: "executive-working-office",
      description:
        "The office of whichever executive the World seats here, working alone at the desk.",
      lifeStages: ["adulthood", "later-life"],
    },
    {
      useId: "executive-meeting",
      description:
        "A meeting across the desk, with the two guest chairs occupied from behind.",
      lifeStages: ["adulthood", "later-life"],
    },
    {
      useId: "transition-day",
      description:
        "Arrival or departure — a new term, a defeat, a resignation — where the room is the same and the props are not.",
      lifeStages: ["adulthood", "later-life"],
    },
  ],
  note: "37C records the window as a declared visual mismatch outside jurisdictions with a classical capitol dome. It is masked or accepted per binding; it is never quietly reused.",
};

/**
 * The Lexington municipal council staff office.
 *
 * The one room in the library that is a real place, and it stays one. Its wall
 * map is Lexington and Fayette County, which is exactly why the map is a
 * dynamic surface: the plate can serve another city only if the map can be
 * replaced, and if it cannot be replaced the room is not reusable and should
 * not pretend to be.
 */
export const COUNCIL_STAFF_OFFICE_LEXINGTON_01: PhysicalSceneFamily = {
  familyId: "COUNCIL_STAFF_OFFICE_LEXINGTON_01",
  label: "Lexington council staff office",
  environmentTags: ["institutional", "interior", "municipal", "office"],
  accessClass: "role-restricted",
  lifeStageSuitability: ["young-adulthood", "adulthood", "later-life"],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["wall-district-map-slot"],
  roleEligibilityTags: ["council-staff", "council-member", "constituent"],
  architectureScope: "jurisdiction-specific",
  jurisdictionScope: "lexington-fayette-placeholder",
  semanticUses: [
    {
      useId: "staff-working-day",
      description: "A staffer at their own desk, working.",
      lifeStages: ["young-adulthood", "adulthood"],
    },
    {
      useId: "constituent-meeting",
      description:
        "A constituent in the guest chair. Who they are comes from the World.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
  ],
  note: "Lexington content remains an explicit placeholder until sourced snapshots exist, per the repository's standing rule. The two stacked wall certificates are 3.8% by 5.9% of plate and stay ambient paper shapes.",
};

export const PRODUCTION_SCENE_FAMILIES: readonly PhysicalSceneFamily[] = [
  CIVIC_COMMUNITY_MEETING_HALL_01,
  COUNCIL_STAFF_OFFICE_LEXINGTON_01,
  EXECUTIVE_PRIVATE_OFFICE_01,
  HOME_APARTMENT_ORDINARY_02,
  HOME_APARTMENT_SETTLED_03,
  HOME_APARTMENT_STARTER_01,
];
