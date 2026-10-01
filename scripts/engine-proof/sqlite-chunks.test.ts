import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteWorldRepository } from "../../src/persistence/sqlite-world-repository";
import * as serialization from "../../src/simulation/serialization";
import { createWorldId } from "../../src/simulation/world";
import { createLightweightPerson } from "../../src/simulation/people";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { makeIsoDate } from "../../src/simulation/dates";
import { openCanonicalFixture } from "./parity";
import { nationalPlacePlan, watchedIdentity } from "./places";

const selected = nationalPlacePlan("audit-sqlite-chunks-20261001", 1)
  .watched[0]!;
const place = lifePlaceByKey(selected.placeKey)!;
const currentDate = makeIsoDate("2026-01-05");
const person = createLightweightPerson({
  worldId: createWorldId(selected.seed),
  worldSeed: selected.seed,
  index: 0,
  currentDate,
  homeJurisdictionId: place.context.jurisdiction.id,
});
const world = openCanonicalFixture({
  seed: selected.seed,
  currentDate,
  jurisdictions: [place.context.jurisdiction],
  people: [person],
});

/** Exercise the real canonical RangeError fallback with small test chunks.
 * The fixture is small; this does not simulate years of history or allocate a
 * string beyond V8's limit. Repository writes and decoding remain actual. */
function forceCanonicalChunks() {
  const stringify = JSON.stringify;
  vi.spyOn(JSON, "stringify").mockImplementation((...args) => {
    const value: unknown = args[0];
    if (
      value !== null &&
      typeof value === "object" &&
      "format" in value &&
      value.format === "political-life-world"
    ) {
      throw new RangeError("Injected V8 string-size boundary for this fixture");
    }
    return Reflect.apply(stringify, JSON, args);
  });
  const serialize = serialization.serializeWorldSnapshotPayload;
  vi.spyOn(serialization, "serializeWorldSnapshotPayload").mockImplementation(
    (snapshot) => serialize(snapshot, 256),
  );
}

const openDatabases: DatabaseSync[] = [];
const repositories: SqliteWorldRepository[] = [];
function repositoryAt(path: string) {
  const repository = new SqliteWorldRepository(path);
  repositories.push(repository);
  return repository;
}
function databaseAt(path: string) {
  const database = new DatabaseSync(path);
  openDatabases.push(database);
  return database;
}
function fixturePath() {
  return join(
    mkdtempSync(join(tmpdir(), "audit-sqlite-chunks-")),
    "world.sqlite",
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const repository of repositories.splice(0)) repository.close();
  for (const database of openDatabases.splice(0)) database.close();
});

