import { useEffect, useRef } from "react";

import { personName, type EntityId, type World } from "../simulation";
import type {
  RunDLiteFixture,
  RunDLiteProjection,
} from "../presentation/run-d-lite";
import type { WorkPendingGroup } from "../simulation/time-work";

interface WorkPendingWorkspaceProps {
  readonly world: World;
  readonly fixture: RunDLiteFixture;
  readonly projection: RunDLiteProjection;
  readonly feedback: string | null;
  readonly onClose: () => void;
  readonly onDelegate: () => void;
  readonly onOpenDocument: () => void;
  readonly onOpenCalendarItem: (activityId: EntityId) => void;
  readonly onFocusPerson: (personId: EntityId) => void;
}

const GROUPS: readonly {
  readonly key: WorkPendingGroup;
  readonly title: string;
  readonly description: string;
}[] = [
  {
    key: "needs-you",
    title: "Needs you",
    description: "A decision or action is still yours.",
  },
  {
    key: "waiting-on-others",
    title: "Waiting on others",
    description: "The next move belongs to someone else.",
  },
  {
    key: "staff-handling",
    title: "Staff handling",
    description: "Assigned office work can continue while you are elsewhere.",
  },
  {
    key: "completed-ready",
    title: "Completed / ready to review",
    description: "Finished work has returned to the office.",
  },
];

export function WorkPendingWorkspace({
  world,
  fixture,
  projection,
  feedback,
  onClose,
  onDelegate,
  onOpenDocument,
  onOpenCalendarItem,
  onFocusPerson,
}: WorkPendingWorkspaceProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  return (
    <section
      className="planning-workspace work-pending-workspace"
      aria-labelledby="work-pending-title"
      data-testid="work-pending-workspace"
    >
      <header className="planning-workspace-header">
        <div>
          <p>Office catch-up</p>
          <h2 id="work-pending-title">Work / Pending</h2>
          <span>What actually needs me?</span>
        </div>
        <button ref={closeRef} type="button" onClick={onClose}>
          Return to office
        </button>
      </header>

      {feedback ? (
        <p className="work-feedback" role="status" data-testid="work-feedback">
          {feedback}
        </p>
      ) : null}

      <div className="work-groups">
        {GROUPS.map((group) => {
          const entries = projection.work.filter(
            (entry) => entry.group === group.key,
          );
          return (
            <section
              key={group.key}
              className={`work-group work-group--${group.key}`}
              data-testid={`work-group-${group.key}`}
              aria-labelledby={`work-group-title-${group.key}`}
            >
              <header>
                <h3 id={`work-group-title-${group.key}`}>{group.title}</h3>
                <p>{group.description}</p>
              </header>
              {entries.length > 0 ? (
                <div className="work-entry-list">
                  {entries.map(({ item, state }) => {
                    const focus = item.focus;
                    return (
                      <article key={item.id} className="work-entry">
                        <div className="work-entry-copy">
                          <h4>{item.title}</h4>
                          <p>{item.summary}</p>
                          <span>
                            {ownerLabel(world, state.assignedPersonIds)}
                          </span>
                          {state.blocker ? <em>{state.blocker}</em> : null}
                          {focus.kind === "legislative-material" ? (
                            <small>Transit Access Pilot working document</small>
                          ) : focus.kind === "calendar-item" ? (
                            <small>Linked to the community meeting</small>
                          ) : focus.kind === "person" ? (
                            <small>
                              Follow up with{" "}
                              {personLabel(world, focus.personId)}
                            </small>
                          ) : null}
                        </div>
                        <div className="work-entry-actions">
                          {item.id === fixture.dLite.delegableWorkItemId &&
                          state.playerRequirement === "action" ? (
                            <button type="button" onClick={onDelegate}>
                              Delegate to Collins
                            </button>
                          ) : null}
                          {focus.kind === "legislative-material" ? (
                            <button type="button" onClick={onOpenDocument}>
                              Open working document
                            </button>
                          ) : focus.kind === "calendar-item" ? (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenCalendarItem(focus.scheduledActivityId)
                              }
                            >
                              Show on calendar
                            </button>
                          ) : focus.kind === "person" ? (
                            <button
                              type="button"
                              onClick={() => onFocusPerson(focus.personId)}
                            >
                              Return to {personLabel(world, focus.personId)}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="work-group-empty">Nothing here right now.</p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function personLabel(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? personName(person) : "office colleague";
}

function ownerLabel(world: World, personIds: readonly EntityId[]): string {
  const names = personIds.map((personId) => personLabel(world, personId));
  return names.length === 1
    ? `Handled by ${names[0]}`
    : `Handled by ${names.join(", ")}`;
}
