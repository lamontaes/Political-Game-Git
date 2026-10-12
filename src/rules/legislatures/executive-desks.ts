import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  DecisionEvaluation,
} from "../../simulation/types";
import type { governingMatters } from "../../simulation/governing/state-governing";
import { measurePosition, type MeasureReplayFacts } from "./measure-replay";
import type { InstitutionCommand } from "./institution-context";
export interface PresidentDeskFacts extends MeasureReplayFacts {
  readonly presidentPersonId: EntityId | null;
  readonly playerPersonId: EntityId | null;
  readonly window: { readonly lastActionDate: IsoDate } | null;
  readonly principlesPrepared: boolean;
  readonly evaluation: DecisionEvaluation | null;
}
export function presidentDesk(
  facts: PresidentDeskFacts,
  measure: LegislativeMeasureRecord,
): readonly InstitutionCommand[] {
  if (measurePosition(facts, measure.id).phase !== "awaiting-executive")
    return [];
  const president = facts.presidentPersonId;
  if (!president) return [];
  if (
    (facts.window && facts.onDate > facts.window.lastActionDate) ||
    president === facts.playerPersonId
  )
    return [
      { command: "openPresidentBillMatter", input: { measureId: measure.id } },
    ];
  if (!facts.principlesPrepared)
    return [
      {
        command: "ensureOfficeholderPrinciples",
        input: { personIds: [president] },
      },
    ];
  if (facts.evaluation === null)
    return [
      {
        command: "evaluateGovernorBill",
        input: {
          stableKey: `${measure.stableKey}:president-desk`,
          governorId: president,
          executiveTitle: "President",
          measure,
          staff: null,
        },
      },
    ];
  const evaluation = facts.evaluation,
    commands: InstitutionCommand[] = [
      { command: "recordDurableDecisionTrace", input: { evaluation } },
    ];
  if (
    evaluation.selectedOptionKey !== "bill:sign" &&
    evaluation.selectedOptionKey !== "bill:return"
  )
    return commands;
  const action =
    evaluation.selectedOptionKey === "bill:sign" ? "signed" : "vetoed";
  const rationale = evaluation.context.considerations
    .filter((reason) => reason.optionKey === evaluation.selectedOptionKey)
    .map((reason) => reason.explanation)
    .join(" ");
  commands.push(
    {
      command: "recordGovernorDecisionOnMeasure",
      input: {
        measureId: measure.id,
        action,
        rationale,
        actorPersonId: president,
      },
    },
    { command: "scheduleInstitutionStep", input: { measureId: measure.id } },
  );
  return commands;
}
export interface CouncilDeskFacts extends MeasureReplayFacts {
  readonly playerPersonId: EntityId | null;
  readonly executivePersonId: EntityId | null;
  readonly councilMeasures: readonly LegislativeMeasureRecord[];
  readonly matterPrepared: boolean;
  readonly matters: ReturnType<typeof governingMatters>;
}
export function actOnCouncilMeasure(
  facts: CouncilDeskFacts,
  input: {
    readonly governmentKey: string;
    readonly measureId: EntityId;
    readonly decision: "sign" | "return";
    readonly reasons?: string;
  },
): {
  readonly ok: boolean;
  readonly reason?: string;
  readonly commands: readonly InstitutionCommand[];
} {
  const refuse = (reason: string) => ({ ok: false, reason, commands: [] });
  if (facts.playerPersonId === null)
    return refuse("Person control is required.");
  const measure = facts.councilMeasures.find(
    (row) => row.id === input.measureId,
  );
  if (!measure) return refuse("That measure is not before this council.");
  if (measurePosition(facts, measure.id).phase !== "awaiting-executive")
    return refuse("Nothing is waiting on the executive for this measure.");
  if (facts.executivePersonId !== facts.playerPersonId)
    return refuse("Only the person who holds the executive office acts on it.");
  if (!facts.matterPrepared)
    return {
      ok: true,
      commands: [
        {
          command: "openMunicipalBillMatter",
          input: { measure, governmentKey: input.governmentKey },
        },
      ],
    };
  const matter = facts.matters.find(
    (entry) =>
      entry.family === "bill" &&
      entry.measureId === measure.id &&
      entry.status === "open",
  );
  if (!matter) return refuse("No current executive desk holds this act.");
  return {
    ok: true,
    commands: [
      {
        command: "decideGoverningMatter",
        input: {
          matterId: matter.id,
          decision: input.decision === "sign" ? "bill:sign" : "bill:return",
          reasons: input.reasons,
        },
      },
    ],
  };
}
