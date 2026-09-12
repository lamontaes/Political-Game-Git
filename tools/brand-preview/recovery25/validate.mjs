import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const brandRoot = path.join(repositoryRoot, "art/brand/recovery25");
const candidates = ["option-1-civic-roundtable", "option-2-open-threshold"];
const iconSizes = [1024, 512, 256, 128, 64, 32, 16];

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function pngDimensions(buffer) {
  expect(buffer.toString("ascii", 1, 4) === "PNG", "Not a PNG file");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

for (const candidate of candidates) {
  const sourceDirectory = path.join(brandRoot, candidate);
  for (const filename of ["wordmark.svg", "wordmark-on-light.svg"]) {
    const svg = await readFile(path.join(sourceDirectory, filename), "utf8");
    expect(
      /<text[^>]*>Our Civic Duty<\/text>/.test(svg),
      `${candidate}/${filename} must visibly spell Our Civic Duty exactly`,
    );
    expect(
      svg.includes('viewBox="0 0 1200 260"'),
      `${candidate}/${filename} has the wrong viewBox`,
    );
  }
  for (const filename of ["app-icon.svg", "mark-one-color.svg"]) {
    const svg = await readFile(path.join(sourceDirectory, filename), "utf8");
    expect(
      !/<text\b/.test(svg),
      `${candidate}/${filename} must not rely on tiny text`,
    );
  }
  for (const size of iconSizes) {
    const png = await readFile(
      path.join(brandRoot, "exports", candidate, `app-icon-${size}.png`),
    );
    const dimensions = pngDimensions(png);
    expect(
      dimensions.width === size && dimensions.height === size,
      `${candidate} ${size}px export is ${dimensions.width}x${dimensions.height}`,
    );
  }
  if (process.platform === "darwin") {
    const icns = await readFile(
      path.join(brandRoot, "exports", candidate, "OurCivicDuty-candidate.icns"),
    );
    expect(icns.length > 0, `${candidate} ICNS export is empty`);
  }
}

for (const option of [1, 2]) {
  for (const view of ["title", "desktop"]) {
    const png = await readFile(
      path.join(brandRoot, "mockups", `option-${option}-${view}-1440x900.png`),
    );
    const dimensions = pngDimensions(png);
    expect(
      dimensions.width === 1440 && dimensions.height === 900,
      `option ${option} ${view} mockup is ${dimensions.width}x${dimensions.height}`,
    );
  }
}

process.stdout.write("RECOVERY25 BRAND assets: PASS\n");
