import { ageOnDate, makeIsoDate } from "../simulation/dates";
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
import { openOfficials } from "../core2/modules/officials";
import { openLawEffects } from "../core2/modules/law-effects";
import { OUTCOME_WEB_MODULE } from "../core2/modules/outcome-web";
import { openStaff } from "../core2/modules/staff";
import { openLeadership } from "../core2/modules/leadership";
import { openExecutive } from "../core2/modules/executive";
import { openInterestGroups } from "../core2/modules/interest-groups";
import { openWorldLegislating } from "../core2/modules/world-legislating";
import { openWorldRaces } from "../core2/modules/world-races";
import { openBallotMeasures } from "../core2/modules/ballot-measures";
import { openRecalls } from "../core2/modules/recalls";
import { openPress } from "../core2/modules/press";
import { openMeetings } from "../core2/modules/meetings";
import { openCases } from "../core2/modules/constituent-cases";
import { openJustice } from "../core2/modules/justice";
import { openThePast } from "../core2/past";
import { peopleData, peopleModules } from "../director/play-modules";
import { renewalData } from "../core2/births-setup";
import type { CoreInput, CoreState } from "../core2/types";
import { collapseToTwoLevels, fullPeople } from "../core2/residents";
import { buildOpeningEconomy } from "../core2/opening-economy";
import { addOutsideMarket } from "../core2/opening-outside-market";
import { buildOpeningPeerContacts } from "../core2/opening-peer-network";
import { initialFocusPeople } from "../core2/focus";
import { releaseRecentHistory } from "../simulation/history-index";
import { forgetLastValidatedWorld } from "../simulation/world";
import { selectBenchPlace } from "./place-selection.mjs";
import { recordOpeningStory } from "../director/opening-story";
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
 * law effects, staff, interest groups, other governments' lawmaking, races
 * elsewhere, ballot measures, recalls, the press, public meetings and
 * constituent cases (OPUS-GOV); the outcome web; health, drives, views, news, who runs, births and
 * deaths, and the story director (OPUS-PEOPLE).
 * The director registers its own interrupts as core player stops.
 */
// M0's entry age, as in progress.ts: an exhibit choice, not a simulation rule.
const ENTRY_AGE = 18;
/**
 * The golden path's first step is turning 18 in play: the 17-year-old whose
 * 18th birthday comes soonest after the opening, else the 18-year-old who
 * turned 18 most recently. Only a resident counts: relatives who live in
 * households of their own are husk-tier records (src/core2/opening-kin.ts),
 * not people the town's day runs, even where they share the place.
 */
export function entrantOf(input: CoreInput, placeId: string): string {
  const at = makeIsoDate(input.startedAt);
  const ages = input.people
    .filter((person) => person.placeId === placeId && person.tier !== "husk")
    .map((person) => ({
      id: person.id,
      age: ageOnDate(makeIsoDate(person.birthDate), at),
      birthDate: person.birthDate,
    }))
    .filter((row) => row.age === ENTRY_AGE || row.age === ENTRY_AGE - 1)
    .sort(
      (a, b) =>
        a.age - b.age ||
        (a.age < ENTRY_AGE
          ? a.birthDate.localeCompare(b.birthDate)
          : b.birthDate.localeCompare(a.birthDate)) ||
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

/** The stages a world builds in, by key; the screen names each (`loading` in controls.json). */
export type BuildStage =
  "people" | "past" | "economy" | "core" | "government" | "opening" | "done";
type BuildOptions = {
  placeKey?: string;
  minimumPeople?: number;
  /**
   * The two-level world (OPUS-CORE): the player, their household and
   * circle and the officials are full people; everyone else is counts,
   * filled in when met. The player is the 17-year-old who turns 18 soonest.
   */
  twoLevel?: boolean;
  /** A custom world (M6-04): what the player changed from real data. */
  settings?: WorldSettings;
  /**
   * Sees the finished opening input just before the core starts from it
   * (the speed guard measures and hashes it; scripts/core2-guard/month.mjs).
   */
  onOpening?: (input: CoreInput) => void;
};
type Built = BenchWorld & { playerId?: string };

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
    // Every place opens with the player's cohort, even one whose own survey
    // sample shows no family with children (`entrantOf`).
    cohortAge: ENTRY_AGE - 1,
  });
  yield "past";
  const input = applyWorldSettings(
    enrichCivicInputs(buildDeepPast(population)),
    settings,
  );
  yield "economy";
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
    // The world economy goes on after the collapse, as on the core's
    // generated route: housing gives counted households rent and mortgage
    // flows, and the core's stand-in owner payouts come off. People it adds
    // (the central bank's board) are named officials and stay full people.
    opening = scaleOutsideDemand(
      withWorldEconomy(
        collapseToTwoLevels(economy, { keep: familyClosure(economy) }),
      ),
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
  options.onOpening?.(opening);
  const director = createDirector();
  const core = createLifeCore(opening, {
    observer: false,
    data: renewalData(worldCoreData(peopleData(DEFAULT_DATA))),
    modules: [
      ...WORLD_MODULES,
      // One area of the world moving another (M3-04): reads the economy's
      // monthly row and every law that takes effect.
      OUTCOME_WEB_MODULE,
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
  // Officials outside the town are people before anyone files, so state and
  // federal races draw named candidates from them (OPUS-OFFICIALS).
  openOfficials(core);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openRecord(core);
  openBudgets(core);
  openLegislature(core);
  // Chambers elect their leaders and seat committees; the executives
  // appoint their department heads and cabinets (OPUS-GOV).
  openLeadership(core);
  openExecutive(core, seed);
  openLawEffects(core);
  // Everything that works through the government above, in the order the
  // modules' own tests open them: officials' staff, interest groups (hooks
  // on every bill's vote), other governments' lawmaking, state and federal
  // races elsewhere, ballot measures, recalls, the press, public meetings
  // (debates need the press's outlets) and constituent cases.
  openStaff(core);
  openInterestGroups(core);
  openWorldLegislating(core);
  openWorldRaces(core);
  openBallotMeasures(core);
  openRecalls(core);
  openPress(core);
  openMeetings(core);
  openCases(core);
  // Prosecutors, trials and prisons: reads the corruption engine's records.
  openJustice(core);
  // The world has a past (OPUS-CORE): prior elections, voting records, law
  // histories, the year's news and what the public knows, before day one.
  openThePast(core, seed);
  director.start(core);
  yield "opening";
  // The opening, told as a story from the records (owner, Oct 14, 2026): the
  // President's address and that night's news, composed once while the
  // world loads and kept on the director's ledger for the screens.
  if (playerId)
    director.ledger.opening = recordOpeningStory(core, playerId) ?? undefined;
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
