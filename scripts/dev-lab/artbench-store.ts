/**
 * ARTBENCH STORE — project-scoped data root, append-only event log, validated
 * intake, decision guards, legacy migration and the Drive-mirror exchange.
 *
 * The data root lives OUTSIDE any git worktree (default
 * ~/Documents/Political Game/output/artbench, override PG_ARTBENCH_DATA_ROOT),
 * so a branch switch or worktree removal cannot erase uploads or decisions.
 * Layout:
 *   store.json            storeId (origin of authored events)
 *   events/events.jsonl   one immutable event per line, fsynced on append
 *   bytes/<sha256>.<ext>  immutable originals
 *   inbox/                local batch drop (folder per batch, manifest.json last)
 *   outbox/<eventId>.json events not yet exported to the exchange
 *   sync/                 cursors, processed batches, last status
 *   cache/                rebuildable projections
 *
 * Drive: a Drive-for-desktop mirror path of 80_ARTBENCH_EXCHANGE (or
 * PG_ARTBENCH_DRIVE_ROOT). Nothing here holds tokens; the mirror is ordinary
 * filesystem the owner's Drive client keeps in sync.
 */

import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, resolve, sep } from "node:path";

import {
  ARTBENCH_CONTRACT_VERSION,
  INBOX_REQUEST_ID,
  assetIdForRequest,
  calibrationRecheckFor,
  producerBrief,
  projectArtbench,
  type ArtbenchActor,
  type ArtbenchEvent,
  type ArtbenchEventSource,
  type ArtbenchProjection,
  type ArtbenchMessagePayload,
  type BatchCompletedPayload,
  type CandidateIngestedPayload,
  type CandidateProvenance,
  type EditKind,
  type IntegrationReceivedPayload,
  type ProjectedCandidate,
  type QaDispositionPayload,
  type ReviewAuthority,
  type ReviewDecidedPayload,
  type TagSet,
} from "../../src/authoring/artbench";
import type { AssetRequest } from "../../src/authoring/asset-request";
import {
  requestDisplayCode,
  codedGenerationPrompt,
} from "../../src/authoring/art-desk-request-code";
import { requestArtworkCategory } from "../../src/authoring/art-desk-cards";
import type { AssetReviewDecision } from "../../src/authoring/asset-review";
import { artDeskNotifications } from "../../src/authoring/art-desk-notifications";
import { hashBytes } from "./art-desk-inputs";
import { decodeRaster, type DecodedRaster } from "./raster-decode";

export const ARTBENCH_DATA_ROOT_ENV = "PG_ARTBENCH_DATA_ROOT";
export const ARTBENCH_DRIVE_ROOT_ENV = "PG_ARTBENCH_DRIVE_ROOT";
/** The one identity whose approvals are production-eligible on this bench. */
export const ARTBENCH_OWNER_ID_ENV = "PG_ARTBENCH_OWNER_ID";
export const DEFAULT_OWNER_ID = "lamontae";
export const EXCHANGE_FOLDER = "80_ARTBENCH_EXCHANGE";
export const EXCHANGE_INBOX = "01_INBOX";
export const EXCHANGE_CATALOG = "02_CATALOG";
export const EXCHANGE_EVENTS = "03_REVIEW_AND_INTEGRATION_EVENTS";
const DEFAULT_MIRROR =
  "Library/CloudStorage/GoogleDrive-lamontaebilling@gmail.com/My Drive/00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE";

const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const IMAGE_EXT = /\.(png|jpe?g)$/i;

/** Desktop hub alias: it hands a 0700 record root outside every worktree. */
export const HUB_RECORD_ROOT_ENV = "PG_ART_DESK_RECORD_ROOT";

export function defaultDataRoot(): string {
  return (
    process.env[ARTBENCH_DATA_ROOT_ENV] ||
    process.env[HUB_RECORD_ROOT_ENV] ||
    join(homedir(), "Documents", "Political Game", "output", "artbench")
  );
}

export function defaultDriveRoot(): string | null {
  const configured = process.env[ARTBENCH_DRIVE_ROOT_ENV];
  if (configured) return configured;
  const mirror = join(homedir(), DEFAULT_MIRROR, EXCHANGE_FOLDER);
  return existsSync(mirror) ? mirror : null;
}

export class ArtbenchError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function writeAtomic(absolute: string, body: Buffer | string): void {
  mkdirSync(dirname(absolute), { recursive: true });
  const temp = `${absolute}.${process.pid}.${randomUUID().slice(0, 8)}.tmp`;
  const fd = openSync(temp, "w");
  try {
    if (typeof body === "string") writeSync(fd, body);
    else writeSync(fd, body);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temp, absolute);
}

function readJson<T>(absolute: string): T | null {
  if (!existsSync(absolute)) return null;
  try {
    return JSON.parse(readFileSync(absolute, "utf8")) as T;
  } catch {
    return null;
  }
}

function isInside(root: string, absolute: string): boolean {
  const base = resolve(root);
  const target = resolve(absolute);
  return target === base || target.startsWith(base + sep);
}

/** Refuse symlinks anywhere under the root on the way to a file. */
function realFileInside(root: string, relative: string): string | null {
  if (relative.includes("..") || relative.includes("\0")) return null;
  const absolute = resolve(root, relative);
  if (!isInside(root, absolute)) return null;
  let cursor = resolve(root);
  for (const part of relative.split(/[\\/]/).filter(Boolean)) {
    cursor = join(cursor, part);
    if (!existsSync(cursor)) return absolute;
    if (lstatSync(cursor).isSymbolicLink()) return null;
  }
  return absolute;
}

/**
 * Errors that say "not now" rather than "not ever". A Drive-backed inbox is a
 * network filesystem, so a read can time out or be refused while the file is
 * still being written; recording that as a permanent rejection is the same
 * mistake absence used to be. Anything not on this list is treated as final,
 * because a retry forever is only right when the condition can actually clear.
 */
const TRANSIENT_READ_ERROR =
  /\b(ETIMEDOUT|ECONNRESET|ECONNABORTED|EAGAIN|EBUSY|ENOENT|EMFILE|ENFILE|EHOSTUNREACH|ENETUNREACH|ENOTCONN)\b/;

function isTransientReadError(reason: string): boolean {
  return TRANSIENT_READ_ERROR.test(reason);
}

export interface IntakeMeta {
  readonly requestId?: string;
  readonly requestVersion?: number;
  readonly assetId?: string;
  readonly parentCandidateId?: string;
  readonly editKind?: EditKind;
  readonly note?: string;
  readonly tags?: TagSet;
  readonly nativeDetail?: "native" | "derived" | "unverified";
  readonly provenance?: CandidateProvenance;
  readonly originalName?: string;
}

export interface IntakeResult {
  readonly candidate: ProjectedCandidate;
  readonly duplicate: boolean;
  readonly event?: ArtbenchEvent;
}

export interface DecisionInput {
  readonly candidateId: string;
  readonly viewedCandidateId: string;
  readonly viewedSha256: string;
  readonly decision: AssetReviewDecision;
  readonly note?: string;
  readonly attachments?: readonly string[];
  readonly actor: ArtbenchActor;
  readonly fitContractHash: string;
  readonly sceneContractHash: string;
  readonly contractVersion: string;
  readonly rightsStatus?: "known" | "unknown";
  readonly sourceDeclaration?: string;
  readonly supersedesReviewId?: string;
  /** Proven by the host token or the same-origin session capability; null = none. */
  readonly authority: ReviewAuthority | null;
}

export interface SyncStatus {
  readonly status: "ok" | "needs-mirror" | "error" | "never";
  readonly driveRoot: string | null;
  readonly driveRootPresent: boolean;
  readonly lastAttemptAt: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastError: string | null;
  readonly pendingOutbox: number;
  readonly pendingBatches: readonly string[];
  readonly processedBatches: number;
  readonly exportedEvents: number;
  readonly importedEvents: number;
  readonly lastCatalogAt: string | null;
}

interface SyncState {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastCatalogAt: string | null;
  exportedEvents: number;
  importedEvents: number;
  /** batchId → itemId → candidateId (or "rejected:<reason>") */
  batches: Record<string, Record<string, string>>;
}

export interface BytesState {
  readonly state: "verified" | "missing" | "hash-mismatch" | "not-a-raster";
  readonly note: string;
  readonly raster?: DecodedRaster;
  readonly mtimeMs?: number;
  readonly size?: number;
}

export interface StoreOptions {
  readonly dataRoot: string;
  /** The git workspace holding the registry and legacy sidecars. */
  readonly workspace: string;
  readonly driveRoot?: string | null;
  readonly now?: () => string;
  readonly newId?: () => string;
  /** Production-eligible owner identity; defaults to PG_ARTBENCH_OWNER_ID or lamontae. */
  readonly ownerId?: string;
}

const BYTES_LEDGER_SCHEMA = "artbench-bytes-verified-v1";

interface BytesLedgerEntry {
  readonly path: string;
  readonly stamp: string;
  readonly result: BytesState;
}

