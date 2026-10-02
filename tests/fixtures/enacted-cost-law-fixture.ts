import {
  makeIsoDate,
  daysBetween,
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
import { recordWorldEvent } from "../../src/simulation/world";
import {
  playerRequiredWorkIds,
  releasePlayerRequiredWork,
} from "../../src/simulation/time-work";
import { enactThroughDesk } from "./enact-through-desk";
import { ensureStateExecutiveIncumbent } from "../../src/simulation/nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "../../src/simulation/governing/state-governing";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "../../src/simulation/character-history";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
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
  const on =
    input.introducedAt > base.currentDate
      ? input.introducedAt
      : base.currentDate;
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
    governorAction: null,
    governorRationale:
      "The fixture holder signs the bound matter through the real executive desk.",
  };
  for (let steps = 0; steps < 40; steps += 1) {
    if (measurePosition(world, measure.id).phase === "awaiting-executive") {
      if (
        !governorOfficeForJurisdiction(world, pack.jurisdictionKey)
          ?.holderPersonId
      ) {
        let subjectPersonId = world.personOrder[0];
        if (!subjectPersonId) {
          // An explicit fixture resident anchors the existing opening writer;
          // the actual incumbent and its tenure still come from that writer.
          const stableKey = `cost-fixture:executive-subject:${pack.jurisdictionKey}`;
          world = createCharacterHistoryContextPerson(world, {
            stableKey,
            givenName: "Fixture",
            familyName: "Resident",
            birthDate: makeIsoDate(
              `${Number(world.currentDate.slice(0, 4)) - 40}-01-01`,
            ),
            homeJurisdictionId: input.jurisdictionId,
          });
          subjectPersonId = characterHistoryContextPersonId(world, stableKey);
        }
        world = ensureStateExecutiveIncumbent(
          world,
          subjectPersonId,
          pack.jurisdictionKey.replace(/^US-/, ""),
        );
      }
      const originalControl = world.control;
      const holder = governorOfficeForJurisdiction(
        world,
        pack.jurisdictionKey,
      )!.holderPersonId;
      world = enactThroughDesk(world, measure.id, {
        effectiveAt: input.introducedAt,
      });
      if (
        originalControl.kind !== "person" ||
        originalControl.personId !== holder
      ) {
        // The signing consequence can open implementation work. Restore the
        // fixture's control through the existing handoff writer, leaving that
        // work with the actual officeholder rather than awaiting this player.
        const controlled: World = {
          ...world,
          control: { kind: "person", personId: holder },
        };
        const required = playerRequiredWorkIds(controlled, holder);
        if (required.length > 0) {
          const stableKey = `${input.stableKey}:executive-control-restored`;
          const handoff = recordWorldEvent(controlled, {
            stableKey,
            type: "test.control-moved",
            occurredAt: world.currentDate,
            recordedAt: world.currentDate,
            jurisdictionId: input.jurisdictionId,
            involvedEntityIds: [holder, ...required],
            participants: [],
            personFactConstraints: [],
            visibility: "private",
            tags: [],
            summary:
              "The cost fixture returns temporary executive control while the office retains its implementation work.",
            context: {
              location: null,
              socialContext: null,
              pressure: null,
              choice: null,
              motivation: null,
              immediateReaction: null,
            },
          });
          world = {
            ...releasePlayerRequiredWork(handoff, {
              personId: holder,
              stableKeyPrefix: `${stableKey}:released`,
              outcomeEventId: handoff.history.events.at(-1)!.id,
            }),
            control: originalControl,
          };
        }
      }
    }
    const phase = measurePosition(world, measure.id).phase;
    if (phase === "awaiting-enactment" || phase === "enacted") {
      if (phase === "awaiting-enactment")
        world = recordEnactment(world, {
          stableKey: input.stableKey + ":law",
          measureId: measure.id,
          effectiveAt: input.introducedAt,
        });
      const currentDate =
        world.currentDate > makeIsoDate("2026-06-01")
          ? world.currentDate
          : makeIsoDate("2026-06-01");
      return {
        measure,
        world:
          currentDate > world.currentDate
            ? passOrdinaryDays(
                world,
                daysBetween(world.currentDate, currentDate),
              )
            : world,
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
