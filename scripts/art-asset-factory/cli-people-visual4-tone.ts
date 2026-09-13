import path from "path";
import { fileURLToPath } from "url";

import {
  VISUAL4_TONE_PATH,
  VISUAL4_TONE_SCHEMA,
  TONE_SAMPLE_WINDOWS,
  measureVisual4Tones,
} from "./people-visual4-tone";
import { writeFormatted } from "./write-formatted";

/**
 * `npm run measure:visual4-tone`
 *
 * Writes the measured skin tone of every banked body and head. Generated and
 * checked in, so re-running on an unchanged tree produces identical bytes;
 * `--check` asserts that without writing.
 */
const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const check = process.argv.includes("--check");
const tones = await measureVisual4Tones(REPOSITORY_ROOT);
await writeFormatted(
  path.join(REPOSITORY_ROOT, VISUAL4_TONE_PATH),
  JSON.stringify({
    schema: VISUAL4_TONE_SCHEMA,
    note: "Median opaque colour of a bare-skin band on each raster. A measurement of paint, not a demographic classification, and no claim about any person.",
    sampleWindows: TONE_SAMPLE_WINDOWS,
    tones,
  }),
  check,
);
console.log(
  `visual4 tone — measured ${tones.filter((t) => t.kind === "body").length} bodies, ${tones.filter((t) => t.kind === "head").length} heads`,
);
