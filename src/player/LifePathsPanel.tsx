import { useState } from "react";
import { CareerPathsPanel } from "./CareerPathsPanel";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";
import { LIFE_PATHS2_CATALOG } from "../simulation/life-paths2-catalog";
import {
  acceptLifePathCounteroffer,
  activateLifePathRecruit,
  changeLifePathStatus,
  completedStudySessions,
  delegateLifePathWork,
  departLifePathRecruit,
  enterLifePath,
  knownLifePathPeople,
  LIFE_PATHS2_HANDLERS,
  lifePathEntryReason,
  pathForRelationship,
  performLifePathSession,
  progressLifePathWork,
  recruitLifePathPerson,
  scheduleLifePathSession,
} from "../simulation/life-paths2";
import type { LifePathResult } from "../simulation/life-paths2";
import {
  educationEnrollmentStateAt,
  workStatusAt,
  workRoleAt,
} from "../simulation/life-queries";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import {
  scheduledActivityState,
  workItemState,
  advanceWorldMinutes,
} from "../simulation/time-work";
import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";

/** Feature-local adapter. UI-CORE owns opening/closing this panel and the World. */
export interface LifePathsPanelProps {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}
export function LifePathsPanel({
  world,
  onWorldChange,
  transitionHandlers,
}: LifePathsPanelProps) {
  const [notice, setNotice] = useState("");
  const [person, setPerson] = useState<EntityId | "">("");
  const [role, setRole] = useState("community-volunteer");
  const [pay, setPay] = useState("0");
  if (world.control.kind !== "person")
    return <p>Choose a person to pursue education or work.</p>;
  const actor = world.control.personId;
  const handlers = transitionHandlers
    ? composeFutureTransitionHandlerRegistries(
        LIFE_PATHS2_HANDLERS,
        transitionHandlers,
      )
    : LIFE_PATHS2_HANDLERS;
  const act = (result: LifePathResult) => {
    setNotice(result.message);
    if (result.ok) onWorldChange(result.world);
  };
  const mine = [
    ...world.history.educationEnrollments,
    ...world.history.workRelationships,
  ].filter((r) => r.personId === actor && pathForRelationship(world, r.id));
  const offers = world.history.workRelationships.filter(
    (w) =>
      w.personId !== actor &&
      world.history.events.some(
        (e) =>
          e.type === "life-paths2.offer" &&
          e.involvedEntityIds.includes(w.id) &&
          e.involvedEntityIds.includes(actor),
      ),
  );
  const name = (id: EntityId) =>
    world.people[id]?.givenName + " " + world.people[id]?.familyName;
  return (
    <section aria-label="Education and work">
      <h2>Education and work</h2>
      <p role="status" aria-live="polite">
        {notice}
      </p>
      <CareerPathsPanel
        world={world}
        onWorldChange={onWorldChange}
        transitionHandlers={handlers}
      />
      <h3>Available paths</h3>
      <p>These opportunities and terms are fictional parts of the game.</p>
      {LIFE_PATHS2_CATALOG.filter((p) => p.scope === "personal").map((path) => {
        const reason = lifePathEntryReason(world, actor, path);
        return (
          <article key={path.id}>
            <h4>{path.title}</h4>
            <p>{path.organizationName}</p>
            <p>{path.responsibility}</p>
            <p>
              {path.sessionMinutes / 60} hours per session.{" "}
              {path.sessionCostMinor > 0
                ? `You pay $${path.sessionCostMinor / 100} after each attended session.`
                : path.sessionPayMinor > 0
                  ? `The employer pays $${path.sessionPayMinor / 100} the day after each completed shift.`
                  : "This is unpaid volunteer work."}
            </p>
            {path.requiredSessions && (
              <p>
                {path.requiredSessions} sessions, at least {path.minimumGapDays}{" "}
                days apart, lead to {path.credential}.
              </p>
            )}
            {reason && <p>{reason}</p>}
            <button
              disabled={!!reason}
              onClick={() => act(enterLifePath(world, path.id))}
            >
              {path.kind === "study" ? "Enroll in" : "Accept"} {path.title}
            </button>
          </article>
        );
      })}
      <button
        onClick={() => {
          const next = advanceWorldMinutes(world, 1440, handlers);
          act(
            next === world
              ? {
                  ok: false,
                  world,
                  message: "A calendar commitment must be resolved first.",
                }
              : { ok: true, world: next, message: "One day passed." },
          );
        }}
      >
        Continue one day
      </button>
      <h3>Your paths</h3>
      {mine.map((record) => {
        const path = pathForRelationship(world, record.id)!;
        const status =
          path.kind === "study"
            ? educationEnrollmentStateAt(world, record.id)?.status
            : workStatusAt(world, record.id)?.status;
        const sessions = world.history.scheduledActivities.filter(
          (a) =>
            a.sourceEntityIds.includes(record.id) &&
            scheduledActivityState(world, a.id).status === "scheduled",
        );
        return (
          <article key={record.id}>
            <h4>
              {path.kind === "work"
                ? workRoleAt(world, record.id)?.title
                : path.title}
            </h4>
            <p>
              {status === "temporarily-inactive" ? "Interrupted" : status}.{" "}
              {path.kind === "study"
                ? `${completedStudySessions(world, record.id)} attended sessions.`
                : ""}
            </p>
            {path.kind === "work" && status === "active" && (
              <button
                onClick={() => act(progressLifePathWork(world, record.id))}
              >
                Review progression
              </button>
            )}
            {status === "completed" && (
              <p>{educationEnrollmentStateAt(world, record.id)?.reason}</p>
            )}
            {status === "active" && (
              <>
                <button
                  onClick={() => act(scheduleLifePathSession(world, record.id))}
                >
                  Schedule next session
                </button>
                <button
                  onClick={() =>
                    act(changeLifePathStatus(world, record.id, "pause"))
                  }
                >
                  Interrupt
                </button>
              </>
            )}
            {status === "temporarily-inactive" && (
              <button
                onClick={() =>
                  act(changeLifePathStatus(world, record.id, "return"))
                }
              >
                Return
              </button>
            )}
            {(status === "active" || status === "temporarily-inactive") && (
              <button
                onClick={() =>
                  act(changeLifePathStatus(world, record.id, "leave"))
                }
              >
                Leave
              </button>
            )}
            {sessions.map((a) => {
              const state = scheduledActivityState(world, a.id);
              return (
                <div key={a.id}>
                  <p>
                    {state.start.date},{" "}
                    {Math.floor(state.start.minuteOfDay / 60)}:
                    {String(state.start.minuteOfDay % 60).padStart(2, "0")} —{" "}
                    {path.sessionMinutes / 60} hours. Attending advances the
                    clock to the end of this session.
                  </p>
                  <button
                    onClick={() =>
                      act(performLifePathSession(world, a.id, handlers))
                    }
                  >
                    Attend {path.title}
                  </button>
                </div>
              );
            })}
          </article>
        );
      })}
      <h3>Recruit someone you know</h3>
      <p>
        Personal assignments use your own money. Campaign assignments use the
        active campaign’s treasury. Public-office hiring is unavailable until
        its authority and restrictions are established.
      </p>
      <label>
        Person{" "}
        <select
          value={person}
          onChange={(e) => setPerson(e.target.value as EntityId)}
        >
          <option value="">Choose a person</option>
          {knownLifePathPeople(world, actor).map((id) => (
            <option key={id} value={id}>
              {name(id)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Work{" "}
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPay(
              String(
                (LIFE_PATHS2_CATALOG.find((p) => p.id === e.target.value)
                  ?.sessionPayMinor ?? 0) / 100,
              ),
            );
          }}
        >
          {LIFE_PATHS2_CATALOG.filter((p) => p.kind === "work").map((p) => (
            <option value={p.id} key={p.id}>
              {p.title} ({p.scope})
            </option>
          ))}
        </select>
      </label>
      <label>
        Dollars per completed assignment{" "}
        <input
          type="number"
          min="0"
          step="0.01"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
        />
      </label>
      <button
        disabled={!person}
        onClick={() => {
          if (person)
            act(
              recruitLifePathPerson(
                world,
                person,
                role,
                Math.round(Number(pay) * 100),
              ),
            );
        }}
      >
        Make offer
      </button>
      {offers.map((work) => {
        const status = workStatusAt(world, work.id)?.status;
        const negotiated = world.history.events.some(
          (e) =>
            e.type === "life-paths2.offer-negotiated" &&
            e.involvedEntityIds.includes(work.id),
        );
        const accepted = world.history.events.some(
          (e) =>
            e.type === "life-paths2.offer-accepted" &&
            e.involvedEntityIds.includes(work.id),
        );
        const flow = world.history.resourceFlows.find(
          (f) =>
            f.basisReference.kind === "work" &&
            f.basisReference.workRelationshipId === work.id,
        );
        const amount = flow
          ? resourceFlowTermsAt(world, flow.id)?.amount.minorUnits
          : 0;
        return (
          <article key={work.id}>
            <h4>
              {name(work.personId)} — {workRoleAt(world, work.id)?.title}
            </h4>
            <p>
              {status === "ended"
                ? "Engagement ended or offer declined"
                : status === "expected"
                  ? accepted
                    ? "Accepted; awaiting start"
                    : negotiated
                      ? "Counteroffer pending"
                      : "Awaiting response"
                  : "Working"}
              .{" "}
              {amount
                ? `$${amount / 100} per completed assignment.`
                : "Unpaid."}
            </p>
            {negotiated && !accepted && status === "expected" && (
              <>
                <p>
                  They request $
                  {Math.max(
                    amount ?? 0,
                    Math.ceil(
                      pathForRelationship(world, work.id)!.sessionPayMinor *
                        1.25,
                    ),
                  ) / 100}{" "}
                  per completed assignment.
                </p>
                <button
                  onClick={() =>
                    act(acceptLifePathCounteroffer(world, work.id))
                  }
                >
                  Accept revised terms
                </button>
              </>
            )}
            {accepted && status === "expected" && (
              <button
                onClick={() => act(activateLifePathRecruit(world, work.id))}
              >
                Start engagement
              </button>
            )}
            {status === "active" && (
              <>
                <button
                  onClick={() => act(delegateLifePathWork(world, work.id))}
                >
                  Assign work
                </button>
                <button
                  onClick={() => act(departLifePathRecruit(world, work.id))}
                >
                  End engagement
                </button>
              </>
            )}
            {world.history.workItems
              .filter((i) => i.sourceEntityIds.includes(work.id))
              .map((i) => (
                <p key={i.id}>
                  {i.summary} —{" "}
                  {workItemState(world, i.id).status === "ready-for-review"
                    ? "Ready for review"
                    : status === "ended"
                      ? "Stopped"
                      : "In progress"}
                </p>
              ))}
          </article>
        );
      })}
    </section>
  );
}
