import fs from "fs";
import path from "path";

import {
  chopSourceSheet,
  DEFAULT_CHOP_OPTIONS,
  type SheetChopReport,
} from "./source-sheet-chop";

/**
 * Usage:
 *   cli-source-sheet-chop.ts <sheet.png> <outputDir> <report.json> <name1,name2,...>
 *
 * Names are supplied in reading order and are the component ids. They are
 * required rather than generated, because a component called `cell_3` is a
 * component nobody can find again.
 */
const [sheet, outputDirectory, reportPath, names] = process.argv.slice(2);
if (!sheet || !outputDirectory || !reportPath || !names) {
  throw new Error(
    "Usage: cli-source-sheet-chop.ts <sheet.png> <outputDir> <report.json> <comma,separated,names>",
  );
}

const ordered = names.split(",").map((name) => name.trim());
let index = 0;
const report: SheetChopReport = await chopSourceSheet(
  path.resolve(sheet),
  path.resolve(outputDirectory),
  () => {
    const name = ordered[index];
    index += 1;
    if (!name)
      throw new Error(
        `Sheet has more cells than the ${ordered.length} names supplied.`,
      );
    return name;
  },
  DEFAULT_CHOP_OPTIONS,
);

if (index !== ordered.length) {
  throw new Error(
    `Supplied ${ordered.length} names but the sheet segmented into ${index} cells. Segmentation and naming must agree.`,
  );
}

const relative = {
  ...report,
  sourcePath: path.relative(process.cwd(), report.sourcePath),
  cells: report.cells.map((cell) => ({
    ...cell,
    outputPath: path.relative(process.cwd(), cell.outputPath),
  })),
};
await fs.promises.writeFile(
  path.resolve(reportPath),
  `${JSON.stringify(relative, null, 2)}\n`,
);
console.log(
  `${report.cells.length} cells written to ${outputDirectory}; ${report.noisePixelsCleared} background-haze pixels cleared; ${report.rejectedFragments.length} fragments below the component floor.`,
);
