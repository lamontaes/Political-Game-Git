import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Public gallery counts need classification/family, never local acquisition paths. */
export function publicDriveInventory(value: {
  readonly files: readonly {
    readonly classification: string;
    readonly likelyAssetFamily: string;
  }[];
}) {
  return {
    files: value.files.map(({ classification, likelyAssetFamily }) => ({
      classification,
      likelyAssetFamily,
    })),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const source = JSON.parse(
    readFileSync(
      "art/qa/p95-recent-drive-sweep/drive-image-inventory.json",
      "utf8",
    ),
  );
  writeFileSync(
    "src/environment/public-drive-inventory.generated.json",
    `${JSON.stringify(publicDriveInventory(source), null, 2)}\n`,
  );
}
