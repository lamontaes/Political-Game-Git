import {
  ALASKA_CONTEXT,
  KENTUCKY_CONTEXT,
  NEBRASKA_CONTEXT,
} from "./legislation-scenarios";
import {
  DEMO_START_DATE,
  LEXINGTON_DEMO_CONTEXT,
  type DemoJurisdictionContext,
} from "./demo-jurisdiction-context";
import { createStableId } from "./ids";
import {
  NATIONAL_PLACES_META,
  NATIONAL_PLACES_ROWS,
} from "./national-places.generated";
import type { EntityId } from "./types";

/**
 * Where a life can start.
 *
 * A life can begin anywhere in the country. The search runs over the accepted
 * national place identity PR #77 landed — every incorporated place and census
 * designated place in the 2025 Census Gazetteer — reached only through the
 * generated, browser-safe export in `national-places.generated.ts`, never by
 * importing the Node-only `src/source` substrate.
 *
 * A place carries only what the sources actually establish. A handful of states
 * have an accepted legislative rule pack and can be played with an office; every
 * other place is an ordinary life, because a city is not a state legislature and
 * the game does not invent one for it. That missingness is the point, not a gap
 * to be filled.
 */

/** What a place can offer beyond ordinary life, and on whose authority. */
export interface LifePlaceCapabilities {
  /**
   * The legislative rule pack this place plays under, when one has been
   * accepted for it. `null` means the game has no sourced procedure here, so
   * legislative surfaces stay unavailable rather than borrowing another
   * state's rules.
   */
  readonly legislativeScenarioKey: string | null;
  /**
   * The candidacy pack that says which offices are elected here and can be
   * stood for. `null` means no accepted source establishes an elected office in
   * this place, so nobody can file here and the game says so plainly rather
   * than lending the seat next door's rules.
   *
   * Declared rather than derived from the legislative key above. The two
   * happen to coincide today, but "we know how a bill moves here" and "we know
   * this seat is filled by election" are different claims with different
   * evidence, and a place should be able to have one without the other.
   */
  readonly candidacyPackId: string | null;
}

/**
 * How wide a place is.
 *
 * A state and a town inside it are both places a life can be lived, but they
 * are not the same kind of thing, and the setup screen must not let one be
 * mistaken for the other. `locality` is where somebody actually lives;
 * `state` is the whole state as its own entry.
 */
export type LifePlaceScope = "state" | "locality";

export interface LifePlace {
  readonly key: string;
  /**
   * What the player reads. Never a slug, an ID, or a fixture name.
   *
   * This is how somebody who lives there says where they live, which is not
   * always what the jurisdiction is legally called. A player told they are in
   * "Lexington-Fayette" is being shown a filing name; they live in Lexington.
   */
  readonly displayName: string;
  /**
   * The jurisdiction's formal name, where it differs from the one a resident
   * uses. Null when the two are the same.
   *
   * Kept beside the display name rather than instead of it so that a legal or
   * data view can still show the exact label the sources use, and so that
   * nothing has to guess which of the two a surface wanted.
   */
  readonly formalName: string | null;
  /** The wider place this one sits inside, when the data names one. */
  readonly withinName: string | null;
  readonly context: DemoJurisdictionContext;
  /**
   * Whether this entry is a whole state or a place inside one.
   *
   * Read by the setup screen so a search for "Kentucky" cannot return the
   * state and a city in it looking like the same kind of answer.
   */
  readonly scope: LifePlaceScope;
  /**
   * The state this place sits inside, keyed exactly as the accepted
   * legislative rule packs key their own jurisdiction — `US-KY`, `US-IL`.
   *
   * This is the canonical parent-state authority relationship, and it is a
   * declared field rather than something recovered from `withinName` at the
   * moment a decision is made. Living in a city does not put a character
   * outside their state, so this is what lets Lexington reach Kentucky's state
   * offices without any place ever borrowing a different state's rules.
   *
   * `null` only where no state governs the entry.
   */
  readonly stateJurisdictionKey: string | null;
  /**
   * What this place declares on its own authority.
   *
   * Local, in the strict sense: a city's own council, a city's own procedure.
   * State-level capability is not stored here — it is resolved through
   * `stateJurisdictionKey`, because a city does not own its state's rules and
   * copying them in would be the borrowing this design exists to prevent.
   */
  readonly capabilities: LifePlaceCapabilities;
  /**
   * When an authored place is the same jurisdiction as a national corpus row,
   * its GEOID, so the corpus copy is not offered as a duplicate beside it.
   */
  readonly sourceGeoid?: string;
}

