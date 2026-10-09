import { authoredJurisdictionContext } from "../simulation/jurisdiction-context";
import { authoredLegislativeBlueprints } from "../simulation/legislative-content";
import {
  AUTHORED_MEASURE_NOTICE,
  authoredScenarioSeatCount,
  seatBodyForPack as seatChamber,
} from "../simulation/legislative-content";
import type {
  SeatedBody,
  AuthoredVoteCounts,
} from "../simulation/legislation-scenario-types";
export * from "../simulation/legislative-content";
export type * from "../simulation/legislation-scenario-types";
import { createScenarioWorld } from "./demo";
import { introduceMeasure } from "../simulation/legislation";

import type { LegislativeRulePack } from "../simulation/legislature-rules";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation/types";

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

export const KENTUCKY_CONTEXT = authoredJurisdictionContext("KENTUCKY_CONTEXT");
export const NEBRASKA_CONTEXT = authoredJurisdictionContext("NEBRASKA_CONTEXT");
export const ALASKA_CONTEXT = authoredJurisdictionContext("ALASKA_CONTEXT");

export function createLegislativeScenario(
  scenarioKey: string,
): LegislativeScenario {
  const blueprint = authoredLegislativeBlueprints().find(
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
