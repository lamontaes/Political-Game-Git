import {
  resolveExecutiveOffice,
  bindExecutiveWork,
} from "../simulation/executive-work-context";
import { executiveNextStep } from "../simulation/executive-work";
import {
  EXECUTIVE_GOVERNING_KERNELS,
  executiveGoverningCoverageReport,
} from "../simulation/executive-governing-kernel-bank";
import { workItemState } from "../simulation/time-work";
import type { World, EntityId } from "../simulation/types";

export type ExecutiveStatementKind = "instruction" | "sign" | "veto";

export interface ExecutiveWorkFact {
  readonly key: string;
  readonly text: string;
}

export interface ExecutiveRecordedStatement {
  readonly kind: "instruction" | "disposition";
  readonly text: string;
}

export interface ExecutiveWorkPractice {
  readonly id: string;
  readonly title: string;
  readonly facts: readonly ExecutiveWorkFact[];
  readonly complete: boolean;
  readonly disposition: boolean;
  readonly canVeto: boolean;
  readonly actionLabel: string;
  readonly decision: boolean;
  readonly measureId: EntityId | null;
  readonly measureDesignation: string | null;
  readonly measureActionSequence: number | null;
  readonly draftFingerprint: string;
  readonly rationaleUnavailable: string | null;
}

export interface ExecutiveWorkItemView {
  readonly id: EntityId;
  readonly title: string;
  readonly summary: string;
  readonly status: string;
  readonly recordedStatements: readonly ExecutiveRecordedStatement[];
  readonly practices: readonly ExecutiveWorkPractice[];
}

export function executiveDraftKey(
  itemId: EntityId,
  practiceId: string,
): string {
  return `${itemId}:${practiceId}`;
}

export function executiveDraftFingerprint(input: {
  readonly measureId: EntityId | null;
  readonly measureActionSequence: number | null;
  readonly facts: readonly ExecutiveWorkFact[];
}): string {
  return [
    input.measureId ?? "",
    input.measureActionSequence === null
      ? ""
      : String(input.measureActionSequence),
    ...input.facts.map((fact) => `${fact.key}=${fact.text}`),
  ].join("|");
}

export function composeExecutiveStatement(input: {
  readonly kind: ExecutiveStatementKind;
  readonly selectedFacts: readonly ExecutiveWorkFact[];
  readonly measureDesignation: string | null;
}):
  | { readonly ok: true; readonly statement: string }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  if (input.kind === "sign") {
    if (!input.measureDesignation)
      return {
        ok: false,
        reason: "No presented measure is recorded for signature.",
      };
    return {
      ok: true,
      statement: `The office signs ${input.measureDesignation} as presented.`,
    };
  }
  if (input.selectedFacts.length === 0)
    return {
      ok: false,
      reason:
        input.kind === "veto"
          ? "No recorded source-specific objection is selected for this measure."
          : "No recorded source-specific instruction is selected for this work.",
    };
  const grounds = input.selectedFacts.map((fact) => fact.text).join(" ");
  if (input.kind === "veto") {
    const designation = input.measureDesignation
      ? ` ${input.measureDesignation}`
      : " this measure";
    return {
      ok: true,
      statement: `The office returns${designation} with objections drawn from the recorded file: ${grounds}`,
    };
  }
  return {
    ok: true,
    statement: `Staff instruction drawn from the recorded file: ${grounds}`,
  };
}

export function selectedExecutiveFacts(
  facts: readonly ExecutiveWorkFact[],
  selectedFactKeys: readonly string[],
): readonly ExecutiveWorkFact[] {
  const allowed = new Set(facts.map((fact) => fact.key));
  return selectedFactKeys.flatMap((key) => {
    if (!allowed.has(key)) return [];
    const fact = facts.find((entry) => entry.key === key);
    return fact ? [fact] : [];
  });
}

function recordedStatementsForItem(
  world: World,
  itemId: EntityId,
  measureId: EntityId | null,
): readonly ExecutiveRecordedStatement[] {
  const relatedWorkIds = new Set(
    world.history.workItems
      .filter(
        (item) => item.id === itemId || item.sourceEntityIds.includes(itemId),
      )
      .map((item) => item.id),
  );
  const related = (type: string) =>
    world.history.events
      .filter(
        (event) =>
          event.type === type &&
          event.involvedEntityIds.some((id) => relatedWorkIds.has(id)),
      )
      .map((event) => ({
        kind: "instruction" as const,
        text: event.summary,
      }));
  const instructions = related("executive.work-instruction");
  const completions = related("executive.work-response");
  const dispositions = measureId
    ? (world.history.executiveDispositions ?? [])
        .filter((record) => record.measureId === measureId)
        .map((record) => ({
          kind: "disposition" as const,
          text: record.rationale,
        }))
    : [];
  return [...instructions, ...completions, ...dispositions];
}

