import { migrateUnpinnedAppearanceCatalog } from "../simulation/person-appearance";
import { DatabaseSync } from "node:sqlite";

import {
  createWorldSnapshot,
  deserializeWorld,
  serializeWorldSnapshotPayload,
} from "../simulation/serialization";
import type { EntityId, IsoDate, World } from "../simulation/types";

export interface StoredWorldSummary {
  readonly worldId: EntityId;
  readonly snapshotId: EntityId;
  readonly currentDate: IsoDate;
  readonly actionSequence: number;
}

export class SqliteWorldRepository {
  readonly #database: DatabaseSync;

  constructor(databasePath: string) {
    if (databasePath.trim().length === 0) {
      throw new Error("SQLite database path must not be empty.");
    }
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS world_snapshots (
        world_id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        current_date TEXT NOT NULL,
        action_sequence INTEGER NOT NULL,
        payload TEXT NOT NULL,
        payload_chunk_count INTEGER NOT NULL DEFAULT 0
          CHECK (payload_chunk_count >= 0)
      ) STRICT;
    `);
    const columns = this.#database
      .prepare("PRAGMA table_info(world_snapshots)")
      .all() as unknown as readonly { readonly name: string }[];
    if (!columns.some((column) => column.name === "payload_chunk_count")) {
      this.#database.exec(`
        ALTER TABLE world_snapshots ADD COLUMN payload_chunk_count
          INTEGER NOT NULL DEFAULT 0 CHECK (payload_chunk_count >= 0);
      `);
    }
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS world_snapshot_chunks (
        world_id TEXT NOT NULL REFERENCES world_snapshots(world_id)
          ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
        payload TEXT NOT NULL,
        PRIMARY KEY (world_id, chunk_index)
      ) STRICT;
    `);
  }

  save(world: World): StoredWorldSummary {
    const snapshot = createWorldSnapshot(world);
    const payload = serializeWorldSnapshotPayload(snapshot);
    const chunks = typeof payload === "string" ? [] : payload;
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database
        .prepare(
          `INSERT INTO world_snapshots
            (world_id, snapshot_id, current_date, action_sequence, payload,
             payload_chunk_count)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(world_id) DO UPDATE SET
            snapshot_id = excluded.snapshot_id,
            current_date = excluded.current_date,
            action_sequence = excluded.action_sequence,
            payload = excluded.payload,
            payload_chunk_count = excluded.payload_chunk_count`,
        )
        .run(
          world.id,
          snapshot.snapshotId,
          world.currentDate,
          world.actionSequence,
          typeof payload === "string" ? payload : "",
          chunks.length,
        );
      this.#database
        .prepare("DELETE FROM world_snapshot_chunks WHERE world_id = ?")
        .run(world.id);
      if (chunks.length > 0) {
        const insert = this.#database.prepare(
          `INSERT INTO world_snapshot_chunks (world_id, chunk_index, payload)
           VALUES (?, ?, ?)`,
        );
        chunks.forEach((chunk, index) => insert.run(world.id, index, chunk));
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
    return {
      worldId: world.id,
      snapshotId: snapshot.snapshotId,
      currentDate: world.currentDate,
      actionSequence: world.actionSequence,
    };
  }

  load(worldId: EntityId): World | null {
    const row = this.#database
      .prepare(
        "SELECT payload, payload_chunk_count FROM world_snapshots WHERE world_id = ?",
      )
      .get(worldId) as
      | { readonly payload: string; readonly payload_chunk_count: number }
      | undefined;
    if (!row) return null;
    if (
      !Number.isSafeInteger(row.payload_chunk_count) ||
      row.payload_chunk_count < 0
    ) {
      throw new Error("Invalid SQLite world payload chunk count.");
    }
    if (row.payload_chunk_count === 0) {
      return migrateUnpinnedAppearanceCatalog(deserializeWorld(row.payload));
    }
    const chunks = this.#database
      .prepare(
        `SELECT chunk_index, payload FROM world_snapshot_chunks
         WHERE world_id = ? ORDER BY chunk_index`,
      )
      .all(worldId) as unknown as readonly {
      readonly chunk_index: number;
      readonly payload: string;
    }[];
    if (
      row.payload !== "" ||
      chunks.length !== row.payload_chunk_count ||
      chunks.some((chunk, index) => chunk.chunk_index !== index)
    ) {
      throw new Error("Incomplete SQLite world payload chunks.");
    }
    return migrateUnpinnedAppearanceCatalog(
      deserializeWorld(chunks.map((chunk) => chunk.payload)),
    );
  }

  list(): readonly StoredWorldSummary[] {
    const rows = this.#database
      .prepare(
        `SELECT world_id AS "worldId", snapshot_id AS "snapshotId",
                "current_date" AS "currentDate", action_sequence AS "actionSequence"
         FROM world_snapshots
         ORDER BY current_date DESC, world_id ASC`,
      )
      .all() as unknown as readonly {
      readonly worldId: EntityId;
      readonly snapshotId: EntityId;
      readonly currentDate: IsoDate;
      readonly actionSequence: number;
    }[];
    return rows.map((row) => ({
      worldId: row.worldId,
      snapshotId: row.snapshotId,
      currentDate: row.currentDate,
      actionSequence: row.actionSequence,
    }));
  }

  close(): void {
    this.#database.close();
  }
}
