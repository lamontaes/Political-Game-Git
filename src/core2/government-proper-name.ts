/**
 * A government's name as its place record spells it (Fable A, Nov 13: "a
 * government's name is said from the place record's own proper name ('City
 * of' plus 'McCall'), never by re-capitalizing the source's capitals").
 *
 * The government-units listing writes names in capitals only ("CITY OF
 * MCCALL", "COUNTY OF DEKALB"). The listing gives the kind of government
 * ("City of"); the place record gives the proper name ("McCall", "DeKalb
 * County"). Where the place record does not hold the same name, the listing's
 * own words are said by the one display rule, and `governmentWithoutProperName`
 * says which governments those are, so the data can be fixed.
 */
import { governmentUnitDisplayName } from "./gov-rules/government-unit-names";
import { corePlaceByKey } from "./place-lookup";
import { governmentUnit } from "./reference/government-units";

/** A government's place id ("place:<geoid>", "county:<geoid>"), from that id itself or from its listed unit's id. */
function placeIdOf(governmentId: string): string {
  const unit = governmentId.startsWith("gus")
    ? governmentUnit(governmentId)
    : null;
  if (!unit) return governmentId;
  if (unit.unitType === "county" && unit.countyGeoid)
    return `county:${unit.countyGeoid}`;
  return unit.placeGeoid ? `place:${unit.placeGeoid}` : governmentId;
}

/** The place record's own name for a government's id ("place:<geoid>", "county:<geoid>" or its listed unit's id). */
function recordedName(governmentId: string): string | null {
  const [kind, geoid] = placeIdOf(governmentId).split(":");
  if (!geoid || (kind !== "place" && kind !== "county")) return null;
  const place = corePlaceByKey(kind === "county" ? governmentId : geoid);
  return place?.displayName.split(",")[0]?.trim() || null;
}

/** The listing's words said by the one display rule, and the place record's name when it is the same name. */
function namesOf(listed: string, governmentId: string) {
  const county = placeIdOf(governmentId).startsWith("county:");
  const said = governmentUnitDisplayName({
    name: listed,
    unitType: county ? "county" : "municipality",
  });
  const recorded = recordedName(governmentId);
  if (!recorded) return { said, kind: null };
  // The listing drops a name's marks ("O FALLON" for "O'Fallon"), so the two
  // are matched by their letters: the record's letters must be the last words
  // of the listing's ("City of" and "McCall"; a county whole, "DeKalb County").
  const letters = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
  const words = said.split(" ");
  for (let at = words.length - 1; at >= 0; at -= 1) {
    const tail = letters(words.slice(at).join(" "));
    if (tail === letters(recorded))
      return { said, kind: words.slice(0, at).join(" ") };
    if (tail.length > letters(recorded).length) break;
  }
  return { said, kind: null };
}

/** A government's name as people write it, its proper name from its place record. */
export function governmentProperName(
  listed: string,
  governmentId: string,
): string {
  const { said, kind } = namesOf(listed, governmentId);
  const recorded = recordedName(governmentId);
  // A name already written in ordinary capitals ("Idaho") is kept as written.
  if (kind === null || !recorded)
    return listed === listed.toUpperCase() ? said : listed;
  return kind ? `${kind} ${recorded}` : recorded;
}

/** True when the place record holds no name that matches the listing, so the name is the listing's own words. */
export function governmentWithoutProperName(
  listed: string,
  governmentId: string,
): boolean {
  return namesOf(listed, governmentId).kind === null;
}
