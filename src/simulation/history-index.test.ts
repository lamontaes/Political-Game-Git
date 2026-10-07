import { describe, expect, it } from "vitest";

import { eventIndexOf } from "./event-index";
import {
  appendedList,
  growingIndex,
  type GrowingIndexKind,
  hasStableKey,
  indexFollowingAppends,
  recordById,
  recordByStableKey,
  recordsByKey,
  recordsByStringField,
  recordsWithFieldValue,
  releaseHistoryReadIndexes,
  withHistoryAppendTransaction,
} from "./history-index";
import type { HistoricalEvent } from "./types";
import type { EntityId, World } from "./types";

describe("state-intake history copy transaction", () => {
  const row = (id: string, personId = "p") => ({
    id: id as EntityId,
    stableKey: `tendency:${id}`,
    personId,
  });
  const worldWith = (records: readonly ReturnType<typeof row>[]) =>
    ({
      history: { personalityTendencies: records, events: [] },
    }) as unknown as World;

  it("adopts proven append lines without rereading their first record and still checks rewritten prefixes", () => {
    let firstReads = 0;
    const base = new Proxy([row("a"), row("middle"), row("last")], {
      get(target, key, receiver) {
        if (key === "0") firstReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    expect(recordById(base, "a" as EntityId)).toBe(base[0]);
    const afterBuild = firstReads;
    let prefix: readonly ReturnType<typeof row>[] = base;
    let sibling: readonly ReturnType<typeof row>[] = base;
    const result = withHistoryAppendTransaction(
      worldWith(base),
      ["personalityTendencies"],
      () => {
        let records = base;
        for (let at = 0; at < 20; at += 1) {
          const added = row(`added:${at}`);
          records = appendedList(records, [added]);
          expect(recordById(records, added.id)).toBe(added);
          if (at === 9) prefix = records;
        }
        expect(firstReads).toBe(afterBuild);
        sibling = appendedList(prefix, [row("sibling")]);
        expect(recordById(sibling, "added:19" as EntityId)).toBeUndefined();
        expect(recordById(sibling, "sibling" as EntityId)).toBe(sibling.at(-1));
        return worldWith(records);
      },
    );
    expect(prefix).toHaveLength(13);
    expect(recordById(prefix, "added:19" as EntityId)).toBeUndefined();
    expect(recordById(sibling, "added:19" as EntityId)).toBeUndefined();
    expect(
      recordById(result.history.personalityTendencies, "sibling" as EntityId),
    ).toBeUndefined();
    const rewritten = [base[0]!, row("replacement"), base[2]!];
    const grown = appendedList(rewritten, [row("new")]);
    expect(recordById(grown, "middle" as EntityId)).toBeUndefined();
    expect(recordById(grown, "replacement" as EntityId)).toBe(rewritten[1]);
    expect(recordById(base, "middle" as EntityId)).toBe(base[1]);
  });

  it.each([false, true])(
    "materializes shared-family branches (same view: %s)",
    (sameView) => {
      const base = Object.freeze([row("a")]);
      const world = {
        history: { personalityTendencies: base, events: base },
      } as unknown as World;
      let prefix: readonly ReturnType<typeof row>[] = base;
      let sibling: readonly ReturnType<typeof row>[] = base;
      const result = withHistoryAppendTransaction(
        world,
        ["personalityTendencies", "events"],
        () => {
          prefix = appendedList(base, [row("prefix")]);
          const left = appendedList(prefix, [row("left")]);
          sibling = appendedList(prefix, [row("right")]);
          return {
            history: {
              personalityTendencies: left,
              events: sameView ? left : sibling,
            },
          } as unknown as World;
        },
      );
      expect(result.history.personalityTendencies.map((r) => r.id)).toEqual([
        "a",
        "prefix",
        "left",
      ]);
      expect(result.history.events.map((r) => r.id)).toEqual([
        "a",
        "prefix",
        sameView ? "left" : "right",
      ]);
      for (const records of [
        result.history.personalityTendencies,
        result.history.events,
      ]) {
        expect(Object.getOwnPropertyDescriptor(records, "0")?.writable).toBe(
          true,
        );
      }
      expect([...prefix].map((r) => r.id)).toEqual(["a", "prefix"]);
      expect(sibling.map((r) => r.id)).toEqual(["a", "prefix", "right"]);
      expect(appendedList(sibling, [row("later")]).map((r) => r.id)).toEqual([
        "a",
        "prefix",
        "right",
        "later",
      ]);
      expect(recordById(sibling, "left" as EntityId)).toBeUndefined();
    },
  );

  it("keeps every intermediate cutoff and branch immutable, with ordinary array reads", () => {
    const base = Object.freeze([row("a"), row("b", "q")]);
    const world = worldWith(base);
    let first: readonly ReturnType<typeof row>[] = [];
    let second: readonly ReturnType<typeof row>[] = [];
    const result = withHistoryAppendTransaction(
      world,
      ["personalityTendencies"],
      () => {
        first = appendedList(base, [row("c")]);
        second = appendedList(first, [row("d")]);
        const branch = appendedList(first, [row("e", "q")]);
        expect(recordById(second, "d" as EntityId)).toBe(second.at(-1));
        expect(recordById(first, "d" as EntityId)).toBeUndefined();
        expect(recordById(branch, "d" as EntityId)).toBeUndefined();
        expect(
          recordsByStringField(first, "personId", "p").map((r) => r.id),
        ).toEqual(["a", "c"]);
        expect(
          recordsByStringField(second, "personId", "p").map((r) => r.id),
        ).toEqual(["a", "c", "d"]);
        expect(
          recordsByStringField(branch, "personId", "q").map((r) => r.id),
        ).toEqual(["b", "e"]);
        expect(first.filter((r) => r.personId === "p")).toEqual([
          base[0],
          first[2],
        ]);
        expect(first.slice(1)).toEqual([base[1], first[2]]);
        expect(first.reduce((sum) => sum + 1, 0)).toBe(3);
        expect(Object.keys(first)).toEqual(["0", "1", "2"]);
        expect(JSON.parse(JSON.stringify(first))).toEqual([...first]);
        expect(() =>
          (first as ReturnType<typeof row>[]).push(row("bad")),
        ).toThrow("immutable");
        return worldWith(second);
      },
    );
    expect(result.history.personalityTendencies).toEqual([
      ...base,
      row("c"),
      row("d"),
    ]);
    expect(first.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(base).toEqual([row("a"), row("b", "q")]);
    // The result is a materialized list. Its index also remains correct after
    // the next ordinary writer appends outside the transaction.
    const next = appendedList(result.history.personalityTendencies, [
      row("f") as never,
    ]);
    expect(recordById(next, "f" as EntityId)).toBe(next.at(-1));
    expect(recordById(first, "f" as EntityId)).toBeUndefined();
  });

  it("preserves held prefixes and unreturned siblings through commit and later appends", () => {
    const base = Object.freeze([row("a"), row("b", "q")]);
    let prefix: readonly ReturnType<typeof row>[] = base;
    let sibling: readonly ReturnType<typeof row>[] = base;
    let paused = base.values();
    const result = withHistoryAppendTransaction(
      worldWith(base),
      ["personalityTendencies"],
      () => {
        prefix = appendedList(base, [row("prefix")]);
        sibling = appendedList(prefix, [row("sibling", "q")]);
        paused = prefix.values();
        expect(paused.next().value).toBe(base[0]);
        expect(recordById(prefix, "prefix" as EntityId)).toBe(prefix[2]);
        expect(recordsByStringField(sibling, "personId", "q")).toEqual([
          base[1],
          sibling[3],
        ]);
        return worldWith(appendedList(prefix, [row("returned")]));
      },
    );
    const next = appendedList(result.history.personalityTendencies, [
      row("later") as never,
    ]);
    const siblingNext = appendedList(sibling, [row("sibling-later")]);
    expect([...paused].map((record) => record.id)).toEqual(["b", "prefix"]);
    expect(paused.next().done).toBe(true);
    expect(prefix.length).toBe(3);
    expect(prefix[2]).toEqual(row("prefix"));
    expect(prefix[3]).toBeUndefined();
    expect([...prefix].map((record) => record.id)).toEqual([
      "a",
      "b",
      "prefix",
    ]);
    expect(prefix.map((record) => record.id)).toEqual(["a", "b", "prefix"]);
    expect(prefix.slice(1)).toEqual([base[1], row("prefix")]);
    expect(prefix.concat([row("concat")])).toEqual([
      ...base,
      row("prefix"),
      row("concat"),
    ]);
    expect(Reflect.ownKeys(prefix)).toEqual(["0", "1", "2", "length"]);
    expect(JSON.parse(JSON.stringify(prefix))).toEqual([
      ...base,
      row("prefix"),
    ]);
    expect(sibling.map((record) => record.id)).toEqual([
      "a",
      "b",
      "prefix",
      "sibling",
    ]);
    expect(siblingNext.map((record) => record.id)).toEqual([
      "a",
      "b",
      "prefix",
      "sibling",
      "sibling-later",
    ]);
    expect(recordById(sibling, "returned" as EntityId)).toBeUndefined();
    expect(recordById(siblingNext, "later" as EntityId)).toBeUndefined();
    expect(recordById(prefix, "later" as EntityId)).toBeUndefined();
    expect(recordById(next, "later" as EntityId)).toBe(next.at(-1));
    expect(recordsByStringField(prefix, "personId", "p")).toEqual([
      base[0],
      row("prefix"),
    ]);
    expect(recordsByStringField(sibling, "personId", "q")).toEqual([
      base[1],
      row("sibling", "q"),
    ]);
    expect(() => {
      (prefix as ReturnType<typeof row>[])[0] = row("bad");
    }).toThrow("immutable");
    expect(() => {
      (prefix as ReturnType<typeof row>[]).length = 0;
    }).toThrow("immutable");
    expect(() => {
      delete (sibling as ReturnType<typeof row>[])[0];
    }).toThrow("immutable");
    expect(() =>
      Object.defineProperty(prefix, "0", { value: row("bad") }),
    ).toThrow("immutable");
    expect(() =>
      (sibling as ReturnType<typeof row>[]).push(row("bad")),
    ).toThrow("immutable");
    expect(base).toEqual([row("a"), row("b", "q")]);
  });

  it("keeps held nested prefixes separate while the outer writer resumes", () => {
    const base = Object.freeze([row("a")]);
    let outerPrefix: readonly ReturnType<typeof row>[] = base;
    let innerPrefix: readonly ReturnType<typeof row>[] = base;
    let innerSibling: readonly ReturnType<typeof row>[] = base;
    let paused = base.values();
    const result = withHistoryAppendTransaction(
      worldWith(base),
      ["personalityTendencies"],
      () => {
        outerPrefix = appendedList(base, [row("outer")]);
        const inner = withHistoryAppendTransaction(
          worldWith(outerPrefix),
          ["personalityTendencies"],
          () => {
            innerPrefix = appendedList(outerPrefix, [row("inner")]);
            innerSibling = appendedList(innerPrefix, [
              row("inner-sibling", "q"),
            ]);
            paused = innerPrefix.values();
            expect(paused.next().value).toBe(base[0]);
            return worldWith(
              appendedList(innerPrefix, [row("inner-returned")]),
            );
          },
        );
        expect(
          inner.history.personalityTendencies.map((record) => record.id),
        ).toEqual(["a", "outer", "inner", "inner-returned"]);
        expect(outerPrefix.map((record) => record.id)).toEqual(["a", "outer"]);
        expect(innerPrefix.map((record) => record.id)).toEqual([
          "a",
          "outer",
          "inner",
        ]);
        return worldWith(appendedList(outerPrefix, [row("outer-resumed")]));
      },
    );
    const next = appendedList(result.history.personalityTendencies, [
      row("after") as never,
    ]);
    expect(next.map((record) => record.id)).toEqual([
      "a",
      "outer",
      "outer-resumed",
      "after",
    ]);
    expect([...paused].map((record) => record.id)).toEqual(["outer", "inner"]);
    expect(outerPrefix).toHaveLength(2);
    expect(innerPrefix).toHaveLength(3);
    expect(innerPrefix.slice(1)).toEqual([row("outer"), row("inner")]);
    expect(JSON.parse(JSON.stringify(innerPrefix))).toEqual([
      row("a"),
      row("outer"),
      row("inner"),
    ]);
    expect(innerSibling.map((record) => record.id)).toEqual([
      "a",
      "outer",
      "inner",
      "inner-sibling",
    ]);
    expect(
      recordById(innerPrefix, "outer-resumed" as EntityId),
    ).toBeUndefined();
    expect(
      recordById(innerSibling, "inner-returned" as EntityId),
    ).toBeUndefined();
    expect(recordById(next, "inner" as EntityId)).toBeUndefined();
    expect(recordsByStringField(innerSibling, "personId", "q")).toEqual([
      row("inner-sibling", "q"),
    ]);
    expect(
      appendedList(innerSibling, [row("sibling-after")]).map(
        (record) => record.id,
      ),
    ).toEqual(["a", "outer", "inner", "inner-sibling", "sibling-after"]);
    expect(() =>
      (innerPrefix as ReturnType<typeof row>[]).splice(0, 1),
    ).toThrow("immutable");
  });

  it("leaves a no-op world alone and restores ordinary appends after a refusal", () => {
    const base = [row("a")];
    const world = worldWith(base);
    expect(
      withHistoryAppendTransaction(world, ["personalityTendencies"], (w) => w),
    ).toBe(world);
    expect(() =>
      withHistoryAppendTransaction(world, ["personalityTendencies"], () => {
        appendedList(base, [row("b")]);
        throw new Error("Refused intake");
      }),
    ).toThrow("Refused intake");
    const ordinary = appendedList(base, [row("c")]);
    ordinary.push(row("d"));
    expect(ordinary.map((r) => r.id)).toEqual(["a", "c", "d"]);
    expect(base.map((r) => r.id)).toEqual(["a"]);
  });

  it("preserves the outer transaction after a nested transaction returns", () => {
    const base = [row("a")];
    const world = worldWith(base);
    const result = withHistoryAppendTransaction(
      world,
      ["personalityTendencies"],
      () => {
        const first = appendedList(base, [row("b")]);
        const inner = withHistoryAppendTransaction(
          worldWith(first),
          ["personalityTendencies"],
          (w) =>
            worldWith(
              appendedList(w.history.personalityTendencies, [
                row("inner") as never,
              ]),
            ),
        );
        expect(inner.history.personalityTendencies.map((r) => r.id)).toEqual([
          "a",
          "b",
          "inner",
        ]);
        return worldWith(appendedList(first, [row("c")]));
      },
    );
    expect(result.history.personalityTendencies.map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("immutable history lookup indexes", () => {
  it("does not read a recent prefix that no longer has an index to adopt", () => {
    const first = { id: "first" };
    const prior = new Proxy([first], {
      get(target, key, receiver) {
        if (key === "0") throw new Error("An unavailable prefix was read");
        return Reflect.get(target, key, receiver);
      },
    });
    const rows = [first, { id: "added" }];
    const built = new Map(rows.map((row) => [row.id, row]));
    expect(
      indexFollowingAppends(
        new WeakMap(),
        [prior],
        rows,
        () => built,
        () => {
          throw new Error("An unavailable index was extended");
        },
      ),
    ).toBe(built);
  });

  it("keeps held field groups unchanged through prefixes, sibling appends and rereads", () => {
    const row = (id: string, owner: string | number) => ({ id, owner });
    const base = Object.freeze([row("base", "payer"), row("other", 2)]);
    const heldBase = recordsWithFieldValue(base, "owner", "payer");
    const heldOther = recordsWithFieldValue(base, "owner", 2);
    const prefix = appendedList(base, [row("prefix", "payer")]);
    const heldPrefix = recordsWithFieldValue(prefix, "owner", "payer");
    const left = appendedList(prefix, [
      row("left-one", "payer"),
      row("left-two", "payer"),
    ]);
    const right = appendedList(prefix, [row("right", "payer")]);
    const heldLeft = recordsWithFieldValue(left, "owner", "payer");
    expect(heldLeft).toEqual([base[0], prefix[2], left[3], left[4]]);
    expect(recordsWithFieldValue(right, "owner", "payer")).toEqual([
      base[0],
      prefix[2],
      right[3],
    ]);
    expect(heldBase).toEqual([base[0]]);
    expect(heldPrefix).toEqual([base[0], prefix[2]]);
    expect(heldOther).toEqual([base[1]]);
    expect(recordsWithFieldValue(base, "owner", "payer")).toEqual(heldBase);
    expect(recordsWithFieldValue(prefix, "owner", "payer")).toEqual(heldPrefix);
    const later = appendedList(left, [row("later", "payer")]);
    expect(recordsWithFieldValue(later, "owner", "payer")).toEqual([
      ...heldLeft,
      later[5],
    ]);
    expect(heldLeft).toEqual([base[0], prefix[2], left[3], left[4]]);
    expect(heldBase).toEqual([base[0]]);
    expect(recordsWithFieldValue(base, "owner", Number.NaN)).toEqual([]);
  });

  it("keeps first-match and source order while a new array gets fresh entries", () => {
    const first = { id: "first" as EntityId, personId: "a", value: 1 };
    const duplicate = { id: "first" as EntityId, personId: "b", value: 2 };
    const records = [first, duplicate] as const;
    expect(recordById(records, first.id)).toBe(first);
    expect(recordsByStringField(records, "personId", "a")).toEqual([first]);
    expect(recordsByStringField(records, "personId", "b")).toEqual([duplicate]);

    const changed = [
      first,
      duplicate,
      { id: "third" as EntityId, personId: "a", value: 3 },
    ];
    expect(recordById(changed, changed[2]!.id)).toBe(changed[2]);
    expect(recordsByStringField(changed, "personId", "a")).toEqual([
      first,
      changed[2],
    ]);
    expect(recordById(records, changed[2]!.id)).toBeUndefined();
  });

  it("answers a grown list, and each list grown from the same one, exactly", () => {
    const row = (id: string, flowId: string) => ({
      id: id as EntityId,
      stableKey: `key:${id}`,
      flowId,
    });
    const base = [row("a", "f1"), row("b", "f2")];
    expect(recordById(base, "a" as EntityId)).toBe(base[0]);
    expect(hasStableKey(base, "key:b")).toBe(true);
    expect(recordsWithFieldValue(base, "flowId", "f1")).toEqual([base[0]]);

    // Two writers copy the same list and append different records.
    const left = [...base, row("c", "f1")];
    const right = [...base, row("d", "f1")];
    expect(recordById(left, "c" as EntityId)).toBe(left[2]);
    expect(recordById(right, "c" as EntityId)).toBeUndefined();
    expect(recordById(right, "d" as EntityId)).toBe(right[2]);
    expect(hasStableKey(left, "key:d")).toBe(false);
    expect(hasStableKey(right, "key:d")).toBe(true);
    expect(recordsWithFieldValue(left, "flowId", "f1")).toEqual([
      left[0],
      left[2],
    ]);
    expect(recordsWithFieldValue(right, "flowId", "f1")).toEqual([
      right[0],
      right[2],
    ]);
    // The list both grew from still answers only for its own records.
    expect(recordById(base, "c" as EntityId)).toBeUndefined();
    expect(hasStableKey(base, "key:c")).toBe(false);
    expect(recordsWithFieldValue(base, "flowId", "f1")).toEqual([base[0]]);
  });

  it("does not reuse an index for a list that only ends like an indexed one", () => {
    const shared = { id: "z" as EntityId, stableKey: "key:z" };
    const first = [{ id: "a" as EntityId, stableKey: "key:a" }, shared];
    expect(hasStableKey(first, "key:a")).toBe(true);
    const other = [{ id: "b" as EntityId, stableKey: "key:b" }, shared];
    const grown = [...other, { id: "c" as EntityId, stableKey: "key:c" }];
    expect(hasStableKey(grown, "key:a")).toBe(false);
    expect(hasStableKey(grown, "key:b")).toBe(true);
    expect(recordById(grown, "a" as EntityId)).toBeUndefined();
  });

  it("follows lists built by appending, and rereads a list rewritten in place", () => {
    const row = (id: string, detail = "brief") => ({
      id: id as EntityId,
      stableKey: `key:${id}`,
      detail,
    });
    const base = Array.from({ length: 3_000 }, (_, at) => row(`r${at}`));
    expect(recordById(base, "r1500" as EntityId)).toBe(base[1500]);

    // Two appends with no lookup between them still extend the index.
    const once = appendedList(base, [row("x")]);
    const twice = appendedList(once, [row("y"), row("z")]);
    expect(twice).toHaveLength(3_003);
    expect(recordById(twice, "y" as EntityId)).toBe(twice[3_001]);
    expect(hasStableKey(twice, "key:z")).toBe(true);
    expect(recordByStableKey(twice, "key:r7")).toBe(base[7]);
    expect(recordById(once, "y" as EntityId)).toBeUndefined();

    // A second writer grows the same list differently: its list never
    // borrows the other writer's records.
    const fork = appendedList(once, [row("v")]);
    expect(recordById(fork, "v" as EntityId)).toBe(fork.at(-1));
    expect(recordById(fork, "y" as EntityId)).toBeUndefined();
    expect(hasStableKey(appendedList(fork, [row("u")]), "key:z")).toBe(false);
    expect(hasStableKey(twice, "key:v")).toBe(false);

    // A writer that replaces one record far from the end, then appends, keeps
    // the length and the last records of the old list: the new list is read
    // again, so the replacement is what a lookup finds.
    const rewritten = twice.map((record) =>
      record.id === "r1234" ? row("r1234", "detailed") : record,
    );
    const after = [...rewritten, row("w")];
    expect(recordById(after, "r1234" as EntityId)?.detail).toBe("detailed");
    expect(recordById(after, "w" as EntityId)).toBe(after.at(-1));
  });

  it("extends the event index as events are appended, last id winning", () => {
    const event = (id: string, summary: string) =>
      ({ id: id as EntityId, summary }) as unknown as HistoricalEvent;
    const one = [event("e1", "one")];
    expect(eventIndexOf(one).get("e1" as EntityId)?.summary).toBe("one");
    const two = [...one, event("e2", "two"), event("e1", "again")];
    expect(eventIndexOf(two).get("e2" as EntityId)?.summary).toBe("two");
    expect(eventIndexOf(two).get("e1" as EntityId)?.summary).toBe("again");
    expect(eventIndexOf(one).get("e2" as EntityId)).toBeUndefined();
    expect(eventIndexOf(one).get("e1" as EntityId)?.summary).toBe("one");
  });
});

describe("growing history index snapshot isolation", () => {
  const kind: GrowingIndexKind<Map<string, unknown>> = {
    create: () => new Map(),
    add: (index, record) => index.set((record as { id: string }).id, record),
  };

  it("answers a large append and rereads the old snapshot", () => {
    const base = Object.freeze([{ id: "old" }]);
    expect(growingIndex(kind, base).get("old")).toBe(base[0]);
    const added = Array.from({ length: 1025 }, (_, at) => ({
      id: `added:${at}`,
    }));
    const grown = appendedList(base, added);
    expect(growingIndex(kind, grown)).toEqual(
      new Map(grown.map((record) => [record.id, record])),
    );
    expect(growingIndex(kind, base)).toEqual(new Map([["old", base[0]]]));
    expect(grown.slice(0, base.length)).toEqual(base);
  });

  it("rereads old immutable snapshots and sibling branches after index adoption", () => {
    const base = Object.freeze([{ id: "base" }]);
    expect(growingIndex(kind, base).size).toBe(1);
    const left = appendedList(base, [{ id: "left" }]);
    const right = appendedList(base, [{ id: "right" }]);
    expect(growingIndex(kind, left)).toEqual(
      new Map(left.map((record) => [record.id, record])),
    );
    expect(growingIndex(kind, base)).toEqual(new Map([["base", base[0]]]));
    expect(growingIndex(kind, right)).toEqual(
      new Map(right.map((record) => [record.id, record])),
    );
    expect(growingIndex(kind, left).has("right")).toBe(false);
    expect(growingIndex(kind, right).has("left")).toBe(false);
    expect(growingIndex(kind, base).size).toBe(1);
  });

  it("refuses a shared ending record when the earlier prefix was rewritten", () => {
    const shared = { id: "shared" };
    const original = Object.freeze([{ id: "original" }, shared]);
    expect(growingIndex(kind, original).has("original")).toBe(true);
    const replacement = Object.freeze([{ id: "replacement" }, shared]);
    const grown = appendedList(replacement, [{ id: "new" }]);
    expect(growingIndex(kind, grown)).toEqual(
      new Map(grown.map((record) => [record.id, record])),
    );
    expect(growingIndex(kind, grown).has("original")).toBe(false);
    expect(growingIndex(kind, original)).toEqual(
      new Map(original.map((record) => [record.id, record])),
    );
  });
});

describe("replaced history lookup ownership", () => {
  const row = (id: string, personId = "p") => ({
    id: id as EntityId,
    stableKey: `released-history:${id}`,
    personId,
  });
  const grouping = "released-history:test-person";
  const keysOf = (record: ReturnType<typeof row>) => [record.personId];

  it("drops ordinary lookup bindings without reading or changing held records", () => {
    let indexedReads = 0;
    const first = row("first");
    const duplicate = { ...first, personId: "q" };
    const records = new Proxy(Object.freeze([first, duplicate, row("last")]), {
      get(target, key, receiver) {
        if (typeof key === "string" && /^(0|[1-9]\d*)$/.test(key))
          indexedReads += 1;
        return Reflect.get(target, key, receiver);
      },
    });
    expect(recordById(records, first.id)).toBe(first);
    expect(recordByStableKey(records, first.stableKey)).toBe(first);
    expect(hasStableKey(records, first.stableKey)).toBe(true);
    const heldString = recordsByStringField(records, "personId", "p");
    const heldField = recordsWithFieldValue(records, "personId", "p");
    const heldKey = recordsByKey(records, grouping, keysOf, "p");
    const beforeJson = JSON.stringify(records);
    const beforeRelease = indexedReads;
    releaseHistoryReadIndexes(records);
    releaseHistoryReadIndexes(records);
    expect(indexedReads).toBe(beforeRelease);
    for (const read of [
      () => recordById(records, first.id),
      () => recordByStableKey(records, first.stableKey),
      () => hasStableKey(records, first.stableKey),
    ]) {
      const beforeRead = indexedReads;
      read();
      expect(indexedReads).toBeGreaterThan(beforeRead);
    }
    expect(recordById(records, first.id)).toBe(first);
    expect(recordByStableKey(records, first.stableKey)).toBe(first);
    for (const [held, fresh] of [
      [heldString, recordsByStringField(records, "personId", "p")],
      [heldField, recordsWithFieldValue(records, "personId", "p")],
      [heldKey, recordsByKey(records, grouping, keysOf, "p")],
    ]) {
      expect(fresh).not.toBe(held);
      expect(fresh).toEqual(held);
      expect(held).toEqual([first, records[2]]);
    }
    expect(JSON.stringify(records)).toBe(beforeJson);
  });

  it("rebuilds held originals, rewritten rows, append siblings and JSON reloads independently", () => {
    const original = Object.freeze([row("first"), row("last", "q")]);
    const held = recordsByStringField(original, "personId", "p");
    expect(recordById(original, original[0]!.id)).toBe(original[0]);
    const replacement = Object.freeze([
      { ...original[0]!, annotation: "recorded metadata" },
      original[1]!,
    ]);
    releaseHistoryReadIndexes(original);
    const left = appendedList(original, [row("left")]);
    const right = appendedList(replacement, [row("right")]);
    expect(recordById(left, original[0]!.id)).toBe(original[0]);
    expect(recordById(right, original[0]!.id)).toBe(replacement[0]);
    expect(recordById(left, "right" as EntityId)).toBeUndefined();
    expect(recordById(right, "left" as EntityId)).toBeUndefined();
    expect(recordById(original, original[0]!.id)).toBe(original[0]);
    expect(recordsByStringField(original, "personId", "p")).toEqual(held);
    expect(held).toEqual([original[0]]);
    expect(recordsByStringField(right, "personId", "p")).toEqual([
      replacement[0],
      right[2],
    ]);
    expect(JSON.parse(JSON.stringify(original))).toEqual([...original]);
    const loaded: typeof right = JSON.parse(JSON.stringify(right));
    expect(recordById(loaded, original[0]!.id)).toEqual(replacement[0]);
    expect(recordsByStringField(loaded, "personId", "p")).toEqual([
      replacement[0],
      right[2],
    ]);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(right));
  });
});