/**
 * An honest statement of how much of the country the game can currently start
 * a life in. The completion report and the setup screen both read this rather
 * than claiming nationwide coverage.
 */
export interface LifePlaceCoverage {
  readonly kind: "accepted-context-set" | "national-place-corpus";
  readonly placeCount: number;
  /** True once a real place corpus backs arbitrary selection. */
  readonly supportsArbitrarySelection: boolean;
  /**
   * The exact dependency still missing, in the words the completion report and
   * the tracker need. Not shown to a player.
   */
  readonly outstandingDependency: string;
  /** The same fact, said the way a player should hear it. */
  readonly playerNote: string;
  /** Where the searchable places come from, so a data view can cite it. */
  readonly provenance?: {
    readonly asOf: string;
    readonly source: string;
    readonly recordCount: number;
  };
}

/**
 * The seam a national gazetteer plugs into. Everything downstream — setup,
 * world creation, save summaries — talks to this and not to the list below.
 */
export interface LifePlaceProvider {
  coverage(): LifePlaceCoverage;
  list(): readonly LifePlace[];
  byKey(key: string): LifePlace | null;
  byJurisdictionId(jurisdictionId: EntityId): LifePlace | null;
}

/**
 * Built on first use rather than at module load.
 *
 * The contexts below come from `legislation-scenarios`, which reaches the world
 * builder, which reaches the integrity pass, which now has a reason to ask
 * which offices a place supports — and that question comes back here. Reading
 * the contexts while that chain is still unwinding gets a binding that exists
 * but is not yet initialized, and the whole app fails to start. Deferring the
 * read to the first call means this module no longer cares what order anything
 * was loaded in, which is the property it should have had all along.
 */
let places: readonly LifePlace[] | null = null;

function allPlaces(): readonly LifePlace[] {
  places ??= [
    {
      key: "kentucky",
      scope: "state",
      stateJurisdictionKey: "US-KY",
      displayName: "Kentucky",
      formalName: null,
      withinName: "United States",
      context: KENTUCKY_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "kentucky",
        candidacyPackId: "us-ky-general-assembly-v1:candidacy",
      },
    },
    {
      key: "nebraska",
      scope: "state",
      stateJurisdictionKey: "US-NE",
      displayName: "Nebraska",
      formalName: null,
      withinName: "United States",
      context: NEBRASKA_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "nebraska",
        candidacyPackId: "us-ne-legislature-v1:candidacy",
      },
    },
    {
      key: "alaska",
      scope: "state",
      stateJurisdictionKey: "US-AK",
      displayName: "Alaska",
      formalName: null,
      withinName: "United States",
      context: ALASKA_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "alaska",
        candidacyPackId: "us-ak-legislature-v1:candidacy",
      },
    },
    {
      key: "lexington-fayette",
      scope: "locality",
      // A resident of Lexington is a Kentuckian. This is the fact that was
      // missing: the city carries no state rules of its own, and it does not
      // need to, because it sits inside a state that has them.
      stateJurisdictionKey: "US-KY",
      // Nobody who lives there calls it Lexington-Fayette. That is the merged
      // city-county's filing name, and the human playtest flagged it on the
      // setup screen as one of the places the game sounded like a database.
      // The formal label stays available for a legal or data view.
      displayName: "Lexington, Kentucky",
      formalName: "Lexington-Fayette, Kentucky",
      withinName: "Kentucky",
      context: LEXINGTON_DEMO_CONTEXT,
      // Nothing in the sources describes this city's own council, so it claims
      // no local office. That is a statement about Lexington's municipal
      // government and nothing else: the Kentucky General Assembly seats a
      // resident here can stand for arrive through the state above, not from
      // this line.
      capabilities: { legislativeScenarioKey: null, candidacyPackId: null },
      // The same jurisdiction the Census Gazetteer lists as "Lexington-Fayette",
      // so the corpus row is not offered as a second Lexington beside this one.
      sourceGeoid: "2146027",
    },
  ];
  return places;
}

