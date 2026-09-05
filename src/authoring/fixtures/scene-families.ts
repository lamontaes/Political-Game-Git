/**
 * SEMANTIC CARGO — five generic physical scene families.
 *
 * These are metadata fixtures. None of them has production raster art yet, and
 * that is deliberate: the point is to exercise the contracts with the shapes
 * real cargo will have, so that when plates arrive the schema is already known
 * to hold them.
 *
 * Every family here is GENERIC. None asserts a jurisdiction, a state, a city or
 * a real building, and `architectureScope` says so. A generic room that quietly
 * carried a jurisdiction would be a hero asset pretending to be reusable, and
 * the validator rejects that combination outright.
 *
 * Read the `semanticUses` lists as the argument for the whole System 5 split.
 * One apartment plate serves four different homes across a political life. One
 * pavilion serves a childhood birthday and a campaign meet-and-greet. The art
 * is the same; only what the World calls it changes.
 */

import type { PhysicalSceneFamily } from "../semantic-context";

/**
 * A modest apartment interior.
 *
 * Four world meanings, one picture. The player's childhood home and the
 * apartment they rent at twenty-six are the same class of room, and a career
 * that passes through both should not cost two plates.
 */
export const HOME_APARTMENT_MODEST_01: PhysicalSceneFamily = {
  familyId: "HOME_APARTMENT_MODEST_01",
  label: "Modest apartment living area",
  environmentTags: ["residential", "interior", "domestic", "small-scale"],
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
        "Another person's residence — a friend, a colleague, a relative. Whose it is comes from the World, never from the plate.",
      lifeStages: ["adolescence", "young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "private-meeting",
      description:
        "A small political conversation held somewhere domestic rather than institutional.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
  ],
  note: "Decor stays non-semantic: neutral photographs, unread book spines, a wall calendar as a grid rather than as dates.",
};

/**
 * A covered public park pavilion.
 *
 * The clearest case for keeping the image free of any event. A pavilion with
 * bunting and a "HAPPY BIRTHDAY" banner painted into it can only ever be one
 * birthday; a pavilion with an empty banner slot is five different occasions
 * across thirty years of play.
 */
export const PUBLIC_PARK_PAVILION_01: PhysicalSceneFamily = {
  familyId: "PUBLIC_PARK_PAVILION_01",
  label: "Covered public park pavilion",
  environmentTags: ["public", "exterior", "civic", "park", "gathering"],
  accessClass: "public",
  lifeStageSuitability: [
    "childhood",
    "adolescence",
    "young-adulthood",
    "adulthood",
    "later-life",
  ],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["pavilion-banner"],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "childhood-birthday",
      description: "A family birthday party held in a public park.",
      lifeStages: ["childhood", "adolescence"],
    },
    {
      useId: "family-picnic",
      description: "An ordinary family gathering.",
    },
    {
      useId: "neighborhood-meeting",
      description: "An informal residents' meeting held outdoors.",
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "campaign-meet-and-greet",
      description:
        "A candidate meeting voters. The banner slot carries the campaign name; the plate never does.",
      requiredSurfaceSlots: ["pavilion-banner"],
      lifeStages: ["young-adulthood", "adulthood", "later-life"],
    },
    {
      useId: "constituent-event",
      description: "An officeholder's public event for the people they serve.",
      requiredSurfaceSlots: ["pavilion-banner"],
      lifeStages: ["adulthood", "later-life"],
    },
  ],
  note: "The banner is a slot precisely so the same pavilion can host a birthday and a campaign event without either being baked in.",
};

/** A generic public hearing / board room. */
export const PUBLIC_HEARING_ROOM_01: PhysicalSceneFamily = {
  familyId: "PUBLIC_HEARING_ROOM_01",
  label: "Generic public hearing and board room",
  environmentTags: ["institutional", "interior", "civic", "hearing", "dais"],
  accessClass: "public",
  lifeStageSuitability: [
    "adolescence",
    "young-adulthood",
    "adulthood",
    "later-life",
  ],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["front-wall-seal", "agenda-board"],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "public-hearing",
      description: "A hearing the public may attend.",
      requiredSurfaceSlots: ["agenda-board"],
    },
    {
      useId: "board-meeting",
      description: "A routine meeting of a governing board.",
      requiredSurfaceSlots: ["agenda-board"],
    },
    {
      useId: "committee-session",
      description: "A committee working through business at the dais.",
      requiredSurfaceSlots: ["agenda-board"],
    },
    {
      useId: "citizen-testimony",
      description: "A member of the public speaking from the witness position.",
    },
  ],
  note: "The seal slot is why this room can serve any jurisdiction: the wall carries a mount, and the World decides whose seal hangs on it.",
};

