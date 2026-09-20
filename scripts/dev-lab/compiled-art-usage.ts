/** Build-time projection of existing consumer bindings and verified bundled bytes. */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import manifest from "../../art/manifest/asset_manifest.json";
import {
  OPENING_INFORMATION_PLATES,
  PLAYTEST65_WHITE_HOUSE_LAYOUT,
} from "../../src/presentation/playtest65-visual-layout";
import { OPENING_REGIONAL_CANDIDATES } from "../../src/presentation/opening-regional-candidates";
import { openingRegionalEligibilityLabels } from "../../src/presentation/opening-regional-eligibility";
import type { BuildArtBinding } from "../../src/authoring/art-desk-usage";

const root = process.cwd();
const client = join(root, "dist/client");
const assets = join(client, "assets");
const files = existsSync(assets) ? readdirSync(assets) : [];
const consumers =
  process.env.VITE_OCD_BUILD_PROFILE === "internal-art-review"
    ? [
        {
          assetId: PLAYTEST65_WHITE_HOUSE_LAYOUT.assetId,
          labels: [
            "Title screen",
            "National introduction",
            "White House · Washington, D.C.",
          ],
          eligible: ["White House illustration"],
        },
        ...Object.values(OPENING_INFORMATION_PLATES).map((plate) => ({
          assetId: plate.assetId,
          labels: [plate.caption],
          eligible: [
            "Local-government introduction",
            "Generic civic illustration",
          ],
        })),
        ...OPENING_REGIONAL_CANDIDATES.map((plate) => ({
          assetId: plate.assetId,
          labels: ["Home-region introduction"],
          eligible: (() => {
            const scope = openingRegionalEligibilityLabels(plate);
            return [
              ...scope.regions,
              ...scope.places,
              ...scope.states,
              ...(scope.months ?? []),
            ].flatMap((item) => (item.label ? [item.label] : []));
          })(),
        })),
      ]
    : [];
const bindings: BuildArtBinding[] = [];
for (const consumer of consumers) {
  const asset = manifest.assets.find(
    (row) => row.asset_id === consumer.assetId,
  );
  if (!asset?.hash || !asset.final_path) continue;
  const stem = basename(asset.final_path, extname(asset.final_path));
  const shipped = files.find(
    (file) =>
      file.startsWith(`${stem}-`) &&
      createHash("sha256")
        .update(readFileSync(join(assets, file)))
        .digest("hex") === asset.hash,
  );
  if (!shipped) continue;
  bindings.push({
    assetId: asset.asset_id,
    sourceSha256: asset.hash,
    derivativeSha256: asset.hash,
    derivativePath: `assets/${shipped}`,
    useLabels: consumer.labels,
    eligible: consumer.eligible,
  });
}
writeFileSync(
  join(client, "art-usage.json"),
  JSON.stringify(
    {
      schema: "ocd-compiled-art-usage-v1",
      sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      bindings,
    },
    null,
    2,
  ) + "\n",
);
