import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import type { LifePlace } from "../simulation";

/**
 * Player-facing facts about a chosen start place.
 *
 * Only what accepted data actually supports. County names come from the Census
 * government-unit listing when that listing is bound to this place's GEOID —
 * they are county-area labels, not city population. Population, demographics
 * and voter breakdown stay absent until a sourced place-level series exists.
 *
 * The copy cleanup that removed `placeContextLines` (capability and
 * "exact place" commentary) must not delete this helper. Name and county are
 * the useful summary; they are not that commentary.
 */
export interface PlaceStartFact {
  readonly kind: "name" | "county";
  readonly text: string;
  readonly geography?: string;
  readonly asOf?: string;
}

function titleCaseCounty(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, (letter) => letter.toUpperCase());
}

export function placeStartFacts(place: LifePlace): readonly PlaceStartFact[] {
  const facts: PlaceStartFact[] = [{ kind: "name", text: place.displayName }];
  if (place.scope !== "locality") return facts;

  const government = municipalGovernmentForLifePlace(place);
  const countyName =
    government?.identity?.governmentUnit.countyAreaName?.trim();
  const asOf = government?.identity?.governmentUnit.evidence.asOf;
  if (countyName) {
    const text = titleCaseCounty(countyName);
    const alreadyNamed =
      place.displayName.toLowerCase().includes(text.toLowerCase()) ||
      (place.formalName ?? "").toLowerCase().includes(text.toLowerCase());
    if (!alreadyNamed) {
      facts.push({
        kind: "county",
        text,
        geography: "county area",
        asOf,
      });
    }
  }
  return facts;
}
