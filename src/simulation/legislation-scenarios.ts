import {
  AUTHORED_MEASURE_NOTICE,
  authoredScenarioSeatCount,
  seatBodyForPack as seatChamber,
} from "./legislative-content";
import type {
  SeatedBody,
  AuthoredVoteCounts,
} from "./legislation-scenario-types";
export * from "./legislative-content";
export type * from "./legislation-scenario-types";
import { makeIsoDate } from "./dates";
import { createScenarioWorld } from "./demo";
import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import { introduceMeasure } from "./legislation";
import {
  ALASKA_RULE_PACK,
  KENTUCKY_RULE_PACK,
  NEBRASKA_RULE_PACK,
} from "./legislature-rule-packs";
import type { LegislativeRulePack } from "./legislature-rules";
import { personName } from "./people";
import type { EntityId, World } from "./types";

export interface LegislativeScenario {
  readonly scenarioKey: string;
  readonly label: string;
  /** Always the authored notice. Present so no surface can forget to show it. */
  readonly measureNotice: typeof AUTHORED_MEASURE_NOTICE;
  readonly world: World;
  readonly pack: LegislativeRulePack;
  readonly measureId: EntityId;
  readonly bodies: readonly SeatedBody[];
  readonly playerPersonId: EntityId;
  readonly committeeMemberCount: number;
  /**
   * How the seated members decide each question. These are authored for the
   * scenario, not produced by a model of legislator behavior: this slice
   * proves the institution resolves a question correctly and leaves how a
   * member makes up their mind to the character systems.
   */
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  /** Whether the governor signs or vetoes when the bill reaches the desk. */
  readonly governorAction: "signed" | "vetoed" | null;
  readonly governorRationale: string;
}

const KENTUCKY_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ky-commonwealth-placeholder",
);
const NEBRASKA_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ne-state-placeholder",
);
const ALASKA_JURISDICTION_ID = createStableId(
  "jurisdiction",
  "definition:us-ak-state-placeholder",
);

function stateContext(
  id: EntityId,
  slug: string,
  name: string,
  parentName: string,
  timeZone: string,
  utcOffsetMinutes: number,
): DemoJurisdictionContext {
  return {
    jurisdiction: {
      id,
      slug,
      name,
      kind: "state-placeholder",
      parentName,
      provenance: {
        asOf: null,
        source: null,
        jurisdiction: id,
        status: "placeholder",
      },
    },
    initialMoment: {
      date: makeIsoDate("2026-01-05"),
      minuteOfDay: 9 * 60 + 10,
      timeZone,
      utcOffsetMinutes,
    },
    creationSummary: `Seeded world created with a ${name} placeholder for legislative play.`,
    goalScope: `${name} placeholder`,
    householdLocationLabel: `Synthetic ${name} location`,
  };
}

export const KENTUCKY_CONTEXT = stateContext(
  KENTUCKY_JURISDICTION_ID,
  "us-ky-commonwealth-placeholder",
  "Kentucky",
  "United States",
  "America/New_York",
  -300,
);

export const NEBRASKA_CONTEXT = stateContext(
  NEBRASKA_JURISDICTION_ID,
  "us-ne-state-placeholder",
  "Nebraska",
  "United States",
  "America/Chicago",
  -360,
);

export const ALASKA_CONTEXT = stateContext(
  ALASKA_JURISDICTION_ID,
  "us-ak-state-placeholder",
  "Alaska",
  "United States",
  "America/Anchorage",
  -540,
);

interface ScenarioBlueprint {
  readonly scenarioKey: string;
  readonly label: string;
  readonly seed: string;
  readonly context: DemoJurisdictionContext;
  readonly pack: LegislativeRulePack;
  readonly designation: string;
  readonly shortTitle: string;
  readonly summary: string;
  /**
   * Declared, not guessed from the state. Alaska overrides an appropriation at
   * three quarters of the joint membership and anything else at two thirds, so
   * this field decides which threshold a bill actually faces.
   */
  readonly subjectClass: "appropriation" | "general-policy";
  readonly nonpartisan: boolean;
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  readonly governorAction: "signed" | "vetoed";
  readonly governorRationale: string;
  /**
   * Qualified catalog keys for the questions this bill is about. Omitted
   * where no shipped question fits — see `ProgramVariant.propositionKeys`.
   */
  readonly propositionKeys?: readonly string[];
}

