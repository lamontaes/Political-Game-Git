/**
 * A crime lived is a reason for the side a person already holds. The crime
 * engine writes a victimization record for each full household it victimizes
 * (naming the household's members, or the one person for a robbery or an
 * assault). Each person it names takes it as a reason for the side their own
 * view holds on the question crime ties to, the police line, by the views
 * engine's amount for an event about the person themselves, citing the
 * record; no one else moves from it. Played for a year in the bench world in
 * a place drawn from all 56 on a seed nobody chose; a place where no full
 * household is victimized in the year is drawn again, a bounded number of
 * times.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CRIME_EVENT, CRIME_MODULE_ID, type CrimeMonth } from "./modules/crime";
import {
  registerStanceListener,
  viewOf,
  viewOn,
  VIEWS_MODULE_ID,
  type Stance,
} from "./modules/views";
import { livedQuestion } from "./outcome-news";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.LIVED_CRIME_SEED || randomBytes(8).toString("hex");
const REDRAWS = 5;
const POLICE = livedQuestion(CRIME_EVENT)!;

/** A stance move on the police line whose cause that day is a victimization record. */
interface Move {
  readonly personId: string;
  readonly date: string;
  readonly cause: Stance["causes"][number];
  readonly side: string;
  readonly viewNow: number;
  /** Their household when they moved: a household can change within the year. */
  readonly householdId: string | undefined;
}
const MOVES = new WeakMap<object, Move[]>();
registerStanceListener((api, personId, topic) => {
  if (topic !== POLICE) return;
  const stance = api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .get(`${personId}:${topic}`) as unknown as Stance;
  const moves = MOVES.get(api.state) ?? [];
  MOVES.set(api.state, moves);
  const view = viewOf(api, personId);
  for (const cause of stance.causes)
    if (
      cause.date === api.state.date &&
      cause.eventId.startsWith(`${CRIME_EVENT}:`)
    )
      moves.push({
        personId,
        date: api.state.date,
        cause,
        side: stance.desiredChange,
        viewNow: view ? viewOn(api, personId, topic, view.lean) : 0,
        householdId: (api.state as CoreState).people.get(personId)?.householdId,
      });
});

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "views-lived-crime");
  const core = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const api = coreAPI(core);
  let day = makeIsoDate(core.date);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const months = api
    .moduleState(CRIME_MODULE_ID)
    .table("months")
    .rows() as unknown as CrimeMonth[];
  const victims = months.flatMap((month) =>
    month.victims.map((victim) => ({ ...victim, month })),
  );
  return { place, core, victims, moves: MOVES.get(core) ?? [] };
}

describe(`a victimization moves its victims' view on the police (seed ${seed})`, () => {
  it("each person a victimization names moves toward the side they hold, citing the record, and no one else", () => {
    const priorBookkeeping = setBookkeeping(false);
    try {
      const tried: string[] = [];
      let drawSeed = seed;
      let run = play(drawSeed);
      for (let draw = 1; draw < REDRAWS && !run.victims.length; draw += 1) {
        tried.push(`${run.place.name}, ${run.place.state} (${drawSeed})`);
        drawSeed = `${seed}-${draw}`;
        run = play(drawSeed);
      }
      const where = `${run.place.name}, ${run.place.state}, seed ${drawSeed}`;
      if (!run.victims.length)
        throw new Error(
          `no full household was victimized in a year in ${REDRAWS} draws (${[...tried, where].join("; ")})`,
        );
      const { victims, moves } = run;
      const byEvent = new Map<string, Move[]>();
      for (const move of moves)
        byEvent.set(move.cause.eventId, [
          ...(byEvent.get(move.cause.eventId) ?? []),
          move,
        ]);
      for (const victim of victims) {
        const moved = byEvent.get(victim.eventId) ?? [];
        const at = `${where}: ${victim.eventId}`;
        expect(moved.length, `${at}: someone it names moved`).toBeGreaterThan(
          0,
        );
        for (const move of moved) {
          // Only the household's own people, by their own experience: no
          // speaker, no record learned from someone else.
          expect(move.householdId, `${at}: ${move.personId}`).toBe(
            victim.householdId,
          );
          expect(move.cause.speakerId, at).toBeUndefined();
          expect(move.cause.change, at).toBeGreaterThan(0);
          // Toward the side their own view holds.
          expect(["enact", "repeal"], at).toContain(move.side);
          expect(Math.sign(move.viewNow), at).toBe(
            move.side === "enact" ? 1 : -1,
          );
        }
      }
      // A victimization record moves no one outside the household it names.
      const recorded = new Set(victims.map((victim) => victim.eventId));
      for (const move of moves)
        expect(recorded.has(move.cause.eventId), move.cause.eventId).toBe(true);
      const first = victims.find((v) => byEvent.get(v.eventId)?.length)!;
      const move = byEvent.get(first.eventId)![0]!;
      console.log(
        `lived crime: ${where}${tried.length ? ` (drawn again after ${tried.join("; ")})` : ""}: ${victims.length} victimizations of full households, ${moves.length} stance moves on ${POLICE}; e.g. ${first.eventId} (web month ${first.month.webRecordId}, links ${first.month.types[first.type].links.join(", ") || "none"}) moved ${move.personId} toward ${move.side} by ${move.cause.change.toFixed(4)}`,
      );
    } finally {
      setBookkeeping(priorBookkeeping);
    }
  }, 2_400_000);
});
