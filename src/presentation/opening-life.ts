import { ensureOpeningPriorLocalRecords } from "../simulation/living-world/developments";
import { ensureStateLegislatureOpening } from "../simulation/nationwide-world/state-legislature-opening";
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

/** Call once when the fade completes; duplicate activation returns the same save. */
export function generateOpeningLife(
  session: OpeningLifeSession,
): OpeningLifeSession {
  if (session.game) return session;
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
  const placed =
    session.setup.openingDataVersion === "playtest65-v1"
      ? establishOpeningLocation(economic, game.playerPersonId)
      : economic;
  const staffed = establishOpeningOfficeholders(placed, game.playerPersonId, {
    datedTerms: session.setup.worldOpeningVersion !== undefined,
    includeVicePresident: session.setup.openingDataVersion === "playtest65-v1",
  });
  const withPriorRecords =
    session.setup.openingDataVersion === "playtest65-v1"
      ? ensureOpeningPriorLocalRecords(staffed, game.playerPersonId)
      : staffed;
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
      world: openedWorld(
        ensureOpeningMortality(
          ensureHazardProduction(
            ensureLivingWorldDevelopments(
              // Standing chapter committees exist only in current openings.
              ensurePartyGoverningBodies(
                ensureHomePartyChapters(
                  ensureHomeStateLegislature(
                    ensureLivingWorldOpening(
                      withPriorRecords,
                      game.playerPersonId,
                      session.setup.livingWorldMemberNameVersion,
                    ),
                    game.playerPersonId,
                  ),
                  game.playerPersonId,
                ),
                game.playerPersonId,
              ),
              game.playerPersonId,
            ),
          ),
          session.setup.worldOpeningVersion ?? LEGACY_WORLD_OPENING_VERSION,
        ),
        game.playerPersonId,
      ),
    },
  };
}

/**
 * The home state's legislature, seated with real members, for a current
 * opening only: a legacy replay keeps exactly the world it always built.
 * After the living world so the national parties its members join exist.
 */
function ensureHomeStateLegislature(
  world: World,
  playerPersonId: EntityId,
): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION) {
    return world;
  }
  const stateUsps = homeStateUsps(world, playerPersonId);
  return stateUsps
    ? ensureStateLegislatureOpening(world, playerPersonId, stateUsps)
    : world;
}

/**
 * The press seed pack runs only for an opening of the current version; a
 * legacy replay descriptor keeps exactly the world it always built, which is
 * what WORLD's unchanged-hash control depends on.
 */
function openedWorld(world: World, playerPersonId: EntityId): World {
  return pressOpeningApplies(world)
    ? ensurePressOpening(world, playerPersonId)
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
  return {
    read: (): OpeningLifeSession => current,
    finishTransition: (): OpeningLifeSession => {
      current = generateOpeningLife(current);
      return current;
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
