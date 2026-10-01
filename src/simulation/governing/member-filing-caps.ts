import table from "../../../data/research/legislature/member-bill-limits-2026.json" with { type: "json" };
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
  LegislativeSubjectClass,
} from "../types";

/** X5 owns the sourced rows. No row is an approved absence of a recorded cap. */
export interface MemberBillLimitRow {
  readonly place: string;
  readonly chamber: "house" | "senate" | "unicameral" | "joint";
  readonly limit: number | null;
  readonly period: "session" | "year" | "biennium" | null;
  readonly exempts: readonly string[];
  readonly status: "sourced" | "no-limit-found" | "unread";
  readonly citation: string;
  readonly url: string;
  readonly quote: string;
  readonly note: string;
}

export interface MemberBillLimitsTable {
  readonly version: "member-bill-limits-2026-v1";
  readonly rows: readonly MemberBillLimitRow[];
}

export interface MemberFilingCapInput {
  readonly place: string;
  readonly jurisdictionId: EntityId;
  readonly chamberKey: string;
  readonly sponsorPersonId: EntityId;
  readonly subjectClass: LegislativeSubjectClass;
  readonly introducedAt: IsoDate;
  readonly numberingSession: LegislativeMeasureNumberingSession;
  /** An actual recorded period, never inferred from odd/even calendar years. */
  readonly bienniumWindow?: { readonly start: IsoDate; readonly end: IsoDate };
}

export type MemberFilingCapDecision =
  | {
      readonly allowed: true;
      readonly reason:
        "no-recorded-cap" | "unread-cap" | "within-cap" | "exempt";
    }
  | {
      readonly allowed: false;
      readonly reason: "cap-reached" | "unbound-rule";
      readonly citation: string;
    };

const SUBJECT_CLASSES: readonly string[] = [
  "general-policy",
  "appropriation",
  "revenue",
];

export type MemberFilingCapMeasure = Pick<
  LegislativeMeasureRecord,
  | "jurisdictionId"
  | "sponsorPersonId"
  | "originChamberKey"
  | "introducedAt"
  | "subjectClass"
  | "numberingSession"
>;

function applicableChamber(
  row: MemberBillLimitRow,
  chamberKey: string,
): boolean {
  return (
    row.chamber === "joint" ||
    row.chamber === chamberKey ||
    (row.chamber === "unicameral" && chamberKey === "legislature")
  );
}

/** Read actual saved bill counts; no filing quota, scheduler or second chooser. */
export function memberFilingCap(
  measures: readonly MemberFilingCapMeasure[],
  input: MemberFilingCapInput,
  limits: MemberBillLimitsTable = table as MemberBillLimitsTable,
): MemberFilingCapDecision {
  if (limits.version !== "member-bill-limits-2026-v1")
    return {
      allowed: false,
      reason: "unbound-rule",
      citation: "Unrecognized member-bill limits table version.",
    };
  const rows = limits.rows.filter(
    (row) =>
      row.place === input.place && applicableChamber(row, input.chamberKey),
  );
  let applies = false;
  let exempt = false;
  for (const row of rows) {
    if (row.status !== "sourced" || row.limit === null) continue;
    applies = true;
    // The table's free text is not permission to guess a legal exemption.
    if (
      !Number.isSafeInteger(row.limit) ||
      row.limit < 0 ||
      !row.citation ||
      !row.url ||
      !row.quote ||
      row.exempts.some((value) => !SUBJECT_CLASSES.includes(value)) ||
      !row.period ||
      (row.period === "biennium" &&
        (!input.bienniumWindow ||
          input.bienniumWindow.start > input.introducedAt ||
          input.bienniumWindow.end < input.introducedAt))
    )
      return { allowed: false, reason: "unbound-rule", citation: row.citation };
    if (row.exempts.includes(input.subjectClass)) {
      exempt = true;
      continue;
    }
    const candidates = measures.filter(
      (measure) =>
        measure.jurisdictionId === input.jurisdictionId &&
        measure.sponsorPersonId === input.sponsorPersonId &&
        applicableChamber(row, measure.originChamberKey) &&
        measure.introducedAt <= input.introducedAt &&
        !row.exempts.includes(measure.subjectClass),
    );
    // A legacy measure with no recorded session cannot be silently counted as zero.
    if (
      row.period === "session" &&
      candidates.some((measure) => !measure.numberingSession)
    )
      return { allowed: false, reason: "unbound-rule", citation: row.citation };
    const count = candidates.filter((measure) => {
      if (row.period === "session")
        return measure.numberingSession!.key === input.numberingSession.key;
      if (row.period === "year")
        return (
          measure.introducedAt.slice(0, 4) === input.introducedAt.slice(0, 4)
        );
      return (
        measure.introducedAt >= input.bienniumWindow!.start &&
        measure.introducedAt <= input.bienniumWindow!.end
      );
    }).length;
    if (count >= row.limit)
      return { allowed: false, reason: "cap-reached", citation: row.citation };
  }
  return {
    allowed: true,
    reason: !applies
      ? rows.some((row) => row.status === "unread")
        ? "unread-cap"
        : "no-recorded-cap"
      : exempt
        ? "exempt"
        : "within-cap",
  };
}
