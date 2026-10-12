import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { realLocalities } from "../core2/places";
import { buildPopulation } from "../core2/population";
import { buildDeepPast } from "../core2/deep-past";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createOpeningFinance } from "../core2/opening-finance";
import { DEFAULT_DATA } from "../core2/data";
import { createLifeCore } from "../core2/life";
import { withDrives, createDrivesModule } from "../core2/modules/drives";
import { createHealthModule } from "../core2/modules/health";
import { createDirector, type Director } from "../director/ledger";
import type { CoreState } from "../core2/types";
import { selectBenchPlace } from "./place-selection.mjs";

export interface BenchResident {
  id: string;
  name: string;
  age: number;
  householdId: string;
  jobId?: string;
}

export interface BenchWorld {
  core: CoreState;
  director: Director;
  place: ReturnType<typeof realLocalities>[number];
  placeId: string;
  residents: BenchResident[];
}

/**
 * The full stack the owner plays: the core with people (always loaded by
 * createLifeCore), work and money, then health, drives and the story director.
 * The director registers its own interrupts as core player stops.
 */
export function buildBenchWorld(
  seed: string,
  date: string,
  options: { placeKey?: string; minimumPeople?: number } = {},
): BenchWorld {
  const place = options.placeKey
    ? realLocalities().find((row) => row.key === options.placeKey)
    : selectBenchPlace(seed, lifePlaceStateIdentities(), realLocalities());
  if (!place) throw new Error(`Unknown place key: ${options.placeKey}`);
  const input = enrichCivicInputs(
    buildDeepPast(
      buildPopulation({
        seed,
        startedAt: makeIsoDate(date),
        placeKey: place.key,
        ...(options.minimumPeople
          ? { minimumPeople: options.minimumPeople }
          : {}),
      }),
    ),
  );
  const director = createDirector();
  const core = createLifeCore(
    { ...input, finance: createOpeningFinance(input) },
    {
      observer: false,
      data: withDrives(DEFAULT_DATA),
      modules: [createHealthModule(), createDrivesModule(), director.module],
    },
  );
  director.start(core);
  const placeId = place.context.jurisdiction.id;
  const residents = [...core.people.values()]
    .filter((person) => person.placeId === placeId)
    .map((person) => {
      const household = core.households.get(person.householdId);
      const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
      if (
        !household?.memberIds.includes(person.id) ||
        (person.jobId && job?.personId !== person.id)
      )
        throw new Error(`Resident references do not resolve: ${person.id}`);
      return {
        id: person.id,
        name: `${person.givenName} ${person.familyName}`,
        age: ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date)),
        householdId: person.householdId,
        ...(person.jobId ? { jobId: person.jobId } : {}),
      };
    });
  return { core, director, place, placeId, residents };
}
