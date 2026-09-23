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
  careerOfferAccepted,
  seekCareerOffer,
  respondCareerOffer,
  performCareerWork,
  acceptCareerResponsibilities,
  resignCareer,
} from "../simulation/career-path7";
import {
  employerName,
  lifePathDefinition,
} from "../simulation/life-paths2-catalog";
import {
  pathForRelationship,
  LIFE_PATHS2_HANDLERS,
} from "../simulation/life-paths2";
import type { LifePathResult } from "../simulation/life-paths2";
import { workRoleAt, workStatusAt } from "../simulation/life-queries";
import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";
import { projectPracticalOpportunities } from "../presentation/practical-opportunities";
import { InlineDayControl } from "./controls/InlineDayControl";
import { nationalMedianWageSentence } from "../presentation/career-wage";
import { proseDate } from "../presentation/prose-dates";
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
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [wide, setWide] = useState(false);
  const p = CAREER_PROVIDERS.find((p) => p.id === selected)!;
  const path = lifePathDefinition(p.pathId);
  const act = (r: LifePathResult) => {
    setNotice(r.message);
    if (r.ok) onWorldChange(r.world);
  };
  if (world.control.kind !== "person") return null;
  const actor = world.control.personId;
  const opportunities = projectPracticalOpportunities(world, actor, query);
  const choices =
    wide || query.trim()
      ? opportunities.careers
      : opportunities.suggestedCareers;
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
        Find work{" "}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="pg-opportunity-choices" aria-label="Work choices">
        {choices.map((choice) => (
          <button
            type="button"
            className="ui-action"
            key={choice.id}
            aria-pressed={selected === choice.id}
            onClick={() => setSelected(choice.id)}
          >
            <strong>{choice.path.title}</strong>
            <small>
              {employerName(choice.path)} ·{" "}
              {choice.relationshipId
                ? choice.status
                : (choice.unavailable ?? "Meets the listed entry requirements")}
            </small>
          </button>
        ))}
        {choices.length === 0 ? <p>No matching work is listed.</p> : null}
      </div>
      <button
        type="button"
        className="ui-action ui-action--subtle"
        onClick={() => setWide(!wide)}
      >
        {wide ? "Show suggested work" : "Browse all listed work"}
      </button>
      <h4>{path.title}</h4>
      <p>
        {employerName(path)} pays ${(path.sessionPayMinor / 100).toFixed(2)} for
        a completed {path.sessionMinutes}-minute shift, on the following day.
      </p>
      <p>{path.responsibility}</p>
      <button
        disabled={!!reason}
        onClick={() => act(seekCareerOffer(world, p))}
      >
        Seek an offer
      </button>
      {reason && <p>{reason}</p>}
      {/*
       * What this work pays nationally is a fact about the job, and a player
       * choosing between two of them wants it. Where the game read it is not,
       * so the occupation code, the record id and the publisher attribution
       * that used to sit above it stay on the record instead of on this
       * screen.
       */}
      {world.currentDate >= "2026-09-09" && source.wage && (
        <p>{nationalMedianWageSentence(source.wage)}</p>
      )}
      {mine.map((r) => {
        const status = workStatusAt(world, r.id)?.status;
        // Accepting leaves the status at "expected" until work begins, so an
        // accepted offer is told apart by its acceptance, not its status.
        const accepted =
          status === "expected" && careerOfferAccepted(world, r.id);
        const startReached = r.startedAt <= world.currentDate;
        return (
          <article key={r.id}>
            <h4>{workRoleAt(world, r.id)?.title}</h4>
            <p>
              {accepted
                ? startReached
                  ? "You accepted this offer. You can begin work now."
                  : `You accepted this offer. Work begins ${proseDate(r.startedAt)}.`
                : status === "expected"
                  ? "Offer awaiting your response"
                  : status === "ended"
                    ? "Engagement ended"
                    : status}
            </p>
            {status === "expected" ? (
              <>
                {accepted ? null : (
                  <>
                    <button
                      onClick={() =>
                        act(respondCareerOffer(world, r.id, p, true))
                      }
                    >
                      Accept offer
                    </button>
                    <button
                      onClick={() =>
                        act(respondCareerOffer(world, r.id, p, false))
                      }
                    >
                      Refuse offer
                    </button>
                    <p>Starts {proseDate(r.startedAt)}.</p>
                  </>
                )}
                {/*
                  One clock. "Wait one day" used to call `advanceWorldMinutes`
                  from its own onClick: no disclosed destination, no pending
                  state, and a second press could spend a second day over the
                  first. It submits the shared day command now.
                */}
                <InlineDayControl
                  world={world}
                  personId={actor}
                  label="Wait one day"
                  testid="career-paths-wait-day"
                  onOutcome={setNotice}
                  unavailableNote="Waiting a day is not offered here: this panel is open outside the play shell, which owns the one clock."
                />
                {accepted ? (
                  <button onClick={() => act(startCareerWork(world, r.id, p))}>
                    Begin accepted work
                  </button>
                ) : null}
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
      {/* The clock's own report is several lines; keep them as lines. */}
      <p role="status" style={{ whiteSpace: "pre-line" }}>
        {notice}
      </p>
    </section>
  );
}
