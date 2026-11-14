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
  const placeId = placeIdOf(governmentId);
  const [kind, geoid] = placeId.split(":");
  if (!geoid || (kind !== "place" && kind !== "county")) return null;
  // A county's record is keyed "county:<geoid>"; a place's by its geoid alone.
  const place = corePlaceByKey(kind === "county" ? placeId : geoid);
  return place?.displayName.split(",")[0]?.trim() || null;
}

/**
 * The display rule keeps "la" and "de" small inside a name, but a name never
 * starts small: the first word, and the first after "of", take a capital
 * ("La Salle County", "City of La Canada Flintridge"). A word of capitals with
 * no vowel is an abbreviation and keeps them ("Washington DC").
 */
function nameStarts(said: string): string {
  const words = said.split(" ");
  return words
    .map((word, at) =>
      at === 0 || words[at - 1] === "of"
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : /^[B-DF-HJ-NP-TV-Z][b-df-hj-np-tv-z]$/.test(word)
          ? word.toUpperCase()
          : word,
    )
    .join(" ");
}

/** The listing's words said by the one display rule, and the place record's name when it is the same name. */
function namesOf(listed: string, governmentId: string, kind?: "county") {
  const county =
    kind === "county" || placeIdOf(governmentId).startsWith("county:");
  const said = nameStarts(
    governmentUnitDisplayName({
      name: listed,
      unitType: county ? "county" : "municipality",
    }),
  );
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
  unitType?: "county",
): string {
  const { said, kind } = namesOf(listed, governmentId, unitType);
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

/**
 * The kinds of government whose proper name ("County of Maui", "Charter
 * Township of Green") people say after the place ("Maui County", "Green
 * Township"). A town, city or village is said by its name alone.
 */
const SAID_AFTER_PLACE = ["County", "Parish", "Borough", "Township"] as const;

/**
 * A government's proper name as people say it in a sentence, the one rule
 * for the offices engine's body names and the speeches: "Charter Township of
 * Green" is "Green Township", "County of Maui" is "Maui County", "Town of
 * Groton" is "Groton". A legal form ahead of the kind ("Charter") is not said.
 */
export function governmentSaidName(proper: string): string {
  // A Puerto Rico municipality is listed "Moca Municipio" and said "Moca".
  const municipio = /^(.+) Municipio$/.exec(proper)?.[1];
  if (municipio) return municipio;
  const [, kind, name] = /^(?:Charter )?(\w+) of (.+)$/.exec(proper) ?? [];
  if (!kind || !name) return proper;
  return (SAID_AFTER_PLACE as readonly string[]).includes(kind)
    ? `${name} ${kind}`
    : name;
}
