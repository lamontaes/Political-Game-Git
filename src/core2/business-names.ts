/**
 * Business names (owner, Oct 14): each kind of employer's name styles, in
 * order, from data: a local family's, the town's or the county's name with
 * the words Americans use on that kind of door. No real brands; a business
 * with other locations carries its first location's name, so chains grow
 * from local names. Read-only and pure.
 */
import names from "./data/business/names.json" with { type: "json" };
import { corePlaceByJurisdictionId } from "./place-lookup";
import { countyGovernmentUnitsForPlace } from "./reference/government-units";

export interface BusinessNameContext {
  readonly town: string;
  readonly state: string;
  /** The founder's family, or a family of the town's. */
  readonly family: string;
  /** The county's name, such as "Humphreys County". */
  readonly county: string;
}

const KINDS = names.kinds as Readonly<Record<string, readonly string[]>>;

/** A kind's name styles, its usual name first; none for a kind with no styles. */
export function businessNameStyles(kind: string): readonly string[] {
  return KINDS[kind] ?? [];
}

/** One style filled in for a business. */
export function fillBusinessName(
  style: string,
  context: BusinessNameContext,
): string {
  return style
    .replaceAll("{family}", context.family)
    .replaceAll("{town}", context.town)
    .replaceAll("{county}", context.county)
    .replaceAll("{state}", context.state);
}

/**
 * A new business's name: the first of its kind's styles that no business in
 * town already carries, in the styles' order; the usual style when all are
 * taken.
 */
export function businessName(
  kind: string,
  context: BusinessNameContext,
  taken: ReadonlySet<string>,
): string | undefined {
  const styles = businessNameStyles(kind);
  const filled = styles.map((style) => fillBusinessName(style, context));
  return filled.find((name) => !taken.has(name)) ?? filled[0];
}

/**
 * A county government's listed name as people say it: "COUNTY OF HUMPHREYS"
 * is "Humphreys County", "PARISH OF ORLEANS" is "Orleans Parish".
 */
export function countyDisplayName(listed: string): string {
  const title = (text: string) =>
    text
      .toLowerCase()
      .split(" ")
      .map((word) =>
        word === "and" || word === "of"
          ? word
          : word.replace(/(^|-)([a-z])/g, (found) => found.toUpperCase()),
      )
      .join(" ");
  const match = /^(.+?) OF (.+)$/.exec(listed.trim());
  return match ? `${title(match[2]!)} ${title(match[1]!)}` : title(listed);
}

/** The names a business in a place is named from, for a family. */
export function businessNameContext(
  placeId: string,
  family: string,
): BusinessNameContext {
  const place = corePlaceByJurisdictionId(placeId as never);
  const [town = family, state = ""] = (place?.displayName ?? "")
    .split(",")
    .map((part) => part.trim());
  const unit = place?.sourceGeoid
    ? countyGovernmentUnitsForPlace(place.sourceGeoid)[0]?.unit
    : undefined;
  return {
    town,
    state,
    family,
    county: unit ? countyDisplayName(unit.name) : town,
  };
}
