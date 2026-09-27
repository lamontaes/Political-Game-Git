import { useEffect, useRef, useState, type CSSProperties } from "react";

const FADE_MS = 350;

export interface LifeStartProgress {
  readonly label: string;
  readonly completed: number;
  readonly total: number;
}

/** The caller owns generation and the canonical clock; this shows its progress. */
export function LifeStartTransition({
  onPrepare,
}: {
  readonly onPrepare: (
    report: (progress: LifeStartProgress) => void,
    signal: AbortSignal,
  ) => Promise<void>;
}) {
  const prepare = useRef(onPrepare);
  const [progress, setProgress] = useState<LifeStartProgress>({
    label: "Preparing your world",
    completed: 0,
    total: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => {
        // Let the approved menu scene and initial status paint before beginning
        // synchronous world generation. Preparation then reports real work.
        window.requestAnimationFrame(() => {
          if (controller.signal.aborted) return;
          void prepare.current((next) => {
            if (!controller.signal.aborted) setProgress(next);
          }, controller.signal);
        });
      },
      reduced ? 0 : FADE_MS,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);
  const percent =
    progress.total > 0
      ? Math.round((100 * progress.completed) / progress.total)
      : null;
  return (
    <div
      className="pg-life-transition"
      data-testid="life-start-transition"
      style={{ "--pg-start-fade": `${FADE_MS}ms` } as CSSProperties}
    >
      <div className="pg-life-transition-progress" role="status">
        <p>{progress.label}</p>
        <progress
          aria-label="World preparation"
          {...(percent === null
            ? {}
            : { value: progress.completed, max: progress.total })}
        />
        {percent !== null && <span>{percent}%</span>}
      </div>
    </div>
  );
}
