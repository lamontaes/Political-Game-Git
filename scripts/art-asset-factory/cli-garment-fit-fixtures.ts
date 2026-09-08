import path from "path";

import {
  GARMENT_FIT_FIXTURE_DIRECTORY,
  GARMENT_FIT_FIXTURE_VERSION,
  renderGarmentFitFixtures,
} from "./garment-fit-fixtures";

/**
 * Renders the morphology fit fixtures.
 *
 * They are written to `art/fixtures/`, not to the approved bank, and no
 * manifest, provenance or catalog record is created for them. That is the
 * point: they are the yardstick the fit layer is measured against, and a
 * yardstick a person can wear is a yardstick nobody can trust.
 */
const outputs = await renderGarmentFitFixtures(
  path.resolve(process.cwd()),
  GARMENT_FIT_FIXTURE_DIRECTORY,
);

console.log(
  JSON.stringify(
    {
      version: GARMENT_FIT_FIXTURE_VERSION,
      directory: GARMENT_FIT_FIXTURE_DIRECTORY,
      fixtures: outputs.map((output) => ({
        asset_id: output.assetId,
        path: output.repositoryPath,
        hash: output.hash,
      })),
    },
    null,
    2,
  ),
);