function verifiedNote(raster: DecodedRaster): string {
  return `Present, hash-verified and fully decoded: ${raster.width}×${raster.height} ${raster.container}${raster.hasAlpha ? " with alpha" : ""}.`;
}

/** Size, times and inode: any rewrite or replacement changes it. */
function fileStamp(absolute: string): string {
  const stat = statSync(absolute, { bigint: true });
  return `${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}:${stat.ino}`;
}

export class ArtbenchStore {
  readonly dataRoot: string;
  readonly workspace: string;
  readonly storeId: string;
  driveRoot: string | null;
  readonly ownerId: string;
  /** Per-launch capability the same-origin bench UI presents on decisions. */
  readonly ownerCapability: string;
  private readonly now: () => string;
  private readonly newId: () => string;
  private events: ArtbenchEvent[] = [];
  private eventLogStamp = "";
  private readonly known = new Set<string>();
  private readonly bytesCache = new Map<string, BytesState>();
  /**
   * Verification results that survive a restart (cache/bytes-verified.json),
   * keyed by hash and bound to the exact file (path, size, times, inode).
   * Hashing and fully decoding every original took ~80 s on each launch,
   * during which the single-threaded server answered nothing.
   */
  private bytesLedger: Record<string, BytesLedgerEntry> = {};
  private ledgerTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly verifyQueue = new Map<string, ProjectedCandidate>();
  private verifying = false;
  /** A sync postponed its catalog until the queued checks finish. */
  private catalogWaiting = false;
  private syncState: SyncState;
  private settling = new Map<string, number>();

  constructor(options: StoreOptions) {
    this.dataRoot = resolve(options.dataRoot);
    this.workspace = resolve(options.workspace);
    this.driveRoot = options.driveRoot ?? null;
    this.ownerId =
      options.ownerId ?? process.env[ARTBENCH_OWNER_ID_ENV] ?? DEFAULT_OWNER_ID;
    this.ownerCapability = randomUUID();
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? (() => randomUUID());
    for (const dir of ["events", "bytes", "inbox", "outbox", "sync", "cache"]) {
      mkdirSync(join(this.dataRoot, dir), { recursive: true });
    }
    const ledger = readJson<{
      schema?: string;
      bytes?: Record<string, BytesLedgerEntry>;
    }>(this.ledgerFile);
    if (ledger?.schema === BYTES_LEDGER_SCHEMA && ledger.bytes)
      this.bytesLedger = ledger.bytes;
    const storeFile = join(this.dataRoot, "store.json");
    const existing = readJson<{ storeId?: string }>(storeFile);
    if (existing?.storeId) {
      this.storeId = existing.storeId;
    } else {
      this.storeId = `store-${this.newId()}`;
      writeAtomic(
        storeFile,
        JSON.stringify(
          { storeId: this.storeId, createdAt: this.now() },
          null,
          2,
        ),
      );
    }
    this.syncState = readJson<SyncState>(
      join(this.dataRoot, "sync", "state.json"),
    ) ?? {
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastError: null,
      lastCatalogAt: null,
      exportedEvents: 0,
      importedEvents: 0,
      batches: {},
    };
    this.loadEvents();
    this.migrateLegacy();
    this.ensureRequestCodes();
  }

  /* ---------------------------------------------------------------- */
  /* Event log                                                         */
  /* ---------------------------------------------------------------- */

  private get logPath(): string {
    return join(this.dataRoot, "events", "events.jsonl");
  }

