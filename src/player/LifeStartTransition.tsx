import { useCallback, useEffect, useRef, type CSSProperties } from "react";

const FADE_MS = 350;

/** Presentation time only. The caller owns generation and the canonical clock. */
export function LifeStartTransition({
  onComplete,
}: {
  readonly onComplete: () => void;
}) {
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onComplete();
  }, [onComplete]);
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(finish, reduced ? 0 : FADE_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);
  return (
    <div
      className="pg-life-transition"
      data-testid="life-start-transition"
      style={{ "--pg-start-fade": `${FADE_MS}ms` } as CSSProperties}
      onAnimationEnd={finish}
    >
      <p role="status">Starting your life…</p>
    </div>
  );
}
