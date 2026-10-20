import registry from "./data/stopgaps.json" with { type: "json" };

export interface StopgapEntry {
  id: string;
  kind: string;
  file: string;
  line: number;
  whatItFakes: string;
  why: string;
  addedBy: string;
  addedAt: string;
  replacement: string;
  status: "open" | "resolved";
}

export const STOPGAPS = registry as readonly StopgapEntry[];
const byId = new Map(STOPGAPS.map((row) => [row.id, row]));

// The world being run: a marker called with no context (most module-level
// calls) records its hit here. Set each time a world's api is taken, so it is
// the world the current day belongs to; worlds are run one at a time.
let running: Set<string> | undefined;
export function recordStopgapsIn(hits: Set<string>): void {
  running = hits;
}

/** Explicit marker. Developer diagnostics collect hits in their own world. */
export function stopgap(
  id: string,
  context?: { stopgapHits: Set<string> },
): StopgapEntry {
  const row = byId.get(id);
  if (!row) throw new Error(`Unregistered stopgap: ${id}`);
  if (row.status === "open") (context?.stopgapHits ?? running)?.add(id);
  return row;
}

export function developerBanners(context: {
  stopgapHits: ReadonlySet<string>;
}) {
  return [...context.stopgapHits].sort().map((id) => ({
    color: "red" as const,
    ...stopgap(id),
  }));
}

export function assertReleaseReady(
  rows: readonly StopgapEntry[] = STOPGAPS,
): void {
  const open = rows.filter((row) => row.status === "open");
  if (open.length)
    throw new Error(
      open
        .map(
          (row) =>
            `Blocked: ${row.id}, ${row.whatItFakes} in ${row.file} line ${row.line}, added ${row.addedAt} by ${row.addedBy}, because ${row.why}. Replace with ${row.replacement}.`,
        )
        .join("\n"),
    );
}
