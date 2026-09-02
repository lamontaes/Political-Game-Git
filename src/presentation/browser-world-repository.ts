import { ageOnDate } from "../simulation/dates";
import {
  currentLifeCutoff,
  householdMembershipsAt,
} from "../simulation/life-queries";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { factsForPerson, personName } from "../simulation/people";
import {
  createWorldSnapshot,
  deserializeWorld,
  serializeWorld,
} from "../simulation/serialization";
import type {
  EntityId,
  Person,
  SimulationMoment,
  World,
} from "../simulation/types";

/**
 * Saved games in the browser.
 *
 * A save is the canonical world snapshot and nothing else. The summary shown
 * in the load list is derived from that snapshot every time it is read, so a
 * save can never drift into telling a different story from the world inside
 * it — a record whose summary disagrees with its world is treated as corrupt
 * rather than trusted.
 */

export const BROWSER_WORLD_RECORD_KIND = "political-life-browser-world";
export const BROWSER_WORLD_RECORD_VERSION = 1;

const DEFAULT_DATABASE_NAME = "political-life-worlds";
const DATABASE_VERSION = 1;
const STORE_NAME = "worlds";

export interface BrowserWorldResidenceSummary {
  readonly jurisdictionId: EntityId;
  readonly name: string;
}

export interface BrowserWorldSummary {
  readonly saveId: EntityId;
  readonly worldId: EntityId;
  readonly snapshotId: EntityId;
  readonly snapshotFormatVersion: 14;
  readonly worldSchemaVersion: 15;
  readonly worldGeneratorVersion: "demo-world-v15";
  readonly playerPersonId: EntityId;
  readonly playerName: string;
  readonly playerAge: number;
  readonly residence: BrowserWorldResidenceSummary | null;
  readonly currentMoment: SimulationMoment;
  readonly actionSequence: number;
  readonly createdAt: string;
  readonly savedAt: string;
  readonly lastPlayedAt: string;
}

export interface StoredBrowserWorldRecord {
  readonly kind: typeof BROWSER_WORLD_RECORD_KIND;
  readonly recordVersion: typeof BROWSER_WORLD_RECORD_VERSION;
  readonly saveId: EntityId;
  readonly metadata: BrowserWorldSummary;
  readonly payload: string;
}

export interface BrowserWorldRepositoryOptions {
  readonly indexedDB?: IDBFactory;
  readonly now?: () => Date;
  readonly databaseName?: string;
}

interface BrowserWorldSaveTarget {
  save(world: World): Promise<BrowserWorldSummary>;
}

export class BrowserWorldRepository {
  readonly #factory: IDBFactory;
  readonly #now: () => Date;
  readonly #databaseName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: BrowserWorldRepositoryOptions = {}) {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) {
      throw new Error("Saved games are unavailable in this browser.");
    }
    const databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    if (databaseName.trim().length === 0) {
      throw new Error("The saved-game store needs a name.");
    }
    this.#factory = factory;
    this.#now = options.now ?? (() => new Date());
    this.#databaseName = databaseName;
  }

  async save(world: World): Promise<BrowserWorldSummary> {
    const existing = await this.#get(world.id);
    const prior =
      existing === undefined ? null : validateBrowserWorldRecord(existing);
    const timestamp = latestTimestamp(
      nowTimestamp(this.#now),
      prior?.metadata.savedAt,
      prior?.metadata.lastPlayedAt,
    );
    const record = createBrowserWorldRecord(
      world,
      timestamp,
      prior?.metadata.createdAt ?? timestamp,
    );
    await this.#put(record);
    return cloneSummary(record.metadata);
  }

  async load(saveId: EntityId): Promise<World | null> {
    const raw = await this.#get(saveId);
    if (raw === undefined) return null;

    const record = validateBrowserWorldRecord(raw);
    if (record.saveId !== saveId) {
      throw new Error("This saved game does not match the one asked for.");
    }
    const world = deserializeWorld(record.payload);
    const lastPlayedAt = latestTimestamp(
      nowTimestamp(this.#now),
      record.metadata.savedAt,
      record.metadata.lastPlayedAt,
    );
    const updated: StoredBrowserWorldRecord = {
      ...record,
      metadata: { ...record.metadata, lastPlayedAt },
    };
    await this.#put(updated);
    return world;
  }

  async list(): Promise<readonly BrowserWorldSummary[]> {
    const records = (await this.#getAll()).map(validateBrowserWorldRecord);
    return records
      .map((record) => cloneSummary(record.metadata))
      .sort(compareSummaries);
  }

  async mostRecent(): Promise<BrowserWorldSummary | null> {
    return (await this.list())[0] ?? null;
  }

  async remove(saveId: EntityId): Promise<boolean> {
    const existing = await this.#get(saveId);
    if (existing === undefined) return false;
    await this.#delete(saveId);
    return true;
  }

  async #database(): Promise<IDBDatabase> {
    if (!this.#databasePromise) {
      this.#databasePromise = openDatabase(
        this.#factory,
        this.#databaseName,
      ).catch((error: unknown) => {
        this.#databasePromise = null;
        throw error;
      });
    }
    return this.#databasePromise;
  }

  async #get(saveId: EntityId): Promise<unknown | undefined> {
    const database = await this.#database();
    return runRequest(database, "readonly", (store) => store.get(saveId));
  }

  async #getAll(): Promise<readonly unknown[]> {
    const database = await this.#database();
    return runRequest(database, "readonly", (store) => store.getAll());
  }

  async #put(record: StoredBrowserWorldRecord): Promise<void> {
    const database = await this.#database();
    await runRequest(database, "readwrite", (store) => store.put(record));
  }

  async #delete(saveId: EntityId): Promise<void> {
    const database = await this.#database();
    await runRequest(database, "readwrite", (store) => store.delete(saveId));
  }
}

