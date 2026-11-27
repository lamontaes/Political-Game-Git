/** The guard's world preparation (scripts/core2-guard/month.mjs), with a chosen start date. */
import { ageOnDate } from "../../../src/core2/kernel/dates";
import { enrichCivicInputs } from "../../../src/core2/civic-inputs";
import { initialFocusPeople } from "../../../src/core2/focus";
import { parameter } from "../../../src/core2/parameters";
import { buildPopulation, inHousehold } from "../../../src/core2/population";
import { gameStartDate } from "../../../src/core2/game-start";

export function prepareWorldAt(options: {
  seed: string;
  placeKey: string;
  startedAt?: string;
}) {
  const population = buildPopulation({
    seed: options.seed,
    placeKey: options.placeKey,
    startedAt: options.startedAt ?? gameStartDate(),
    minimumPeople: parameter("targetPopulation"),
    openingEmployment: true,
    scheduledWork: true,
  });
  let input = enrichCivicInputs(population);
  // The player starts in a household, never in group quarters.
  const household = inHousehold(input);
  const player = input.people
    .filter(
      (person) =>
        person.countyId &&
        person.jobId &&
        household(person) &&
        ageOnDate(person.birthDate, input.startedAt) >= parameter("votingAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!player)
    throw new Error("No eligible recorded adult worker in drawn place");
  input = { ...input, playerId: player.id };
  input = {
    ...input,
    focusPersonIds: [...initialFocusPeople(input)].sort(),
    focusPlaceIds: [],
    visiblePlaceIds: [player.placeId, player.countyId!].sort(),
  };
  return {
    input,
    place: {
      key: population.placeMetadata!.placeKey,
      name: population.placeMetadata!.placeName,
    },
  };
}
