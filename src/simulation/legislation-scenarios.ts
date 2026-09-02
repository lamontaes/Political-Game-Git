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
import type {
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  World,
} from "./types";

/**
 * Playable legislative scenarios.
 *
 * Each scenario seats a real-sized chamber and files one measure. Members are
 * seated positions with stable keys; a few are linked to simulated people so
 * conversations and relationships can attach to them later. How a member votes
 * is authored here, deliberately: this slice proves that the *institution*
 * resolves a question correctly, and leaves how a legislator makes up their
 * mind to the character systems that already exist.
 */

export interface SeatedMember {
  readonly memberKey: string;
  readonly name: string;
  readonly personId: EntityId | null;
  /** Descriptive grouping shown to the player; carries no mechanical weight. */
  readonly caucusLabel: string;
}

export interface SeatedBody {
  readonly chamberKey: string;
  readonly chamberName: string;
  readonly members: readonly SeatedMember[];
}

/** Authored member decisions for each question this scenario can put. */
export interface AuthoredVoteCounts {
  readonly yea: number;
  readonly nay?: number;
  readonly presentNotVoting?: number;
  readonly absent?: number;
  readonly excused?: number;
}

/**
 * The procedure in these scenarios is sourced. The bills are not.
 *
 * Every measure below is written for development so the institutions have
 * something to act on. None of them is a real bill, and the game says so on
 * the screen rather than leaving a player to assume otherwise.
 */
export const AUTHORED_MEASURE_NOTICE =
  "Written for development. The procedure is sourced; the bill is not a real one.";

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
   * scenario, not produced by a model of legislator behaviour: this slice
   * proves the institution resolves a question correctly and leaves how a
   * member makes up their mind to the character systems.
   */
  readonly votePlan: Readonly<Record<string, AuthoredVoteCounts>>;
  /** Whether the governor signs or vetoes when the bill reaches the desk. */
  readonly governorAction: "signed" | "vetoed";
  readonly governorRationale: string;
}

export function votePlanKeyForCommittee(committeeKey: string): string {
  return `committee:${committeeKey}`;
}

export function votePlanKeyForFloor(
  chamberKey: string,
  stageKey: string,
): string {
  return `floor:${chamberKey}:${stageKey}`;
}

export function votePlanKeyForOverride(forumKey: string): string {
  return `override:${forumKey}`;
}

export function votePlanKeyForAmendment(chamberKey: string): string {
  return `amendment:${chamberKey}`;
}

export function votePlanKeyForConcurrence(chamberKey: string): string {
  return `concurrence:${chamberKey}`;
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

const CAUCUS_LABELS = ["Majority", "Minority", "Unaffiliated"] as const;

/**
 * Seats a chamber. Names are generated from the seat index so a body is stable
 * and reproducible without inventing biography for a hundred people.
 */
function seatChamber(
  chamberKey: string,
  chamberName: string,
  seats: number,
  linkedPeople: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[],
  nonpartisan: boolean,
): SeatedBody {
  const members: SeatedMember[] = [];
  for (let index = 0; index < seats; index += 1) {
    const linked = linkedPeople[index];
    members.push({
      memberKey: `${chamberKey}-seat-${String(index + 1).padStart(3, "0")}`,
      name: linked ? linked.name : `Member for District ${index + 1}`,
      personId: linked ? linked.personId : null,
      caucusLabel: nonpartisan
        ? "Nonpartisan"
        : CAUCUS_LABELS[index % 2 === 0 ? 0 : 1]!,
    });
  }
  return { chamberKey, chamberName, members };
}

/**
 * Turns authored counts into member dispositions. The first members take each
 * disposition in order, so a scenario is deterministic and inspectable.
 */
export function dispositionsFromCounts(
  members: readonly SeatedMember[],
  counts: {
    readonly yea: number;
    readonly nay?: number;
    readonly presentNotVoting?: number;
    readonly absent?: number;
    readonly excused?: number;
  },
): readonly LegislativeVoteDisposition[] {
  const plan: [LegislativeMemberDisposition, number][] = [
    ["yea", counts.yea],
    ["nay", counts.nay ?? 0],
    ["present-not-voting", counts.presentNotVoting ?? 0],
    ["absent", counts.absent ?? 0],
    ["excused", counts.excused ?? 0],
  ];
  const total = plan.reduce((sum, [, count]) => sum + count, 0);
  if (total > members.length) {
    throw new Error(
      `Authored vote assigns ${total} dispositions to a body of ${members.length}.`,
    );
  }
  const dispositions: LegislativeVoteDisposition[] = [];
  let cursor = 0;
  for (const [disposition, count] of plan) {
    for (let index = 0; index < count; index += 1) {
      const member = members[cursor]!;
      dispositions.push({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition,
      });
      cursor += 1;
    }
  }
  return dispositions;
}

/** Members of the committee a measure is sitting in, taken from the front bench. */
export function committeeMembers(
  body: SeatedBody,
  size: number,
): readonly SeatedMember[] {
  return body.members.slice(0, size);
}

export function bodyForChamber(
  scenario: LegislativeScenario,
  chamberKey: string,
): SeatedBody {
  const body = scenario.bodies.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!body) {
    throw new Error(`Scenario has no seated body for '${chamberKey}'.`);
  }
  return body;
}

/** Every seat in the legislature, for a joint sitting. */
export function jointBody(scenario: LegislativeScenario): SeatedBody {
  return {
    chamberKey: "joint",
    chamberName: "Joint session",
    members: scenario.bodies.flatMap((body) => body.members),
  };
}

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
      "Would require advance public notice before a scheduled coastal ferry sailing is cancelled or rerouted.",
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
];

export function legislativeScenarioKeys(): readonly string[] {
  return BLUEPRINTS.map((blueprint) => blueprint.scenarioKey);
}

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
      chamber.seats,
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
