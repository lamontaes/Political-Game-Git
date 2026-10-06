import type { CSSProperties, RefObject } from "react";
import {
  quadFaceSize,
  quadMatrix3d,
  type BackdropSurface,
  type BackdropSurfaceContent,
  type BackdropSurfaceSlot,
  type SurfaceQuad,
} from "../presentation/backdrop-surfaces";
import { useCoverRect } from "./PlacePeopleLayer";
import { RoomNewspaper, RoomTelevision } from "./RoomMedia";
import "./BackdropSurfaceLayer.css";

/** The place pictures are all 1672 pixels wide. */
const PICTURE_WIDTH = 1672;

/**
 * The live content on a place picture's painted surfaces, drawn onto each
 * surface's own four corners so it sits in the picture's perspective.
 *
 * Only surfaces that have something to show are passed in; every other
 * screen, board and paper keeps its painted face. The layer is decoration
 * across a room, so it is hidden from assistive technology like the room's
 * television and newspaper are.
 */
export function BackdropSurfaceLayer({
  surfaces,
  variant,
  stageRef,
}: {
  readonly surfaces: readonly BackdropSurface[];
  readonly variant: string;
  readonly stageRef: RefObject<HTMLDivElement | null>;
}) {
  const rect = useCoverRect(stageRef);
  if (!rect) return null;
  return (
    <BackdropSurfaceFaces surfaces={surfaces} variant={variant} rect={rect} />
  );
}

/** The surfaces over a picture drawn into `rect`, in the stage's pixels. */
export function BackdropSurfaceFaces({
  surfaces,
  variant,
  rect,
}: {
  readonly surfaces: readonly BackdropSurface[];
  readonly variant: string;
  readonly rect: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}) {
  if (surfaces.length === 0) return null;
  const scale = rect.width / PICTURE_WIDTH;
  return (
    <div
      className={`backdrop-surfaces backdrop-surfaces--${variant}`}
      data-testid="backdrop-surfaces"
      aria-hidden="true"
      style={
        {
          position: "absolute",
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          pointerEvents: "none",
        } satisfies CSSProperties
      }
    >
      {surfaces.map((surface) => (
        <SurfaceFace key={surface.slot.id} surface={surface} scale={scale} />
      ))}
    </div>
  );
}

function SurfaceFace({
  surface,
  scale,
}: {
  readonly surface: BackdropSurface;
  readonly scale: number;
}) {
  const { slot, content } = surface;
  const face = quadFaceSize(slot.quad);
  const width = Math.max(1, face.width * scale);
  const height = Math.max(1, face.height * scale);
  const quad = slot.quad.map(([x, y]) => [
    x * scale,
    y * scale,
  ]) as unknown as SurfaceQuad;
  // Laid out in em against the face's own size. The station and the paper
  // keep the proportions the room's TV and newspaper were drawn with.
  const media = content.kind === "broadcast" || content.kind === "front-page";
  const fontSize = Math.max(
    3,
    media
      ? Math.min(height / 7, width / 13)
      : Math.min(height / 7, width / 6.5),
  );
  return (
    <div
      className={`backdrop-surface backdrop-surface--${slot.kind} backdrop-surface--${slot.finish}`}
      data-testid={`backdrop-surface-${slot.id}`}
      data-surface-id={slot.id}
      data-surface-kind={slot.kind}
      data-content={content.kind}
      style={
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: `${width}px`,
          height: `${height}px`,
          fontSize: `${fontSize}px`,
          transformOrigin: "0 0",
          transform: quadMatrix3d(quad, width, height),
        } satisfies CSSProperties
      }
    >
      <SurfaceContent slot={slot} content={content} />
    </div>
  );
}

