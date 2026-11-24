/**
 * The choice and share rules for a ballot that elects several at once (an
 * at-large race, elections-at-large-race-pooled step A): with one seat they
 * are the one-seat rules themselves; with more, a voter chooses their first
 * places and a counted record's people spread one vote a seat by the same
 * shares, none above the whole record.
 */
import { describe, expect, it } from "vitest";
import {
  blockShares,
  countedChoice,
  countedChoices,
  countedShareRule,
} from "./electorate";

const appeal = (totals: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(totals).map(([id, total]) => [id, { total }]),
  );
const sum = (parts: Readonly<Record<string, number>>) =>
  Object.values(parts).reduce((n, v) => n + v, 0);

describe("an at-large ballot's choice and shares", () => {
  it("with one seat is the one-seat rule", () => {
    const a = appeal({ x: 0.4, y: 0.1, z: -0.2 });
    expect(countedChoices(a, 1)).toEqual([countedChoice(a)]);
    const shares = countedShareRule([{ side: 0 }, { side: 0 }, { side: 0 }])(a);
    expect(blockShares(shares, 1)).toEqual(shares);
  });

  it("a voter chooses their first places, and leaves a vote blank on a tie at the last", () => {
    const a = appeal({ x: 0.4, y: 0.3, z: 0.1, w: -0.1 });
    expect(countedChoices(a, 2)).toEqual(["x", "y"]);
    expect(countedChoices(a, 3)).toEqual(["x", "y", "z"]);
    // y and z tie for second of two: only x is chosen.
    expect(countedChoices(appeal({ x: 0.4, y: 0.2, z: 0.2 }), 2)).toEqual([
      "x",
    ]);
    // No more candidates than seats: each the voter is not against.
    expect(countedChoices(appeal({ x: 0.1, y: -0.3 }), 3)).toEqual(["x"]);
  });

  it("a record's people give one vote a seat, spread by their shares, none past the whole record", () => {
    const shares = countedShareRule([
      { side: 0 },
      { side: 0 },
      { side: 0 },
      { side: 0 },
      { side: 0 },
    ])(appeal({ a: 1.5, b: 0.6, c: 0.5, d: 0.1, e: -0.4 }));
    for (const seats of [2, 3, 4]) {
      const parts = blockShares(shares, seats);
      expect(sum(parts)).toBeCloseTo(seats, 9);
      for (const v of Object.values(parts)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1 + 1e-12);
      }
      // The order of the one-seat shares is kept.
      const order = (r: Readonly<Record<string, number>>) =>
        Object.keys(r).sort((x, y) => r[y]! - r[x]! || x.localeCompare(y));
      expect(order(parts)).toEqual(order(shares));
    }
    // A small lead moves a little of the record, not the whole of it.
    const even = blockShares(
      countedShareRule([{ side: 0 }, { side: 0 }, { side: 0 }])(
        appeal({ a: 0.1, b: 0, c: 0 }),
      ),
      2,
    );
    expect(even.a!).toBeGreaterThan(even.b!);
    expect(even.a! - even.b!).toBeLessThan(0.1);
  });
});
