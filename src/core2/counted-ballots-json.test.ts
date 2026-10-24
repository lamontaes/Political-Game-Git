/**
 * Pool item elections-counted-ballots-nan-faith, pinned regression: with
 * bookkeeping on, an election whose counted voters include one with no
 * recorded faith stored NaN in the counted ballots, which module data
 * refuses, and the year stopped. Ocean Springs, Mississippi (drawn with seed
 * h1, purpose "nan-hunt") stopped on 2025-06-03 on main.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { bookkeeping, setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID } from "./modules/elections";
import { VOTING_MODULE_ID } from "./modules/voting";
import { coreAPI } from "./state";

it("counted ballots keep a missing faith or degree as null, and the election plays with bookkeeping on", () => {
  const place = drawPlace("h1", "nan-hunt");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const was = bookkeeping();
  setBookkeeping(true);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 140));
    const rows = coreAPI(core)
      .moduleState(VOTING_MODULE_ID)
      .table("countedBallots")
      .rows() as unknown as {
      id: string;
      faith?: (number | null)[];
      college?: (number | null)[];
    }[];
    expect(rows.length, `${where}: counted ballots kept`).toBeGreaterThan(0);
    let missing = 0;
    for (const row of rows)
      for (const value of [...(row.faith ?? []), ...(row.college ?? [])]) {
        if (value === null) missing += 1;
        else expect(Number.isFinite(value), `${where}: ${row.id}`).toBe(true);
      }
    // The case that stopped the year: a voter with no recorded faith.
    expect(missing, `${where}: voters with no recorded faith`).toBeGreaterThan(
      0,
    );
    process.stdout.write(
      `COUNTED BALLOTS ${where}: ${rows.length} rows to ${core.date}, ${missing} missing distances kept as null\n`,
    );
  } finally {
    setBookkeeping(was);
  }
  // The 140 days with bookkeeping on took 330 seconds on a 4-core container.
}, 600_000);

// A place drawn from all 56 on a seed nobody chose (COUNTED_BALLOTS_SEED pins
// one): its first election with counted ballots, held with bookkeeping on, keeps
// every voter's faith and degree distance as a finite number or null.
const seed = process.env.COUNTED_BALLOTS_SEED ?? randomBytes(8).toString("hex");

it(`a drawn place's first election keeps every counted distance finite or null with bookkeeping on (seed ${seed})`, () => {
  const was = bookkeeping();
  const tried: string[] = [];
  try {
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "counted-ballots-json");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const end = addDays(gameStartDate(), 365);
      const first = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as { electionDate: string }[]
      )
        .map((row) => row.electionDate)
        .filter((date) => date > core.date && date <= end)
        .sort()[0];
      if (!first) {
        tried.push(`${where}: no election in the year`);
        continue;
      }
      // Bookkeeping on from the day before: the guard checks each write.
      advanceCore(core, addDays(makeIsoDate(first), -1));
      setBookkeeping(true);
      advanceCore(core, addDays(makeIsoDate(first), 2));
      const rows = api
        .moduleState(VOTING_MODULE_ID)
        .table("countedBallots")
        .rows() as unknown as {
        id: string;
        faith?: (number | null)[];
        college?: (number | null)[];
      }[];
      if (!rows.length) {
        tried.push(`${where}: no counted ballots on ${first}`);
        continue;
      }
      let values = 0,
        missing = 0;
      for (const row of rows)
        for (const value of [...(row.faith ?? []), ...(row.college ?? [])]) {
          values += 1;
          if (value === null) missing += 1;
          else expect(Number.isFinite(value), `${where}: ${row.id}`).toBe(true);
        }
      expect(values, `${where}: distances kept`).toBeGreaterThan(0);
      process.stdout.write(
        `COUNTED BALLOTS ${where}: election ${first}, ${rows.length} rows, ${values} distances, ${missing} kept as null\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place held an election with counted ballots: ${tried.join("; ")}; ${seed}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 3_600_000);
