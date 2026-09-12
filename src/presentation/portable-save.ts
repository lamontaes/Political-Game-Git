import { deserializeWorld } from "../simulation/serialization";
import type { EntityId } from "../simulation/types";
import {
  EMPTY_SHELL_STATE,
  SHELL_RECORD_VERSION,
  SHELL_RECORD_VERSIONS,
  encodeStoredShellState,
  readStoredShellState,
  type StoredShellState,
} from "./browser-shell-state";
import {
  INTERFACE_STORE_NAME,
  openDatabase,
  readStoredRecord,
  type BrowserSaveStore,
  type StoredBrowserWorldRecord,
} from "./browser-world-repository";

/**
 * A versioned file a player can move between the browser game and an
 * installed copy.
 *
 * The life is two persistence paths: the canonical World, and the shell's
 * interface state (pins, private journal, wardrobe preferences) when that
 * store exists. Exporting only the World would silently drop the interface.
 * The interface store is created by the same additive IndexedDB migration
 * the UI-bearing shell uses. An included pins/journal/wardrobe payload is
 * written there, or the import is refused and rolled back — never reported
 * complete after a silent drop.
 *
 * Import always creates a new local slot. The person inside the World stays
 * themselves; a new save id is not a new fictional life. Existing slots are
 * not overwritten. Candidate-preview provenance stays labelled and does not
 * make unreleased art available in a production profile.
 */

export const PORTABLE_SAVE_KIND = "our-civic-duty-portable-save";
export const PORTABLE_SAVE_FORMAT_VERSION = 1;
export const PORTABLE_SAVE_EXTENSION = "ocd-life.json";
/** Refuse anything larger before parsing. 8 MiB is well above a healthy life. */
export const PORTABLE_SAVE_MAX_BYTES = 8 * 1024 * 1024;

export type PortableArtProvenance = "production" | "candidate-review";

export type PortableInterfacePayload =
  | { readonly status: "included"; readonly state: PortableInterfaceState }
  | { readonly status: "unavailable"; readonly reason: string };

export interface PortableInterfaceState extends StoredShellState {
  readonly version: number;
}

export interface PortableSaveBundle {
  readonly kind: typeof PORTABLE_SAVE_KIND;
  readonly formatVersion: typeof PORTABLE_SAVE_FORMAT_VERSION;
  readonly exportedAt: string;
  readonly artProvenance: PortableArtProvenance;
  readonly sourceSlotId: EntityId;
  readonly world: StoredBrowserWorldRecord;
  readonly interface: PortableInterfacePayload;
}

export type PortableSaveParseFailure =
  | "cancelled"
  | "too-large"
  | "malformed"
  | "unsupported-version"
  | "unreadable-world"
  | "unknown-required-catalog"
  | "candidate-in-production"
  | "partial-failure";

export type PortableSaveParseResult =
  | { readonly status: "ok"; readonly bundle: PortableSaveBundle }
  | {
      readonly status: "error";
      readonly failure: PortableSaveParseFailure;
      readonly reason: string;
    };

