/**
 * Every counted move names what weighed toward it (pool item
 * people-in-state-moves-name-no-cause): within the town's state as across
 * states, the rate of leaving at the movers' age, and from another state the
 * pull toward this one. A played year of a place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { countedMoves, type MoveRecord } from "./modules/counted-moves";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const YEAR_DAYS = 365;

const inState = (row: MoveRecord) =>
  row.fromPlace.endsWith(":rest-of-state") ||
  row.toPlace.endsWith(":rest-of-state");

it("every counted move in a played year, within the state or across states, records its causes", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "counted-moves-causes");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), YEAR_DAYS));
    setBookkeeping(true);
    const moves = countedMoves(coreAPI(core));
    const within = moves.filter(inState);
    const across = moves.filter((row) => !inState(row));
    for (const row of moves) {
      // The rate its people's age leaves at, on every move.
      expect(row.reasons.lifeStage ?? 0, `${where}: ${row.id}`).toBeGreaterThan(
        0,
      );
      for (const [cause, value] of Object.entries(row.reasons))
        expect(Number.isFinite(value), `${where}: ${row.id} ${cause}`).toBe(
          true,
        );
      // Across states, the pull toward the place it went; within the state
      // the taxes and prices are the same, so there is none.
      expect(
        "income" in row.reasons && "jobs" in row.reasons,
        `${where}: ${row.id} ${JSON.stringify(row.reasons)}`,
      ).toBe(!inState(row));
    }
    if (!within.length || !across.length) {
      tried.push(
        `${where}: ${within.length} counted moves within the state and ${across.length} across states`,
      );
      continue;
    }
    const shown = [within, across].flatMap((rows) =>
      (["out", "in"] as const).flatMap((direction) => {
        const row = rows.find((r) => r.direction === direction);
        return row ? [row] : [];
      }),
    );
    for (const row of shown)
      process.stdout.write(
        `counted move causes: ${where}; ${row.id} ${row.fromPlace} to ${row.toPlace} ${JSON.stringify(row.reasons)}\n`,
      );
    process.stdout.write(
      `counted move causes: ${where}; ${moves.length} counted moves in a year, ${within.length} within the state and ${across.length} across states, every one with its causes\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had counted moves both within its state and across states: ${tried.join("; ")}`,
  );
}, 1_800_000);
