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

/** Status/memo register: quoted canonical intake and known evidence only.
 * Kernel IDs travel as action keys, never as player-facing prose. */
export function projectExecutiveWork(world: World) {
  const office = resolveExecutiveOffice(world);
  if (!office)
    return {
      available: false as const,
      reason: "No current supported executive office.",
      items: [],
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
            decision:
              step?.kind === "work-item" &&
              step.input.playerRequirement !== "none",
          },
        ];
      });
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        status: state.status,
        practices,
      };
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
