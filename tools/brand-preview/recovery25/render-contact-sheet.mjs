import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const outputDirectory = path.join(
  repositoryRoot,
  "art/brand/recovery25/review-10",
);
const outputPath = path.join(
  outputDirectory,
  "our-civic-duty-10-rough-directions-contact-sheet.png",
);
const pageUrl = pathToFileURL(
  path.join(scriptDirectory, "contact-sheet.html"),
).href;

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 3200, height: 1200 },
    deviceScaleFactor: 1,
  });
  await page.goto(pageUrl);
  await page.waitForFunction(
    () =>
      globalThis.document.querySelectorAll("[data-direction]").length === 10 &&
      [...globalThis.document.images].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
  );
  await page.evaluate(() => globalThis.document.fonts.ready);

  const directionAudit = await page
    .locator("[data-direction]")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute("data-direction"),
        slug: node.getAttribute("data-slug"),
        wordmarks: node.querySelectorAll(".rough-wordmark").length,
        icons: node.querySelectorAll(".rough-icon").length,
        placements: node.querySelectorAll(".placement-panel").length,
        titleText: /OUR\s*CIVIC\s*DUTY/i.test(node.textContent ?? ""),
      })),
    );

  for (const direction of directionAudit) {
    if (
      direction.wordmarks < 2 ||
      direction.icons !== 1 ||
      direction.placements !== 1 ||
      !direction.titleText
    ) {
      throw new Error(`Incomplete contact-sheet direction: ${direction.id}`);
    }
  }
  if (new Set(directionAudit.map((direction) => direction.slug)).size !== 10) {
    throw new Error("Contact-sheet direction slugs are not unique");
  }

  await page.screenshot({ path: outputPath, fullPage: true });
  process.stdout.write(`${outputPath}\n`);
} finally {
  await browser.close();
}
