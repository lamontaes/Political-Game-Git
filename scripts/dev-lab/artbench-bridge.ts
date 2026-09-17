/**
 * ARTBENCH BRIDGE — loopback routes over the artbench store.
 *
 * Mounted only with PG_LOCAL_REVIEW=1 (the identified authoring server), with
 * the same loopback/origin discipline as the Art Desk file bridge. The desktop
 * hub embeds the bench by running this same server; the data root is shared
 * through PG_ARTBENCH_DATA_ROOT, not through the worktree.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

import type { ArtbenchActor } from "../../src/authoring/artbench";
import { isLoopbackAddress, originAllowed } from "./art-desk-bridge";
import {
  ArtbenchError,
  ArtbenchStore,
  defaultDataRoot,
  defaultDriveRoot,
  type IntakeMeta,
} from "./artbench-store";

export const ARTBENCH_ROUTE_PREFIX = "/__dev/artbench/";
/** Desktop hub launch token: when set, every artbench request must carry it. */
export const ART_DESK_TOKEN_ENV = "PG_ART_DESK_TOKEN";
export const ART_DESK_TOKEN_HEADER = "x-ocd-art-desk-token";

export function tokenAccepted(
  provided: string | null,
  expected: string | undefined = process.env[ART_DESK_TOKEN_ENV],
): boolean {
  if (!expected) return true;
  return provided !== null && provided === expected;
}
const MAX_JSON_BODY = 4 * 1024 * 1024;
const MAX_UPLOAD_BODY = 96 * 1024 * 1024;

function readBody(request: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    request.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > limit) {
        reject(
          new ArtbenchError(413, "too-large", `Body exceeds ${limit} bytes.`),
        );
        request.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function header(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export const OWNER_CAPABILITY_HEADER = "x-ocd-owner-capability";

/**
 * An actor is data the caller supplies; it is never proof. A missing or
 * malformed actor is refused on events; uploads without one are recorded as
 * unattributed worker uploads (still never approval).
 */
/**
 * A readable name the page chose, reduced to a safe ASCII stem; the request
 * id is the fallback. Never a path, never a quote.
 */
export function briefDownloadStem(
  name: string | null,
  requestId: string,
): string {
  const clean = (value: string, pattern: RegExp) =>
    value
      .replace(pattern, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  return (
    clean((name ?? "").toLowerCase(), /[^a-z0-9-]+/g) ||
    clean(requestId, /[^A-Za-z0-9._-]+/g).replace(/^\.+/, "") ||
    "asset"
  );
}

export function parseActor(
  raw: unknown,
): { ok: true; actor: ArtbenchActor } | { ok: false; message: string } {
  const candidate = raw as Partial<ArtbenchActor> | undefined;
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, message: "actor {kind, id} is required." };
  }
  const kind = candidate.kind;
  if (
    (kind !== "owner" && kind !== "agent" && kind !== "worker") ||
    typeof candidate.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._@:-]{0,63}$/.test(candidate.id)
  ) {
    return {
      ok: false,
      message:
        "actor.kind must be owner|agent|worker and actor.id a short identifier.",
    };
  }
  return { ok: true, actor: { kind, id: candidate.id } };
}

/** Proof of owner review capability comes from headers, never the body. */
export function authorityFrom(
  headers: {
    readonly hostToken: string | null;
    readonly ownerCapability: string | null;
  },
  expected: {
    readonly hostToken: string | undefined;
    readonly ownerCapability: string;
  },
): "host-token" | "session-capability" | null {
  if (expected.hostToken && headers.hostToken === expected.hostToken)
    return "host-token";
  if (
    headers.ownerCapability &&
    headers.ownerCapability === expected.ownerCapability
  ) {
    return "session-capability";
  }
  return null;
}

export interface ArtbenchBridgeOptions {
  readonly workspace: string;
  readonly dataRoot?: string;
  readonly driveRoot?: string | null;
  readonly syncIntervalMs?: number;
}

