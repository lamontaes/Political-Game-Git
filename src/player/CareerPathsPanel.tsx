import { useState } from "react";
import type {
  World,
  FutureTransitionHandlerRegistry,
} from "../simulation/types";
import {
  CAREER_PROVIDERS,
  CAREER_SOURCE_CONTEXT,
} from "../presentation/career-path7-provider";
import {
  startCareerWork,
  careerEligibility,
  seekCareerOffer,
  respondCareerOffer,
  scheduleCareerTask,
  completeCareerTask,
  acceptCareerResponsibilities,
  resignCareer,
} from "../simulation/career-path7";
import { lifePathDefinition } from "../simulation/life-paths2-catalog";
import {
  pathForRelationship,
  LIFE_PATHS2_HANDLERS,
} from "../simulation/life-paths2";
import type { LifePathResult } from "../simulation/life-paths2";
import { workRoleAt, workStatusAt } from "../simulation/life-queries";
import {
  advanceWorldMinutes,
  scheduledActivityState,
} from "../simulation/time-work";
import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";
export function CareerPathsPanel({
  world,
  onWorldChange,
  transitionHandlers,
}: {
  readonly world: World;
  readonly onWorldChange: (w: World) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [selected, setSelected] = useState(CAREER_PROVIDERS[0]!.id),
    [taskId, setTaskId] = useState(""),
    [submission, setSubmission] = useState(""),
    [notice, setNotice] = useState("");
  const p = CAREER_PROVIDERS.find((p) => p.id === selected)!;
  const path = lifePathDefinition(p.pathId);
  const task = p.tasks.find((t) => t.id === taskId) ?? p.tasks[0]!;
  const act = (r: LifePathResult) => {
    setNotice(r.message);
    if (r.ok) onWorldChange(r.world);
  };
  if (world.control.kind !== "person") return null;
  const actor = world.control.personId;
  const mine = world.history.workRelationships.filter(
    (r) =>
      r.personId === actor &&
      pathForRelationship(world, r.id)?.id === p.pathId &&
      world.history.events.some(
        (e) =>
          e.type === "career-path7.offer" && e.involvedEntityIds.includes(r.id),
      ),
  );
  const handlers = transitionHandlers
    ? composeFutureTransitionHandlerRegistries(
        LIFE_PATHS2_HANDLERS,
        transitionHandlers,
      )
    : LIFE_PATHS2_HANDLERS;
  const source = CAREER_SOURCE_CONTEXT.find((r) => r.id === p.occupationCode)!;
  const reason = careerEligibility(world, p);
  return (
    <section aria-label="Career opportunities">
      <h3>Career opportunities</h3>
      <label>
        Compare work{" "}
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setTaskId("");
            setSubmission("");
          }}
        >
          {CAREER_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {lifePathDefinition(p.pathId).title}
            </option>
          ))}
        </select>
      </label>
      <p>
        {path.organizationName} pays ${(path.sessionPayMinor / 100).toFixed(2)}{" "}
        for a completed {path.sessionMinutes}-minute shift, on the following
        day.
      </p>
      <p>{path.responsibility}</p>
      <p>
        These are fictional employer terms. Training requirements are the
        employer’s authored requirements, not legal licenses.
      </p>
      <button
        disabled={!!reason}
        onClick={() => act(seekCareerOffer(world, p))}
      >
        Seek an offer
      </button>
      {reason && <p>{reason}</p>}
      <details>
        <summary>Occupation source context</summary>
        <p>
          {source.title} · {source.id} → SOC {source.soc}
        </p>
        <p>{source.source.attribution}</p>
        <p>
          O*NET 31.0, August 2026; current source context, not a claim about
          your past. Task durations come from the employer’s authored shift.
        </p>
        {world.currentDate >= "2026-09-09" && source.wage && (
          <p>
            May 2025 national OEWS published estimate: hourly median{" "}
            {source.wage.hourlyMedian ?? "unavailable"}, annual median{" "}
            {source.wage.annualMedian ?? "unavailable"}. This is U.S. aggregate
            context, not a local wage or individual offer.
          </p>
        )}
        <a href="https://www.onetcenter.org/database.html">O*NET database</a>
        {" · "}
        <a href="https://www.bls.gov/oes/tables.htm">BLS wage tables</a>
      </details>
      {mine.map((r) => {
        const status = workStatusAt(world, r.id)?.status;
        const activity = world.history.scheduledActivities.find(
          (a) =>
            a.sourceEntityIds.includes(r.id) &&
            scheduledActivityState(world, a.id).status === "scheduled",
        );
        return (
          <article key={r.id}>
            <h4>{workRoleAt(world, r.id)?.title}</h4>
            <p>
              {status === "expected"
                ? "Offer awaiting your response"
                : status === "ended"
                  ? "Engagement ended"
                  : status}
            </p>
            {status === "expected" ? (
              <>
                <button
                  onClick={() => act(respondCareerOffer(world, r.id, p, true))}
                >
                  Accept offer
                </button>
                <button
                  onClick={() => act(respondCareerOffer(world, r.id, p, false))}
                >
                  Refuse offer
                </button>
                <p>Start date: {r.startedAt}</p>
                <button
                  onClick={() =>
                    onWorldChange(advanceWorldMinutes(world, 1440, handlers))
                  }
                >
                  Wait one day
                </button>
                <button onClick={() => act(startCareerWork(world, r.id, p))}>
                  Begin accepted work
                </button>
              </>
            ) : status === "active" ? (
              <>
                <label>
                  Responsibility{" "}
                  <select
                    value={task.id}
                    onChange={(e) => setTaskId(e.target.value)}
                  >
                    {p.tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.text}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={!!activity}
                  onClick={() =>
                    act(scheduleCareerTask(world, r.id, p, task.id))
                  }
                >
                  Schedule responsibility
                </button>
                {activity && (
                  <>
                    <p>
                      {
                        world.history.events.find(
                          (e) =>
                            e.type === "career-path7.task-planned" &&
                            e.involvedEntityIds.includes(activity.id),
                        )?.summary
                      }
                    </p>
                    <label>
                      Work submission{" "}
                      <textarea
                        value={submission}
                        maxLength={2000}
                        onChange={(e) => setSubmission(e.target.value)}
                      />
                    </label>
                    <button
                      onClick={() =>
                        act(
                          completeCareerTask(
                            world,
                            r.id,
                            p,
                            activity.id,
                            submission,
                            handlers,
                          ),
                        )
                      }
                    >
                      Perform shift and submit work
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    act(acceptCareerResponsibilities(world, r.id, p))
                  }
                >
                  Accept expanded responsibilities
                </button>
                <button onClick={() => act(resignCareer(world, r.id, p))}>
                  Resign
                </button>
              </>
            ) : null}
            <ul>
              {world.history.events
                .filter(
                  (e) =>
                    [
                      "career-path7.deliverable",
                      "career-path7.work-record",
                      "career-path7.responsibilities",
                    ].includes(e.type) && e.involvedEntityIds.includes(r.id),
                )
                .map((e) => (
                  <li key={e.id}>
                    {e.occurredAt}: {e.summary}
                  </li>
                ))}
            </ul>
          </article>
        );
      })}
      <p role="status">{notice}</p>
    </section>
  );
}
