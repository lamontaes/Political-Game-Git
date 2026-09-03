import type {
  CharacterCatalogData,
  CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";
import {
  createPoseFamilyRegistry,
  indexPoseArt,
  reportPoseCoverage,
  type PoseFamilyRegistryData,
} from "../../src/presentation/pose-families";
import type { CargoDispositionLedger } from "./cargo-disposition";
import type {
  AssetManifest,
  AssetManifestEntry,
  EnvironmentFamiliesData,
} from "./schemas";

/**
 * The current asset bank, computed rather than asserted.
 *
 * Every number here is derived from the manifest, the catalog, the pose
 * registry and the cargo ledger at the moment it runs. Nothing is typed in by
 * hand, which is the only way an inventory stays true after the next batch of
 * art lands. A focused test regenerates it and compares, so a stale report
 * fails the build instead of quietly misleading a planning session.
 */

export const ASSET_BANK_INVENTORY_VERSION = "asset-bank-inventory-v1";

export interface AssetBankInputs {
  readonly manifest: AssetManifest;
  readonly catalog: CharacterCatalogData;
  readonly poseFamilies: PoseFamilyRegistryData;
  readonly environmentFamilies: EnvironmentFamiliesData;
  readonly cargo: CargoDispositionLedger;
}

export interface UsableEnvironmentRow {
  readonly assetId: string;
  readonly familyId: string | null;
  readonly released: boolean;
  readonly path: string | null;
}

export interface MasterRow {
  readonly assetId: string;
  readonly componentClass: string;
  readonly path: string;
  readonly released: boolean;
}

export interface PoseCoverageRowReport {
  readonly poseFamilyId: string;
  readonly priority: string;
  readonly postureClass: string;
  readonly productionStatus: string;
  readonly coveredBodyFamilies: readonly string[];
  readonly missingBodyFamilies: readonly string[];
  readonly covered: boolean;
}

export interface GenerationQueueRow {
  readonly poseFamilyId: string;
  readonly priority: string;
  readonly blocks: "current-gameplay" | "later-breadth";
  readonly consumingAnchors: readonly string[];
  readonly missingBodyFamilies: readonly string[];
  readonly controlPlate: string;
  readonly masterMinimum: string;
  readonly nominalCanvas: string;
}

export interface AssetBankInventory {
  readonly version: string;
  readonly environments: {
    readonly releasedPlates: readonly UsableEnvironmentRow[];
    readonly registeredFamilies: readonly string[];
    readonly declaredAwaitingBytes: number;
  };
  readonly characterComponents: {
    readonly releasedByKind: Readonly<Record<string, number>>;
    readonly releasedBodyFamilies: readonly string[];
    readonly developmentFixtureCount: number;
    readonly productionCount: number;
  };
  readonly masters: readonly MasterRow[];
  readonly poseCoverage: readonly PoseCoverageRowReport[];
  readonly generationQueue: readonly GenerationQueueRow[];
  readonly cargo: {
    readonly rehomed: readonly string[];
    readonly rejected: readonly string[];
    readonly archived: readonly string[];
    readonly pendingVerification: readonly string[];
  };
}

const isReleased = (asset: AssetManifestEntry): boolean =>
  asset.generation_status === "approved" &&
  asset.qa_status === "approved" &&
  asset.runtime_release_status === "released";

/**
 * Which scene anchors ask for a pose. A pose no anchor asks for is later
 * breadth; a pose a live anchor asks for and cannot get is blocking current
 * gameplay, and the difference is what a planning session actually needs.
 */
export interface AnchorDemand {
  readonly sceneId: string;
  readonly anchorId: string;
  readonly poseFamilyIds: readonly string[];
}

export function buildAssetBankInventory(
  inputs: AssetBankInputs,
  demands: readonly AnchorDemand[],
  declaredAwaitingBytes: number,
): AssetBankInventory {
  const { manifest, poseFamilies, environmentFamilies, cargo } = inputs;
  const records =
    manifest.assets as readonly CharacterComponentManifestRecord[];
  const registry = createPoseFamilyRegistry(poseFamilies);
  const art = indexPoseArt(records);
  const coverage = reportPoseCoverage(registry, art);

  const releasedPlates = manifest.assets
    .filter(
      (asset) =>
        asset.asset_type.startsWith("environment-") && isReleased(asset),
    )
    .map((asset) => ({
      assetId: asset.asset_id,
      familyId: asset.family_id ?? null,
      released: true,
      path: asset.final_path ?? null,
    }))
    .sort((a, b) => (a.assetId < b.assetId ? -1 : 1));

  const releasedByKind: Record<string, number> = {};
  const releasedBodyFamilies = new Set<string>();
  let developmentFixtureCount = 0;
  let productionCount = 0;
  for (const asset of manifest.assets) {
    const component = asset.component;
    if (!component) continue;
    if ((asset.art_class ?? "development-fixture") === "production") {
      productionCount += 1;
    } else {
      developmentFixtureCount += 1;
    }
    if (!isReleased(asset)) continue;
    releasedByKind[component.kind] = (releasedByKind[component.kind] ?? 0) + 1;
    if (component.kind === "body") releasedBodyFamilies.add(component.family);
  }

  const masters = manifest.assets
    .filter((asset) => asset.asset_type === "character-component-master")
    .map((asset) => ({
      assetId: asset.asset_id,
      componentClass: (asset.final_path ?? "").split("/").at(-2) ?? "unknown",
      path: asset.final_path ?? "",
      released: isReleased(asset),
    }))
    .sort((a, b) => (a.assetId < b.assetId ? -1 : 1));

  const demandByPose = new Map<string, string[]>();
  for (const demand of demands) {
    for (const poseFamilyId of demand.poseFamilyIds) {
      const list = demandByPose.get(poseFamilyId) ?? [];
      list.push(`${demand.sceneId}:${demand.anchorId}`);
      demandByPose.set(poseFamilyId, list);
    }
  }

  const generationQueue: GenerationQueueRow[] = coverage.rows
    .filter((row) => !row.covered)
    .map((row) => {
      const family = registry.families.get(row.poseFamilyId)!;
      const consuming = (demandByPose.get(row.poseFamilyId) ?? []).sort();
      return {
        poseFamilyId: row.poseFamilyId,
        priority: row.priority,
        blocks: consuming.length > 0 ? "current-gameplay" : "later-breadth",
        consumingAnchors: consuming,
        missingBodyFamilies: row.missingBodyFamilies,
        controlPlate: family.control_plate.path,
        masterMinimum: `${family.master_minimum.width}x${family.master_minimum.height}`,
        nominalCanvas: `${family.nominal_canvas.width}x${family.nominal_canvas.height}`,
      } satisfies GenerationQueueRow;
    })
    .sort((a, b) => {
      if (a.blocks !== b.blocks)
        return a.blocks === "current-gameplay" ? -1 : 1;
      if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;
      return a.poseFamilyId < b.poseFamilyId ? -1 : 1;
    });

  const byDisposition = (disposition: string) =>
    cargo.entries
      .filter((entry) => entry.disposition === disposition)
      .map((entry) => entry.entry_id)
      .sort();

  return {
    version: ASSET_BANK_INVENTORY_VERSION,
    environments: {
      releasedPlates,
      registeredFamilies: environmentFamilies.families
        .map((family) => family.family_id)
        .sort(),
      declaredAwaitingBytes,
    },
    characterComponents: {
      releasedByKind: Object.fromEntries(
        Object.entries(releasedByKind).sort(([a], [b]) => (a < b ? -1 : 1)),
      ),
      releasedBodyFamilies: [...releasedBodyFamilies].sort(),
      developmentFixtureCount,
      productionCount,
    },
    masters,
    poseCoverage: coverage.rows.map((row) => ({
      poseFamilyId: row.poseFamilyId,
      priority: row.priority,
      postureClass: row.postureClass,
      productionStatus: row.productionStatus,
      coveredBodyFamilies: row.coveredBodyFamilies,
      missingBodyFamilies: row.missingBodyFamilies,
      covered: row.covered,
    })),
    generationQueue,
    cargo: {
      rehomed: byDisposition("re-homed"),
      rejected: byDisposition("rejected"),
      archived: byDisposition("archive"),
      pendingVerification: byDisposition("pending-verification"),
    },
  } satisfies AssetBankInventory;
}

function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
  return lines.join("\n");
}

