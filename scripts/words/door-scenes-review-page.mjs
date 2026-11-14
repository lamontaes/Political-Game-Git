/**
 * Puts the review data into the review page.
 *
 *   node scripts/words/door-scenes-review-page.mjs review.json door-scenes-review.html
 *
 * Development tooling. See door-scenes-review.ts for how the data is made.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

const [dataPath, outPath] = process.argv.slice(2);
if (!dataPath || !outPath) {
  process.stderr.write(
    "usage: door-scenes-review-page.mjs <review.json> <out.html>\n",
  );
  process.exit(1);
}
const template = readFileSync(
  new URL("./door-scenes-review.template.html", import.meta.url),
  "utf8",
);
// The page plays scenes; the bank lists stay in the file for the batch export.
const data = JSON.parse(readFileSync(dataPath, "utf8"));
for (const scene of data.scenes) {
  delete scene.bank;
  if (scene.previous) delete scene.previous.bank;
}
const json = JSON.stringify(data).replace(/</g, "\\u003c");
writeFileSync(
  outPath,
  template.replace("/*__DATA__*/", () => json),
);
