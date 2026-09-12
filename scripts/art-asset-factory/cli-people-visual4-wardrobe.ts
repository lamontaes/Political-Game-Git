import path from "path";
import { fileURLToPath } from "url";

import {
  VISUAL4_WARDROBE_REPORT_PATH,
  VISUAL4_WARDROBE_REPORT_SCHEMA,
  VISUAL4_WARDROBE_VERSION,
  measureVisual4WardrobeRequirements,
} from "./people-visual4-wardrobe";
import { writeFormatted } from "./write-formatted";

/**
 * `npm run measure:visual4-wardrobe`
 *
 * Writes, per (garment master, Visual4 body, pose), the size the master has and
 * the size that body needs. It derives nothing and approves nothing; it turns
 * the pipeline's "recover a sufficient native source" refusal into the exact
 * pixel dimensions that would satisfy it.
 *
 * The report is generated and checked in, so re-running on an unchanged tree
 * must produce identical bytes; `--check` asserts that without writing.
 */

const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const requirements =
    await measureVisual4WardrobeRequirements(REPOSITORY_ROOT);

  const blocked = requirements.filter((entry) => entry.needsEnlargement);
  const derivable = requirements.filter((entry) => !entry.needsEnlargement);

  /* Grouped by master, because a master is what somebody would go and redraw. */
  const byMaster = new Map<string, typeof blocked>();
  for (const entry of blocked) {
    const list = byMaster.get(entry.master) ?? [];
    list.push(entry);
    byMaster.set(entry.master, list);
  }
  const requests = [...byMaster.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([master, entries]) => ({
      master,
      masterSet: entries[0]!.masterSet,
      kind: entries[0]!.kind,
      available: entries[0]!.available,
      bodiesBlocked: entries.length,
      /* One master serves every body, so the largest requirement is the one
         that has to be satisfied; anything smaller still blocks somebody. */
      minimumNativeSize: {
        width: Math.max(...entries.map((entry) => entry.required.width)),
        height: Math.max(...entries.map((entry) => entry.required.height)),
      },
      worstEnlargement: {
        x: Math.max(...entries.map((entry) => entry.scale.x)),
        y: Math.max(...entries.map((entry) => entry.scale.y)),
      },
      bodies: entries.map((entry) => ({
        body: entry.body,
        bodyFamily: entry.bodyFamily,
        poseFamily: entry.poseFamily,
        required: entry.required,
      })),
    }));

  await writeFormatted(
    path.join(REPOSITORY_ROOT, VISUAL4_WARDROBE_REPORT_PATH),
    JSON.stringify({
      schema: VISUAL4_WARDROBE_REPORT_SCHEMA,
      generator: VISUAL4_WARDROBE_VERSION,
      scope: "LEGACY pg-modular design masters only.",
      doesNotCover:
        "The p95 recent-drive-sweep bank that people-visual4.ts actually consumes. Those sheets are 3584x4800 and 4336x5804 and their garment crops export at 625x1220 to 1425x1017; 35 of 36 wardrobe crops already reach a wearable component. Nothing in this report is evidence about them. See scripts/art-asset-factory/people-visual4-source-lineage.ts.",
      note: "Sizes only. No raster is derived, nothing is admitted, and no art is approved. Within this legacy set, a master would have to be recovered at or above minimumNativeSize for the pipeline to derive it without enlargement.",
      pairsConsidered: requirements.length,
      derivableWithoutEnlargement: derivable.length,
      blockedByEnlargement: blocked.length,
      requests,
      pairs: requirements,
    }),
    check,
  );

  console.log(
    `visual4-wardrobe requirements (LEGACY pg-modular masters only) — ${requirements.length} pairs, ${derivable.length} derivable without enlargement, ${blocked.length} blocked`,
  );
  console.log(
    "  NOT a statement about the p95 recent-drive-sweep bank the runtime consumes.",
  );
  for (const request of requests)
    console.log(
      `  ${request.master}: have ${request.available.width}x${request.available.height}, need >= ${request.minimumNativeSize.width}x${request.minimumNativeSize.height} (${request.bodiesBlocked} bodies)`,
    );
}

await main();