/**
 * Autosaves happen while the player keeps playing, so two of them can be in
 * flight at once. Running them in the order they were asked for stops an older
 * world from landing on top of a newer one.
 */
export class SerializedAutosaveCoordinator {
  readonly #target: BrowserWorldSaveTarget;
  #tail: Promise<void> = Promise.resolve();

  constructor(target: BrowserWorldSaveTarget) {
    this.#target = target;
  }

  save(world: World): Promise<BrowserWorldSummary> {
    const operation = this.#tail.then(() => this.#target.save(world));
    this.#tail = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async flush(): Promise<void> {
    await this.#tail;
  }
}

export function createBrowserWorldRecord(
  world: World,
  savedAt: string,
  createdAt: string = savedAt,
): StoredBrowserWorldRecord {
  assertTimestamp(createdAt, "creation time");
  assertTimestamp(savedAt, "saved time");
  if (createdAt > savedAt) {
    throw new Error(
      "A saved game cannot have been created after it was saved.",
    );
  }
  const player = controlledPlayer(world);
  const snapshot = createWorldSnapshot(world);
  const summary: BrowserWorldSummary = {
    saveId: world.id,
    worldId: world.id,
    snapshotId: snapshot.snapshotId,
    snapshotFormatVersion: snapshot.formatVersion,
    worldSchemaVersion: world.schemaVersion,
    worldGeneratorVersion: world.generatorVersion,
    playerPersonId: player.id,
    playerName: personName(player),
    playerAge: ageOnDate(player.birthDate, world.currentDate),
    residence: currentResidence(world, player),
    currentMoment: { ...world.currentMoment },
    actionSequence: world.actionSequence,
    createdAt,
    savedAt,
    lastPlayedAt: savedAt,
  };
  return {
    kind: BROWSER_WORLD_RECORD_KIND,
    recordVersion: BROWSER_WORLD_RECORD_VERSION,
    saveId: world.id,
    metadata: summary,
    payload: serializeWorld(world),
  };
}

