import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { contentIndex, exportContentIndex } from "../content";

/**
 * The content index, written to disk for review outside the running game.
 *
 * One command, both formats: a Markdown report a person reads and a JSON
 * document a tool reads. Neither depends on a world, a clock, a seed or a
 * browser, so running this twice on one checkout produces two identical pairs
 * of files — which is what makes the Markdown diffable and the JSON safe to
 * compare across branches.
 */
const outputDirectory = resolve(process.argv[2] ?? "content-export");
const index = contentIndex();
const exported = exportContentIndex(index);

mkdirSync(outputDirectory, { recursive: true });
const markdownPath = join(outputDirectory, "content-index.md");
const jsonPath = join(outputDirectory, "content-index.json");
writeFileSync(markdownPath, exported.markdown, "utf8");
writeFileSync(jsonPath, `${exported.json}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      contentDigest: exported.contentDigest,
      bankCount: index.banks.length,
      itemCount: index.items.length,
      markdownPath,
      jsonPath,
    },
    null,
    2,
  ),
);
