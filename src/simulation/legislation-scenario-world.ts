/**
 * The standalone developer scenario: a whole demo world built around one
 * authored legislative scenario. Kept out of `legislation-scenarios.ts` so the
 * game's engines, which read only the procedure and the authored decisions,
 * never load the demo world builder (MEMORY-FLAT).
 */
import { createScenarioWorld } from "./demo";
import { introduceMeasure } from "./legislation";
import {
  AUTHORED_MEASURE_NOTICE,
  authoredScenario,
  authoredScenarioSeatCount,
  seatBodyForPack,
  type LegislativeScenario,
} from "./legislation-scenarios";
import { personName } from "./people";

/**
 * Builds a playable scenario: a seeded world, a seated legislature, and one
 * measure already filed and waiting for referral.
 */
export function createLegislativeScenario(
  scenarioKey: string,
): LegislativeScenario {
  const blueprint = authoredScenario(scenarioKey);
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
    seatBodyForPack(
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
