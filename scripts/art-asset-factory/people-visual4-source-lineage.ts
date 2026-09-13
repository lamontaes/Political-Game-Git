import fs from "fs";
import path from "path";

import visual4Registry from "../../art/manifest/character_candidate_visual4_registry.json";
import bottomAttachments from "../../art/manifest/people_visual4_bottom_attachments.json";
import topAttachments from "../../art/manifest/people_visual4_top_attachments.json";
import type { CharacterComponentCandidateDefinition } from "../../src/presentation/character-components";

/**
 * Where a Visual4 component actually came from, end to end.
 *
 * ## Why this exists
 *
 * A requirements report in this same directory measured the LEGACY
 * `art/references/masters/pg-modular` flat lays — 108-192px design masters —
 * found they were far too small to dress a 960px body, and stated the
 * conclusion as though it were about the project's garment sources in general.
 * It was not. The current source authority is the p95 recent-drive-sweep bank,
 * whose sheets are 3584x4800 and 4336x5804 and whose chopped garment crops
 * export at 625x1220 (bottoms), 924x1000 (female tops), 960x1038 (male tops)
 * and 1425x1017 (front-facing footwear). There is no resolution shortage in the
 * bank that the game actually consumes, and a reader of that report could not
 * have known which set it was talking about.
 *
 * The repair is not another report. It is making the chain explicit in the data
 * itself, so a tool that walks one source set cannot be read as speaking for
 * another:
 *
 *   Drive id + canonical label
 *     -> original sheet: repository path, SHA-256, real IHDR dimensions
 *       -> chop report: the deterministic cell boxes it produced
 *         -> crop: exported raster and its own SHA-256
 *           -> attachment authoring: the references measured on that crop
 *             -> registry record: the candidate component
 *               -> pairing: which body families and pose families it declares
 *                 -> consumer: what reads it at runtime
 *
 * Every link is READ from data already in the repository. Nothing here chops,
 * derives, measures fit, or writes a raster, and no Drive file is fetched: the
 * Drive ids are recorded as labels so a human can match a file they are looking
 * at to the bytes already committed, and the SHA-256 is what actually proves
 * identity.
 */

export const VISUAL4_LINEAGE_SCHEMA = "people-visual4-source-lineage-v1";

/**
 * The source sheets the owner verified by download on 2026-09-11, by hash.
 *
 * Recorded here so the repository can answer "is the file I am looking at the
 * one you already have" without another download. A Drive id is a label and
 * proves nothing on its own; the SHA-256 beside it is the identity.
 *
 * The side/angled footwear sheet is deliberately listed WITHOUT a repository
 * path. Its original is confirmed to exist and its lineage into this repository
 * has not been re-established — which is a known gap, not a reason to treat the
 * front-on sheet as its replacement. They are different views with different
 * uses, and neither retires the other.
 */
export interface VerifiedSourceSheet {
  readonly label: string;
  readonly driveId: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  /** Null when the original is confirmed but its repository lineage is not. */
  readonly repositoryPath: string | null;
  readonly chopReport: string | null;
  readonly view: string;
  readonly note?: string;
}

export const VERIFIED_SOURCE_SHEETS: readonly VerifiedSourceSheet[] = [
  {
    label: "front-on footwear",
    driveId: "1KNK6hMvWm7vh4fTWgfO55PgTvDlxAq8B",
    sha256: "8a7bf15e8b045edefa31dbd02d8b17a3984f9f6a967cc5eba2cfff4d69d1a402",
    width: 4336,
    height: 5804,
    repositoryPath:
      "art/references/candidates/recent-drive-sweep/source-images/shoes.png",
    chopReport: "art/qa/p95-recent-drive-sweep/shoes-chop.json",
    view: "front-on",
    note: "The filename says 3584x4800; the actual IHDR is 4336x5804. The bytes are what identify it.",
  },
  {
    label: "female tops",
    driveId: "19dGnjU0la2A834nNtXqYGx1j85EheOjE",
    sha256: "24f08760efcb553771b52a21a5025a663f5b6ceebf75a1f7514d5a1a25ea5a6b",
    width: 3584,
    height: 4800,
    repositoryPath:
      "art/references/candidates/recent-drive-sweep/source-images/female top.png",
    chopReport: "art/qa/p95-recent-drive-sweep/female-tops-chop.json",
    view: "front-on",
  },
  {
    label: "male tops",
    driveId: "1dHAiQ5Ng5Nl0JQb3ijvWsR2a39Vts4Ia",
    sha256: "f8404c6b67480e8d20e22c8895f135b865920b5970cc27dfc2a2eaa72a9da7a8",
    width: 3584,
    height: 4800,
    repositoryPath:
      "art/references/candidates/recent-drive-sweep/source-images/male tops.png",
    chopReport: "art/qa/p95-recent-drive-sweep/male-tops-chop.json",
    view: "front-on",
  },
  {
    label: "male bottoms",
    driveId: "1Ch4ybsCFLc-RmZxX_tjWBg8wnTpBU7Vd",
    sha256: "9afbb75c07d9343d43150bced2ecf21cbbd1583ef540081823d2aa31b02fdf64",
    width: 3584,
    height: 4800,
    repositoryPath:
      "art/references/candidates/recent-drive-sweep/source-images/male bottom.png",
    chopReport: "art/qa/p95-recent-drive-sweep/male-bottoms-chop.json",
    view: "front-on",
  },
  {
    label: "side/angled footwear",
    driveId: "1jBk1vKalYhSTXn2VE0S-7RISCuw7M0jW",
    sha256: "fa1abe93d5abe3a0a93d580a7910fd2abf2bd9372c2e913eb5699c52a441989b",
    width: 3584,
    height: 4800,
    repositoryPath: null,
    chopReport: null,
    view: "side/angled",
    note: "Original confirmed; repository lineage not re-established. A different view from the front-on sheet, with different uses. Neither replaces the other and neither is retired.",
  },
];

