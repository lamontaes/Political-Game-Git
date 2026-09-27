import type { EntityId, IsoDate, World } from "../simulation";
import { CONGRESS_RESULTS_EVENT } from "../simulation/living-world/congress-turnover";
import { STATE_LEGISLATIVE_RESULTS_EVENT } from "../simulation/nationwide-world/state-legislature-turnover";

/** A public aggregate result as it was saved, without inferred seat results. */
export interface ObserverElectionSummary {
  readonly id: EntityId;
  readonly date: IsoDate;
  readonly jurisdictionId: EntityId | null;
  readonly jurisdiction: string | null;
  readonly kind: "Congress" | "State legislature";
  readonly summary: string;
}

export function observerElectionSummaries(
  world: World,
): readonly ObserverElectionSummary[] {
  const rows: ObserverElectionSummary[] = [];
  for (let index = world.history.events.length - 1; index >= 0; index -= 1) {
    const event = world.history.events[index]!;
    if (event.visibility !== "public") continue;
    const kind =
      event.type === CONGRESS_RESULTS_EVENT
        ? "Congress"
        : event.type === STATE_LEGISLATIVE_RESULTS_EVENT
          ? "State legislature"
          : null;
    if (!kind) continue;
    rows.push({
      id: event.id,
      date: event.occurredAt,
      jurisdictionId: event.jurisdictionId,
      jurisdiction: event.jurisdictionId
        ? (world.jurisdictions[event.jurisdictionId]?.name ?? null)
        : null,
      kind,
      summary: event.summary,
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function observerElectionSummaryPage(
  rows: readonly ObserverElectionSummary[],
  year: string,
  shown: number,
): {
  readonly entries: readonly ObserverElectionSummary[];
  readonly total: number;
} {
  const inYear = rows.filter((row) => row.date.slice(0, 4) === year);
  return { entries: inYear.slice(0, shown), total: inYear.length };
}
