/**
 * The director's board (board.ts) at a drawn place: the day's one pick is the
 * candidate felt most whose wordings hold, a candidate that fails a gate is
 * cut with that gate, a life with no room left picks nothing, equal amounts
 * break by the stable hash whatever order they came in, and over a played
 * stretch every watched person's day has at most one pick, every candidate
 * left on the board ends picked or cut, and no year holds more picks than the
 * life's pace. Places are drawn from all 56 (seed from GOLDEN_PATH_SEED,
 * random when unset).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { IsoDate, PersonId } from "../core2/types";
import { pickFromBoard, picksInYear } from "./board";
import { paceOf, SITUATION_LIBRARY, type ScheduleEntry } from "./scheduling";
import type { PersonLedger } from "./types";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(10).toString("hex");
const DAYS = 90;

/** A moment waiting on the day's board, as scheduleMoment leaves it. */
function waitingEntry(id: string, date: IsoDate, score: number): ScheduleEntry {
  return {
    momentId: id,
    date,
    outcome: "journal-line",
    mode: "live",
    interrupt: false,
    stopsSkip: false,
    rank: 1,
    pace: 1,
    bindings: [],
    board: { cards: [], reads: { impact: score }, score, pending: true },
  };
}

it(`the board picks the candidate felt most whose wordings hold, at a drawn place (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "director-board");
  const where = `${place.name} (${place.key}), seed ${seed}, world seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  director.watch(core, playerId);
  for (const seat of townSeats(coreAPI(core)))
    if (
      seat.holder?.personId &&
      !director.ledger.people.has(seat.holder.personId)
    )
      director.watch(core, seat.holder.personId);
  const date = makeIsoDate(core.date);
  const book = director.ledger.people.get(playerId)!;

  // A gate failed: the one felt most has no wordings, so it is cut with that
  // gate, and the next is the pick.
  const strongest = waitingEntry("board:strongest", date, 0.9);
  const middle = waitingEntry("board:middle", date, 0.5);
  const weakest = waitingEntry("board:weakest", date, 0.1);
  const picked = pickFromBoard(core, book, {
    date,
    mode: "live",
    pending: [weakest, strongest, middle],
    offers: [],
    worded: (entry) =>
      entry.momentId === strongest.momentId ? "silent" : undefined,
  });
  process.stderr.write(
    `board at ${where}: player ${playerId}; picked ${picked?.momentId}; cuts ${[strongest, middle, weakest].map((row) => `${row.momentId}=${row.board!.cut ?? "picked"}`).join(", ")}\n`,
  );
  expect(strongest.board!.cut, where).toBe("silent");
  expect(picked, where).toBe(middle);
  expect(middle.board!.picked, where).toBe(true);
  expect(middle.outcome, where).toBe("scene-waiting");
  expect(weakest.board!.cut, where).toBe("outscored");
  expect(weakest.outcome, where).toBe("journal-line");
  for (const row of [strongest, middle, weakest])
    expect(row.board!.pending, where).toBeUndefined();

  // While time is skipped a waiting scene cannot stop it: cut, no pick.
  const skipped = waitingEntry("board:skipped", date, 0.7);
  expect(
    pickFromBoard(core, book, {
      date,
      mode: "skipping",
      pending: [skipped],
      offers: [],
      worded: () => undefined,
    }),
    where,
  ).toBeUndefined();
  expect(skipped.board!.cut, where).toBe("skipping");

  // A life with no room left in its year picks nothing.
  const pace = paceOf(
    SITUATION_LIBRARY,
    core.people.get(playerId)!.birthDate,
    date,
  );
  const full: PersonLedger = {
    ...book,
    schedule: [
      ...book.schedule,
      ...Array.from({ length: pace }, (_, at) => ({
        ...waitingEntry(`board:earlier:${at}`, date, 0.3),
        board: {
          cards: [],
          reads: { impact: 0.3 },
          score: 0.3,
          picked: true as const,
        },
      })),
    ],
  };
  expect(
    picksInYear(SITUATION_LIBRARY, full, date),
    where,
  ).toBeGreaterThanOrEqual(pace);
  const late = waitingEntry("board:late", date, 0.8);
  expect(
    pickFromBoard(core, full, {
      date,
      mode: "live",
      pending: [late],
      offers: [],
      worded: () => undefined,
    }),
    where,
  ).toBeUndefined();
  expect(late.board!.cut, where).toBe("no-room");

  // Equal amounts break by the stable hash, whatever order they came in.
  const pickOf = (order: string[]) =>
    pickFromBoard(core, book, {
      date,
      mode: "live",
      pending: order.map((id) => waitingEntry(id, date, 0.4)),
      offers: [],
      worded: () => undefined,
    })?.momentId;
  const ids = ["board:tie:a", "board:tie:b", "board:tie:c"];
  expect(pickOf(ids), where).toBe(pickOf([...ids].reverse()));

  // A played stretch: at most one pick a day for each watched person, every
  // candidate left on the board ends picked or cut, and no year holds more
  // picks than the life's pace.
  for (let day = 0; day < DAYS; day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  let picks = 0;
  let cuts = 0;
  for (const [personId, watched] of director.ledger.people) {
    const byDay = new Map<string, number>();
    for (const entry of watched.schedule) {
      expect(
        entry.board?.pending,
        `${where}: ${entry.momentId}`,
      ).toBeUndefined();
      if (entry.board?.picked) {
        picks += 1;
        byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + 1);
      }
      if (entry.board?.cut) cuts += 1;
    }
    for (const [day, count] of byDay)
      expect(count, `${where}: ${personId} on ${day}`).toBe(1);
    const person = core.people.get(personId);
    if (person)
      expect(
        picksInYear(SITUATION_LIBRARY, watched, makeIsoDate(core.date)),
        `${where}: ${personId}`,
      ).toBeLessThanOrEqual(
        paceOf(SITUATION_LIBRARY, person.birthDate, makeIsoDate(core.date)),
      );
  }
  process.stderr.write(
    `board over ${DAYS} days at ${where}: ${director.ledger.people.size} watched, ${picks} picks, ${cuts} cut on the board\n`,
  );
}, 900_000);
