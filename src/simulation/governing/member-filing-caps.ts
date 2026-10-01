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
  /** Quoted exceptions without an admitted saved-record binding. Never executable. */
  readonly unboundExemptions?: readonly string[];
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

export interface MemberLimitNotApplied {
  readonly citation: string;
  readonly quote: string;
  readonly message: "limit not applied: exemption unread";
}

export type MemberFilingCapDecision = (
  | {
      readonly allowed: true;
      readonly reason:
        | "no-recorded-cap"
        | "unread-cap"
        | "within-cap"
        | "exempt"
        | "exemption-unread";
    }
  | {
      readonly allowed: false;
      readonly reason: "cap-reached" | "unbound-rule";
      readonly citation: string;
    }
) & {
  readonly unboundExemptions?: readonly string[];
  readonly notAppliedLimits?: readonly MemberLimitNotApplied[];
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
  const unboundExemptions = [
    ...new Set(rows.flatMap((row) => row.unboundExemptions ?? [])),
  ];
  let applies = false;
  let exempt = false;
  const notAppliedLimits: MemberLimitNotApplied[] = [];
  const doNotApply = (row: MemberBillLimitRow) =>
    notAppliedLimits.push({
      citation: row.citation,
      quote: row.quote,
      message: "limit not applied: exemption unread",
    });
  const sourcedRows = rows.filter(
    (row) => row.status === "sourced" && row.limit !== null,
  );
  for (const row of rows) {
    if (row.status !== "sourced" || row.limit === null) continue;
    // CTO 10:30: a partially bound rule is not allowed to block an exempt bill.
    // Multiple conditional rows need an actual declared period/condition selector.
    // Quoted odd/even/session rules are not runnable predicates.
    if (
      sourcedRows.length > 1 ||
      row.unboundExemptions?.length ||
      row.exempts.some((value) => !SUBJECT_CLASSES.includes(value)) ||
      !row.period ||
      (row.period === "biennium" &&
        (!input.bienniumWindow ||
          input.bienniumWindow.start > input.introducedAt ||
          input.bienniumWindow.end < input.introducedAt))
    ) {
      doNotApply(row);
      continue;
    }
    if (
      !Number.isSafeInteger(row.limit) ||
      row.limit < 0 ||
      !row.citation ||
      !row.url ||
      !row.quote
    )
      return { allowed: false, reason: "unbound-rule", citation: row.citation };
    if (row.exempts.includes(input.subjectClass)) {
      applies = true;
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
    ) {
      doNotApply(row);
      continue;
    }
    applies = true;
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
      return {
        allowed: false,
        reason: "cap-reached",
        citation: row.citation,
        ...(unboundExemptions.length ? { unboundExemptions } : {}),
        ...(notAppliedLimits.length ? { notAppliedLimits } : {}),
      };
  }
  return {
    allowed: true,
    ...(unboundExemptions.length ? { unboundExemptions } : {}),
    ...(notAppliedLimits.length ? { notAppliedLimits } : {}),
    reason: !applies
      ? notAppliedLimits.length
        ? "exemption-unread"
        : rows.some((row) => row.status === "unread")
          ? "unread-cap"
          : "no-recorded-cap"
      : exempt
        ? "exempt"
        : "within-cap",
  };
}