function measureFocusId(
  item: World["history"]["workItems"][number],
): EntityId | null {
  if (item.focus.kind !== "legislative-material") return null;
  const prefix = "executive-work:measure:";
  return item.focus.targetKey.startsWith(prefix)
    ? (item.focus.targetKey.slice(prefix.length) as EntityId)
    : null;
}

/** Status/memo register: quoted canonical intake and known evidence only.
 * Kernel IDs travel as action keys, never as player-facing prose. */
export function projectExecutiveWork(world: World) {
  const office = resolveExecutiveOffice(world);
  if (!office)
    return {
      available: false as const,
      reason: "No current supported executive office.",
      items: [] as const satisfies readonly ExecutiveWorkItemView[],
    };
  const items = world.history.workItems
    .filter(
      (w) =>
        w.sourceEntityIds.includes(office.entry.id) &&
        (w.stableKey.startsWith("executive-inbox:") ||
          w.stableKey.endsWith(":arrived")),
    )
    .map((item) => {
      const state = workItemState(world, item.id);
      const measureId = measureFocusId(item);
      const measure = measureId
        ? (world.history.legislativeMeasures ?? []).find(
            (record) => record.id === measureId,
          )
        : undefined;
      const measureActionSequence = measureId
        ? ((world.history.legislativeActions ?? [])
            .filter((action) => action.measureId === measureId)
            .at(-1)?.sequence ?? null)
        : null;
      const practices = EXECUTIVE_GOVERNING_KERNELS.flatMap((definition) => {
        const next = executiveNextStep(world, item.id, definition.row.id);
        if (!next.ok) return [];
        const step = next.step;
        const facts = Object.entries(next.context.facts).map(([key, text]) => ({
          key,
          text,
        }));
        const disposition = step?.kind === "executive-disposition";
        const canVeto =
          disposition &&
          bindExecutiveWork(
            world,
            item.id,
            definition.row.id,
            "veto-with-message",
          ).ok;
        const decision =
          step?.kind === "work-item" && step.input.playerRequirement !== "none";
        const draftFingerprint = executiveDraftFingerprint({
          measureId: measure?.id ?? null,
          measureActionSequence,
          facts,
        });
        let rationaleUnavailable: string | null = null;
        if (decision && facts.length === 0)
          rationaleUnavailable =
            "No recorded source-specific instruction is available for this work.";
        if (canVeto && facts.length === 0)
          rationaleUnavailable =
            "No recorded source-specific objection is available for this measure.";
        if (disposition && !measure)
          rationaleUnavailable =
            "No presented measure is recorded for signature.";
        return [
          {
            id: definition.row.id,
            title: definition.row.title,
            facts,
            complete: step === null,
            disposition,
            canVeto,
            actionLabel:
              step?.kind === "scheduled-activity"
                ? "Open meeting"
                : step?.kind === "evidence-artifact"
                  ? "Read the memo"
                  : step?.kind === "future-due-item"
                    ? "Schedule follow-up in 7 days"
                    : "Continue office work",
            decision,
            measureId: measure?.id ?? null,
            measureDesignation: measure?.designation ?? null,
            measureActionSequence,
            draftFingerprint,
            rationaleUnavailable,
          } satisfies ExecutiveWorkPractice,
        ];
      });
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        status: state.status,
        recordedStatements: recordedStatementsForItem(
          world,
          item.id,
          measure?.id ?? null,
        ),
        practices,
      } satisfies ExecutiveWorkItemView;
    });
  return {
    available: true as const,
    officeTitle: office.pack.office.title,
    endsAt: office.endsAt,
    items,
  };
}

/** All seventy rows remain visible to delivery/QA, including exact bind gaps. */
export function executiveWorkCoverage(world: World, workItemId: EntityId) {
  return executiveGoverningCoverageReport().map((row) => {
    const bound = row.definition
      ? bindExecutiveWork(world, workItemId, row.id)
      : null;
    return {
      ...row,
      contextApplicable: bound?.ok ?? false,
      contextBlocker: bound && !bound.ok ? bound.reason : null,
    };
  });
}
