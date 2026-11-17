/**
 * Dev mode's director's day (dev-views/director-day.ts; pool items dev-mode-shows-the-directors-day
 * and dev-mode-shows-a-scenes-first-line-piece) through the bench's own request handler on a built
 * world at a drawn place. The player and the town's officials are watched and the world runs until
 * a watched person has a day with a scene held back (places passed over are named); then
 * `GET dev/director/day` for that person and day returns rows equal to the ledger's schedule entries
 * by moment and cause record id, with each held reason, the counts by outcome and reason, and the
 * bank piece a shown scene's first line opened on.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { handleDev } from "./dev-api";
import { loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const SEED = process.env.GOLDEN_PATH_SEED ?? `directors-day-${Date.now()}`;
const PLACES = 4;
const WAIT_DAYS = 400;

function request(): IncomingMessage {
  return {
    method: "GET",
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage;
}

interface Row {
  momentId: string;
  date: string;
  outcome: string;
  closed: string | null;
  cause: { id: string } | null;
  bound: { typeKey: string }[];
  held: { typeKey: string; reason: string }[];
  firstLine: { piece: string | null; facts: string[] } | null;
}
interface Day {
  personId: string;
  date: string;
  moments: Row[];
  byOutcome: Record<string, number>;
  byReason: Record<string, number>;
}

it("the director's day equals the ledger's entries, with a held scene and a first-line piece", async () => {
  setBookkeeping(false);
  await loadDevViews();
  const passed: string[] = [];
  for (let draw = 0; draw < PLACES; draw++) {
    const place = drawPlace(SEED, `directors-day-${draw}`);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    director.watch(core, world.playerId as PersonId);
    for (const seat of townSeats(coreAPI(core)))
      if (
        seat.holder?.personId &&
        !director.ledger.people.has(seat.holder.personId)
      )
        director.watch(core, seat.holder.personId);
    let found: { personId: PersonId; date: string } | undefined;
    for (let day = 0; day < WAIT_DAYS && !found; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const [personId, book] of director.ledger.people) {
        const entry = book.schedule.find(
          (row) =>
            row.date === core.date &&
            (row.heldBack?.length ?? 0) > 0 &&
            director.ledger.people.get(personId)!.schedule.length > 0,
        );
        if (entry) found = { personId, date: entry.date };
      }
    }
    if (!found) {
      passed.push(`${where}: no held scene in ${WAIT_DAYS} days`);
      continue;
    }
    const ask = async (path: string) => {
      let answer: { status: number; value: unknown } | undefined;
      const handled = await handleDev(
        request(),
        new URL(`http://bench/api/dev/${path}`),
        (status, value) => (answer = { status, value }),
        () => ({ core, director, placeId: world.placeId }),
      );
      expect(handled, `${where}: ${path} was not handled`).toBe(true);
      return answer!;
    };
    const answer = await ask(
      `director/day?person=${found.personId}&date=${found.date}`,
    );
    expect(answer.status, where).toBe(200);
    const day = answer.value as Day;
    const book = director.ledger.people.get(found.personId)!;
    const ledger = book.schedule.filter((row) => row.date === found!.date);
    // The route's rows are the ledger's entries, by moment id and cause record id.
    expect(
      day.moments.map((row) => row.momentId),
      where,
    ).toEqual(ledger.map((row) => row.momentId));
    expect(
      day.moments.map((row) => row.cause?.id),
      where,
    ).toEqual(ledger.map((row) => book.momentsById.get(row.momentId)?.causeId));
    expect(
      day.moments.map((row) => row.outcome),
      where,
    ).toEqual(ledger.map((row) => row.outcome));
    expect(
      day.moments.map((row) => row.held),
      where,
    ).toEqual(ledger.map((row) => row.heldBack ?? []));
    expect(
      day.moments.some((row) => row.held.length > 0),
      `${where}: a held scene`,
    ).toBe(true);
    // Counts by outcome and by reason come from the same rows.
    for (const outcome of new Set(ledger.map((row) => row.outcome)))
      expect(day.byOutcome[outcome], where).toBe(
        ledger.filter((row) => row.outcome === outcome).length,
      );
    const reasons = ledger.flatMap((row) => row.heldBack ?? []);
    for (const reason of new Set(reasons.map((row) => row.reason)))
      expect(day.byReason[reason], where).toBe(
        reasons.filter((row) => row.reason === reason).length,
      );
    // A shown scene carries the bank piece its first line opened on and what filled it. Look for
    // one on any day of a watched person's schedule: the route is asked for that day.
    let piece: { date: string; row: Row } | undefined;
    for (const [personId, other] of director.ledger.people) {
      for (const entry of other.schedule) {
        if (piece || entry.outcome === "journal-line" || !entry.bindings.length)
          continue;
        const shown = (
          (await ask(`director/day?person=${personId}&date=${entry.date}`))
            .value as Day
        ).moments.find(
          (row) => row.momentId === entry.momentId && row.firstLine?.piece,
        );
        if (shown) piece = { date: entry.date, row: shown };
      }
    }
    expect(
      piece,
      `${where}: a shown scene with a first-line piece`,
    ).toBeTruthy();
    expect(piece!.row.firstLine!.piece, where).toMatch(/^scene-words\./);
    process.stdout.write(
      `${where}: ${found.personId} on ${found.date}: ${day.moments.length} moments, held ${JSON.stringify(day.byReason)}; first-line piece ${piece!.row.firstLine!.piece} (${piece!.row.firstLine!.facts.join(", ")}); passed over: ${passed.join("; ") || "none"}\n`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a held scene (seed ${SEED}): ${passed.join("; ")}`,
  );
}, 900_000);
