import fs from "fs";
import path from "path";

import { measureFigure, measureScene } from "./measure-reference";

/**
 * Writes the Measurement Cards for every reference raster the repository holds.
 *
 * `npm run measure:references`. The output is the numbers the generation pack
 * quotes, so it lives in the repository rather than only in a document: the
 * next agent reads the JSON instead of measuring the same pixels again, and a
 * prompt that cites a figure can be checked against the file that produced it.
 */

const REPOSITORY_ROOT = path.resolve(process.cwd());
const OUTPUT = path.join(
  REPOSITORY_ROOT,
  "art/qa/p76/reference_measurements.json",
);

const SCENE_DIR = "art/references/masters/scene-environment";
const FIGURE_DIRS = [
  "art/generated/candidates/ocd-p71/bodies",
  "art/generated/candidates/ocd-p76/bodies-despilled",
  "art/generated/candidates/ocd-p71/heads",
  "art/generated/candidates/ocd-p71/footwear",
];

function listRasters(relativeDir: string): string[] {
  const absolute = path.join(REPOSITORY_ROOT, relativeDir);
  if (!fs.existsSync(absolute)) return [];
  return fs
    .readdirSync(absolute)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort()
    .map((name) => path.join(relativeDir, name));
}

function main(): void {
  const scenes = listRasters(SCENE_DIR).map((relative) => {
    const card = measureScene(path.join(REPOSITORY_ROOT, relative));
    return { ...card, file: relative };
  });

  const figures = FIGURE_DIRS.flatMap((dir) =>
    listRasters(dir).map((relative) => {
      const card = measureFigure(path.join(REPOSITORY_ROOT, relative));
      return { ...card, file: relative };
    }),
  );

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(
    OUTPUT,
    `${JSON.stringify(
      {
        tool: "p76-reference-measurement-v1",
        measured_on: "2026-09-04",
        note: "Measurement Cards read from the rasters this repository holds. Every field carries a confidence: MEASURED means an operation with no free parameters read it off the pixels; the estimate levels mean a heuristic did, and say which one. Nothing here identifies an object — a flat rectangle is reported as a flat rectangle, not as a whiteboard. Regenerate with `npm run measure:references`.",
        scenes,
        figures,
      },
      null,
      2,
    )}\n`,
  );

  for (const scene of scenes) {
    const horizon = scene.horizonY.value;
    process.stdout.write(
      `${path.basename(scene.file).padEnd(60)} ${scene.width}x${scene.height} ${scene.aspectRatio.padEnd(7)} horizon ${
        horizon ? `${horizon.px}px (${horizon.percent}%)` : "UNKNOWN"
      } [${scene.horizonY.confidence}] flat regions ${scene.dynamicSurfaceCandidates.value?.length ?? 0}\n`,
    );
  }
  process.stdout.write(
    `\n${scenes.length} scene cards, ${figures.length} figure cards -> ${path.relative(REPOSITORY_ROOT, OUTPUT)}\n`,
  );
}

main();
