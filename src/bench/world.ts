import { purposeScene } from "../director/purpose-scene";
import { composeScene } from "../director/scene";
import { openConversation } from "../director/conversation";
import { SITUATION_LIBRARY } from "../director/scheduling";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../core2/kernel/dates";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { realLocalities } from "../core2/places";
import { buildPopulation, inHousehold } from "../core2/population";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { createOpeningFinance } from "../core2/opening-finance";
import { DEFAULT_DATA } from "../core2/data";
import { createLifeCore } from "../core2/life";
import { preStartWindow, runPreStart } from "../core2/pre-start";
import { warmUpOpening } from "../core2/player-warm-up";
import { defaultPreStart } from "../core2/saves";
import { createDirector, type Director } from "../director/ledger";
import { wordPrintedStory } from "./archive-words";
import {
  openClimate,
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../core2/modules/world";
import { openLaws } from "../core2/modules/laws";
import { openStartingCircle } from "../core2/modules/people";
import { openOffices } from "../core2/modules/offices";
import { openElections } from "../core2/modules/elections";
import { openCampaigns } from "../core2/modules/campaigns";
import { openParties } from "../core2/modules/parties";
import { openVoting, openWorldRaces } from "../core2/modules/voting";
import { openRecord } from "../core2/modules/record";
import { openBudgets } from "../core2/modules/budgets";
import { openOutsideBudgets } from "../core2/modules/outside-budgets";
import { openOfficialPay } from "../core2/modules/official-pay";
import { openCrime } from "../core2/modules/crime";
import { openPatrol } from "../core2/modules/police-patrol";
import { openCoverage } from "../core2/modules/coverage";
import { openHomelessCount } from "../core2/modules/homeless-count";
import { openGrievance } from "../core2/modules/people";
import { openEstates } from "../core2/estates";
import { openEmployerTaxes } from "../core2/modules/employer-taxes";
import { openContracts } from "../core2/modules/contracts";
import { openProjects } from "../core2/modules/projects";
import { openLegislature } from "../core2/modules/legislature";
import { openOfficials } from "../core2/modules/officials";
import { openLawReach } from "../core2/law-reach/host";
import { OUTCOME_WEB_MODULE } from "../core2/modules/outcome-web";
import { openStaff } from "../core2/modules/staff";
import { openServeAsks } from "../core2/modules/serve-asks";
import { openLeadership } from "../core2/modules/leadership";
import { openSuccession } from "../core2/modules/succession";
import { openExecutive } from "../core2/modules/executive";
import { openInterestGroups } from "../core2/modules/interest-groups";
import { openPublicAction } from "../core2/modules/public-action";
import { openNationalOpinion } from "../core2/modules/national-opinion";
import { openFederalCourts } from "../core2/modules/federal-courts";
import { openNationalEvents } from "../core2/modules/national-events";
import {
  openSittingSessions,
  openWorldLegislating,
} from "../core2/modules/world-legislating";
import { openBallotMeasures } from "../core2/modules/ballot-measures";
import { openRecalls } from "../core2/modules/recalls";
import { openPress } from "../core2/modules/press";
import { openMeetings } from "../core2/modules/meetings";
import { officeDayData, openOfficeDay } from "../core2/office-day-levels";
import { openPresidentActs } from "../core2/modules/president-acts";
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
import {
  addOutsideMarket,
  addTradeArea,
} from "../core2/opening-outside-market";
import { withPublicSchoolDistrict } from "../core2/opening-public-schools";
import { withPrivateTuition } from "../core2/opening-private-tuition";
import { withOrigins } from "../core2/opening-origin";
import { representativeSample } from "../core2/representative-sample";
import { seededUnit } from "../core2/seeded";
import { withCountySample } from "../core2/opening-county-sample";
import { withRoles } from "../core2/opening-roles";
import { withYearsInPlace } from "../core2/opening-tenure";
import { initialFocusPeople } from "../core2/focus";
import { selectBenchPlace } from "./place-selection.mjs";
import { recordOpeningStory } from "../director/opening-story";
import {
  applyOpeningSettings as applyWorldSettings,
  checkSettings as checkWorldSettings,
  scaleOutsideSales,
  type WorldSettings,
} from "../core2/life";

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
/**
 * The youngest a new game's player is (owner, Nov 16: "Just do 18 and up right now. Life before
 * 18 will come after early access."). Life under 18 stays in the simulation; it is only not where
 * a new game starts (pool item people-life-before-18-after-early-access).
 */
export const PLAYER_MIN_AGE = 18;

/**
 * A new game cannot open here: no adult lives in a household in the place. `adultsInQuarters`
 * counts the adults who live in group quarters instead (all of them, when it is above zero).
 */
export class NoPlayerHereError extends Error {
  /** The place's key, set where the build chose the place (`benchWorldStages`). */
  placeKey?: string;
  constructor(
    readonly placeId: string,
    readonly adultsInQuarters: number,
  ) {
    super(
      adultsInQuarters
        ? `No adult resident in a household here: all ${adultsInQuarters} adults live in group quarters.`
        : "No adult resident here.",
    );
    this.name = "NoPlayerHereError";
  }
}

/** How the opening set the player's age, kept in the world's place metadata for dev mode. */
export interface EntrantPick {
  readonly id: string;
  readonly age: number;
  /** True where nobody in town was the chosen age and the nearest resident stands in. */
  readonly estimated: boolean;
  /** "town-adult": drawn from the town's adults; "chosen-age": the creator's age, a resident that age. */
  readonly how: "town-adult" | "chosen-age";
  readonly chosenAge?: number;
  /** "town-adult" only: the world's seeded unit that picked, and how many adults it picked among (in id order). */
  readonly unit?: number;
  readonly among?: number;
}

/** The residents a player may be: in a household of the town, never a relative's husk record. */
function townResidents(input: CoreInput, placeId: string) {
  const household = inHousehold(input);
  return input.people.filter(
    (person) =>
      person.placeId === placeId && person.tier !== "husk" && household(person),
  );
}

/**
 * The player of a new game: with no birthday chosen, one of the town's own adults (18 and up),
 * picked by the world's seeded unit from them in id order, so the player's age follows the
 * place's own adults. Only a resident counts: relatives who live in households of their own are
 * husk-tier records (src/core2/opening-kin.ts), not people the town's day runs. With the
 * birthday the New game creator chose, a resident that age instead (`entrantBornNear`).
 */
export function entrantOf(
  input: CoreInput,
  placeId: string,
  birthDate?: string,
  gender?: string,
): string {
  return entrantChoice(input, placeId, birthDate, gender).id;
}

/** The player and what the pick rests on (`entrantOf`). Fails only where no adult lives. */
export function entrantChoice(
  input: CoreInput,
  placeId: string,
  birthDate?: string,
  gender?: string,
): EntrantPick {
  if (birthDate)
    return entrantBornNear(input, placeId, makeIsoDate(birthDate), gender);
  const at = makeIsoDate(input.placeMetadata?.openingAgeOn ?? input.startedAt);
  const adults = townResidents(input, placeId)
    .map((person) => ({
      id: person.id,
      age: ageOnDate(makeIsoDate(person.birthDate), at),
    }))
    .filter((row) => row.age >= PLAYER_MIN_AGE)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!adults.length) {
    // Who is in the place at all: a place whose every adult lives in group
    // quarters (a colony, a dormitory, a barracks) has no household to open in
    // (pool item world-opening-no-player-where-everyone-lives-in-group-quarters).
    const inQuarters = input.people.filter(
      (person) =>
        person.placeId === placeId &&
        person.tier !== "husk" &&
        ageOnDate(makeIsoDate(person.birthDate), at) >= PLAYER_MIN_AGE,
    ).length;
    throw new NoPlayerHereError(placeId, inQuarters);
  }
  const unit = seededUnit(input.seed, `opening-player:${placeId}`);
  const pick = adults[Math.floor(unit * adults.length)]!;
  return {
    ...pick,
    estimated: false,
    how: "town-adult",
    unit,
    among: adults.length,
  };
}

