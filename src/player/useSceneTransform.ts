import { useLayoutEffect, useState, type RefObject } from "react";

import {
  resolveSceneTransform,
  type SceneCameraPolicy,
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
