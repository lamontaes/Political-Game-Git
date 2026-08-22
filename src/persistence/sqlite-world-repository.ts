import { DatabaseSync } from "node:sqlite";

import {
  createWorldSnapshot,
  deserializeWorld,
  serializeWorld,
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
        payload TEXT NOT NULL
      ) STRICT;
    `);
  }

  save(world: World): StoredWorldSummary {
    const snapshot = createWorldSnapshot(world);
    const payload = serializeWorld(world);
    this.#database
      .prepare(
        `INSERT INTO world_snapshots
          (world_id, snapshot_id, current_date, action_sequence, payload)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(world_id) DO UPDATE SET
          snapshot_id = excluded.snapshot_id,
          current_date = excluded.current_date,
          action_sequence = excluded.action_sequence,
          payload = excluded.payload`,
      )
      .run(
        world.id,
        snapshot.snapshotId,
        world.currentDate,
        world.actionSequence,
        payload,
      );
    return {
      worldId: world.id,
      snapshotId: snapshot.snapshotId,
      currentDate: world.currentDate,
      actionSequence: world.actionSequence,
    };
  }

  load(worldId: EntityId): World | null {
    const row = this.#database
      .prepare("SELECT payload FROM world_snapshots WHERE world_id = ?")
      .get(worldId) as { readonly payload: string } | undefined;
    return row ? deserializeWorld(row.payload) : null;
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
