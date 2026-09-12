import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const htmlPath = path.join(scriptDirectory, "contact-sheet.html");
const cssPath = path.join(scriptDirectory, "contact-sheet.css");
const pngPath = path.join(
  repositoryRoot,
  "art/brand/recovery25/review-10/our-civic-duty-10-rough-directions-contact-sheet.png",
);

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function pngDimensions(buffer) {
  expect(buffer.toString("ascii", 1, 4) === "PNG", "Output is not a PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const html = await readFile(htmlPath, "utf8");
const css = await readFile(cssPath, "utf8");
const png = await readFile(pngPath);
const dimensions = pngDimensions(png);
const ids = [...html.matchAll(/id: "(\d{2})"/g)].map((match) => match[1]);
const slugs = [...html.matchAll(/slug: "([^"]+)"/g)].map((match) => match[1]);

expect(ids.length === 10, `Expected 10 direction IDs, found ${ids.length}`);
expect(new Set(ids).size === 10, "Direction IDs are not unique");
expect(new Set(slugs).size === 10, "Direction concepts are not unique");
expect(
  html.includes("OUR</span><strong>CIVIC</strong><span>DUTY"),
  "Preferred stacked title structure is absent",
);
expect(
  html.includes(
    "title_bg_civic_community_meeting_hero_slot_runtime_2048_v1.png",
  ),
  "Current title art is not used",
);
expect(
  !/roundtable|open threshold|network|orbit|ribbon|\bOCD\b/i.test(html),
  "Rejected or prohibited concept leaked into the sheet",
);
expect(
  dimensions.width === 3200 && dimensions.height > 4300,
  `Unexpected contact-sheet dimensions ${dimensions.width}x${dimensions.height}`,
);
expect(!/#(?:[0-9a-f]{3}){1,2}\b/i.test(css), "CSS contains color hex values");

process.stdout.write(
  `RECOVERY25 BRAND contact sheet: PASS (${dimensions.width}x${dimensions.height})\n`,
);
