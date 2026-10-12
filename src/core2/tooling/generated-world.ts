/** A generated opening in a place drawn from all 56, the same route as the speed guard's month. */
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { buildPopulation } from "../population";
import { buildDeepPast } from "../deep-past";
import { enrichCivicInputs } from "../civic-inputs";
import { buildOpeningPeerContacts } from "../opening-peer-network";
import { initialFocusPeople } from "../focus";
import { buildOpeningEconomy } from "../opening-economy";
import { collapseToTwoLevels } from "../residents";
import { addOutsideMarket } from "../opening-outside-market";
import { parameter } from "../parameters";
import measurement from "../data/measurement.json" with { type: "json" };
import type { CoreInput } from "../types";

/** Population, past, civic records, the player's peers and circle, then the economy. */
export function generatedOpening(
  place: { seed: string; key: string },
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
  if (options.economy !== false)
    input = addOutsideMarket(buildOpeningEconomy(input).input);
  return options.twoLevel ? collapseToTwoLevels(input) : input;
}
