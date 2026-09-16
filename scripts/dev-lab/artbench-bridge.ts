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

/** The owner acts through the bench; agents/workers must say so. */
function actorFrom(raw: unknown): ArtbenchActor {
  const candidate = raw as Partial<ArtbenchActor> | undefined;
  if (candidate && typeof candidate.id === "string" && candidate.id.trim()) {
    const kind = candidate.kind;
    if (kind === "owner" || kind === "agent" || kind === "worker") {
      return { kind, id: candidate.id.trim().slice(0, 64) };
    }
  }
  return { kind: "owner", id: "lamontae" };
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
    try {
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
        const result = store.ingest(body, meta, actorFrom(meta.actor), "bench");
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
        const actor = actorFrom(body.actor);
        const payload = body.payload ?? {};
        switch (body.type) {
          case "review.decided": {
            const events = store.decide({
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
          response.setHeader(
            "Content-Disposition",
            `attachment; filename="${requestId}-brief.md"`,
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
