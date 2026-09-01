import path from "path";

import { computeCharacterGenerationSignature } from "../../src/presentation/character-components";
import {
  DEV_CHARACTER_FIXTURE_DIRECTORY,
  DEV_CHARACTER_FIXTURE_VERSION,
  renderDevCharacterFixtures,
} from "./dev-character-fixtures";

const repositoryRoot = path.resolve(process.cwd());
const outputDirectory = process.argv[2] ?? DEV_CHARACTER_FIXTURE_DIRECTORY;

const outputs = await renderDevCharacterFixtures(
  repositoryRoot,
  outputDirectory,
);

console.log(
  JSON.stringify(
    {
      version: DEV_CHARACTER_FIXTURE_VERSION,
      generation_signature: computeCharacterGenerationSignature(outputs),
      fixtures: outputs.map((output) => ({
        asset_id: output.assetId,
        final_path: output.repositoryPath,
        hash: output.hash,
        canvas: output.definition.canvas,
      })),
    },
    null,
    2,
  ),
);
