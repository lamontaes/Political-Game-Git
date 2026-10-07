import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import { engineRecipeKey } from "../presentation/appearance-engine/pack";
import {
  enginePersonImage,
  type EnginePersonImage,
} from "../presentation/appearance-engine/runtime";

const PORTRAIT_RETRIES = 3;

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
    let retry: ReturnType<typeof setTimeout> | undefined;
    // A face that fails to draw is asked for again a few times rather than
    // left as initials until the page is reloaded.
    const draw = (attempt: number) =>
      enginePersonImage(recipe).then(
        (image) => live && setReady({ key, image }),
        () => {
          if (live && attempt < PORTRAIT_RETRIES)
            retry = setTimeout(() => draw(attempt + 1), 500 * 2 ** attempt);
        },
      );
    void draw(0);
    return () => {
      live = false;
      if (retry) clearTimeout(retry);
    };
    // The key names the recipe completely.
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
  canvas = false,
}: {
  readonly recipe: EngineRecipe;
  readonly className?: string;
  readonly testId?: string;
  /** Preserve the measured full canvas when a room positions its contact rows. */
  readonly canvas?: boolean;
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
          ...(canvas
            ? {
                position: "absolute",
                width: "100%",
                height: "100%",
                left: 0,
                top: 0,
                pointerEvents: "none",
              }
            : {
                position: "absolute",
                height: `${(image.height / figure) * 100}%`,
                width: "auto",
                maxWidth: "none",
                bottom: `${(-(image.height - 1 - feet) / figure) * 100}%`,
                left: "50%",
                transform: `translateX(${(-neck.centerX / image.width) * 100}%)`,
                pointerEvents: "none",
              }),
        } satisfies CSSProperties
      }
    />
  );
}

/** Head and shoulders, filling a square portrait frame. */
export function EnginePortrait({
  recipe,
  testId = "engine-portrait",
  fallback = null,
}: {
  readonly recipe: EngineRecipe;
  readonly testId?: string;
  /** Shown while the drawn face loads, so a portrait is never blank. */
  readonly fallback?: ReactNode;
}) {
  const image = useEnginePersonImage(recipe);
  if (!image) return <>{fallback}</>;
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