/* -------------------------------------------------------------------------- */
/* The national corpus, reached only through the generated export             */
/* -------------------------------------------------------------------------- */

/**
 * State reference: the resident-facing name and a default game-clock timezone.
 *
 * This is standard postal and timezone reference, not a claim the place corpus
 * makes. The corpus establishes which state a place is in (its USPS code); this
 * names that state for a player and gives the simulation clock a sensible
 * standard-time default where a place is played as an ordinary life. A state
 * that spans zones is given its primary one; nothing here is presented to the
 * player as the exact civil time of a specific town.
 */
interface StateReference {
  readonly name: string;
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
}

const EASTERN = { timeZone: "America/New_York", utcOffsetMinutes: -300 };
const CENTRAL = { timeZone: "America/Chicago", utcOffsetMinutes: -360 };
const MOUNTAIN = { timeZone: "America/Denver", utcOffsetMinutes: -420 };
const PACIFIC = { timeZone: "America/Los_Angeles", utcOffsetMinutes: -480 };

const STATES: Readonly<Record<string, StateReference>> = {
  AL: { name: "Alabama", ...CENTRAL },
  AK: { name: "Alaska", timeZone: "America/Anchorage", utcOffsetMinutes: -540 },
  AZ: { name: "Arizona", timeZone: "America/Phoenix", utcOffsetMinutes: -420 },
  AR: { name: "Arkansas", ...CENTRAL },
  CA: { name: "California", ...PACIFIC },
  CO: { name: "Colorado", ...MOUNTAIN },
  CT: { name: "Connecticut", ...EASTERN },
  DE: { name: "Delaware", ...EASTERN },
  DC: { name: "District of Columbia", ...EASTERN },
  FL: { name: "Florida", ...EASTERN },
  GA: { name: "Georgia", ...EASTERN },
  HI: { name: "Hawaii", timeZone: "Pacific/Honolulu", utcOffsetMinutes: -600 },
  ID: { name: "Idaho", ...MOUNTAIN },
  IL: { name: "Illinois", ...CENTRAL },
  IN: { name: "Indiana", ...EASTERN },
  IA: { name: "Iowa", ...CENTRAL },
  KS: { name: "Kansas", ...CENTRAL },
  KY: { name: "Kentucky", ...EASTERN },
  LA: { name: "Louisiana", ...CENTRAL },
  ME: { name: "Maine", ...EASTERN },
  MD: { name: "Maryland", ...EASTERN },
  MA: { name: "Massachusetts", ...EASTERN },
  MI: { name: "Michigan", ...EASTERN },
  MN: { name: "Minnesota", ...CENTRAL },
  MS: { name: "Mississippi", ...CENTRAL },
  MO: { name: "Missouri", ...CENTRAL },
  MT: { name: "Montana", ...MOUNTAIN },
  NE: { name: "Nebraska", ...CENTRAL },
  NV: { name: "Nevada", ...PACIFIC },
  NH: { name: "New Hampshire", ...EASTERN },
  NJ: { name: "New Jersey", ...EASTERN },
  NM: { name: "New Mexico", ...MOUNTAIN },
  NY: { name: "New York", ...EASTERN },
  NC: { name: "North Carolina", ...EASTERN },
  ND: { name: "North Dakota", ...CENTRAL },
  OH: { name: "Ohio", ...EASTERN },
  OK: { name: "Oklahoma", ...CENTRAL },
  OR: { name: "Oregon", ...PACIFIC },
  PA: { name: "Pennsylvania", ...EASTERN },
  RI: { name: "Rhode Island", ...EASTERN },
  SC: { name: "South Carolina", ...EASTERN },
  SD: { name: "South Dakota", ...CENTRAL },
  TN: { name: "Tennessee", ...CENTRAL },
  TX: { name: "Texas", ...CENTRAL },
  UT: { name: "Utah", ...MOUNTAIN },
  VT: { name: "Vermont", ...EASTERN },
  VA: { name: "Virginia", ...EASTERN },
  WA: { name: "Washington", ...PACIFIC },
  WV: { name: "West Virginia", ...EASTERN },
  WI: { name: "Wisconsin", ...CENTRAL },
  WY: { name: "Wyoming", ...MOUNTAIN },
  PR: {
    name: "Puerto Rico",
    timeZone: "America/Puerto_Rico",
    utcOffsetMinutes: -240,
  },
};

