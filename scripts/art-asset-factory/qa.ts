import fs from "fs";
import path from "path";
import imageSize from "image-size";
import * as PImage from "pureimage";

export interface QaMetadata {
  width: number;
  height: number;
  aspectRatio: string;
  hasTransparency: "confirmed" | "not-confirmed" | "unknown" | "none";
}

async function inspectPngTransparency(
  filePath: string,
): Promise<QaMetadata["hasTransparency"]> {
  try {
    const image = await PImage.decodePNGFromStream(
      fs.createReadStream(filePath),
    );
    for (let offset = 3; offset < image.data.length; offset += 4) {
      if ((image.data[offset] ?? 255) < 255) return "confirmed";
    }
    return "none";
  } catch {
    return "not-confirmed";
  }
}

export async function parseImageMetadata(
  filePath: string,
): Promise<QaMetadata> {
  // Extract metadata directly from the file headers where possible
  // We use `image-size` specifically to avoid the brittle nature of writing manual binary parsing for png/jpeg/webp headers.
  let width = 0;
  let height = 0;
  let hasTransparency: QaMetadata["hasTransparency"] = "unknown";
  let aspectRatio = "unknown";

  try {
    const dimensions = imageSize(filePath);
    width = dimensions.width || 0;
    height = dimensions.height || 0;
    if (width > 0 && height > 0) {
      const gcd = (a: number, b: number): number =>
        b === 0 ? a : gcd(b, a % b);
      const div = gcd(width, height);
      aspectRatio = `${width / div}:${height / div}`;
    }

    // A PNG alpha channel alone does not prove that any pixel is transparent.
    // Decode pixels and require at least one alpha sample below 255.
    if (
      dimensions.type === "png" ||
      dimensions.type === "webp" ||
      dimensions.type === "gif"
    ) {
      if (dimensions.type === "png") {
        hasTransparency = await inspectPngTransparency(filePath);
      } else {
        hasTransparency = "not-confirmed";
      }
    } else if (dimensions.type === "jpg" || dimensions.type === "jpeg") {
      hasTransparency = "none";
    }
  } catch {
    // Ignore errors for unparseable images
  }

  return { width, height, aspectRatio, hasTransparency };
}

export async function generateContactSheetHtml(
  images: string[],
  title: string,
  baseDir: string,
  manifestReqs?: Record<string, boolean>, // map relative path to requires_transparency
): Promise<{ html: string; report: unknown[] }> {
  // Guarantee deterministic sorting
  const sortedImages = [...images].sort((a, b) => a.localeCompare(b));

  const reportData = [];
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; background: #eee; padding: 20px; }
    .grid { display: flex; flex-wrap: wrap; gap: 20px; }
    .card { background: #fff; padding: 10px; border: 1px solid #ccc; max-width: 300px; }
    .card img { max-width: 100%; height: auto; background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="5" height="5" fill="%23ccc"/><rect x="5" y="5" width="5" height="5" fill="%23ccc"/></svg>'); }
    .label { font-size: 12px; margin-top: 8px; word-break: break-all; }
    .error { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="grid">
`;

  for (const img of sortedImages) {
    const relativePath = path.relative(baseDir, img).replace(/\\/g, "/");
    const metadata = await parseImageMetadata(img);

    let transparencyWarning = "";
    let meetsTransparencyReq: boolean | null | string = null;
    if (manifestReqs && manifestReqs[relativePath] === true) {
      if (metadata.hasTransparency === "none") {
        transparencyWarning =
          '<br><span class="error">Warning: No actually transparent pixels</span>';
        meetsTransparencyReq = false;
      } else if (metadata.hasTransparency === "not-confirmed") {
        transparencyWarning =
          '<br><span class="warning" style="color: orange; font-weight: bold;">Warning: Transparency required but not confirmed</span>';
        meetsTransparencyReq = "not-confirmed";
      } else if (metadata.hasTransparency === "confirmed") {
        meetsTransparencyReq = true;
      }
    }

    reportData.push({
      file: relativePath,
      metadata,
      meetsTransparencyReq,
    });

    // Adjust path since HTML will be served from art/qa/contact_sheets/
    const htmlImgPath = "../../" + relativePath;

    html += `    <div class="card">
      <img src="${htmlImgPath}" alt="${relativePath}" loading="lazy" />
      <div class="label">
        <strong>${relativePath}</strong><br>
        ${metadata.width}x${metadata.height} (${metadata.aspectRatio})${transparencyWarning}
      </div>
    </div>\n`;
  }

  html += `  </div>
</body>
</html>\n`;

  return { html, report: reportData };
}

export function generateComparisonSheetHtml(
  pairs: { source: string; generated: string }[],
  baseDir: string,
) {
  // Deterministic sorting of pairs by generated path
  const sortedPairs = [...pairs].sort((a, b) =>
    a.generated.localeCompare(b.generated),
  );

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Source vs Generated Comparison</title>
  <style>
    body { font-family: sans-serif; background: #eee; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 10px; text-align: center; vertical-align: top; background: #fff; }
    img { max-width: 300px; height: auto; }
  </style>
</head>
<body>
  <h1>Source vs Generated Comparison</h1>
  <table>
    <tr><th>Source</th><th>Generated</th></tr>
`;

  const reportData = [];
  for (const pair of sortedPairs) {
    const srcRel = path.relative(baseDir, pair.source).replace(/\\/g, "/");
    const genRel = path.relative(baseDir, pair.generated).replace(/\\/g, "/");

    reportData.push({ source: srcRel, generated: genRel });

    // HTML output lives in art/qa/comparison_reports/, so go up 3 levels to reach repo root (or up 2 levels if it's base_dir = art/)
    // Our baseDir is usually `art/`, so it's `../../` from `art/qa/comparison_reports` to reach `art/`
    const htmlSrcPath = "../../" + srcRel;
    const htmlGenPath = "../../" + genRel;

    html += `    <tr>
      <td><img src="${htmlSrcPath}" alt="${srcRel}" /><br><small>${srcRel}</small></td>
      <td><img src="${htmlGenPath}" alt="${genRel}" /><br><small>${genRel}</small></td>
    </tr>\n`;
  }

  html += `  </table>
</body>
</html>\n`;

  return { html, report: reportData };
}
