import {
  LEGISLATIVE_RULE_PACKS,
  candidacyAuthority,
  lifePlaceByKey,
  lifePlaceStateIdentities,
  requireLifePlace,
  searchLifePlaces,
  serializeWorld,
  deserializeWorld,
  type LifePlace,
} from "../simulation";
import { NATIONAL_PLACES_META } from "../simulation/national-places.generated";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "../simulation/municipal-government";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
  type NewGame,
  type NewGameSetup,
} from "./new-game";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * Geography for a new life.
 *
 * `DEFAULT_NEW_GAME_SETUP.placeKey` stays `kentucky` so old callers, encoded
 * replays and dedicated Kentucky fixtures keep the world they already named.
 * A fresh creator, a broadly named gameplay helper and a new ordinary-control
 * proof must name a locality (or an explicit statewide custom start) instead
 * of inheriting Lexington or the first town in a list.
 */

export const LEGACY_REPLAY_PLACE_KEY = "kentucky" as const;
export const KENTUCKY_LEXINGTON_REGRESSION_PLACE_KEY =
  "lexington-fayette" as const;

export type GeographyWorldOrigin =
  "explicit-creator" | "kentucky-regression-fixture" | "legacy-replay-default";

export interface ResolvedPlayGeography {
  readonly selectedStateJurisdictionKey: string | null;
  readonly selectedStateName: string | null;
  readonly selectedLocalityKey: string;
  readonly selectedLocalityDisplayName: string;
  readonly placeScope: LifePlace["scope"];
  readonly resolvedJurisdictionId: string;
  readonly resolvedJurisdictionName: string;
  readonly legislativeRulePackId: string | null;
  readonly legislativeRulePackName: string | null;
  readonly legislativeScenarioKey: string | null;
  readonly candidacyPackId: string | null;
  readonly candidacyScope: "local" | "state" | null;
  readonly discoveredOfficeKeys: readonly string[];
  readonly municipalGovernmentKey: string | null;
  readonly municipalRulePackId: string | null;
  readonly municipalRulePackAvailable: boolean;
  readonly placeSourceSha256: string;
  readonly worldOrigin: GeographyWorldOrigin;
}

export interface ExplicitNewGameInput {
  readonly placeKey: string;
  readonly seed: string;
  readonly worldOrigin?: GeographyWorldOrigin;
  readonly startKind?: NewGameSetup["startKind"];
  readonly startAge?: NewGameSetup["startAge"];
  readonly birthMonth?: NewGameSetup["birthMonth"];
  readonly birthDay?: NewGameSetup["birthDay"];
  readonly depth?: NewGameSetup["depth"];
  readonly startingLife?: NewGameSetup["startingLife"];
  readonly household?: NewGameSetup["household"];
  readonly givenName?: NewGameSetup["givenName"];
  readonly familyName?: NewGameSetup["familyName"];
  readonly gender?: NewGameSetup["gender"];
  readonly pronouns?: NewGameSetup["pronouns"];
  readonly questionnaire?: NewGameSetup["questionnaire"];
  readonly priors?: NewGameSetup["priors"];
}

export interface CreatorHometownRequest {
  readonly place?: string;
  readonly state?: string;
  readonly placeQuery?: string;
  readonly statewide?: boolean;
  readonly office?: boolean;
  readonly placeScope?: "state" | "county" | "locality";
}

export interface ExplicitCreatorHometown {
  readonly stateName: string;
  readonly stateJurisdictionKey: string;
  readonly usps: string;
  readonly statewide: boolean;
  readonly townQuery: string | null;
  readonly townMatch: string | null;
}

/** A new creator draft: same frame as the shipped defaults, no hidden place. */
export function freshNewGameSetup(seed: string): NewGameSetup {
  return { ...DEFAULT_NEW_GAME_SETUP, seed, placeKey: "" };
}

export function requireExplicitPlaceKey(
  placeKey: string | null | undefined,
): string {
  const key = placeKey?.trim() ?? "";
  if (key.length === 0) {
    throw new Error(
      "Choose a place the game can start a life in. Lexington is not assumed.",
    );
  }
  return key;
}

export function geographyWorldOriginForPlaceKey(
  placeKey: string,
  requested: GeographyWorldOrigin | undefined,
): GeographyWorldOrigin {
  if (requested) return requested;
  if (placeKey === KENTUCKY_LEXINGTON_REGRESSION_PLACE_KEY) {
    return "kentucky-regression-fixture";
  }
  if (placeKey === LEGACY_REPLAY_PLACE_KEY) return "legacy-replay-default";
  return "explicit-creator";
}

export function legislativeRulePackForState(
  stateJurisdictionKey: string | null,
) {
  if (!stateJurisdictionKey) return null;
  return (
    LEGISLATIVE_RULE_PACKS.find(
      (pack) => pack.jurisdictionKey === stateJurisdictionKey,
    ) ?? null
  );
}

