/** A generated opening in a place drawn from all 56, the same route as the speed guard's month. */
import { createHash } from "node:crypto";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../../simulation/life-places";
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { buildPopulation } from "../population";
import { buildDeepPast } from "../deep-past";
import { enrichCivicInputs } from "../civic-inputs";
import { buildOpeningPeerContacts } from "../opening-peer-network";
import { initialFocusPeople } from "../focus";
import { buildOpeningEconomy } from "../opening-economy";
import { collapseToTwoLevels } from "../residents";
import { parameter } from "../parameters";
import measurement from "../data/measurement.json" with { type: "json" };
import type { CoreInput } from "../types";

export interface DrawnPlace {
  seed: string;
  key: string;
  name: string;
  state: string;
}

/** Hash the seed, pick one of the 56 jurisdictions, then one recorded locality. */
export function drawPlace(seed: string, purpose: string): DrawnPlace {
  const hash = createHash("sha256").update(`${seed}:${purpose}`).digest("hex");
  const identities = [...lifePlaceStateIdentities()].sort((a, b) =>
    a.jurisdictionKey.localeCompare(b.jurisdictionKey),
  );
  if (identities.length !== 56)
    throw new Error("Place corpus must cover all 56 states and territories");
  const identity = identities[parseInt(hash.slice(0, 8), 16) % 56]!;
  const localities = [
    ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
      stateJurisdictionKey: identity.jurisdictionKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  if (!localities.length)
    throw new Error(`No recorded locality for ${identity.jurisdictionKey}`);
  const locality =
    localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
  return {
    seed: hash,
    key: locality.key,
    name: locality.displayName,
    state: identity.jurisdictionKey,
  };
}

/** Population, past, civic records, the player's peers and circle, then the economy. */
export function generatedOpening(
  place: DrawnPlace,
  options: { economy?: boolean; twoLevel?: boolean } = {},
): CoreInput {
  const population = buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: measurement.startedAt,
    minimumPeople: parameter("targetPopulation"),
    openingEmployment: true,
    scheduledWork: true,
  });
  let input = enrichCivicInputs(buildDeepPast(population));
  const start = makeIsoDate(input.startedAt);
  const player = input.people
    .filter(
      (person) =>
        person.countyId &&
        person.jobId &&
        ageOnDate(makeIsoDate(person.birthDate), start) >=
          parameter("benchmarkAdultMinimumAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!player) throw new Error("No eligible recorded adult worker");
  input = {
    ...buildOpeningPeerContacts(input, { personIds: [player.id] }).input,
    playerId: player.id,
  };
  input = {
    ...input,
    focusPersonIds: [...initialFocusPeople(input)].sort(),
    focusPlaceIds: [],
    visiblePlaceIds: [player.placeId, player.countyId!].sort(),
  };
  if (options.economy !== false) input = buildOpeningEconomy(input).input;
  return options.twoLevel ? collapseToTwoLevels(input) : input;
}
