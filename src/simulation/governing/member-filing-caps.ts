import table from "../../../data/research/legislature/member-bill-limits-2026.json" with { type: "json" };
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
  LegislativeSubjectClass,
  LegislativeMeasureOrigin,
} from "../types";

export type MemberLimitBinding =
  | {
      readonly kind: "subject";
      readonly subjectClass: LegislativeSubjectClass;
      readonly text?: string;
    }
  | {
      readonly kind: "sponsor";
      readonly sponsorKind: LegislativeMeasureOrigin;
      readonly text?: string;
    }
  | {
      readonly kind: "period";
      readonly window: "session" | "year" | "biennium";
      readonly condition?:
        | {
            readonly kind: "calendar-year-parity";
            readonly of: "introducedAt";
            readonly parity: "odd" | "even";
          }
        | { readonly kind: "unbound"; readonly text: string };
    };

/** X5 owns the sourced rows. No row is an approved absence of a recorded cap. */
export interface MemberBillLimitRow {
  readonly place: string;
  readonly chamber: "house" | "senate" | "unicameral" | "joint";
  readonly limit: number | null;
  readonly period: "session" | "year" | "biennium" | null;
  readonly exempts: readonly string[];
  /** Quoted exceptions without an admitted saved-record binding. Never executable. */
  readonly unboundExemptions?: readonly string[];
  readonly exemptionBindings?: readonly MemberLimitBinding[];
  readonly applied?: boolean;
  readonly notAppliedReason?: string;
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
  readonly origin: LegislativeMeasureOrigin;
  readonly introducedAt: IsoDate;
  readonly numberingSession: LegislativeMeasureNumberingSession;
  /** An actual recorded period, never inferred from odd/even calendar years. */
  readonly bienniumWindow?: { readonly start: IsoDate; readonly end: IsoDate };
}

export interface MemberLimitNotApplied {
  readonly citation: string;
  readonly quote: string;
  readonly message: "limit not applied: exemption unread";
  readonly detail?: string;
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
  | "origin"
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

function rowCondition(
  row: MemberBillLimitRow,
  introducedAt: IsoDate,
): "yes" | "no" | "unbound" {
  const periods = (row.exemptionBindings ?? []).filter(
    (binding) => binding.kind === "period",
  );
  if (periods.length !== 1 || periods[0]!.window !== row.period)
    return "unbound";
  const condition = periods[0]!.condition;
  if (!condition) return "yes";
  if (
    condition.kind !== "calendar-year-parity" ||
    condition.of !== "introducedAt" ||
    (condition.parity !== "odd" && condition.parity !== "even")
  )
    return "unbound";
  const year = Number(introducedAt.slice(0, 4));
  if (!Number.isSafeInteger(year)) return "unbound";
  return (year % 2 === 1 ? "odd" : "even") === condition.parity ? "yes" : "no";
}

function bindingsReadable(row: MemberBillLimitRow): boolean {
  return (
    row.applied === true &&
    !row.unboundExemptions?.length &&
    row.exempts.every((value) => SUBJECT_CLASSES.includes(value)) &&
    (row.exemptionBindings ?? []).every(
      (binding) =>
        binding.kind === "period" ||
        (binding.kind === "subject" &&
          SUBJECT_CLASSES.includes(binding.subjectClass)) ||
        (binding.kind === "sponsor" &&
          [
            "member-introduction",
            "committee-introduction",
            "executive-request",
          ].includes(binding.sponsorKind)),
    )
  );
}

function exemptFromRow(
  row: MemberBillLimitRow,
  bill: Pick<MemberFilingCapMeasure, "subjectClass" | "origin">,
): boolean {
  return (
    row.exempts.includes(bill.subjectClass) ||
    (row.exemptionBindings ?? []).some(
      (binding) =>
        (binding.kind === "subject" &&
          binding.subjectClass === bill.subjectClass) ||
        (binding.kind === "sponsor" && binding.sponsorKind === bill.origin),
    )
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
  const notAppliedLimits: MemberLimitNotApplied[] = [];
  const ignoredExemptions: string[] = [];
  const doNotApply = (row: MemberBillLimitRow) => {
    notAppliedLimits.push({
      citation: row.citation,
      quote: row.quote,
      message: "limit not applied: exemption unread",
      ...(row.notAppliedReason ? { detail: row.notAppliedReason } : {}),
    });
    ignoredExemptions.push(...(row.unboundExemptions ?? []));
  };
  const usable: MemberBillLimitRow[] = [];
  for (const row of rows) {
    if (row.status !== "sourced" || row.limit === null) continue;
    const condition = rowCondition(row, input.introducedAt);
    // A known nonmatching period row is not a legal cap for this date.
    if (condition === "no") continue;
    if (
      condition === "unbound" ||
      !bindingsReadable(row) ||
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
    usable.push(row);
  }
  // Never pick a smaller/larger quota between competing unselected conditions.
  if (usable.length > 1) {
    usable.forEach(doNotApply);
    usable.length = 0;
  }
  const labels = () => ({
    ...(ignoredExemptions.length
      ? { unboundExemptions: [...new Set(ignoredExemptions)] }
      : {}),
    ...(notAppliedLimits.length ? { notAppliedLimits } : {}),
  });
  let applies = false;
  let exempt = false;
  for (const row of usable) {
    if (exemptFromRow(row, input)) {
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
        rowCondition(row, measure.introducedAt) === "yes" &&
        !exemptFromRow(row, measure),
    );
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
    if (count >= row.limit!)
      return {
        allowed: false,
        reason: "cap-reached",
        citation: row.citation,
        ...labels(),
      };
  }
  return {
    allowed: true,
    ...labels(),
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
