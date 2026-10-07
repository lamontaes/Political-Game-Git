import { useState } from "react";
import type { World } from "../simulation/types";
import { CAREER_PROVIDERS } from "../presentation/career-path7-provider";
import {
  startCareerWork,
  careerEligibility,
  careerOfferAccepted,
  seekCareerOffer,
  respondCareerOffer,
  acceptCareerResponsibilities,
  resignCareer,
} from "../simulation/career-path7";
import {
  employerName,
  lifePathDefinition,
} from "../simulation/life-paths2-catalog";
import { pathForRelationship } from "../simulation/life-paths2";
import type { LifePathResult } from "../simulation/life-paths2";
import { workRoleAt, workStatusAt } from "../simulation/life-queries";
import { projectPracticalOpportunities } from "../presentation/practical-opportunities";
import { InlineDayControl } from "./controls/InlineDayControl";
export function CareerPathsPanel({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (w: World) => void;
}) {
  const [selected, setSelected] = useState(CAREER_PROVIDERS[0]!.id),
    [query, setQuery] = useState(""),
    [wide, setWide] = useState(false);
  const p = CAREER_PROVIDERS.find((p) => p.id === selected)!;
  const path = lifePathDefinition(p.pathId);
  const act = (r: LifePathResult) => {
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
              {choice.relationshipId ? choice.status : null}
            </small>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ui-action ui-action--subtle"
        onClick={() => setWide(!wide)}
      >
        {wide ? "Show suggested work" : "Browse all listed work"}
      </button>
      <h4>{path.title}</h4>
      <button
        disabled={!!reason}
        onClick={() => act(seekCareerOffer(world, p))}
      >
        Seek an offer
      </button>
      {mine.map((r) => {
        const status = workStatusAt(world, r.id)?.status;
        // Accepting leaves the status at "expected" until work begins, so an
        // accepted offer is told apart by its acceptance, not its status.
        const accepted =
          status === "expected" && careerOfferAccepted(world, r.id);
        return (
          <article key={r.id}>
            <h4>{workRoleAt(world, r.id)?.title}</h4>
            <p>{status}</p>
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
                  onOutcome={() => {}}
                  unavailableNote=""
                  showContext={false}
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
                  <li key={e.id}>{e.occurredAt}</li>
                ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
