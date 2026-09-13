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
  performCareerWork,
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
import { simulationMinutesBetween } from "../simulation/dates";
import { advanceWorldMinutes } from "../simulation/time-work";
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
    [notice, setNotice] = useState("");
  const p = CAREER_PROVIDERS.find((p) => p.id === selected)!;
  const path = lifePathDefinition(p.pathId);
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
                  onClick={() => {
                    const next = advanceWorldMinutes(world, 1440, handlers);
                    if (next === world)
                      setNotice(
                        "Resolve your current calendar commitment before waiting.",
                      );
                    else {
                      onWorldChange(next);
                      const elapsed = simulationMinutesBetween(
                        world.currentMoment,
                        next.currentMoment,
                      );
                      setNotice(
                        elapsed < 1440
                          ? "Time advanced, but a commitment stopped short of the requested point."
                          : "One day passed.",
                      );
                    }
                  }}
                >
                  Wait one day
                </button>
                <button onClick={() => act(startCareerWork(world, r.id, p))}>
                  Begin accepted work
                </button>
              </>
            ) : status === "active" ? (
              <>
                <button
                  onClick={() =>
                    act(performCareerWork(world, r.id, p, handlers))
                  }
                >
                  Perform work
                </button>
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
                      "life-paths2.work-session",
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
