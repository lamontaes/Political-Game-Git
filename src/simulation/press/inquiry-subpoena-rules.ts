import rows from "../../../data/research/legislative-procedure/inquiry-subpoena-rules.json" with { type: "json" };

export type InquirySubpoenaBodyKind =
  "congressional-committee" | "state-legislature" | "state-ethics-board";

export type InquirySubpoenaRule = (typeof rows.rows)[number];

/** Subpoena baselines for the body kinds named in the investigation assignment. */
export function inquirySubpoenaRuleFor(
  bodyKind: InquirySubpoenaBodyKind,
): InquirySubpoenaRule {
  const row = rows.rows.find((candidate) => candidate.bodyKind === bodyKind);
  if (!row) throw new Error(`Missing subpoena rule for ${bodyKind}.`);
  return row;
}

/** Local subpoena authority is read from each compiled government's capability rows. */
export function municipalInquirySubpoenaRule(powers: readonly string[]): {
  readonly bodyKind: "municipal";
  readonly subpoenaPower: boolean;
  readonly basis: "compiled-municipal-capability";
} {
  return {
    bodyKind: "municipal",
    subpoenaPower: powers.includes("INQUIRY_SUBPOENA"),
    basis: "compiled-municipal-capability",
  };
}
