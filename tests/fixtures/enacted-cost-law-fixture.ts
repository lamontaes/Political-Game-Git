import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
} from "../../src/simulation/legislation";
import { rulePackById } from "../../src/simulation/legislature-rule-packs";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  votePlanKeyForConcurrence,
  type LegislativeProcedureContext,
} from "../../src/simulation/legislation-scenarios";
import { applyLegislativeStep } from "../../src/presentation/legislation-session";
import type {
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation/types";

/** Authored unanimous fixture ballots; canonical procedure, not natural passage. */
export function enactCostLawFixture(
  base: World,
  input: LegislativeMeasureRecord,
): { world: World; measure: LegislativeMeasureRecord } {
  const pack = rulePackById(input.rulePackId);
  if (!pack)
    throw new Error("The fixture needs an existing registered rule pack.");
  const on = input.introducedAt;
  let world = introduceMeasure(
    {
      ...base,
      currentDate: on,
      currentMoment: simulationMomentOnLocalDate(base.currentMoment, on),
    },
    input,
  );
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const votePlan: Record<string, { yea: number }> = {};
  const bodies = pack.chambers.map((chamber) => {
    if (chamber.seats.kind !== "known")
      throw new Error("Unknown chamber seats are unsupported in this fixture.");
    const members = Array.from({ length: chamber.seats.value }, (_, index) => ({
      memberKey: `${chamber.chamberKey}-fixture-seat-${index + 1}`,
      name: `Authored member ${index + 1}`,
      personId: null,
      caucusLabel: "Authored unanimous fixture",
    }));
    for (const committee of chamber.committees) {
      if (committee.appointedMembers === null)
        throw new Error(
          "Unknown committee seats are unsupported in this fixture.",
        );
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers,
      };
    }
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: members.length,
      };
    votePlan[votePlanKeyForConcurrence(chamber.chamberKey)] = {
      yea: members.length,
    };
    return {
      chamberKey: chamber.chamberKey,
      chamberName: chamber.name,
      members,
    };
  });
  const context: LegislativeProcedureContext = {
    pack,
    measureId: measure.id,
    bodies,
    committeeMemberCount: pack.chambers[0]!.committees[0]!.appointedMembers,
    votePlan,
    governorAction: "signed",
    governorRationale:
      "Explicit favorable decision in an authored cost fixture.",
  };
  for (let steps = 0; steps < 40; steps += 1) {
    if (measurePosition(world, measure.id).phase === "awaiting-enactment") {
      world = recordEnactment(world, {
        stableKey: input.stableKey + ":law",
        measureId: measure.id,
        effectiveAt: on,
      });
      const currentDate = makeIsoDate("2026-06-01");
      return {
        measure,
        world: {
          ...world,
          currentDate,
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            currentDate,
          ),
        },
      };
    }
    const step = availableMeasureSteps(world, measure.id).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `Unsupported fixture phase: ${measurePosition(world, measure.id).phase}`,
      );
    world = applyLegislativeStep(context, world, step).world;
  }
  throw new Error("The authored cost fixture did not reach enactment.");
}
