import { useEffect, useRef, useState } from "react";

import {
  continueAs,
  observeWorld,
  type LifeContinuationView,
} from "../presentation/people-continuation";
import type { EntityId, World } from "../simulation";

/**
 * What follows a played life (CRUNCH46 P5/P6), over the room.
 *
 * Shown whenever the played life has ended — by death or by retiring from
 * play — and reopened from the Observing bar while nobody is played. Every
 * choice is one of the adapter's commands; a command that refuses leaves the
 * World as it was and says why here.
 */
export function LifeContinuationPanel({
  world,
  view,
  observing,
  onCommit,
  onViewRecord,
  onClose,
}: {
  readonly world: World;
  readonly view: LifeContinuationView;
  /** True when the world is already being watched with nobody played. */
  readonly observing: boolean;
  /**
   * A command's result. `controlledPersonId` is who is played afterwards, or
   * null when the world is being observed.
   */
  readonly onCommit: (next: World, controlledPersonId: EntityId | null) => void;
  readonly onViewRecord: () => void;
  /** Only while observing: put the panel away and keep watching. */
  readonly onClose?: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<EntityId | "observe" | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [view.predecessorId]);

  useEffect(() => {
    if (!onClose) return;
    const close = onClose;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function run(
    key: EntityId | "observe",
    command: () => World,
    controlledPersonId: EntityId | null,
  ) {
    if (busy) return;
    setProblem(null);
    setBusy(key);
    // A wait can run the world on for years; let "Waiting…" paint first.
    window.setTimeout(() => {
      try {
        const next = command();
        setBusy(null);
        onCommit(next, controlledPersonId);
      } catch (error) {
        setBusy(null);
        setProblem(
          error instanceof Error
            ? error.message
            : "That could not be done. Nothing has changed.",
        );
      }
    }, 0);
  }

  return (
    <div className="pg-continuation-layer" data-testid="life-continuation">
      <section
        className="pg-continuation"
        role="dialog"
        aria-modal="false"
        aria-labelledby="pg-continuation-heading"
        aria-busy={busy !== null}
      >
        <p className="pg-continuation-kicker">
          {view.ended === "death" ? "A life ended" : "Retired from play"}
          {view.generation > 1 ? ` · Generation ${view.generation}` : ""}
        </p>
        <h2
          id="pg-continuation-heading"
          ref={headingRef}
          tabIndex={-1}
          data-testid="life-continuation-heading"
        >
          {view.heading}
        </h2>

        {view.choices.length > 0 ? (
          <ul
            className="pg-continuation-choices"
            data-testid="life-continuation-choices"
          >
            {view.choices.map((choice) => {
              const noteId = `pg-continuation-note-${choice.personId}`;
              return (
                <li key={choice.personId}>
                  <button
                    type="button"
                    className="ui-action ui-action--primary"
                    data-testid={`continue-as-${choice.personId}`}
                    disabled={busy !== null}
                    aria-describedby={noteId}
                    onClick={() =>
                      run(
                        choice.personId,
                        () =>
                          continueAs(
                            world,
                            view.predecessorId,
                            choice.personId,
                          ),
                        choice.personId,
                      )
                    }
                  >
                    {busy === choice.personId
                      ? choice.availableNow
                        ? "Continuing…"
                        : "Waiting…"
                      : choice.label}
                  </button>
                  <p className="pg-continuation-note" id={noteId}>
                    {choice.relation
                      ? `${sentenceCase(choice.relation)}, ${choice.age}.`
                      : `Not someone close to you, ${choice.age}.`}
                    {choice.waitDisclosure ? ` ${choice.waitDisclosure}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : null}
        {view.noSuccessorReason ? (
          <p
            className="pg-continuation-note"
            data-testid="life-continuation-no-successor"
          >
            {view.noSuccessorReason}
          </p>
        ) : null}

        <div className="pg-continuation-actions">
          <button
            type="button"
            className="ui-action"
            data-testid="life-continuation-record"
            disabled={busy !== null}
            onClick={onViewRecord}
          >
            View this life&rsquo;s record
          </button>
          {view.canKeepObserving ? (
            <button
              type="button"
              className="ui-action"
              data-testid="life-continuation-observe"
              disabled={busy !== null}
              onClick={() =>
                observing && onClose
                  ? onClose()
                  : run(
                      "observe",
                      () => observeWorld(world, view.predecessorId),
                      null,
                    )
              }
            >
              Keep observing
            </button>
          ) : null}
        </div>

        {view.lineage.length > 1 ? (
          <p className="pg-continuation-note" data-testid="life-lineage">
            Played in this world so far:{" "}
            {view.lineage.map((entry) => entry.name).join(", then ")}.
          </p>
        ) : null}

        {problem ? (
          <p
            className="pg-continuation-problem"
            role="alert"
            data-testid="life-continuation-problem"
          >
            {problem}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function sentenceCase(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
