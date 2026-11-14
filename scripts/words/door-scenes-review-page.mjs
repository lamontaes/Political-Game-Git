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
  if (scene.previous) {
    // The page needs only the earlier text of each line, by line id.
    const was = {};
    const take = (t) => {
      for (const l of t?.lines ?? []) was[l.id] = l.text;
      for (const c of t?.choices ?? []) {
        was[c.line.id] = c.line.text;
        take(c.next);
      }
    };
    for (const v of scene.previous.versions ?? [])
      for (const a of v.answers) {
        for (const l of a.opening) was[l.id] = l.text;
        take(a.tree);
      }
    scene.previous = {
      date: scene.previous.date,
      commit: scene.previous.commit,
      was,
    };
  }
}
const json = JSON.stringify(data).replace(/</g, "\\u003c");
writeFileSync(
  outPath,
  template.replace("/*__DATA__*/", () => json),
);
