// "Report a bug": what the game would hand over, and only when the player
// presses send. The report is the game's recent problems (the route that
// failed and what it said), the date in the game and the place's key; nothing
// about the player's people or saves. It is shown first (read-only, spends no
// time); sending is a separate act that returns the same report as a file for
// the player to attach. Nothing leaves the machine from here.
import type { CoreState } from "../core2/types";

const LIMIT = 200;
const problems: { at: string; route: string; message: string }[] = [];

/** The play server notes a request that failed, for the report. */
export function noteProblem(route: string, message: string): void {
  problems.push({ at: new Date().toISOString(), route, message });
  if (problems.length > LIMIT) problems.splice(0, problems.length - LIMIT);
}

export interface BugReport {
  readonly gameDate: string | null;
  readonly placeKey: string | null;
  readonly problems: readonly { at: string; route: string; message: string }[];
}

/** What would be sent. A read: it changes nothing. */
export function reportPreview(core: CoreState | undefined): BugReport {
  return {
    gameDate: core?.date ?? null,
    placeKey: core?.placeMetadata?.placeKey ?? null,
    problems: problems.slice(),
  };
}

/** The player pressed send: the same report, named as a file. */
export function reportToSend(core: CoreState | undefined) {
  const report = reportPreview(core);
  return {
    file: `bug-report-${new Date().toISOString().slice(0, 10)}.json`,
    report,
  };
}

/** For tests. */
export function clearProblems(): void {
  problems.length = 0;
}