/**
 * The resident a chosen birthday makes the player (owner's Oct 26 playtest: a creator birthday of
 * 35 left the parent 47 and the schooling of a 17-year-old; Nov 16: a 17-year-old with a wife).
 * The world is drawn with a resident of the chosen age (`playerAge` in population.ts), and the
 * player is a resident whose own age on the opening day is the chosen age, born nearest the
 * chosen day, so their household, partner, children, schooling, work and money are the life
 * someone that age lived. The identity call then moves the birthday within that same age
 * (`applyChosenPerson`). A resident is passed over if the chosen day would leave a parent, or the
 * player as a parent, younger than the child-bearing minimum the kin builder keeps
 * (`OPENING_KIN`). Where the town holds nobody that age, the resident of the nearest age stands
 * in, marked as an estimate, and keeps their own birth date. Nothing here is drawn.
 */
function entrantBornNear(
  input: CoreInput,
  placeId: string,
  chosen: ReturnType<typeof makeIsoDate>,
  gender?: string,
): EntrantPick {
  const at = makeIsoDate(input.placeMetadata?.openingAgeOn ?? input.startedAt);
  const chosenAge = ageOnDate(chosen, at);
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
  const residents = townResidents(input, placeId).map((person) => ({
    person,
    age: ageOnDate(makeIsoDate(person.birthDate), at),
    apart: Math.abs(daysBetween(chosen, makeIsoDate(person.birthDate))),
  }));
  if (!residents.length) throw new Error("No resident here.");
  // The chosen age where anyone in town is that age, else the nearest age anyone is.
  const ageGap = (age: number) => Math.abs(age - chosenAge);
  const nearestGap = Math.min(...residents.map((row) => ageGap(row.age)));
  const ofAge = residents
    .filter((row) => ageGap(row.age) === nearestGap)
    .sort(
      (a, b) => a.apart - b.apart || a.person.id.localeCompare(b.person.id),
    );
  // A woman or a man is drawn from the residents of that sex, so the partner
  // the place gave the resident is one the chosen gender fits (owner, Nov 1,
  // v0.73.0: "it has chosen to make my character gay again"); nonbinary and
  // a place with none of that sex at the age take the nearest birthday.
  const sexed =
    gender === "female" || gender === "male"
      ? ofAge.filter((row) => row.person.looks?.gender === gender)
      : [];
  const pool = sexed.length ? sexed : ofAge;
  const pick = pool.find((row) => kinFit(row.person)) ?? pool[0]!;
  return {
    id: pick.person.id,
    age: pick.age,
    estimated: pick.age !== chosenAge,
    how: "chosen-age",
    chosenAge,
  };
}

