import fs from "fs";
import path from "path";
import * as PImage from "pureimage";
import UTIF from "utif";

export async function normalizeDrawing(
  manifestPath: string,
  sheetNumber: number,
  inputPath: string,
  outputDir: string,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  const entry = manifest.find(
    (e: unknown) =>
      (e as { sheet_number: number }).sheet_number === sheetNumber,
  );
  if (!entry) throw new Error(`Sheet ${sheetNumber} not found.`);

  console.log(`Loading TIFF from ${inputPath}`);
  const buffer = fs.readFileSync(inputPath);
  const ifds = UTIF.decode(buffer);
  const ifd = ifds[0];
  UTIF.decodeImage(buffer, ifd);
  const rgba = UTIF.toRGBA8(ifd); // Uint8Array containing RGBA pixels

  const width = ifd.width;
  const height = ifd.height;

  const maxDim = 2000;
  let drawWidth = width;
  let drawHeight = height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      drawHeight = Math.round((height / width) * maxDim);
      drawWidth = maxDim;
    } else {
      drawWidth = Math.round((width / height) * maxDim);
      drawHeight = maxDim;
    }
  }

  const sourceCanvas = PImage.make(width, height);

  // Create an ImageData-like structure
  // Pureimage doesn't use the standard ImageData directly like node-canvas does,
  // we have to blit it. Actually, we can just manipulate its internal data buffer.
  // We can just manually copy:
  // Note: pureimage has a slightly different memory layout or API.
  // We can just draw pixels individually or try putting them in the bitmap data if it exists.
  // The safest pure-js way is to use putImageData if pureimage has it, but pureimage's context might not implement it.
  // pureimage puts data in bitmap.data
  for (let i = 0; i < rgba.length; i++) {
    sourceCanvas.data[i] = rgba[i];
  }

  const finalCanvas = PImage.make(drawWidth, drawHeight);
  const finalCtx = finalCanvas.getContext("2d");
  finalCtx.fillStyle = "#ffffff";
  finalCtx.fillRect(0, 0, drawWidth, drawHeight);
  finalCtx.drawImage(
    sourceCanvas,
    0,
    0,
    width,
    height,
    0,
    0,
    drawWidth,
    drawHeight,
  );

  const destPath = path.join(outputDir, `${entry.stable_id}_normalized.jpg`);

  await PImage.encodeJPEGToStream(
    finalCanvas,
    fs.createWriteStream(destPath),
    80,
  );

  entry.file_variants.normalized = {
    local_path: destPath.replace("./", ""),
    width: drawWidth,
    height: drawHeight,
    transformation: {
      scale_max_dim: maxDim,
      format: "image/jpeg",
      tool: "utif + pureimage",
    },
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Normalized image saved to ${destPath}`);
}
