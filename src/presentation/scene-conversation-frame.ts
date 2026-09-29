import type { ScreenFigure } from "./scene-framing";

export interface SceneConversationFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly maxHeight: number;
}

/** A rectangle on screen the box must keep clear of, such as a shell card. */
export interface ScreenRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Where the box may go at all: below the top margin, above the corner
 * cluster, and clear of the fixed controls on each side when it docks there. */
export interface ConversationBounds {
  readonly top: number;
  readonly bottom: number;
  readonly leftInset: number;
  readonly rightInset: number;
}

/** The box's usual width (36rem), then wider, then narrower columns. */
export const CONVERSATION_WIDTHS: readonly number[] = [
  576, 672, 768, 480, 420, 360,
];

const MARGIN = 16;
const MINIMUM_GAP = 96;

export function defaultConversationBounds(viewport: {
  readonly width: number;
  readonly height: number;
}): ConversationBounds {
  return {
    top: 48,
    bottom: viewport.height - 48,
    leftInset: 272,
    rightInset: 20,
  };
}

/**
 * Find a rectangle for the conversation around the people already in the
 * room, never moving an occupant, sized from the box's own wrapped content.
 *
 * `contentHeightAt(width)` is the height the box needs at that width with
 * nothing clipped. It tries bottom-center at each width (the usual one,
 * wider, then narrower), then, width by width, docked beside each person and
 * the two sides, and takes the first rectangle whose whole content fits. It gives up, one
 * step at a time and only where it must:
 *
 * 1. a box under half the window, so the room stays the surface;
 * 2. standing on the floor line rather than above somebody's head;
 * 3. keeping clear of every body the box would stand in front of, then of
 *    their faces and feet, then of their faces;
 * 4. and last, the people, so no choice is ever hidden.
 *
 * Only a person the box overlaps from side to side counts: someone standing
 * beside it is not under it however tall they are. A box that fits nowhere
 * takes the tallest place available rather than hiding a choice behind a
 * face, and only a window too small for the content at any width leaves the
 * box shorter than it needs.
 */
export function sceneConversationFrame(
  figures: readonly ScreenFigure[],
  viewport: { readonly width: number; readonly height: number },
  contentHeightAt: (width: number) => number,
  bounds: ConversationBounds = defaultConversationBounds(viewport),
  obstacles: readonly ScreenRect[] = [],
  widths: readonly number[] = CONVERSATION_WIDTHS,
): SceneConversationFrame {
  const needed = new Map<number, number>();
  const need = (width: number) => {
    let height = needed.get(width);
    if (height === undefined) {
      height = Math.ceil(contentHeightAt(width));
      needed.set(width, height);
    }
    return height;
  };
  const usable = [
    ...new Set(
      widths.map((width) =>
        Math.floor(Math.min(width, viewport.width - 2 * MARGIN)),
      ),
    ),
  ].filter((width) => width > 0);
  const place = (width: number, position: "center" | "right" | "left") =>
    position === "center"
      ? Math.round((viewport.width - width) / 2)
      : position === "right"
        ? viewport.width - bounds.rightInset - width
        : bounds.leftInset;
  /*
   * Bottom-center at any width first, the layout the owner plays with; then,
   * width by width, docked beside each person and the two sides.
   */
  const beside = (width: number) => [
    ...figures.flatMap((figure) => [
      Math.round(figure.left - MARGIN - width),
      Math.round(figure.right + MARGIN),
    ]),
    place(width, "right"),
    place(width, "left"),
  ];
  const seen = new Set<string>();
  const columns = [
    ...usable.map((width) => ({ left: place(width, "center"), width })),
    ...usable.flatMap((width) =>
      beside(width).map((left) => ({ left, width })),
    ),
  ].filter((column) => {
    const key = `${column.left}:${column.width}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return (
      column.left >= MARGIN &&
      column.left + column.width <= viewport.width - MARGIN
    );
  });

  type Protection = "whole" | "face-and-feet" | "face" | "none";
  const gapsIn = (
    column: { left: number; width: number },
    protection: Protection,
  ) => {
    // A person's extent already runs past their outline; a shell card's doesn't.
    const overlaps = (rect: ScreenRect, margin: number) =>
      rect.right + margin > column.left &&
      rect.left - margin < column.left + column.width;
    const bands = [
      ...obstacles
        .filter((rect) => overlaps(rect, MARGIN))
        .map((rect) => ({
          top: rect.top - MARGIN,
          bottom: rect.bottom + MARGIN,
        })),
      ...(protection === "none"
        ? []
        : figures.filter((figure) => overlaps(figure, 0))
      ).flatMap((figure) => {
        const height = figure.bottom - figure.top;
        const face = {
          top: figure.top - MARGIN,
          bottom: figure.top + height * 0.28 + MARGIN,
        };
        if (protection === "whole")
          return [{ top: figure.top - MARGIN, bottom: figure.bottom + MARGIN }];
        if (protection === "face") return [face];
        return [
          face,
          {
            top: figure.bottom - height * 0.12 - MARGIN,
            bottom: figure.bottom + MARGIN,
          },
        ];
      }),
    ].sort((a, b) => a.top - b.top);
    const gaps: { top: number; bottom: number }[] = [];
    let cursor = bounds.top;
    for (const band of bands) {
      if (band.top > cursor)
        gaps.push({ top: cursor, bottom: Math.min(bounds.bottom, band.top) });
      cursor = Math.max(cursor, band.bottom);
    }
    if (cursor < bounds.bottom)
      gaps.push({ top: cursor, bottom: bounds.bottom });
    return gaps.filter((gap) => gap.bottom - gap.top >= MINIMUM_GAP);
  };

  /*
   * Standing on the floor line (the lowest gap) before floating above
   * somebody's head, compact before tall, and protection given up one step at
   * a time: whole bodies, then faces and feet, then faces.
   */
  const share = viewport.height * 0.5;
  const passes: {
    protection: Protection;
    compact: boolean;
    floor: boolean;
  }[] = [];
  for (const compact of [true, false])
    for (const [protection, floor] of [
      ["whole", true],
      ["face-and-feet", true],
      ["whole", false],
      ["face-and-feet", false],
      ["face", true],
      ["face", false],
    ] as const)
      passes.push({ protection, compact, floor });
  passes.push({ protection: "none", compact: false, floor: false });
  for (const pass of passes) {
    for (const column of columns) {
      const height = need(column.width);
      if (pass.compact && height >= share) continue;
      const gap = gapsIn(column, pass.protection)
        .filter((candidate) => !pass.floor || candidate.bottom >= bounds.bottom)
        .sort((a, b) => b.bottom - a.bottom)
        .find((candidate) => candidate.bottom - candidate.top >= height);
      if (gap)
        return {
          left: column.left,
          top: Math.round(gap.bottom - height),
          width: column.width,
          maxHeight: height,
        };
    }
  }

  // Nothing holds the whole content: the tallest place, widest column first.
  let best: SceneConversationFrame | null = null;
  for (const column of [...columns].sort((a, b) => b.width - a.width)) {
    for (const gap of gapsIn(column, "none")) {
      const height = Math.min(need(column.width), gap.bottom - gap.top);
      if (!best || height > best.maxHeight)
        best = {
          left: column.left,
          top: Math.round(gap.bottom - height),
          width: column.width,
          maxHeight: Math.floor(height),
        };
    }
  }
  return (
    best ?? {
      left: MARGIN,
      top: bounds.top,
      width: Math.max(1, viewport.width - 2 * MARGIN),
      maxHeight: Math.max(1, bounds.bottom - bounds.top),
    }
  );
}
