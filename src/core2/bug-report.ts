/**
 * Bug and crash reports (M7-04, core side). A report carries the save (how
 * the world was made plus every player command), so whoever reads it can
 * replay the game to the same moment and see the same failure. The error and
 * the last public records give the context; nothing personal about the
 * player leaves the game.
 */
import { CORE_API_VERSION } from "./data";
import {
  loadGame,
  saveGame,
  type Game,
  type GameOptions,
  type SaveV1,
} from "./saves";
import type { IsoDate } from "./types";

export const BUG_REPORT_FORMAT = "core2-bug-report-v1";

export interface BugReportV1 {
  format: typeof BUG_REPORT_FORMAT;
  coreApiVersion: string;
  /** The game date the report was made on. */
  date: IsoDate;
  /** What the player wrote, if anything. */
  note?: string;
  error?: { name: string; message: string; stack?: string };
  /** The latest records the game logged, newest last (kind and date only). */
  recent: readonly { date: string; kind: string }[];
  save: SaveV1;
}

/** Make a report from a game, with the error that stopped it if there was one. */
export function bugReport(
  game: Game,
  input: { error?: unknown; note?: string; recentLimit?: number } = {},
): BugReportV1 {
  const error =
    input.error instanceof Error
      ? {
          name: input.error.name,
          message: input.error.message,
          ...(input.error.stack ? { stack: input.error.stack } : {}),
        }
      : input.error !== undefined
        ? { name: "Error", message: String(input.error) }
        : undefined;
  const limit = input.recentLimit ?? 50;
  const recent = [...game.core.durableLog.values()]
    .slice(-limit)
    .map((row) => ({ date: row.date, kind: row.kind }));
  return {
    format: BUG_REPORT_FORMAT,
    coreApiVersion: CORE_API_VERSION,
    date: game.core.date,
    ...(input.note ? { note: input.note } : {}),
    ...(error ? { error } : {}),
    recent,
    save: saveGame(game),
  };
}

/**
 * Replay a report: rebuild the world and replay the player's commands. When
 * the original failure happens again, it's returned as `reproduced`.
 */
export function replayBugReport(
  report: BugReportV1,
  options: GameOptions = {},
): { game?: Game; reproduced?: { name: string; message: string } } {
  if (report.format !== BUG_REPORT_FORMAT)
    throw new Error(`Unknown bug report format: ${String(report.format)}`);
  try {
    const game = loadGame(report.save, options);
    const failed = game.skipped.find(
      (row) => report.error && row.reason === report.error.message,
    );
    return failed
      ? { game, reproduced: { name: "Error", message: failed.reason } }
      : { game };
  } catch (error) {
    return {
      reproduced:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "Error", message: String(error) },
    };
  }
}