function SurfaceContent({
  slot,
  content,
}: {
  readonly slot: BackdropSurfaceSlot;
  readonly content: BackdropSurfaceContent;
}) {
  switch (content.kind) {
    case "broadcast":
      return <RoomTelevision broadcast={content.broadcast} />;
    case "front-page":
      return <RoomNewspaper frontPage={content.frontPage} />;
    case "votes":
      return (
        <div className="bs-board bs-votes" data-testid="backdrop-vote-board">
          <strong className="bs-board-heading">{content.heading}</strong>
          <ul className="bs-board-rows">
            {content.lines.map((line) => (
              <li
                key={line.id}
                className={
                  line.passed
                    ? "bs-row bs-row--passed"
                    : "bs-row bs-row--failed"
                }
              >
                <span className="bs-row-name">{line.designation}</span>
                <span
                  className="bs-row-value"
                  style={{ color: line.passed ? "#7fd6a0" : "#f08a7e" }}
                >
                  {line.result}
                </span>
                <span className="bs-row-note">{line.title}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "results":
      return (
        <div className="bs-board bs-results" data-testid="backdrop-results">
          <strong className="bs-board-heading">{content.office}</strong>
          <span className="bs-board-sub">{content.dateLine}</span>
          <ul className="bs-board-rows">
            {content.rows.map((row) => (
              <li
                key={row.personId}
                className={row.won ? "bs-row bs-row--yes" : "bs-row"}
              >
                <span className="bs-row-name">
                  {row.won ? "✓ " : ""}
                  {row.name}
                </span>
                <span className="bs-row-value">{row.share}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "candidates":
      return (
        <div
          className={`bs-posters bs-posters--${slot.finish}`}
          data-testid="backdrop-posters"
        >
          {content.posters.map((poster) => (
            <div
              key={poster.personId}
              className={`bs-poster bs-poster--look-${poster.look}`}
              data-person-id={poster.personId}
            >
              <span className="bs-poster-name">{poster.name}</span>
              <span className="bs-poster-office">{poster.office}</span>
              <span className="bs-poster-date">{poster.dateLine}</span>
            </div>
          ))}
        </div>
      );
    case "plans":
      return (
        <div
          className={`bs-plans bs-plans--${slot.finish}`}
          data-testid="backdrop-plans"
        >
          {content.notes.map((note) => (
            <div key={note.activityId} className="bs-note">
              <span className="bs-note-when">{note.when}</span>
              <span className="bs-note-title">{note.title}</span>
            </div>
          ))}
        </div>
      );
    case "bills":
      if (
        slot.finish === "panel" &&
        (slot.kind === "board" || slot.kind === "screen")
      )
        return (
          <div className="bs-board bs-bills" data-testid="backdrop-bills">
            <strong className="bs-board-heading">{content.heading}</strong>
            {content.place ? (
              <span className="bs-board-sub">{content.place}</span>
            ) : null}
            <ul className="bs-board-rows">
              {content.bills.map((bill) => (
                <li key={bill.id} className="bs-row">
                  <span className="bs-row-name">{bill.designation}</span>
                  <span className="bs-row-note">{bill.title}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      return (
        <div
          className={`bs-sheet bs-sheet--${slot.finish}`}
          data-testid="backdrop-bills"
        >
          <strong className="bs-sheet-heading">{content.heading}</strong>
          {content.place ? (
            <span className="bs-sheet-place">{content.place}</span>
          ) : null}
          {content.bills.map((bill) => (
            <span key={bill.id} className="bs-sheet-line">
              <b>{bill.designation}</b> {bill.title}
            </span>
          ))}
        </div>
      );
    case "programs":
      return (
        <div
          className={`bs-brochure bs-brochure--${slot.finish}`}
          data-testid="backdrop-programs"
        >
          {content.services.map((service) => (
            <div key={service.programKey} className="bs-brochure-panel">
              <strong className="bs-brochure-title">{service.title}</strong>
              <span className="bs-brochure-place">{content.place}</span>
              <span className="bs-brochure-body">{service.summary}</span>
            </div>
          ))}
        </div>
      );
  }
}
