import declarations from "../data/disasters/declarations.json" with { type: "json" };
import households from "../data/disasters/households.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import { gameStartDate } from "../game-start";
import { addDays } from "../kernel/dates";

type DeclarationRow = [string, string, number, number, number];
type TownFigures = [aid: number, damage: number, damagedHomes: number];

const screened = new Map<string, ReadonlySet<string>>();

/**
 * The town names of a state that FEMA's household figures show with damaged
 * homes in a disaster declared in the world's first year: a screen from the
 * records alone, so a test's draw that cannot have one is passed over
 * unopened. The opened world's own disasters decide.
 */
export function townsWithDamage(usps: string): ReadonlySet<string> {
  const known = screened.get(usps);
  if (known) return known;
  const start = gameStartDate();
  const end = addDays(start, 365);
  const byCounty = declarations.byCounty as unknown as Record<
    string,
    DeclarationRow[]
  >;
  const figures = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, TownFigures>
  >;
  const towns = new Set<string>();
  for (const [county, , state] of lookup.counties.rows as [
    string,
    string,
    string,
  ][]) {
    if (state !== usps) continue;
    for (const row of [
      ...(byCounty[county] ?? []),
      ...(byCounty[`${county.slice(0, 2)}000`] ?? []),
    ]) {
      if (row[1] <= start || row[1] > end) continue;
      for (const [town, [, , homes]] of Object.entries(
        figures[`${county}|${row[4]}`] ?? {},
      ))
        if (homes > 0) towns.add(town);
    }
  }
  screened.set(usps, towns);
  return towns;
}
