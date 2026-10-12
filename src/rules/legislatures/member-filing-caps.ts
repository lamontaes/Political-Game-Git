import type { IsoDate } from "../../simulation/types";
import type {
  MemberBillLimitRow,
  MemberFilingCapInput,
  MemberFilingCapMeasure,
  MemberFilingCapDecision,
  MemberBillLimitsTable,
  MemberLimitNotApplied,
} from "../../simulation/governing/member-filing-caps";
const SUBJECT_CLASSES: readonly string[] = [
  "general-policy",
  "appropriation",
  "revenue",
];

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

export function memberFilingCap(
  measures: readonly MemberFilingCapMeasure[],
  input: MemberFilingCapInput,
  limits: MemberBillLimitsTable,
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

// stopgapId: "SG-P14-legislatures-filing-fallbacks"
