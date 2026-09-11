/**
 * Where the room's foreground panel sits, and how much headroom the people get.
 *
 * Two defects the modular-people review measured in the room (MODULAR-GEN14,
 * handed to PT3 because `src/player` is PT3's):
 *
 * 1. The moment panel sat bottom-centre whatever the room held, so a person
 *    standing mid-room was covered from the chest down. Hit-testing the figure
 *    at its own centre returned the panel, and a pointer could only choose the
 *    person by the part of them that happened to be uncovered.
 * 2. A tall figure's crown ran off the top of the viewport. The covering
 *    camera pins the plate's top edge to the viewport's top edge whenever the
 *    window is wider than the plate, so a figure the room's anchor places
 *    taller than the space above its contact line is cropped at the head —
 *    the thing a player most needs to see.
 *
 * Neither is solved by touching the people. Their size and footing come from
 * the room's anchors and the body's measurements, and scaling a figure to fit
 * would invent a measurement. What changes is the framing around them: the
 * camera lowers just enough to show the crown, and the panel goes to the side
 * of the room with nobody standing in it. Both are pure functions of screen
 * geometry, so the same room at the same size always frames the same way.
 */

/** A person's extent on screen. */
export interface ScreenFigure {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * How far to lower the camera so every figure's crown is on screen.
 *
 * Zero when nobody's head is above the top edge. Bounded, so a malformed or
 * absurd placement cannot push the room off the screen: past the cap the crown
 * stays cropped rather than the room disappearing.
 */
export function figureHeadroom(
  figures: readonly ScreenFigure[],
  viewportHeight: number,
  margin = 12,
  capFraction = 0.2,
): number {
  if (figures.length === 0 || viewportHeight <= 0) return 0;
  const highest = Math.min(...figures.map((figure) => figure.top));
  const needed = margin - highest;
  if (needed <= 0) return 0;
  return Math.min(Math.round(needed), Math.round(viewportHeight * capFraction));
}

export type ContentDock = "center" | "right" | "left";

export interface ContentPlacement {
  readonly dock: ContentDock;
  /** A narrower column when that is what keeps the panel off everybody. */
  readonly maxWidth: number | null;
}

/**
 * Where the foreground panel covers the fewest people.
 *
 * The centre is kept whenever it covers nobody — that is the layout the owner
 * has been playing with. Otherwise the panel moves to a side with room beside
 * everybody who stands where the panel would be, narrowing to that room when
 * it has to but never below `minimumWidth`, right before left. Only when no
 * side has that much room does it take whichever column covers the least,
 * measured as covered figure area below the panel's top. `leftInset` and
 * `rightInset` are the room each side leaves for the shell's fixed controls.
 */
export function chooseContentDock(
  figures: readonly ScreenFigure[],
  viewport: { readonly width: number; readonly height: number },
  panel: { readonly width: number; readonly height: number },
  insets: { readonly leftInset: number; readonly rightInset: number },
  minimumWidth = 480,
  gap = 16,
): ContentPlacement {
  const centred: ContentPlacement = { dock: "center", maxWidth: null };
  if (figures.length === 0 || panel.width <= 0) return centred;
  const top = viewport.height - panel.height;
  const inBand = figures.filter((figure) => figure.bottom > top);
  if (inBand.length === 0) return centred;

  const coveredBy = (from: number, to: number): number =>
    inBand.reduce((sum, figure) => {
      const width = Math.max(
        0,
        Math.min(to, figure.right) - Math.max(from, figure.left),
      );
      const height = Math.max(0, figure.bottom - Math.max(top, figure.top));
      return sum + width * height;
    }, 0);

  const centre = coveredBy(
    (viewport.width - panel.width) / 2,
    (viewport.width + panel.width) / 2,
  );
  if (centre === 0) return centred;

  const rightRoom =
    viewport.width -
    insets.rightInset -
    Math.max(...inBand.map((figure) => figure.right)) -
    gap;
  const leftRoom =
    Math.min(...inBand.map((figure) => figure.left)) - insets.leftInset - gap;
  const floor = Math.min(panel.width, minimumWidth);
  if (rightRoom >= floor)
    return {
      dock: "right",
      maxWidth: rightRoom >= panel.width ? null : Math.floor(rightRoom),
    };
  if (leftRoom >= floor)
    return {
      dock: "left",
      maxWidth: leftRoom >= panel.width ? null : Math.floor(leftRoom),
    };

  const right = coveredBy(
    viewport.width - insets.rightInset - panel.width,
    viewport.width - insets.rightInset,
  );
  const left = coveredBy(insets.leftInset, insets.leftInset + panel.width);
  if (right <= left && right < centre) return { dock: "right", maxWidth: null };
  if (left < centre) return { dock: "left", maxWidth: null };
  return centred;
}
