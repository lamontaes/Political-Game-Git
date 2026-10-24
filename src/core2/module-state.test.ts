import { describe, expect, it } from "vitest";
import { createCore, coreAPI, registerModule } from "./state";
import { piecesInput } from "./core-pieces-fixture";
import type { CoreModule } from "./types";
const engine: CoreModule = {
  id: "law",
  state: {
    schemaVersion: 2,
    tables: {
      enactments: {
        indexes: {
          byPlaceDate: { fields: ["placeId", "date"] },
          byCitation: { fields: ["citation"], unique: true },
        },
        validate(row) {
          if (typeof row.amount !== "number" || row.amount < 0)
            throw new Error("Invalid enactment amount.");
        },
      },
      seats: { indexes: { byPerson: { fields: ["personId"] } } },
    },
  },
};
function world() {
  return createCore(piecesInput(), { modules: [engine] });
}
const row = {
  id: "a",
  placeId: "place",
  date: "2026-01-02",
  citation: "statute:a",
  amount: 10,
  terms: { kind: "test" },
};
describe("registered module state", () => {
  it("owns isolated schemas and detaches rows and named composite index results", () => {
    const core = world(),
      api = coreAPI(core),
      table = api.moduleState("law").table("enactments");
    const input = structuredClone(row);
    table.put(input);
    input.terms.kind = "changed";
    expect(table.get("a")).toEqual(row);
    expect(Object.isFrozen(table.get("a")!.terms)).toBe(true);
    expect(table.query("byPlaceDate", ["place", "2026-01-02"])).toEqual([row]);
    expect(
      Object.isFrozen(table.query("byPlaceDate", ["place", "2026-01-02"])),
    ).toBe(true);
    expect(api.moduleState("law").schemaVersion).toBe(2);
    expect(coreAPI(world()).moduleState("law").table("enactments").size).toBe(
      0,
    );
    registerModule(core, { ...engine, id: "court" });
    expect(api.moduleState("court").table("enactments").size).toBe(0);
  });
  it("replaces every index and removes empty buckets", () => {
    const table = coreAPI(world()).moduleState("law").table("enactments");
    table.put(row);
    table.put({ ...row, placeId: "other", citation: "new" });
    expect(table.query("byPlaceDate", ["place", row.date])).toEqual([]);
    expect(table.query("byCitation", ["statute:a"])).toEqual([]);
    expect(table.query("byPlaceDate", ["other", row.date])).toHaveLength(1);
    expect(table.remove("a")).toBe(true);
    expect(table.remove("a")).toBe(false);
    expect(table.query("byCitation", ["new"])).toEqual([]);
  });
  it("rejects a bad or unique-conflicting replacement atomically", () => {
    const store = coreAPI(world()).moduleState("law"),
      table = store.table("enactments");
    table.put(row);
    table.put({ ...row, id: "b", citation: "b" });
    const before = store.snapshot();
    expect(() => table.put({ ...row, amount: -1 })).toThrow();
    expect(() => table.put({ ...row, citation: "b" })).toThrow(/unique/);
    expect(() => table.put({ ...row, placeId: {} })).toThrow(/scalar/);
    expect(store.snapshot()).toEqual(before);
  });
  it("round-trips every table while preserving existing handles and checking the schema", () => {
    const store = coreAPI(world()).moduleState("law"),
      table = store.table("enactments");
    table.put(row);
    store.table("seats").put({ id: "seat", personId: "actor" });
    const snapshot = JSON.parse(JSON.stringify(store.snapshot()));
    table.remove("a");
    store.restore(snapshot);
    expect(table.get("a")).toEqual(row);
    const core = createCore(
      { ...piecesInput(), moduleState: [snapshot] },
      { modules: [engine] },
    );
    expect(coreAPI(core).moduleState("law").snapshot()).toEqual(snapshot);
    expect(() => store.restore({ ...snapshot, schemaVersion: 1 })).toThrow(
      /schema/,
    );
    expect(() =>
      store.restore({
        ...snapshot,
        tables: { ...snapshot.tables, seats: [{ id: "bad" }] },
      }),
    ).toThrow();
    expect(store.snapshot()).toEqual(snapshot);
    expect(() =>
      createCore(
        { ...piecesInput(), moduleState: [snapshot, snapshot] },
        { modules: [engine] },
      ),
    ).toThrow(/Duplicate/);
  });
  it("rejects malformed definitions before installing a module", () => {
    const core = createCore(piecesInput());
    for (const schemaVersion of [0, -1, 1.5, NaN])
      expect(() =>
        registerModule(core, {
          ...engine,
          state: { ...engine.state!, schemaVersion },
        }),
      ).toThrow();
    expect(core.modules.has(engine.id)).toBe(false);
    expect(() =>
      registerModule(core, {
        id: "bad",
        state: {
          schemaVersion: 1,
          tables: { t: { indexes: { bad: { fields: [] } } } },
        },
      }),
    ).toThrow();
    expect(() => coreAPI(core).moduleState("bad")).toThrow();
    expect(() =>
      coreAPI(world()).moduleState("law").table("unknown"),
    ).toThrow();
  });
  it("rejects accessors, mutable containers, cycles, and reentrant validation", () => {
    const core = world(),
      api = coreAPI(core),
      table = api.moduleState("law").table("enactments");
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const terms of [
      new Map(),
      cycle,
      {
        get value() {
          throw new Error("Getter must not run.");
        },
      },
    ])
      expect(() => table.put({ ...row, terms })).toThrow();
    registerModule(core, {
      id: "reentrant",
      state: {
        schemaVersion: 1,
        tables: {
          t: {
            validate() {
              api.moduleState("reentrant").table("t").put({ id: "nested" });
            },
          },
        },
      },
    });
    expect(() =>
      api.moduleState("reentrant").table("t").put({ id: "outer" }),
    ).toThrow(/reentrant/);
    expect(api.moduleState("reentrant").table("t").size).toBe(0);
  });
  it("freezes index definitions and distinguishes scalar types and delimiter-containing keys", () => {
    const fields = ["key"],
      core = createCore(piecesInput(), {
        modules: [
          {
            id: "index",
            state: {
              schemaVersion: 1,
              tables: { t: { indexes: { k: { fields } } } },
            },
          },
        ],
      });
    fields[0] = "id";
    const table = coreAPI(core).moduleState("index").table("t");
    table.put({ id: "a", key: 1 });
    table.put({ id: "b", key: "1" });
    table.put({ id: "c", key: "a:b" });
    expect(table.query("k", [1]).map((r) => r.id)).toEqual(["a"]);
    expect(table.query("k", ["1"]).map((r) => r.id)).toEqual(["b"]);
    expect(() => table.query("k", [])).toThrow(/arity/);
    expect(() => table.query("missing", [1])).toThrow();
  });
  it("hands out one frozen row list until a row is written or removed", () => {
    const core = world(),
      table = coreAPI(core).moduleState("law").table("enactments");
    table.put(row);
    const first = table.rows();
    expect(Object.isFrozen(first)).toBe(true);
    expect(table.rows()).toBe(first);
    table.put({ ...row, id: "b", citation: "statute:b" });
    const second = table.rows();
    expect(second).not.toBe(first);
    expect(second.map((r) => r.id)).toEqual(["a", "b"]);
    expect(first.map((r) => r.id)).toEqual(["a"]);
    table.remove("a");
    expect(table.rows().map((r) => r.id)).toEqual(["b"]);
  });
});