type NationwideRow = readonly [
  geoid: string,
  displayName: string,
  stateUsps: string,
];

let parsedRows: readonly NationwideRow[] | null = null;
let rowsByGeoid: ReadonlyMap<string, NationwideRow> | null = null;

/** The corpus rows, parsed from the generated string exactly once. */
function nationwideRows(): readonly NationwideRow[] {
  if (parsedRows === null) {
    parsedRows = JSON.parse(NATIONAL_PLACES_ROWS) as readonly NationwideRow[];
  }
  return parsedRows;
}

function nationwideIndex(): ReadonlyMap<string, NationwideRow> {
  if (rowsByGeoid === null) {
    rowsByGeoid = new Map(nationwideRows().map((row) => [row[0], row]));
  }
  return rowsByGeoid;
}

/**
 * GEOIDs an authored place already stands for, kept out of corpus results.
 *
 * Computed on first use, not at module load, for the same load-order reason
 * `allPlaces()` is deferred: reaching the authored contexts while the world
 * module is still unwinding would leave the app blank.
 */
let authoredSourceGeoids: ReadonlySet<string> | null = null;

function authoredSourceGeoidSet(): ReadonlySet<string> {
  authoredSourceGeoids ??= new Set(
    allPlaces()
      .map((place) => place.sourceGeoid)
      .filter((geoid): geoid is string => geoid !== undefined),
  );
  return authoredSourceGeoids;
}

/**
 * Corpus jurisdiction identity back to its GEOID.
 *
 * The identity is derived from the GEOID, so this is a reverse of a pure
 * function rather than a second source of truth. Built once on first use, for
 * the same load-order reason the rest of this module defers its work.
 */
let geoidByJurisdictionId: Map<EntityId, string> | null = null;

function nationwideGeoidByJurisdictionId(): ReadonlyMap<EntityId, string> {
  if (geoidByJurisdictionId === null) {
    const index = new Map<EntityId, string>();
    for (const [geoid] of nationwideRows()) {
      index.set(nationwideJurisdictionId(geoid), geoid);
    }
    geoidByJurisdictionId = index;
  }
  return geoidByJurisdictionId;
}

/** The one place a corpus jurisdiction identity is derived. */
function nationwideJurisdictionId(geoid: string): EntityId {
  return createStableId("jurisdiction", `national-place:${geoid}`);
}

function stateName(usps: string): string {
  return STATES[usps]?.name ?? usps;
}

/**
 * A national corpus row, turned into a playable place.
 *
 * The jurisdiction identity is the Census Gazetteer's own, carried with its
 * provenance. The clock default comes from the state reference. No LOCAL
 * capability is granted: the accepted rule packs are state legislatures and a
 * corpus place is a town, so this town's own offices stay unsourced.
 *
 * Its state is another matter. The row carries its USPS code, so the place can
 * say which state it is in structurally rather than by reading its own label,
 * and a town in a state the game has a pack for can reach that state's offices.
 */
function synthesizeNationwidePlace(row: NationwideRow): LifePlace {
  const [geoid, displayName, usps] = row;
  const state = STATES[usps];
  const named = `${displayName}, ${stateName(usps)}`;
  const jurisdictionId = nationwideJurisdictionId(geoid);
  return {
    key: geoid,
    displayName: named,
    formalName: displayName === named ? null : displayName,
    withinName: stateName(usps),
    context: {
      jurisdiction: {
        id: jurisdictionId,
        slug: `us-place-${geoid}`,
        name: named,
        kind: "census-place",
        parentName: stateName(usps),
        provenance: {
          asOf: DEMO_START_DATE,
          source: NATIONAL_PLACES_META.source,
          jurisdiction: jurisdictionId,
          status: "approved",
        },
      },
      initialMoment: {
        date: DEMO_START_DATE,
        minuteOfDay: 9 * 60 + 10,
        timeZone: state?.timeZone ?? EASTERN.timeZone,
        utcOffsetMinutes: state?.utcOffsetMinutes ?? EASTERN.utcOffsetMinutes,
      },
      creationSummary: `Seeded world in ${named}, from the 2025 Census Gazetteer place identity.`,
      goalScope: named,
      householdLocationLabel: named,
    },
    scope: "locality",
    stateJurisdictionKey: `US-${usps}`,
    // This town's OWN offices are unsourced, and stay null until a source for
    // this jurisdiction is accepted. Whether its state has offices is answered
    // by the state key above, not here.
    capabilities: { legislativeScenarioKey: null, candidacyPackId: null },
    sourceGeoid: geoid,
  };
}

