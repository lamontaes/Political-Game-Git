import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { flushSync } from "react-dom";
import type { OpeningLifeGenerationProgress } from "../presentation/opening-life";
import { projectLifeStartStory } from "../presentation/life-start-story";
import { proseDate } from "../presentation/prose-dates";
import { ObserverRunController } from "./observer-run-controller";
import type { World } from "../simulation/types";
import { PoliticalMap } from "../maps/PoliticalMap";
import {
  DEFAULT_MAP_PREFERENCES,
  type MapPreferences,
} from "../maps/map-preferences";

const FADE_MS = 350;
/** Owner's maximum wait for a new life, including the initial fade. */
export const LIFE_START_BUDGET_MS = 2 * 60 * 1000;
export type LifeStartProgress = OpeningLifeGenerationProgress;

function elapsedClock(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The caller owns generation and the canonical clock; this shows its records. */
export function LifeStartTransition({
  onPrepare,
  onReturn,
}: {
  readonly onPrepare: (
    report: (progress: LifeStartProgress) => void,
    signal: AbortSignal,
    deadlineAt: number,
    advanceHistory: (world: World, days: number) => Promise<World>,
  ) => Promise<void>;
  readonly onReturn?: () => void;
}) {
  const prepare = useRef(onPrepare);
  const [progress, setProgress] = useState<LifeStartProgress>({
    label: "Preparing your life",
    completed: 0,
    total: 0,
  });
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(
    DEFAULT_MAP_PREFERENCES,
  );
  const story = useMemo(
    () =>
      progress.world && progress.playerPersonId
        ? projectLifeStartStory(progress.world, progress.playerPersonId)
        : null,
    [progress.world, progress.playerPersonId],
  );
  useEffect(() => {
    const controller = new AbortController();
    let observer: ObserverRunController | undefined;
    const stopObserver = () => observer?.dispose();
    controller.signal.addEventListener("abort", stopObserver, { once: true });
    const advanceHistory = (world: World, days: number): Promise<World> => {
      if (controller.signal.aborted)
        return Promise.reject(controller.signal.reason);
      if (!observer) {
        observer = new ObserverRunController(world);
        observer.setCommit((next) => observer!.syncWorld(next));
      } else observer.syncWorld(world);
      return observer.step(days);
    };
    const startedAt = performance.now();
    const deadlineAt = startedAt + LIFE_START_BUDGET_MS;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame: number | undefined;
    const clock = window.setInterval(
      () =>
        setElapsed(
          Math.min(performance.now() - startedAt, LIFE_START_BUDGET_MS),
        ),
      1000,
    );
    const deadline = window.setTimeout(() => {
      setElapsed(LIFE_START_BUDGET_MS);
      setProblem("Your life reached the two-minute limit.");
      controller.abort(
        new DOMException("The two-minute limit was reached.", "TimeoutError"),
      );
    }, LIFE_START_BUDGET_MS);
    const timer = window.setTimeout(
      () => {
        frame = window.requestAnimationFrame(() => {
          if (controller.signal.aborted) return;
          void prepare
            .current(
              (next) => {
                if (!controller.signal.aborted)
                  flushSync(() =>
                    setProgress((previous) => ({
                      ...next,
                      world: next.world ?? previous.world,
                      playerPersonId:
                        next.playerPersonId ?? previous.playerPersonId,
                    })),
                  );
              },
              controller.signal,
              deadlineAt,
              advanceHistory,
            )
            .catch((error: unknown) => {
              if (!controller.signal.aborted) {
                setProblem(
                  error instanceof Error
                    ? error.message
                    : "This life could not be started.",
                );
                controller.abort();
              }
            })
            .finally(() => {
              stopObserver();
              window.clearInterval(clock);
              window.clearTimeout(deadline);
            });
        });
      },
      reduced ? 0 : FADE_MS,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      window.clearTimeout(deadline);
      window.clearInterval(clock);
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
      <div className="pg-life-transition-story">
        <header className="pg-life-transition-heading">
          <h1>{story?.year ?? "Your life"}</h1>
          {story && (
            <p>
              {story.place} · {proseDate(story.date)}
            </p>
          )}
          <time
            className="pg-life-transition-clock"
            aria-label="Elapsed preparation time"
          >
            {elapsedClock(elapsed)} / 2:00
          </time>
        </header>
        <div className="pg-life-transition-progress" role="status">
          <p>{problem ?? progress.label}</p>
          {!problem && (
            <progress
              aria-label={progress.label}
              {...(!counted
                ? {}
                : { value: progress.completed, max: progress.total })}
            />
          )}
          {counted && !problem && (
            <span>
              {progress.completed} / {progress.total}
            </span>
          )}
          {problem && onReturn && (
            <button type="button" onClick={onReturn}>
              Return to Creator
            </button>
          )}
        </div>
        {story && (
          <div className="pg-life-transition-columns">
            <section
              className="pg-life-transition-journal"
              aria-label="My journal"
            >
              <h2>My journal</h2>
              {story.chapters.map((chapter) => (
                <article key={chapter.year}>
                  <h3>{chapter.year}</h3>
                  {chapter.sentences.map((sentence, index) => (
                    <p key={`${index}:${sentence}`}>{sentence}</p>
                  ))}
                </article>
              ))}
            </section>
            <div>
              {story.headlines.length > 0 && (
                <section
                  className="pg-life-transition-headlines"
                  aria-label="Town headlines"
                >
                  <h2>{story.place}</h2>
                  {story.headlines.map((headline) => (
                    <article key={headline.id}>
                      <p>
                        <time>{proseDate(headline.publishedAt)}</time> ·{" "}
                        {headline.outletName}
                      </p>
                      <h3>{headline.headline}</h3>
                    </article>
                  ))}
                </section>
              )}
              {progress.world && progress.playerPersonId && (
                <section
                  className="pg-life-transition-map"
                  aria-label="Elections"
                >
                  <h2>Elections</h2>
                  <PoliticalMap
                    world={progress.world}
                    personId={progress.playerPersonId}
                    preferences={{
                      ...mapPreferences,
                      initialized: true,
                      stateUsps: story.stateUsps,
                    }}
                    onPreferencesChange={setMapPreferences}
                    onOpenPerson={() => {}}
                  />
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
