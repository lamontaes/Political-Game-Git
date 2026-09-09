/**
 * Compiling municipal governance from enacted text.
 *
 * The fixture compiler trusts its packs, because a fixture is a transcription
 * of a research pass and says so. This one trusts nothing: for every authored
 * cell that carries evidence it re-reads the locked enacted text and refuses
 * the cell unless the words the author quoted are literally there.
 *
 * That check is the whole difference between a gated corpus and a production
 * one. #120's gate said the repository had not read the charters it was citing.
 * It has now read three of them, and this is where that reading is proved
 * rather than asserted — a marker that moved, a section the publisher rewrote,
 * a quotation typed from memory, all fail the compile.
 */

import {
  containsExcerpt,
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  OpenedArtifact,
  ParseDefect,
  ProductionInput,
} from "../../core/index";
import { municipalSourceById, MUNICIPAL_SOURCES } from "./acquisition";
import { normalizeMunicipalPacks } from "./normalize";
import type { Cell, CitedSourceInput, MunicipalPackInput } from "./parse";
import {
  MUNICIPAL_PRODUCTION_AS_OF,
  MUNICIPAL_PRODUCTION_PACKS,
  PRODUCTION_PACK_ARTIFACTS,
} from "./production-packs";
import type { MunicipalGovernanceRecord } from "./types";

const CELL_STATUSES: ReadonlySet<string> = new Set([
  "KNOWN",
  "UNKNOWN",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "HISTORICAL",
  "NOT_YET_OPERATIVE",
]);

/** States that assert something about an authority, and so owe a quotation. */
const EVIDENCE_BEARING: ReadonlySet<string> = new Set([
  "KNOWN",
  "HISTORICAL",
  "NOT_YET_OPERATIVE",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
]);

function isCell(value: unknown): value is Cell {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { status?: unknown }).status === "string" &&
    CELL_STATUSES.has((value as { status: string }).status)
  );
}

/** Every cell in a pack, with the path it sits at. */
function forEachCell(
  node: unknown,
  path: string,
  visit: (cell: Cell, path: string) => void,
): void {
  if (isCell(node)) {
    visit(node, path);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((entry, index) =>
      forEachCell(entry, `${path}[${index}]`, visit),
    );
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const [key, entry] of Object.entries(node)) {
      forEachCell(entry, path ? `${path}.${key}` : key, visit);
    }
  }
}

export interface MunicipalProductionArtifacts {
  readonly opened: Readonly<Record<string, OpenedArtifact>>;
}

/** Open every declared municipal source through the capability boundary. */
export function openMunicipalProduction(
  lock: ArtifactLock,
): ProductionInput<Readonly<Record<string, OpenedArtifact>>> {
  const roles = Object.fromEntries(
    MUNICIPAL_SOURCES.map((source) => [source.artifactId, source.artifactId]),
  ) as Record<string, string>;
  return openProductionArtifacts("municipal-governance", lock, roles);
}

/**
 * The cited-source rows for a pack, built from the lock rather than authored.
 *
 * A production record's provenance is a fact about a retrieval, so the title,
 * the issuing authority and the retrieval date all come from the declared
 * source and the artifact the acquisition wrote. Nothing here can say a
 * document was retrieved that was not.
 */
function citedSourcesFor(
  packKey: string,
  opened: Readonly<Record<string, OpenedArtifact>>,
): readonly CitedSourceInput[] {
  const artifactIds = PRODUCTION_PACK_ARTIFACTS[packKey];
  if (!artifactIds) {
    throw new Error(
      `Municipal production pack "${packKey}" declares no artifact set.`,
    );
  }
  return artifactIds.map((artifactId) => {
    const spec = municipalSourceById(artifactId);
    const artifact = opened[artifactId];
    if (!artifact) {
      throw new Error(
        `Municipal production pack "${packKey}" cites unopened artifact "${artifactId}".`,
      );
    }
    return {
      sourceKey: artifactId,
      authorityType:
        spec.instrumentKind === "statute"
          ? "Enacted statute or charter"
          : spec.instrumentKind,
      title: spec.instrumentTitle,
      issuingAuthority: spec.enactingBody,
      url: spec.url,
      effectiveDate: null,
      retrievedDate: artifact.artifact.retrieval.retrievedAt.slice(0, 10),
      retrievable: true,
      claimSupported: `Enacted text cut from the retrieved page under the government-edicts determination pinned in the ${artifactId} lock entry.`,
    };
  });
}

