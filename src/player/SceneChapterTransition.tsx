import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const SCENE_CHAPTER_CROSSFADE_MS = 400;

type Frame = { readonly key: string; readonly content: ReactNode };

const PENDING_PAINT =
  '[data-material-group-state="loading"], [data-material-group-state="pending"], [data-material-state="loading"]';

/** MaterialGroup commits its complete set atomically. Wait for that commit,
 * then decode its actual painted URLs, rather than just the earlier plate. */
async function compositionPainted(node: HTMLElement, signal: AbortSignal) {
  while (!signal.aborted) {
    if (node.querySelector(PENDING_PAINT)) {
      await new Promise<void>((resolve) => {
        const done = () => {
          observer.disconnect();
          signal.removeEventListener("abort", done);
          resolve();
        };
        const observer = new MutationObserver(() => {
          if (!node.querySelector(PENDING_PAINT)) done();
        });
        observer.observe(node, {
          subtree: true,
          childList: true,
          attributes: true,
        });
        signal.addEventListener("abort", done, { once: true });
        if (signal.aborted || !node.querySelector(PENDING_PAINT)) done();
      });
    }
    if (signal.aborted) return false;
    const images = [...node.querySelectorAll("img")];
    const sources = images.map((image) => image.currentSrc || image.src);
    await Promise.allSettled(images.map((image) => image.decode()));
    if (signal.aborted) return false;
    const current = [...node.querySelectorAll("img")];
    if (
      !node.querySelector(PENDING_PAINT) &&
      current.length === images.length &&
      current.every(
        (image, index) =>
          image === images[index] &&
          (image.currentSrc || image.src) === sources[index],
      )
    )
      return true;
  }
  return false;
}

/** Keeps the outgoing composition mounted while the entire next chapter arrives,
 * then fades it out before the arriving chapter fades in.
 * Nothing here reads or writes simulation state. Only the two visible chapters
 * and the caller's one adjacent plate are retained. */
export function SceneChapterTransition({
  chapterKey,
  children,
  nextPlateUrl,
  onReady,
}: {
  readonly chapterKey: string;
  readonly children: ReactNode;
  readonly nextPlateUrl?: string | null;
  readonly onReady?: () => void;
}) {
  const [frames, setFrames] = useState<{
    current: Frame;
    leaving: Frame | null;
    ready: boolean;
  }>(() => ({
    current: { key: chapterKey, content: children },
    leaving: null,
    ready: true,
  }));
  const [reduced, setReduced] = useState(
    () =>
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const currentRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef<HTMLDivElement>(null);
  const lastPainted = useRef<Frame>({ key: chapterKey, content: children });
  const readyCallback = useRef(onReady);
  if (frames.current.key !== chapterKey) {
    const returning = frames.leaving?.key === chapterKey;
    setFrames({
      current: { key: chapterKey, content: children },
      // A superseded decode never becomes the outgoing visible scene.
      leaving: returning
        ? null
        : frames.ready
          ? lastPainted.current
          : frames.leaving,
      ready: returning,
    });
  }
  useLayoutEffect(() => {
    readyCallback.current = onReady;
    if (frames.ready)
      lastPainted.current = { key: chapterKey, content: children };
  });
  useEffect(() => {
    if (frames.ready) readyCallback.current?.();
  }, [frames.ready, frames.current.key]);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!nextPlateUrl) return;
    const image = new Image();
    image.src = nextPlateUrl;
    void image.decode().catch(() => undefined);
    return () => {
      image.removeAttribute("src");
    };
  }, [nextPlateUrl]);
  useLayoutEffect(() => {
    // The scenes hold still: the only motion is the chapter change itself, a
    // fade out of the old card to the dark ground and then a fade in of the
    // new one, so the two cards' words are never on screen at once.
    const node = currentRef.current;
    if (!node) return;
    let cancelled = false;
    const controller = new AbortController();
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Decode errors leave the existing honest missing-art fallback in place.
    void compositionPainted(node, controller.signal).then((painted) => {
      if (cancelled || !painted) return;
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        setFrames((value) =>
          value.current.key === chapterKey ? { ...value, ready: true } : value,
        );
        timer = setTimeout(
          () => {
            if (!cancelled)
              setFrames((value) =>
                value.current.key === chapterKey
                  ? { ...value, leaving: null }
                  : value,
              );
          },
          reduced ? 0 : SCENE_CHAPTER_CROSSFADE_MS,
        );
      });
    });
    return () => {
      cancelled = true;
      controller.abort();
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [chapterKey, reduced]);
  return (
    <div
      className="pg-scene-chapters"
      data-testid="scene-chapters"
      data-motion={reduced ? "reduced" : "fade"}
      data-ready={frames.ready}
    >
      {[...(frames.leaving ? [frames.leaving] : []), frames.current].map(
        (frame) => {
          const leaving = frame.key !== frames.current.key;
          return (
            <div
              key={frame.key}
              ref={leaving ? leavingRef : currentRef}
              className="pg-scene-chapter"
              data-chapter={frame.key}
              data-stage={
                leaving ? "leaving" : frames.leaving ? "arriving" : "current"
              }
              aria-hidden={leaving || !frames.ready ? true : undefined}
              inert={leaving || !frames.ready ? true : undefined}
            >
              {frame.key === chapterKey ? children : frame.content}
            </div>
          );
        },
      )}
    </div>
  );
}
