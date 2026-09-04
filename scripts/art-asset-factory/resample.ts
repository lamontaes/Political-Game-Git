import * as PImage from "pureimage";

/**
 * Deterministic Lanczos resampling, shared by every derivation step.
 *
 * Extracted from the office plate derivation so the environment tier pipeline
 * and the fixture pipeline reduce pixels the same way. Two tools that
 * downscale "the same" master with different kernels produce different bytes,
 * different hashes, and a reproducibility claim that quietly stops being true.
 *
 * The implementation is pure arithmetic over the source bitmap: no randomness,
 * no time, no platform-dependent library call. The same input always yields the
 * same output on any machine, which is what makes hashing a derived tier
 * meaningful.
 */

export const DEFAULT_LANCZOS_LOBES = 3 as const;

interface WeightedSample {
  readonly index: number;
  readonly weight: number;
}

export function lanczos(distance: number, lobes: number): number {
  const absolute = Math.abs(distance);
  if (absolute === 0) return 1;
  if (absolute >= lobes) return 0;
  const piDistance = Math.PI * distance;
  return (
    (Math.sin(piDistance) / piDistance) *
    (Math.sin(piDistance / lobes) / (piDistance / lobes))
  );
}

/**
 * Per-target-pixel source weights along one axis.
 *
 * Weights are normalized to sum to 1, and samples outside the source are
 * clamped to the edge, so the reduction neither darkens nor brightens a border.
 */
export function createSamplingTable(
  sourceLength: number,
  targetLength: number,
  lobes: number,
): readonly (readonly WeightedSample[])[] {
  const scale = targetLength / sourceLength;
  // Reducing an image needs the kernel widened to the DESTINATION pitch,
  // otherwise the source is point-sampled between kernel lobes and the result
  // aliases. Enlarging keeps the unit kernel.
  const support = scale < 1 ? lobes / scale : lobes;
  return Array.from({ length: targetLength }, (_, targetIndex) => {
    const sourcePosition = (targetIndex + 0.5) / scale - 0.5;
    const first = Math.floor(sourcePosition - support) + 1;
    const last = Math.floor(sourcePosition + support);
    const combined = new Map<number, number>();
    for (let sourceIndex = first; sourceIndex <= last; sourceIndex += 1) {
      const boundedIndex = Math.max(0, Math.min(sourceLength - 1, sourceIndex));
      const weight = lanczos(
        (sourcePosition - sourceIndex) * (scale < 1 ? scale : 1),
        lobes,
      );
      combined.set(boundedIndex, (combined.get(boundedIndex) ?? 0) + weight);
    }
    const total = [...combined.values()].reduce(
      (sum, weight) => sum + weight,
      0,
    );
    return [...combined.entries()].map(([index, weight]) => ({
      index,
      weight: total === 0 ? 0 : weight / total,
    }));
  });
}

/** Resamples a bitmap to exact target dimensions. Separable: rows, then columns. */
export function resampleLanczos(
  source: PImage.Bitmap,
  targetWidth: number,
  targetHeight: number,
  lobes: number = DEFAULT_LANCZOS_LOBES,
): PImage.Bitmap {
  const horizontalSamples = createSamplingTable(
    source.width,
    targetWidth,
    lobes,
  );
  const verticalSamples = createSamplingTable(
    source.height,
    targetHeight,
    lobes,
  );
  const horizontal = new Float64Array(targetWidth * source.height * 4);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const targetOffset = (y * targetWidth + x) * 4;
      for (const sample of horizontalSamples[x] ?? []) {
        const sourceOffset = (y * source.width + sample.index) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          horizontal[targetOffset + channel] +=
            (source.data[sourceOffset + channel] ?? 0) * sample.weight;
        }
      }
    }
  }

  const target = PImage.make(targetWidth, targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const targetOffset = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        let value = 0;
        for (const sample of verticalSamples[y] ?? []) {
          const horizontalOffset = (sample.index * targetWidth + x) * 4;
          value += horizontal[horizontalOffset + channel] * sample.weight;
        }
        target.data[targetOffset + channel] = Math.max(
          0,
          Math.min(255, Math.round(value)),
        );
      }
    }
  }
  return target;
}