const BLUEPRINTS: readonly ScenarioBlueprint[] = [
  {
    scenarioKey: "kentucky",
    label: "Kentucky General Assembly",
    seed: "legislative-core-kentucky-2026",
    context: KENTUCKY_CONTEXT,
    pack: KENTUCKY_RULE_PACK,
    designation: "HB 214",
    shortTitle: "Transit Access Pilot",
    subjectClass: "general-policy",
    summary:
      "Funds a two-year pilot extending fare-free bus service to riders enrolled in state assistance programs.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 10, nay: 7 },
      "committee:senate-transportation": { yea: 7, nay: 4 },
      "floor:house:final-passage": { yea: 58, nay: 40, absent: 2 },
      "floor:senate:final-passage": { yea: 22, nay: 15, absent: 1 },
      "amendment:house": { yea: 61, nay: 37, absent: 2 },
      "amendment:senate": { yea: 21, nay: 16, absent: 1 },
      "concurrence:house": { yea: 55, nay: 43, absent: 2 },
      "override:house": { yea: 56, nay: 42, absent: 2 },
      "override:senate": { yea: 21, nay: 16, absent: 1 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor objected to committing the state to two years of ongoing cost.",
    // Fare-free rides for assistance enrollees is a bill about whether transit
    // should be free to ride, whatever its narrower reach. The other eight
    // bills in this bank — signage, ferry notice, credentials, dredging,
    // crossing signals, winter clearing, and two formula extensions — decide
    // nothing any shipped question asks, and are left unlinked rather than
    // pinned to the nearest-sounding one.
    propositionKeys: [
      "us-policy-positions:transportation-infrastructure.fare-free-transit",
    ],
  },
  {
    scenarioKey: "nebraska",
    label: "Nebraska Legislature",
    seed: "legislative-core-nebraska-2026",
    context: NEBRASKA_CONTEXT,
    pack: NEBRASKA_RULE_PACK,
    designation: "LB 88",
    shortTitle: "Rural Transit Access",
    subjectClass: "general-policy",
    summary:
      "Extends the state transit assistance formula to counties without a fixed-route provider.",
    nonpartisan: true,
    votePlan: {
      "committee:transportation-telecommunications": { yea: 6, nay: 2 },
      "floor:legislature:general-file": { yea: 31, nay: 16, absent: 2 },
      "floor:legislature:select-file": { yea: 30, nay: 17, absent: 2 },
      "floor:legislature:final-reading": { yea: 30, nay: 17, absent: 2 },
      "amendment:legislature": { yea: 27, nay: 20, absent: 2 },
      "override:legislature": { yea: 30, nay: 17, absent: 2 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor questioned extending the formula without a funding source.",
  },
  {
    scenarioKey: "alaska",
    label: "Alaska State Legislature",
    seed: "legislative-core-alaska-2026",
    context: ALASKA_CONTEXT,
    pack: ALASKA_RULE_PACK,
    designation: "HB 41",
    shortTitle: "Village Transit Support",
    subjectClass: "appropriation",
    summary:
      "Appropriates matching funds for community transit in unserved boroughs and census areas.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 4, nay: 3 },
      "committee:senate-transportation": { yea: 4, nay: 3 },
      "floor:house:final-passage": { yea: 24, nay: 15, absent: 1 },
      "floor:senate:final-passage": { yea: 13, nay: 7 },
      "override:joint": { yea: 45, nay: 14, absent: 1 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor returned the whole bill, objecting that the match commits the state before the boroughs have costed their routes.",
  },
  {
    // A bill the Governor simply signs. Every scenario above ends in a veto and
    // an override, which made that look like the normal way a bill becomes law.
    scenarioKey: "kentucky-signage",
    label: "Kentucky General Assembly — road signage",
    seed: "legislative-core-kentucky-signage-2026",
    context: KENTUCKY_CONTEXT,
    pack: KENTUCKY_RULE_PACK,
    designation: "HB 388",
    shortTitle: "Rural Road Sign Replacement",
    subjectClass: "general-policy",
    summary:
      "Sets a replacement schedule for damaged and illegible route markers on state-maintained rural roads.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 13, nay: 4 },
      "committee:senate-transportation": { yea: 9, nay: 2 },
      "floor:house:final-passage": { yea: 74, nay: 24, absent: 2 },
      "floor:senate:final-passage": { yea: 29, nay: 8, absent: 1 },
      "amendment:house": { yea: 66, nay: 32, absent: 2 },
      "amendment:senate": { yea: 26, nay: 11, absent: 1 },
      "concurrence:house": { yea: 71, nay: 27, absent: 2 },
    },
    governorAction: "signed",
    governorRationale:
      "The Governor signed the bill, noting the schedule carries no new appropriation.",
  },
  {
    // A bill that dies where most bills die. Nothing above ever fails, which
    // made committee referral look like a formality.
    scenarioKey: "nebraska-credentials",
    label: "Nebraska Legislature — driver credentials",
    seed: "legislative-core-nebraska-credentials-2026",
    context: NEBRASKA_CONTEXT,
    pack: NEBRASKA_RULE_PACK,
    designation: "LB 142",
    shortTitle: "School Transport Credential Recognition",
    subjectClass: "general-policy",
    summary:
      "Would recognize school transport driver credentials issued by adjoining states for drivers already licensed here.",
    nonpartisan: true,
    votePlan: {
      "committee:transportation-telecommunications": { yea: 3, nay: 5 },
      "floor:legislature:general-file": { yea: 24, nay: 23, absent: 2 },
      "floor:legislature:select-file": { yea: 24, nay: 23, absent: 2 },
      "floor:legislature:final-reading": { yea: 24, nay: 23, absent: 2 },
      "amendment:legislature": { yea: 22, nay: 25, absent: 2 },
      "override:legislature": { yea: 24, nay: 23, absent: 2 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor did not reach this bill; it was not reported out of committee.",
  },
  {
    // An Alaska bill that is not an appropriation, so its veto is overridden at
    // two thirds of the joint membership rather than three quarters.
    scenarioKey: "alaska-ferry-notice",
    label: "Alaska State Legislature — ferry notice",
    seed: "legislative-core-alaska-ferry-2026",
    context: ALASKA_CONTEXT,
    pack: ALASKA_RULE_PACK,
    designation: "HB 77",
    shortTitle: "Coastal Ferry Schedule Notice",
    subjectClass: "general-policy",
    summary:
      "Would require advance public notice before a scheduled coastal ferry sailing is canceled or rerouted.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 5, nay: 2 },
      "committee:senate-transportation": { yea: 4, nay: 3 },
      "floor:house:final-passage": { yea: 26, nay: 13, absent: 1 },
      "floor:senate:final-passage": { yea: 12, nay: 8 },
      "amendment:house": { yea: 23, nay: 16, absent: 1 },
      "amendment:senate": { yea: 11, nay: 9 },
      "concurrence:house": { yea: 25, nay: 14, absent: 1 },
      // Two thirds of the sixty-member joint session is forty. An appropriation
      // would have needed forty-five, and this bill is not one.
      "override:joint": { yea: 41, nay: 18, absent: 1 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor objected that the notice period would bind operations during weather cancellations.",
  },
  {
    // A bill the two chambers never agree on. Every scenario above that reaches
    // a second chamber ends with the origin chamber accepting the changes,
    // which made concurrence look like a formality rather than a decision.
    scenarioKey: "kentucky-crossing-signals",
    label: "Kentucky General Assembly — school crossing signals",
    seed: "legislative-core-kentucky-crossing-2026",
    context: KENTUCKY_CONTEXT,
    pack: KENTUCKY_RULE_PACK,
    designation: "HB 502",
    shortTitle: "School Crossing Signal Standards",
    subjectClass: "general-policy",
    summary:
      "Would set a common standard for pedestrian crossing signals on state-maintained roads within a quarter mile of a school entrance.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 11, nay: 6 },
      "committee:senate-transportation": { yea: 8, nay: 3 },
      "floor:house:final-passage": { yea: 62, nay: 36, absent: 2 },
      "floor:senate:final-passage": { yea: 24, nay: 13, absent: 1 },
      "amendment:house": { yea: 48, nay: 50, absent: 2 },
      // The Senate narrows the bill to roads it already maintains signals on.
      "amendment:senate": { yea: 24, nay: 13, absent: 1 },
      // Fifty-one of the hundred members elected are needed to accept the
      // Senate's change, and the House does not have them.
      "concurrence:house": { yea: 44, nay: 54, absent: 2 },
      "override:house": { yea: 44, nay: 54, absent: 2 },
      "override:senate": { yea: 24, nay: 13, absent: 1 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor never received this bill; the two chambers did not agree on one text.",
  },
  {
    // An override that falls short, so the veto stands. Every override above
    // succeeds, which made a veto look like a formality too.
    scenarioKey: "nebraska-winter-clearing",
    label: "Nebraska Legislature — winter route clearing",
    seed: "legislative-core-nebraska-clearing-2026",
    context: NEBRASKA_CONTEXT,
    pack: NEBRASKA_RULE_PACK,
    designation: "LB 219",
    shortTitle: "Winter Route Clearing Standards",
    subjectClass: "general-policy",
    summary:
      "Would set a minimum clearing standard for state-maintained routes serving school transport during winter weather.",
    nonpartisan: true,
    votePlan: {
      "committee:transportation-telecommunications": { yea: 5, nay: 3 },
      "floor:legislature:general-file": { yea: 27, nay: 20, absent: 2 },
      "floor:legislature:select-file": { yea: 27, nay: 20, absent: 2 },
      "floor:legislature:final-reading": { yea: 27, nay: 20, absent: 2 },
      "amendment:legislature": { yea: 26, nay: 21, absent: 2 },
      // Twenty-five of the forty-nine elected pass a bill; thirty are needed to
      // override a veto. Twenty-eight is enough for one and not the other.
      "override:legislature": { yea: 28, nay: 19, absent: 2 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor objected that a statewide clearing standard would bind counties with very different road mileage.",
  },
  {
    // A bill voted down on the floor of the second chamber. Above, a bill that
    // reaches a floor always passes it, so the only way to lose was committee.
    scenarioKey: "alaska-harbor-dredging",
    label: "Alaska State Legislature — harbor dredging",
    seed: "legislative-core-alaska-harbor-2026",
    context: ALASKA_CONTEXT,
    pack: ALASKA_RULE_PACK,
    designation: "HB 95",
    shortTitle: "Harbor Dredging Schedule",
    subjectClass: "general-policy",
    summary:
      "Would require a published dredging schedule for state-maintained small-boat harbors before each season opens.",
    nonpartisan: false,
    votePlan: {
      "committee:house-transportation": { yea: 5, nay: 2 },
      "committee:senate-transportation": { yea: 4, nay: 3 },
      "floor:house:final-passage": { yea: 23, nay: 16, absent: 1 },
      // Eleven of the twenty senators are needed. Nine is not eleven, and the
      // bill goes no further — no veto, no override, no desk.
      "floor:senate:final-passage": { yea: 9, nay: 11 },
      "amendment:house": { yea: 21, nay: 18, absent: 1 },
      "amendment:senate": { yea: 9, nay: 11 },
      "override:joint": { yea: 32, nay: 27, absent: 1 },
    },
    governorAction: "vetoed",
    governorRationale:
      "The Governor never received this bill; the Senate voted it down.",
  },
];

/**
 * Builds a playable scenario: a seeded world, a seated legislature, and one
 * measure already filed and waiting for referral.
 */
export function createLegislativeScenario(
  scenarioKey: string,
): LegislativeScenario {
  const blueprint = BLUEPRINTS.find(
    (candidate) => candidate.scenarioKey === scenarioKey,
  );
  if (!blueprint) {
    throw new Error(`No legislative scenario named '${scenarioKey}'.`);
  }

  const baseWorld = createScenarioWorld(blueprint.seed, blueprint.context, {
    peopleCount: 6,
  });
  const playerPersonId = baseWorld.personOrder[0];
  if (!playerPersonId) {
    throw new Error("Legislative scenario world produced no people.");
  }

  const linked = baseWorld.personOrder.map((personId) => ({
    personId,
    name: personName(baseWorld.people[personId]!),
  }));

  const world = introduceMeasure(
    { ...baseWorld, control: { kind: "person", personId: playerPersonId } },
    {
      stableKey: `${blueprint.scenarioKey}:measure`,
      jurisdictionId: blueprint.context.jurisdiction.id,
      rulePackId: blueprint.pack.packId,
      designation: blueprint.designation,
      shortTitle: blueprint.shortTitle,
      summary: blueprint.summary,
      origin: "member-introduction",
      subjectClass: blueprint.subjectClass,
      sponsorPersonId: playerPersonId,
    },
  );

  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.stableKey === `${blueprint.scenarioKey}:measure`,
  );
  if (!measure) {
    throw new Error("Legislative scenario failed to file its measure.");
  }

  const bodies = blueprint.pack.chambers.map((chamber, index) =>
    seatChamber(
      chamber.chamberKey,
      chamber.name,
      authoredScenarioSeatCount(blueprint.pack, chamber.chamberKey),
      index === 0 ? linked : [],
      blueprint.nonpartisan,
    ),
  );

  const committeeSize =
    blueprint.pack.chambers[0]?.committees[0]?.appointedMembers ?? 7;

  return {
    scenarioKey: blueprint.scenarioKey,
    label: blueprint.label,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    world,
    pack: blueprint.pack,
    measureId: measure.id,
    bodies,
    playerPersonId,
    committeeMemberCount: committeeSize,
    votePlan: blueprint.votePlan,
    governorAction: blueprint.governorAction,
    governorRationale: blueprint.governorRationale,
  };
}