interface ChopCell {
  readonly cellId: string;
  readonly outputPath: string;
  readonly sha256: string;
  readonly exportWidth: number;
  readonly exportHeight: number;
  readonly sourceBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

interface ChopReport {
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly cells: readonly ChopCell[];
}

interface AttachmentAsset {
  readonly asset_id: string;
  readonly source: {
    readonly repository_path: string;
    readonly sha256: string;
    readonly width_px?: number;
    readonly height_px?: number;
  };
}

interface RegistryAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly candidate_component?: CharacterComponentCandidateDefinition;
}

export interface ComponentLineage {
  readonly sheetLabel: string;
  readonly driveId: string;
  readonly sheetSha256: string;
  readonly cellId: string;
  /** The crop the chop exported, with its own bytes identity and real size. */
  readonly crop: {
    readonly path: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
  };
  /** The authoring record that measured references on that crop, when present. */
  readonly attachmentAssetId: string | null;
  /** The candidate component the registry carries, when one was derived. */
  readonly registryAssetId: string | null;
  readonly kind: string | null;
  readonly compatibleBodyFamilies: readonly string[];
  readonly compatiblePoseFamilies: readonly string[];
  /** True once this crop reaches a component a runtime consumer can select. */
  readonly reachesRuntime: boolean;
}

function readJson<T>(repositoryRoot: string, relative: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, relative), "utf8"),
  ) as T;
}

/**
 * Walks every verified sheet that has a repository lineage, cell by cell.
 *
 * A cell with no registry record is not an error and is not hidden: it is a
 * crop the project owns and has not yet derived a component from, which is
 * exactly the kind of gap worth being able to see.
 */
export function buildVisual4SourceLineage(
  repositoryRoot: string,
): readonly ComponentLineage[] {
  const attachments = [
    ...(topAttachments as { assets: AttachmentAsset[] }).assets,
    ...(bottomAttachments as { assets: AttachmentAsset[] }).assets,
  ];
  const attachmentBySource = new Map(
    attachments.map((asset) => [asset.source.repository_path, asset]),
  );
  const registry = (visual4Registry as { assets: RegistryAsset[] }).assets;

  const lineage: ComponentLineage[] = [];
  for (const sheet of VERIFIED_SOURCE_SHEETS) {
    if (!sheet.chopReport) continue;
    const chop = readJson<ChopReport>(repositoryRoot, sheet.chopReport);
    for (const cell of chop.cells) {
      const attachment = attachmentBySource.get(cell.outputPath) ?? null;
      /*
       * The registry names a derived component after the authoring asset, with
       * the line's own prefix. Matching on that rather than on a path keeps the
       * link readable when a derivation changes where it writes.
       */
      const record =
        registry.find(
          (entry) =>
            attachment !== null &&
            entry.asset_id === `pv4_${attachment.asset_id}`,
        ) ?? null;
      const definition = record?.candidate_component ?? null;
      lineage.push({
        sheetLabel: sheet.label,
        driveId: sheet.driveId,
        sheetSha256: sheet.sha256,
        cellId: cell.cellId,
        crop: {
          path: cell.outputPath,
          sha256: cell.sha256,
          width: cell.exportWidth,
          height: cell.exportHeight,
        },
        attachmentAssetId: attachment?.asset_id ?? null,
        registryAssetId: record?.asset_id ?? null,
        kind: definition?.kind ?? null,
        compatibleBodyFamilies: definition?.compatible_body_families ?? [],
        compatiblePoseFamilies: definition?.compatible_pose_families ?? [],
        reachesRuntime: record !== null,
      });
    }
  }
  return lineage;
}

/** The smallest crop this bank actually offers, per kind. */
export function smallestCropByKind(
  lineage: readonly ComponentLineage[],
): Readonly<Record<string, { width: number; height: number }>> {
  const smallest: Record<string, { width: number; height: number }> = {};
  for (const entry of lineage) {
    const kind = entry.kind ?? "unconsumed";
    const current = smallest[kind];
    if (!current || entry.crop.width < current.width)
      smallest[kind] = {
        width: entry.crop.width,
        height: entry.crop.height,
      };
  }
  return smallest;
}
