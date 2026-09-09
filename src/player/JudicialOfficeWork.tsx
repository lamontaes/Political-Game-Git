import { useState } from "react";
import {
  projectJudicialOffice,
  receiveNextJudicialOfficeWork,
} from "../presentation/judicial-office";
import {
  completeJudicialOfficeFollowUp,
  respondToJudicialOfficeWork,
  type JudicialOfficeResult,
} from "../simulation/judicial-office-work";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";
import "./judicial-office.css";

export function JudicialOfficeWork({
  world,
  courtOrganizationId,
  onWorldChange,
  onPerson,
  transitionHandlers,
}: {
  readonly world: World;
  readonly courtOrganizationId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onPerson?: (personId: EntityId) => void;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const view = projectJudicialOffice(world, courtOrganizationId);
  function apply(result: JudicialOfficeResult) {
    if (result.ok) {
      onWorldChange(result.world);
      setMessage(null);
    } else setMessage(result.reason);
  }
  if (!view)
    return (
      <p role="status">This judicial office is no longer available to you.</p>
    );
  const active = view.assignments.filter((a) => a.state.status === "active");
  const following = view.followUps.filter((f) => f.state.status === "active");
  return (
    <section className="judicial-office" aria-label="Judicial office work">
      <h2>Office work</h2>
      <p>{view.office.name}</p>
      {message && <p role="alert">{message}</p>}
      {!active.length && !following.length && (
        <button
          type="button"
          onClick={() =>
            apply(receiveNextJudicialOfficeWork(world, courtOrganizationId))
          }
        >
          Check office correspondence
        </button>
      )}
      {active.map((a) => (
        <article key={a.item.id} aria-labelledby={`jud-title-${a.item.id}`}>
          <h3 id={`jud-title-${a.item.id}`}>{a.item.title}</h3>
          <p>{a.evidence.description}</p>
          <div className="judicial-office-people">
            {a.participants
              .filter((p) => p.id !== view.office.principalId)
              .map((p) =>
                onPerson ? (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => onPerson(p.id)}
                  >
                    {p.name}
                  </button>
                ) : (
                  <span key={p.id}>{p.name}</span>
                ),
              )}
          </div>
          <p>
            {a.timing
              ? `The review takes ${a.timing.activityMinutes} minutes, after a ${a.timing.waitMinutes}-minute wait.`
              : `The scheduled review is ${a.activityState.status}.`}{" "}
            A follow-up note reserves another 20 minutes for your preparation.
          </p>
          {a.blocker && <p role="status">{a.blocker}</p>}
          <div className="judicial-office-choices">
            {a.content.responses.map((r) => (
              <button
                type="button"
                key={r.key}
                disabled={!!a.blocker}
                onClick={() =>
                  apply(
                    respondToJudicialOfficeWork(
                      world,
                      courtOrganizationId,
                      a.item.id,
                      r.key,
                      transitionHandlers,
                    ),
                  )
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </article>
      ))}
      {following.map((f) => (
        <article key={f.item.id}>
          <h3>{f.item.title}</h3>
          <p>{f.item.summary}</p>
          <p>Preparing the note takes 20 minutes.</p>
          <button
            type="button"
            disabled={!!f.assignment.blocker}
            onClick={() =>
              apply(
                completeJudicialOfficeFollowUp(
                  world,
                  courtOrganizationId,
                  f.item.id,
                  transitionHandlers,
                ),
              )
            }
          >
            Prepare the follow-up note
          </button>
          {f.assignment.blocker && <p>{f.assignment.blocker}</p>}
        </article>
      ))}
      <details>
        <summary>Office history</summary>
        {view.assignments
          .filter((a) => a.response)
          .map((a) => (
            <p key={a.item.id}>
              <time>{a.response!.occurredAt}</time> —{" "}
              {a.response!.context.choice}
            </p>
          ))}
        {view.followUps
          .filter((f) => f.completion)
          .map((f) => (
            <p key={f.item.id}>
              <time>{f.completion!.occurredAt}</time> — {f.completion!.summary}
            </p>
          ))}
      </details>
      <details>
        <summary>Scope and availability</summary>
        <p>
          These interactions record office communications and discussions. They
          do not decide cases, discipline staff, settle inquiries, or establish
          selection law.
        </p>
        <p>
          Six adapted office-practice workflows are supported when their
          participants are available. Four other compiled workflows need court
          records. Fifty bank entries remain mechanic-gated.
        </p>
        <ul>
          {view.coverage
            .filter((r) => r.blockers.length)
            .map((r) => (
              <li key={r.id}>
                {r.id}: {r.blockers.join("; ")}
              </li>
            ))}
        </ul>
      </details>
    </section>
  );
}