describe("SQLite uses the existing chunked world payload", () => {
  it("keeps small saves byte-identical and preserves unknown-world null", () => {
    const path = fixturePath();
    const repository = repositoryAt(path);
    const expected = serialization.serializeWorld(world);
    repository.save(world);
    const stored = databaseAt(path)
      .prepare("SELECT payload, payload_chunk_count FROM world_snapshots")
      .get();
    expect(stored).toEqual({ payload: expected, payload_chunk_count: 0 });
    expect(repository.load(world.id)).toEqual(world);
    expect(repository.load(createWorldId("absent-sqlite-world"))).toBeNull();
    expect(repository.list()).toHaveLength(1);
    process.stdout.write(
      JSON.stringify({
        identity: watchedIdentity(world, person.id, selected.placeKey),
        storedCharacters: expected.length,
        transport: "canonical small string",
      }) + "\n",
    );
  });

  it("writes and reloads actual canonical fallback chunks without joining", () => {
    const path = fixturePath();
    const repository = repositoryAt(path);
    forceCanonicalChunks();
    repository.save(world);
    vi.restoreAllMocks();
    const database = databaseAt(path);
    const row = database
      .prepare("SELECT payload, payload_chunk_count FROM world_snapshots")
      .get()!;
    const chunks = database
      .prepare(
        "SELECT chunk_index, payload FROM world_snapshot_chunks ORDER BY chunk_index",
      )
      .all();
    expect(row.payload).toBe("");
    expect(row.payload_chunk_count).toBeGreaterThan(1);
    expect(chunks).toHaveLength(Number(row.payload_chunk_count));
    expect(chunks.map((chunk) => chunk.chunk_index)).toEqual(
      chunks.map((_, index) => index),
    );
    expect(repository.load(world.id)).toEqual(world);
    expect(repository.list()[0]!.snapshotId).toBe(
      serialization.createWorldSnapshot(world).snapshotId,
    );
  });

  it("replaces chunks with a whole save and whole saves with chunks atomically", () => {
    const path = fixturePath();
    const repository = repositoryAt(path);
    const database = databaseAt(path);
    repository.save(world);
    forceCanonicalChunks();
    repository.save(world);
    vi.restoreAllMocks();
    expect(repository.load(world.id)).toEqual(world);
    repository.save(world);
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM world_snapshot_chunks").get()!
        .n,
    ).toBe(0);
    expect(
      database.prepare("SELECT payload_chunk_count FROM world_snapshots").get()!
        .payload_chunk_count,
    ).toBe(0);
    expect(repository.load(world.id)).toEqual(world);
  });

  it("serializes first-open migration and permits retry after a concurrent lock", () => {
    const path = fixturePath();
    const database = databaseAt(path);
    database.exec(`PRAGMA journal_mode = WAL;
      CREATE TABLE world_snapshots (
        world_id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL,
        current_date TEXT NOT NULL, action_sequence INTEGER NOT NULL,
        payload TEXT NOT NULL) STRICT`);
    const snapshot = serialization.createWorldSnapshot(world);
    const payload = serialization.serializeWorldSnapshot(snapshot);
    database
      .prepare("INSERT INTO world_snapshots VALUES (?, ?, ?, ?, ?)")
      .run(
        world.id,
        snapshot.snapshotId,
        world.currentDate,
        world.actionSequence,
        payload,
      );
    const exec = DatabaseSync.prototype.exec;
    let attempted = false;
    let competingError: unknown;
    const spy = vi
      .spyOn(DatabaseSync.prototype, "exec")
      .mockImplementation(function (this: DatabaseSync, sql: string) {
        const result = exec.call(this, sql);
        if (sql === "BEGIN IMMEDIATE" && !attempted) {
          attempted = true;
          try {
            const competing = new SqliteWorldRepository(path);
            competing.close();
          } catch (error) {
            competingError = error;
          }
        }
        return result;
      });
    let first: SqliteWorldRepository;
    try {
      first = repositoryAt(path);
    } finally {
      spy.mockRestore();
    }
    expect(attempted).toBe(true);
    expect(competingError).toBeInstanceOf(Error);
    expect((competingError as Error).message).toMatch(/database is locked/);
    const second = repositoryAt(path);
    expect(first.load(world.id)).toEqual(world);
    expect(second.load(world.id)).toEqual(world);
    expect(
      database
        .prepare("PRAGMA table_info(world_snapshots)")
        .all()
        .filter((column) => column.name === "payload_chunk_count"),
    ).toHaveLength(1);
    expect(
      database.prepare("SELECT payload FROM world_snapshots").get()!.payload,
    ).toBe(payload);
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM world_snapshot_chunks").get()!
        .n,
    ).toBe(0);
  });

  it("adds the discriminator to an existing legacy database without rewriting its save", () => {
    const path = fixturePath();
    const database = databaseAt(path);
    database.exec(`CREATE TABLE world_snapshots (
      world_id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL,
      current_date TEXT NOT NULL, action_sequence INTEGER NOT NULL,
      payload TEXT NOT NULL) STRICT`);
    const snapshot = serialization.createWorldSnapshot(world);
    const payload = serialization.serializeWorldSnapshot(snapshot);
    database
      .prepare("INSERT INTO world_snapshots VALUES (?, ?, ?, ?, ?)")
      .run(
        world.id,
        snapshot.snapshotId,
        world.currentDate,
        world.actionSequence,
        payload,
      );
    const repository = repositoryAt(path);
    expect(repository.load(world.id)).toEqual(world);
    expect(
      database
        .prepare("SELECT payload, payload_chunk_count FROM world_snapshots")
        .get(),
    ).toEqual({ payload, payload_chunk_count: 0 });
    expect(repositoryAt(path).load(world.id)).toEqual(world);
  });

  it("rolls back metadata and chunks when a real SQLite write aborts", () => {
    const path = fixturePath();
    const repository = repositoryAt(path);
    repository.save(world);
    const database = databaseAt(path);
    const original = database.prepare("SELECT * FROM world_snapshots").get();
    database.exec(`CREATE TRIGGER reject_second_chunk
      BEFORE INSERT ON world_snapshot_chunks WHEN NEW.chunk_index = 1
      BEGIN SELECT RAISE(ABORT, 'injected chunk write failure'); END`);
    forceCanonicalChunks();
    expect(() => repository.save(world)).toThrow(
      "injected chunk write failure",
    );
    vi.restoreAllMocks();
    expect(database.prepare("SELECT * FROM world_snapshots").get()).toEqual(
      original,
    );
    expect(
      database.prepare("SELECT COUNT(*) AS n FROM world_snapshot_chunks").get()!
        .n,
    ).toBe(0);
    expect(repository.load(world.id)).toEqual(world);
  });

  it("keeps one read snapshot when another WAL connection replaces its chunks", () => {
    const path = fixturePath();
    const reader = repositoryAt(path);
    const writer = repositoryAt(path);
    const replacement = openCanonicalFixture({
      seed: selected.seed,
      currentDate: makeIsoDate("2026-01-06"),
      jurisdictions: [place.context.jurisdiction],
      people: [person],
    });
    expect(replacement.id).toBe(world.id);
    forceCanonicalChunks();
    reader.save(world);
    const prepare = DatabaseSync.prototype.prepare;
    let interleaved = false;
    vi.spyOn(DatabaseSync.prototype, "prepare").mockImplementation(function (
      this: DatabaseSync,
      sql: string,
    ) {
      if (!interleaved && sql.includes("SELECT chunk_index, payload")) {
        interleaved = true;
        writer.save(replacement);
      }
      return prepare.call(this, sql);
    });
    const loaded = reader.load(world.id);
    expect(interleaved).toBe(true);
    expect(loaded).toEqual(world);
    vi.restoreAllMocks();
    expect(reader.load(world.id)).toEqual(replacement);
  });

  it("refuses missing or noncontiguous chunks instead of decoding a partial save", () => {
    const path = fixturePath();
    const repository = repositoryAt(path);
    forceCanonicalChunks();
    repository.save(world);
    vi.restoreAllMocks();
    databaseAt(path)
      .prepare(
        "UPDATE world_snapshot_chunks SET chunk_index = chunk_index + 100000 WHERE chunk_index = 1",
      )
      .run();
    expect(() => repository.load(world.id)).toThrow(
      "Incomplete SQLite world payload chunks",
    );
  });
});
