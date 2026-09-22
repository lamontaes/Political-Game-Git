import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { legislativeWorkKey } from "./legislative-work-key";
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
import { makeIsoDate } from "./dates";
import {
  NATIONAL_PLACES_META,
  NATIONAL_PLACES_ROWS,
} from "./national-places.generated";
import {
  NATIONAL_COUNTIES_META,
  NATIONAL_COUNTIES_ROWS,
} from "./national-counties.generated";
import type { EntityId, Jurisdiction } from "./types";

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
export type LifePlaceScope = "state" | "locality" | "county";

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
  /** Separate geography scopes; neither corpus establishes membership joins. */
  readonly countyProvenance?: {
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
  const existingKeys = new Set(
    places.map((place) => place.stateJurisdictionKey),
  );
  places = [
    ...places,
    ...LEGISLATIVE_RULE_PACKS.filter(
      (pack) => !existingKeys.has(pack.jurisdictionKey),
    ).map((pack): LifePlace => {
      const state = STATES[pack.jurisdictionKey.slice(3)]!;
      const slug = `state-${pack.jurisdictionKey.toLowerCase()}-placeholder`;
      const id = createStableId("jurisdiction", `definition:${slug}`);
      return {
        key: `state:${pack.jurisdictionKey}`,
        scope: "state",
        stateJurisdictionKey: pack.jurisdictionKey,
        displayName: state.name,
        formalName: null,
        withinName: "United States",
        context: {
          jurisdiction: {
            id,
            slug,
            name: state.name,
            kind: "state-placeholder",
            parentName: "United States",
            provenance: {
              asOf: null,
              source: null,
              jurisdiction: id,
              status: "placeholder",
            },
          },
          initialMoment: {
            date: DEMO_START_DATE,
            minuteOfDay: 550,
            timeZone: state.timeZone,
            utcOffsetMinutes: state.utcOffsetMinutes,
          },
          creationSummary: `Seeded world in ${state.name}.`,
          goalScope: state.name,
          householdLocationLabel: `${state.name} home`,
        },
        capabilities: {
          legislativeScenarioKey: legislativeWorkKey(pack),
          candidacyPackId: `${pack.packId}:candidacy`,
        },
      };
    }),
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
let countyRows: readonly NationwideRow[] | null = null;
let countyPlaces: ReadonlyMap<string, LifePlace> | null = null;

const CENSUS_UNIT_TYPES =
  /\s+(?:city|town|village|borough|municipality|metro government|metropolitan government|consolidated government|unified government|urban county government)$/;

let countyNamesByUsps: ReadonlyMap<string, ReadonlySet<string>> | null = null;

function countyNamesFor(usps: string): ReadonlySet<string> {
  if (!countyNamesByUsps) {
    countyRows ??= JSON.parse(
      NATIONAL_COUNTIES_ROWS,
    ) as readonly NationwideRow[];
    const grouped = new Map<string, Set<string>>();
    for (const [, name, code] of countyRows) {
      const set = grouped.get(code) ?? new Set<string>();
      // The generated rows carry "Davidson County"; a merged place name
      // carries "Davidson". Store both so either spelling matches.
      set.add(name);
      set.add(name.replace(/\s+County$/, ""));
      grouped.set(code, set);
    }
    countyNamesByUsps = grouped;
  }
  return countyNamesByUsps.get(usps) ?? new Set<string>();
}

/**
 * The name a resident uses, derived from the Census label rather than a list.
 *
 * The Gazetteer already strips the unit type from ordinary places, but the
 * eight consolidated city-county rows keep theirs, so a player in Tennessee
 * read "Nashville-Davidson metropolitan government (balance), Tennessee" on
 * the home screen, on the parties screen, and inside the sentence that opens
 * their day. The same problem Lexington was fixed for by hand:
 * "Nobody who lives there calls it Lexington-Fayette."
 *
 * Three steps, each reversing a Census convention rather than guessing:
 * drop the "(balance)" bookkeeping tag; drop a trailing lowercase unit-type
 * phrase, which the Gazetteer writes in lower case so that "Kansas City" and
 * "New York city" stay distinguishable; and drop a merged county's name when
 * the counties corpus confirms it is a county of this same state. The formal
 * label is kept on `formalName`, so a legal or data view loses nothing and
 * search still matches it.
 */
export function residentPlaceName(censusName: string, usps: string): string {
  const withoutBalance = censusName.replace(/\s*\(balance\)\s*$/, "");
  const withoutUnit = withoutBalance.replace(CENSUS_UNIT_TYPES, "");
  const merged = /^(.*?)[-/](.+)$/.exec(withoutUnit);
  const head = merged?.[1];
  const suffix = merged?.[2];
  if (head === undefined || suffix === undefined) return withoutUnit;
  const tail = suffix.replace(/\s+County$/, "").trim();
  return countyNamesFor(usps).has(tail) ? head.trim() : withoutUnit;
}

let uspsByStateName: ReadonlyMap<string, string> | null = null;

/**
 * The town name inside a jurisdiction record, as a resident says it.
 *
 * A jurisdiction is the government, so its `name` is allowed to be the filing
 * name — the Lexington-Fayette Urban County Government is a real body with
 * that real name, and `run-a` asserts it. But a generated school, a household
 * label or anything else naming the place a person is FROM wants the
 * resident's name, and got "South Lexington-Fayette High School" from the
 * government's. Same three-step rule as `residentPlaceName`; the state comes
 * from the record's own parent.
 */
export function residentNameForJurisdiction(
  jurisdictionName: string,
  parentName: string | null,
): string {
  const suffix = parentName === null ? "" : `, ${parentName}`;
  const stem =
    suffix.length > 0 && jurisdictionName.endsWith(suffix)
      ? jurisdictionName.slice(0, jurisdictionName.length - suffix.length)
      : jurisdictionName;
  if (!uspsByStateName) {
    uspsByStateName = new Map(
      Object.entries(STATES).map(([code, state]) => [state.name, code]),
    );
  }
  const usps =
    parentName === null ? undefined : uspsByStateName.get(parentName);
  return usps === undefined
    ? stem.trim()
    : residentPlaceName(stem.trim(), usps).trim();
}

function nationwideCounties(): ReadonlyMap<string, LifePlace> {
  countyRows ??= JSON.parse(NATIONAL_COUNTIES_ROWS) as readonly NationwideRow[];
  countyPlaces ??= new Map(
    countyRows.map((row) => {
      const place = synthesizeNationwidePlace(row, "county");
      return [place.key, place];
    }),
  );
  return countyPlaces;
}

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
function synthesizeNationwidePlace(
  row: NationwideRow,
  scope: "locality" | "county" = "locality",
): LifePlace {
  const [geoid, displayName, usps] = row;
  const state = STATES[usps];
  // What a resident says, not what the Gazetteer files it under.
  const resident = residentPlaceName(displayName, usps);
  const named = `${resident}, ${stateName(usps)}`;
  const county = scope === "county";
  const jurisdictionId = county
    ? createStableId("jurisdiction", `national-county:${geoid}`)
    : nationwideJurisdictionId(geoid);
  const provenance = county ? NATIONAL_COUNTIES_META : NATIONAL_PLACES_META;
  // What the formal label is depends on which kind of place this is, and the
  // two answers were sharing one expression.
  //
  // A county's is the corpus row's own string. Its state is already carried on
  // `withinName`, so appending it duplicates the state and stops the field
  // being the exact string the source filed — which is the whole reason a
  // county row keeps one. "Baltimore city" is the record; "Baltimore city,
  // Maryland" is a sentence about it.
  //
  // A locality's keeps the state, as it has since towns were given the names
  // their residents use (`dabd9f5a`): there the formal label stands in for a
  // full postal identity a player may not recognize from the short name, and
  // `nationwide-places`, `dehardwire-place-binding` and `resident-place-name`
  // each pin it that way.
  const formal = county
    ? displayName
    : resident === displayName
      ? displayName
      : `${displayName}, ${stateName(usps)}`;
  return {
    key: county ? `county:${geoid}` : geoid,
    displayName: named,
    formalName: formal === named ? null : formal,
    withinName: stateName(usps),
    context: {
      jurisdiction: {
        id: jurisdictionId,
        slug: county ? `us-county-${geoid}` : `us-place-${geoid}`,
        name: named,
        kind: county ? "census-county" : "census-place",
        parentName: stateName(usps),
        provenance: {
          asOf: county ? makeIsoDate(provenance.asOf) : DEMO_START_DATE,
          source: provenance.source,
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
      creationSummary: county
        ? `Seeded world in ${named}, from the 2025 Census Gazetteer county identity; town unspecified.`
        : `Seeded world in ${named}, from the 2025 Census Gazetteer place identity.`,
      goalScope: named,
      householdLocationLabel: county ? `${named} (town unspecified)` : named,
    },
    scope,
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

/** Local name only — never the parent state — so in-state search cannot match every town. */
function localityLabelMatches(label: string, needle: string): boolean {
  if (needle.length === 0) return true;
  return label.toLowerCase().includes(needle);
}

function uspsFromStateJurisdictionKey(key: string): string | null {
  const match = /^US-([A-Z]{2})$/.exec(key);
  return match?.[1] ?? null;
}

let rowsByUsps: ReadonlyMap<string, readonly NationwideRow[]> | null = null;

function nationwideRowsByUsps(): ReadonlyMap<string, readonly NationwideRow[]> {
  if (rowsByUsps === null) {
    const grouped = new Map<string, NationwideRow[]>();
    for (const row of nationwideRows()) {
      const list = grouped.get(row[2]);
      if (list) list.push(row);
      else grouped.set(row[2], [row]);
    }
    rowsByUsps = grouped;
  }
  return rowsByUsps;
}

export interface LifePlaceStateIdentity {
  readonly usps: string;
  readonly jurisdictionKey: string;
  readonly name: string;
}

/** Canonical USPS / `US-KY` identities, not names recovered from place labels. */
export function lifePlaceStateIdentities(): readonly LifePlaceStateIdentity[] {
  return Object.entries(STATES)
    .map(([usps, state]) => ({
      usps,
      jurisdictionKey: `US-${usps}`,
      name: state.name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export interface LifePlaceSearchOptions {
  /**
   * Restrict results to this canonical state key (`US-AL`). Matching uses the
   * USPS code on the row / `stateJurisdictionKey` on an authored place, never
   * a state-name substring.
   */
  readonly stateJurisdictionKey?: string;
  /** When set, only that scope is returned. Locality search omits statewide rows. */
  readonly scope?: LifePlaceScope;
}

function authoredPlaceMatchesQuery(
  place: LifePlace,
  needle: string,
  stateKey: string | undefined,
): boolean {
  if (stateKey && place.stateJurisdictionKey !== stateKey) return false;
  if (!stateKey) return placeMatches(place, needle);
  const localName = place.withinName
    ? place.displayName.replace(
        new RegExp(`,\\s*${place.withinName}$`, "i"),
        "",
      )
    : place.displayName;
  return (
    localityLabelMatches(localName, needle) ||
    localityLabelMatches(place.formalName ?? "", needle)
  );
}

/** Whether a place is the one whose name was typed, rather than one containing it. */
function namesExactly(place: LifePlace, needle: string): boolean {
  if (needle.length === 0) return false;
  const name = place.displayName.toLowerCase();
  return (
    name === needle ||
    name.startsWith(`${needle},`) ||
    (place.formalName ?? "").toLowerCase() === needle
  );
}

/**
 * Search order: the place actually named first, then everything else by name.
 *
 * Ordering by display name alone is the reason a player who typed "Columbus"
 * in Ohio was offered Columbus Grove above Columbus — a space sorts before a
 * comma, so every longer name beginning with the query came first. Worse, the
 * limit is applied after the sort, so on a common name the place the player
 * typed could be cut from the page entirely.
 *
 * This only moves an exact name to the front. It does not pin an authored
 * hometown, and with no query (a state's whole list) nothing matches exactly,
 * so that listing stays alphabetical as before.
 */
function compareLifePlaceSearchOrder(
  left: LifePlace,
  right: LifePlace,
  needle: string,
): number {
  const leftExact = namesExactly(left, needle);
  const rightExact = namesExactly(right, needle);
  if (leftExact !== rightExact) return leftExact ? -1 : 1;
  const byName = left.displayName.localeCompare(right.displayName, "en", {
    sensitivity: "base",
  });
  if (byName !== 0) return byName;
  return left.key.localeCompare(right.key, "en");
}

/**
 * Places matching a search, merged from authored rows and the national corpus.
 *
 * Eligible rows are filtered, deduplicated, and ordered by player-facing name
 * before `limit` is applied. Authored hometowns such as Lexington are not
 * pinned to the front of a truncated page.
 *
 * A state filter is identity-based. An empty query with a state selected lists
 * that state's localities rather than recommending a default hometown.
 */
export function searchLifePlaces(
  query: string,
  limit = 20,
  options?: LifePlaceSearchOptions,
): readonly LifePlace[] {
  const needle = query.trim().toLowerCase();
  const stateKey = options?.stateJurisdictionKey;
  const usps = stateKey ? uspsFromStateJurisdictionKey(stateKey) : null;
  if (stateKey && !usps) return [];
  if (!stateKey && needle.length === 0) return [];

  const authoredGeoids = authoredSourceGeoidSet();
  const seen = new Set<string>();
  const matches: LifePlace[] = [];
  const take = (place: LifePlace) => {
    if (options?.scope && place.scope !== options.scope) return;
    if (stateKey && place.stateJurisdictionKey !== stateKey) return;
    if (seen.has(place.key)) return;
    seen.add(place.key);
    matches.push(place);
  };

  for (const place of allPlaces()) {
    if (authoredPlaceMatchesQuery(place, needle, stateKey)) take(place);
  }
  if (options?.scope !== "state") {
    const rows = usps
      ? (nationwideRowsByUsps().get(usps) ?? [])
      : nationwideRows();
    for (const row of rows) {
      if (authoredGeoids.has(row[0])) continue;
      if (usps) {
        if (!localityLabelMatches(row[1], needle)) continue;
      } else {
        const haystack =
          `${row[1]} ${stateName(row[2])} ${row[2]}`.toLowerCase();
        if (!haystack.includes(needle)) continue;
      }
      take(synthesizeNationwidePlace(row));
    }
    /*
     * Counties answer to the same filters as everything above. UI144's county
     * rows arrived after the state filter was written, and composed together a
     * town search inside Alabama listed Kentucky's counties.
     */
    for (const place of nationwideCounties().values()) {
      if (placeMatches(place, needle)) take(place);
    }
  }

  matches.sort((left, right) =>
    compareLifePlaceSearchOrder(left, right, needle),
  );
  return matches.slice(0, limit);
}

const OUTSTANDING_DEPENDENCY =
  "The national place identity is accepted (2025 Census Gazetteer, via PR #77), so a life can start in any place. What remains sourced for only a few states is the legislative rule pack; everywhere else plays as an ordinary life until a pack is accepted.";

const PLAYER_NOTE =
  "Search for a town, city, county or county equivalent. Choosing a county leaves your town unspecified.";

export const acceptedLifePlaceProvider: LifePlaceProvider = {
  coverage() {
    return {
      kind: "national-place-corpus",
      placeCount:
        allPlaces().length +
        NATIONAL_PLACES_META.recordCount +
        NATIONAL_COUNTIES_META.recordCount,
      supportsArbitrarySelection: true,
      outstandingDependency: OUTSTANDING_DEPENDENCY,
      playerNote: PLAYER_NOTE,
      provenance: {
        asOf: NATIONAL_PLACES_META.asOf,
        source: NATIONAL_PLACES_META.source,
        recordCount: NATIONAL_PLACES_META.recordCount,
      },
      countyProvenance: {
        asOf: NATIONAL_COUNTIES_META.asOf,
        source: NATIONAL_COUNTIES_META.source,
        recordCount: NATIONAL_COUNTIES_META.recordCount,
      },
    };
  },
  list() {
    return allPlaces();
  },
  byKey(key) {
    const authored = allPlaces().find((place) => place.key === key);
    if (authored) return authored;
    if (key.startsWith("county:")) return nationwideCounties().get(key) ?? null;
    const row = nationwideIndex().get(key);
    return row ? synthesizeNationwidePlace(row) : null;
  },
  byJurisdictionId(jurisdictionId) {
    const authored = allPlaces().find(
      (place) => place.context.jurisdiction.id === jurisdictionId,
    );
    if (authored) return authored;
    const county = [...nationwideCounties().values()].find(
      (place) => place.context.jurisdiction.id === jurisdictionId,
    );
    if (county) return county;
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
  options?: LifePlaceSearchOptions,
): readonly LifePlace[] {
  return searchLifePlaces(query, limit, options);
}

export function lifePlaces(): readonly LifePlace[] {
  return acceptedLifePlaceProvider.list();
}

/**
 * State identity for a pack's declared key, never a resident's locality.
 * Reuse established state identities. Where only the state reference exists,
 * retain its placeholder provenance without creating a playable place or
 * granting any legislative capability.
 */
export function stateJurisdictionForKey(key: string): Jurisdiction | null {
  const established = lifePlaces().find(
    (place) => place.scope === "state" && place.stateJurisdictionKey === key,
  );
  if (established) return established.context.jurisdiction;
  const state = /^US-[A-Z]{2}$/.test(key) ? STATES[key.slice(3)] : undefined;
  if (!state) return null;
  const slug = `state-${key.toLowerCase()}-placeholder`;
  const id = createStableId("jurisdiction", `definition:${slug}`);
  return {
    id,
    slug,
    name: state.name,
    kind: "state-placeholder",
    parentName: "United States",
    provenance: {
      asOf: null,
      source: null,
      jurisdiction: id,
      status: "placeholder",
    },
  };
}

/**
 * State jurisdiction slugs minted before this module owned the shape.
 *
 * The same state can arrive in a World along two paths that mint different
 * stable ids for it: the places corpus builds `state-us-ky-placeholder`, while
 * an authored legislative scenario builds `us-ky-commonwealth-placeholder`.
 * Both are correct records of the state; neither can be renamed, because the
 * id is derived from the slug and saved worlds carry it.
 *
 * So the two are reconciled by declaration rather than by changing either. Any
 * consumer asking "which state is this jurisdiction?" reads the slug and gets
 * the same answer for both, which is what lets a nationwide feature cross the
 * two paths without comparing display names — a name test silently fails the
 * moment two jurisdictions share one, and says nothing about identity.
 *
 * A new state jurisdiction does not belong here. It takes the corpus form.
 */
const AUTHORED_STATE_JURISDICTION_SLUGS: Readonly<Record<string, string>> = {
  "us-ky-commonwealth-placeholder": "US-KY",
  "us-ne-state-placeholder": "US-NE",
  "us-ak-state-placeholder": "US-AK",
};

/** The corpus form: `state-us-ky-placeholder`. */
const CORPUS_STATE_SLUG = /^state-(us-[a-z]{2})-placeholder$/;

/**
 * The state key a jurisdiction slug names, or null if the slug does not name a
 * state. A slug this module does not recognize is not a state by default:
 * unknown is unknown, never a guess at the nearest state.
 */
export function stateKeyForJurisdictionSlug(slug: string): string | null {
  const authored = AUTHORED_STATE_JURISDICTION_SLUGS[slug];
  if (authored) return authored;
  const corpus = CORPUS_STATE_SLUG.exec(slug);
  if (!corpus) return null;
  const key = corpus[1]!.toUpperCase();
  return STATES[key.slice(3)] ? key : null;
}

/**
 * The state key a jurisdiction record belongs to, whichever path minted it.
 * A locality is not its state, so a city record answers null.
 */
export function stateKeyForJurisdiction(
  jurisdiction: Pick<Jurisdiction, "slug">,
): string | null {
  return stateKeyForJurisdictionSlug(jurisdiction.slug);
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
