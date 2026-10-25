/**
 * Saves that last (M7-02). A save is how the world was made (place, seed,
 * custom settings) plus every command the player gave, with its date. The
 * simulation is deterministic, so loading rebuilds the town and replays the
 * commands. An update never breaks a save: the world simply runs under the
 * new rules, and a command the new version can't replay is skipped and noted
 * (a player choice that no longer exists falls back to the character's own).
 *
 * Every player action goes through `runCommand`, so it is recorded. Engines
 * register their own command kinds with `registerCommand`.
 */
import { makeIsoDate } from "./kernel/dates";
import { CORE_API_VERSION } from "./data";
import { advanceCore, createLifeCore } from "./life";
import {
  advancePlayerV1,
  playerClockAtRestV1,
  resumePlayerV1,
} from "./player-v1";
import { preStartWindow, runPreStart } from "./pre-start";
import {
  restoreWorld,
  snapshotWorld,
  uncoveredModules,
  type WorldSnapshot,
} from "./snapshot";
import { coreAPI, fillInIdentity, fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { WorldSettings } from "./world-settings";
import type {
  CoreData,
  CoreInput,
  CoreModule,
  CoreState,
  IsoDate,
} from "./types";

export const SAVE_FORMAT = "core2-save-v1";

export interface GameRecipe {
  /** The drawn place: its generation seed and recorded locality key. */
  place: { seed: string; key: string };
  twoLevel: boolean;
  settings?: WorldSettings;
  /**
   * History before the start: each engine's pre-start pass from this date
   * (M1-14). Left out, it runs from the parameter table's year
   * (`preStartFromYear`, `preStartStepMonths`); `false` skips it.
   */
  preStart?: { from: string; step?: "month" | "quarter" } | false;
}

export interface SaveCommand {
  date: IsoDate;
  kind: string;
  payload: unknown;
}

export interface SaveV1 {
  format: typeof SAVE_FORMAT;
  coreApiVersion: string;
  recipe: GameRecipe;
  /** Every command, so the save loads under any later version. */
  commands: readonly SaveCommand[];
  savedAt: IsoDate;
  /**
   * The world as it stood (owner's ruling 7), and how many of the commands it
   * already includes. Loading under the same version restores it and replays
   * only the commands after; otherwise the save replays from the opening.
   */
  snapshot?: { world: WorldSnapshot; commandCount: number };
}

export interface Game {
  core: CoreState;
  recipe: GameRecipe;
  commands: SaveCommand[];
  /** Commands a load could not replay under this version, with the reason. */
  skipped: { command: SaveCommand; reason: string }[];
  /** The core version a loaded save was made under, when it isn't this one. */
  upgradedFrom?: string;
}

export interface GameOptions {
  /** Engines to install, built fresh for each game (they may hold state). */
  modules?: () => readonly CoreModule[];
  data?: CoreData;
  observer?: boolean;
  /** Adds an engine's records to the opening before the core is built (e.g. withWorldEconomy). */
  input?: (input: CoreInput) => CoreInput;
  /** Runs once after the core is created (e.g. engines' opening steps). */
  afterCreate?: (core: CoreState) => void;
}

type CommandHandler = (core: CoreState, payload: never) => unknown;
const handlers = new Map<string, CommandHandler>();

/** An engine's player action, replayable from a save. */
export function registerCommand<P>(
  kind: string,
  handler: (core: CoreState, payload: P) => unknown,
): void {
  if (handlers.has(kind) && handlers.get(kind) !== handler)
    throw new Error(`Command already registered: ${kind}`);
  handlers.set(kind, handler as CommandHandler);
}

registerCommand<{ through: string }>("advance", (core, payload) =>
  advanceCore(core, payload.through),
);
registerCommand<Parameters<typeof advancePlayerV1>[1]>(
  "player.advance",
  (core, payload) => advancePlayerV1(core, payload),
);
registerCommand<Parameters<typeof resumePlayerV1>[1]>(
  "player.resume",
  (core, payload) => resumePlayerV1(core, payload),
);
registerCommand<{ personId: string }>("fill-in", (core, payload) =>
  fillInPerson(core, payload.personId),
);
registerCommand<Parameters<typeof fillInIdentity>[1]>(
  "fill-in.identity",
  (core, payload) => fillInIdentity(core, payload),
);

/** The owner's default: coarse history from the parameter table's year to the start. */
export function defaultPreStart(
  core: Game["core"],
): { from: string; step: "month" | "quarter" } | false {
  const api = coreAPI(core);
  const from = `${api.parameter("preStartFromYear")}-01-01`;
  if (from >= core.date) return false;
  return {
    from,
    step: api.parameter("preStartStepMonths") === 1 ? "month" : "quarter",
  };
}

export function newGame(recipe: GameRecipe, options: GameOptions = {}): Game {
  const opening = generatedOpening(recipe.place, {
    twoLevel: recipe.twoLevel,
    ...(recipe.settings ? { settings: recipe.settings } : {}),
  });
  const input = options.input ? options.input(opening) : opening;
  const core = createLifeCore(input, {
    ...(options.data ? { data: options.data } : {}),
    ...(options.observer !== undefined ? { observer: options.observer } : {}),
    ...(options.modules ? { modules: options.modules() } : {}),
  });
  options.afterCreate?.(core);
  const preStart = recipe.preStart ?? defaultPreStart(core);
  if (preStart)
    runPreStart(core, preStartWindow(core, preStart.from, preStart.step));
  return { core, recipe, commands: [], skipped: [] };
}

/** Run a player action and record it for the save. */
export function runCommand<R = unknown>(
  game: Game,
  kind: string,
  payload: unknown,
): R {
  const handler = handlers.get(kind);
  if (!handler) throw new Error(`Unregistered command: ${kind}`);
  const command: SaveCommand = {
    date: makeIsoDate(game.core.date),
    kind,
    payload: JSON.parse(JSON.stringify(payload ?? null)),
  };
  // Recorded before it runs, so a command that fails is in the save (and a
  // bug report replays to the failure).
  game.commands.push(command);
  return handler(game.core, command.payload as never) as R;
}

/**
 * The save: the recipe and every command, plus a snapshot of the world when
 * every installed engine's state is covered and the player clock is at rest
 * (`snapshot: false` leaves it out).
 */
export function saveGame(
  game: Game,
  options: { snapshot?: boolean } = {},
): SaveV1 {
  const snapshot =
    options.snapshot !== false &&
    uncoveredModules(game.core).length === 0 &&
    playerClockAtRestV1(game.core)
      ? {
          world: snapshotWorld(game.core),
          commandCount: game.commands.length,
        }
      : undefined;
  return {
    format: SAVE_FORMAT,
    coreApiVersion: CORE_API_VERSION,
    recipe: JSON.parse(JSON.stringify(game.recipe)),
    commands: JSON.parse(JSON.stringify(game.commands)),
    savedAt: makeIsoDate(game.core.date),
    ...(snapshot ? { snapshot } : {}),
  };
}

/** The world restored from the save's snapshot, or undefined when it can't be. */
function fromSnapshot(save: SaveV1, options: GameOptions): Game | undefined {
  const snapshot = save.snapshot;
  if (!snapshot || save.coreApiVersion !== CORE_API_VERSION) return undefined;
  // The snapshot already holds the history before the start.
  const game = newGame({ ...save.recipe, preStart: false }, options);
  if (uncoveredModules(game.core).length) return undefined;
  restoreWorld(game.core, snapshot.world);
  game.recipe = save.recipe;
  game.commands = save.commands.slice(0, snapshot.commandCount);
  return game;
}

/**
 * Load a save: from its snapshot when it can (then only later commands
 * replay), else rebuild the world and replay every command, skipping what no
 * longer applies.
 */
export function loadGame(save: SaveV1, options: GameOptions = {}): Game {
  if (save.format !== SAVE_FORMAT)
    throw new Error(`Unknown save format: ${String(save.format)}`);
  const restored = fromSnapshot(save, options);
  const game = restored ?? newGame(save.recipe, options);
  if (save.coreApiVersion !== CORE_API_VERSION)
    game.upgradedFrom = save.coreApiVersion;
  const later = restored
    ? save.commands.slice(save.snapshot!.commandCount)
    : save.commands;
  for (const command of later) {
    try {
      if (command.date > game.core.date)
        runCommand(game, "advance", { through: command.date });
      runCommand(game, command.kind, command.payload);
    } catch (error) {
      game.skipped.push({
        command,
        reason: error instanceof Error ? error.message : String(error),
      });
      // A choice that no longer exists: the character decides for itself.
      if (command.kind === "player.resume") {
        const payload = command.payload as { pauseId?: string };
        try {
          if (payload.pauseId)
            runCommand(game, "player.resume", {
              kind: "own-choice",
              pauseId: payload.pauseId,
            });
        } catch {
          // The pause itself no longer exists; replay continues.
        }
      }
    }
  }
  if (save.savedAt > game.core.date)
    runCommand(game, "advance", { through: save.savedAt });
  return game;
}
