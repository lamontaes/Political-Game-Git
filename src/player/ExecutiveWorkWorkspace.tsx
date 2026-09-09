import { useEffect, useRef, useState } from "react";
import { projectExecutiveWork } from "../presentation/executive-work";
import {
  actOnExecutiveWork,
  spendExecutiveWorkTime,
  type ExecutiveWorkAction,
} from "../simulation/executive-work";
import type { ExecutiveKernelId } from "../simulation/executive-governing-kernels";
import type {
  World,
  EntityId,
  FutureTransitionHandlerRegistry,
} from "../simulation/types";

/** UI-CORE-RELEASE adapter: mount inside the ordinary Work destination and
 * replace its existing World only after this feature returns a successful act. */
export function ExecutiveWorkWorkspace({
  world,
  onWorldChange,
  onClose,
  handlers,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly onClose: () => void;
  readonly handlers?: FutureTransitionHandlerRegistry;
}) {
  const projection = projectExecutiveWork(world);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  function act(
    itemId: EntityId,
    kernelId: ExecutiveKernelId,
    action: ExecutiveWorkAction,
  ) {
    const result = actOnExecutiveWork(
      world,
      itemId,
      kernelId,
      action,
      handlers,
      statement,
    );
    if (result.ok) {
      onWorldChange(result.world);
      setFeedback(null);
    } else setFeedback(result.reason);
  }
  return (
    <section
      className="planning-workspace work-pending-workspace"
      aria-label="Executive work"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="planning-workspace-header">
        <h2>Office work</h2>
        {projection.available && (
          <button
            onClick={() => {
              const result = spendExecutiveWorkTime(world, handlers);
              if (result.ok) {
                onWorldChange(result.world);
                setFeedback(null);
              } else setFeedback(result.reason);
            }}
          >
            Work for 30 minutes
          </button>
        )}
        <button ref={close} onClick={onClose}>
          Return
        </button>
      </header>
      {feedback && <p role="status">{feedback}</p>}
      {!projection.available ? (
        <p>{projection.reason}</p>
      ) : projection.items.length === 0 ? (
        <p>No incoming work is recorded.</p>
      ) : (
        projection.items.map((item) => (
          <article key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            {item.practices.length === 0 ? (
              <p>
                This work cannot proceed with the current records, staff and
                represented authority.
              </p>
            ) : (
              item.practices.map((practice) => (
                <details key={practice.id}>
                  <summary>{practice.title}</summary>
                  {practice.facts.map((fact) => (
                    <p key={fact.key}>{fact.text}</p>
                  ))}
                  {practice.decision && (
                    <label>
                      Instruction
                      <textarea
                        value={statement}
                        onChange={(event) => setStatement(event.target.value)}
                      />
                    </label>
                  )}
                  {practice.decision && (
                    <>
                      <button
                        onClick={() =>
                          act(item.id, practice.id, "return-for-work")
                        }
                      >
                        Return for staff review
                      </button>
                      <button
                        onClick={() => act(item.id, practice.id, "defer")}
                      >
                        Defer review for 7 days
                      </button>
                    </>
                  )}
                  {practice.complete ? (
                    <p>This office work is complete.</p>
                  ) : practice.disposition ? (
                    <>
                      <label>
                        Message
                        <textarea
                          value={statement}
                          onChange={(event) => setStatement(event.target.value)}
                        />
                      </label>
                      <button onClick={() => act(item.id, practice.id, "sign")}>
                        Sign the measure
                      </button>
                      {practice.canVeto && (
                        <button
                          onClick={() =>
                            act(item.id, practice.id, "veto-with-message")
                          }
                        >
                          Return with a veto message
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => act(item.id, practice.id, "continue")}
                    >
                      {practice.actionLabel}
                    </button>
                  )}
                </details>
              ))
            )}
          </article>
        ))
      )}
    </section>
  );
}
