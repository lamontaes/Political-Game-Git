/**
 * The kept leans' writer and reader as pure rules (place-leans.ts), and the count's own
 * move (`ownMoves`, electorate.ts): a place's lean moves only by the part of its result
 * that was its own, and stays put through any number of elections with nothing of its
 * own at stake. The numbers are drawn each run; set LEAN_SEED to replay.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ownMoves, type RacePlace, type SampleVoter } from "./electorate";
import {
  carryLeans,
  leanOf,
  leanRow,
  setOpeningLean,
  withLeans,
  type LeanTable,
} from "./place-leans";

const seed = process.env.LEAN_SEED ?? randomBytes(6).toString("hex");
/** A number from 0 to 1 for a name, from the run's seed. */
const drawn = (name: string) => {
  let h = 2166136261;
  for (const ch of `${seed}:${name}`)
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
};
const rowsOf = (): LeanTable & { size: () => number } => {
  const map = new Map<string, { id: string }>();
  return {
    get: (id) => map.get(id),
    put: (row) => map.set(row.id, row),
    size: () => map.size,
  };
};
const where = `seed ${seed}`;

describe(`a place's kept lean: ${where}`, () => {
  const lean = 0.2 + 0.6 * drawn("lean");
  const move = 0.04 * (drawn("move") - 0.5);
  const strength = 0.1 + 0.8 * drawn("strength");
  const place = { id: "county:XX|Drawn", rightShare: lean };

  it("stays where it is through fifty elections with nothing of its own at stake", () => {
    const rows = rowsOf();
    for (let election = 0; election < 50; election += 1)
      carryLeans(rows, {
        date: `${String(2026 + 2 * election)}-11-03`,
        election: String(2026 + 2 * election),
        contestId: `race:${String(election)}`,
        strength,
        places: [
          {
            placeId: place.id,
            lean: leanOf(rows, place),
            ownMove: 0,
            // Whatever the tide and the candidates did to the result, none of it was the place's own.
            result: drawn(`result:${String(election)}`),
          },
        ],
      });
    expect(leanOf(rows, place), where).toBe(lean);
    expect(rows.size(), where).toBe(0);
  });

  it("moves by its own move times the strength, once a day however many contests counted it", () => {
    const rows = rowsOf();
    const second = 0.04 * (drawn("second") - 0.5);
    carryLeans(rows, {
      date: "2026-11-03",
      election: "2026",
      contestId: "race:senate",
      strength,
      places: [{ placeId: place.id, lean, ownMove: move, result: 0.5 }],
    });
    expect(leanOf(rows, place), where).toBeCloseTo(lean + strength * move, 12);
    carryLeans(rows, {
      date: "2026-11-03",
      election: "2026",
      contestId: "race:governor",
      strength,
      places: [{ placeId: place.id, lean, ownMove: second, result: 0.5 }],
    });
    // Two contests on one day: their mean, from the lean the day opened on.
    const afterDay = lean + (strength * (move + second)) / 2;
    expect(leanOf(rows, place), where).toBeCloseTo(afterDay, 12);
    carryLeans(rows, {
      date: "2028-11-07",
      election: "2028",
      contestId: "race:senate:2028",
      strength,
      places: [
        { placeId: place.id, lean: afterDay, ownMove: move, result: null },
      ],
    });
    // The next election starts from where the last one left it, not from the opening.
    expect(leanOf(rows, place), where).toBeCloseTo(
      afterDay + strength * move,
      12,
    );
    // The electors meet in December of the same election: one more contest of 2028, not a
    // second carry.
    carryLeans(rows, {
      date: "2028-12-19",
      election: "2028",
      contestId: "race:president",
      strength,
      places: [
        { placeId: place.id, lean: afterDay, ownMove: move, result: null },
      ],
    });
    expect(leanOf(rows, place), where).toBeCloseTo(
      afterDay + strength * move,
      12,
    );
    const row = leanRow(rows, place.id)!;
    expect(row.opening, where).toBe(lean);
    expect(row.day, where).toMatchObject({ election: "2028", contests: 2 });
    expect(row.last, where).toMatchObject({
      contestId: "race:president",
      countedOn: afterDay,
      ownMove: move,
    });
  });

  it("reads an opening lean a history set, and a county through its state's row where it has none of its own", () => {
    const rows = rowsOf();
    setOpeningLean(rows, place.id, 0.61, "a history's last record");
    expect(leanOf(rows, place), where).toBe(0.61);
    const state = { id: "state:XX", rightShare: 0.5 };
    const other = {
      id: "county:XX|Other",
      rightShare: 0.5 + 0.2 * drawn("other"),
    };
    // No row for the state: the county reads the value given for it.
    expect(leanOf(rows, other, state), where).toBe(other.rightShare);
    setOpeningLean(rows, state.id, 0.42, "a history's last record");
    // The state's row, with the county's own distance from its state laid on it.
    expect(leanOf(rows, other, state), where).toBeCloseTo(
      0.42 + (other.rightShare - 0.5),
      12,
    );
    expect(
      withLeans(rows, [place, other], state).map((p) => p.rightShare),
    ).toEqual([0.61, leanOf(rows, other, state)]);
  });
});

describe(`the part of a result that is the place's own: ${where}`, () => {
  // Four hundred voters evenly along the lean order, each ready alike.
  const sample: SampleVoter[] = Array.from({ length: 400 }, (_, at) => ({
    id: `voter:${String(at)}`,
    rank: (at + 0.5) / 400,
    readiness: 0,
    incumbentLean: 0,
    weight: 1,
  }));
  const placeOf = (
    id: string,
    rightShare: number,
    ownConditions?: number,
  ): RacePlace => ({
    id,
    name: id,
    eligible: 100_000,
    rightShare,
    votes2024: 60_000,
    source: "a test place",
    ...(ownConditions === undefined ? {} : { ownConditions }),
  });
  const share = 0.3 + 0.4 * drawn("share");
  const conditions = 0.02 + 0.1 * drawn("conditions");

  it("is nothing where the place has nothing of its own at stake, or no side holds the seat", () => {
    expect(ownMoves(sample, [placeOf("a", share)], 1).size, where).toBe(0);
    expect(ownMoves(sample, [placeOf("a", share, 0)], -1).size, where).toBe(0);
    expect(
      ownMoves(sample, [placeOf("a", share, conditions)], 0).size,
      where,
    ).toBe(0);
  });

  it("goes to the side that holds the seat when the place's conditions favor it, and against it when they do not", () => {
    const gains = ownMoves(sample, [placeOf("a", share, conditions)], 1).get(
      "a",
    )!;
    const loses = ownMoves(sample, [placeOf("a", share, -conditions)], 1).get(
      "a",
    )!;
    const left = ownMoves(sample, [placeOf("a", share, conditions)], -1).get(
      "a",
    )!;
    expect(gains, `${where}: ${String(gains)}`).toBeGreaterThan(0);
    expect(loses, `${where}: ${String(loses)}`).toBeLessThan(0);
    expect(left, `${where}: ${String(left)}`).toBeLessThan(0);
    // Larger conditions move it further.
    const more = ownMoves(sample, [placeOf("a", share, 2 * conditions)], 1).get(
      "a",
    )!;
    expect(more, where).toBeGreaterThan(gains);
  });
});