export function createArtbenchHandler(store: ArtbenchStore) {
  return async function handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const route = url.pathname.slice(ARTBENCH_ROUTE_PREFIX.length);
    const method = request.method ?? "GET";
    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      sendJson(response, 403, {
        error: "not-loopback",
        message: "Artbench is loopback-only.",
      });
      return;
    }
    if (!tokenAccepted(header(request, ART_DESK_TOKEN_HEADER))) {
      sendJson(response, 401, {
        error: "token-required",
        message: `This bench was launched with a host token; send it as ${ART_DESK_TOKEN_HEADER}.`,
      });
      return;
    }
    const origin = header(request, "origin");
    if (method !== "GET" && !originAllowed(origin, header(request, "host"))) {
      sendJson(response, 403, {
        error: "unauthorized-origin",
        message: "Origin is not the loopback authoring host.",
      });
      return;
    }
    if (
      method === "GET" &&
      origin &&
      !originAllowed(origin, header(request, "host"))
    ) {
      sendJson(response, 403, {
        error: "unauthorized-origin",
        message: "Origin is not the loopback authoring host.",
      });
      return;
    }
    const authority = authorityFrom(
      {
        hostToken: header(request, ART_DESK_TOKEN_HEADER),
        ownerCapability: header(request, OWNER_CAPABILITY_HEADER),
      },
      {
        hostToken: process.env[ART_DESK_TOKEN_ENV],
        ownerCapability: store.ownerCapability,
      },
    );
    try {
      if (route === "session" && method === "GET") {
        // The same-origin bench page (or the host's token) obtains the
        // per-launch owner capability; other loopback processes do not.
        const sameOrigin = header(request, "sec-fetch-site") === "same-origin";
        if (!sameOrigin && authority !== "host-token") {
          sendJson(response, 403, {
            error: "not-the-bench",
            message:
              "The owner session capability is issued only to the same-origin bench page or the host token.",
          });
          return;
        }
        sendJson(response, 200, {
          ownerId: store.ownerId,
          capability: store.ownerCapability,
          authority: authority ?? "session-capability",
        });
        return;
      }
      if (route === "state" && method === "GET") {
        const projection = store.projection();
        const bytes: Record<string, unknown> = {};
        for (const candidate of Object.values(projection.candidates)) {
          const state = store.bytesState(candidate);
          bytes[candidate.candidateId] = {
            state: state.state,
            note: state.note,
            raster: state.raster,
          };
        }
        sendJson(response, 200, {
          projection,
          bytes,
          sync: store.syncStatus(),
          store: {
            storeId: store.storeId,
            dataRootLabel:
              "PG_ARTBENCH_DATA_ROOT (project-scoped, outside the worktree)",
          },
          generatorAvailable: false,
        });
        return;
      }
      if (route === "events" && method === "GET") {
        const since = Number(url.searchParams.get("sinceSeq") ?? "0");
        sendJson(response, 200, {
          events: store.allEvents(Number.isFinite(since) ? since : 0),
        });
        return;
      }
      if (route === "intake" && (method === "PUT" || method === "POST")) {
        const metaRaw = url.searchParams.get("meta");
        let meta: IntakeMeta & { actor?: unknown } = {};
        if (metaRaw) {
          try {
            meta = JSON.parse(metaRaw) as IntakeMeta & { actor?: unknown };
          } catch {
            sendJson(response, 400, {
              error: "invalid-meta",
              message: "meta must be JSON.",
            });
            return;
          }
        }
        const body = await readBody(request, MAX_UPLOAD_BODY);
        if (body.length === 0) {
          sendJson(response, 400, {
            error: "empty-body",
            message: "Upload has no bytes.",
          });
          return;
        }
        const parsed = parseActor(meta.actor);
        const uploader: ArtbenchActor = parsed.ok
          ? parsed.actor
          : { kind: "worker", id: "unattributed-upload" };
        const result = store.ingest(body, meta, uploader, "bench");
        sendJson(response, result.duplicate ? 200 : 201, {
          candidate: result.candidate,
          duplicate: result.duplicate,
          eventId: result.event?.eventId ?? null,
        });
        return;
      }
      if (route === "events" && method === "POST") {
        const body = JSON.parse(
          (await readBody(request, MAX_JSON_BODY)).toString("utf8"),
        ) as {
          type: string;
          payload: Record<string, unknown>;
          actor?: unknown;
        };
        const parsed = parseActor(body.actor);
        if (!parsed.ok) {
          sendJson(response, 400, {
            error: "invalid-actor",
            message: parsed.message,
          });
          return;
        }
        const actor = parsed.actor;
        const payload = body.payload ?? {};
        switch (body.type) {
          case "qa.disposition": {
            const event = store.dispositionQa(
              {
                requestId:
                  typeof payload.requestId === "string"
                    ? payload.requestId
                    : undefined,
                candidateId:
                  typeof payload.candidateId === "string"
                    ? payload.candidateId
                    : undefined,
                itemId:
                  typeof payload.itemId === "string"
                    ? payload.itemId
                    : undefined,
                reason: String(payload.reason ?? ""),
              },
              actor,
              authority,
            );
            sendJson(response, 201, { events: [event] });
            return;
          }
          case "review.decided": {
            const events = store.decide({
              authority,
              candidateId: String(payload.candidateId ?? ""),
              viewedCandidateId: String(payload.viewedCandidateId ?? ""),
              viewedSha256: String(payload.viewedSha256 ?? ""),
              decision: payload.decision as
                "approve" | "reject" | "request-revision",
              note: typeof payload.note === "string" ? payload.note : undefined,
              attachments: Array.isArray(payload.attachments)
                ? payload.attachments.map(String)
                : undefined,
              actor,
              fitContractHash: String(payload.fitContractHash ?? ""),
              sceneContractHash: String(payload.sceneContractHash ?? ""),
              contractVersion: String(payload.contractVersion ?? ""),
              supersedesReviewId:
                typeof payload.supersedesReviewId === "string"
                  ? payload.supersedesReviewId
                  : undefined,
            });
            sendJson(response, 201, { events });
            return;
          }
          case "tags.set": {
            const event = store.setTags({
              entity: payload.entity === "asset" ? "asset" : "candidate",
              entityId: String(payload.entityId ?? ""),
              tags: (payload.tags ?? {}) as Record<string, readonly string[]>,
              baseVersion: Number(payload.baseVersion ?? -1),
              author: actor,
              suggestion: payload.suggestion === true,
            });
            sendJson(response, 201, { events: [event] });
            return;
          }
          case "request.created": {
            const event = store.createRequest({
              request: payload.request as never,
              actor,
              parentRequestId:
                typeof payload.parentRequestId === "string"
                  ? payload.parentRequestId
                  : undefined,
              parentCandidateId:
                typeof payload.parentCandidateId === "string"
                  ? payload.parentCandidateId
                  : undefined,
              origin: actor.kind === "worker" ? "worker" : "owner",
              manifestId:
                typeof payload.manifestId === "string"
                  ? payload.manifestId
                  : undefined,
              qa: payload.qa === true,
            });
            sendJson(response, 201, { events: [event] });
            return;
          }
          case "candidate.selected": {
            const event = store.selectCandidate(
              String(payload.requestId ?? ""),
              String(payload.candidateId ?? ""),
              actor,
            );
            sendJson(response, 201, { events: [event] });
            return;
          }
          case "integration.received": {
            const event = store.recordIntegration(payload as never, actor);
            sendJson(response, 201, { events: [event] });
            return;
          }
          default:
            sendJson(response, 400, {
              error: "unknown-event",
              message: `Event type '${body.type}' is not accepted here.`,
            });
            return;
        }
      }
      if (route === "original" && method === "GET") {
        const candidateId = url.searchParams.get("candidateId") ?? "";
        const { bytes, filename, candidate } = store.original(candidateId);
        response.statusCode = 200;
        response.setHeader(
          "Content-Type",
          candidate.container === "png" ? "image/png" : "image/jpeg",
        );
        response.setHeader("Content-Length", String(bytes.length));
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Artbench-Sha256", candidate.sha256);
        response.setHeader("X-Artbench-Candidate", candidate.candidateId);
        if (url.searchParams.get("download") === "1") {
          response.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`,
          );
        }
        response.end(bytes);
        return;
      }
      if (route === "brief" && method === "GET") {
        const requestId = url.searchParams.get("requestId") ?? "";
        const candidateId = url.searchParams.get("candidateId") ?? undefined;
        const text = store.brief(requestId, candidateId);
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/markdown; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (url.searchParams.get("download") === "1") {
          const stem = briefDownloadStem(
            url.searchParams.get("name"),
            requestId,
          );
          response.setHeader(
            "Content-Disposition",
            `attachment; filename="${stem}-brief.md"`,
          );
        }
        response.end(text);
        return;
      }
      if (route === "sync" && method === "GET") {
        sendJson(response, 200, store.syncStatus());
        return;
      }
      if (route === "sync" && method === "POST") {
        sendJson(response, 200, store.syncOnce());
        return;
      }
      sendJson(response, 404, {
        error: "not-found",
        message: `No artbench route '${route}' for ${method}.`,
      });
    } catch (error) {
      if (error instanceof ArtbenchError) {
        sendJson(response, error.status, {
          error: error.code,
          message: error.message,
        });
        return;
      }
      sendJson(response, 500, {
        error: "internal",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export function artbenchBridge(options: ArtbenchBridgeOptions): Plugin {
  return {
    name: "our-civic-duty-artbench-bridge",
    configureServer(server) {
      if (process.env.PG_LOCAL_REVIEW !== "1") return;
      const store = new ArtbenchStore({
        dataRoot: options.dataRoot ?? defaultDataRoot(),
        workspace: options.workspace,
        driveRoot:
          options.driveRoot === undefined
            ? defaultDriveRoot()
            : options.driveRoot,
      });
      const handle = createArtbenchHandler(store);
      server.middlewares.use(async (request, response, next) => {
        if (!(request.url ?? "").startsWith(ARTBENCH_ROUTE_PREFIX)) {
          next();
          return;
        }
        await handle(request, response);
      });
      const interval =
        options.syncIntervalMs ??
        Number(process.env.PG_ARTBENCH_SYNC_MS ?? 10_000);
      if (interval > 0) {
        const timer = setInterval(() => {
          // The Drive mirror may appear after start-up (client launched later).
          if (!store.driveRoot) store.driveRoot = defaultDriveRoot();
          store.syncOnce();
        }, interval);
        timer.unref();
        server.httpServer?.on("close", () => clearInterval(timer));
      }
      store.syncOnce();
      server.config.logger.info(
        `[artbench] data root ${store.dataRoot}; drive exchange ${store.driveRoot ?? "not configured (needs Drive for desktop mirror)"}`,
      );
    },
  };
}
