/**
 * Identified-server Art Desk persistence.
 *
 * Mounted only when PG_LOCAL_REVIEW=1 on loopback. Ordinary Vite/production
 * builds never attach these routes. Path policy is duplicated here rather than
 * imported from src/authoring so the browser typecheck stays free of Node
 * filesystem types.
 */

import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  writeSync,
} from "node:fs";
import { basename, dirname, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import {
  ART_DESK_CANDIDATE_PREFIX,
  ART_DESK_CANDIDATE_SIDECAR,
  ART_DESK_QA_REQUEST_SIDECAR,
  PRIVATE_PACK_ENV,
  collectArtDeskInputs,
  refuseUnverifiedReviews,
  type ArtDeskInputsReceipt,
  type RasterFacts,
} from "./art-desk-inputs";
import { decodeRaster } from "./raster-decode";

export { ART_DESK_CANDIDATE_PREFIX } from "./art-desk-inputs";

export const ART_DESK_BRIDGE_PATHS = [
  "art/requests/asset-requests.json",
  "art/requests/asset-reviews.json",
  "art/requests/asset-claims.json",
  "art/requests/art-desk-reconciliation.json",
  // Private, gitignored sidecars: uploaded-candidate association and
  // disposable QA requests. Never a second registry of real requests.
  ART_DESK_CANDIDATE_SIDECAR,
  ART_DESK_QA_REQUEST_SIDECAR,
] as const;

export const ART_DESK_INPUTS_ROUTE = "/__dev/art-desk/inputs";
const ART_DESK_TOKEN_HEADER = "x-ocd-art-desk-token";
const REVIEWS_PATH = "art/requests/asset-reviews.json";

const ALLOWED = new Set<string>(ART_DESK_BRIDGE_PATHS);

export type BridgeFailure =
  | "not-loopback"
  | "unauthorized-origin"
  | "path-not-allowlisted"
  | "path-traversal"
  | "revision-conflict"
  | "not-found"
  | "invalid-body"
  | "invalid-raster"
  | "candidate-unverified"
  | "production-mount";

export interface BridgeRequest {
  readonly remoteAddress?: string;
  readonly origin?: string | null;
  readonly host?: string | null;
  readonly method: string;
  readonly relativePath: string;
  readonly ifMatch?: string | null;
  readonly body?: Buffer;
  readonly localReviewEnabled: boolean;
}

export type BridgeResult =
  | {
      readonly ok: true;
      readonly status: number;
      readonly revision: string;
      readonly body?: Buffer;
      readonly contentType?: string;
      /** Extra JSON fields for a write acknowledgement (e.g. decoded raster facts). */
      readonly payload?: Record<string, unknown>;
    }
  | {
      readonly ok: false;
      readonly status: number;
      readonly code: BridgeFailure;
      readonly message: string;
    };

function fail(
  status: number,
  code: BridgeFailure,
  message: string,
): Extract<BridgeResult, { ok: false }> {
  return { ok: false, status, code, message };
}

function contentTypeFor(relative: string): string {
  if (relative.endsWith(".json")) return "application/json";
  if (/\.jpe?g$/i.test(relative)) return "image/jpeg";
  if (/\.png$/i.test(relative)) return "image/png";
  return "application/octet-stream";
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const host = address.replace(/^::ffff:/, "");
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export function originAllowed(
  origin: string | null | undefined,
  host: string | null | undefined,
): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (!isLoopbackAddress(url.hostname)) return false;
    if (host) {
      const expected = host.replace(/^\[|\]$/g, "");
      if (url.host !== host && url.hostname !== expected.split(":")[0]) {
        return false;
      }
    }
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hashBytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function resolveAllowlistedPath(
  workspace: string,
  relativePath: string,
):
  | { readonly ok: true; readonly absolute: string; readonly relative: string }
  | {
      readonly ok: false;
      readonly code: BridgeFailure;
      readonly message: string;
    } {
  const trimmed = relativePath.replace(/^\/+/, "");
  if (
    trimmed.includes("\0") ||
    trimmed.includes("..") ||
    trimmed.split("\\").join("/").split("/").includes("..")
  ) {
    return {
      ok: false,
      code: "path-traversal",
      message: "Parent traversal is refused.",
    };
  }
  const relative = trimmed.split("\\").join("/");
  const documents = ALLOWED.has(relative);
  const candidate =
    relative.startsWith(ART_DESK_CANDIDATE_PREFIX) &&
    !relative.endsWith("/") &&
    /\.(png|jpe?g)$/i.test(relative);
  if (!documents && !candidate) {
    return {
      ok: false,
      code: "path-not-allowlisted",
      message: `'${relative}' is not an Art Desk allowlisted path.`,
    };
  }
  const root = resolve(workspace);
  const absolute = resolve(root, relative);
  if (absolute !== root && !absolute.startsWith(root + sep)) {
    return {
      ok: false,
      code: "path-traversal",
      message: "Resolved path escaped the workspace.",
    };
  }
  return { ok: true, absolute, relative };
}

function authorize(
  request: BridgeRequest,
): Extract<BridgeResult, { ok: false }> | null {
  if (!request.localReviewEnabled) {
    return fail(
      404,
      "production-mount",
      "Art Desk bridge exists only on the identified local authoring server.",
    );
  }
  if (!isLoopbackAddress(request.remoteAddress)) {
    return fail(403, "not-loopback", "Art Desk writes are loopback-only.");
  }
  if (request.method !== "GET") {
    if (!originAllowed(request.origin ?? null, request.host ?? null)) {
      return fail(
        403,
        "unauthorized-origin",
        "Origin is not the loopback authoring host.",
      );
    }
  } else if (
    request.origin &&
    !originAllowed(request.origin, request.host ?? null)
  ) {
    return fail(
      403,
      "unauthorized-origin",
      "Origin is not the loopback authoring host.",
    );
  }
  return null;
}

export interface BridgeInputsOptions {
  readonly packDirectory?: string;
  readonly now: string;
}

/** GET receipt of private inputs: pack identity state and per-candidate byte verification. */
export function handleArtDeskInputs(
  workspace: string,
  request: BridgeRequest,
  options: BridgeInputsOptions,
): BridgeResult {
  const denied = authorize(request);
  if (denied) return denied;
  if (request.method !== "GET") {
    return fail(405, "invalid-body", "Input receipts are read-only.");
  }
  const receipt: ArtDeskInputsReceipt = collectArtDeskInputs(
    workspace,
    options.packDirectory,
    options.now,
  );
  const body = Buffer.from(JSON.stringify(receipt));
  return {
    ok: true,
    status: 200,
    revision: hashBytes(body),
    body,
    contentType: "application/json",
  };
}

function checkCandidateWrite(
  relative: string,
  body: Buffer,
): Extract<BridgeResult, { ok: false }> | RasterFacts {
  const decoded = decodeRaster(body);
  if (!decoded.ok) {
    return fail(
      422,
      "invalid-raster",
      `Upload did not fully decode (${decoded.code}): ${decoded.message}`,
    );
  }
  const raster: RasterFacts = {
    container: decoded.raster.container,
    width: decoded.raster.width,
    height: decoded.raster.height,
    hasAlpha: decoded.raster.hasAlpha,
  };
  const expected = basename(relative).replace(/\.(png|jpe?g)$/i, "");
  const actual = hashBytes(body);
  if (expected !== actual) {
    return fail(
      422,
      "invalid-raster",
      `Candidate path names ${expected.slice(0, 12)}… but the bytes hash to ${actual.slice(0, 12)}…; the file is stored under its own hash only.`,
    );
  }
  return raster;
}

function checkReviewWrite(
  workspace: string,
  current: Buffer | null,
  body: Buffer,
  packDirectory: string | undefined,
  now: string,
): Extract<BridgeResult, { ok: false }> | null {
  let next: { reviews?: never[] };
  let existing: { reviews?: never[] } | null = null;
  try {
    next = JSON.parse(body.toString("utf8"));
    existing = current ? JSON.parse(current.toString("utf8")) : null;
  } catch {
    return fail(400, "invalid-body", "Review document is not JSON.");
  }
  const receipt = collectArtDeskInputs(workspace, packDirectory, now);
  const refusals = refuseUnverifiedReviews(existing, next, receipt.candidates);
  if (refusals.length === 0) return null;
  return fail(
    422,
    "candidate-unverified",
    refusals.map((item) => `${item.reviewId}: ${item.reason}`).join(" "),
  );
}

export function handleArtDeskBridge(
  workspace: string,
  request: BridgeRequest,
  options: BridgeInputsOptions = { now: new Date().toISOString() },
): BridgeResult {
  const denied = authorize(request);
  if (denied) return denied;
  const resolved = resolveAllowlistedPath(workspace, request.relativePath);
  if (!resolved.ok) {
    return fail(403, resolved.code, resolved.message);
  }
  if (request.method === "GET") {
    if (
      !existsSync(resolved.absolute) ||
      !statSync(resolved.absolute).isFile()
    ) {
      return fail(404, "not-found", `'${resolved.relative}' is not a file.`);
    }
    const body = readFileSync(resolved.absolute);
    return {
      ok: true,
      status: 200,
      revision: hashBytes(body),
      body,
      contentType: contentTypeFor(resolved.relative),
    };
  }
  if (request.method === "PUT") {
    if (!request.body) {
      return fail(400, "invalid-body", "Write requires a body.");
    }
    const current = existsSync(resolved.absolute)
      ? readFileSync(resolved.absolute)
      : null;
    const currentHash = current ? hashBytes(current) : "0".repeat(64);
    if (request.ifMatch && request.ifMatch !== currentHash) {
      return fail(
        409,
        "revision-conflict",
        "If-Match does not equal the current file hash. Reload and retry; the write was not applied.",
      );
    }
    let payload: Record<string, unknown> | undefined;
    if (
      resolved.relative.startsWith(ART_DESK_CANDIDATE_PREFIX) &&
      !resolved.relative.endsWith(".json")
    ) {
      const checked = checkCandidateWrite(resolved.relative, request.body);
      if ("ok" in checked) return checked;
      payload = {
        sha256: hashBytes(request.body),
        byteLength: request.body.length,
        ...checked,
      };
    }
    if (resolved.relative === REVIEWS_PATH) {
      const refused = checkReviewWrite(
        workspace,
        current,
        request.body,
        options.packDirectory,
        options.now,
      );
      if (refused) return refused;
    }
    mkdirSync(dirname(resolved.absolute), { recursive: true });
    const temp = `${resolved.absolute}.${process.pid}.tmp`;
    const fd = openSync(temp, "w");
    try {
      writeSync(fd, request.body);
    } finally {
      closeSync(fd);
    }
    renameSync(temp, resolved.absolute);
    return {
      ok: true,
      status: current ? 200 : 201,
      revision: hashBytes(request.body),
      payload,
    };
  }
  return fail(
    405,
    "invalid-body",
    `Method ${request.method} is not supported.`,
  );
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function header(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function artDeskBridge(workspace: string): Plugin {
  return {
    name: "our-civic-duty-art-desk-bridge",
    configureServer(server) {
      if (process.env.PG_LOCAL_REVIEW !== "1") return;
      server.middlewares.use(async (request, response, next) => {
        const url = request.url ?? "";
        if (!url.startsWith("/__dev/art-desk/")) {
          next();
          return;
        }
        await dispatch(workspace, request, response);
      });
    },
  };
}

async function dispatch(
  workspace: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const expectedToken = process.env.PG_ART_DESK_TOKEN;
  if (
    expectedToken &&
    request.method !== "GET" &&
    header(request, ART_DESK_TOKEN_HEADER) !== expectedToken
  ) {
    respond(
      response,
      fail(
        401,
        "unauthorized-origin",
        "Host token missing or wrong for a write.",
      ),
    );
    return;
  }
  const options: BridgeInputsOptions = {
    packDirectory: process.env[PRIVATE_PACK_ENV] || undefined,
    now: new Date().toISOString(),
  };
  if (url.pathname === ART_DESK_INPUTS_ROUTE) {
    const receipt = handleArtDeskInputs(
      workspace,
      {
        remoteAddress: request.socket.remoteAddress,
        origin: header(request, "origin"),
        host: header(request, "host"),
        method: request.method ?? "GET",
        relativePath: "",
        localReviewEnabled: process.env.PG_LOCAL_REVIEW === "1",
      },
      options,
    );
    respond(response, receipt);
    return;
  }
  const relative =
    url.searchParams.get("path") ??
    decodeURIComponent(
      url.pathname.replace(/^\/__dev\/art-desk\/(?:file\/)?/, ""),
    );
  let body: Buffer | undefined;
  if (request.method === "PUT" || request.method === "POST") {
    body = await readBody(request);
  }
  const result = handleArtDeskBridge(
    workspace,
    {
      remoteAddress: request.socket.remoteAddress,
      origin: header(request, "origin"),
      host: header(request, "host"),
      method: request.method === "POST" ? "PUT" : (request.method ?? "GET"),
      relativePath: relative,
      ifMatch: header(request, "if-match"),
      body,
      localReviewEnabled: process.env.PG_LOCAL_REVIEW === "1",
    },
    options,
  );
  respond(response, result);
}

function respond(response: ServerResponse, result: BridgeResult): void {
  if (!result.ok) {
    response.statusCode = result.status;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.end(
      JSON.stringify({ error: result.code, message: result.message }),
    );
    return;
  }
  response.statusCode = result.status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("ETag", `"${result.revision}"`);
  response.setHeader("X-Art-Desk-Revision", result.revision);
  if (result.body) {
    response.setHeader(
      "Content-Type",
      result.contentType ?? "application/octet-stream",
    );
    response.end(result.body);
    return;
  }
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify({ revision: result.revision, ...(result.payload ?? {}) }),
  );
}
