import { ageOnDate, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { realLocalities } from "../core2/places";
import { buildPopulation } from "../core2/population";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createOpeningFinance } from "../core2/opening-finance";
import { DEFAULT_DATA } from "../core2/data";
import { createLifeCore } from "../core2/life";
import { preStartWindow, runPreStart } from "../core2/pre-start";
import { defaultPreStart } from "../core2/saves";
import { createDirector, type Director } from "../director/ledger";
import { wordPrintedStory } from "./archive-words";
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
import { openVoting, openWorldRaces } from "../core2/modules/voting";
import { openRecord } from "../core2/modules/record";
import { openBudgets } from "../core2/modules/budgets";
import { openOfficialPay } from "../core2/modules/official-pay";
import { openCrime } from "../core2/modules/crime";
import { openCoverage } from "../core2/modules/coverage";
import { openHomelessCount } from "../core2/modules/homeless-count";
import { openEstates } from "../core2/estates";
import { openEmployerTaxes } from "../core2/modules/employer-taxes";
import { openContracts } from "../core2/modules/contracts";
import { openProjects } from "../core2/modules/projects";
import { openLegislature } from "../core2/modules/legislature";
import { openOfficials } from "../core2/modules/officials";
import { openLawReach } from "../core2/law-reach/host";
import { OUTCOME_WEB_MODULE } from "../core2/modules/outcome-web";
import { openStaff } from "../core2/modules/staff";
import { openLeadership } from "../core2/modules/leadership";
import { openSuccession } from "../core2/modules/succession";
import { openExecutive } from "../core2/modules/executive";
import { openInterestGroups } from "../core2/modules/interest-groups";
import { openWorldLegislating } from "../core2/modules/world-legislating";
import { openBallotMeasures } from "../core2/modules/ballot-measures";
import { openRecalls } from "../core2/modules/recalls";
import { openPress } from "../core2/modules/press";
import { openMeetings } from "../core2/modules/meetings";
import { officeDayData, openOfficeDay } from "../core2/office-day-levels";
import { openCases } from "../core2/modules/constituent-cases";
import { openJustice } from "../core2/modules/justice";
import { openPublicSafety } from "../core2/modules/public-safety";
import { openThePast } from "../core2/past";
import { peopleData, peopleModules } from "../director/play-modules";
import { renewalData } from "../core2/births-setup";
import type { CoreInput, CoreState } from "../core2/types";
import { OPENING_KIN } from "../core2/opening-kin";
import { scaleFirmsToCensus } from "../core2/census-firms";
import { collapseToTwoLevels, fullPeople } from "../core2/residents";
import { buildOpeningEconomy } from "../core2/opening-economy";
import { addOutsideMarket } from "../core2/opening-outside-market";
import { withPublicSchoolDistrict } from "../core2/opening-public-schools";
import { withPrivateTuition } from "../core2/opening-private-tuition";
import { representativeSample } from "../core2/representative-sample";
import { initialFocusPeople } from "../core2/focus";
import { selectBenchPlace } from "./place-selection.mjs";
import { recordOpeningStory } from "../director/opening-story";
import {
  applyOpeningSettings as applyWorldSettings,
  checkSettings as checkWorldSettings,
  scaleOutsideSales,
  type WorldSettings,
} from "../core2/world-settings";

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
export function entrantOf(
  input: CoreInput,
  placeId: string,
  birthDate?: string,
): string {
  return entrantChoice(input, placeId, birthDate).id;
}

/**
 * The entrant and what the pick rests on: `estimated` is true when nobody
 * here is 17 or 18 and the resident nearest 18 stands in, younger first so
 * the 18th birthday still comes in play. Fails only where no resident lives.
 * With the birthday the New game creator chose, the entrant is the resident
 * born nearest it instead (`entrantBornNear`).
 */
export function entrantChoice(
  input: CoreInput,
  placeId: string,
  birthDate?: string,
): { id: string; age: number; estimated: boolean } {
  if (birthDate) return entrantBornNear(input, placeId, makeIsoDate(birthDate));
  const at = makeIsoDate(input.startedAt);
  const residents = input.people
    .filter((person) => person.placeId === placeId && person.tier !== "husk")
    .map((person) => ({
      id: person.id,
      age: ageOnDate(makeIsoDate(person.birthDate), at),
      birthDate: person.birthDate,
    }));
  const near = residents
    .filter((row) => row.age === ENTRY_AGE || row.age === ENTRY_AGE - 1)
    .sort(
      (a, b) =>
        a.age - b.age ||
        (a.age < ENTRY_AGE
          ? a.birthDate.localeCompare(b.birthDate)
          : b.birthDate.localeCompare(a.birthDate)) ||
        a.id.localeCompare(b.id),
    );
  if (near[0]) return { id: near[0].id, age: near[0].age, estimated: false };
  // Nobody is 17 or 18: the nearest age to 18, the younger of two equally
  // near, the one whose birthday comes soonest within an age.
  const nearest = residents.sort(
    (a, b) =>
      Math.abs(a.age - ENTRY_AGE) - Math.abs(b.age - ENTRY_AGE) ||
      a.age - b.age ||
      a.birthDate.localeCompare(b.birthDate) ||
      a.id.localeCompare(b.id),
  )[0];
  if (!nearest) throw new Error("No resident here.");
  return { id: nearest.id, age: nearest.age, estimated: true };
}

