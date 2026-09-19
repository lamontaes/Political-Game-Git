import { useEffect, useRef, useState } from "react";

/**
 * "Retire from play", from in-game Options.
 *
 * Asked in place, the way deleting a save is asked: nothing happens until the
 * second, plainly worded button. Escape or "Keep playing" puts the question
 * away and returns focus to the button that raised it.
 */
export function RetireFromPlayAction({
  name,
  onRetire,
}: {
  /** The character being played. */
  readonly name: string;
  /** Returns a reason when the retirement was refused. */
  readonly onRetire: () => string | null;
}) {
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);

  useEffect(() => {
    if (asking) confirmRef.current?.focus();
    else if (wasAsking.current) askRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  return (
    <section
      className="pg-personal-section"
      data-testid="retire-from-play-section"
    >
      <h3>Retire from play</h3>
      <p className="game-note" id="retire-from-play-note">
        Stop playing {name}. They go on living, and keep their work and
        commitments. You can then continue as a family member or keep watching
        the world.
      </p>
      {asking ? (
        <div
          role="alertdialog"
          aria-labelledby="retire-from-play-question"
          className="pg-retire-confirm"
          data-testid="retire-confirm"
          onKeyDown={(event) => {
            // Escape answers this question only; Options stays open.
            if (event.key !== "Escape") return;
            event.stopPropagation();
            setAsking(false);
          }}
        >
          <p id="retire-from-play-question">
            Stop playing {name}? This cannot be undone.
          </p>
          <button
            ref={confirmRef}
            type="button"
            className="ui-action ui-action--primary"
            data-testid="retire-confirm-yes"
            onClick={() => {
              const refused = onRetire();
              setProblem(refused);
              if (refused === null) wasAsking.current = false;
              setAsking(false);
            }}
          >
            Retire {name} from play
          </button>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="retire-confirm-no"
            onClick={() => setAsking(false)}
          >
            Keep playing
          </button>
        </div>
      ) : (
        <button
          ref={askRef}
          type="button"
          className="ui-action"
          data-testid="retire-from-play"
          aria-describedby="retire-from-play-note"
          onClick={() => {
            setProblem(null);
            setAsking(true);
          }}
        >
          Retire from play
        </button>
      )}
      {problem ? (
        <p className="game-note" role="alert" data-testid="retire-problem">
          {problem}
        </p>
      ) : null}
    </section>
  );
}
