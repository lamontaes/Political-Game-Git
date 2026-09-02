import path from "path";

import { computeCharacterGenerationSignature } from "../../src/presentation/character-components";
import {
  PG_MODULAR_INTAKE_VERSION,
  PG_MODULAR_OUTPUT_DIRECTORY,
  runPgModularIntake,
} from "./pg-modular-intake";

const repositoryRoot = path.resolve(process.cwd());
const outputDirectory = process.argv[2] ?? PG_MODULAR_OUTPUT_DIRECTORY;

const outputs = await runPgModularIntake(repositoryRoot, outputDirectory);

console.log(
  JSON.stringify(
    {
      version: PG_MODULAR_INTAKE_VERSION,
      generation_signature: computeCharacterGenerationSignature(outputs),
      outputs: outputs.map((output) => ({
        asset_id: output.assetId,
        kind: output.kind,
        final_path: output.repositoryPath,
        hash: output.hash,
        canvas: output.definition.canvas,
        origin: output.definition.origin ?? output.definition.root,
        anchors: output.definition.attachment_anchors,
        master: output.master.repositoryPath,
        scale: Number(output.normalization.scale.toFixed(4)),
        rig: output.normalization.rig,
      })),
    },
    null,
    2,
  ),
);
