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
/** A move an institution's own calendar or waiting list makes (admitToRooms), not a household's. */
const institutional = (row: MoveRecord) =>
  row.direction === "discharged" || row.fromPlace === "waiting-list";
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
      const households = moves.filter((row) => !institutional(row));
      const within = households.filter(inState);
      const across = households.filter(
        (row) => !inState(row) && !fromAbroad(row),
      );
      for (const row of moves) {
        // An institution letting a resident go on its own calendar, or
        // filling a room from its waiting list (admitToRooms), is not a
        // household weighing a move: its cause is the institution's own,
        // never a rate of leaving, and one with no cause fails.
        if (institutional(row)) {
          expect(
            row.direction === "discharged"
              ? row.reasons["the institution's calendar"]
              : row.reasons["the institution's waiting list"],
            `${where}: ${row.id}`,
          ).toBeGreaterThan(0);
          continue;
        }
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

// Children whose household loses its last adult do not go on as a household
// of their own: relatives take them in first, and the state's foster care
// when there is no kin (CTO, Nov 18, 02:46Z; Lives builds it). So a month
// after the adults die, the counts hold no household of minors alone, and
// each of its minors is in a counted household with an adult or has left the
// household counts (for care). The condition is built from the place's own
// records (CTO, 02:28Z): real households with minors and adults, one in each
// of their groups, lose their adults through the counted residents' own death
// (`removeCountedPerson`). Up to three places are drawn; each passed over is
// named. (Before Lives' build, such a household joined an under-18 group that
// is never weighed, and so never moved: counted-groups.ts AGE_BANDS,
// counted-moves.ts groupPulls.)
const MINORS_PLACES = 3;
const MINORS_HOUSEHOLDS = 20;
const MINORS_DAYS = 35;
it("a household left with minors alone is gone a month later, its minors with kin or in care", () => {
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
      const made = new Map<string, string[]>();
      const groups = new Set<number>();
      for (const household of [...store.liveHouseholds()]) {
        if (made.size >= MINORS_HOUSEHOLDS) break;
        if (groups.has(household.group)) continue;
        const members = store.countedMembers(household);
        if (!members.some(minor) || members.every(minor)) continue;
        for (const m of members)
          if (!minor(m)) removeCountedPerson(core, store.ids[m]!);
        made.set(
          household.id,
          store.countedMembers(household).map((m) => store.ids[m]!),
        );
        groups.add(household.group);
      }
      if (!made.size) {
        passed.push(`${where} (no counted household with minors and adults)`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), MINORS_DAYS));
      const alone: string[] = [];
      for (const minors of made.values()) {
        for (const id of minors) {
          const m = store.countedMember(id);
          // Out of the household counts: taken into care, or filled in.
          if (m === undefined) continue;
          const home = store.households[store.household[m]!]!;
          const members = store.countedMembers(home);
          if (members.every(minor)) alone.push(`${id} in ${home.id}`);
        }
      }
      process.stdout.write(
        `minors alone: ${where}; ${made.size} households lost their adults; ${MINORS_DAYS} days later ${alone.length} minors still in a household of minors alone${passed.length ? `; passed over ${passed.join("; ")}` : ""}\n`,
      );
      expect(
        alone,
        `${where}: minors still in a household of minors alone ${MINORS_DAYS} days after its adults died`,
      ).toEqual([]);
      return;
    }
    throw new Error(
      `no drawn place in ${MINORS_PLACES} had a counted household with minors and adults: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(previousBookkeeping);
  }
}, 1_800_000);
