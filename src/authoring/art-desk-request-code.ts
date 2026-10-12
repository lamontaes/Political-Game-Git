import type { AssetRequest } from "./asset-request";
import type { ArtbenchProjection } from "./artbench";

/** Stable display alias, carried by the existing append-only asset tags. */
export function requestDisplayCode(
  projection: ArtbenchProjection,
  requestId: string,
): string | null {
  const row = projection.requests[requestId];
  if (!row) return null;
  const prefix = `${requestId}:`;
  const value = projection.assets[row.assetId]?.tags.requestCode?.find(
    (value) => value.startsWith(prefix),
  );
  const code = value?.slice(prefix.length);
  return code && /^A\d{2,}$/.test(code) ? code : null;
}

/** The copy field and clipboard use exactly the same bounded string. */
export function codedGenerationPrompt(
  request: AssetRequest,
  code: string | null,
  prompt: string,
): string {
  return code
    ? `${code}-R${request.requestVersion}. Tracking only; no lettering. ${prompt}`
    : prompt;
}
