import {
  mayAnswerQuestion,
  type QuestionAuthorityFacts,
} from "./question-authority";
import { amendmentAdmissible } from "./amendment-rules";
import type { EntityId, PropositionAnswerRef } from "../../simulation/types";
import type { GovernmentUnitIdentity } from "../../simulation/government-units";
import type { CouncilRules } from "../../simulation/living-world/local-council-binding";
import type { homeLocalGovernmentUnits } from "../../simulation/nationwide-world/local-governments";
import type { InstitutionStepPlan } from "./institution-context";
import { applyInstitutionSessionEnd } from "./institution-context";
import {
  applyInstitutionStep,
  floorStageTakesAmendments,
  type InstitutionDriverFacts,
} from "./institution-driver";
import { measurePosition } from "./measure-replay";
import { chamberByKey } from "./pack-queries";
import { decideCouncilVote } from "./council-decision";
export interface CouncilSeatingFacts {
  readonly town: EntityId | null;
  readonly units: ReturnType<typeof homeLocalGovernmentUnits>;
  readonly seatedUnitIds: ReadonlySet<string>;
  readonly rulesByUnit: ReadonlyMap<string, CouncilRules | null>;
}
export function seatedCouncil(
  facts: CouncilSeatingFacts,
  playerPersonId: EntityId,
): {
  readonly unit: GovernmentUnitIdentity;
  readonly town: EntityId;
  readonly rules: CouncilRules;
} | null {
  void playerPersonId; // Facts already select this player’s home and admitted seats.
  const town = facts.town;
  if (!town) return null;
  const units = facts.units;
  for (const unit of [
    ...units.municipal,
    ...units.townships,
    ...units.counties,
  ]) {
    if (!facts.seatedUnitIds.has(unit.id)) continue;
    if (
      unit.unitType === "county" &&
      units.municipal.length + units.townships.length > 0
    )
      continue;
    if (unit.unitType === "township" && units.municipal.length > 0) continue;
    const rules = facts.rulesByUnit.get(unit.id);
    if (rules) return { unit, town, rules };
  }
  return null;
}
export interface CouncilSittingFacts extends InstitutionDriverFacts {
  readonly governmentKey: string;
  readonly lawJurisdictionId: EntityId;
  readonly councilMeasureIds: readonly EntityId[];
  readonly amendmentPrepared: boolean;
  readonly resultingPhase: string | null;
  readonly resultingKind: InstitutionStepPlan["kind"] | null;
  readonly questionAuthorityFacts: QuestionAuthorityFacts;
}
/** One member-sponsored item; the adapter rereads the World between items as the original sitting loop does. */
export function moveOrdinances(
  facts: CouncilSittingFacts,
  unit: GovernmentUnitIdentity,
  town: EntityId,
  rules: CouncilRules,
  player: EntityId | null,
): InstitutionStepPlan {
  if (facts.pack.chambers.length === 0 || !facts.pack.session.sessionLabel)
    return { kind: "idle" };
  const measure = facts.measure;
  if (
    measure.rulePackId !== rules.packId ||
    measure.jurisdictionId !== facts.lawJurisdictionId ||
    (player && measure.sponsorPersonId === player)
  )
    return { kind: "idle" };
  const phase = measurePosition(facts, measure.id).phase;
  if (phase !== "awaiting-referral" && phase !== "on-floor")
    return { kind: "idle" };
  if (phase === "on-floor" && measure.introducedAt >= facts.onDate)
    return { kind: "idle" };
  if (facts.resultingPhase !== null)
    return facts.resultingKind === "applied" &&
      facts.resultingPhase === "awaiting-enrollment"
      ? {
          kind: "applied",
          commands: [
            {
              command: "completeCouncilPassage",
              input: {
                measureId: measure.id,
                governmentKey: rules.governmentKey,
              },
            },
          ],
        }
      : { kind: "idle" };
  return applyInstitutionStep(facts, measure.id, {
    localCouncil: {
      governmentUnitId: unit.id,
      townJurisdictionId: town,
      playerPersonId: player,
    },
  });
}
/** One recorded District act, resumed on reread facts after each requested preparation. */
export function moveActs(facts: CouncilSittingFacts): InstitutionStepPlan {
  const measure = facts.measure;
  if (
    !facts.councilMeasureIds.includes(measure.id) ||
    facts.pack.chambers.length === 0 ||
    !facts.pack.session.sessionLabel ||
    (facts.playerPersonId &&
      measure.sponsorPersonId === facts.playerPersonId) ||
    measurePosition(facts, measure.id).terminal
  )
    return { kind: "idle" };
  const end = applyInstitutionSessionEnd(facts, measure.id);
  if (end) return end;
  const phase = measurePosition(facts, measure.id).phase;
  if (phase === "awaiting-referral")
    return {
      kind: "applied",
      commands: [
        {
          command: "placeMeasureOnCalendar",
          input: {
            stableKey: `${measure.stableKey}:agenda`,
            measureId: measure.id,
            rationale:
              "Placed before the Council for its first reading (no committee stage is modeled; placeholder).",
          },
        },
      ],
    };
  if (phase !== "on-floor" && phase !== "awaiting-override")
    return { kind: "idle" };
  const members = facts.localOfficers.filter((row) => !row.mayor),
    mayor = facts.localOfficers.find((row) => row.mayor)?.personId ?? null;
  if (!facts.preparationDone)
    return {
      kind: "prepare",
      commands: [
        {
          command: "ensureCouncilPrinciples",
          input: {
            personIds: [
              ...members.map((row) => row.personId),
              ...(mayor ? [mayor] : []),
            ],
          },
        },
      ],
    };
  if (phase === "on-floor") {
    const position = measurePosition(facts, measure.id),
      chamber = chamberByKey(facts.pack, "council"),
      stage = chamber.floorStages.find(
        (row) => row.stageKey === position.floorStageKey,
      );
    if (
      stage &&
      members.length > 0 &&
      members.every((seat) => facts.people.has(seat.personId)) &&
      (!position.earliestNextFloorDate ||
        position.earliestNextFloorDate <= facts.onDate) &&
      floorStageTakesAmendments(chamber, stage) &&
      !facts.amendmentPrepared
    )
      return {
        kind: "prepare",
        commands: [
          {
            command: "offerPlannedAmendment",
            input: {
              measureId: measure.id,
              chamber,
              stage,
              members: members.map((seat, index) => ({
                memberKey: `council:${index + 1}`,
                personId: seat.personId,
                name: facts.people.get(seat.personId)!.name,
                caucusLabel: facts.parties.get(seat.personId) ?? "No party",
              })),
              stableKey: `${measure.stableKey}:reading:${stage.stageKey}:amendment`,
              nonpartisan: false,
              admissible: (bill: typeof measure, part: PropositionAnswerRef) =>
                mayAnswerQuestion(
                  facts.questionAuthorityFacts,
                  bill.jurisdictionId,
                  part.propositionId,
                ) &&
                amendmentAdmissible(
                  facts.amendmentFacts,
                  facts.pack,
                  chamber.chamberKey,
                  bill,
                  part,
                ).admissible,
            },
          },
        ],
      };
  }
  const dispositions = decideCouncilVote(facts.councilVotes!, {
    stableKey: `${measure.stableKey}:${phase === "awaiting-override" ? "override" : "vote"}:${facts.onDate}`,
    measureId: measure.id,
    jurisdictionId: measure.jurisdictionId,
    members,
    playerPersonId: facts.playerPersonId,
    questionLabel:
      phase === "awaiting-override"
        ? `Reenact ${measure.designation} over the executive return`
        : `Pass ${measure.designation}`,
    executivePersonId: mayor,
    nonpartisan: false,
  });
  return {
    kind: "applied",
    commands: [
      {
        command:
          phase === "awaiting-override"
            ? "recordCouncilOverrideVote"
            : "recordCouncilReadingVote",
        input: {
          governmentKey: facts.governmentKey,
          measureId: measure.id,
          dispositions,
          provenance: {
            method: "member-decisions",
            note: "council-lawmaking/v1: each member decided their own ballot from their principles, their record, the ordinance's sponsor and the town's voters.",
            sourceEntityIds: [measure.id],
          },
        },
      },
    ],
  };
}
