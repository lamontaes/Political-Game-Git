import { expect } from "vitest";

import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
  recordExecutiveAction,
} from "../simulation/legislation";
import { rulePackById } from "../simulation/legislature-rule-packs";
import { localOrdinanceGameRulePack } from "../simulation/local-ordinance-game-profile";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import { seatedChamberForPack } from "../simulation/governing/chamber-votes";
import type { GovernmentUnitIdentity } from "../simulation/government-units";
import {
  committeeMembers,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
  type AuthoredVoteCounts,
} from "../simulation/legislation-scenarios";
import { applyLegislativeStep } from "./legislation-session";
import { personName } from "../simulation/people";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import type { EntityId, World } from "../simulation/types";

/**
 * A fixture law, enacted through the canonical procedure.
 */
/** Canonical procedure with explicit supplied votes; not ordinary sponsor proof. */
export function enactLawFixture(
  world: World,
  jurisdiction: EntityId,
  unit: GovernmentUnitIdentity | null,
  questionKey: string,
  answer: "yes" | "no",
): World {
  const pack = unit
    ? localOrdinanceGameRulePack(unit)!
    : rulePackById(legislativePackForJurisdiction(jurisdiction)!.packId);
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  let next = introduceMeasure(world, {
    stableKey: `stamp-fixture:${questionKey}:${answer}`,
    jurisdictionId: jurisdiction,
    rulePackId: pack.packId,
    designation: "Stamp fixture 1",
    shortTitle: "Authored stamp fixture law",
    summary: "Explicit supplied-vote fixture.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  const bodies = pack.chambers.map((chamber) =>
    unit
      ? {
          chamberKey: chamber.chamberKey,
          chamberName: chamber.name,
          members: sittingLocalOfficers(next, unit)
            .filter((row) => !row.mayor)
            .map((row, ordinal) => ({
              memberKey: `${unit.id}:fixture-seat:${ordinal + 1}`,
              name: personName(next.people[row.personId]!),
              personId: row.personId,
              caucusLabel: "Authored fixture",
            })),
        }
      : seatedChamberForPack(
          next,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        )!.body,
  );
  const votePlan: Record<string, AuthoredVoteCounts> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find((row) => row.chamberKey === chamber.chamberKey)!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committeeMembers(body, committee.appointedMembers).length,
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const procedure: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: "signed",
    governorRationale: "Explicit supplied approval for the fixture.",
  };
  for (
    let i = 0;
    i < 50 && measurePosition(next, measureId).phase !== "enacted";
    i++
  ) {
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `Fixture law stopped at ${measurePosition(next, measureId).phase}`,
      );
    // The governor's own decision is the game's; this fixture supplies a
    // signature so the law can be put in force without waiting for it.
    next =
      step === "record-enactment"
        ? recordEnactment(next, {
            stableKey: `${measureId}:fixture-enactment`,
            measureId,
            effectiveAt: next.currentDate,
          })
        : step === "await-executive-decision"
          ? recordExecutiveAction(next, {
              stableKey: `${measureId}:fixture-signature`,
              measureId,
              action: "signed",
              rationale: "Explicit supplied approval for the fixture.",
            })
          : applyLegislativeStep(procedure, next, step).world;
  }
  expect(measurePosition(next, measureId).phase).toBe("enacted");
  return next;
}
