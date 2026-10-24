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
import types from "./data/crime/victimization.json" with { type: "json" };
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
  /** The side the person's view holds after the move: a lived crime only firms it up. */
  readonly side: "enact" | "repeal" | null;
  readonly viewNow: number;
  /**
   * The stance as a signed amount (enact positive, repeal negative) before and
   * after the day's write. A reason for the other side of a stance weakens it
   * and keeps its side while strength is left (`modules/views.ts`), so the
   * direction of a move is read from this, not from the stance's side.
   */
  readonly signedBefore: number | undefined;
  readonly signedNow: number;
  /** How many of the stance's causes are dated that day. */
  readonly causesToday: number;
  /** Their household when they moved: a household can change within the year. */
  readonly householdId: string | undefined;
}
const MOVES = new WeakMap<object, Move[]>();
const SIGNED = new WeakMap<object, Map<string, number>>();
const signed = (stance: Stance) =>
  (stance.desiredChange === "enact" ? 1 : -1) * stance.strength;
registerStanceListener((api, personId, topic) => {
  if (topic !== POLICE) return;
  const stance = api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .get(`${personId}:${topic}`) as unknown as Stance;
  const moves = MOVES.get(api.state) ?? [];
  MOVES.set(api.state, moves);
  const view = viewOf(api, personId);
  const viewNow = view ? viewOn(api, personId, topic, view.lean) : 0;
  const last = SIGNED.get(api.state) ?? new Map<string, number>();
  SIGNED.set(api.state, last);
  const signedBefore = last.get(personId);
  last.set(personId, signed(stance));
  const causesToday = stance.causes.filter(
    (cause) => cause.date === api.state.date,
  ).length;
  for (const cause of stance.causes)
    if (
      cause.date === api.state.date &&
      cause.eventId.startsWith(`${CRIME_EVENT}:`)
    )
      moves.push({
        personId,
        date: api.state.date,
        cause,
        side: viewNow > 0 ? "enact" : viewNow < 0 ? "repeal" : null,
        viewNow,
        signedBefore,
        signedNow: signed(stance),
        causesToday,
        householdId: (api.state as CoreState).people.get(personId)?.householdId,
      });
});

/**
 * On the day of each victimization, the people its record would move: for a
 * crime against the household, every member whose view takes a side on the
 * police line (a lived crime only firms a side up, so the side after the day
 * is the side before it); for one against a person, the record names one
 * member, so `atMostOne`.
 */
interface Expected {
  readonly holders: readonly string[];
  readonly atMostOne: boolean;
}

function play(drawSeed: string) {
  const place = drawPlace(drawSeed, "views-lived-crime");
  const core = buildBenchWorld(drawSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  }).core as CoreState;
  const api = coreAPI(core);
  const crimeMonths = () =>
    api
      .moduleState(CRIME_MODULE_ID)
      .table("months")
      .rows() as unknown as CrimeMonth[];
  const expected = new Map<string, Expected>();
  let day = makeIsoDate(core.date);
  const end = addDays(day, 365);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
    for (const month of crimeMonths())
      for (const victim of month.victims) {
        if (expected.has(victim.eventId)) continue;
        const memberIds = core.households.get(victim.householdId)?.memberIds;
        const holders = (memberIds ?? []).filter((id) => {
          const view = viewOf(api, id);
          return view && viewOn(api, id, POLICE, view.lean) !== 0;
        });
        expected.set(victim.eventId, {
          holders,
          atMostOne:
            (types.types as Record<string, { unit: string }>)[victim.type]
              ?.unit === "person",
        });
      }
  }
  const months = crimeMonths();
  const victims = months.flatMap((month) =>
    month.victims.map((victim) => ({ ...victim, month })),
  );
  return { place, core, victims, expected, moves: MOVES.get(core) ?? [] };
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
      const { victims, expected, moves } = run;
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
        // Each person it names who holds a side moves: every such member of
        // a burglarized household, the one victim of a robbery or assault.
        const want = expected.get(victim.eventId)!;
        const movers = new Set(moved.map((move) => move.personId));
        if (want.atMostOne) expect(movers.size, at).toBe(1);
        else expect([...movers].sort(), at).toEqual([...want.holders].sort());
        for (const move of moved) {
          // Only the household's own people, by their own experience: no
          // speaker, no record learned from someone else.
          expect(move.householdId, `${at}: ${move.personId}`).toBe(
            victim.householdId,
          );
          expect(move.cause.speakerId, at).toBeUndefined();
          expect(move.cause.change, at).toBeGreaterThan(0);
          // Toward the side their own view holds (a stance at full strength
          // cannot move further; on a day with other causes the move is
          // theirs too).
          expect(move.side, at).not.toBeNull();
          if (move.signedBefore !== undefined && move.causesToday === 1)
            expect(
              (move.signedNow - move.signedBefore) *
                (move.side === "enact" ? 1 : -1),
              at,
            ).toBeGreaterThanOrEqual(0);
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
