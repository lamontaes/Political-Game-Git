import lineItemRows from "./data/office-day/state-line-item-veto.json" with { type: "json" };
export interface LineItemVetoRow {
  readonly lineItem: boolean;
  readonly scope:
    "appropriations-only" | "any-bill-with-appropriations" | "none";
  readonly reduce: boolean;
  readonly overrideShare: number;
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
