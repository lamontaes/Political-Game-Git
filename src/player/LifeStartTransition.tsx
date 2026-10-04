import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";

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
    label: "Preparing your life",
    completed: 0,
    total: 0,
  });
  useEffect(() => {
    const controller = new AbortController();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame: number | undefined;
    const timer = window.setTimeout(
      () => {
        // Let the approved menu scene and initial status paint before beginning
        // synchronous world generation. Preparation then reports real work.
        frame = window.requestAnimationFrame(() => {
          if (controller.signal.aborted) return;
          void prepare.current((next) => {
            if (!controller.signal.aborted) {
              // Commit the status before generation yields to the next paint.
              flushSync(() => setProgress(next));
            }
          }, controller.signal);
        });
      },
      reduced ? 0 : FADE_MS,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, []);
  const counted = progress.total > 0;
  return (
    <div
      className="pg-life-transition"
      data-testid="life-start-transition"
      style={{ "--pg-start-fade": `${FADE_MS}ms` } as CSSProperties}
    >
      <div className="pg-life-transition-progress" role="status">
        <p>{progress.label}</p>
        <progress
          aria-label={progress.label}
          {...(!counted
            ? {}
            : { value: progress.completed, max: progress.total })}
        />
        {counted && (
          <span>
            {progress.completed} / {progress.total}
          </span>
        )}
      </div>
    </div>
  );
}
