import type { MapFeature } from "./geometry-types";
import type { ViewBox } from "./map-view";

interface LabelCandidate {
  readonly key: string;
  readonly feature: MapFeature;
  readonly texts: readonly string[];
  readonly fontPixels: number;
  readonly context: boolean;
}

/** Default SVG xMidYMid meet: both axes share the smaller rendered scale. */
export function mapLabelLayout(
  view: ViewBox,
  viewport: { readonly width: number; readonly height: number },
  candidates: readonly LabelCandidate[],
  measure: (text: string, fontPixels: number) => number,
): (LabelCandidate & { readonly text: string })[] {
  const scale = Math.min(viewport.width / view.w, viewport.height / view.h);
  if (!(scale > 0)) return [];
  const occupied: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [];
  const result: (LabelCandidate & { readonly text: string })[] = [];
  for (const candidate of candidates) {
    const { feature, fontPixels } = candidate;
    for (const text of candidate.texts) {
      // Padding includes the text's halo and separation between neighbors.
      const halfWidth = (measure(text, fontPixels) + 6) / (2 * scale);
      const halfHeight = (fontPixels + 6) / (2 * scale);
      const [x, y] = feature.label;
      const box = {
        left: x - halfWidth,
        right: x + halfWidth,
        top: y - halfHeight,
        bottom: y + halfHeight,
      };
      if (
        box.left < view.x ||
        box.right > view.x + view.w ||
        box.top < view.y ||
        box.bottom > view.y + view.h
      )
        continue;
      if (
        feature.bbox[2] - feature.bbox[0] < halfWidth * 2 ||
        feature.bbox[3] - feature.bbox[1] < halfHeight * 2
      )
        continue;
      if (
        occupied.some(
          (other) =>
            box.left < other.right &&
            box.right > other.left &&
            box.top < other.bottom &&
            box.bottom > other.top,
        )
      )
        continue;
      occupied.push(box);
      result.push({ ...candidate, text });
      break;
    }
  }
  return result;
}
