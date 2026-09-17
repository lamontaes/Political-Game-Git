import type { PersonWardrobePreference } from "./person-visual-selection";
import { readMapPreferences } from "../maps/map-preferences";
import {
  DEFAULT_DATABASE_NAME,
  INTERFACE_STORE_NAME,
  openDatabase,
} from "./browser-world-repository";
import {
  DEFAULT_PREFERENCES,
  EMPTY_JOURNAL,
  LEGACY_INTERFACE_PROGRESS,
  type InterfaceProgress,
  type PrivateJournal,
  type JournalNote,
  refKey,
  type PinSize,
  type ShellPin,
  type ShellPreferences,
  type ShellRef,
} from "./shell-navigation";
import type { EntityId } from "../simulation";

/**
 * Where the shell's saved references and preferences live.
 *
 * A pin is a player's choice about their own interface, not a fact about the
 * world, so it does not belong inside a saved world: writing it there would
 * change the content identity of a life every time somebody rearranged a rail.
 * It is also not a second save store. It is one more object store in the game's
 * existing database, created by the same additive migration that opens the
 * worlds, so there is exactly one place player state is kept and exactly one
 * thing to clear.
 *
 * Everything read back is validated. A record written by a future version, or
 * damaged, comes back as "nothing saved" rather than as a rail of rows that
 * cannot be opened — the shell then keeps its defaults, which is a working game.
 */

/*
 * Version 4 adds interface progress: whether the world introduction was seen
 * and the recap frontier. Older records have no progress and read back as a
 * life already under way (introduction seen, frontier set on first read).
 */
export const SHELL_RECORD_VERSION = 4;
export const SHELL_RECORD_VERSIONS: readonly number[] = [
  1,
  2,
  3,
  SHELL_RECORD_VERSION,
];

const PIN_SIZES: readonly PinSize[] = ["tiny", "normal", "expanded"];
/**
 * Reference kinds a stored pin may name.
 *
 * This is the saved-navigation allowlist, and it is deliberately explicit: a
 * pin read back from storage is untrusted input, so an unknown kind is dropped
 * rather than reconstructed. Adding a reference type therefore means adding it
 * here too — `government` arrived with UI9-04, and without this line a pinned
 * government survived until the page reloaded and then silently vanished.
 *
 * Older records simply have no government pins in them, so there is nothing to
 * migrate: they read back exactly as they did before, and gain the new kind
 * only once the player pins one.
 */
const REF_KINDS: readonly ShellRef["kind"][] = [
  "person",
  "commitment",
  "measure",
  "government",
  "organization",
];

export interface StoredShellState {
  readonly personWardrobes?: Readonly<Record<string, PersonWardrobePreference>>;
  /**
   * The slot-wide notebook older records kept. Read back as written; the
   * shell hands it to the person who was played when it was written.
   */
  readonly journal?: PrivateJournal;
  /** Private notebooks keyed by the played person they belong to. */
  readonly journals?: Readonly<Record<string, PrivateJournal>>;
  readonly pins: readonly ShellPin[];
  readonly preferences: ShellPreferences;
  readonly progress?: InterfaceProgress;
}

