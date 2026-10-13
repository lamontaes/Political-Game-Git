import {
  ageOnDate,
  dateAtAge,
  daysBetween,
  makeIsoDate,
} from "../simulation/dates";
import entryTable from "./data/entry.json" with { type: "json" };
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { realLocalities } from "../core2/places";
import { buildPopulation } from "../core2/population";
import { buildDeepPast } from "../core2/deep-past";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createOpeningFinance } from "../core2/opening-finance";
import { DEFAULT_DATA } from "../core2/data";
import { createLifeCore } from "../core2/life";
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
import { peopleData, peopleModules } from "../director/play-modules";
import { renewalData } from "../core2/births-setup";
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
import {
  applyWorldSettings,
  checkWorldSettings,
  scaleOutsideDemand,
  type WorldSettings,
} from "./world-settings";

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
/** Who the player starts as (PW-6): the bench's own table, with reasons. */
const ENTRY = entryTable.parameters;
const ENTRY_AGE = ENTRY.entryAgeYears.value;

/**
 * Why the bench chose its player, kept with the world so the opening can
 * name it: the person, their birth date, the day they turn 18 and the
 * window that day had to fall in.
 */
export interface EntrantRecord {
  personId: string;
  birthDate: string;
  turns18At: string;
  openedAt: string;
  windowDays: number;
  daysToBirthday: number;
  /** In the window, or the soonest birthday the town has when none is. */
  basis: "within-window" | "soonest-outside-window";
}

/**
 * The golden path's first step: the resident whose 18th birthday comes
 * soonest after the opening, so turning 18 happens in play. Never a resident
 * already 18. If no resident turns 18 within the entry window, the soonest
 * birthday the town has, and the record says so.
 */
export function entrantOf(
  input: Pick<CoreInput, "startedAt" | "people">,
  placeId: string,
): EntrantRecord {
  const at = makeIsoDate(input.startedAt);
  const rows = input.people
    .filter((person) => person.placeId === placeId)
    .map((person) => {
      const turns18At = dateAtAge(makeIsoDate(person.birthDate), ENTRY_AGE);
      return {
        id: person.id,
        birthDate: person.birthDate,
        turns18At,
        days: daysBetween(at, turns18At),
      };
    })
    .filter((row) => row.days > 0)
    .sort((a, b) => a.days - b.days || a.id.localeCompare(b.id));
  const row = rows[0];
  if (!row) throw new Error("No resident here turns 18 after the opening.");
  const windowDays = ENTRY.entryWindowDays.value;
  return {
    personId: row.id,
    birthDate: row.birthDate,
    turns18At: row.turns18At,
    openedAt: at,
    windowDays,
    daysToBirthday: row.days,
    basis: row.days <= windowDays ? "within-window" : "soonest-outside-window",
  };
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

/** The stages a world builds in, by key; the screen names each (`loading` in controls.json). */
export type BuildStage =
  "people" | "past" | "economy" | "core" | "government" | "done";
type BuildOptions = {
  placeKey?: string;
  minimumPeople?: number;
  /**
   * The two-level world (OPUS-CORE): the player, their household and
   * circle and the officials are full people; everyone else is counts,
   * filled in when met. The player is the resident who turns 18 soonest.
   */
  twoLevel?: boolean;
  /** A custom world (M6-04): what the player changed from real data. */
  settings?: WorldSettings;
};
type Built = BenchWorld & { playerId?: string; entrant?: EntrantRecord };

/** Builds the world in one go (tests and checks). */
export function buildBenchWorld(
  seed: string,
  date: string,
  options: BuildOptions = {},
): Built {
  const stages = benchWorldStages(seed, date, options);
  for (;;) {
    const step = stages.next();
    if (step.done) return step.value;
  }
}

/**
 * Builds the world stage by stage, letting the server answer between stages,
 * so the loading screen can show each step as it happens.
 */
export async function buildBenchWorldInStages(
  seed: string,
  date: string,
  options: BuildOptions,
  onStage: (stage: BuildStage) => void,
): Promise<Built> {
  const stages = benchWorldStages(seed, date, options);
  for (;;) {
    const step = stages.next();
    if (step.done) {
      onStage("done");
      return step.value;
    }
    onStage(step.value);
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function* benchWorldStages(
  seed: string,
  date: string,
  options: BuildOptions,
): Generator<BuildStage, Built> {
  yield "people";
  const place = options.placeKey
    ? realLocalities().find((row) => row.key === options.placeKey)
    : selectBenchPlace(seed, lifePlaceStateIdentities(), realLocalities());
  if (!place) throw new Error(`Unknown place key: ${options.placeKey}`);
  const settings = options.settings ?? {};
  checkWorldSettings(settings);
  const minimumPeople = settings.population ?? options.minimumPeople;
  const population = buildPopulation({
    seed,
    startedAt: makeIsoDate(date),
    placeKey: place.key,
    ...(minimumPeople ? { minimumPeople } : {}),
  });
  yield "past";
  const input = applyWorldSettings(
    enrichCivicInputs(buildDeepPast(population)),
    settings,
  );
  yield "economy";
  let opening: CoreInput;
  let playerId: string | undefined;
  let entrant: EntrantRecord | undefined;
  if (options.twoLevel) {
    // The core's own opening route (as in its generated world): the player
    // and their peers first, then the economy with the closures fix (outside
    // buyers by industry), light terms for counted households, two levels and
    // the counted voter groups.
    entrant = entrantOf(input, place.context.jurisdiction.id);
    playerId = entrant.personId;
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
    let economy: CoreInput;
    try {
      economy = addOutsideMarket(
        buildOpeningEconomy(withPlayer, {
          finance: { countedHouseholdIds },
          customers: { countedHouseholdIds },
        }).input,
      );
    } catch (error) {
      // Stopgap SG-PLAY-opening-economy-fallback: a kin move dated after the
      // opening day fails the core's income check; such a town opens on the
      // finance-only route instead, without the outside market.
      if (!/outside recipient lifetime\/opening/.test(String(error)))
        throw error;
      economy = { ...withPlayer, finance: createOpeningFinance(withPlayer) };
    }
    opening = withWorldEconomy(economy);
    // People a module adds at the opening (the central bank's board) are
    // named officials: they stay full people.
    const generated = new Set(input.people.map((row) => row.id));
    const keep = familyClosure(opening);
    for (const row of opening.people)
      if (!generated.has(row.id)) keep.add(row.id);
    opening = scaleOutsideDemand(
      withCountedVoterGroups(collapseToTwoLevels(opening, { keep })),
      settings,
    );
    releaseRecentHistory();
    forgetLastValidatedWorld();
  } else
    opening = withWorldEconomy({
      ...input,
      finance: createOpeningFinance(input),
    });
  yield "core";
  const director = createDirector();
  const core = createLifeCore(opening, {
    observer: false,
    data: renewalData(worldCoreData(peopleData(DEFAULT_DATA))),
    modules: [
      ...WORLD_MODULES,
      // Every people engine a played world installs (OPUS-PEOPLE): health,
      // drives, views, news, speeches, who runs, corruption and beliefs.
      ...peopleModules(),
      director.module,
    ],
  });
  yield "government";
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
    ...(entrant ? { entrant } : {}),
  };
}
