import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { EngineFigure } from "./EnginePerson";
import {
  BACKDROP_ASPECT,
  BACKDROP_FOCUS_Y,
  type BackdropPerson,
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
}: {
  readonly people: readonly BackdropPerson[];
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly onSelectPerson?: (personId: string) => void;
  readonly selectedPersonId?: string | null;
}) {
  const rect = useCoverRect(stageRef);
  if (!rect || people.length === 0) return null;
  return (
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
        const visibleHeight =
          person.clipBelowPercent === null
            ? person.heightPercent
            : Math.max(0, person.clipBelowPercent - person.topPercent);
        return (
          <button
            key={person.personId}
            type="button"
            className="scene-place-person"
            data-testid="scene-place-person"
            data-person-id={person.personId}
            aria-label={`${person.name}, ${person.title}`}
            aria-pressed={selectedPersonId === person.personId}
            title={`${person.name}, ${person.title}`}
            onClick={() => onSelectPerson?.(person.personId)}
            style={
              {
                position: "absolute",
                left: `${person.leftPercent}%`,
                top: `${person.topPercent}%`,
                width: `${person.widthPercent}%`,
                height: `${visibleHeight}%`,
                overflow: "hidden",
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
                recipe={person.engine}
                testId="scene-place-person-figure"
              />
            </span>
          </button>
        );
      })}
    </div>
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
