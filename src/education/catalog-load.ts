import { expandInstitution } from "./compact";
import type { CompactInstitution, EducationDictionary } from "./compact";
import type { EducationInstitution } from "./types";

/**
 * Fetching the education catalogs, and refusing bytes that are not theirs.
 *
 * This was inline in `EducationOptionsPanel`'s effect. It is lifted out for one
 * reason: a refusal nothing can drive is a refusal nothing has checked. The
 * test that was supposed to be its negative control only hashed a byte array
 * with its own helper and asserted that changing a byte changed the digest —
 * which is a property of SHA-256, not of this repository. Deleting the check
 * would not have failed it. Now the check has a seam a test can call with
 * tampered bytes and watch it throw.
 *
 * `fetchImpl` is injected for exactly that, and defaults to the real thing.
 *
 * What this does NOT establish, and what nothing in this repository currently
 * establishes, is that the committed catalogs are what
 * `scripts/source/export-education.ts` would produce from its inputs. Every
 * check here compares a file against a digest written beside it by the same
 * export run, so a corrupted GENERATION is internally consistent and passes.
 * That is a real gap, recorded rather than papered over.
 */

export interface CatalogChunk {
  readonly kind: string;
  readonly path: string;
  readonly sha256: string;
  readonly recordCount: number;
}

export interface CatalogManifest {
  readonly chunks: readonly CatalogChunk[];
}

export type FetchLike = (input: string) => Promise<{
  readonly ok: boolean;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Every institution in the chunks matching `kind`, or a thrown refusal.
 *
 * The refusals are the point. A manifest naming a path that is not
 * content-addressed, bytes whose digest is not the one the manifest states, or
 * a chunk holding a different number of records than it promised are all
 * refused rather than shown to a player as a directory.
 */
export async function loadEducationCatalog(
  kind: string,
  fetchImpl: FetchLike = ((input: string) =>
    fetch(input)) as unknown as FetchLike,
): Promise<readonly EducationInstitution[]> {
  const manifestResponse = await fetchImpl("/education/manifest.json");
  if (!manifestResponse.ok) throw new Error("Directory manifest unavailable");
  const manifest = (await manifestResponse.json()) as CatalogManifest;

  const rows: EducationInstitution[] = [];
  for (const chunk of manifest.chunks.filter(
    (entry) => !kind || entry.kind === kind,
  )) {
    if (!/^catalog-[a-f0-9]{64}\.json$/.test(chunk.path))
      throw new Error("Invalid directory manifest");
    const response = await fetchImpl(`/education/${chunk.path}`);
    if (!response.ok) throw new Error("Directory unavailable");
    const bytes = await response.arrayBuffer();
    if ((await sha256Hex(bytes)) !== chunk.sha256)
      throw new Error("Directory integrity check failed");
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
      dictionary: EducationDictionary;
      records: CompactInstitution[];
    };
    const chunkRows = payload.records.map((record) =>
      expandInstitution(record, payload.dictionary),
    );
    if (chunkRows.length !== chunk.recordCount)
      throw new Error("Incomplete directory");
    rows.push(...chunkRows);
  }
  return rows;
}
