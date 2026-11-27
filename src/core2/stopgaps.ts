import { STOPGAP_FAMILIES } from "./stopgap-families";

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
  /** The part of the game that asked for the stand-in, where the id family is not enough (the story director's words and moments). */
  area?: string;
}

/** The one register: every family file under data/stopgaps/, in file-name order. */
export const STOPGAPS = Object.keys(STOPGAP_FAMILIES)
  .sort()
  .flatMap(
    (file) => STOPGAP_FAMILIES[file] as readonly StopgapEntry[],
  ) as readonly StopgapEntry[];
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

/**
 * The word banks' stand-ins, fired when a hand-written bank writes a line in
 * play, so a release can see they are still in use (audit 1, Oct 12).
 */
export const WORDS_STOPGAP_HITS = new Set<string>();
export function markWordsStopgap(id: string): void {
  stopgap(id, { stopgapHits: WORDS_STOPGAP_HITS });
}

export function openStopgapCount(
  rows: readonly StopgapEntry[] = STOPGAPS,
): number {
  return rows.filter((row) => row.status === "open").length;
}
