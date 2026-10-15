import lineItemRows from "./data/office-day/state-line-item-veto.json" with { type: "json" };
export interface ItemOverrideRule {
  readonly numerator: number;
  readonly denominator: number;
  readonly strict: boolean;
  readonly basis: "members" | "entitled" | "present" | "voting";
  readonly majorityMembers?: boolean;
}
export interface ItemVetoSelection {
  readonly index: number;
  /** The part of this appropriation increase left in effect; zero strikes it. */
  readonly remainingMinor: number;
}
export interface LineItemVetoRow {
  readonly lineItem: boolean;
  readonly scope:
    "appropriations-only" | "any-bill-with-appropriations" | "none";
  readonly reduce: boolean;
  readonly excludedLines?: readonly string[];
  readonly reductionExcludedLines?: readonly string[];
  readonly override: ItemOverrideRule;
  readonly reductionOverride?: ItemOverrideRule;
  readonly chamberMode: "separate" | "joint";
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly citation: string;
  readonly detailTag: "ESTIMATED";
}
const LINE_ITEM = lineItemRows as unknown as {
  places: Record<string, LineItemVetoRow>;
};

/** Whether a place's chief executive may strike items from a budget bill (data, cited). */
export function lineItemVetoOf(stateKey: string): LineItemVetoRow | null {
  return LINE_ITEM.places[stateKey] ?? null;
}

/** Exact legal fraction: decimal approximations must not add an extra vote. */
export function itemOverrideNeeded(
  rule: ItemOverrideRule,
  members: number,
  voting: number,
  present = members,
  entitled = members,
): number {
  const base =
    rule.basis === "voting"
      ? voting
      : rule.basis === "present"
        ? present
        : rule.basis === "entitled"
          ? entitled
          : members;
  const ratio = (base * rule.numerator) / rule.denominator;
  const required = rule.strict ? Math.floor(ratio) + 1 : Math.ceil(ratio);
  return Math.max(
    1,
    required,
    rule.majorityMembers ? Math.floor(entitled / 2) + 1 : 0,
  );
}