export function validateBrowserWorldRecord(
  value: unknown,
): StoredBrowserWorldRecord {
  if (!isRecord(value)) {
    throw new Error("This saved game is damaged: it is not a record.");
  }
  if (
    value.kind !== BROWSER_WORLD_RECORD_KIND ||
    value.recordVersion !== BROWSER_WORLD_RECORD_VERSION
  ) {
    throw new Error(
      "This saved game was written by a version the game no longer reads.",
    );
  }
  if (typeof value.payload !== "string") {
    throw new Error("This saved game is damaged: the world is missing.");
  }

  let world: World;
  try {
    world = deserializeWorld(value.payload);
  } catch (error) {
    throw new Error("This saved game is damaged: the world will not load.", {
      cause: error,
    });
  }
  if (value.payload !== serializeWorld(world)) {
    throw new Error(
      "This saved game is damaged: the world was altered after it was written.",
    );
  }
  if (typeof value.saveId !== "string" || value.saveId !== world.id) {
    throw new Error("This saved game is damaged: it names a different world.");
  }
  const metadata = validateMetadata(value.metadata);
  const expected = createBrowserWorldRecord(
    world,
    metadata.savedAt,
    metadata.createdAt,
  ).metadata;
  if (!sameCanonicalMetadata(metadata, expected)) {
    throw new Error(
      "This saved game is damaged: its summary disagrees with its world.",
    );
  }
  return {
    kind: BROWSER_WORLD_RECORD_KIND,
    recordVersion: BROWSER_WORLD_RECORD_VERSION,
    saveId: world.id,
    metadata: cloneSummary(metadata),
    payload: value.payload,
  };
}

function currentResidence(
  world: World,
  player: Person,
): BrowserWorldResidenceSummary | null {
  const memberships = householdMembershipsAt(
    world,
    player.id,
    currentLifeCutoff(world),
  )
    .filter((membership) => membership.location !== null)
    .sort((left, right) => {
      const leftDate = left.location?.effectiveAt ?? left.membership.startedAt;
      const rightDate =
        right.location?.effectiveAt ?? right.membership.startedAt;
      return (
        rightDate.localeCompare(leftDate) ||
        right.membership.sequence - left.membership.sequence ||
        left.membership.id.localeCompare(right.membership.id)
      );
    });
  const householdJurisdictionId = memberships[0]?.location?.jurisdictionId;
  if (householdJurisdictionId) {
    return residenceSummary(world, householdJurisdictionId);
  }

  const residenceFact = factsForPerson(player)
    .filter(
      (fact) =>
        fact.kind === "residence" &&
        fact.occurredAt <= world.currentDate &&
        (fact.endedAt === null || fact.endedAt >= world.currentDate),
    )
    .sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        left.stableKey.localeCompare(right.stableKey),
    )[0];
  return residenceSummary(
    world,
    residenceFact?.jurisdictionId ?? player.homeJurisdictionId,
  );
}

/** Prefers the place provider's player-facing name over the raw jurisdiction record. */
function residenceSummary(
  world: World,
  jurisdictionId: EntityId,
): BrowserWorldResidenceSummary | null {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return jurisdiction
    ? {
        jurisdictionId: jurisdiction.id,
        name:
          lifePlaceByJurisdictionId(jurisdictionId)?.displayName ??
          jurisdiction.name,
      }
    : null;
}

function controlledPlayer(world: World): Person {
  if (world.control.kind !== "person") {
    throw new Error("A saved game needs a character the player controls.");
  }
  const player = world.people[world.control.personId];
  if (!player) {
    throw new Error("The saved game's character is missing from its world.");
  }
  return player;
}

function validateMetadata(value: unknown): BrowserWorldSummary {
  if (!isRecord(value)) {
    throw new Error("This saved game is damaged: its summary is missing.");
  }
  assertTimestamp(value.createdAt, "creation time");
  assertTimestamp(value.savedAt, "saved time");
  assertTimestamp(value.lastPlayedAt, "last-played time");
  if (value.createdAt > value.savedAt || value.savedAt > value.lastPlayedAt) {
    throw new Error("This saved game is damaged: its times run backwards.");
  }
  if (!isRecord(value.currentMoment)) {
    throw new Error("This saved game is damaged: the world clock is missing.");
  }
  const residence = value.residence;
  if (
    residence !== null &&
    (!isRecord(residence) ||
      typeof residence.jurisdictionId !== "string" ||
      typeof residence.name !== "string")
  ) {
    throw new Error("This saved game is damaged: the place is unreadable.");
  }
  if (
    typeof value.saveId !== "string" ||
    typeof value.worldId !== "string" ||
    typeof value.snapshotId !== "string" ||
    value.snapshotFormatVersion !== 14 ||
    value.worldSchemaVersion !== 15 ||
    value.worldGeneratorVersion !== "demo-world-v15" ||
    typeof value.playerPersonId !== "string" ||
    typeof value.playerName !== "string" ||
    value.playerName.trim().length === 0 ||
    !Number.isSafeInteger(value.playerAge) ||
    (value.playerAge as number) < 0 ||
    typeof value.currentMoment.date !== "string" ||
    !Number.isSafeInteger(value.currentMoment.minuteOfDay) ||
    typeof value.currentMoment.timeZone !== "string" ||
    !Number.isSafeInteger(value.currentMoment.utcOffsetMinutes) ||
    !Number.isSafeInteger(value.actionSequence) ||
    (value.actionSequence as number) < 0
  ) {
    throw new Error("This saved game is damaged: its summary is unreadable.");
  }
  return value as unknown as BrowserWorldSummary;
}

