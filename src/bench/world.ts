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
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../core2/modules/world";
import { openLaws } from "../core2/modules/laws";
import { openOffices } from "../core2/modules/offices";
import { openElections } from "../core2/modules/elections";
import { openCampaigns } from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { openVoting } from "../core2/modules/voting";
import { openRecord } from "../core2/modules/record";
import { openBudgets } from "../core2/modules/budgets";
import { openLegislature } from "../core2/modules/legislature";
import { openLawEffects } from "../core2/modules/law-effects";
import { viewsModule } from "../core2/modules/views";
import { newsModule } from "../core2/modules/news";
import { candidacyModule } from "../core2/modules/candidacy";
import { RENEWAL_MODULE } from "../core2/modules/renewal";
import { renewalData } from "../core2/births-setup";
import { registerModule } from "../core2/state";
import type { CoreInput, CoreState } from "../core2/types";
import { collapseToTwoLevels, fullPeople } from "../core2/residents";
import { buildOpeningEconomy } from "../core2/opening-economy";
import { addOutsideMarket } from "../core2/opening-outside-market";
import { buildOpeningPeerContacts } from "../core2/opening-peer-network";
import { initialFocusPeople } from "../core2/focus";
import { withCountedVoterGroups } from "../core2/opening-voter-groups";
import { releaseRecentHistory } from "../simulation/history-index";
import { forgetLastValidatedWorld } from "../simulation/world";
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
 * createLifeCore), work and money; the economy (OPUS-WORLD); law, offices,
 * elections, parties, voting, campaigns, the record, budgets, legislatures and
 * law effects (OPUS-GOV); health, drives, views, news, who runs, births and
 * deaths, and the story director (OPUS-PEOPLE).
 * The director registers its own interrupts as core player stops.
 */
// M0's entry age, as in progress.ts: an exhibit choice, not a simulation rule.
const ENTRY_AGE = 18;
/** The golden path's first step: a resident at 18, else the oldest at 17. */
function entrantOf(input: CoreInput, placeId: string): string {
  const at = makeIsoDate(input.startedAt);
  const ages = input.people
    .filter((person) => person.placeId === placeId)
    .map((person) => ({
      id: person.id,
      age: ageOnDate(makeIsoDate(person.birthDate), at),
      birthDate: person.birthDate,
    }))
    .filter((row) => row.age === ENTRY_AGE || row.age === ENTRY_AGE - 1)
    .sort(
      (a, b) =>
        b.age - a.age ||
        a.birthDate.localeCompare(b.birthDate) ||
        a.id.localeCompare(b.id),
    );
  if (!ages[0]) throw new Error("No resident at or near 18 here.");
  return ages[0].id;
}

/**
 * The core requires every full person's relatives to be full people too, so
 * the kept circle grows to its family closure (relatives and their
 * households) before the rest of the town becomes counts.
 */
function familyClosure(input: CoreInput): Set<string> {
  const keep = fullPeople(input);
  const people = new Map(input.people.map((row) => [row.id, row]));
  const homes = new Map(input.households.map((row) => [row.id, row]));
  const queue = [...keep];
  while (queue.length) {
    const person = people.get(queue.pop()!);
    if (!person) continue;
    const next = [
      ...person.familyIds,
      ...(homes.get(person.householdId)?.memberIds ?? []),
    ];
    for (const id of next)
      if (!keep.has(id)) {
        keep.add(id);
        queue.push(id);
      }
  }
  return keep;
}

export function buildBenchWorld(
  seed: string,
  date: string,
  options: {
    placeKey?: string;
    minimumPeople?: number;
    /**
     * The two-level world (OPUS-CORE): the player, their household and
     * circle and the officials are full people; everyone else is counts,
     * filled in when met. The player is the resident at or nearest 18.
     */
    twoLevel?: boolean;
  } = {},
): BenchWorld & { playerId?: string } {
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
  let opening: CoreInput;
  let playerId: string | undefined;
  if (options.twoLevel) {
    // The core's own opening route (as in its generated world): the player
    // and their peers first, then the economy with the closures fix (outside
    // buyers by industry), light terms for counted households, two levels and
    // the counted voter groups.
    playerId = entrantOf(input, place.context.jurisdiction.id);
    let withPlayer: CoreInput = {
      ...buildOpeningPeerContacts(input, { personIds: [playerId] }).input,
      playerId,
    };
    withPlayer = {
      ...withPlayer,
      focusPersonIds: [...initialFocusPeople(withPlayer)].sort(),
    };
    const kept = familyClosure(withPlayer);
    const countedHouseholdIds = new Set(
      withPlayer.households
        .filter((home) => !home.memberIds.some((id) => kept.has(id)))
        .map((home) => home.id),
    );
    opening = withWorldEconomy(
      addOutsideMarket(
        buildOpeningEconomy(withPlayer, {
          finance: { countedHouseholdIds },
          customers: { countedHouseholdIds },
        }).input,
      ),
    );
    // People a module adds at the opening (the central bank's board) are
    // named officials: they stay full people.
    const generated = new Set(input.people.map((row) => row.id));
    const keep = familyClosure(opening);
    for (const row of opening.people)
      if (!generated.has(row.id)) keep.add(row.id);
    opening = withCountedVoterGroups(collapseToTwoLevels(opening, { keep }));
    releaseRecentHistory();
    forgetLastValidatedWorld();
  } else
    opening = withWorldEconomy({
      ...input,
      finance: createOpeningFinance(input),
    });
  const director = createDirector();
  const core = createLifeCore(opening, {
    observer: false,
    data: renewalData(worldCoreData(withDrives(DEFAULT_DATA))),
    modules: [
      ...WORLD_MODULES,
      createHealthModule(),
      createDrivesModule(),
      viewsModule,
      newsModule,
      candidacyModule,
      director.module,
    ],
  });
  // Government: the place's law in force, its offices and seats, and the
  // next elections with their filing rules (OPUS-GOV).
  openLaws(core);
  openOffices(core, seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openRecord(core);
  openBudgets(core);
  openLegislature(core);
  openLawEffects(core);
  // Births and deaths (OPUS-PEOPLE's renewal), on the same scheduler.
  registerModule(core, RENEWAL_MODULE);
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
  return {
    core,
    director,
    place,
    placeId,
    residents,
    ...(playerId ? { playerId } : {}),
  };
}