/** The shell owns the supported schema list; portable transfer cannot drift. */
export const INTERFACE_RECORD_VERSIONS = new Set(SHELL_RECORD_VERSIONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function emptyInterfaceState(): PortableInterfaceState {
  return { ...EMPTY_SHELL_STATE, version: SHELL_RECORD_VERSION };
}

export function readPortableInterfaceState(
  value: unknown,
): PortableInterfaceState | null {
  if (!isRecord(value)) return null;
  if (
    value.version !== undefined &&
    (typeof value.version !== "number" ||
      !INTERFACE_RECORD_VERSIONS.has(value.version))
  ) {
    return null;
  }
  if (!Array.isArray(value.pins)) return null;
  if (value.journal !== undefined && !isRecord(value.journal)) return null;
  if (value.preferences !== undefined && !isRecord(value.preferences)) {
    return null;
  }
  if (value.personWardrobes !== undefined && !isRecord(value.personWardrobes)) {
    return null;
  }
  // Original format-1 exports omitted the record tag and used the v2 shape.
  const state = readStoredShellState({ ...value, version: value.version ?? 2 });
  return state ? { ...state, version: SHELL_RECORD_VERSION } : null;
}

export function parsePortableSave(
  text: string,
  options: {
    readonly maxBytes?: number;
    readonly productionProfile?: boolean;
  } = {},
): PortableSaveParseResult {
  const maxBytes = options.maxBytes ?? PORTABLE_SAVE_MAX_BYTES;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > maxBytes) {
    return {
      status: "error",
      failure: "too-large",
      reason: "That file is larger than a saved life is allowed to be.",
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  if (!isRecord(parsed) || parsed.kind !== PORTABLE_SAVE_KIND) {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  if (
    typeof parsed.formatVersion !== "number" ||
    parsed.formatVersion > PORTABLE_SAVE_FORMAT_VERSION
  ) {
    return {
      status: "error",
      failure: "unsupported-version",
      reason:
        "That save was written by a newer game and cannot be opened here. Your existing games are unchanged.",
    };
  }
  if (parsed.formatVersion < 1) {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  const artProvenance =
    parsed.artProvenance === "candidate-review"
      ? "candidate-review"
      : parsed.artProvenance === "production"
        ? "production"
        : null;
  if (artProvenance === null) {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  if (
    options.productionProfile !== false &&
    artProvenance === "candidate-review"
  ) {
    return {
      status: "error",
      failure: "candidate-in-production",
      reason:
        "That life was exported from a candidate-art preview and cannot be opened in the ordinary game. Existing saves are unchanged.",
    };
  }
  const worldRead = readStoredRecord(parsed.world);
  if (worldRead.kind !== "healthy") {
    return {
      status: "error",
      failure: "unreadable-world",
      reason:
        worldRead.kind === "damaged"
          ? worldRead.quarantine.reason
          : "That saved world could not be read. Existing saves are unchanged.",
    };
  }
  try {
    deserializeWorld(worldRead.record.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const catalog = /catalog|schema|formatVersion|unknown/i.test(message);
    return {
      status: "error",
      failure: catalog ? "unknown-required-catalog" : "unreadable-world",
      reason: catalog
        ? "That life needs catalogs this game does not have. Existing saves are unchanged."
        : "That saved world could not be read. Existing saves are unchanged.",
    };
  }
  if (
    typeof parsed.exportedAt !== "string" ||
    typeof parsed.sourceSlotId !== "string"
  ) {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  let iface: PortableInterfacePayload;
  if (!isRecord(parsed.interface)) {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  if (parsed.interface.status === "unavailable") {
    iface = {
      status: "unavailable",
      reason:
        typeof parsed.interface.reason === "string"
          ? parsed.interface.reason
          : "Interface state was not stored with this life.",
    };
  } else if (parsed.interface.status === "included") {
    const state = readPortableInterfaceState(parsed.interface.state);
    if (state === null) {
      const unsupported =
        isRecord(parsed.interface.state) &&
        parsed.interface.state.version !== undefined &&
        !INTERFACE_RECORD_VERSIONS.has(
          parsed.interface.state.version as number,
        );
      return {
        status: "error",
        failure: unsupported ? "unsupported-version" : "malformed",
        reason:
          "That file's interface state could not be read. Existing saves are unchanged.",
      };
    }
    iface = { status: "included", state };
  } else {
    return {
      status: "error",
      failure: "malformed",
      reason: "That file is not a saved life.",
    };
  }
  return {
    status: "ok",
    bundle: {
      kind: PORTABLE_SAVE_KIND,
      formatVersion: PORTABLE_SAVE_FORMAT_VERSION,
      exportedAt: parsed.exportedAt,
      artProvenance,
      sourceSlotId: parsed.sourceSlotId as EntityId,
      world: worldRead.record,
      interface: iface,
    },
  };
}

export function serializePortableSave(bundle: PortableSaveBundle): string {
  return `${JSON.stringify(bundle)}\n`;
}

export async function exportPortableSave(
  store: BrowserSaveStore,
  saveId: EntityId,
  options: {
    readonly indexedDB?: IDBFactory;
    readonly databaseName?: string;
    readonly artProvenance?: PortableArtProvenance;
    readonly now?: () => Date;
  } = {},
): Promise<PortableSaveParseResult> {
  let record: StoredBrowserWorldRecord | null;
  try {
    record = await store.inspectRecord(saveId);
  } catch (error) {
    return {
      status: "error",
      failure: "unreadable-world",
      reason:
        error instanceof Error
          ? error.message
          : "That saved game could not be read.",
    };
  }
  if (record === null) {
    return {
      status: "error",
      failure: "unreadable-world",
      reason: "That saved game is no longer here.",
    };
  }
  const iface = await readOptionalInterface(
    options.indexedDB ?? store.indexedDB,
    options.databaseName ?? store.databaseName,
    saveId,
  );
  if (iface.status === "error") return iface;
  return {
    status: "ok",
    bundle: {
      kind: PORTABLE_SAVE_KIND,
      formatVersion: PORTABLE_SAVE_FORMAT_VERSION,
      exportedAt: (options.now ?? (() => new Date()))().toISOString(),
      artProvenance: options.artProvenance ?? "production",
      sourceSlotId: saveId,
      world: record,
      interface: iface,
    },
  };
}

export async function importPortableSave(
  store: BrowserSaveStore,
  bundle: PortableSaveBundle,
  options: {
    readonly indexedDB?: IDBFactory;
    readonly databaseName?: string;
    readonly existingSaveIds?: () => Promise<readonly EntityId[]>;
    /**
     * `world-only` skips included pins/journal/wardrobe on purpose and says
     * so. The default writes included interface state or rolls the slot back.
     */
    readonly interfacePolicy?: "transfer" | "world-only";
  } = {},
): Promise<
  | { readonly status: "imported"; readonly saveId: EntityId }
  | {
      readonly status: "error";
      readonly failure: PortableSaveParseFailure;
      readonly reason: string;
    }
> {
  // Validate again at the mutation boundary, including callers bypassing parse.
  const checked = parsePortableSave(serializePortableSave(bundle), {
    productionProfile: false,
  });
  if (checked.status === "error") return checked;
  bundle = checked.bundle;
  const world = deserializeWorld(bundle.world.payload);
  const saveId = store.newSaveId(world);
  const existing = options.existingSaveIds
    ? await options.existingSaveIds()
    : (await store.list()).saves.map((save) => save.saveId);
  if (existing.includes(saveId)) {
    return {
      status: "error",
      failure: "partial-failure",
      reason:
        "A new save slot could not be chosen. Existing saves are unchanged.",
    };
  }
  const before = await snapshotPayloads(store);
  try {
    const outcome = await store.save(world, saveId);
    if (outcome.status !== "saved") {
      return {
        status: "error",
        failure: "partial-failure",
        reason: `${outcome.reason} Existing saves are unchanged.`,
      };
    }
    if (
      bundle.interface.status === "included" &&
      options.interfacePolicy !== "world-only"
    ) {
      const written = await writeOptionalInterface(
        options.indexedDB ?? store.indexedDB,
        options.databaseName ?? store.databaseName,
        saveId,
        bundle.interface.state,
      );
      if (!written.ok) {
        await store.remove(saveId);
        const after = await snapshotPayloads(store);
        if (after !== before) {
          return {
            status: "error",
            failure: "partial-failure",
            reason:
              "Import did not finish and existing saves may need a second look.",
          };
        }
        return {
          status: "error",
          failure: "partial-failure",
          reason: `${written.reason} Existing saves are unchanged.`,
        };
      }
    }
    return { status: "imported", saveId };
  } catch (error) {
    const after = await snapshotPayloads(store);
    return {
      status: "error",
      failure: "partial-failure",
      reason:
        after === before
          ? error instanceof Error
            ? `${error.message} Existing saves are unchanged.`
            : "Import did not finish. Existing saves are unchanged."
          : "Import did not finish.",
    };
  }
}

async function snapshotPayloads(store: BrowserSaveStore): Promise<string> {
  const listing = await store.list();
  const rows = [];
  for (const save of listing.saves) {
    const record = await store.inspectRecord(save.saveId);
    rows.push(`${save.saveId}:${record?.payload ?? ""}`);
  }
  for (const damaged of listing.damaged) {
    rows.push(`damaged:${damaged.saveId ?? "?"}:${damaged.defect}`);
  }
  return rows.sort().join("|");
}

async function openGameDatabase(
  factory: IDBFactory | undefined,
  databaseName: string,
): Promise<IDBDatabase | null> {
  if (!factory) return null;
  try {
    return await openDatabase(factory, databaseName);
  } catch {
    return null;
  }
}

export async function readOptionalInterface(
  factory: IDBFactory | undefined,
  databaseName: string,
  saveId: EntityId,
): Promise<
  | PortableInterfacePayload
  | Extract<PortableSaveParseResult, { status: "error" }>
> {
  const database = await openGameDatabase(factory, databaseName);
  if (database === null) {
    return {
      status: "unavailable",
      reason: "Saved-game storage is not available in this browser.",
    };
  }
  try {
    if (!database.objectStoreNames.contains(INTERFACE_STORE_NAME)) {
      return {
        status: "unavailable",
        reason:
          "This build has no durable interface store. Pins and private notes were not stored with this life.",
      };
    }
    const raw = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(
        INTERFACE_STORE_NAME,
        "readonly",
      );
      const request = transaction.objectStore(INTERFACE_STORE_NAME).get(saveId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("interface unread"));
    });
    if (raw === undefined) {
      return { status: "included", state: emptyInterfaceState() };
    }
    const record = isRecord(raw) ? raw : null;
    const state = readPortableInterfaceState(record ?? raw);
    if (state === null) {
      return {
        status: "error",
        failure:
          record && !INTERFACE_RECORD_VERSIONS.has(record.version as number)
            ? "unsupported-version"
            : "malformed",
        reason:
          "The interface state for this life could not be read. No incomplete transfer was exported; existing saves are unchanged.",
      };
    }
    return { status: "included", state };
  } finally {
    database.close();
  }
}

async function writeOptionalInterface(
  factory: IDBFactory | undefined,
  databaseName: string,
  saveId: EntityId,
  state: PortableInterfaceState,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const database = await openGameDatabase(factory, databaseName);
  if (database === null) {
    return { ok: false, reason: "Saved-game storage is not available." };
  }
  try {
    if (!database.objectStoreNames.contains(INTERFACE_STORE_NAME)) {
      return {
        ok: false,
        reason:
          "This build cannot store pins and private notes. Existing saves are unchanged.",
      };
    }
    const writeFailed = "The interface state could not be stored.";
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        INTERFACE_STORE_NAME,
        "readwrite",
      );
      transaction
        .objectStore(INTERFACE_STORE_NAME)
        .put(encodeStoredShellState(saveId, state));
      const fail = () => reject(transaction.error ?? new Error(writeFailed));
      transaction.oncomplete = () => resolve();
      transaction.onerror = fail;
      transaction.onabort = fail;
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "The interface state could not be stored.",
    };
  } finally {
    database.close();
  }
}

export function downloadFileName(playerName: string): string {
  const slug = playerName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${slug || "saved-life"}.${PORTABLE_SAVE_EXTENSION}`;
}