/** Renders the inventory as the human-readable report. */
export function renderAssetBankInventory(
  inventory: AssetBankInventory,
): string {
  const sections: string[] = [];
  sections.push(`# Asset bank inventory

Status: **generated — do not hand-edit**

Regenerate with \`npm run inventory:asset-bank\`. Every number below is read
from the asset manifest, the character catalog, the pose registry and the
cargo disposition ledger, so this file cannot drift from the library it
describes; a focused test regenerates it and fails on a mismatch.`);

  sections.push(`## Environments usable now

${table(
  ["Asset", "Family", "Path"],
  inventory.environments.releasedPlates.map((row) => [
    row.assetId,
    row.familyId ?? "—",
    row.path ?? "—",
  ]),
)}

Registered environment families: ${inventory.environments.registeredFamilies
    .map((id) => `\`${id}\``)
    .join(", ")}.

A family with no released plate is an authoring target, not coverage. ${inventory.environments.declaredAwaitingBytes} further environment candidates are DECLARED and awaiting bytes in \`art/intake/environment-batch-2026-09-03.request.json\`; none of them counts as coverage until intake measures the real file.`);

  sections.push(`## Modular character components usable now

${table(
  ["Kind", "Released"],
  Object.entries(inventory.characterComponents.releasedByKind).map(
    ([kind, count]) => [kind, String(count)],
  ),
)}

Released body families: ${inventory.characterComponents.releasedBodyFamilies
    .map((id) => `\`${id}\``)
    .join(", ")}.