export const EMPTY_SHELL_STATE: StoredShellState = {
  pins: [],
  preferences: DEFAULT_PREFERENCES,
  journal: EMPTY_JOURNAL,
  journals: {},
  personWardrobes: {},
  progress: LEGACY_INTERFACE_PROGRESS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readRef(value: unknown): ShellRef | null {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const id = value.id;
  if (typeof kind !== "string" || typeof id !== "string") return null;
  if (!REF_KINDS.includes(kind as ShellRef["kind"])) return null;
  return { kind: kind as ShellRef["kind"], id: id as EntityId };
}

function readPins(value: unknown): readonly ShellPin[] {
  if (!Array.isArray(value)) return [];
  const pins: ShellPin[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const ref = readRef(entry.ref);
    if (!ref) continue;
    const key = refKey(ref);
    if (seen.has(key)) continue;
    const size = PIN_SIZES.includes(entry.size as PinSize)
      ? (entry.size as PinSize)
      : "normal";
    seen.add(key);
    pins.push({ key, ref, size });
  }
  return pins;
}

function readPreferences(value: unknown): ShellPreferences {
  if (!isRecord(value)) return DEFAULT_PREFERENCES;
  const peopleView =
    value.peopleView === "list" ||
    value.peopleView === "categories" ||
    value.peopleView === "web"
      ? value.peopleView
      : DEFAULT_PREFERENCES.peopleView;
  const defaultPinSize = PIN_SIZES.includes(value.defaultPinSize as PinSize)
    ? (value.defaultPinSize as PinSize)
    : DEFAULT_PREFERENCES.defaultPinSize;
  const followedNewsOutletKeys = Array.isArray(value.followedNewsOutletKeys)
    ? [
        ...new Set(
          value.followedNewsOutletKeys
            .filter(
              (entry): entry is string =>
                typeof entry === "string" && entry.trim().length > 0,
            )
            .map((entry) => entry.trim()),
        ),
      ]
    : [];
  const stored = isRecord(value.interruptions) ? value.interruptions : {};
  const interruptions = {
    stopForWorkShifts:
      typeof stored.stopForWorkShifts === "boolean"
        ? stored.stopForWorkShifts
        : DEFAULT_PREFERENCES.interruptions.stopForWorkShifts,
    stopForTentativeHolds:
      typeof stored.stopForTentativeHolds === "boolean"
        ? stored.stopForTentativeHolds
        : DEFAULT_PREFERENCES.interruptions.stopForTentativeHolds,
  };
  const proposalLayout =
    value.proposalLayout === "compare" ||
    value.proposalLayout === "read" ||
    value.proposalLayout === "auto"
      ? value.proposalLayout
      : DEFAULT_PREFERENCES.proposalLayout;
  const newsMode =
    value.newsMode === "publication" || value.newsMode === "front"
      ? value.newsMode
      : DEFAULT_PREFERENCES.newsMode;
  const newsOutletKey =
    typeof value.newsOutletKey === "string" &&
    value.newsOutletKey.trim().length > 0
      ? value.newsOutletKey.trim()
      : DEFAULT_PREFERENCES.newsOutletKey;
  const journalView =
    value.journalView === "years" || value.journalView === "chapters"
      ? value.journalView
      : DEFAULT_PREFERENCES.journalView;
  const journalYear =
    typeof value.journalYear === "string" && /^\d{4}$/.test(value.journalYear)
      ? value.journalYear
      : DEFAULT_PREFERENCES.journalYear;
  const politicsPlace =
    value.politicsPlace === "home" || value.politicsPlace === "here"
      ? value.politicsPlace
      : DEFAULT_PREFERENCES.politicsPlace;
  const governmentScope =
    value.governmentScope === "local" ||
    value.governmentScope === "state" ||
    value.governmentScope === "federal"
      ? value.governmentScope
      : DEFAULT_PREFERENCES.governmentScope;
  return {
    peopleView,
    defaultPinSize,
    followedNewsOutletKeys,
    interruptions,
    proposalLayout,
    newsMode,
    newsOutletKey,
    journalView,
    journalYear,
    politicsPlace,
    governmentScope,
    // Saves written before the map existed have no map field; defaults apply.
    map: readMapPreferences(value.map),
  };
}

/**
 * What a stored record means, or null when there is nothing usable in it.
 *
 * Null and "empty" are deliberately different answers. A slot that has never
 * been written has no opinion about the player's pins, so the shell keeps the
 * ones it already has; a slot written with no pins is a player who removed
 * them, and that is restored as the empty rail it is.
 */
export function readStoredShellState(value: unknown): StoredShellState | null {
  if (!isRecord(value)) return null;
  if (!SHELL_RECORD_VERSIONS.includes(value.version as number)) return null;
  return {
    journal: readJournal(value.journal),
    journals: readJournals(value.journals),
    personWardrobes: readWardrobes(value.personWardrobes),
    pins: readPins(value.pins),
    preferences: readPreferences(value.preferences),
    progress: readProgress(value.progress),
  };
}

/**
 * Interface progress, validated like every other stored field.
 *
 * A missing or damaged value is a life already under way, never a fresh one:
 * the cost of that reading is an introduction the player can still open from
 * the menu, whereas the opposite reading would push an introduction in front
 * of somebody's long-running save.
 */
function readProgress(value: unknown): InterfaceProgress {
  if (!isRecord(value)) return LEGACY_INTERFACE_PROGRESS;
  const frontier = value.recapFrontier;
  return {
    orientationSeen:
      typeof value.orientationSeen === "boolean"
        ? value.orientationSeen
        : LEGACY_INTERFACE_PROGRESS.orientationSeen,
    recapFrontier:
      typeof frontier === "number" &&
      Number.isSafeInteger(frontier) &&
      frontier >= 0
        ? frontier
        : null,
  };
}

/** One validated wire codec for shell writes and portable transfers. */
export function encodeStoredShellState(
  saveId: EntityId,
  state: StoredShellState,
) {
  return {
    saveId,
    version: SHELL_RECORD_VERSION,
    journal: readJournal(state.journal),
    journals: readJournals(state.journals),
    personWardrobes: readWardrobes(state.personWardrobes),
    pins: readPins(state.pins).map((pin) => ({ ref: pin.ref, size: pin.size })),
    preferences: readPreferences(state.preferences),
    progress: readProgress(state.progress),
  };
}

function readJournals(
  value: unknown,
): Readonly<Record<string, PrivateJournal>> {
  if (!isRecord(value)) return {};
  const journals: Record<string, PrivateJournal> = {};
  for (const [personId, journal] of Object.entries(value)) {
    if (!personId || !isRecord(journal)) continue;
    journals[personId] = readJournal(journal);
  }
  return journals;
}

function isEmptyJournal(journal: PrivateJournal): boolean {
  return journal.ambition === "" && journal.notes.length === 0;
}

/**
 * Gives a slot-wide notebook from an older record to the person it was
 * written by: the save's original controlled person, since notebooks were
 * slot-wide only before anybody could be continued. Nothing is dropped — a
 * notebook that person already has keeps its own intentions and gains the old
 * notes it does not already hold. With nobody to give it to, it stays
 * unassigned rather than being shown to whoever is played now.
 */
export function assignLegacyJournal(
  stored: Pick<StoredShellState, "journal" | "journals">,
  originalPersonId: EntityId | null,
): {
  readonly journals: Readonly<Record<string, PrivateJournal>>;
  readonly legacyJournal: PrivateJournal;
} {
  const journals = stored.journals ?? {};
  const legacy = stored.journal ?? EMPTY_JOURNAL;
  if (isEmptyJournal(legacy)) return { journals, legacyJournal: EMPTY_JOURNAL };
  if (originalPersonId === null) return { journals, legacyJournal: legacy };
  const existing = journals[originalPersonId];
  if (!existing) {
    return {
      journals: { ...journals, [originalPersonId]: legacy },
      legacyJournal: EMPTY_JOURNAL,
    };
  }
  const held = new Set(existing.notes.map((note) => note.id));
  const ambition =
    existing.ambition === ""
      ? legacy.ambition
      : legacy.ambition === "" || existing.ambition.includes(legacy.ambition)
        ? existing.ambition
        : `${existing.ambition}\n\n${legacy.ambition}`;
  return {
    journals: {
      ...journals,
      [originalPersonId]: {
        ambition,
        notes: [
          ...existing.notes,
          ...legacy.notes.filter((note) => !held.has(note.id)),
        ],
      },
    },
    legacyJournal: EMPTY_JOURNAL,
  };
}

function readJournal(value: unknown): PrivateJournal {
  if (!isRecord(value)) return EMPTY_JOURNAL;
  const notes: JournalNote[] = [];
  const seen = new Set<string>();
  if (Array.isArray(value.notes))
    for (const entry of value.notes) {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        seen.has(entry.id)
      )
        continue;
      if (
        typeof entry.title !== "string" ||
        typeof entry.body !== "string" ||
        typeof entry.group !== "string"
      )
        continue;
      seen.add(entry.id);
      notes.push({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        group: entry.group,
        personId:
          typeof entry.personId === "string"
            ? (entry.personId as EntityId)
            : null,
        eventKey: typeof entry.eventKey === "string" ? entry.eventKey : null,
      });
    }
  return {
    ambition: typeof value.ambition === "string" ? value.ambition : "",
    notes,
  };
}

