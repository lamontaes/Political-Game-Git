/**
 * Every counted move names what weighed toward it (pool item
 * people-in-state-moves-name-no-cause): within the town's state as across
 * states, the rate of leaving at the movers' age, and from another state the
 * pull toward this one; from abroad, the country tier's month that brought
 * them. Each names the records it read (Pins family 29). A played year of a place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, daysBetweenText, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { removeCountedPerson, residentsRuntime } from "./modules/residents";
import { countedMoves, type MoveRecord } from "./modules/counted-moves";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 4;
const YEAR_DAYS = 365;

/** Newcomers from outside the country: no state's leavers, so no pull between states. */
const fromAbroad = (row: MoveRecord) => row.fromPlace === "abroad";
const inState = (row: MoveRecord) =>
  row.fromPlace.endsWith(":rest-of-state") ||
  row.toPlace.endsWith(":rest-of-state");

it("every counted move in a played year, within the state or across states, records its causes", () => {
  const previousBookkeeping = setBookkeeping(false);
  try {
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
      const across = moves.filter((row) => !inState(row) && !fromAbroad(row));
      for (const row of moves) {
        // From abroad: the country tier's arrivals this month, and the tier's
        // row it read (no state's leavers, so no rate of leaving).
        if (fromAbroad(row)) {
          expect(row.reasons.fromAbroad, `${where}: ${row.id}`).toBeGreaterThan(
            0,
          );
          expect(row.reads?.fromAbroad?.length, `${where}: ${row.id}`).toBe(1);
        } else
          // The records the rate read: the tier's row for the state it left.
          expect(row.reads?.lifeStage?.length, `${where}: ${row.id}`).toBe(1);
        if (fromAbroad(row)) continue;
        // The rate its people's age leaves at, on every other move.
        // (or, for a household of minors alone that its group's movers came
        // due for, the group's rate: no adult of its own was weighed).
        expect(
          row.reasons.lifeStage ?? row.reasons.groupRate ?? 0,
          `${where}: ${row.id}`,
        ).toBeGreaterThan(0);
        expect(
          "lifeStage" in row.reasons && "groupRate" in row.reasons,
          `${where}: ${row.id} records one rate`,
        ).toBe(false);
        for (const [cause, value] of Object.entries(row.reasons))
          expect(Number.isFinite(value), `${where}: ${row.id} ${cause}`).toBe(
            true,
          );
        // Across states, the pull toward the place it went; within the state
        // the taxes and prices are the same, so there is none.
        expect(
          "income" in row.reasons && "jobs" in row.reasons,
          `${where}: ${row.id} ${JSON.stringify(row.reasons)}`,
        ).toBe(!inState(row) && !fromAbroad(row));
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
  } finally {
    setBookkeeping(previousBookkeeping);
  }
}, 600_000);

// A counted household of minors alone that moves out: the monthly weighing
// skips it (no adult to set a rate) and its group's due movers reach it. Its
// record must name the group's rate, never an adult's it did not have. Such a
// household is rare in a town-year (sixty drawn places once held none that
// moved), so the test builds it from the place's own records (CTO, Nov 18,
// 02:28Z): real households with minors and adults, one in each of their
// groups, lose their adults through the counted residents' own death
// (`removeCountedPerson`), and the year is played until one moves. Up to
// three places are drawn; each passed over is named.
const MINORS_PLACES = 3;
const MINORS_HOUSEHOLDS = 20;
it("a counted household of minors alone records its group's rate, and no web or age-set rate it was never weighed by", () => {
  const previousBookkeeping = setBookkeeping(false);
  try {
    const passed: string[] = [];
    for (let draw = 0; draw < MINORS_PLACES; draw += 1) {
      const place = drawPlace(`${seed}:minors:${draw}`, "counted-moves-causes");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const store = residentsRuntime(core)?.store;
      if (!store) {
        passed.push(`${where} (no counted residents)`);
        continue;
      }
      const minor = (m: number) =>
        daysBetweenText(store.born[m]!, core.date) / 365.25 < 18;
      const made = new Set<string>();
      const groups = new Set<number>();
      for (const household of [...store.liveHouseholds()]) {
        if (made.size >= MINORS_HOUSEHOLDS) break;
        if (groups.has(household.group)) continue;
        const members = store.countedMembers(household);
        if (!members.some(minor) || members.every(minor)) continue;
        for (const m of members)
          if (!minor(m)) removeCountedPerson(core, store.ids[m]!);
        made.add(household.id);
        groups.add(household.group);
      }
      if (!made.size) {
        passed.push(`${where} (no counted household with minors and adults)`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), YEAR_DAYS));
      const groupRated = countedMoves(coreAPI(core)).filter(
        (row) => row.reasons.groupRate !== undefined,
      );
      if (!groupRated.length) {
        passed.push(
          `${where} (${made.size} households left with minors alone; none moved in a year)`,
        );
        continue;
      }
      for (const row of groupRated) {
        expect(row.reasons.groupRate, `${where}: ${row.id}`).toBeGreaterThan(0);
        expect(row.reasons.lifeStage, `${where}: ${row.id}`).toBeUndefined();
        expect(row.reasons.web, `${where}: ${row.id}`).toBeUndefined();
      }
      process.stdout.write(
        `counted move causes, minors alone: ${where}; ${made.size} households left with minors alone, ${groupRated.length} such moves, e.g. ${groupRated[0]!.id} ${JSON.stringify(groupRated[0]!.reasons)}${passed.length ? `; passed over ${passed.join("; ")}` : ""}\n`,
      );
      return;
    }
    throw new Error(
      `no household of minors alone moved at ${MINORS_PLACES} drawn places: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(previousBookkeeping);
  }
}, 1_800_000);
