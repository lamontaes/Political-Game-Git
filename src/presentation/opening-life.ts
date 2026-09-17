import {
  canonicalJson,
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
  worldOpeningVersionOf,
  CRUNCH46_WORLD_OPENING_VERSION,
  ensureHazardProduction,
  macroStartingConditions,
} from "../simulation";
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
  const staffed = establishOpeningOfficeholders(economic, game.playerPersonId);
  // Congress, the national parties and public affiliations, once, after
  // the executives exist so they receive an affiliation in the same pass.
  // The hazard stream schedules its first monthly sample for a current
  // opening that has something exposed; a legacy save gets none.
  const developed = ensureHazardProduction(
    ensureLivingWorldDevelopments(
      // Standing chapter committees exist only in current openings.
      ensurePartyGoverningBodies(
        ensureHomePartyChapters(
          ensureLivingWorldOpening(staffed, game.playerPersonId),
          game.playerPersonId,
        ),
        game.playerPersonId,
      ),
      game.playerPersonId,
    ),
  );
  return {
    ...session,
    phase: "world",
    game: {
      ...game,
      // CRUNCH46 PRESS: the national media seed pack and its desk, once, and
      // only in a recognized new opening. A legacy descriptor keeps its prior
      // construction exactly.
      world:
        worldOpeningVersionOf(developed) === CRUNCH46_WORLD_OPENING_VERSION
          ? ensurePressOpening(developed, game.playerPersonId)
          : developed,
    },
  };
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
