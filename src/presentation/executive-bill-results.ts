import {
  measureActions,
  measurePosition,
  requireMeasure,
  rulePackForMeasure,
} from "../simulation/legislation";
import {
  executiveBillActionWindow,
  overrideCount,
} from "../simulation/governing/governor-bill-decision";
import {
  governingMatters,
  governingOfficeForPerson,
} from "../simulation/governing/state-governing";
import type { EntityId, World } from "../simulation/types";

/** A read-only result. Predicted member support is never a recorded vote. */
export function projectExecutiveBillResults(world: World, personId: EntityId) {
  const office = governingOfficeForPerson(world, personId);
  if (!office) return [];
  return governingMatters(world, office.officeKey)
    .filter(
      (matter) =>
        matter.family === "bill" &&
        matter.measureId &&
        matter.holderPersonId === personId,
    )
    .map((matter) => {
      const measure = requireMeasure(world, matter.measureId!);
      const actions = measureActions(world, measure.id);
      const pack = rulePackForMeasure(world, measure.id);
      const forumLabel = (key: string) =>
        pack.chambers.find((chamber) => chamber.chamberKey === key)?.name ??
        (pack.executive.override.kind === "joint-session"
          ? pack.executive.override.forumName
          : "Recorded override forum");
      const forecast =
        matter.status === "open"
          ? overrideCount(world, measure, personId)
          : null;
      const overrideActions = actions.filter(
        (action) =>
          action.kind === "override-succeeded" ||
          action.kind === "override-failed" ||
          action.kind === "override-period-expired",
      );
      return {
        matterId: matter.id,
        measureId: measure.id,
        designation: measure.designation,
        shortTitle: measure.shortTitle,
        status: matter.status,
        phase: measurePosition(world, measure.id).phase,
        actionWindow:
          matter.status === "open"
            ? executiveBillActionWindow(world, measure)
            : null,
        overrideForecast: forecast
          ? {
              ...forecast,
              forums: forecast.forums.map((forum) => ({
                ...forum,
                label: forumLabel(forum.forumKey),
              })),
            }
          : null,
        overrideVotes: (world.history.legislativeVotes ?? [])
          .filter(
            (vote) =>
              vote.measureId === measure.id && vote.purpose === "veto-override",
          )
          .map((vote) => ({
            ...vote,
            forumLabel:
              vote.forum.kind === "joint-session"
                ? vote.forum.forumName
                : vote.forum.kind === "chamber"
                  ? forumLabel(vote.forum.chamberKey)
                  : "Recorded committee",
          })),
        overrideActions,
        itemVetoes: (world.history.itemVetoes ?? []).filter(
          (item) => item.measureId === measure.id,
        ),
        executiveActions: actions.filter(
          (action) => action.kind === "signed" || action.kind === "vetoed",
        ),
      };
    });
}
