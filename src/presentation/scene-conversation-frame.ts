import type { ScreenFigure } from "./scene-framing";

export interface SceneConversationFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly maxHeight: number;
}

/** Find a panel rectangle around existing occupants, never move an occupant.
 * Prefer clear space; in a crowded room protect the whole head and footwear
 * bands and use the conversation's existing bounded scroll surface. */
export function sceneConversationFrame(
  figures: readonly ScreenFigure[],
  viewport: { readonly width: number; readonly height: number },
  requestedHeight: number,
): SceneConversationFrame {
  const top = 48;
  const bottom = viewport.height - 48;
  const columns = [480, 420, 360]
    .flatMap((width) => [
      { left: viewport.width - width - 20, width },
      { left: 272, width },
    ])
    .filter(
      (column) =>
        column.left >= 16 && column.left + column.width <= viewport.width - 16,
    );
  const regions = (protectWholeBody: boolean) =>
    columns.flatMap((column) => {
      const covered = figures.filter(
        (figure) =>
          figure.right + 16 > column.left &&
          figure.left - 16 < column.left + column.width,
      );
      const obstacles = covered
        .flatMap((figure) =>
          protectWholeBody
            ? [{ top: figure.top - 16, bottom: figure.bottom + 16 }]
            : [
                {
                  top: figure.top - 16,
                  bottom: figure.top + (figure.bottom - figure.top) * 0.28 + 16,
                },
                {
                  top: figure.bottom - (figure.bottom - figure.top) * 0.12 - 16,
                  bottom: figure.bottom + 16,
                },
              ],
        )
        .sort((a, b) => a.top - b.top);
      const gaps: { top: number; bottom: number }[] = [];
      let cursor = top;
      for (const obstacle of obstacles) {
        if (obstacle.top > cursor)
          gaps.push({ top: cursor, bottom: Math.min(bottom, obstacle.top) });
        cursor = Math.max(cursor, obstacle.bottom);
      }
      if (cursor < bottom) gaps.push({ top: cursor, bottom });
      return gaps
        .filter((gap) => gap.bottom - gap.top >= 96)
        .map((gap) => ({
          ...column,
          top: gap.top,
          maxHeight: Math.floor(gap.bottom - gap.top),
        }));
    });
  const clear = regions(true);
  const fits = clear.find((region) => region.maxHeight >= requestedHeight);
  const available = fits
    ? [fits]
    : regions(false).sort(
        (a, b) =>
          b.width * Math.min(b.maxHeight, requestedHeight) -
          a.width * Math.min(a.maxHeight, requestedHeight),
      );
  const frame = available[0] ??
    clear[0] ?? {
      left: 16,
      top,
      width: Math.max(1, viewport.width - 32),
      maxHeight: Math.max(1, bottom - top),
    };
  const height = Math.min(requestedHeight, frame.maxHeight);
  return {
    ...frame,
    top: Math.round(frame.top + frame.maxHeight - height),
    maxHeight: height,
  };
}
