/**
 * No scene without a purpose (director-no-scene-without-a-purpose; owner,
 * Oct 15: "A scene has an endpoint"; scene standard rule 1): every situation
 * type the director may stage names, as data, a record one of its endings
 * writes and the engine that reads it, and each named reader exists in the
 * code; a kind with none is not staged and its cause is the journal's line.
 * Reads the data only, so it needs no place or seed.
 */
import { existsSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";
import arcs from "./data/purpose-arcs.json" with { type: "json" };
import {
  playsAsScene,
  scheduleMoment,
  SITUATION_LIBRARY,
  writeBacksOf,
  type SituationLibrary,
} from "./scheduling";

const resolves = (readBy: string) => {
  const [path, identifier] = readBy.split("#");
  if (!path || !identifier || !existsSync(path)) return false;
  return readFileSync(path, "utf8").includes(identifier);
};

it("every kind that can be staged names a write-back whose reader exists", () => {
  const staged = SITUATION_LIBRARY.types.filter(playsAsScene);
  expect(staged.length).toBeGreaterThan(0);
  for (const type of staged) {
    if (type.playsWithout) {
      expect(type.playsWithout.ruling, type.key).toMatch(/OWNER-DECISIONS/);
      continue;
    }
    const writes = writeBacksOf(type);
    expect(writes.length, type.key).toBeGreaterThan(0);
    for (const write of writes) {
      expect(write.record, type.key).toBeTruthy();
      expect(resolves(write.readBy), `${type.key}: ${write.readBy}`).toBe(true);
    }
  }
  for (const [keeps, write] of Object.entries(arcs.keepsWrite))
    if (typeof write !== "string")
      expect(resolves(write.readBy), `${keeps}: ${write.readBy}`).toBe(true);
});

it("a kind with no write-back is not staged: its moment is the journal's line, with why", () => {
  const silent = SITUATION_LIBRARY.types.find((type) => !playsAsScene(type));
  expect(silent, "some kind writes nothing back").toBeTruthy();
  // The one kind alone in the library, its cause matched by any moment.
  const library: SituationLibrary = {
    ...SITUATION_LIBRARY,
    types: [
      {
        ...silent!,
        causes: [{ match: { label: "test:silent" } } as never],
      },
    ],
  };
  const core = {
    people: new Map([["p", { id: "p", birthDate: "1980-01-01" }]]),
  } as never;
  const book = { schedule: [], moments: [], momentsById: new Map() } as never;
  const entry = scheduleMoment(
    core,
    book,
    {
      id: "m",
      personId: "p",
      date: "2026-01-01",
      label: "test:silent",
      impact: 1,
      causeId: "c",
      counterpartIds: [],
    } as never,
    { mode: "live", interruptImpact: 0 },
    library,
  );
  expect(entry.outcome).toBe("journal-line");
  expect(entry.bindings.length).toBe(0);
  expect(entry.coverage?.reason).toBe("no-write-back");
  expect(entry.coverage?.typeKey).toBe(silent!.key);
});
