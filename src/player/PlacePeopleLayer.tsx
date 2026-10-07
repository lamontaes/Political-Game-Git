import {
  Fragment,
  useEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { EngineFigure } from "./EnginePerson";
import type { ScenePersonSelectionHandler } from "../presentation/person-scene-appearance";
import {
  BACKDROP_ASPECT,
  BACKDROP_FOCUS_Y,
  type BackdropPerson,
  type BackdropOverflowPerson,
} from "../presentation/backdrop-people";

/**
 * The people on shift in a place picture, drawn over it. The picture fills
 * the stage with `object-fit: cover` anchored at BACKDROP_FOCUS_Y, so this
 * layer sizes itself to the same rectangle the picture is drawn into, and a
 * person's percentages land on the same floor they were measured on.
 */
export function PlacePeopleLayer({
  people,
  stageRef,
  onSelectPerson,
  selectedPersonId = null,
  overflowLabel = "Also here",
}: {
  readonly people: readonly BackdropPerson[] & {
    readonly overflow?: readonly BackdropOverflowPerson[];
  };
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly onSelectPerson?: ScenePersonSelectionHandler;
  readonly selectedPersonId?: string | null;
  readonly overflowLabel?: string;
}) {
  const rect = useCoverRect(stageRef);
  const overflow = people.overflow ?? [];
  if (!rect || (people.length === 0 && overflow.length === 0)) return null;
  return (
    <Fragment>
      {overflow.length > 0 ? (
        <details
          data-testid="scene-place-overflow"
          style={{
            position: "absolute",
            bottom: "1rem",
            maxHeight: "50%",
            overflowY: "auto",
            padding: "0.5rem",
            color: "#f0e8d8",
            background: "rgba(18, 20, 22, 0.9)",
            right: "1rem",
            zIndex: 1,
          }}
        >
          <summary>
            {overflowLabel} ({overflow.length})
          </summary>
          <ul>
            {overflow.map((person) => (
              <li key={person.personId}>
                <button
                  type="button"
                  onClick={() => onSelectPerson?.(person.personId)}
                >
                  {person.name}
                  {person.title ? `, ${person.title}` : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div
        className="scene-place-people"
        data-testid="scene-place-people"
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
        {people.map((person) => {
          // Open furniture hides only a band (the tabletop's edge); the
          // person's legs show underneath, so the whole figure is drawn and the
          // band is cut out of it.
          const band =
            person.clipBelowPercent !== null &&
            person.clipBandEndPercent !== null
              ? {
                  from:
                    ((person.clipBelowPercent - person.topPercent) /
                      person.heightPercent) *
                    100,
                  to:
                    ((person.clipBandEndPercent - person.topPercent) /
                      person.heightPercent) *
                    100,
                }
              : null;
          const visibleHeight =
            person.clipBelowPercent === null || band
              ? person.heightPercent
              : Math.max(0, person.clipBelowPercent - person.topPercent);
          const button = (
            <button
              key={person.personId}
              type="button"
              className="scene-place-person"
              data-testid="scene-place-person"
              data-person-id={person.personId}
              aria-label={`${person.name}, ${person.title}`}
              aria-pressed={selectedPersonId === person.personId}
              title={`${person.name}, ${person.title}`}
              onClick={() => onSelectPerson?.(person.personId, person.engine)}
              style={
                {
                  position: "absolute",
                  left: `${person.leftPercent}%`,
                  top: `${person.topPercent}%`,
                  width: `${person.widthPercent}%`,
                  height: `${visibleHeight}%`,
                  overflow: "hidden",
                  ...(band
                    ? {
                        clipPath: `polygon(0 0, 100% 0, 100% ${band.from}%, 0 ${band.from}%, 0 ${band.to}%, 100% ${band.to}%, 100% 100%, 0 100%)`,
                      }
                    : {}),
                  padding: 0,
                  border: 0,
                  background: "none",
                  cursor: onSelectPerson ? "pointer" : "default",
                  pointerEvents: onSelectPerson ? "auto" : "none",
                } satisfies CSSProperties
              }
            >
              <span
                style={
                  {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: `${(person.heightPercent / visibleHeight) * 100}%`,
                  } satisfies CSSProperties
                }
              >
                <EngineFigure
                  canvas
                  recipe={person.engine}
                  testId="scene-place-person-figure"
                />
              </span>
            </button>
          );
          return button;
        })}
      </div>
    </Fragment>
  );
}

/** The rectangle a cover-fitted place picture occupies inside the stage. */
export function useCoverRect(stageRef: RefObject<HTMLDivElement | null>) {
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const { width: stageWidth, height: stageHeight } =
        stage.getBoundingClientRect();
      if (stageWidth <= 0 || stageHeight <= 0) return;
      const scale = Math.max(stageWidth / BACKDROP_ASPECT, stageHeight);
      const width = scale * BACKDROP_ASPECT;
      const height = scale;
      setRect({
        left: (stageWidth - width) / 2,
        top: (stageHeight - height) * BACKDROP_FOCUS_Y,
        width,
        height,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef]);
  return rect;
}
