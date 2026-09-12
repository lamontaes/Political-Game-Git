import { copyFile, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import process from "node:process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const brandRoot = path.join(repositoryRoot, "art/brand/recovery25");
const previewUrl = pathToFileURL(path.join(scriptDirectory, "index.html")).href;
const candidates = ["option-1-civic-roundtable", "option-2-open-threshold"];
const iconSizes = [1024, 512, 256, 128, 64, 32, 16];

const browser = await chromium.launch({ headless: true });

async function rasterizeSvg(source, output, width, height) {
  const svg = await readFile(source, "utf8");
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}svg{display:block;width:${width}px;height:${height}px}</style>${svg}`,
  );
  await page.locator("svg").waitFor({ state: "visible" });
  await page.evaluate(() => globalThis.document.fonts.ready);
  await page.screenshot({ path: output, omitBackground: true });
  await page.close();
}

for (const candidate of candidates) {
  const sourceDirectory = path.join(brandRoot, candidate);
  const exportDirectory = path.join(brandRoot, "exports", candidate);
  await mkdir(exportDirectory, { recursive: true });
  await rasterizeSvg(
    path.join(sourceDirectory, "wordmark.svg"),
    path.join(exportDirectory, "wordmark-1200x260.png"),
    1200,
    260,
  );
  await rasterizeSvg(
    path.join(sourceDirectory, "wordmark-on-light.svg"),
    path.join(exportDirectory, "wordmark-on-light-1200x260.png"),
    1200,
    260,
  );
  for (const size of iconSizes) {
    await rasterizeSvg(
      path.join(sourceDirectory, "app-icon.svg"),
      path.join(exportDirectory, `app-icon-${size}.png`),
      size,
      size,
    );
  }

  if (process.platform === "darwin") {
    const temporaryRoot = await mkdtemp(
      path.join(tmpdir(), "ocd-brand-iconset-"),
    );
    const iconsetDirectory = path.join(temporaryRoot, "OurCivicDuty.iconset");
    await mkdir(iconsetDirectory);
    const iconsetFiles = [
      [16, "icon_16x16.png"],
      [32, "icon_16x16@2x.png"],
      [32, "icon_32x32.png"],
      [64, "icon_32x32@2x.png"],
      [128, "icon_128x128.png"],
      [256, "icon_128x128@2x.png"],
      [256, "icon_256x256.png"],
      [512, "icon_256x256@2x.png"],
      [512, "icon_512x512.png"],
      [1024, "icon_512x512@2x.png"],
    ];
    for (const [size, filename] of iconsetFiles) {
      await copyFile(
        path.join(exportDirectory, `app-icon-${size}.png`),
        path.join(iconsetDirectory, filename),
      );
    }
    try {
      const icns = spawnSync(
        "iconutil",
        [
          "-c",
          "icns",
          iconsetDirectory,
          "-o",
          path.join(exportDirectory, "OurCivicDuty-candidate.icns"),
        ],
        { encoding: "utf8" },
      );
      if (icns.status !== 0) {
        throw new Error(icns.stderr || "iconutil failed");
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

const mockupDirectory = path.join(brandRoot, "mockups");
await mkdir(mockupDirectory, { recursive: true });
for (const option of ["1", "2"]) {
  for (const view of ["title", "desktop"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(`${previewUrl}?option=${option}&view=${view}`);
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() =>
      [...globalThis.document.images].every(
        (candidate) => candidate.complete && candidate.naturalWidth > 0,
      ),
    );
    await page.screenshot({
      path: path.join(mockupDirectory, `option-${option}-${view}-1440x900.png`),
      fullPage: true,
    });
    await page.close();
  }
}

await browser.close();
