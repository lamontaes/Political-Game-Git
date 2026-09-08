import type { CSSProperties } from "react";

import type { SceneSurfaceSlot } from "../environment/environment-scene-spec";
import type { SurfaceBinding } from "../presentation/surface-binding";

/**
 * The room's dynamic surfaces, painted over the plate rather than into it.
 *
 * Everything readable in this game's rooms is drawn HERE, in the document,
 * above the raster and below the interface. That is the whole point of the
 * layer and it buys three things at once: the date on a screen can change
 * without regenerating a background; the same plate serves every jurisdiction
 * and every save; and text is real text at whatever the viewport's pixel ratio
 * happens to be, instead of a resampled JPEG of some letters.
 *
 * It draws BOUND bindings and nothing else. An empty, withheld, unowned or
 * decorative surface renders no element at all, so the plate's own painted
 * decoration — the dark screen, the blank board, the closed magazines — is
 * what a player sees. There is no placeholder, no skeleton and no "awaiting
 * data" chrome, because each of those is a way of drawing something on a
 * surface that has nothing to say.
 *
 * It is `aria-hidden`. These are objects across a room, not controls: the same
 * facts reach assistive technology through the workspace and the briefing,
 * where they can be read in order rather than found by position.
 *
 * It is positioned in PLATE PERCENTAGES and expects to be mounted inside the
 * scene camera, which already carries the plate's size and the cover
 * transform. That is what keeps a surface locked to the object it is painted
 * on at every viewport, instead of two independent bits of arithmetic drifting
 * apart the first time one of them is changed.
 */
/**
 * Surfaces that carry a CAPTION rather than a display.
 *
 * A map keeps its cartography and a frame keeps its picture; the words are a
 * title card along the bottom edge. They get a much harder size cap than a
 * screen does, because the failure mode here is not illegibility — it is a
 * caption large enough to hide the thing it is captioning.
 */
const CAPTION_SURFACE_KINDS: readonly string[] = [
  "large-wall-map",
  "picture-frame",
  "official-portrait-slot",
  "window-view",
  "civic-symbol",
];

interface SurfaceType {
  readonly fontSize: number;
  /** Lines that fit, so text ends at a line rather than mid-word. */
  readonly lines: number;
}

/**
 * How large the type on one surface should be, in plate pixels.
 *
 * Type size follows the SURFACE and its content, not the page. A board across
 * a chamber and a clipboard on a near table are different distances from the
 * camera, and one fixed size is unreadable on the first and absurd on the
 * second. The first term is the size at which this much text fills this much
 * area; the two caps that follow are restraint, and they are the terms that
 * usually bind.
 *
 * Both caps are here because the first visual review of this layer failed on
 * exactly the two things they prevent: a bill title set at heading size and
 * clipped mid-word, and a jurisdiction name large enough to cover the map it
 * was labelling. Green tests said nothing about either.
 */
function typeSizeFor(
  rect: {
    readonly width_percent: number;
    readonly height_percent: number;
  },
  kind: string,
  characters: number,
  plate: { readonly width: number; readonly height: number },
): SurfaceType {
  const width = (rect.width_percent / 100) * plate.width;
  const height = (rect.height_percent / 100) * plate.height;
  const caption = CAPTION_SURFACE_KINDS.includes(kind);
  // Area one character occupies at font size f, for a typical sans face:
  // roughly 0.55f wide by 1.2f tall.
  const fitting = Math.sqrt(
    (width * height) / (0.66 * Math.max(characters, 1)),
  );
  const fontSize = Math.max(
    8,
    Math.min(
      fitting,
      height * (caption ? 0.1 : 0.16),
      width * (caption ? 0.075 : 0.11),
    ),
  );
  const lines = Math.max(1, Math.floor(height / (fontSize * 1.2)));
  return { fontSize, lines: caption ? Math.min(lines, 2) : lines };
}

export function SceneSurfaceLayer({
  slots,
  bindings,
  plate,
}: {
  readonly slots: readonly SceneSurfaceSlot[];
  readonly bindings: readonly SurfaceBinding[];
  /** Plate pixels, which is what the type size below is measured in. */
  readonly plate: { readonly width: number; readonly height: number };
}) {
  const slotsById = new Map(slots.map((slot) => [slot.slot_id, slot]));
  const painted = bindings.filter((binding) => binding.state === "bound");
  if (painted.length === 0) return null;

  return (
    <div
      className="scene-surface-layer"
      data-testid="scene-surfaces"
      aria-hidden="true"
    >
      {painted.map((binding) => {
        const slot = slotsById.get(binding.slotId);
        if (!slot) return null;
        const rect = slot.rect_percent;
        const type = typeSizeFor(rect, slot.kind, binding.shows.length, plate);
        const style: CSSProperties = {
          left: `${rect.x_percent}%`,
          top: `${rect.y_percent}%`,
          width: `${rect.width_percent}%`,
          height: `${rect.height_percent}%`,
          fontSize: `${type.fontSize}px`,
          zIndex: slot.z_order,
        };
        return (
          <div
            key={binding.slotId}
            className={`scene-surface scene-surface--${slot.kind}`}
            data-testid={`scene-surface-${binding.slotId}`}
            data-slot-id={binding.slotId}
            data-surface-kind={slot.kind}
            data-content-class={binding.contentClass ?? ""}
            data-binding-state={binding.state}
            data-access={binding.access ?? ""}
            style={style}
          >
            <span
              className="scene-surface-text"
              style={{ ["--scene-surface-lines" as string]: `${type.lines}` }}
            >
              {binding.shows}
            </span>
          </div>
        );
      })}
    </div>
  );
}
