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
}

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

const PLACES: readonly LifePlace[] = [
  {
    key: "kentucky",
    displayName: "Kentucky",
    formalName: null,
    withinName: "United States",
    context: KENTUCKY_CONTEXT,
    capabilities: { legislativeScenarioKey: "kentucky" },
  },
  {
    key: "nebraska",
    displayName: "Nebraska",
    formalName: null,
    withinName: "United States",
    context: NEBRASKA_CONTEXT,
    capabilities: { legislativeScenarioKey: "nebraska" },
  },
  {
    key: "alaska",
    displayName: "Alaska",
    formalName: null,
    withinName: "United States",
    context: ALASKA_CONTEXT,
    capabilities: { legislativeScenarioKey: "alaska" },
  },
  {
    key: "lexington-fayette",
    // Nobody who lives there calls it Lexington-Fayette. That is the merged
    // city-county's filing name, and the human playtest flagged it on the
    // setup screen as one of the places the game sounded like a database.
    // The formal label stays available for a legal or data view.
    displayName: "Lexington, Kentucky",
    formalName: "Lexington-Fayette, Kentucky",
    withinName: "Kentucky",
    context: LEXINGTON_DEMO_CONTEXT,
    // The accepted rule packs are written for state legislatures. Nothing in
    // the sources describes this city's own council, so it does not claim to.
    capabilities: { legislativeScenarioKey: null },
  },
];

const OUTSTANDING_DEPENDENCY =
  "A verified national place corpus. Until one is accepted, only the places above have a jurisdiction the game can place a life in.";

const PLAYER_NOTE =
  "More places will open up as the game learns them properly. It would rather offer a few real ones than a long list it cannot stand behind.";

export const acceptedLifePlaceProvider: LifePlaceProvider = {
  coverage() {
    return {
      kind: "accepted-context-set",
      placeCount: PLACES.length,
      supportsArbitrarySelection: false,
      outstandingDependency: OUTSTANDING_DEPENDENCY,
      playerNote: PLAYER_NOTE,
    };
  },
  list() {
    return PLACES;
  },
  byKey(key) {
    return PLACES.find((place) => place.key === key) ?? null;
  },
  byJurisdictionId(jurisdictionId) {
    return (
      PLACES.find(
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