function sameCanonicalMetadata(
  actual: BrowserWorldSummary,
  expected: BrowserWorldSummary,
): boolean {
  return (
    actual.saveId === expected.saveId &&
    actual.worldId === expected.worldId &&
    actual.snapshotId === expected.snapshotId &&
    actual.snapshotFormatVersion === expected.snapshotFormatVersion &&
    actual.worldSchemaVersion === expected.worldSchemaVersion &&
    actual.worldGeneratorVersion === expected.worldGeneratorVersion &&
    actual.playerPersonId === expected.playerPersonId &&
    actual.playerName === expected.playerName &&
    actual.playerAge === expected.playerAge &&
    actual.residence?.jurisdictionId === expected.residence?.jurisdictionId &&
    actual.residence?.name === expected.residence?.name &&
    actual.currentMoment.date === expected.currentMoment.date &&
    actual.currentMoment.minuteOfDay === expected.currentMoment.minuteOfDay &&
    actual.currentMoment.timeZone === expected.currentMoment.timeZone &&
    actual.currentMoment.utcOffsetMinutes ===
      expected.currentMoment.utcOffsetMinutes &&
    actual.actionSequence === expected.actionSequence
  );
}

function cloneSummary(summary: BrowserWorldSummary): BrowserWorldSummary {
  return {
    ...summary,
    residence: summary.residence ? { ...summary.residence } : null,
    currentMoment: { ...summary.currentMoment },
  };
}

function compareSummaries(
  left: BrowserWorldSummary,
  right: BrowserWorldSummary,
): number {
  return (
    right.lastPlayedAt.localeCompare(left.lastPlayedAt) ||
    right.savedAt.localeCompare(left.savedAt) ||
    left.saveId.localeCompare(right.saveId)
  );
}

function nowTimestamp(now: () => Date): string {
  const date = now();
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error("The clock returned a time the game cannot use.");
  }
  return date.toISOString();
}

function latestTimestamp(
  timestamp: string,
  ...candidates: readonly (string | undefined)[]
): string {
  let latest = timestamp;
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate > latest) latest = candidate;
  }
  return latest;
}

function assertTimestamp(
  value: unknown,
  label: string,
): asserts value is string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`This saved game's ${label} is unreadable.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function openDatabase(
  factory: IDBFactory,
  databaseName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "saveId" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () =>
      reject(
        new Error("Saved games could not be opened.", {
          cause: request.error,
        }),
      );
    request.onblocked = () =>
      reject(
        new Error(
          "Saved games are in use by another tab. Close it and try again.",
        ),
      );
  });
}

function runRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    let result: T;
    let requestCompleted = false;
    let transactionCompleted = false;
    const finish = () => {
      if (requestCompleted && transactionCompleted) resolve(result);
    };
    let request: IDBRequest<T>;
    try {
      request = operation(transaction.objectStore(STORE_NAME));
    } catch (error) {
      reject(new Error("The saved game could not be read.", { cause: error }));
      return;
    }
    request.onsuccess = () => {
      result = request.result;
      requestCompleted = true;
      finish();
    };
    request.onerror = () =>
      reject(
        new Error("The saved game could not be read.", {
          cause: request.error,
        }),
      );
    transaction.oncomplete = () => {
      transactionCompleted = true;
      finish();
    };
    transaction.onerror = () =>
      reject(new Error("Saving did not finish.", { cause: transaction.error }));
    transaction.onabort = () =>
      reject(
        new Error("Saving was interrupted.", { cause: transaction.error }),
      );
  });
}
