// @vitest-environment node
/**
 * The references every life term is measured against are read once a month,
 * at its start, and kept (Pins 18 review): a world saved mid-month and loaded
 * reads the same references the played world did, though the facts changed
 * between the month's start and the save. A world loaded with the kept row
 * taken away reads the facts of the save's day, which differ, so the check
 * is not passed by facts that never moved. A random place and seed each run,
 * named in every message (GOLDEN_PATH_SEED replays one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { peopleData, peopleModules } from "../director/play-modules";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { stakeReferences, STAKE_REFERENCES_ID } from "./life-stakes";
import { VIEWS_MODULE_ID } from "./modules/views";
import { newGame, runCommand } from "./saves";
import { restoreWorld, snapshotWorld } from "./snapshot";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "stake-references-kept");
const where = `${place.name} (${place.key}), seed ${place.seed}, replay ${replay}`;

it(
  `a month's references read the same after a mid-month save, ${where}`,
  {
    timeout: 900_000,
  },
  () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
      preStart: false as const,
    };
    // The people engines, the views engine among them, as play installs them.
    const options = { data: peopleData(), modules: () => peopleModules() };
    const game = newGame(recipe, options);
    // The first of the month after next, then most of that month.
    const first = makeIsoDate(
      `${addDays(gameStartDate(), 40).slice(0, "YYYY-MM".length)}-01`,
    );
    runCommand(game, "advance", { through: addDays(first, 1) });
    const atStart = stakeReferences(game.core);
    runCommand(game, "advance", { through: addDays(first, 24) });
    const later = stakeReferences(game.core);
    // The world as a save's snapshot holds it, put into a world freshly
    // built from the same recipe, as loading a save does.
    const snapshot = JSON.parse(JSON.stringify(snapshotWorld(game.core)));
    const load = () => {
      const fresh = newGame(recipe, options);
      restoreWorld(fresh.core, snapshot);
      return fresh;
    };
    const loaded = load();
    const reloaded = stakeReferences(loaded.core);
    // The facts of the save's day, with the kept row taken away.
    const bare = load();
    coreAPI(bare.core)
      .moduleState(VIEWS_MODULE_ID)
      .table("stakeReferences")
      .remove(STAKE_REFERENCES_ID);
    const today = stakeReferences(bare.core);
    process.stdout.write(
      `STAKE-REFERENCES ${where}: ${atStart.month} over ${atStart.people.toFixed(1)} people; kept ${JSON.stringify(atStart.reference)}; the save's day (${game.core.date}) reads ${JSON.stringify(today.reference)} over ${today.people.toFixed(1)}\n`,
    );
    expect(atStart.month, where).toBe(first.slice(0, "YYYY-MM".length));
    expect(later, where).toEqual(atStart);
    expect(reloaded.month, where).toBe(atStart.month);
    expect(reloaded.reference, where).toEqual(atStart.reference);
    expect(reloaded.people, where).toBe(atStart.people);
    expect(
      { reference: today.reference, people: today.people },
      `${where}: the facts moved between the month's start and the save`,
    ).not.toEqual({ reference: atStart.reference, people: atStart.people });
  },
);