  private loadEvents(): void {
    if (!existsSync(this.logPath)) return;
    const stat = statSync(this.logPath, { bigint: true });
    const stamp = `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
    if (stamp === this.eventLogStamp) return;
    const lines = readFileSync(this.logPath, "utf8")
      .split("\n")
      .filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as ArtbenchEvent;
        if (event.eventId && !this.known.has(event.eventId)) {
          this.events.push(event);
          this.known.add(event.eventId);
        }
      } catch {
        // A torn final line from a crash is ignored; everything before it stands.
      }
    }
    this.eventLogStamp = stamp;
  }

  allEvents(sinceSeq = 0): readonly ArtbenchEvent[] {
    this.loadEvents();
    return this.events.filter((event) => event.seq > sinceSeq);
  }

  private nextSeq(): number {
    return (
      this.events.reduce((maximum, event) => Math.max(maximum, event.seq), 0) +
      1
    );
  }

  private persist(event: ArtbenchEvent, toOutbox: boolean): void {
    const fd = openSync(this.logPath, "a");
    try {
      writeSync(fd, `${JSON.stringify(event)}\n`);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    this.events.push(event);
    this.known.add(event.eventId);
    if (toOutbox) {
      writeAtomic(
        join(this.dataRoot, "outbox", `${event.eventId}.json`),
        JSON.stringify(event, null, 2),
      );
    }
  }

  private append<T extends ArtbenchEvent["type"]>(
    type: T,
    payload: Extract<ArtbenchEvent, { type: T }>["payload"],
    actor: ArtbenchActor,
    source: ArtbenchEventSource,
    eventId = this.newId(),
  ): Extract<ArtbenchEvent, { type: T }> {
    this.loadEvents();
    if (this.known.has(eventId)) {
      throw new ArtbenchError(
        409,
        "duplicate-event",
        `Event ${eventId} already exists.`,
      );
    }
    const event = {
      contractVersion: ARTBENCH_CONTRACT_VERSION,
      eventId,
      seq: this.nextSeq(),
      at: this.now(),
      actor,
      source,
      origin: this.storeId,
      type,
      payload,
    } as Extract<ArtbenchEvent, { type: T }>;
    this.persist(event, source !== "legacy");
    return event;
  }

  /** Admit an event authored elsewhere (Drive exchange). Never re-imports our own. */
  admitForeign(event: ArtbenchEvent): boolean {
    if (!event.eventId || this.known.has(event.eventId)) return false;
    if (event.origin === this.storeId) return false;
    if (event.contractVersion !== ARTBENCH_CONTRACT_VERSION) return false;
    if (event.type === "review.decided") {
      // A review JSON in the exchange is evidence of someone else's decision.
      // It never becomes a live decision here: the live rule requires proven
      // owner capability at this bench's boundary.
      const quarantineId = `imported:${event.eventId}`;
      if (this.known.has(quarantineId)) return false;
      this.known.add(event.eventId);
      this.persist(
        {
          contractVersion: ARTBENCH_CONTRACT_VERSION,
          eventId: quarantineId,
          seq: this.nextSeq(),
          at: this.now(),
          actor: { kind: "system", id: "artbench-exchange" },
          source: "drive",
          origin: this.storeId,
          type: "review.imported",
          payload: {
            imported: event.payload,
            fromOrigin: event.origin,
            reason:
              "Imported review from the exchange is evidence only; decisions are made at this bench with proven owner capability.",
          },
        },
        false,
      );
      return true;
    }
    if (
      event.type === "integration.queued" ||
      event.type === "qa.disposition"
    ) {
      // Another bench's queue and its administrative corrections stay its own;
      // only this bench's proven approvals enqueue cargo here.
      this.known.add(event.eventId);
      return false;
    }
    const admitted: ArtbenchEvent = {
      ...event,
      seq: this.nextSeq(),
      source: "drive",
    } as ArtbenchEvent;
    this.persist(admitted, false);
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Registry and projection                                           */
  /* ---------------------------------------------------------------- */

  /** Registry requests with the reconciliation holds applied, as the Art Desk always did. */
  registryRequests(): readonly AssetRequest[] {
    const document = readJson<{ requests?: AssetRequest[] }>(
      join(this.workspace, "art/requests/asset-requests.json"),
    );
    const reconciliation = readJson<{
      holds?: Record<string, AssetRequest["generationHold"]>;
      coveredRequestIds?: string[];
    }>(join(this.workspace, "art/requests/art-desk-reconciliation.json"));
    const covered = new Set(reconciliation?.coveredRequestIds ?? []);
    return (document?.requests ?? []).map((request) => {
      const terminal =
        request.status === "rejected" ||
        request.status === "withdrawn-already-covered" ||
        request.status === "accepted-promoted";
      const hold =
        request.generationHold ??
        (covered.has(request.requestId) && !terminal
          ? "already-covered-candidate"
          : reconciliation?.holds?.[request.requestId]);
      return hold ? { ...request, generationHold: hold } : request;
    });
  }

  qaRequests(): readonly AssetRequest[] {
    const document = readJson<{ requests?: AssetRequest[] }>(
      join(
        this.workspace,
        "art/generated/candidates/art-desk/qa-requests.json",
      ),
    );
    return document?.requests ?? [];
  }

  projection(): ArtbenchProjection {
    this.loadEvents();
    return projectArtbench({
      registryRequests: this.registryRequests(),
      qaRequests: this.qaRequests(),
      events: this.events,
      generatorAvailable: false,
    });
  }

  /** One allocator in the existing store. Reopening never re-numbers a brief. */
  ensureRequestCodes(): void {
    let projection = this.projection();
    let next = Math.max(
      0,
      ...Object.values(projection.assets).flatMap((asset) =>
        (asset.tags.requestCode ?? []).map((value) =>
          Number(value.match(/:A(\d+)$/)?.[1] ?? 0),
        ),
      ),
    );
    const requests = Object.values(projection.requests).filter(
      (row) =>
        !row.qa &&
        row.request.requestId !== INBOX_REQUEST_ID &&
        requestArtworkCategory(row.request) !== "clothing" &&
        Boolean(row.request.generatorParameters?.fireflyPrompt),
    );
    for (const row of requests) {
      if (requestDisplayCode(projection, row.request.requestId)) continue;
      const asset = projection.assets[row.assetId]!;
      const author = { kind: "system" as const, id: "art-desk-request-codes" };
      this.append(
        "tags.set",
        {
          entity: "asset",
          entityId: row.assetId,
          tags: {
            ...asset.tags,
            requestCode: [
              ...(asset.tags.requestCode ?? []),
              `${row.request.requestId}:A${String(++next).padStart(2, "0")}`,
            ],
          },
          baseVersion: asset.tagsVersion,
          author,
        },
        author,
        "bench",
      );
      projection = this.projection();
    }
  }

  /** Persistent local UI preferences, outside disposable cache and art history. */
  notificationReadEventIds(): string[] {
    const saved = readJson<{ readEventIds?: unknown }>(
      join(this.dataRoot, "preferences", "notifications.json"),
    );
    return Array.isArray(saved?.readEventIds)
      ? saved.readEventIds.filter((id): id is string => typeof id === "string")
      : [];
  }

  markNotificationsRead(
    eventIds: unknown,
    authority: ReviewAuthority | null,
  ): string[] {
    if (!authority)
      throw new ArtbenchError(
        403,
        "not-the-bench",
        "Open notifications in the Art Desk to mark them read.",
      );
    if (
      !Array.isArray(eventIds) ||
      eventIds.length > 10000 ||
      eventIds.some((id) => typeof id !== "string" || id.length > 256)
    )
      throw new ArtbenchError(
        400,
        "invalid-notifications",
        "Choose the replies you want to mark read.",
      );
    const allowed = new Set(
      artDeskNotifications(this.projection()).map((item) => item.eventId),
    );
    if (eventIds.some((id) => !allowed.has(id)))
      throw new ArtbenchError(
        400,
        "unknown-notification",
        "One of these replies is no longer available. Refresh and try again.",
      );
    // Read immediately before a synchronous atomic merge: another tab's earlier
    // acknowledgment cannot be lost, and future event IDs cannot be pre-read.
    const merged = [
      ...new Set([...this.notificationReadEventIds(), ...eventIds]),
    ];
    const directory = join(this.dataRoot, "preferences");
    mkdirSync(directory, { recursive: true });
    writeAtomic(
      join(directory, "notifications.json"),
      JSON.stringify({ readEventIds: merged }, null, 2),
    );
    return merged;
  }

  /* ---------------------------------------------------------------- */
  /* Bytes                                                             */
  /* ---------------------------------------------------------------- */

  resolveStorage(
    candidate: Pick<ProjectedCandidate, "storagePath">,
  ): string | null {
    if (candidate.storagePath.startsWith("bytes/")) {
      return realFileInside(this.dataRoot, candidate.storagePath);
    }
    // Legacy candidates keep their workspace-relative private path.
    return realFileInside(this.workspace, candidate.storagePath);
  }

  /**
   * What is already known about a candidate's bytes, without reading them:
   * missing, or a verification of this exact file. null means "not checked
   * yet" (bytesState or queueBytesVerification will check it).
   */
  knownBytesState(candidate: ProjectedCandidate): BytesState | null {
    const absolute = this.resolveStorage(candidate);
    if (!absolute || !existsSync(absolute) || !statSync(absolute).isFile()) {
      return {
        state: "missing",
        note: "Original bytes are not in the data root or this checkout.",
      };
    }
    const stat = statSync(absolute);
    const cached = this.bytesCache.get(candidate.sha256);
    if (
      cached &&
      cached.mtimeMs === stat.mtimeMs &&
      cached.size === stat.size
    ) {
      return cached;
    }
    const stamp = fileStamp(absolute);
    const recorded = this.bytesLedger[candidate.sha256];
    if (recorded && recorded.path === absolute && recorded.stamp === stamp) {
      const entry = {
        ...recorded.result,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      };
      this.bytesCache.set(candidate.sha256, entry);
      return entry;
    }
    return null;
  }

  bytesState(candidate: ProjectedCandidate): BytesState {
    const known = this.knownBytesState(candidate);
    if (known) return known;
    const absolute = this.resolveStorage(candidate)!;
    // Stamped before reading: a file changed mid-read is re-checked later.
    const stamp = fileStamp(absolute);
    const bytes = readFileSync(absolute);
    const actual = hashBytes(bytes);
    let result: BytesState;
    if (actual !== candidate.sha256) {
      result = {
        state: "hash-mismatch",
        note: `Bytes on disk hash to ${actual.slice(0, 12)}…, not the recorded ${candidate.sha256.slice(0, 12)}….`,
      };
    } else {
      const decoded = decodeRaster(bytes);
      result = decoded.ok
        ? {
            state: "verified",
            note: verifiedNote(decoded.raster),
            raster: decoded.raster,
          }
        : {
            state: "not-a-raster",
            note: `${decoded.code}: ${decoded.message}`,
          };
    }
    return this.recordBytes(candidate.sha256, absolute, result, stamp);
  }

  private recordBytes(
    sha256: string,
    absolute: string,
    result: BytesState,
    stamp = fileStamp(absolute),
  ): BytesState {
    const stat = statSync(absolute);
    const entry = { ...result, mtimeMs: stat.mtimeMs, size: stat.size };
    this.bytesCache.set(sha256, entry);
    this.bytesLedger[sha256] = {
      path: absolute,
      stamp,
      result,
    };
    this.saveLedgerSoon();
    return entry;
  }

  /** Candidates still waiting for a background check. */
  get bytesPending(): number {
    return this.verifyQueue.size;
  }

  /**
   * Check these candidates' bytes in the background, in the given order, one
   * per event-loop turn, so requests keep being answered meanwhile. A new
   * call re-prioritises: its candidates go first (or last, with first: false).
   */
  queueBytesVerification(
    candidates: readonly ProjectedCandidate[],
    { first = true }: { readonly first?: boolean } = {},
  ): void {
    const rest = [...this.verifyQueue.values()];
    this.verifyQueue.clear();
    for (const candidate of first
      ? [...candidates, ...rest]
      : [...rest, ...candidates])
      if (
        !this.verifyQueue.has(candidate.sha256) &&
        !this.knownBytesState(candidate)
      )
        this.verifyQueue.set(candidate.sha256, candidate);
    if (this.verifying || this.verifyQueue.size === 0) return;
    this.verifying = true;
    const step = () => {
      const next = this.verifyQueue.values().next();
      if (next.done) {
        this.verifying = false;
        // Finish the sync that was waiting (start-up or Sync now), once.
        if (this.catalogWaiting) {
          this.catalogWaiting = false;
          try {
            this.syncOnce();
          } catch {
            /* reported in sync status by the next Sync now */
          }
        }
        return;
      }
      this.verifyQueue.delete(next.value.sha256);
      try {
        this.bytesState(next.value);
      } catch {
        /* reported when that candidate is next asked for */
      }
      setImmediate(step);
    };
    setImmediate(step);
  }

  private get ledgerFile(): string {
    return join(this.dataRoot, "cache", "bytes-verified.json");
  }

  private saveLedgerSoon(): void {
    if (this.ledgerTimer) return;
    this.ledgerTimer = setTimeout(() => {
      this.ledgerTimer = null;
      this.saveLedger();
    }, 1000);
    this.ledgerTimer.unref?.();
  }

  /** Write the verification ledger now (also used by tests). */
  saveLedger(): void {
    if (this.ledgerTimer) {
      clearTimeout(this.ledgerTimer);
      this.ledgerTimer = null;
    }
    try {
      writeAtomic(
        this.ledgerFile,
        JSON.stringify({
          schema: BYTES_LEDGER_SCHEMA,
          bytes: this.bytesLedger,
        }),
      );
    } catch {
      /* a rebuildable cache: the next launch re-verifies instead */
    }
  }

  original(candidateId: string): {
    readonly bytes: Buffer;
    readonly candidate: ProjectedCandidate;
  } {
    const { file, candidate } = this.originalFile(candidateId);
    // The saved name is the caller's business: the Art Desk builds a readable
    // one from the asset's name plus this hash (originalDownloadName).
    return { bytes: readFileSync(file), candidate };
  }

  /** Where a verified original lives, without reading its bytes. */
  originalFile(candidateId: string): {
    readonly file: string;
    readonly candidate: ProjectedCandidate;
  } {
    const candidate = this.projection().candidates[candidateId];
    if (!candidate)
      throw new ArtbenchError(
        404,
        "unknown-candidate",
        `No candidate ${candidateId}.`,
      );
    const state = this.bytesState(candidate);
    if (state.state !== "verified") {
      throw new ArtbenchError(409, "bytes-unavailable", state.note);
    }
    return { file: this.resolveStorage(candidate)!, candidate };
  }

  /* ---------------------------------------------------------------- */
  /* Intake                                                            */
  /* ---------------------------------------------------------------- */

  ingest(
    bytes: Buffer,
    meta: IntakeMeta,
    actor: ArtbenchActor,
    source: ArtbenchEventSource = "bench",
  ): IntakeResult {
    const decoded = decodeRaster(bytes);
    if (!decoded.ok) {
      throw new ArtbenchError(
        422,
        "invalid-raster",
        `${decoded.code}: ${decoded.message}`,
      );
    }
    const sha256 = hashBytes(bytes);
    const projection = this.projection();
    const requestId =
      meta.requestId && meta.requestId !== ""
        ? meta.requestId
        : INBOX_REQUEST_ID;
    if (!SAFE_ID.test(requestId)) {
      throw new ArtbenchError(
        400,
        "invalid-request-id",
        "requestId contains unsafe characters.",
      );
    }
    const request =
      requestId === INBOX_REQUEST_ID ? null : projection.requests[requestId];
    if (requestId !== INBOX_REQUEST_ID && !request) {
      throw new ArtbenchError(
        404,
        "unknown-request",
        `No request ${requestId}; upload to the inbox instead.`,
      );
    }
    const parent = meta.parentCandidateId
      ? projection.candidates[meta.parentCandidateId]
      : undefined;
    if (meta.parentCandidateId && !parent) {
      throw new ArtbenchError(
        404,
        "unknown-parent",
        `No parent candidate ${meta.parentCandidateId}.`,
      );
    }
    const editKindForId: EditKind =
      meta.editKind ?? (parent ? "other" : "original");
    const requestVersion =
      request?.request.requestVersion ?? meta.requestVersion ?? 1;
    const batchId = meta.provenance?.batchId;
    const itemId = meta.provenance?.itemId;
    const logicalId =
      batchId && itemId
        ? logicalCandidateId({
            requestId,
            requestVersion,
            batchId,
            itemId,
            sha256,
            parentCandidateId: parent?.candidateId,
            editKind: editKindForId,
          })
        : null;
    const duplicate = logicalId
      ? (projection.candidates[logicalId] ??
        Object.values(projection.candidates).find(
          (candidate) =>
            candidate.requestId === requestId &&
            candidate.requestVersion === requestVersion &&
            candidate.sha256 === sha256 &&
            candidate.provenance.batchId === batchId &&
            candidate.provenance.itemId === itemId &&
            candidate.editKind === editKindForId &&
            (candidate.parentCandidateId ?? null) ===
              (parent?.candidateId ?? null),
        ))
      : Object.values(projection.candidates).find(
          (candidate) =>
            candidate.sha256 === sha256 &&
            candidate.requestId === requestId &&
            (candidate.parentCandidateId ?? null) ===
              (parent?.candidateId ?? null),
        );
    if (duplicate) {
      const canonical = duplicate.aliasOf
        ? (projection.candidates[duplicate.aliasOf] ?? duplicate)
        : duplicate;
      return { candidate: canonical, duplicate: true };
    }
    const container = decoded.raster.container;
    const storagePath = `bytes/${sha256}.${container}`;
    const absolute = join(this.dataRoot, storagePath);
    if (!existsSync(absolute)) {
      writeAtomic(absolute, bytes);
      // These exact bytes were just hashed and fully decoded: record it, so
      // they are never re-verified on a later launch or catalog pass.
      this.recordBytes(sha256, absolute, {
        state: "verified",
        note: verifiedNote(decoded.raster),
        raster: decoded.raster,
      });
    }
    const editKind: EditKind = meta.editKind ?? (parent ? "other" : "original");
    const assetId =
      parent?.assetId ??
      meta.assetId ??
      (request ? request.assetId : "asset:inbox");
    const payload: CandidateIngestedPayload = {
      candidateId: logicalId ?? `cand-${this.newId()}`,
      assetId,
      requestId,
      requestVersion,
      sha256,
      byteLength: bytes.length,
      container,
      width: decoded.raster.width,
      height: decoded.raster.height,
      hasAlpha: decoded.raster.hasAlpha,
      storagePath,
      parentCandidateId: parent?.candidateId,
      editKind,
      note: meta.note,
      provenance: {
        ...(meta.provenance ?? {}),
        originalName: meta.originalName ?? meta.provenance?.originalName,
      },
      nativeDetail:
        parent && editKind !== "original"
          ? "derived"
          : (meta.nativeDetail ?? parent?.nativeDetail ?? "unverified"),
      calibrationRecheck: parent
        ? calibrationRecheckFor(editKind, parent, decoded.raster)
        : [],
      inheritedTags: parent ? parent.tags : meta.tags,
    };
    const event = this.append("candidate.ingested", payload, actor, source);
    // Keep the inherited-at-intake record intact. Prepared children can have
    // their own roles (paint, material map, reference); explicit intake facets
    // override only those parent facets and remain attributed in history.
    if (parent && meta.tags) {
      this.setTags({
        entity: "candidate",
        entityId: payload.candidateId,
        tags: { ...parent.tags, ...meta.tags },
        baseVersion: 0,
        author: actor,
      });
    }
    const candidate = this.projection().candidates[payload.candidateId]!;
    return { candidate, duplicate: false, event };
  }

  /* ---------------------------------------------------------------- */
  /* Decisions, tags, requests, selection, integration                 */
  /* ---------------------------------------------------------------- */

  decide(input: DecisionInput): readonly ArtbenchEvent[] {
    const projection = this.projection();
    const candidate = projection.candidates[input.candidateId];
    if (!candidate)
      throw new ArtbenchError(
        404,
        "unknown-candidate",
        `No candidate ${input.candidateId}.`,
      );
    if (
      input.viewedCandidateId !== input.candidateId ||
      input.viewedSha256 !== candidate.sha256
    ) {
      throw new ArtbenchError(
        409,
        "viewed-candidate-changed",
        "The candidate you were viewing is not the one being decided. Review the current candidate before deciding.",
      );
    }
    const request = projection.requests[candidate.requestId];
    if (!request) {
      throw new ArtbenchError(
        409,
        "unassigned-candidate",
        "Assign the candidate to a request before deciding.",
      );
    }
    if (request.request.requestVersion !== candidate.requestVersion) {
      throw new ArtbenchError(
        409,
        "stale-request-version",
        `Candidate was ingested for request version ${candidate.requestVersion}; the request is now version ${request.request.requestVersion}.`,
      );
    }
    const state = this.bytesState(candidate);
    if (state.state !== "verified") {
      throw new ArtbenchError(
        422,
        "candidate-unverified",
        `Candidate bytes are ${state.state}: ${state.note}`,
      );
    }
    if (input.actor.kind !== "owner") {
      throw new ArtbenchError(
        403,
        "not-an-owner",
        "Only the owner decides; an agent's or worker's statement is not approval.",
      );
    }
    if (!input.authority) {
      throw new ArtbenchError(
        403,
        "owner-capability-required",
        "Declaring an owner actor is not proof. Decisions need the host token or the same-origin bench session capability.",
      );
    }
    const qa = request.qa;
    if (!qa && input.actor.id !== this.ownerId) {
      throw new ArtbenchError(
        403,
        "not-the-owner",
        `Only ${this.ownerId} may decide production requests; '${input.actor.id}' may decide QA requests only.`,
      );
    }
    if (
      input.supersedesReviewId &&
      !candidate.decisions.some(
        (d) => d.payload.reviewId === input.supersedesReviewId,
      )
    ) {
      throw new ArtbenchError(
        404,
        "unknown-review",
        "The decision being superseded does not exist on this candidate.",
      );
    }
    const reviewId = `rev-${this.newId()}`;
    const payload: ReviewDecidedPayload = {
      reviewId,
      requestId: candidate.requestId,
      requestVersion: candidate.requestVersion,
      candidateId: candidate.candidateId,
      viewedCandidateId: input.viewedCandidateId,
      outputSha256: candidate.sha256,
      decision: input.decision,
      contractVersion: input.contractVersion,
      fitContractHash: input.fitContractHash,
      sceneContractHash: input.sceneContractHash,
      rightsStatus: input.rightsStatus ?? "unknown",
      sourceDeclaration:
        input.sourceDeclaration ??
        "owner decision on the private bench; rights not inferred from a web reference",
      note: input.note,
      attachments: input.attachments,
      supersedesReviewId: input.supersedesReviewId,
      qa,
      authority: input.authority,
    };
    const events: ArtbenchEvent[] = [
      this.append("review.decided", payload, input.actor, "bench"),
    ];
    // QA approvals are recorded but never become integration cargo.
    if (input.decision === "approve" && !qa) {
      const queued = this.projection().integrationQueue.some(
        (item) =>
          item.candidateId === candidate.candidateId &&
          item.state === "pending",
      );
      if (!queued) {
        const missing: string[] = [];
        if (candidate.width < request.request.target.minimumWidth) {
          missing.push(
            `width ${candidate.width} is below the request's ${request.request.target.minimumWidth}px floor`,
          );
        }
        if (request.request.target.alphaRequired && !candidate.hasAlpha)
          missing.push("alpha required but not present");
        if (candidate.nativeDetail !== "native")
          missing.push(`native detail ${candidate.nativeDetail}`);
        if (candidate.calibrationRecheck.length > 0)
          missing.push(`recheck: ${candidate.calibrationRecheck.join(", ")}`);
        events.push(
          this.append(
            "integration.queued",
            {
              itemId: `int-${this.newId()}`,
              candidateId: candidate.candidateId,
              assetId: candidate.assetId,
              requestId: candidate.requestId,
              sha256: candidate.sha256,
              consumerId: request.request.consumer.consumerId,
              runtimeComponent: request.request.consumer.runtimeComponent,
              target: request.request.target,
              tagsState: Object.values(candidate.tags).some((v) => v.length > 0)
                ? "tagged"
                : "untagged",
              missingFacts: missing,
              approvalReviewId: reviewId,
            },
            { kind: "system", id: "artbench" },
            "bench",
          ),
        );
      }
    }
    return events;
  }

  setTags(input: {
    readonly entity: "candidate" | "asset";
    readonly entityId: string;
    readonly tags: TagSet;
    readonly baseVersion: number;
    readonly author: ArtbenchActor;
    readonly suggestion?: boolean;
  }): ArtbenchEvent {
    const projection = this.projection();
    const target =
      input.entity === "candidate"
        ? projection.candidates[input.entityId]
        : projection.assets[input.entityId];
    if (!target)
      throw new ArtbenchError(
        404,
        "unknown-entity",
        `No ${input.entity} ${input.entityId}.`,
      );
    if (target.tagsVersion !== input.baseVersion) {
      throw new ArtbenchError(
        409,
        "tag-conflict",
        `Tags changed since you loaded them (version ${target.tagsVersion}, you saw ${input.baseVersion}). Reload and merge; nothing was overwritten.`,
      );
    }
    for (const [facet, values] of Object.entries(input.tags)) {
      if (!SAFE_ID.test(facet))
        throw new ArtbenchError(
          400,
          "invalid-tag",
          `Facet '${facet}' is not a valid key.`,
        );
      if (
        !Array.isArray(values) ||
        values.some((v) => typeof v !== "string" || v.length > 120)
      ) {
        throw new ArtbenchError(
          400,
          "invalid-tag",
          `Facet '${facet}' must hold short strings.`,
        );
      }
    }
    return this.append(
      "tags.set",
      {
        entity: input.entity,
        entityId: input.entityId,
        tags:
          input.entity === "asset" && target.tags.requestCode
            ? { ...input.tags, requestCode: target.tags.requestCode }
            : input.tags,
        baseVersion: input.baseVersion,
        author: input.author,
        suggestion: input.suggestion,
      },
      input.author,
      "bench",
    );
  }

  postMessage(
    payload: ArtbenchMessagePayload,
    actor: ArtbenchActor,
    authority: ReviewAuthority | null = null,
  ): ArtbenchEvent {
    if (actor.kind === "owner" && (!authority || actor.id !== this.ownerId))
      throw new ArtbenchError(
        403,
        "owner-capability-required",
        "Please send your message from the Art Desk.",
      );
    const projection = this.projection();
    const draft: ArtbenchEvent = {
      contractVersion: ARTBENCH_CONTRACT_VERSION,
      eventId: this.newId(),
      seq: this.nextSeq(),
      at: this.now(),
      actor,
      source: "bench",
      origin: this.storeId,
      type: "message.posted",
      payload: { ...payload, text: payload.text.trim() },
    };
    const checked = projectArtbench({
      registryRequests: Object.values(projection.requests).map(
        (row) => row.request,
      ),
      events: [
        ...this.events.filter((event) => event.type !== "request.created"),
        draft,
      ],
    });
    if (!checked.messages?.some((message) => message.eventId === draft.eventId))
      throw new ArtbenchError(
        422,
        "invalid-message",
        "Choose an existing item and enter a message. Replies must name a question on that item.",
      );
    return this.append(
      "message.posted",
      draft.payload,
      actor,
      "bench",
      draft.eventId,
    );
  }

  createRequest(input: {
    readonly request: AssetRequest;
    readonly actor: ArtbenchActor;
    readonly parentRequestId?: string;
    readonly parentCandidateId?: string;
    readonly origin: "owner" | "worker" | "expansion";
    readonly manifestId?: string;
    readonly qa?: boolean;
  }): ArtbenchEvent {
    const { request } = input;
    if (!SAFE_ID.test(request.requestId)) {
      throw new ArtbenchError(
        400,
        "invalid-request",
        "requestId must be a stable slug.",
      );
    }
    if (
      !request.title?.trim() ||
      !request.consumer?.consumerId ||
      !request.target?.targetClass
    ) {
      throw new ArtbenchError(
        400,
        "invalid-request",
        "A request needs a title, a consumer and a target.",
      );
    }
    const projection = this.projection();
    if (projection.requests[request.requestId]) {
      throw new ArtbenchError(
        409,
        "duplicate-request",
        `Request ${request.requestId} already exists.`,
      );
    }
    if (
      input.parentCandidateId &&
      !projection.candidates[input.parentCandidateId]
    ) {
      throw new ArtbenchError(
        404,
        "unknown-parent",
        "Parent candidate does not exist.",
      );
    }
    const created = this.append(
      "request.created",
      {
        request,
        assetId: input.parentCandidateId
          ? projection.candidates[input.parentCandidateId]!.assetId
          : assetIdForRequest(request),
        parentRequestId: input.parentRequestId,
        parentCandidateId: input.parentCandidateId,
        origin: input.origin,
        manifestId: input.manifestId,
        qa: input.qa === true,
      },
      input.actor,
      "bench",
    );
    this.ensureRequestCodes();
    return created;
  }

  /** Append a brief correction without replacing its history or candidates. */
  reviseRequest(input: {
    readonly request: AssetRequest;
    readonly baseVersion: number;
    readonly actor: ArtbenchActor;
  }): ArtbenchEvent {
    const { request, baseVersion, actor } = input;
    const existing = request && this.projection().requests[request.requestId];
    if (!existing)
      throw new ArtbenchError(
        404,
        "unknown-request",
        "Request does not exist.",
      );
    if (
      !Number.isInteger(baseVersion) ||
      existing.request.requestVersion !== baseVersion ||
      request.requestVersion !== baseVersion + 1
    )
      throw new ArtbenchError(
        409,
        "stale-request",
        "Request changed. Reload before revising it.",
      );
    if (
      !request.title?.trim() ||
      !request.consumer?.consumerId ||
      !request.target?.targetClass ||
      !Array.isArray(request.generationRecipe)
    )
      throw new ArtbenchError(
        400,
        "invalid-request",
        "A request needs a title, use, target and instructions.",
      );
    return this.append(
      "request.revised",
      { request, baseVersion },
      actor,
      "bench",
    );
  }

  /** Administrative correction: mark records as QA and return their items. */
  dispositionQa(
    payload: QaDispositionPayload,
    actor: ArtbenchActor,
    authority: ReviewAuthority | null,
  ): ArtbenchEvent {
    if (!authority) {
      throw new ArtbenchError(
        403,
        "owner-capability-required",
        "QA disposition needs proven capability.",
      );
    }
    const projection = this.projection();
    if (payload.requestId && !projection.requests[payload.requestId]) {
      throw new ArtbenchError(
        404,
        "unknown-request",
        `No request ${payload.requestId}.`,
      );
    }
    if (payload.candidateId && !projection.candidates[payload.candidateId]) {
      throw new ArtbenchError(
        404,
        "unknown-candidate",
        `No candidate ${payload.candidateId}.`,
      );
    }
    if (
      payload.itemId &&
      !projection.integrationQueue.some((i) => i.itemId === payload.itemId)
    ) {
      throw new ArtbenchError(
        404,
        "unknown-item",
        `No integration item ${payload.itemId}.`,
      );
    }
    if (!payload.reason?.trim()) {
      throw new ArtbenchError(
        400,
        "invalid-disposition",
        "A QA disposition states its reason.",
      );
    }
    return this.append("qa.disposition", payload, actor, "bench");
  }

  selectCandidate(
    requestId: string,
    candidateId: string,
    actor: ArtbenchActor,
  ): ArtbenchEvent {
    const projection = this.projection();
    if (
      !projection.requests[requestId] ||
      !projection.candidates[candidateId]
    ) {
      throw new ArtbenchError(
        404,
        "unknown-entity",
        "Request or candidate does not exist.",
      );
    }
    return this.append(
      "candidate.selected",
      { requestId, candidateId },
      actor,
      "bench",
    );
  }

  recordIntegration(
    payload: IntegrationReceivedPayload,
    actor: ArtbenchActor,
  ): ArtbenchEvent {
    if (
      !this.projection().integrationQueue.some(
        (item) => item.itemId === payload.itemId,
      )
    ) {
      throw new ArtbenchError(
        404,
        "unknown-item",
        `No integration item ${payload.itemId}.`,
      );
    }
    return this.append("integration.received", payload, actor, "bench");
  }

  brief(requestId: string, candidateId?: string): string {
    const projection = this.projection();
    const request = projection.requests[requestId];
    if (!request)
      throw new ArtbenchError(
        404,
        "unknown-request",
        `No request ${requestId}.`,
      );
    const inboxHint = this.driveRoot
      ? `Drive › 00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE › ${EXCHANGE_FOLDER} › ${EXCHANGE_INBOX} › <batchId>/ (or the bench's local inbox folder)`
      : "the bench's local inbox folder (Drive exchange not configured on this machine)";
    const code = requestDisplayCode(projection, requestId);
    const prompt = request.request.generatorParameters?.fireflyPrompt;
    const prefix = [
      code
        ? `# ${code}-R${request.request.requestVersion} · ${request.request.title}`
        : `# ${request.request.title}`,
      "",
      ...(prompt
        ? [
            "## Copy this prompt",
            "",
            codedGenerationPrompt(request.request, code, prompt),
            "",
          ]
        : []),
      "Return the original image to this request. Keep earlier versions.",
      "",
    ].join("\n");
    return (
      prefix +
      producerBrief(request.request, {
        inboxHint,
        parentCandidate: candidateId
          ? projection.candidates[candidateId]
          : undefined,
      })
    );
  }

  /* ---------------------------------------------------------------- */
  /* Legacy migration (idempotent, non-destructive)                    */
  /* ---------------------------------------------------------------- */

  private migrateLegacy(): void {
    const legacyActor: ArtbenchActor = {
      kind: "legacy",
      id: "art-desk-sidecars",
    };
    const registry = new Map(
      this.registryRequests().map((r) => [r.requestId, r]),
    );
    const batch = readJson<{
      records?: readonly {
        requestId: string;
        outputSha256: string;
        privatePath: string;
        width?: number;
        height?: number;
        byteLength?: number;
        container?: string;
        tool?: string;
        nativeDetail?: string;
      }[];
    }>(join(this.workspace, "art/requests/art-desk-generation-batch.json"));
    const sidecar = readJson<{
      candidates?: readonly {
        requestId: string;
        sha256: string;
        path: string;
        byteLength: number;
        container: "png" | "jpg";
        width: number;
        height: number;
        storedAt: string;
        declaredBy: string;
      }[];
    }>(
      join(this.workspace, "art/generated/candidates/art-desk/candidates.json"),
    );
    const legacyCandidates: {
      requestId: string;
      sha256: string;
      path: string;
      width: number;
      height: number;
      byteLength: number;
      container: "png" | "jpg";
      provenance: CandidateProvenance;
      nativeDetail: "native" | "derived" | "unverified";
    }[] = [];
    for (const record of batch?.records ?? []) {
      legacyCandidates.push({
        requestId: record.requestId,
        sha256: record.outputSha256,
        path: record.privatePath,
        width: record.width ?? 0,
        height: record.height ?? 0,
        byteLength: record.byteLength ?? 0,
        container: record.container === "png" ? "png" : "jpg",
        provenance: { provider: record.tool, worker: "ALIVE43 Role A" },
        nativeDetail:
          record.nativeDetail === "native" ? "native" : "unverified",
      });
    }
    for (const record of sidecar?.candidates ?? []) {
      legacyCandidates.push({
        requestId: record.requestId,
        sha256: record.sha256,
        path: record.path,
        width: record.width,
        height: record.height,
        byteLength: record.byteLength,
        container: record.container,
        provenance: { worker: record.declaredBy, createdAt: record.storedAt },
        nativeDetail: "unverified",
      });
    }
    const qa = new Map(this.qaRequests().map((r) => [r.requestId, r]));
    const shaToCandidate = new Map<string, string>();
    for (const event of this.events) {
      if (event.type === "candidate.ingested") {
        shaToCandidate.set(
          `${event.payload.requestId}:${event.payload.sha256}`,
          event.payload.candidateId,
        );
      }
    }
    for (const legacy of legacyCandidates) {
      if (!SHA256.test(legacy.sha256)) continue;
      const eventId = `legacy:candidate:${legacy.requestId}:${legacy.sha256}`;
      if (this.known.has(eventId)) continue;
      const request =
        registry.get(legacy.requestId) ?? qa.get(legacy.requestId);
      // Copy verifiable bytes into the data root so they outlive the worktree.
      let storagePath = legacy.path;
      let hasAlpha = false;
      const absolute = realFileInside(this.workspace, legacy.path);
      if (absolute && existsSync(absolute)) {
        const bytes = readFileSync(absolute);
        if (hashBytes(bytes) === legacy.sha256) {
          const decoded = decodeRaster(bytes);
          if (decoded.ok) {
            storagePath = `bytes/${legacy.sha256}.${decoded.raster.container}`;
            const target = join(this.dataRoot, storagePath);
            if (!existsSync(target)) copyFileSync(absolute, target);
            hasAlpha = decoded.raster.hasAlpha;
          }
        }
      }
      const candidateId = `cand-legacy-${legacy.sha256.slice(0, 16)}`;
      this.append(
        "candidate.ingested",
        {
          candidateId,
          assetId: request
            ? assetIdForRequest(request)
            : `asset:${legacy.requestId}`,
          requestId: legacy.requestId,
          requestVersion: request?.requestVersion ?? 1,
          sha256: legacy.sha256,
          byteLength: legacy.byteLength,
          container: legacy.container,
          width: legacy.width,
          height: legacy.height,
          hasAlpha,
          storagePath,
          editKind: "original",
          provenance: {
            ...legacy.provenance,
            originalName: basename(legacy.path),
          },
          nativeDetail: legacy.nativeDetail,
          calibrationRecheck: [],
        },
        legacyActor,
        "legacy",
        eventId,
      );
      shaToCandidate.set(`${legacy.requestId}:${legacy.sha256}`, candidateId);
    }
    const reviews = readJson<{
      reviews?: readonly (ReviewDecidedPayload & {
        authorId?: string;
        decidedAt?: string;
      })[];
    }>(join(this.workspace, "art/requests/asset-reviews.json"));
    for (const review of reviews?.reviews ?? []) {
      const eventId = `legacy:review:${review.reviewId}`;
      if (this.known.has(eventId)) continue;
      const candidateId = shaToCandidate.get(
        `${review.requestId}:${review.outputSha256}`,
      );
      if (!candidateId) continue;
      this.append(
        "review.decided",
        {
          reviewId: review.reviewId,
          requestId: review.requestId,
          requestVersion: review.requestVersion,
          candidateId,
          viewedCandidateId: candidateId,
          outputSha256: review.outputSha256,
          decision: review.decision,
          contractVersion: review.contractVersion,
          fitContractHash: review.fitContractHash,
          sceneContractHash: review.sceneContractHash,
          rightsStatus: review.rightsStatus,
          sourceDeclaration: review.sourceDeclaration,
          note: review.note,
        },
        { kind: "legacy", id: review.authorId ?? "asset-reviews.json" },
        "legacy",
        eventId,
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /* Sync: local inbox + Drive mirror exchange                         */
  /* ---------------------------------------------------------------- */

  private saveSyncState(): void {
    writeAtomic(
      join(this.dataRoot, "sync", "state.json"),
      JSON.stringify(this.syncState, null, 2),
    );
  }

  syncStatus(): SyncStatus {
    const outbox = readdirSync(join(this.dataRoot, "outbox")).filter((f) =>
      f.endsWith(".json"),
    );
    const present = Boolean(this.driveRoot && existsSync(this.driveRoot));
    const pendingBatches = [
      ...this.pendingBatchIds(join(this.dataRoot, "inbox")),
      ...(present
        ? this.pendingBatchIds(join(this.driveRoot!, EXCHANGE_INBOX))
        : []),
    ];
    return {
      status: !this.syncState.lastAttemptAt
        ? "never"
        : !present
          ? "needs-mirror"
          : this.syncState.lastError
            ? "error"
            : "ok",
      driveRoot: this.driveRoot
        ? basename(dirname(this.driveRoot)) + "/" + basename(this.driveRoot)
        : null,
      driveRootPresent: present,
      lastAttemptAt: this.syncState.lastAttemptAt,
      lastSuccessAt: this.syncState.lastSuccessAt,
      lastError: this.syncState.lastError,
      pendingOutbox: outbox.length,
      pendingBatches,
      processedBatches: Object.keys(this.syncState.batches).length,
      exportedEvents: this.syncState.exportedEvents,
      importedEvents: this.syncState.importedEvents,
      lastCatalogAt: this.syncState.lastCatalogAt,
    };
  }

  /**
   * Pending means the bench is still waiting on something, which is not the
   * same question as whether the sender has finished uploading. Folder shape
   * answers the second: manifest.json or COMPLETE says the sender is done. It
   * used to answer both, and the two parted company the moment an item could
   * be deferred — a batch whose manifest arrived before its image is complete
   * by folder shape and unfinished in fact. So a complete batch is pending
   * while any item it declares has not reached an end state in the same
   * accumulated record that decides when batch.completed may be appended.
   */
  private pendingBatchIds(inbox: string): string[] {
    if (!existsSync(inbox)) return [];
    const pending: string[] = [];
    for (const entry of readdirSync(inbox, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (!entry.isDirectory()) continue;
      const folder = join(inbox, entry.name);
      const complete =
        existsSync(join(folder, "manifest.json")) ||
        existsSync(join(folder, "COMPLETE"));
      if (!complete) {
        // The sender has not said it is finished. A batch already processed
        // under an earlier shape is not re-announced.
        if (!this.syncState.batches[entry.name]) pending.push(entry.name);
        continue;
      }
      const done = this.syncState.batches[entry.name] ?? {};
      if (this.declaredItemIds(folder).some((itemId) => !done[itemId])) {
        pending.push(entry.name);
      }
    }
    return pending;
  }

  /**
   * The item ids a batch folder declares, read the same way the import reads
   * them so the two cannot disagree about what the batch contains.
   */
  private declaredItemIds(folder: string): string[] {
    const manifest = readJson<{ batchId?: string; items?: IntakeItem[] }>(
      join(folder, "manifest.json"),
    );
    const items: readonly IntakeItem[] = manifest?.items?.length
      ? manifest.items
      : readdirSync(folder)
          .filter((name) => IMAGE_EXT.test(name))
          .map((name) => ({ itemId: name, file: name }));
    const ids: string[] = [];
    for (const item of items) {
      const itemId = item.itemId ?? item.file;
      if (itemId) ids.push(itemId);
    }
    return ids;
  }

  /** One pass: import complete batches, export outbox, admit foreign events, publish catalog. */
  syncOnce(): SyncStatus {
    this.syncState.lastAttemptAt = this.now();
    try {
      this.importInbox(join(this.dataRoot, "inbox"), "local-inbox");
      const present = Boolean(this.driveRoot && existsSync(this.driveRoot));
      if (present) {
        const root = this.driveRoot!;
        this.importInbox(join(root, EXCHANGE_INBOX), "drive-inbox");
        this.admitForeignEvents(join(root, EXCHANGE_EVENTS));
        this.exportOutbox(join(root, EXCHANGE_EVENTS));
        this.publishCatalog(join(root, EXCHANGE_CATALOG));
        this.syncState.lastSuccessAt = this.now();
        this.syncState.lastError = null;
      } else {
        this.syncState.lastError = null;
        this.publishCatalog(join(this.dataRoot, "cache"));
      }
    } catch (error) {
      this.syncState.lastError =
        error instanceof Error ? error.message : String(error);
    }
    this.saveSyncState();
    return this.syncStatus();
  }

  private settled(absolute: string): boolean {
    const size = statSync(absolute).size;
    const previous = this.settling.get(absolute);
    this.settling.set(absolute, size);
    return previous === size;
  }

  private importInbox(
    inbox: string,
    source: BatchCompletedPayload["source"],
  ): void {
    if (!existsSync(inbox)) return;
    const actor: ArtbenchActor = { kind: "worker", id: source };
    for (const entry of readdirSync(inbox, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = join(inbox, entry.name);
      if (entry.isDirectory()) {
        this.importBatchFolder(absolute, entry.name, source, actor);
      } else if (IMAGE_EXT.test(entry.name) && this.settled(absolute)) {
        // A loose settled file is its own one-item batch; retries dedupe by name+hash.
        this.importItems(
          `loose-${entry.name}`,
          source,
          actor,
          [{ itemId: entry.name, file: entry.name }],
          inbox,
          null,
        );
      }
    }
  }

  private importBatchFolder(
    folder: string,
    batchId: string,
    source: BatchCompletedPayload["source"],
    actor: ArtbenchActor,
  ): void {
    if (!SAFE_ID.test(batchId)) return;
    const manifestPath = join(folder, "manifest.json");
    const complete =
      existsSync(manifestPath) || existsSync(join(folder, "COMPLETE"));
    if (!complete) return;
    const manifest = readJson<{ batchId?: string; items?: IntakeItem[] }>(
      manifestPath,
    );
    const items: IntakeItem[] = manifest?.items?.length
      ? manifest.items
      : readdirSync(folder)
          .filter((name) => IMAGE_EXT.test(name))
          .map((name) => ({ itemId: name, file: name }));
    this.importItems(
      batchId,
      source,
      actor,
      items,
      folder,
      manifest?.batchId ?? null,
    );
  }

  private importItems(
    batchId: string,
    source: BatchCompletedPayload["source"],
    actor: ArtbenchActor,
    items: readonly IntakeItem[],
    folder: string,
    declaredBatchId: string | null,
  ): void {
    const done = this.syncState.batches[batchId] ?? {};
    let changed = false;
    // An item whose file has not arrived yet. It gets no `done` entry, so the
    // next pass tries it again; a file that is present and unusable does get
    // one, because that will never become true on its own.
    const deferred: string[] = [];
    for (const item of items) {
      const itemId = item.itemId ?? item.file;
      if (!itemId || done[itemId]) continue;
      const file = realFileInside(folder, item.file ?? "");
      if (file && !existsSync(file)) {
        // The manifest names it and it is not here yet. A sender that writes
        // its manifest before its payload announces a batch that is still
        // uploading, and the only honest reading of that is "not yet".
        deferred.push(itemId);
        continue;
      }
      if (!file || !IMAGE_EXT.test(file)) {
        done[itemId] = file ? "rejected:not-an-image" : "rejected:unsafe-path";
        changed = true;
        continue;
      }
      try {
        const bytes = readFileSync(file);
        const result = this.ingest(
          bytes,
          {
            requestId: item.requestId,
            requestVersion: item.requestVersion,
            parentCandidateId: item.parentCandidateId ?? undefined,
            editKind: item.editKind,
            note: item.note,
            tags: item.tags,
            nativeDetail: item.nativeDetail,
            originalName: basename(file),
            provenance: {
              worker: item.worker,
              provider: item.provider,
              model: item.model,
              promptRef: item.promptRef,
              createdAt: item.createdAt,
              sourceTime: item.sourceTime,
              batchId: declaredBatchId ?? batchId,
              itemId,
              jobId: item.jobId,
              referenceInputs: Array.isArray(item.referenceInputs)
                ? item.referenceInputs
                : undefined,
            },
          },
          actor,
          source === "drive-inbox" ? "drive" : "inbox",
        );
        done[itemId] = result.duplicate
          ? `duplicate:${result.candidate.candidateId}`
          : result.candidate.candidateId;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (isTransientReadError(reason)) {
          // Same reasoning as absence: this one can come right on its own.
          deferred.push(itemId);
          continue;
        }
        done[itemId] = `rejected:${reason.slice(0, 80)}`;
      }
      changed = true;
    }
    if (changed) this.syncState.batches[batchId] = done;
    // A batch is completed when every item it declared has reached an end
    // state. Saying so while files are still arriving is what made a batch
    // that ingested nothing read to its sender exactly like a batch that
    // worked, with nothing left to look at.
    if (!changed || deferred.length > 0) return;
    const ingested: string[] = [];
    const duplicates: string[] = [];
    const rejected: { item: string; reason: string }[] = [];
    for (const item of items) {
      const itemId = item.itemId ?? item.file;
      if (!itemId) continue;
      const outcome = done[itemId];
      if (!outcome) continue;
      if (outcome.startsWith("rejected:")) {
        rejected.push({
          item: itemId,
          reason: outcome.slice("rejected:".length),
        });
      } else if (outcome.startsWith("duplicate:")) {
        // Named rather than dropped. An item that was neither ingested nor
        // rejected is how a batch came to report six of eight with nothing
        // said about the other two, which reads as an unexplained hole.
        duplicates.push(outcome.slice("duplicate:".length));
      } else {
        ingested.push(outcome);
      }
    }
    this.append(
      "batch.completed",
      {
        batchId,
        source,
        itemCount: items.length,
        ingestedCandidateIds: ingested,
        duplicateCandidateIds: duplicates,
        rejected,
      },
      { kind: "system", id: "artbench-sync" },
      "bench",
    );
  }

  /**
   * Foreign events are admitted in their authoring order (time, then the
   * author's seq), never in directory order, so a candidate can never be
   * admitted before the request it names.
   */
  private admitForeignEvents(eventsDir: string): void {
    if (!existsSync(eventsDir)) return;
    const pending: ArtbenchEvent[] = [];
    for (const name of readdirSync(eventsDir)) {
      if (!name.endsWith(".json")) continue;
      const file = join(eventsDir, name);
      if (lstatSync(file).isSymbolicLink()) continue;
      const event = readJson<ArtbenchEvent>(file);
      if (event && event.eventId && !this.known.has(event.eventId)) {
        pending.push(event);
      }
    }
    pending.sort((a, b) =>
      a.at === b.at ? (a.seq ?? 0) - (b.seq ?? 0) : a.at < b.at ? -1 : 1,
    );
    for (const event of pending) {
      if (this.admitForeign(event)) this.syncState.importedEvents += 1;
    }
  }

  private exportOutbox(eventsDir: string): void {
    mkdirSync(eventsDir, { recursive: true });
    const outbox = join(this.dataRoot, "outbox");
    for (const name of readdirSync(outbox)) {
      if (!name.endsWith(".json")) continue;
      const local = join(outbox, name);
      const remote = join(eventsDir, name);
      if (!existsSync(remote)) writeAtomic(remote, readFileSync(local));
      unlinkSync(local);
      this.syncState.exportedEvents += 1;
    }
  }

  /** Rebuildable views. Originals of decided candidates are copied once per hash. */
  private publishCatalog(catalogDir: string): void {
    mkdirSync(catalogDir, { recursive: true });
    this.ensureRequestCodes();
    const projection = this.projection();
    // Verifying every original here blocked the server for ~40 s per launch.
    // Unverified bytes are checked in the background; the previous catalog
    // stands until every candidate's state is known, then the next sync
    // publishes a complete one.
    const unknown = Object.values(projection.candidates).filter(
      (candidate) => !this.knownBytesState(candidate),
    );
    if (unknown.length > 0) {
      this.catalogWaiting = true;
      this.queueBytesVerification(unknown, { first: false });
      return;
    }
    const candidates = Object.values(projection.candidates).map((candidate) => {
      const bytes = this.bytesState(candidate);
      let exchangePath: string | null = null;
      if (bytes.state === "verified" && this.driveRoot) {
        const name = `${candidate.sha256}.${candidate.container}`;
        const target = join(catalogDir, "candidates", name);
        if (!existsSync(target)) {
          mkdirSync(dirname(target), { recursive: true });
          copyFileSync(this.resolveStorage(candidate)!, target);
        }
        exchangePath = `${EXCHANGE_CATALOG}/candidates/${name}`;
      }
      return {
        ...candidate,
        bytes: { state: bytes.state, note: bytes.note },
        exchangePath,
      };
    });
    const catalog = {
      contractVersion: ARTBENCH_CONTRACT_VERSION,
      storeId: this.storeId,
      generatedAt: this.now(),
      lastSeq: projection.lastSeq,
      coverage: {
        note: "Index of bench-known requests and candidates. The wider managed library is referenced, not scanned; an empty section is not proof of absent art.",
        registryRequests: this.registryRequests().length,
        candidates: candidates.length,
      },
      requests: projection.requests,
      assets: projection.assets,
      candidates,
      integrationQueue: projection.integrationQueue,
      conflicts: projection.conflicts,
      rejectedEvents: projection.rejectedEvents,
      importedReviews: projection.importedReviews,
      messages: projection.messages ?? [],
    };
    writeAtomic(
      join(catalogDir, "catalog.json"),
      JSON.stringify(catalog, null, 2),
    );
    writeAtomic(join(catalogDir, "CATALOG.md"), renderCatalogMarkdown(catalog));
    writeAtomic(
      join(catalogDir, "events-index.json"),
      JSON.stringify(
        this.events.map((e) => ({
          eventId: e.eventId,
          seq: e.seq,
          at: e.at,
          type: e.type,
          origin: e.origin,
          actor: e.actor,
        })),
        null,
        2,
      ),
    );
    this.syncState.lastCatalogAt = this.now();
  }
}

export interface IntakeItem {
  readonly itemId?: string;
  readonly file?: string;
  readonly requestId?: string;
  readonly requestVersion?: number;
  readonly parentCandidateId?: string | null;
  readonly editKind?: EditKind;
  readonly note?: string;
  readonly tags?: TagSet;
  readonly nativeDetail?: "native" | "derived" | "unverified";
  readonly worker?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly promptRef?: string;
  readonly createdAt?: string;
  readonly sourceTime?: string;
  readonly jobId?: string;
  readonly referenceInputs?: CandidateProvenance["referenceInputs"];
}

/** Project scope of a logical import identity. */
export const ARTBENCH_PROJECT_ID = "our-civic-duty";

/**
 * A stable candidate id for a delivered batch item, so independent stores
 * that ingest the same delivery produce the same candidate. Scoped to the
 * project, request/version, batch/item, exact bytes and edit lineage; any
 * difference yields a different id.
 */
export function logicalCandidateId(parts: {
  readonly requestId: string;
  readonly requestVersion: number;
  readonly batchId: string;
  readonly itemId: string;
  readonly sha256: string;
  readonly parentCandidateId?: string;
  readonly editKind: EditKind;
}): string {
  const key = [
    "artbench-intake/v1",
    ARTBENCH_PROJECT_ID,
    parts.requestId,
    String(parts.requestVersion),
    parts.batchId,
    parts.itemId,
    parts.sha256,
    parts.parentCandidateId ?? "",
    parts.editKind,
  ].join("\u0000");
  const hex = createHash("sha256").update(key).digest("hex");
  return `cand-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function renderCatalogMarkdown(catalog: {
  generatedAt: string;
  storeId: string;
  requests: ArtbenchProjection["requests"];
  candidates: readonly (ProjectedCandidate & {
    bytes: { state: string };
    exchangePath: string | null;
  })[];
  integrationQueue: ArtbenchProjection["integrationQueue"];
  conflicts: ArtbenchProjection["conflicts"];
  importedReviews?: ArtbenchProjection["importedReviews"];
}): string {
  const lines = [
    `# Artbench catalog — generated ${catalog.generatedAt} by ${catalog.storeId}`,
    ``,
    `Rebuildable projection of the immutable event log. Approval here is private review, not runtime release.`,
    ``,
    `## Requests`,
  ];
  for (const request of Object.values(catalog.requests)) {
    lines.push(
      `- **${request.request.requestId}** v${request.request.requestVersion} — ${request.request.title}${request.qa ? " · QA (disposable)" : ""} · lane ${request.lane} · ${request.candidateIds.length} candidate(s)${request.selectedCandidateId ? ` · selected ${request.selectedCandidateId}` : ""}`,
    );
  }
  lines.push(``, `## Candidates`);
  for (const c of catalog.candidates) {
    const latest = c.latestDecision;
    lines.push(
      `- ${c.candidateId}${c.qa ? " · QA" : ""} · request ${c.requestId} · rev ${c.revision} · ${c.width}×${c.height} ${c.container}${c.hasAlpha ? " α" : ""} · sha ${c.sha256} · ${c.editKind}${c.parentCandidateId ? ` of ${c.parentCandidateId}` : ""} · bytes ${c.bytes.state} · status ${c.status}${latest ? ` · ${latest.payload.decision} (${latest.payload.reviewId}, event ${latest.eventId}${latest.payload.note ? `, "${latest.payload.note}"` : ""})` : ""}${Object.keys(c.tags).length ? ` · tags ${JSON.stringify(c.tags)}` : " · untagged"}${c.exchangePath ? ` · file ${c.exchangePath}` : ""}`,
    );
  }
  lines.push(``, `## Integration queue`);
  for (const item of catalog.integrationQueue) {
    lines.push(
      `- ${item.itemId} · ${item.state}${item.qa ? " · QA (not cargo)" : ""} · candidate ${item.candidateId} · sha ${item.sha256} · consumer ${item.consumerId} · at approval ${item.tagsState} · current tags ${Object.keys(item.currentTags).length ? JSON.stringify(item.currentTags) : "none"} (v${item.currentTagsVersion})${item.missingFacts.length ? ` · missing: ${item.missingFacts.join("; ")}` : ""}`,
    );
  }
  if (catalog.importedReviews?.length) {
    lines.push(``, `## Imported reviews (exchange evidence, not applied)`);
    for (const r of catalog.importedReviews) {
      lines.push(
        `- ${r.eventId} from ${r.fromOrigin}: ${r.imported.decision} on ${r.imported.candidateId} (${r.imported.reviewId})`,
      );
    }
  }
  if (catalog.conflicts.length) {
    lines.push(``, `## Tag conflicts (surfaced, not overwritten)`);
    for (const conflict of catalog.conflicts) {
      lines.push(
        `- ${conflict.entity} ${conflict.entityId}: ${conflict.author.id} wrote against version ${conflict.baseVersion}, current ${conflict.currentVersion} (event ${conflict.eventId})`,
      );
    }
  }
  return lines.join("\n") + "\n";
}

export function fileExtensionFor(name: string): string {
  return extname(name).toLowerCase();
}
