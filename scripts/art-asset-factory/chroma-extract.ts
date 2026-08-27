import fs from "fs";
import * as PImage from "pureimage";

export const PACKET_76_CHROMA_PARAMETERS = {
  minimumGreen: 24,
  opaqueDominance: 8,
  transparentDominance: 58,
  fringeGreenAllowance: 8,
} as const;

export interface ChromaExtractionResult {
  readonly width: number;
  readonly height: number;
  readonly transparentPixelCount: number;
  readonly transitionPixelCount: number;
}

function alphaForPixel(red: number, green: number, blue: number): number {
  if (green < PACKET_76_CHROMA_PARAMETERS.minimumGreen) return 255;
  const dominance = green - Math.max(red, blue);
  if (dominance <= PACKET_76_CHROMA_PARAMETERS.opaqueDominance) return 255;
  if (dominance >= PACKET_76_CHROMA_PARAMETERS.transparentDominance) return 0;
  const span =
    PACKET_76_CHROMA_PARAMETERS.transparentDominance -
    PACKET_76_CHROMA_PARAMETERS.opaqueDominance;
  return Math.round(
    (255 * (PACKET_76_CHROMA_PARAMETERS.transparentDominance - dominance)) /
      span,
  );
}

export async function extractChromaToPng(
  sourcePath: string,
  destinationPath: string,
): Promise<ChromaExtractionResult> {
  const source = await PImage.decodePNGFromStream(
    fs.createReadStream(sourcePath),
  );
  const output = PImage.make(source.width, source.height);
  let transparentPixelCount = 0;
  let transitionPixelCount = 0;

  for (let offset = 0; offset < source.data.length; offset += 4) {
    const red = source.data[offset] ?? 0;
    const green = source.data[offset + 1] ?? 0;
    const blue = source.data[offset + 2] ?? 0;
    const alpha = alphaForPixel(red, green, blue);
    const foregroundGreen =
      alpha < 255
        ? Math.min(
            green,
            Math.max(red, blue) +
              PACKET_76_CHROMA_PARAMETERS.fringeGreenAllowance,
          )
        : green;

    output.data[offset] = red;
    output.data[offset + 1] = foregroundGreen;
    output.data[offset + 2] = blue;
    output.data[offset + 3] = alpha;
    if (alpha === 0) transparentPixelCount += 1;
    else if (alpha < 255) transitionPixelCount += 1;
  }

  await PImage.encodePNGToStream(output, fs.createWriteStream(destinationPath));
  return {
    width: output.width,
    height: output.height,
    transparentPixelCount,
    transitionPixelCount,
  };
}
