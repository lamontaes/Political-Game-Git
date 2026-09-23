import { useMemo, useState } from "react";
import type { EntityId, World } from "../simulation";
import {
  playChildhoodMoment,
  projectChildhoodMoment,
} from "../presentation/childhood";

/**
 * Being a child, and slowly being allowed to decide things.
 *
 * The mount for PEOPLE's `projectChildhoodMoment` seam (CRUNCH47 B1/P14). It
 * lives inside the Personal workspace's existing "Your day, choices and
 * pending favors" section rather than on a surface of its own: this is part of
 * the day, not a separate place to go.
 *
 * No age logic is decided here. Which band a life is in, who the adult
 * responsible is, and whether the moment is watched or chosen are all the
 * producer's answers; this only draws them. When there is no moment the
 * section draws nothing at all.
 *
 * `playChildhoodMoment` is called the way the moment says: with no optionKey
 * for "watch", because at that age the adult decides and the child is left
 * with the memory; with the chosen option's key for "choose".
 */
export function ChildhoodMomentPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const moment = useMemo(
    () => projectChildhoodMoment(world, personId),
    [world, personId],
  );
  const [note, setNote] = useState<string | null>(null);

  function play(optionKey?: string) {
    try {
      const next = playChildhoodMoment(world, {
        personId,
        ...(optionKey === undefined ? {} : { optionKey }),
      });
      setNote(null);
      if (next !== world) onWorldChange(next);
    } catch (error) {
      // The seam refuses in one player-readable sentence, and changes nothing.
      setNote(error instanceof Error ? error.message : String(error));
    }
  }

  // Not a childhood, or nothing authored to play right now.
  if (!moment) return null;
  const scene = moment.scene;

  return (
    <section
      className="pg-personal-section"
      data-testid="childhood-moment"
      data-agency={moment.agency}
      data-action={moment.action}
      aria-labelledby="childhood-moment-title"
    >
      <h3 id="childhood-moment-title">
        {moment.personName}, at {moment.age}
      </h3>
      {moment.note ? (
        <p className="game-note" data-testid="childhood-moment-note">
          {moment.note}
        </p>
      ) : null}
      {scene ? (
        <>
          <p data-testid="childhood-moment-prose">{scene.prose}</p>
          {moment.action === "watch" ? (
            /*
              The adult at home decides this one. The single control is reading
              what happened, and it passes no option: naming one here would be
              the player choosing for a child the producer says cannot.
            */
            <button
              type="button"
              className="ui-action ui-action--primary"
              data-testid="childhood-moment-watch"
              onClick={() => play()}
            >
              {moment.actionLabel}
            </button>
          ) : (
            <div
              className="game-choices"
              data-testid="childhood-moment-choices"
            >
              {scene.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="ui-action"
                  data-testid={`childhood-moment-choose-${option.key}`}
                  onClick={() => play(option.key)}
                >
                  <span>{option.label}</span>
                  {option.description ? (
                    <small>{option.description}</small>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p data-testid="childhood-moment-empty">
          {moment.years.closingNote ??
            "Nothing from these years is waiting on you right now."}
        </p>
      )}
      {note ? (
        <p role="status" data-testid="childhood-moment-status">
          {note}
        </p>
      ) : null}
    </section>
  );
}
