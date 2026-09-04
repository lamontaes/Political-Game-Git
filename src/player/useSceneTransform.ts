import { useLayoutEffect, useState, type RefObject } from "react";

import {
  resolveCoverTransform,
  resolveSceneTransform,
  type SceneCameraPolicy,
  type SceneCoverTransform,
  type SceneSize,
  type SceneTransform,
} from "../presentation/scene-transform";

/**
 * Generic viewport-to-virtual-scene transform hook. Same camera contract as the
 * office scene (`resolveSceneTransform` is the sole calculator); parameterized
 * by plate and policy so other scenes can share it without touching the
 * accepted office implementation.
 */
export function useSceneTransform(
  viewportRef: RefObject<HTMLElement | null>,
  plate: SceneSize,
  camera: SceneCameraPolicy,
): SceneTransform {
  const [transform, setTransform] = useState(() =>
    resolveSceneTransform(plate, plate, camera),
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const next = resolveSceneTransform(
        { width: bounds.width, height: bounds.height },
        plate,
        camera,
        window.devicePixelRatio,
      );
      setTransform((current) =>
        current.viewport.width === next.viewport.width &&
        current.viewport.height === next.viewport.height &&
        current.devicePixelRatio === next.devicePixelRatio
          ? current
          : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [viewportRef, plate, camera]);

  return transform;
}

/**
 * The same observer, driving the covering camera instead of the fitting one.
 *
 * Kept beside its sibling rather than given its own hook file, because the
 * measuring half — the ref, the ResizeObserver, the resize listener — is
 * identical and duplicating it is how two viewports quietly stop agreeing.
 */
export function useSceneCoverTransform(
  viewportRef: RefObject<HTMLElement | null>,
  plate: SceneSize,
  camera: SceneCameraPolicy,
): SceneCoverTransform {
  const [transform, setTransform] = useState(() =>
    resolveCoverTransform(plate, plate, camera),
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const next = resolveCoverTransform(
        { width: bounds.width, height: bounds.height },
        plate,
        camera,
        window.devicePixelRatio,
      );
      setTransform((current) =>
        current.viewport.width === next.viewport.width &&
        current.viewport.height === next.viewport.height &&
        current.devicePixelRatio === next.devicePixelRatio
          ? current
          : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [viewportRef, plate, camera]);

  return transform;
}
