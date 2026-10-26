/**
 * What the law does when an elected term ends with no successor qualified,
 * by place and office family, from data/offices/holdover.json. A place with
 * no row of its own follows the family default, which carries its estimate.
 */
import holdover from "./data/offices/holdover.json" with { type: "json" };
import type { OfficeFamily } from "./elections-calendar";

export type HoldoverRule = "holds-over" | "vacant";

export interface HoldoverRow {
  readonly rule: HoldoverRule;
  readonly tag: "SOURCED" | "ESTIMATED";
  readonly citation?: string;
  readonly estimatedFrom?: string;
  readonly spread?: { readonly share: readonly number[]; readonly of: string };
  /** "place" when the place has its own row, "default" when the family default applies. */
  readonly basis: "place" | "default";
}

type Table = Readonly<Record<string, Omit<HoldoverRow, "basis"> | undefined>>;
const defaults = holdover.defaults as unknown as Table;
const places = holdover.places as unknown as Readonly<
  Record<string, Table | undefined>
>;

/** The holdover rule for an office family in a place (`US-<usps>` key). */
export function holdoverRule(
  placeKey: string,
  family: OfficeFamily,
): HoldoverRow {
  const own = places[placeKey]?.[family];
  if (own) return { ...own, basis: "place" };
  const row = defaults[family];
  if (!row) throw new Error(`no holdover default for office family ${family}`);
  return { ...row, basis: "default" };
}