/**
 * Check one pack's quotations against the enacted text it cites.
 *
 * A cell that asserts something about an authority must name a source this pack
 * declares, and quote words that are in it. UNKNOWN owes nothing: it is the one
 * state that claims no authority read anything.
 */
function proveExcerpts(
  pack: MunicipalPackInput,
  opened: Readonly<Record<string, OpenedArtifact>>,
  allowed: readonly string[],
  defects: ParseDefect[],
): void {
  const texts = new Map<string, string>();
  for (const artifactId of allowed) {
    const artifact = opened[artifactId];
    if (artifact) texts.set(artifactId, artifact.bytes.toString("utf-8"));
  }

  forEachCell(pack, "", (cell, path) => {
    if (!EVIDENCE_BEARING.has(cell.status)) return;
    const where = `${pack.sourceGovernmentKey}/${path}`;
    if (!cell.sourceKey) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${where}: status ${cell.status} names no source.`,
      });
      return;
    }
    if (!allowed.includes(cell.sourceKey)) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${where}: cites "${cell.sourceKey}", which is not one of this government's retrieved instruments (${allowed.join(", ")}).`,
      });
      return;
    }
    const text = texts.get(cell.sourceKey);
    if (text === undefined) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${where}: cites "${cell.sourceKey}", whose enacted text was not opened.`,
      });
      return;
    }
    if (!cell.excerpt || cell.excerpt.trim().length === 0) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${where}: status ${cell.status} quotes nothing from "${cell.sourceKey}". A production fact carries the words it was read from.`,
      });
      return;
    }
    if (!containsExcerpt(text, cell.excerpt)) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${where}: the quotation "${cell.excerpt.slice(0, 70)}…" is not in the enacted text of "${cell.sourceKey}". The instrument this fact was read from is not the instrument now locked.`,
      });
    }
  });
}

/**
 * Compile the production corpus.
 *
 * Throws rather than returning defects, because a production corpus with a
 * broken citation in it is not a corpus with a warning; it is a corpus that
 * says this repository read something it did not.
 */
export function compileMunicipalProduction(
  input: ProductionInput<Readonly<Record<string, OpenedArtifact>>>,
  corpusAsOf: string = MUNICIPAL_PRODUCTION_AS_OF,
): CompiledCorpus<MunicipalGovernanceRecord, "production"> {
  const opened = input.artifacts;
  const defects: ParseDefect[] = [];

  const packs: MunicipalPackInput[] = MUNICIPAL_PRODUCTION_PACKS.map((pack) => {
    const allowed = PRODUCTION_PACK_ARTIFACTS[pack.sourceGovernmentKey] ?? [];
    proveExcerpts(pack, opened, allowed, defects);
    return {
      ...pack,
      citedSources: citedSourcesFor(pack.sourceGovernmentKey, opened),
    };
  });

  if (defects.length > 0) {
    throw new Error(
      `The municipal production corpus failed ${defects.length} citation checks; the first: ${defects[0]?.message}`,
    );
  }

  const { records, defects: normalizeDefects } = normalizeMunicipalPacks(
    packs,
    corpusAsOf,
  );
  if (normalizeDefects.length > 0) {
    throw new Error(
      `The municipal production packs produced ${normalizeDefects.length} normalization defects, the first being: ${normalizeDefects[0]?.message}`,
    );
  }

  const inputs = MUNICIPAL_SOURCES.filter(
    (source) => opened[source.artifactId] !== undefined,
  ).map((source) => ({
    artifactId: source.artifactId,
    sha256: opened[source.artifactId]!.artifact.bytes.sha256,
  }));

  return {
    corpus: {
      corpusId: "municipal-governance",
      compiler: { name: "municipal-governance", version: "3.0.0" },
      parser: { name: "municipal-governance-enacted-text", version: "1.0.0" },
      inputs,
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Three municipal governments — Charlottesville and Richmond in Virginia and Carson City in Nevada — compiled from the enacted text of their own charters and, where the charter delegates the rule, the Code of Virginia sections that carry it. Chosen for structural difference: a manager plan whose council elects its own mayor, an elected chief-executive mayor with a veto, and a consolidated municipality whose board contains its mayor.",
        boundedSampleReason:
          "The tranche is bounded by publication, not by government. Virginia and Nevada publish municipal charters themselves as enacted acts in retrievable first-party HTML; most states do not, and their charters sit on city sites as PDFs or behind commercial code publishers that refuse a non-browser client. The wider national institutional corpus stays a fixture for exactly that reason.",
      },
    },
    records,
  };
}