/** The stages a world builds in, by key; the screen names each (`loading` in controls.json). */
export type BuildStage =
  | "people"
  | "past"
  | "economy"
  | "core"
  | "government"
  | "elections"
  | "budgets"
  | "legislature"
  | "cabinet"
  | "workings"
  | "history"
  | "warmup"
  | "opening"
  | "done";
type BuildOptions = {
  placeKey?: string;
  /**
   * Places a new game's draw already found no player in (every adult in group
   * quarters), each with its reason: the draw passes them over and takes the
   * same state's next place by the same ranking. Set by the build itself.
   */
  passedOver?: readonly { key: string; reason: string }[];
  minimumPeople?: number;
  /**
   * The two-level world (OPUS-CORE): the player, their household and
   * circle and the officials are full people; everyone else is counts,
   * filled in when met. The player is one of the town's adults (`entrantChoice`).
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
   * a resident of that age born nearest it (`entrantBornNear`), so their past
   * fits the age they chose.
   */
  playerBirthDate?: string;
  /**
   * With `playerBirthDate`: the gender the creator chose. The player is a
   * resident of that sex where the place has one at the age, so the partner
   * and household drawn for the resident are the ones that fit the player
   * (a woman drawn with a husband is not made a man beside him).
   */
  playerGender?: string;
  /** A custom world (M6-04): what the player changed from real data. */
  settings?: WorldSettings;
  /**
   * Days the world is built before its start date and run forward to it (src/core2/player-warm-up.ts), so
   * what an engine makes on its first steps already exists on day one. Default none; the New game route and
   * the day-zero check set `OPENING_WARMUP_DAYS`. The played person does nothing in them.
   */
  warmUpDays?: number;
  /**
   * The creator's choice of who the player is, applied before the warm-up runs, while the world is still on
   * the day it was built: the player picks who they are before their first day, and the weeks the world
   * runs on its own are lived as that person (core chooseIdentityV1 takes only that day).
   */
  chooseIdentity?: (core: CoreState, playerId: string) => void;
  /**
   * Sees the finished opening input just before the core starts from it
   * (the speed guard measures and hashes it; scripts/core2-guard/month.mjs).
   */
  onOpening?: (input: CoreInput) => void;
  /**
   * The built world, once its past and people exist and before the opening
   * story and first scene are drawn: the loading screen plays from it.
   */
  onWorld?: (core: CoreState, playerId: string | undefined) => void;
};
type Built = BenchWorld & { playerId?: string };

