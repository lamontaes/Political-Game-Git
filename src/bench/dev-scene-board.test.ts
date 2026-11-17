/**
 * Dev mode's board in the scene trace (src/bench/dev-views/scene-trace.ts, pool item
 * director-dev-mode-board) through the bench's own request handler on a built world at a drawn
 * place. A scene is forced through `POST scene-trace/force` (the game's own event entry, no gate
 * lifted); the answer names the board's verdict, and `GET scene-trace/board` for that day shows the
 * forced cause's card with its gate or its pick, and the life's room as the pick read it. The rows'
 * boards are the ledger entries' own: the view computes nothing. A forced cause that never reached
 * the day's board (a stop rule staged it on a day nothing else waited) is passed over by name.
 */
import type { IncomingMessage } from "node:http";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { PersonId } from "../core2/types";
import type { BoardRoom, EntryBoard } from "../director/board";
import { handleDev } from "./dev-api";
import { loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const PLACES = 3;
/** Types dev mode forces at once by a record of their cause kind naming the player (scene-force-map.json). */
const FORCED = [
  "return",
  "news-arrives",
  "breakup",
  "rescue",
  "scandal",
  "celebration",
  "proposal",
  "move-in",
];

function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

interface Row {
  momentId: string;
  outcome: string;
  cause: { id: string; label: string } | null;
  board: EntryBoard;
}
interface Board {
  date: string;
  rows: Row[];
  room: BoardRoom | null;
}
interface Forced {
  causeRecords: string[];
  board: {
    verdict: "staged" | "held-back" | "not-weighed";
    reason: string | null;
    date: string | null;
    momentId: string | null;
  };
}

it("the scene trace's board shows a forced scene's card, its gate or pick and the room, as the ledger holds it", async () => {
  setBookkeeping(false);
  await loadDevViews();
  const passed: string[] = [];
  for (let draw = 0; draw < PLACES; draw++) {
    const place = drawPlace(SEED, `scene-board-${draw}`);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const playerId = world.playerId as PersonId;
    world.director.watch(world.core, playerId);
    const ask = async (method: string, path: string, input?: unknown) => {
      let answer: { status: number; value: unknown } | undefined;
      const handled = await handleDev(
        request(method, input),
        new URL(`http://bench/api/dev/${path}`),
        (status, value) => (answer = { status, value }),
        () => ({
          core: world.core,
          director: world.director,
          placeId: world.placeId,
        }),
      );
      expect(handled, `${where}: ${path} was not handled`).toBe(true);
      return answer!;
    };
    const cuts = (
      (await ask("GET", "views")).value as {
        name: string;
        labels?: { board?: { cuts: Record<string, string> } };
      }[]
    ).find((view) => view.name === "scene-trace")?.labels?.board?.cuts;
    expect(cuts, `${where}: the board's cut words`).toBeDefined();

    for (const typeKey of FORCED) {
      const forced = await ask("POST", "scene-trace/force", { typeKey });
      expect(forced.status, `${where}: ${JSON.stringify(forced.value)}`).toBe(
        200,
      );
      const { board: verdict, causeRecords } = forced.value as Forced;
      const causeId = causeRecords[0]!;
      if (verdict.verdict === "not-weighed" || !verdict.date) {
        passed.push(`${where}: ${typeKey} bound no moment`);
        continue;
      }
      // A held-back verdict names a gate the board's words know.
      if (verdict.verdict === "held-back")
        expect(
          Object.keys(cuts!),
          `${where}: ${typeKey} held back for ${verdict.reason}`,
        ).toContain(verdict.reason);

      const day = (await ask("GET", `scene-trace/board?date=${verdict.date}`))
        .value as Board;
      const book = world.director.ledger.people.get(playerId)!;
      // The view's rows are the ledger's entries of that day, each board as board.ts wrote it.
      const entries = book.schedule.filter(
        (entry) => entry.date === verdict.date && entry.board,
      );
      expect(
        day.rows.map((row) => [row.momentId, row.board]),
        `${where}: the board section equals the ledger's entries`,
      ).toEqual(entries.map((entry) => [entry.momentId, entry.board]));
      const row = day.rows.find((each) => each.cause?.id === causeId);
      expect(
        row,
        `${where}: the forced cause ${causeId} is on its day's board`,
      ).toBeDefined();
      const card = row!.board.cards.find((each) => each.typeKey === typeKey);
      if (!card) {
        passed.push(`${where}: ${typeKey}'s moment bound another type`);
        continue;
      }
      if (verdict.verdict === "staged")
        expect(row!.outcome, `${where}: ${typeKey} staged`).not.toBe(
          "journal-line",
        );
      else
        expect(
          [card.cut, row!.board.cut],
          `${where}: ${typeKey}'s gate on its card or its day`,
        ).toContain(verdict.reason);
      if (!day.room) {
        passed.push(
          `${where}: ${typeKey} ${verdict.verdict} on ${verdict.date}, a day with nothing waiting on the board`,
        );
        continue;
      }
      // The room as the pick read it: the pace times the standing, less this year's picks.
      expect(day.room.left, `${where}: the room`).toBeCloseTo(
        day.room.pace * day.room.standing - day.room.picks,
      );
      // The day before holds none of this day's rows: the view reads the day it is asked.
      const before = (
        await ask(
          "GET",
          `scene-trace/board?date=${addDays(makeIsoDate(verdict.date), -1)}`,
        )
      ).value as Board;
      expect(
        before.rows.some((each) => each.cause?.id === causeId),
        `${where}: the day before shows the forced cause`,
      ).toBe(false);
      process.stdout.write(
        `${where} (draw seed ${SEED}): forced ${typeKey} (${causeId}) on ${verdict.date}: ${verdict.verdict}${verdict.reason ? ` (${verdict.reason})` : ""}; card ${card.cut ?? "bound"}, felt ${row!.board.score}, picked ${row!.board.picked === true}; room ${JSON.stringify(day.room)}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
  }
  throw new Error(
    `No forced scene reached a day's board with its room at seed ${SEED}. Passed over: ${passed.join("; ")}`,
  );
}, 240_000);
