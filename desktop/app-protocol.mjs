/* global URL, Response */
/**
 * The restricted packaged-content protocol behind the stable app://game
 * origin. Shared by the game shell (desktop/main.mjs) and the private hub's
 * Play tab so both serve the compiled client with identical path, MIME and
 * CSP rules.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const APP_SCHEME = "app";
export const APP_HOST = "game";
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

/** Standard + secure gives the origin real web semantics (IndexedDB, absolute /assets/ paths). */
export const APP_SCHEME_PRIVILEGES = {
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    stream: true,
  },
};

export const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".map", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

// The game is fully local; every directive stays inside the packaged
// origin. style 'unsafe-inline' is required by React inline style
// attributes in the existing build; scripts remain 'self' only.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Resolve a request path strictly inside the content root. Traversal,
 * encoded traversal, null bytes, and anything that escapes the root all
 * fail closed to null.
 */
export function resolveContentPath(contentRoot, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(contentRoot, relative === "" ? "." : relative);
  if (resolved !== contentRoot && !resolved.startsWith(contentRoot + path.sep))
    return null;
  return resolved;
}

export function responseHeaders(extension) {
  const headers = {
    "content-type": MIME_TYPES.get(extension) ?? "application/octet-stream",
    "x-content-type-options": "nosniff",
  };
  if (extension === ".html")
    headers["content-security-policy"] = CONTENT_SECURITY_POLICY;
  return headers;
}

export async function serveAppRequest(contentRoot, request) {
  const url = new URL(request.url);
  if (url.host !== APP_HOST || request.method !== "GET")
    return new Response("Not found", { status: 404 });

  let filePath = resolveContentPath(contentRoot, url.pathname);
  if (filePath === null) return new Response("Not found", { status: 404 });

  let fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
    fileStat = await stat(filePath).catch(() => null);
  }
  if (fileStat === null || !fileStat.isFile())
    return new Response("Not found", { status: 404 });

  const extension = path.extname(filePath).toLowerCase();
  const body = createReadStream(filePath);
  return new Response(Readable.toWeb(body), {
    status: 200,
    headers: responseHeaders(extension),
  });
}
