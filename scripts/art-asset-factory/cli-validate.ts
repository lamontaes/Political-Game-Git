import fs from "fs";
import path from "path";
import { validateArtAssets } from "./validate";

const REPO_ROOT = path.resolve(process.cwd());

function loadJson(relPath: string) {
  try {
    const fullPath = path.join(REPO_ROOT, relPath);
    const content = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(content);
  } catch {
    console.error(`Error loading ${relPath}`);
    process.exit(1);
  }
}

const manifest = loadJson("art/manifest/asset_manifest.json");
const families = loadJson("art/manifest/environment_families.json");
const deltas = loadJson("art/manifest/jurisdiction_deltas.json");
const provenance = loadJson("art/manifest/provenance.json");
const characterCatalog = loadJson("art/manifest/character_catalog.json");

const result = validateArtAssets(manifest, families, deltas, provenance, {
  repositoryRoot: REPO_ROOT,
  characterCatalog,
});

if (result.valid) {
  console.log("Validation passed.");
  process.exit(0);
} else {
  console.error("Validation failed:");
  result.errors.forEach((err) => console.error(` - ${err}`));
  process.exit(1);
}