function transact<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INTERFACE_STORE_NAME, mode);
    let result: T;
    let settled = false;
    const request = operation(transaction.objectStore(INTERFACE_STORE_NAME));
    request.onsuccess = () => {
      result = request.result;
      settled = true;
    };
    request.onerror = () =>
      reject(
        new Error("The interface state could not be read.", {
          cause: request.error,
        }),
      );
    transaction.oncomplete = () => {
      if (settled) resolve(result);
    };
    transaction.onerror = () =>
      reject(
        new Error("The interface state could not be written.", {
          cause: transaction.error,
        }),
      );
    transaction.onabort = () =>
      reject(new Error("The interface state write was abandoned."));
  });
}

/**
 * The shell's own store, opened lazily against the game's database.
 *
 * Every method fails soft. A browser with storage turned off gets a game whose
 * pins last the session, which is a smaller loss than a game that will not
 * open — and the shell says nothing untrue about it either way.
 */
export class BrowserShellStateStore {
  readonly #factory: IDBFactory | null;
  readonly #databaseName: string;
  #databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    options: {
      readonly indexedDB?: IDBFactory;
      readonly databaseName?: string;
    } = {},
  ) {
    this.#factory = options.indexedDB ?? globalThis.indexedDB ?? null;
    this.#databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
  }

  get available(): boolean {
    return this.#factory !== null;
  }

  /**
   * Which database this store is bound to.
   *
   * Readable because a consumer has to be able to tell one store from another.
   * `useShell` remembers which slot it has finished reading so it does not
   * write before it has read; that memory was the slot id alone, so switching
   * to a differently-named store for the SAME slot left the old certification
   * standing — the read was skipped and the write went straight out, copying
   * one database's pins and wardrobe into the other. The slot is only half of
   * what identifies a record.
   */
  get databaseName(): string {
    return this.#databaseName;
  }

  async #database(): Promise<IDBDatabase | null> {
    const factory = this.#factory;
    if (!factory) return null;
    if (!this.#databasePromise) {
      this.#databasePromise = openDatabase(factory, this.#databaseName).catch(
        (error: unknown) => {
          this.#databasePromise = null;
          throw error;
        },
      );
    }
    try {
      return await this.#databasePromise;
    } catch {
      return null;
    }
  }

  async read(saveId: EntityId): Promise<StoredShellState | null> {
    const database = await this.#database();
    if (!database) return null;
    try {
      const stored = await transact(database, "readonly", (store) =>
        store.get(saveId),
      );
      return readStoredShellState(stored);
    } catch {
      return null;
    }
  }

  async write(saveId: EntityId, state: StoredShellState): Promise<boolean> {
    const database = await this.#database();
    if (!database) return false;
    try {
      await transact(database, "readwrite", (store) =>
        store.put(encodeStoredShellState(saveId, state)),
      );
      return true;
    } catch {
      return false;
    }
  }

  async remove(saveId: EntityId): Promise<void> {
    const database = await this.#database();
    if (!database) return;
    try {
      await transact(database, "readwrite", (store) => store.delete(saveId));
    } catch {
      /* A slot that could not be cleared is not worth failing a delete over. */
    }
  }
}

function readWardrobes(
  value: unknown,
): Readonly<Record<string, PersonWardrobePreference>> {
  if (!isRecord(value)) return {};
  const result: Record<string, PersonWardrobePreference> = Object.create(null);
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry) || entry.personId !== id || !isRecord(entry.families))
      continue;
    if (
      Object.entries(entry.families).some(
        ([kind, family]) =>
          !["top", "bottom", "footwear"].includes(kind) ||
          typeof family !== "string" ||
          !family.trim(),
      )
    )
      continue;
    result[id] = {
      personId: id,
      families: { ...entry.families },
    } as PersonWardrobePreference;
  }
  return result;
}
