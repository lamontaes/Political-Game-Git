import { useEffect, useState, type CSSProperties } from "react";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import { engineRecipeKey } from "../presentation/appearance-engine/pack";
import {
  enginePersonImage,
  type EnginePersonImage,
} from "../presentation/appearance-engine/runtime";

/** The composed picture for a recipe, once it is ready. */
export function useEnginePersonImage(
  recipe: EngineRecipe | null,
): EnginePersonImage | null {
  const key = recipe ? engineRecipeKey(recipe) : null;
  const [ready, setReady] = useState<{
    key: string;
    image: EnginePersonImage;
  } | null>(null);
  useEffect(() => {
    if (!recipe || !key) return;
    let live = true;
    enginePersonImage(recipe).then(
      (image) => live && setReady({ key, image }),
      () => {},
    );
    return () => {
      live = false;
    };
    // The key names the recipe completely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ready && ready.key === key ? ready.image : null;
}

/**
 * A whole person standing in their box: the soles on the box's bottom edge,
 * the head at its top, centered on the neck.
 */
export function EngineFigure({
  recipe,
  className,
  testId = "engine-figure",
}: {
  readonly recipe: EngineRecipe;
  readonly className?: string;
  readonly testId?: string;
}) {
  const image = useEnginePersonImage(recipe);
  if (!image) return null;
  const { top, feet, neck } = image.anchors;
  const figure = feet - top + 1;
  return (
    <img
      className={className ?? "engine-figure"}
      src={image.url}
      alt=""
      aria-hidden="true"
      draggable="false"
      data-testid={testId}
      data-engine-recipe={engineRecipeKey(recipe)}
      style={
        {
          position: "absolute",
          height: `${(image.height / figure) * 100}%`,
          width: "auto",
          maxWidth: "none",
          bottom: `${(-(image.height - 1 - feet) / figure) * 100}%`,
          left: "50%",
          transform: `translateX(${(-neck.centerX / image.width) * 100}%)`,
          pointerEvents: "none",
        } satisfies CSSProperties
      }
    />
  );
}

/** Head and shoulders, filling a square portrait frame. */
export function EnginePortrait({
  recipe,
  testId = "engine-portrait",
}: {
  readonly recipe: EngineRecipe;
  readonly testId?: string;
}) {
  const image = useEnginePersonImage(recipe);
  if (!image) return null;
  const { top, feet, neck } = image.anchors;
  const figure = feet - top;
  const cropTop = top - figure * 0.03;
  const cropHeight = neck.row + figure * 0.17 - cropTop;
  return (
    <img
      className="engine-portrait"
      src={image.url}
      alt=""
      aria-hidden="true"
      draggable="false"
      data-testid={testId}
      data-engine-recipe={engineRecipeKey(recipe)}
      style={
        {
          position: "absolute",
          height: `${(image.height / cropHeight) * 100}%`,
          width: "auto",
          maxWidth: "none",
          top: `${(-cropTop / cropHeight) * 100}%`,
          left: "50%",
          transform: `translateX(${(-neck.centerX / image.width) * 100}%)`,
          pointerEvents: "none",
        } satisfies CSSProperties
      }
    />
  );
}