/** The warm-up the New game route and the day-zero check use (owner, Nov 14: the town in motion on day one). */
export const OPENING_WARMUP_DAYS = 31;

/** Builds the world in one go (tests and checks). */
export function buildBenchWorld(
  seed: string,
  date: string,
  options: BuildOptions = {},
): Built {
  for (let passing = options; ;) {
    try {
      const stages = benchWorldStages(seed, date, passing);
      for (;;) {
        const step = stages.next();
        if (step.done) return step.value;
      }
    } catch (error) {
      passing = passOver(passing, error);
    }
  }
}

/**
 * A new game's drawn place where no player can be picked is passed over and
 * the draw taken again without it; a place asked for by key, or any other
 * error, is thrown.
 */
function passOver(options: BuildOptions, error: unknown): BuildOptions {
  if (
    options.placeKey ||
    !(error instanceof NoPlayerHereError) ||
    !error.placeKey
  )
    throw error;
  return {
    ...options,
    passedOver: [
      ...(options.passedOver ?? []),
      { key: error.placeKey, reason: error.message },
    ],
  };
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
  for (let passing = options; ;) {
    try {
      const stages = benchWorldStages(seed, date, passing);
      for (;;) {
        const step = stages.next();
        if (step.done) {
          onStage("done");
          return step.value;
        }
        onStage(step.value);
        await new Promise((resolve) => setImmediate(resolve));
      }
    } catch (error) {
      passing = passOver(passing, error);
    }
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
  const startDate = date;
  const warmUp = Math.max(0, Math.floor(options.warmUpDays ?? 0));
  // A warm-up builds the world that many days early and runs it forward to the start date.
  if (warmUp) date = addDays(makeIsoDate(date), -warmUp);
  yield "people";
  const place = options.placeKey
    ? realLocalities().find((row) => row.key === options.placeKey)
    : selectBenchPlace(
        seed,
        corePlaceStateIdentities(),
        realLocalities().filter(
          (row) =>
            !options.passedOver?.some((passed) => passed.key === row.key),
        ),
      );
  if (!place) throw new Error(`Unknown place key: ${options.placeKey}`);
  const settings = options.settings ?? {};
  checkWorldSettings(settings);
  const minimumPeople = settings.population ?? options.minimumPeople;
  const built = buildPopulation({
    seed,
    startedAt: makeIsoDate(date),
    ...(warmUp ? { cohortsOn: makeIsoDate(startDate) } : {}),
    placeKey: place.key,
    ...(minimumPeople ? { minimumPeople } : {}),
    // With a resident of the age the creator's birthday makes the player, as
    // far as the place's households allow (`entrantBornNear`).
    ...(options.playerBirthDate
      ? {
          playerAge: ageOnDate(
            makeIsoDate(options.playerBirthDate),
            makeIsoDate(startDate),
          ),
        }
      : {}),
  });
  yield "past";
  // The ages that pick the player are the ages on the start date, not on the day the world is built.
  const population = warmUp
    ? {
        ...built,
        placeMetadata: {
          ...(built.placeMetadata ?? {}),
          openingAgeOn: startDate,
        },
      }
    : built;
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
    let pick: ReturnType<typeof entrantChoice>;
    try {
      pick = entrantChoice(
        input,
        place.context.jurisdiction.id,
        options.playerBirthDate,
        options.playerGender,
      );
    } catch (error) {
      if (error instanceof NoPlayerHereError) error.placeKey = place.key;
      throw error;
    }
    playerId = pick.id;
    // A town opens at its real Census size: the sample is the
    // people generated, and each counted household stands for as many real
    // households as the Census count is over the sample, unless asked for.
    const countScale =
      options.countScale ?? (minimumPeople ? 1 : censusScale(population));
    // How the player's age was set, for dev mode's "How this world opened".
    let withPlayer: CoreInput = {
      ...input,
      playerId,
      placeMetadata: {
        ...(input.placeMetadata ?? {}),
        openingPlayerPick: JSON.stringify(pick),
        // The places the new game's draw passed over first, for dev mode's
        // "How this world opened".
        ...(options.passedOver?.length
          ? { openingPassedOver: JSON.stringify(options.passedOver) }
          : {}),
      },
    };
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
    // The county's counted sample, weighted to its eligible voters, and years
    // in place on every household.
    const countySample = withCountySample(economy, kept);
    const weights = {
      ...(countScale !== 1
        ? { [place.context.jurisdiction.id]: countScale }
        : {}),
    };
    opening = scaleOutsideSales(
      settings.economy?.outsideDemand ?? 1,
      addTradeArea(
        withWorldEconomy(
          collapseToTwoLevels(
            withOrigins(
              withRoles(withYearsInPlace(countySample?.input ?? economy)),
            ),
            {
              keep: kept,
              ...(Object.keys(weights).length ? { weights } : {}),
            },
          ),
        ),
      ),
    );
  } else
    opening = withWorldEconomy(
      withPrivateTuition({
        ...withOrigins(input),
        finance: createOpeningFinance(input),
      }),
    );
  yield "core";
  options.onOpening?.(opening);
  // A talk at home can raise a printed story by its headline, in the words
  // the paper's own screen prints it with.
  const director = createDirector({
    watch: [],
    storyWords: wordPrintedStory,
    // A purpose stop opens only when its talk can be worded.
    wordsPurpose: (state, self, personId, entry) =>
      purposeScene(state, self, personId, entry, { includeHeld: true })
        ?.kind !== "skipped",
    // A scene that opens a talk stops the day only when the talk says
    // something past its opener: the talk's own composer, looking only, with
    // the one the scene opens with and the moment as its occasion.
    saysPastOpener: (state, self, personId, entry) => {
      const binding = entry.bindings[0];
      const type = SITUATION_LIBRARY.types.find(
        (row) => row.key === binding?.typeKey,
      ) as { purpose?: string } | undefined;
      if (!binding || binding.said || type?.purpose) return true;
      const talkToId = composeScene(state, self, personId, entry)?.talkToId;
      if (!talkToId) return true;
      const talk = openConversation(state, personId, talkToId, {
        director: self,
        occasionId: entry.momentId,
        presentIds: binding.presentIds,
        look: true,
      });
      return (
        talk.choices.length > 0 ||
        talk.lines.some(
          (line) => line.kind !== "greet" && line.kind !== "family-open",
        )
      );
    },
  });
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
  openOffices(core, seed, startDate);
  // Officials outside the town are people before anyone files, so state and
  // federal races draw named candidates from them (OPUS-OFFICIALS).
  openOfficials(core);
  yield "elections";
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  openRecord(core);
  yield "budgets";
  openBudgets(core);
  // Every other state's budget, in the same store, moved by the state's own economy.
  openOutsideBudgets(core);
  // Officials are paid from the treasuries budgets just opened (OPUS-CORE).
  openOfficialPay(core);
  openHomelessCount(core);
  // Disputes between two people from the layoffs and evictions above.
  openGrievance(core);
  // Crimes that happen to households, from the national rates and the web's factors (OPUS-CORE).
  openCrime(core);
  // The hours the police line pays its staff, a row per place and month.
  openPatrol(core);
  openEstates(core);
  openEmployerTaxes(core);
  yield "legislature";
  openLegislature(core);
  // Each government's body awards the town's public contracts (gov-public-contract-awards).
  openContracts(core);
  openProjects(core);
  // Chambers elect their leaders and seat committees; the executives
  // appoint their department heads and cabinets (OPUS-GOV).
  openLeadership(core);
  yield "cabinet";
  openExecutive(core, seed);
  // The president's cabinet and the line of succession (OPUS-GOV).
  openSuccession(core);
  openLawReach(core);
  // Everything that works through the government above, in the order the
  // modules' own tests open them: officials' staff, interest groups (hooks
  // on every bill's vote), other governments' lawmaking, state and federal
  // races elsewhere, ballot measures, recalls, the press, public meetings
  // (debates need the press's outlets) and constituent cases.
  yield "workings";
  openStaff(core);
  // The player asks people to serve, and they answer from their records (brief J).
  openServeAsks(core);
  openInterestGroups(core);
  openWorldLegislating(core);
  openWorldRaces(core);
  openBallotMeasures(core);
  openRecalls(core);
  openPress(core);
  openMeetings(core);
  openCases(core);
  // The town's strikes, protests and rallies, from how its term reads by area.
  openPublicAction(core);
  // The country's approval of its president, from the economy and what happened.
  openNationalOpinion(core);
  // What happens in the rest of the country, as results (disasters from FEMA's record).
  openNationalEvents(core);
  openClimate(core);
  // The officeholder's day (OFFICE-LOCAL): each local body's own meeting
  // calendar, the meeting as a scene, the player's chosen stops and the
  // character's own votes and desk decisions when the player does not stop.
  openOfficeDay(core, seed);
  // The President nominates and the Senate confirms when nobody plays the President.
  openPresidentActs(core);
  // Prosecutors, trials and prisons: reads the corruption engine's records.
  openJustice(core);
  // Ordinary crime, courts, jail, firearm laws and fire service.
  openPublicSafety(core);
  // The federal courts as a national flow and stock, from the Commission and the Bureau.
  openFederalCourts(core);
  yield "history";
  // The world has a past (OPUS-CORE): prior elections, voting records, law
  // histories, the year's news and what the public knows, before day one.
  openThePast(core, seed);
  // The government's history before day one (M1-14): how each official
  // reached their seat, kept for the person card to read. It takes
  // milliseconds, being coarse steps over the records the opening wrote.
  const preStart = defaultPreStart(core);
  if (preStart)
    runPreStart(core, preStartWindow(core, preStart.from, preStart.step));
  // The people the player starts out knowing have their whole past at the opening.
  openStartingCircle(core);
  // Sessions already sitting take up their work at the opening, so their bills are filed on day one.
  openSittingSessions(core);
  // Last, so everyone the opening seated has a health coverage record on day one
  // (people who arrive later get theirs on the next 1st); the household pays its premium.
  openCoverage(core);
  if (playerId) options.chooseIdentity?.(core, playerId);
  if (warmUp) {
    yield "warmup";
    director.whileWarming(() => warmUpOpening(core, startDate, playerId));
  }
  director.start(core);
  options.onWorld?.(core, playerId);
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
  recipes.set(core, {
    seed,
    date: startDate,
    options: {
      twoLevel: options.twoLevel,
      ...(warmUp ? { warmUpDays: warmUp } : {}),
      placeKey: place.key,
      ...(options.minimumPeople !== undefined
        ? { minimumPeople: options.minimumPeople }
        : {}),
      ...(options.countScale !== undefined
        ? { countScale: options.countScale }
        : {}),
      ...(options.playerBirthDate
        ? { playerBirthDate: options.playerBirthDate }
        : {}),
      ...(options.playerGender ? { playerGender: options.playerGender } : {}),
      ...(options.settings ? { settings: options.settings } : {}),
    },
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

/** How a world was built: its seed, its start date and the choices that shaped it. */
export interface BuildRecipe {
  readonly seed: string;
  readonly date: string;
  readonly options: BuildOptions;
}
const recipes = new WeakMap<CoreState, BuildRecipe>();

/**
 * The recipe a world was built from, so the same world can be built again as a
 * twin (dev mode's money check compares the played world with the same world
 * left alone). Kept beside the world, not in it; a world restored from a save
 * has none.
 */
export function buildRecipeOf(core: CoreState): BuildRecipe | undefined {
  return recipes.get(core);
}
