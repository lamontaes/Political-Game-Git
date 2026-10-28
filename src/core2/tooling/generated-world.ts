/** A generated opening in a place drawn from all 56, the same route as the speed guard's month. */
import { ageOnDate, makeIsoDate } from "../kernel/dates";
import { withPrivateTuition } from "../opening-private-tuition";
import { staffToCustomers } from "../opening-staffing";
import { representativeSample } from "../representative-sample";
import { withPublicSchoolDistrict } from "../opening-public-schools";
import { buildPopulation } from "../population";
import { enrichCivicInputs } from "../civic-inputs";
import { initialFocusPeople } from "../focus";
import { buildOpeningEconomy } from "../opening-economy";
import { collapseToTwoLevels, fullPeople } from "../residents";
import { addOutsideMarket } from "../opening-outside-market";
import { parameter } from "../parameters";
import { gameStartDate } from "../game-start";
import type { CoreInput } from "../types";
import {
  checkSettings,
  applyOpeningSettings,
  scaleOutsideSales,
  type WorldSettings,
} from "../world-settings";

export function generatedOpening(
  place: { seed: string; key: string },
  options: {
    economy?: boolean;
    twoLevel?: boolean;
    settings?: WorldSettings;
    /** The opening date; the game's one start date by default (src/core2/game-start.ts). */
    startedAt?: string;
    /** Opt-in: staff each business to what its customers buy (src/core2/opening-staffing.ts). */
    staffToCustomers?: boolean;
  } = {},
): CoreInput {
  const settings = options.settings ?? {};
  checkSettings(settings);
  return buildOpening(place, options, settings);
}

function buildOpening(
  place: { seed: string; key: string },
  options: {
    economy?: boolean;
    twoLevel?: boolean;
    startedAt?: string;
    staffToCustomers?: boolean;
  },
  settings: WorldSettings,
): CoreInput {
  const population = buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: options.startedAt ?? gameStartDate(),
    minimumPeople: settings.population ?? parameter("targetPopulation"),
    openingEmployment: true,
    scheduledWork: true,
  });
  const withPast = population;
  // The town's public school district, staffed from workers not yet placed;
  // built before custom settings so its pay scales like every other job.
  const schools = withPublicSchoolDistrict(enrichCivicInputs(withPast));
  let input = applyOpeningSettings(schools.input, settings);
  if (schools.receipt)
    input = {
      ...input,
      placeMetadata: {
        ...(input.placeMetadata ?? {}),
        openingPublicSchools: JSON.stringify(schools.receipt),
      },
    };
  const start = makeIsoDate(input.startedAt);
  const player = input.people
    .filter(
      (person) =>
        person.jobId &&
        ageOnDate(makeIsoDate(person.birthDate), start) >=
          parameter("votingAge"),
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!player)
    throw new Error(`No eligible recorded adult worker in ${place.key}`);
  input = {
    ...input,
    playerId: player.id,
  };
  input = {
    ...input,
    focusPersonIds: [...initialFocusPeople(input)].sort(),
    focusPlaceIds: [],
    visiblePlaceIds: [
      player.placeId,
      ...(player.countyId ? [player.countyId] : []),
    ].sort(),
  };
  // Two-level: decide who stays a full person first, so counted households
  // get light economy terms (same amounts, no per-household evidence).
  // The circle, plus a representative sample of the town (one household per
  // age-and-pay group), each sampled person weighted for estimates.
  let keep = options.twoLevel ? fullPeople(input) : undefined;
  if (keep) {
    const sample = representativeSample(input, keep);
    keep = new Set([...keep, ...sample.personIds]);
    input = {
      ...input,
      placeMetadata: {
        ...(input.placeMetadata ?? {}),
        representativeWeights: JSON.stringify(sample.weights),
        representativeStrata: JSON.stringify(sample.strata),
      },
    };
  }
  const countedHouseholdIds = keep
    ? new Set(
        input.households
          .filter((home) => !home.memberIds.some((id) => keep.has(id)))
          .map((home) => home.id),
      )
    : undefined;
  const outsideDemand = settings.economy?.outsideDemand ?? 1;
  const economy = (from: CoreInput) =>
    withPrivateTuition(
      buildOpeningEconomy(from, {
        finance: { countedHouseholdIds },
        customers: { countedHouseholdIds },
      }).input,
    );
  if (options.economy !== false) {
    let built = economy(input);
    // Opt-in: staff each business to what its customers buy, then rebuild.
    if (options.staffToCustomers) {
      const staffed = staffToCustomers(input, built, keep ?? fullPeople(input));
      built = economy(staffed.input);
      built = {
        ...built,
        placeMetadata: {
          ...(built.placeMetadata ?? {}),
          openingStaffing: JSON.stringify(staffed.receipts),
        },
      };
    }
    input = scaleOutsideSales(outsideDemand, addOutsideMarket(built));
  }
  if (!keep) return input;
  // The politics settings stay in worldSettings: the town's lean and the
  // cost of voting read them (electorate-inputs.ts customPolitics).
  const two = collapseToTwoLevels(input, { keep });
  return two;
}