export function resolvePlayGeography(
  placeKey: string,
  worldOrigin?: GeographyWorldOrigin,
): ResolvedPlayGeography {
  const key = requireExplicitPlaceKey(placeKey);
  const place = requireLifePlace(key);
  const state = lifePlaceStateIdentities().find(
    (entry) => entry.jurisdictionKey === place.stateJurisdictionKey,
  );
  const legislative = legislativeRulePackForState(place.stateJurisdictionKey);
  const authority = candidacyAuthority(place.context.jurisdiction.id);
  const municipal = municipalGovernmentForLifePlace(place);
  const municipalPack = municipal ? municipalRulePackFor(municipal) : null;
  return {
    selectedStateJurisdictionKey: place.stateJurisdictionKey,
    selectedStateName: state?.name ?? place.withinName,
    selectedLocalityKey: place.key,
    selectedLocalityDisplayName: place.displayName,
    placeScope: place.scope,
    resolvedJurisdictionId: place.context.jurisdiction.id,
    resolvedJurisdictionName: place.context.jurisdiction.name,
    legislativeRulePackId: legislative?.packId ?? null,
    legislativeRulePackName: legislative?.displayName ?? null,
    legislativeScenarioKey: place.capabilities.legislativeScenarioKey,
    candidacyPackId: authority.pack?.packId ?? null,
    candidacyScope: authority.scope,
    discoveredOfficeKeys: (authority.pack?.offices ?? []).map(
      (office) => office.officeKey,
    ),
    municipalGovernmentKey: municipal?.key ?? null,
    municipalRulePackId:
      municipalPack?.ok === true ? municipalPack.pack.packId : null,
    municipalRulePackAvailable: municipalPack?.ok === true,
    placeSourceSha256: NATIONAL_PLACES_META.sourceSha256,
    worldOrigin: geographyWorldOriginForPlaceKey(key, worldOrigin),
  };
}

export function explicitNewGameSetup(
  input: ExplicitNewGameInput,
): NewGameSetup {
  const placeKey = requireExplicitPlaceKey(input.placeKey);
  if (!lifePlaceByKey(placeKey)) {
    throw new Error("Choose a place the game can start a life in.");
  }
  return {
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: input.startKind ?? "normal",
    startAge: input.startAge ?? DEFAULT_NEW_GAME_SETUP.startAge,
    ...(input.birthMonth === undefined || input.birthDay === undefined
      ? {}
      : { birthMonth: input.birthMonth, birthDay: input.birthDay }),
    depth: input.depth ?? DEFAULT_NEW_GAME_SETUP.depth,
    startingLife: input.startingLife ?? "ordinary-life",
    household: input.household ?? DEFAULT_NEW_GAME_SETUP.household,
    givenName: input.givenName ?? null,
    familyName: input.familyName ?? null,
    gender: input.gender ?? DEFAULT_NEW_GAME_SETUP.gender,
    pronouns: input.pronouns,
    questionnaire: input.questionnaire ?? "skipped",
    priors: input.priors ?? [],
    seed: input.seed,
    placeKey,
  };
}

export function kentuckyLexingtonRegressionSetup(
  input: Omit<ExplicitNewGameInput, "placeKey" | "worldOrigin">,
): NewGameSetup {
  return explicitNewGameSetup({
    ...input,
    placeKey: KENTUCKY_LEXINGTON_REGRESSION_PLACE_KEY,
    worldOrigin: "kentucky-regression-fixture",
  });
}

export function legacyReplayNewGameSetup(
  input: Omit<ExplicitNewGameInput, "placeKey"> & { placeKey?: string },
): NewGameSetup {
  return explicitNewGameSetup({
    ...input,
    placeKey: input.placeKey ?? LEGACY_REPLAY_PLACE_KEY,
    worldOrigin: "legacy-replay-default",
  });
}

export interface CreatedGeographyLife {
  readonly game: NewGame;
  readonly geography: ResolvedPlayGeography;
  readonly replay: string;
  readonly serialized: string;
}

export function createExplicitGeographyLife(
  input: ExplicitNewGameInput,
): CreatedGeographyLife {
  const setup = explicitNewGameSetup(input);
  const geography = resolvePlayGeography(setup.placeKey, input.worldOrigin);
  const game = createNewGameWorld(setup);
  if (game.place.key !== geography.selectedLocalityKey) {
    throw new Error(
      `Created life substituted ${game.place.key} for ${geography.selectedLocalityKey}.`,
    );
  }
  if (game.place.context.jurisdiction.id !== geography.resolvedJurisdictionId) {
    throw new Error("Created life substituted a different jurisdiction.");
  }
  return {
    game,
    geography,
    replay: encodeReplayDescriptor(setup),
    serialized: serializeWorld(game.world),
  };
}

