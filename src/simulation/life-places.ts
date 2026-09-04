import {
  ALASKA_CONTEXT,
  KENTUCKY_CONTEXT,
  NEBRASKA_CONTEXT,
} from "./legislation-scenarios";
import {
  LEXINGTON_DEMO_CONTEXT,
  type DemoJurisdictionContext,
} from "./demo-jurisdiction-context";
import type { EntityId } from "./types";

/**
 * Where a life can start.
 *
 * The game does not yet have a national place corpus. Rather than pretend
 * otherwise with a hand-written city list, this module states exactly which
 * places the accepted data can support and why, and hides the rest behind an
 * interface a real corpus can implement later without the setup screen or the
 * world builder changing.
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

export interface LifePlace {
  readonly key: string;
  /** What the player reads. Never a slug, an ID, or a fixture name. */
  readonly displayName: string;
  /** The wider place this one sits inside, when the data names one. */
  readonly withinName: string | null;
  readonly context: DemoJurisdictionContext;
  readonly capabilities: LifePlaceCapabilities;
}

/**
 * An honest statement of how much of the country the game can currently start
 * a life in. The completion report and the setup screen both read this rather
 * than claiming nationwide coverage.
 */
export interface LifePlaceCoverage {
  readonly kind: "accepted-context-set";
  readonly placeCount: number;
  /** True only once a real place corpus backs arbitrary selection. */
  readonly supportsArbitrarySelection: false;
  /**
   * The exact dependency still missing, in the words the completion report and
   * the tracker need. Not shown to a player.
   */
  readonly outstandingDependency: string;
  /** The same fact, said the way a player should hear it. */
  readonly playerNote: string;
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
      displayName: "Kentucky",
      withinName: "United States",
      context: KENTUCKY_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "kentucky",
        candidacyPackId: "us-ky-general-assembly-v1:candidacy",
      },
    },
    {
      key: "nebraska",
      displayName: "Nebraska",
      withinName: "United States",
      context: NEBRASKA_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "nebraska",
        candidacyPackId: "us-ne-legislature-v1:candidacy",
      },
    },
    {
      key: "alaska",
      displayName: "Alaska",
      withinName: "United States",
      context: ALASKA_CONTEXT,
      capabilities: {
        legislativeScenarioKey: "alaska",
        candidacyPackId: "us-ak-legislature-v1:candidacy",
      },
    },
    {
      key: "lexington-fayette",
      displayName: "Lexington-Fayette, Kentucky",
      withinName: "Kentucky",
      context: LEXINGTON_DEMO_CONTEXT,
      // The accepted rule packs are written for state legislatures. Nothing in
      // the sources describes this city's own council, so it does not claim to —
      // and for the same reason nobody can run for one here. A character can live
      // a whole life in this city; they cannot stand for an office the game has
      // never read the rules for.
      capabilities: { legislativeScenarioKey: null, candidacyPackId: null },
    },
  ];
  return places;
}

const OUTSTANDING_DEPENDENCY =
  "A verified national place corpus. Until one is accepted, only the places above have a jurisdiction the game can place a life in.";

const PLAYER_NOTE =
  "More places will open up as the game learns them properly. It would rather offer a few real ones than a long list it cannot stand behind.";

export const acceptedLifePlaceProvider: LifePlaceProvider = {
  coverage() {
    return {
      kind: "accepted-context-set",
      placeCount: allPlaces().length,
      supportsArbitrarySelection: false,
      outstandingDependency: OUTSTANDING_DEPENDENCY,
      playerNote: PLAYER_NOTE,
    };
  },
  list() {
    return allPlaces();
  },
  byKey(key) {
    return allPlaces().find((place) => place.key === key) ?? null;
  },
  byJurisdictionId(jurisdictionId) {
    return (
      allPlaces().find(
        (place) => place.context.jurisdiction.id === jurisdictionId,
      ) ?? null
    );
  },
};

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
