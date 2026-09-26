import { advanceWithWorldIntegrityAtEnd } from "../simulation/world";
import { ensureTownResidents } from "../simulation/living-world/town-residents";
import { ensureOpeningPriorLocalRecords } from "../simulation/living-world/developments";
import {
  ensureStateLegislatureOpening,
  prepareNationwideStateLegislatureOpeningChunks,
} from "../simulation/nationwide-world/state-legislature-opening";
import type { NationwideStateLegislatureOpeningChunk } from "../simulation/nationwide-world/state-legislature-opening";
import { ensureDistrictOfColumbiaCouncilOpening } from "../simulation/nationwide-world/district-of-columbia-council-opening";
import {
  ensureCountyCouncilOpening,
  ensureMunicipalCouncilOpening,
} from "../simulation/municipal-council-opening";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import { scheduleDcCouncilSitting } from "../simulation/dc-council-sittings";
import { scheduleLocalMemberAgendaIntakes } from "../simulation/governing/member-agenda";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import {
  canonicalJson,
  householdMembershipsAt,
  recordWorldEvent,
  ensureHomePartyChapters,
  ensureLivingWorldDevelopments,
  ensureLivingWorldOpening,
  ensurePressOpening,
  personName,
  ageOnDate,
  ensureWorldStartingConditions,
  LEGACY_WORLD_OPENING_VERSION,
  generatePoliticalStartingConditions,
  ensurePartyGoverningBodies,
  ensureHazardProduction,
  macroStartingConditions,
  worldOpeningVersionOf,
  CRUNCH46_WORLD_OPENING_VERSION,
} from "../simulation";
import { ensureMigrationSchedule } from "../simulation/migration";
import { ensureCrimeProduction } from "../simulation/crime";
import { ensureCrisisMortality } from "../simulation/crisis/mortality";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../simulation/macro-economy";
import type { World, EntityId } from "../simulation";
import { createNewGameWorld } from "./new-game";
import { proseDate } from "./prose-dates";
import type { NewGameSetup, NewGame } from "./new-game";
import { buildLifeIntroduction } from "./life-introduction";
import {
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";

export type OpeningLifePhase = "transition" | "world" | "household" | "play";
export interface OpeningLifeSession {
  readonly version: "opening-life-v1";
  readonly setup: NewGameSetup;
  readonly phase: OpeningLifePhase;
  readonly game: NewGame | null;
}

/** UI-CORE owns the fade. Creating its state does not build a World. */
export function prepareOpeningLife(setup: NewGameSetup): OpeningLifeSession {
  return { version: "opening-life-v1", setup, phase: "transition", game: null };
}

export interface OpeningLifeGenerationProgress {
  readonly label: string;
  readonly completed: number;
  readonly total: number;
}

export interface OpeningLifeGenerationOptions {
  readonly signal?: AbortSignal;
  readonly statesPerChunk?: number;
  readonly onProgress?: (progress: OpeningLifeGenerationProgress) => void;
  /** Lets the host paint between immutable preparation chunks. */
  readonly yieldControl?: () => Promise<void>;
}

/** Call once when the fade completes; duplicate activation returns the same save. */
export function generateOpeningLife(
  session: OpeningLifeSession,
  onProgress?: (progress: OpeningLifeGenerationProgress) => void,
): OpeningLifeSession {
  if (session.game) return session;
  // Every opening step is a write that would otherwise validate the whole
  // World on its own. A state with a large legislature seats hundreds of
  // members and their histories one write at a time, so the opening is built
  // with those checks deferred and the World it hands over is validated once,
  // in full, at the end.
  let built: OpeningLifeSession | undefined;
  advanceWithWorldIntegrityAtEnd(() => {
    built = buildOpeningLife(session, onProgress);
    return built.game!.world;
  });
  return built!;
}

/**
 * Asynchronous new-game path for a loading screen. Each state chunk is a
 * separate immutable World transition; progress is reported before yielding
 * control so the host can paint and can abort before play begins.
 */
export async function generateOpeningLifeWithProgress(
  session: OpeningLifeSession,
  options: OpeningLifeGenerationOptions = {},
): Promise<OpeningLifeSession> {
  if (session.game) return session;
  throwIfOpeningAborted(options.signal);
  let start: OpeningLifeBuildStart | undefined;
  advanceWithWorldIntegrityAtEnd(() => {
    start = beginOpeningLife(session);
    return start.world;
  });
  const beginning = start!;
  let world = beginning.world;

  if (beginning.prewarmNationwide) {
    const chunks = prepareNationwideStateLegislatureOpeningChunks(
      world,
      beginning.game.playerPersonId,
      {
        preferredFirstStateUsps: beginning.homeStateUsps,
        statesPerChunk: options.statesPerChunk,
      },
    );
    while (true) {
      throwIfOpeningAborted(options.signal);
      let step:
        | IteratorResult<NationwideStateLegislatureOpeningChunk, World>
        | undefined;
      world = advanceWithWorldIntegrityAtEnd(() => {
        step = chunks.next();
        return step.done ? world : step.value.world;
      }, world);
      if (step!.done) break;
      options.onProgress?.({
        label: "Preparing state legislatures",
        completed: step!.value.completedStates,
        total: step!.value.totalStates,
      });
      await (options.yieldControl ?? yieldOpeningPreparationToHost)();
    }
  }

  throwIfOpeningAborted(options.signal);
  let completed: OpeningLifeSession | undefined;
  advanceWithWorldIntegrityAtEnd(() => {
    completed = completeOpeningLife(beginning, world);
    return completed.game!.world;
  }, world);
  return completed!;
}

interface OpeningLifeBuildStart {
  readonly session: OpeningLifeSession;
  readonly game: NewGame;
  readonly world: World;
  readonly prewarmNationwide: boolean;
  readonly homeStateUsps: string | null;
}

function beginOpeningLife(session: OpeningLifeSession): OpeningLifeBuildStart {
  const game = createNewGameWorld(session.setup);
  // Begin persists this save's generated starting conditions first, so every
  // later opening step reads the same world. A legacy descriptor writes none.
  const conditioned = ensureWorldStartingConditions(game.world, {
    openingVersion:
      session.setup.worldOpeningVersion ?? LEGACY_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  // CHANGE: macro history starts from WORLD's persisted draw, or not at all.
  const economic = ensureMacroEconomyStarted(
    conditioned,
    macroStartForHistory(macroStartingConditions(conditioned)),
  );
  // A legacy replay descriptor keeps its prior construction exactly: its
  // opening governor holds a recorded tenure, not GOVERNING's dated term.
  // Both opening-data versions place the player and seat the vice president;
  // only "playtest65-v1" also writes the two fixed, already-concluded local
  // matters, which a replay descriptor recorded under it must keep rebuilding.
  const openingData = session.setup.openingDataVersion;
  const versionedOpening =
    openingData === "playtest65-v1" || openingData === "playtest65-v2";
  const placed = versionedOpening
    ? establishOpeningLocation(economic, game.playerPersonId)
    : economic;
  const staffed = establishOpeningOfficeholders(placed, game.playerPersonId, {
    datedTerms: session.setup.worldOpeningVersion !== undefined,
    includeVicePresident: versionedOpening,
  });
  const withPriorRecords =
    openingData === "playtest65-v1"
      ? ensureOpeningPriorLocalRecords(staffed, game.playerPersonId)
      : staffed;
  const living = ensureLivingWorldOpening(
    withPriorRecords,
    game.playerPersonId,
    session.setup.livingWorldMemberNameVersion,
  );
  const prewarmNationwide =
    worldOpeningVersionOf(living) === CRUNCH46_WORLD_OPENING_VERSION;
  if (!prewarmNationwide) {
    return {
      session,
      game,
      world: living,
      prewarmNationwide: false,
      homeStateUsps: null,
    };
  }

  const withLocalGovernment = ensureHomeLocalGovernment(
    living,
    game.playerPersonId,
  );
  const homeUsps = homeStateUsps(withLocalGovernment, game.playerPersonId);
  const withHomeLegislature =
    homeUsps === "DC"
      ? scheduleDcCouncilSitting(
          ensureDistrictOfColumbiaCouncilOpening(withLocalGovernment),
        )
      : homeUsps
        ? ensureStateLegislatureOpening(
            withLocalGovernment,
            game.playerPersonId,
            homeUsps,
          )
        : withLocalGovernment;
  return {
    session,
    game,
    world: withHomeLegislature,
    prewarmNationwide: true,
    homeStateUsps: homeUsps,
  };
}

function buildOpeningLife(
  session: OpeningLifeSession,
  onProgress?: (progress: OpeningLifeGenerationProgress) => void,
): OpeningLifeSession {
  const start = beginOpeningLife(session);
  let world = start.world;
  if (start.prewarmNationwide) {
    for (const chunk of prepareNationwideStateLegislatureOpeningChunks(
      world,
      start.game.playerPersonId,
      { preferredFirstStateUsps: start.homeStateUsps },
    )) {
      world = chunk.world;
      onProgress?.({
        label: "Preparing state legislatures",
        completed: chunk.completedStates,
        total: chunk.totalStates,
      });
    }
  }
  return completeOpeningLife(start, world);
}

function completeOpeningLife(
  start: OpeningLifeBuildStart,
  preparedWorld: World,
): OpeningLifeSession {
  const { session, game, prewarmNationwide } = start;
  const withLocalIntakes = prewarmNationwide
    ? scheduleLocalMemberAgendaIntakes(preparedWorld)
    : preparedWorld;
  const withParties = ensurePartyGoverningBodies(
    ensureHomePartyChapters(
      withLocalIntakes,
      game.playerPersonId,
      session.setup.partyChapterNameVersion,
    ),
    game.playerPersonId,
  );
  const withDevelopment = ensureLivingWorldDevelopments(
    withParties,
    game.playerPersonId,
  );
  const withHazards = ensureHazardProduction(withDevelopment);
  const withCrime = ensureCrimeProduction(withHazards);
  const withMortality = ensureOpeningMortality(
    withCrime,
    session.setup.worldOpeningVersion ?? LEGACY_WORLD_OPENING_VERSION,
  );
  const world = openedWorld(withMortality, game.playerPersonId);
  return {
    ...session,
    phase: "world",
    game: {
      ...game,
      // Congress, the national parties and public affiliations, once, after
      // the executives exist so they receive an affiliation in the same pass.
      // The hazard stream schedules its first monthly sample for a current
      // opening that has something exposed; a legacy save gets none.
      // CRUNCH47: the mortality model belongs to the world the player is
      // handed, not to whichever control they happen to press first. It used
      // to start only inside passOrdinaryDays, so a current opening shipped
      // without it and paths that move time another way — waiting for a
      // scheduled activity, a conversation, a venue — left a life that could
      // not die. Starting it here costs the clock's hot path nothing, and the
      // version gate keeps a legacy replay byte-identical: those saves still
      // start it on their first ordinary-day pass, as before.
      world,
    },
  };
}

/**
 * The home state's legislature, seated with real members, for a current
 * opening only: a legacy replay keeps exactly the world it always built.
 * After the living world so the national parties its members join exist.
 */
function ensureHomeLocalGovernment(
  world: World,
  playerPersonId: EntityId,
): World {
  const homeId = world.people[playerPersonId]?.homeJurisdictionId;
  const home = homeId ? lifePlaceByJurisdictionId(homeId) : null;
  const municipal = home ? municipalGovernmentForLifePlace(home) : null;
  const withCouncil = municipal
    ? ensureMunicipalCouncilOpening(world, municipal.key)
    : world;
  const withCountyBoards = homeLocalGovernmentUnits(
    withCouncil,
    playerPersonId,
  ).counties.reduce(
    (next, county) => ensureCountyCouncilOpening(next, county.id),
    withCouncil,
  );
  return withCountyBoards;
}

function throwIfOpeningAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("Opening preparation was aborted.");
  error.name = "AbortError";
  throw error;
}

function yieldOpeningPreparationToHost(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * The press seed pack runs only for an opening of the current version; a
 * legacy replay descriptor keeps exactly the world it always built, which is
 * what WORLD's unchanged-hash control depends on.
 */
function openedWorld(world: World, playerPersonId: EntityId): World {
  // Migration is scheduled only for a current opening too, so a legacy replay
  // keeps the world it always built (MIGRATION_SEAMS "old-saves").
  // The town's residents are seated before migration is scheduled, so the
  // first quarterly review already has neighbors who might leave.
  return pressOpeningApplies(world)
    ? ensureMigrationSchedule(
        ensureTownResidents(
          ensurePressOpening(world, playerPersonId),
          playerPersonId,
        ),
      )
    : world;
}

/** Whether this world is an opening of the version the press setup is for. */
export function pressOpeningApplies(world: World): boolean {
  return worldOpeningVersionOf(world) === CRUNCH46_WORLD_OPENING_VERSION;
}

/** Only a current opening; a legacy descriptor must rebuild its exact bytes. */
function ensureOpeningMortality(world: World, openingVersion: string): World {
  if (openingVersion !== CRUNCH46_WORLD_OPENING_VERSION) return world;
  return ensureCrisisMortality(world);
}

export function moveOpeningLife(
  session: OpeningLifeSession,
  action: "next" | "back" | "skip",
): OpeningLifeSession {
  if (!session.game) throw new Error("Finish generation before continuing.");
  const order: OpeningLifePhase[] = ["world", "household", "play"];
  const index = order.indexOf(session.phase);
  const phase =
    action === "skip"
      ? "play"
      : order[Math.max(0, Math.min(2, index + (action === "back" ? -1 : 1)))]!;
  return phase === session.phase ? session : { ...session, phase };
}

export function projectOpeningLife(world: World, personId: EntityId) {
  const person = world.people[personId];
  if (!person) throw new Error("The opening player is absent.");
  const household = buildLifeIntroduction(world, personId)!;
  return {
    name: personName(person),
    age: ageOnDate(person.birthDate, world.currentDate),
    date: proseDate(world.currentDate),
    place: household.placeName,
    household,
    officeholders: openingOfficeholders(world),
    context:
      "This is a fictional life. Public officeholders are simulation characters.",
  };
}

/** Restoring uses the saved World supplied by the existing save repository. */
export function restoreOpeningLife(
  session: OpeningLifeSession,
  world: World,
): OpeningLifeSession {
  if (
    !session.game ||
    session.game.world.id !== world.id ||
    !world.people[session.game.playerPersonId]
  )
    throw new Error("This save does not belong to the opening.");
  return { ...session, game: { ...session.game, world } };
}

export function sameOpeningSetup(
  left: NewGameSetup,
  right: NewGameSetup,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/** Keep one controller per Begin activation; duplicate transition callbacks share it. */
export function createOpeningLifeController(setup: NewGameSetup) {
  let current = prepareOpeningLife(setup);
  let progressiveGeneration: Promise<OpeningLifeSession> | null = null;
  return {
    read: (): OpeningLifeSession => current,
    finishTransition: (): OpeningLifeSession => {
      current = generateOpeningLife(current);
      return current;
    },
    finishTransitionWithProgress: (
      options: OpeningLifeGenerationOptions = {},
    ): Promise<OpeningLifeSession> => {
      if (current.game) return Promise.resolve(current);
      if (!progressiveGeneration) {
        const preparing = current;
        progressiveGeneration = generateOpeningLifeWithProgress(
          preparing,
          options,
        )
          .then((next) => {
            if (current === preparing) current = next;
            return current;
          })
          .finally(() => {
            progressiveGeneration = null;
          });
      }
      return progressiveGeneration;
    },
    navigate: (action: "next" | "back" | "skip"): OpeningLifeSession => {
      current = moveOpeningLife(current, action);
      return current;
    },
    replaceWorld: (world: World): OpeningLifeSession => {
      current = restoreOpeningLife(current, world);
      return current;
    },
  };
}

/** Canonical initial placement; orientation itself never opens an encounter. */
function establishOpeningLocation(world: World, personId: EntityId): World {
  if (
    world.history.events.some(
      (event) =>
        event.type === "life.scene.arrived" &&
        event.involvedEntityIds.includes(personId),
    )
  )
    return world;
  const membership = householdMembershipsAt(world, personId).find(
    (item) => item.state.residenceRole === "primary",
  );
  if (!membership?.location) return world;
  return recordWorldEvent(world, {
    stableKey: `playtest65:starting-location:${personId}`,
    type: "life.scene.arrived",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[personId]!.homeJurisdictionId,
    involvedEntityIds: [personId, membership.household.id],
    participants: [
      {
        personId,
        role: "presence:participant",
        detail: "At home when play begins",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["playtest65:initial-placement"],
    summary: "You are at home.",
    context: {
      location: {
        setting: "home",
        label: "Home",
        jurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
