/**
 * The core's own place listing: the 56 jurisdictions and every locality in
 * each, read from data files under `data/places/` (and the authored places in
 * `data/research/`), never from the old `src/simulation` place module.
 *
 * Sources: the 2025 Census Gazetteer places and counties corpora (identity
 * only), a registered placeholder list of villages for the four territories
 * the Gazetteer omits, and the authored hometown rows. Names follow what a
 * resident says: the Census unit type, the "(balance)" tag and a merged
 * county name are dropped from the display name and kept on `formalName`.
 */
import authoredPlaces from "../../data/research/authored-life-places.json" with { type: "json" };
import {
  corePlaceByKey,
  corePlaceStateIdentities,
  type CorePlace,
} from "./place-lookup";
import countyNames from "./data/places/county-names.json" with { type: "json" };
import localityData from "./data/places/localities.json" with { type: "json" };
import states from "./data/places/states.json" with { type: "json" };
import territoryPlaces from "./data/places/territory-places.json" with { type: "json" };

export interface PlaceLocality {
  readonly key: string;
  readonly displayName: string;
  readonly formalName: string | null;
  readonly stateJurisdictionKey: string;
}

const CENSUS_UNIT_TYPES =
  /\s+(?:city|town|village|borough|municipality|metro government|metropolitan government|consolidated government|unified government|urban county government)$/;

const stateNames = states.states as Readonly<Record<string, string>>;
const countyNamesByUsps = countyNames.namesByUsps as Readonly<
  Record<string, readonly string[]>
>;

function stateName(usps: string): string {
  return stateNames[usps] ?? usps;
}

/** The name a resident uses, reversing the Census naming conventions. */
function residentName(censusName: string, usps: string): string {
  const withoutUnit = censusName
    .replace(/\s*\(balance\)\s*$/, "")
    .replace(CENSUS_UNIT_TYPES, "");
  const merged = /^(.*?)[-/](.+)$/.exec(withoutUnit);
  const head = merged?.[1];
  const suffix = merged?.[2];
  if (head === undefined || suffix === undefined) return withoutUnit;
  const tail = suffix.replace(/\s+County$/, "").trim();
  const known = (countyNamesByUsps[usps] ?? []).some(
    (name) => name === tail || name.replace(/\s+County$/, "") === tail,
  );
  return known ? head.trim() : withoutUnit;
}

/** The 56 jurisdiction keys (50 states, D.C. and five territories), sorted. */
export function placeStateKeys(): readonly string[] {
  return Object.keys(stateNames)
    .map((usps) => `US-${usps}`)
    .sort((a, b) => a.localeCompare(b));
}

let byState: Map<string, PlaceLocality[]> | null = null;

function buildIndex(): Map<string, PlaceLocality[]> {
  const index = new Map<string, PlaceLocality[]>();
  const seen = new Set<string>();
  const add = (place: PlaceLocality) => {
    if (seen.has(place.key)) return;
    seen.add(place.key);
    const list = index.get(place.stateJurisdictionKey);
    if (list) list.push(place);
    else index.set(place.stateJurisdictionKey, [place]);
  };
  const authoredGeoids = new Set<string>();
  for (const row of authoredPlaces) {
    if (row.scope !== "locality") continue;
    if ("sourceGeoid" in row && typeof row.sourceGeoid === "string")
      authoredGeoids.add(row.sourceGeoid);
    add({
      key: row.key,
      displayName: row.displayName,
      formalName: row.formalName ?? null,
      stateJurisdictionKey: row.stateJurisdictionKey,
    });
  }
  for (const [geoid, censusName, usps] of localityData.rows as [
    string,
    string,
    string,
  ][]) {
    if (authoredGeoids.has(geoid)) continue;
    const resident = residentName(censusName, usps);
    const displayName = `${resident}, ${stateName(usps)}`;
    const formal =
      resident === censusName
        ? censusName
        : `${censusName}, ${stateName(usps)}`;
    add({
      key: geoid,
      displayName,
      formalName: formal === displayName ? null : formal,
      stateJurisdictionKey: `US-${usps}`,
    });
  }
  // Island-area villages come from the Census 2020 Island Areas files.
  for (const [key, name, usps] of territoryPlaces.rows as [
    string,
    string,
    string,
    string | null,
  ][]) {
    add({
      key,
      displayName: `${name}, ${stateName(usps)}`,
      formalName: null,
      stateJurisdictionKey: `US-${usps}`,
    });
  }
  for (const list of index.values())
    list.sort((a, b) => a.key.localeCompare(b.key));
  return index;
}

/** Every locality in one jurisdiction, sorted by key. */
export function placeLocalities(
  stateJurisdictionKey: string,
): readonly PlaceLocality[] {
  byState ??= buildIndex();
  return byState.get(stateJurisdictionKey) ?? [];
}

let localities: readonly CorePlace[] | undefined;

/**
 * Every locality, state by state in the state identities' order, each state's
 * by name (case-insensitive) then key: the old search corpus's order, which
 * seeded place draws depend on (`place-lookup.test.ts` checks it).
 */
export function realLocalities(): readonly CorePlace[] {
  if (!localities)
    localities = corePlaceStateIdentities().flatMap((state) =>
      placeLocalities(state.jurisdictionKey)
        .map((row) => corePlaceByKey(row.key)!)
        .sort(
          (a, b) =>
            a.displayName.localeCompare(b.displayName, "en", {
              sensitivity: "base",
            }) || a.key.localeCompare(b.key, "en"),
        ),
    );
  return localities;
}

let stateByKey: Map<string, string> | null = null;

/** The jurisdiction key (e.g. "US-GA") of a recorded locality key. */
export function stateOfPlaceKey(key: string): string | undefined {
  if (!stateByKey) {
    stateByKey = new Map();
    for (const state of placeStateKeys())
      for (const row of placeLocalities(state)) stateByKey.set(row.key, state);
  }
  return stateByKey.get(key);
}
