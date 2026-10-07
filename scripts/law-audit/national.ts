import type { EntityId, World } from "../../src/simulation/types";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { stateJurisdictionOf } from "../../src/simulation/governing/law-in-force";
import { summarize, type AuditRow } from "./audit";

/** Enacting jurisdiction, not starting place. Federal rows are separate, never duplicated into state totals. */
export function nationalSummary(world: World, rows: readonly AuditRow[]) {
  const states = lifePlaceStateIdentities().map((state) => {
    const id = stateJurisdictionForKey(state.jurisdictionKey)?.id;
    const matching = rows.filter(
      (row) =>
        id !== undefined &&
        stateJurisdictionOf(row.jurisdictionId as EntityId) === id,
    );
    const levels: Record<string, ReturnType<typeof summarize>> = {};
    for (const level of new Set(
      matching.map(
        (row) =>
          world.jurisdictions[row.jurisdictionId as EntityId]?.kind ??
          row.level,
      ),
    ))
      levels[level] = summarize(
        matching.filter(
          (row) =>
            (world.jurisdictions[row.jurisdictionId as EntityId]?.kind ??
              row.level) === level,
        ),
      );
    return {
      ...state,
      ...summarize(matching),
      levels,
      zeroReason: matching.length
        ? null
        : "No enacted law observed in this jurisdiction during this run; selection/filing causes not established by this count.",
    };
  });
  const federal = rows.filter(
    (row) =>
      world.jurisdictions[row.jurisdictionId as EntityId]?.kind === "federal",
  );
  const unassigned = rows.filter(
    (row) =>
      world.jurisdictions[row.jurisdictionId as EntityId]?.kind !== "federal" &&
      !stateJurisdictionOf(row.jurisdictionId as EntityId),
  );
  return {
    states,
    federal: summarize(federal),
    unassigned: summarize(unassigned),
    national: summarize(rows),
  };
}
export function nationalTable(
  summary: ReturnType<typeof nationalSummary>,
): string {
  return [
    "| Jurisdiction | Laws | Proven effect rows | Unproven / limited | Levels |",
    "| --- | --- | --- | --- | --- |",
    ...summary.states.map(
      (row) =>
        `| ${row.name} (${row.jurisdictionKey}) | ${row.lawsAudited} | ${row.effectsFiring} | ${row.effectsMissing} | ${JSON.stringify(row.levels)} |`,
    ),
    `| Federal | ${summary.federal.lawsAudited} | ${summary.federal.effectsFiring} | ${summary.federal.effectsMissing} | Federal |`,
    `| Unassigned jurisdiction | ${summary.unassigned.lawsAudited} | ${summary.unassigned.effectsFiring} | ${summary.unassigned.effectsMissing} | Explicit gap |`,
    `| National total | ${summary.national.lawsAudited} | ${summary.national.effectsFiring} | ${summary.national.effectsMissing} | All observed levels |`,
  ].join("\n");
}
