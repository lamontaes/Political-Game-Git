import registry from "./data/stopgaps.json" with { type: "json" };
import type { StopgapEntry } from "../core2/stopgaps";

/** The director's own stopgap registry; open rows block release like the core's. */
export const DIRECTOR_STOPGAPS = registry as readonly StopgapEntry[];
const byId = new Map(DIRECTOR_STOPGAPS.map((row) => [row.id, row]));

/** Marks a stopgap as hit in the director's ledger; never touches core state. */
export function directorStopgap(id: string, hits: Set<string>): StopgapEntry {
  const row = byId.get(id);
  if (!row) throw new Error(`Unregistered director stopgap: ${id}`);
  if (row.status === "open") hits.add(id);
  return row;
}

export function openDirectorStopgapCount(
  rows: readonly StopgapEntry[] = DIRECTOR_STOPGAPS,
): number {
  return rows.filter((row) => row.status === "open").length;
}
