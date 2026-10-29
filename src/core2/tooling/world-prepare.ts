/** The guard's world preparation (scripts/core2-guard/month.mjs), with a chosen start date. */
import { ageOnDate } from "../kernel/dates";
import { enrichCivicInputs } from "../civic-inputs";
import { initialFocusPeople } from "../focus";
import { parameter } from "../parameters";
import { buildPopulation } from "../population";
import { gameStartDate } from "../game-start";

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
  const player = input.people
    .filter(
      (person) =>
        person.countyId &&
        person.jobId &&
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