/**
 * The resident a chosen birthday makes the player (owner's Oct 26 playtest: a
 * creator birthday of 35 left the parent 47 and the schooling of a 17-year-old).
 * The world is drawn with a resident that age, so the player is the resident
 * born nearest that day, and the household, kin, schooling, work and money
 * the builders drew for that resident already fit the age. The identity call
 * then sets the exact birth date, name and looks. A resident is passed over
 * if the chosen day would leave a parent, or the player as a parent, younger
 * than the child-bearing minimum the kin builder keeps (`OPENING_KIN`); where
 * none stays inside it, the nearest stands in. Nothing here is drawn.
 */
function entrantBornNear(
  input: CoreInput,
  placeId: string,
  chosen: ReturnType<typeof makeIsoDate>,
): { id: string; age: number; estimated: boolean } {
  const at = makeIsoDate(input.startedAt);
  const born = new Map(input.people.map((row) => [row.id, row.birthDate]));
  const minParentAge = OPENING_KIN.fertilityByAge.rows[0]!.minAge;
  // Whether each relative named by a parent or child record stays at least
  // the minimum older (a parent) or younger (a child) than the chosen birth.
  const kinFit = (person: CoreInput["people"][number]) =>
    (person.pastFacts ?? []).every((fact) => {
      const other = fact.facts?.otherPersonId
        ? born.get(fact.facts.otherPersonId)
        : undefined;
      if (!other) return true;
      if (fact.kind === "family:parent")
        return ageOnDate(makeIsoDate(other), chosen) >= minParentAge;
      if (fact.kind === "family:child")
        return ageOnDate(chosen, makeIsoDate(other)) >= minParentAge;
      return true;
    });
  const nearest = input.people
    .filter((person) => person.placeId === placeId && person.tier !== "husk")
    .map((person) => ({
      person,
      apart: Math.abs(daysBetween(chosen, makeIsoDate(person.birthDate))),
    }))
    .sort(
      (a, b) => a.apart - b.apart || a.person.id.localeCompare(b.person.id),
    );
  const pick = nearest.find((row) => kinFit(row.person)) ?? nearest[0];
  if (!pick) throw new Error("No resident here.");
  const age = ageOnDate(makeIsoDate(pick.person.birthDate), at);
  return {
    id: pick.person.id,
    age,
    estimated: age !== ageOnDate(chosen, at),
  };
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
  /**
   * With `twoLevel`: real households each counted household of the town
   * stands for (default one). A town opened from a sample of its Census
   * count sets it; every reader of a count multiplies by it.
   */
  countScale?: number;
  /**
   * With `twoLevel`: the birthday the New game creator chose. The player is
   * the resident born nearest it (`entrantBornNear`), not the 17-year-old
   * who turns 18, so their past fits the age they chose.
   */
  playerBirthDate?: string;
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

/** Real people per sampled person: the world's count of the town (drawn around the Census count when the population was built) over the people generated, one where the sample is the whole town. */
function censusScale(population: CoreInput): number {
  const held = Number(population.placeMetadata?.referencePopulation);
  const real = Number.isFinite(held) ? held : undefined;
  const sample = population.people.filter(
    (person) => person.tier !== OPENING_KIN.kinTier,
  ).length;
  return real !== undefined && real > sample ? real / sample : 1;
}

function* benchWorldStages(
  seed: string,
  date: string,
  options: BuildOptions,
): Generator<BuildStage, Built> {
  yield "people";
  const place = options.placeKey
    ? realLocalities().find((row) => row.key === options.placeKey)
    : selectBenchPlace(seed, corePlaceStateIdentities(), realLocalities());
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
    // And with a resident of the age the creator's birthday makes the player,
    // as far as the place's households allow (`entrantBornNear`).
    ...(options.playerBirthDate
      ? {
          playerAge: ageOnDate(
            makeIsoDate(options.playerBirthDate),
            makeIsoDate(date),
          ),
        }
      : {}),
  });
  yield "past";
  const schools = withPublicSchoolDistrict(enrichCivicInputs(population));
  // Public pay must exist before the custom world's wage multiplier runs.
  const input = applyWorldSettings(
    schools.receipt
      ? {
          ...schools.input,
          placeMetadata: {
            ...(schools.input.placeMetadata ?? {}),
            openingPublicSchools: JSON.stringify(schools.receipt),
          },
        }
      : schools.input,
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
    playerId = entrantOf(
      input,
      place.context.jurisdiction.id,
      options.playerBirthDate,
    );
    // A town opens at its real Census size: the sample is the
    // people generated, and each counted household stands for as many real
    // households as the Census count is over the sample, unless asked for.
    const countScale =
      options.countScale ?? (minimumPeople ? 1 : censusScale(population));
    let withPlayer: CoreInput = { ...input, playerId };
    withPlayer = {
      ...withPlayer,
      focusPersonIds: [...initialFocusPeople(withPlayer)].sort(),
    };
    const circle = fullPeople(withPlayer);
    const sample = representativeSample(withPlayer, circle);
    const kept = new Set([...circle, ...sample.personIds]);
    withPlayer = {
      ...withPlayer,
      placeMetadata: {
        ...(withPlayer.placeMetadata ?? {}),
        representativeWeights: JSON.stringify(sample.weights),
        representativeStrata: JSON.stringify(sample.strata),
      },
    };
    const countedHouseholdIds = new Set(
      withPlayer.households
        .filter((home) => !home.memberIds.some((id) => kept.has(id)))
        .map((home) => home.id),
    );
    // The firms are sized to the weighted town before the outside market is
    // derived from their books, so its buyers and suppliers follow them.
    const economy: CoreInput = addOutsideMarket(
      withPrivateTuition(
        scaleFirmsToCensus(
          buildOpeningEconomy(withPlayer, {
            finance: { countedHouseholdIds },
            customers: { countedHouseholdIds },
          }).input,
          place.context.jurisdiction.id,
          countScale,
        ),
      ),
    );
    // The world economy goes on after the collapse, as on the core's
    // generated route: housing gives counted households rent and mortgage
    // flows, and the core's stand-in owner payouts come off. People it adds
    // (the central bank's board) are named officials and stay full people.
    opening = scaleOutsideSales(
      settings.economy?.outsideDemand ?? 1,
      withWorldEconomy(
        collapseToTwoLevels(economy, {
          keep: kept,
          ...(countScale !== 1
            ? {
                weights: {
                  [place.context.jurisdiction.id]: countScale,
                },
              }
            : {}),
        }),
      ),
    );
  } else
    opening = withWorldEconomy(
      withPrivateTuition({
        ...input,
        finance: createOpeningFinance(input),
      }),
    );
  yield "core";
  options.onOpening?.(opening);
  // A talk at home can raise a printed story by its headline, in the words
  // the paper's own screen prints it with.
  const director = createDirector({ watch: [], storyWords: wordPrintedStory });
  const core = createLifeCore(opening, {
    observer: false,
    data: officeDayData(renewalData(worldCoreData(peopleData(DEFAULT_DATA)))),
    modules: [
      ...WORLD_MODULES,
      // One area of the world moving another (M3-04): reads the economy's
      // monthly row and every law that takes effect.
      OUTCOME_WEB_MODULE,
      // Every people engine a played world installs (OPUS-PEOPLE): health,
      // drives, views, news, speeches, corruption and beliefs (who runs is
      // installed by the voting engine, in every world).
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
  // Officials are paid from the treasuries budgets just opened (OPUS-CORE).
  openOfficialPay(core);
  openHomelessCount(core);
  // Crimes that happen to households, from the national rates and the web's factors (OPUS-CORE).
  openCrime(core);
  openEstates(core);
  openEmployerTaxes(core);
  openLegislature(core);
  // Each government's body awards the town's public contracts (gov-public-contract-awards).
  openContracts(core);
  openProjects(core);
  // Chambers elect their leaders and seat committees; the executives
  // appoint their department heads and cabinets (OPUS-GOV).
  openLeadership(core);
  openExecutive(core, seed);
  // The president's cabinet and the line of succession (OPUS-GOV).
  openSuccession(core);
  openLawReach(core);
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
  // The officeholder's day (OFFICE-LOCAL): each local body's own meeting
  // calendar, the meeting as a scene, the player's chosen stops and the
  // character's own votes and desk decisions when the player does not stop.
  openOfficeDay(core, seed);
  // Prosecutors, trials and prisons: reads the corruption engine's records.
  openJustice(core);
  // Ordinary crime, courts, jail, firearm laws and fire service.
  openPublicSafety(core);
  // The world has a past (OPUS-CORE): prior elections, voting records, law
  // histories, the year's news and what the public knows, before day one.
  openThePast(core, seed);
  // The government's history before day one (M1-14): how each official
  // reached their seat, kept for the person card to read. It takes
  // milliseconds, being coarse steps over the records the opening wrote.
  const preStart = defaultPreStart(core);
  if (preStart)
    runPreStart(core, preStartWindow(core, preStart.from, preStart.step));
  // Last, so everyone the opening seated has a health coverage record on day one
  // (people who arrive later get theirs on the next 1st); the household pays its premium.
  openCoverage(core);
  director.start(core);
  yield "opening";
  // The opening, told as a story from the records (owner, Oct 14, 2026): the
  // President's address and that night's news, composed once while the
  // world loads and kept on the director's ledger for the screens.
  if (playerId)
    director.ledger.opening = recordOpeningStory(core, playerId) ?? undefined;
  const placeId = place.context.jurisdiction.id;
  const residents = [...core.people.values()]
    .filter((person) => person.placeId === placeId && person.alive)
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