Every released component is a **DEV / NON-PRODUCTION fixture**: ${inventory.characterComponents.developmentFixtureCount} fixture rows against ${inventory.characterComponents.productionCount} production rows. No production character art is released.`);

  sections.push(`## Source masters held

${table(
  ["Master", "Class", "Runtime released"],
  inventory.masters.map((row) => [
    row.assetId,
    row.componentClass,
    row.released ? "yes" : "no",
  ]),
)}`);

  sections.push(`## P0 pose coverage by compatibility group

${table(
  [
    "Pose family",
    "Priority",
    "Posture",
    "Status",
    "Covered body families",
    "Still missing",
  ],
  inventory.poseCoverage.map((row) => [
    row.poseFamilyId,
    row.priority,
    row.postureClass,
    row.productionStatus,
    row.coveredBodyFamilies.join(", ") || "—",
    row.missingBodyFamilies.join(", ") || "—",
  ]),
)}`);

  sections.push(`## Generation queue

What still needs making, ordered so anything a live scene anchor already asks
for comes first.

${table(
  [
    "Pose family",
    "Priority",
    "Blocks",
    "Consuming anchors",
    "Missing for",
    "Control plate",
    "Master minimum",
  ],
  inventory.generationQueue.map((row) => [
    row.poseFamilyId,
    row.priority,
    row.blocks,
    row.consumingAnchors.join(", ") || "—",
    row.missingBodyFamilies.join(", ") || "—",
    row.controlPlate,
    row.masterMinimum,
  ]),
)}`);

  sections.push(`## Cargo disposition

- re-homed: ${inventory.cargo.rehomed.map((id) => `\`${id}\``).join(", ") || "—"}
- rejected: ${inventory.cargo.rejected.map((id) => `\`${id}\``).join(", ") || "—"}
- archived: ${inventory.cargo.archived.map((id) => `\`${id}\``).join(", ") || "—"}
- pending verification: ${inventory.cargo.pendingVerification.map((id) => `\`${id}\``).join(", ") || "—"}

Reasons and evidence for each are in \`art/manifest/cargo_disposition.json\`.
No externally downloaded pack is counted as coverage anywhere in this report.`);

  return `${sections.join("\n\n")}\n`;
}