export function reloadCreatedGeographyLife(
  created: CreatedGeographyLife,
): CreatedGeographyLife {
  const setup = decodeReplayDescriptor(created.replay);
  if (!setup) {
    throw new Error("Reload lost the encoded setup.");
  }
  if (setup.placeKey !== created.geography.selectedLocalityKey) {
    throw new Error("Reload substituted a different place.");
  }
  const world = deserializeWorld(created.serialized);
  return {
    ...created,
    game: { ...created.game, world, setup },
    geography: resolvePlayGeography(
      setup.placeKey,
      created.geography.worldOrigin,
    ),
  };
}

function namedState(name: string) {
  const needle = name.trim().toLowerCase();
  return lifePlaceStateIdentities().find(
    (state) =>
      state.name.toLowerCase() === needle ||
      state.usps.toLowerCase() === needle,
  );
}

/**
 * Browser and helper hometown resolution. A missing town is a missing town;
 * Kentucky, Lexington and the first listed city are never inferred.
 */
export function resolveExplicitCreatorHometown(
  life: CreatorHometownRequest,
): ExplicitCreatorHometown {
  if (life.placeScope === "county") {
    throw new Error("The creator offers no county start; choose a town.");
  }
  const statewideRequested =
    life.statewide === true || life.placeScope === "state";
  const placeName = life.place?.trim() ?? "";
  const stateFromPlace = placeName ? namedState(placeName) : undefined;
  const afterComma = placeName.includes(",")
    ? placeName.split(",")[1]?.trim()
    : undefined;
  const stateName =
    life.state?.trim() ||
    (stateFromPlace?.name ?? "") ||
    (afterComma && namedState(afterComma)?.name) ||
    "";
  if (!stateName) {
    throw new Error(
      "Name the state, then a town. Lexington and Kentucky are not assumed.",
    );
  }
  const state = namedState(stateName);
  if (!state) {
    throw new Error(`No canonical state named ${stateName}.`);
  }
  const statewide =
    statewideRequested ||
    (Boolean(stateFromPlace) && (life.office === true || statewideRequested));
  if (statewide) {
    return {
      stateName: state.name,
      stateJurisdictionKey: state.jurisdictionKey,
      usps: state.usps,
      statewide: true,
      townQuery: null,
      townMatch: null,
    };
  }
  if (stateFromPlace || !placeName) {
    throw new Error(
      `Choose a town in ${state.name}; a state name is not a hometown.`,
    );
  }
  const town = placeName.split(",")[0]?.trim() ?? "";
  if (town.length === 0) {
    throw new Error(`Choose a town in ${state.name}.`);
  }
  return {
    stateName: state.name,
    stateJurisdictionKey: state.jurisdictionKey,
    usps: state.usps,
    statewide: false,
    townQuery: life.placeQuery ?? town.slice(0, 8),
    townMatch: town,
  };
}

export function requireLocalityInState(
  stateJurisdictionKey: string,
  query: string,
): LifePlace {
  const hits = searchLifePlaces(query, 20, {
    stateJurisdictionKey,
    scope: "locality",
  });
  const exact = hits.find((place) =>
    place.displayName.toLowerCase().startsWith(query.toLowerCase()),
  );
  const chosen = exact ?? hits[0];
  if (!chosen) {
    throw new Error(
      `No locality matching ${query} in ${stateJurisdictionKey}.`,
    );
  }
  return chosen;
}

/** One sampled locality per state for cheap table proofs — not a player default. */
export function sampledProofLocalityForState(
  stateJurisdictionKey: string,
): LifePlace {
  const listed = searchLifePlaces("", 1, {
    stateJurisdictionKey,
    scope: "locality",
  });
  if (!listed[0]) {
    throw new Error(`No locality listed for ${stateJurisdictionKey}.`);
  }
  return listed[0];
}

export const ORDINARY_GEOGRAPHY_JOURNEYS = [
  { usps: "NE", town: "Lincoln", origin: "explicit-creator" as const },
  { usps: "AK", town: "Anchorage", origin: "explicit-creator" as const },
  { usps: "MN", town: "Minneapolis", origin: "explicit-creator" as const },
  { usps: "NV", town: "Carson City", origin: "explicit-creator" as const },
  { usps: "CA", town: "Sacramento", origin: "explicit-creator" as const },
] as const;

export function ordinaryControlCapabilities(game: NewGame) {
  const capabilities = resolvePlayerCapabilities(game.world);
  return {
    homePlaceKey: capabilities.homePlace?.key ?? null,
    homeJurisdictionId: capabilities.homePlace?.context.jurisdiction.id ?? null,
    legislation: capabilities.legislation,
    legislativeScenarioKey: capabilities.legislativeScenarioKey,
    office: capabilities.office,
    withheldLegislation:
      capabilities.withheld.find((entry) => entry.surface === "legislation")
        ?.reason ?? null,
    withheldOffice:
      capabilities.withheld.find((entry) => entry.surface === "office")
        ?.reason ?? null,
  };
}