/** A generic campaign or volunteer office. */
export const CAMPAIGN_VOLUNTEER_OFFICE_01: PhysicalSceneFamily = {
  familyId: "CAMPAIGN_VOLUNTEER_OFFICE_01",
  label: "Generic campaign and volunteer office",
  environmentTags: ["campaign", "interior", "workspace", "temporary-fitout"],
  accessClass: "invited",
  lifeStageSuitability: [
    "adolescence",
    "young-adulthood",
    "adulthood",
    "later-life",
  ],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["campaign-wall-sign", "target-board"],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "volunteer-phone-bank",
      description: "Volunteers working phones at folding tables.",
      requiredSurfaceSlots: ["campaign-wall-sign"],
    },
    {
      useId: "canvass-launch",
      description: "A canvass being briefed and sent out.",
      requiredSurfaceSlots: ["campaign-wall-sign", "target-board"],
    },
    {
      useId: "staff-strategy-meeting",
      description: "A small internal meeting about the state of the race.",
      requiredSurfaceSlots: ["target-board"],
    },
    {
      useId: "election-night-watch",
      description:
        "The same room on election night. The result belongs to a slot; the walls never learn it.",
      requiredSurfaceSlots: ["target-board"],
    },
  ],
  note: "A rented storefront fit-out: cheap tables, borrowed chairs, signage that is a slot rather than paint.",
};

/** A generic press and briefing room. */
export const PRESS_BRIEFING_ROOM_01: PhysicalSceneFamily = {
  familyId: "PRESS_BRIEFING_ROOM_01",
  label: "Generic press and briefing room",
  environmentTags: [
    "institutional",
    "interior",
    "press",
    "lectern",
    "backdrop",
  ],
  accessClass: "institutional-restricted",
  lifeStageSuitability: ["young-adulthood", "adulthood", "later-life"],
  supportsStanding: true,
  supportsSeated: true,
  requiredSurfaceSlots: ["lectern-plate", "backdrop-panel", "briefing-screen"],
  roleEligibilityTags: [],
  architectureScope: "generic",
  semanticUses: [
    {
      useId: "press-conference",
      description: "A statement to assembled press from the lectern.",
      requiredSurfaceSlots: ["lectern-plate", "backdrop-panel"],
    },
    {
      useId: "policy-briefing",
      description: "A briefing delivered against the screen.",
      requiredSurfaceSlots: ["briefing-screen"],
    },
    {
      useId: "campaign-announcement",
      description: "A candidacy announced from the same room.",
      requiredSurfaceSlots: ["backdrop-panel"],
    },
    {
      useId: "election-result-statement",
      description: "A concession or a victory statement.",
      requiredSurfaceSlots: ["lectern-plate", "backdrop-panel"],
    },
  ],
  note: "Every readable thing in this room — the lectern plate, the repeating backdrop, the slide — is a slot. A press room is the densest concentration of information a scene can contain, which is exactly why none of it may be paint.",
};

export const AUTHORING_SCENE_FAMILY_FIXTURES: readonly PhysicalSceneFamily[] = [
  CAMPAIGN_VOLUNTEER_OFFICE_01,
  HOME_APARTMENT_MODEST_01,
  PRESS_BRIEFING_ROOM_01,
  PUBLIC_HEARING_ROOM_01,
  PUBLIC_PARK_PAVILION_01,
];

export function findSceneFamilyFixture(
  familyId: string,
): PhysicalSceneFamily | undefined {
  return AUTHORING_SCENE_FAMILY_FIXTURES.find(
    (family) => family.familyId === familyId,
  );
}
