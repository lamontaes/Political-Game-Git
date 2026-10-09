import { researchRuleTable } from "./research-rule-tables";
import { rulePackById } from "./legislature-rule-packs";
import { authoredJurisdictionContext } from "./jurisdiction-context";
import type { JurisdictionContext } from "./jurisdiction-context";
import {
  legislativeInstitutionContext,
  legislativePackForWorkKey,
} from "./legislative-institutions";
import type { LegislativeRulePack } from "./legislature-rules";
import type {
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
} from "./types";
import type {
  SeatedMember,
  SeatedBody,
  AuthoredVoteCounts,
  LegislativeProcedureContext,
  LegislativeBlueprint,
} from "./legislation-scenario-types";

const content = researchRuleTable("authoredLegislation");
export const AUTHORED_MEASURE_NOTICE = content.notice;
const AUTHORED_SCENARIO_SEAT_COUNTS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = content.authoredSeatCounts;
const CAUCUS_LABELS = ["Majority", "Minority", "Unaffiliated"] as const;

interface ScenarioBlueprint {
  readonly scenarioKey: string;
  readonly label: string;
  readonly seed: string;
  readonly context: JurisdictionContext;
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
let BLUEPRINTS: readonly ScenarioBlueprint[] | null = null;
export function authoredLegislativeBlueprints(): readonly ScenarioBlueprint[] {
  return (BLUEPRINTS ??= content.rows.map(({ packId, contextKey, ...row }) => {
    const pack = rulePackById(packId, false);
    if (!pack)
      throw new Error(`Authored legislative pack ${packId} is absent.`);
    const votePlan: Record<string, AuthoredVoteCounts> = {};
    for (const [key, counts] of Object.entries(row.votePlan)) {
      if (counts) votePlan[key] = counts;
    }
    return {
      ...row,
      subjectClass: row.subjectClass as "appropriation" | "general-policy",
      governorAction: row.governorAction as "signed" | "vetoed",
      pack,
      votePlan,
      context: authoredJurisdictionContext(contextKey),
    };
  }));
}

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
  scenario: LegislativeProcedureContext,
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
export function jointBody(scenario: LegislativeProcedureContext): SeatedBody {
  return {
    chamberKey: "joint",
    chamberName: "Joint session",
    members: scenario.bodies.flatMap((body) => body.members),
  };
}

/** Seats a chamber for production, linking only members the world really has. */
export function seatBodyForPack(
  chamberKey: string,
  chamberName: string,
  seats: number,
  linkedPeople: readonly {
    readonly personId: EntityId;
    readonly name: string;
  }[],
  nonpartisan: boolean,
): SeatedBody {
  return seatChamber(chamberKey, chamberName, seats, linkedPeople, nonpartisan);
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

export function authoredScenarioSeatCount(
  pack: LegislativeRulePack,
  chamberKey: string,
): number {
  const formal = pack.chambers.find(
    (chamber) => chamber.chamberKey === chamberKey,
  )?.seats;
  const seats =
    formal?.kind === "known"
      ? formal.value
      : AUTHORED_SCENARIO_SEAT_COUNTS[pack.packId]?.[chamberKey];
  if (!Number.isSafeInteger(seats) || (seats ?? 0) <= 0) {
    throw new Error(
      `No positive authored scenario seat count exists for '${pack.packId}/${chamberKey}'.`,
    );
  }
  return seats!;
}

export function legislativeBlueprint(
  scenarioKey: string,
): LegislativeBlueprint {
  const blueprint = authoredLegislativeBlueprints().find(
    (candidate) => candidate.scenarioKey === scenarioKey,
  );
  if (!blueprint) return institutionalWorkBlueprint(scenarioKey);
  return {
    scenarioKey: blueprint.scenarioKey,
    label: blueprint.label,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    context: blueprint.context,
    pack: blueprint.pack,
    authoredDesignation: blueprint.designation,
    shortTitle: blueprint.shortTitle,
    summary: blueprint.summary,
    subjectClass: blueprint.subjectClass,
    nonpartisan: blueprint.nonpartisan,
    votePlan: blueprint.votePlan,
    governorAction: blueprint.governorAction,
    governorRationale: blueprint.governorRationale,
    propositionKeys: blueprint.propositionKeys ?? [],
  };
}

/** The scenarios written for one place, in the order they were authored. */
export function legislativeScenarioKeysForPlace(
  jurisdictionId: EntityId,
): readonly string[] {
  return authoredLegislativeBlueprints()
    .filter((blueprint) => blueprint.context.jurisdiction.id === jurisdictionId)
    .map((blueprint) => blueprint.scenarioKey);
}

export function legislativeScenarioKeys(): readonly string[] {
  return authoredLegislativeBlueprints().map(
    (blueprint) => blueprint.scenarioKey,
  );
}

/**
 * The procedure a living institution's bills run under, carrying no authored
 * bill at all: every measure it moves is filed by a member in play, so there
 * is no designation, title or vote count to supply.
 */
export function procedureOnlyBlueprint(input: {
  readonly scenarioKey: string;
  readonly pack: LegislativeRulePack;
  readonly context: JurisdictionContext;
  readonly governorRationale: string;
}): LegislativeBlueprint {
  return {
    scenarioKey: input.scenarioKey,
    label: input.pack.displayName,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    context: input.context,
    pack: input.pack,
    authoredDesignation: null,
    shortTitle: "",
    summary: "",
    subjectClass: "general-policy",
    nonpartisan: false,
    votePlan: {},
    governorAction: null,
    governorRationale: input.governorRationale,
    propositionKeys: [],
  };
}

/** Fictional opportunity content, composed against the selected institution.
 * No legal rule is borrowed from any fixture; decisions are expressly authored.
 * The existing bargaining adapter can replace modeled members' dispositions.
 */
function institutionalWorkBlueprint(workKey: string): LegislativeBlueprint {
  const pack = legislativePackForWorkKey(workKey);
  if (!pack) throw new Error(`No registered legislature for '${workKey}'.`);
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  // A registered institution establishes procedure, not how fictional people vote.
  // Actual dispositions must come from the existing decision/ballot boundary.
  return {
    scenarioKey: workKey,
    label: pack.displayName,
    measureNotice: AUTHORED_MEASURE_NOTICE,
    context: legislativeInstitutionContext(pack),
    pack,
    // A registered institution is not one bill. There is no authored
    // designation to carry: the measure a member introduces is numbered by the
    // jurisdiction it is filed in, when it is filed.
    authoredDesignation: null,
    shortTitle: "Public service pilot",
    summary:
      "Fictional working proposal. No unmodeled policy consequence is claimed.",
    subjectClass: "general-policy",
    nonpartisan: pack.structure === "unicameral",
    votePlan,
    governorAction: null,
    governorRationale:
      "No executive disposition supplied; signature, veto and inaction remain separate unresolved outcomes.",
    // A placeholder proposal is about nothing the catalog asks.
    propositionKeys: [],
  };
}
export type * from "./legislation-scenario-types";