function placeMatches(place: LifePlace, needle: string): boolean {
  return [place.displayName, place.withinName ?? "", place.formalName ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

/**
 * Places matching a search, authored ones first and then the national corpus.
 *
 * The corpus scan is linear and bounded by `limit`, so a keystroke reads at
 * most a few results out of the thirty thousand rather than materializing them
 * all. This is the search the setup screen runs.
 */
export function searchLifePlaces(
  query: string,
  limit = 20,
): readonly LifePlace[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];
  const authored = allPlaces().filter((place) => placeMatches(place, needle));
  const results: LifePlace[] = [...authored];
  const authoredGeoids = authoredSourceGeoidSet();
  for (const row of nationwideRows()) {
    if (results.length >= limit) break;
    if (authoredGeoids.has(row[0])) continue;
    const haystack = `${row[1]} ${stateName(row[2])} ${row[2]}`.toLowerCase();
    if (haystack.includes(needle)) {
      results.push(synthesizeNationwidePlace(row));
    }
  }
  return results.slice(0, limit);
}

const OUTSTANDING_DEPENDENCY =
  "The national place identity is accepted (2025 Census Gazetteer, via PR #77), so a life can start in any place. What remains sourced for only a few states is the legislative rule pack; everywhere else plays as an ordinary life until a pack is accepted.";

const PLAYER_NOTE =
  "Search for any town, city or place in the country. A few states also have a legislature you can work in.";

export const acceptedLifePlaceProvider: LifePlaceProvider = {
  coverage() {
    return {
      kind: "national-place-corpus",
      placeCount: allPlaces().length + NATIONAL_PLACES_META.recordCount,
      supportsArbitrarySelection: true,
      outstandingDependency: OUTSTANDING_DEPENDENCY,
      playerNote: PLAYER_NOTE,
      provenance: {
        asOf: NATIONAL_PLACES_META.asOf,
        source: NATIONAL_PLACES_META.source,
        recordCount: NATIONAL_PLACES_META.recordCount,
      },
    };
  },
  list() {
    return allPlaces();
  },
  byKey(key) {
    const authored = allPlaces().find((place) => place.key === key);
    if (authored) return authored;
    const row = nationwideIndex().get(key);
    return row ? synthesizeNationwidePlace(row) : null;
  },
  byJurisdictionId(jurisdictionId) {
    const authored = allPlaces().find(
      (place) => place.context.jurisdiction.id === jurisdictionId,
    );
    if (authored) return authored;
    // A life started anywhere in the corpus has to be able to find its own
    // place again. Without this, every one of the nationwide places resolved to
    // null the moment anything asked what it could do, so a character living in
    // Chicago had no state above them and no capabilities at all.
    const geoid = nationwideGeoidByJurisdictionId().get(jurisdictionId);
    if (geoid === undefined) return null;
    const row = nationwideIndex().get(geoid);
    return row ? synthesizeNationwidePlace(row) : null;
  },
};

/** The searchable places for a query — the seam the setup screen consumes. */
export function lifePlaceSearch(
  query: string,
  limit?: number,
): readonly LifePlace[] {
  return searchLifePlaces(query, limit);
}

export function lifePlaces(): readonly LifePlace[] {
  return acceptedLifePlaceProvider.list();
}

export function lifePlaceByKey(key: string): LifePlace | null {
  return acceptedLifePlaceProvider.byKey(key);
}

export function lifePlaceByJurisdictionId(
  jurisdictionId: EntityId,
): LifePlace | null {
  return acceptedLifePlaceProvider.byJurisdictionId(jurisdictionId);
}

export function lifePlaceCoverage(): LifePlaceCoverage {
  return acceptedLifePlaceProvider.coverage();
}

export function requireLifePlace(key: string): LifePlace {
  const place = lifePlaceByKey(key);
  if (!place) throw new Error(`No place named '${key}' is available to play.`);
  return place;
}
