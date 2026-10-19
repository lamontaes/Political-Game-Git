/**
 * The report a "Report a bug" button or the after-crash prompt would send.
 *
 * This only builds the report. Nothing here sends it: the screen shows the
 * player what is in it and sends it only when they press send (owner, Oct 12).
 * Pure TypeScript, no DOM and no network.
 */

import type { RuntimeBuildIdentity } from "./build-identity";

export const BUG_REPORT_MAX_LOG_LINES = 500;
export const BUG_REPORT_MAX_LINE_CHARS = 400;
export const BUG_REPORT_MAX_NOTE_CHARS = 2000;

export type BugReportKind = "player" | "crash";

export interface BugReportInput {
  readonly kind: BugReportKind;
  readonly identity: RuntimeBuildIdentity;
  /** ISO time the player pressed the button, or the crash was caught. */
  readonly createdAt: string;
  /** What the player typed, if anything. */
  readonly note?: string;
  /** The drawn place and the world seed, so the same world can be rebuilt. */
  readonly place?: { readonly name: string; readonly seed: string | number };
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
  };
  /** Recent log lines, oldest first. */
  readonly log: readonly string[];
}

export interface BugReport {
  readonly kind: BugReportKind;
  readonly build: string;
  readonly createdAt: string;
  readonly note: string;
  readonly place: { readonly name: string; readonly seed: string } | null;
  readonly error: {
    readonly name: string;
    readonly message: string;
    readonly stack: string;
  } | null;
  readonly log: readonly string[];
  /** How many older log lines were left out to stay within the cap. */
  readonly logLinesDropped: number;
}

const HOME_PATH = /(\/Users\/|\/home\/|[A-Za-z]:\\Users\\)[^/\\\s"']+/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Takes the player's account name and email addresses out of a line. */
export function scrubPrivateDetails(text: string): string {
  return text.replace(HOME_PATH, "$1<user>").replace(EMAIL, "<email>");
}

function cap(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function buildBugReport(input: BugReportInput): BugReport {
  const lines = input.log.map((line) =>
    cap(scrubPrivateDetails(line), BUG_REPORT_MAX_LINE_CHARS),
  );
  const kept = lines.slice(-BUG_REPORT_MAX_LOG_LINES);
  const { version, revisionShort, dirty } = input.identity;
  return {
    kind: input.kind,
    build: `v${version}+${revisionShort}${dirty ? ".dirty" : ""}`,
    createdAt: input.createdAt,
    note: cap(scrubPrivateDetails(input.note ?? ""), BUG_REPORT_MAX_NOTE_CHARS),
    place: input.place
      ? {
          name: scrubPrivateDetails(input.place.name),
          seed: String(input.place.seed),
        }
      : null,
    error: input.error
      ? {
          name: input.error.name,
          message: cap(
            scrubPrivateDetails(input.error.message),
            BUG_REPORT_MAX_LINE_CHARS,
          ),
          stack: cap(scrubPrivateDetails(input.error.stack ?? ""), 4000),
        }
      : null,
    log: kept,
    logLinesDropped: lines.length - kept.length,
  };
}

/** The exact text the player sees before pressing send, and what is sent. */
export function serializeBugReport(report: BugReport): string {
  return JSON.stringify(report, null, 2);
}
