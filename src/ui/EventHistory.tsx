import {
  claimsForEvent,
  eventsNewestFirst,
  knowledgeForEvent,
  resolveEntityLabel,
} from "../simulation";
import type { EventKnowledgeRecord, World } from "../simulation";

interface EventHistoryProps {
  readonly world: World;
}

export function EventHistory({ world }: EventHistoryProps) {
  const events = eventsNewestFirst(world.history);

  return (
    <section className="panel history-panel" aria-labelledby="history-title">
      <div className="panel-heading">
        <div>
          <p className="section-label">Global event history</p>
          <h2 id="history-title">Durable record</h2>
        </div>
        <span className="count-badge">{events.length}</span>
      </div>
      <p className="panel-intro">
        One canonical append-oriented log; person history is derived from these
        records.
      </p>
      {events.length === 0 ? (
        <p className="empty-copy">No global events have been recorded yet.</p>
      ) : (
        <ol className="event-list" role="list">
          {events.map((event) => {
            const knownBy = knowledgeForEvent(world, event.id);
            const claims = claimsForEvent(world, event.id);
            return (
              <li className="event-card" key={event.id}>
                <div className="event-meta">
                  <time dateTime={event.occurredAt}>{event.occurredAt}</time>
                  <span>{event.type}</span>
                </div>
                <p>{event.summary}</p>
                <details>
                  <summary>
                    Event record
                    <span className="visually-hidden">
                      {` for ${event.type} on ${event.occurredAt}: ${event.summary}`}
                    </span>
                  </summary>
                  <dl>
                    <div>
                      <dt>Stable ID</dt>
                      <dd>
                        <code>{event.id}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Semantic key</dt>
                      <dd>
                        <code>{event.stableKey}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Recorded</dt>
                      <dd>
                        <time dateTime={event.recordedAt}>
                          {event.recordedAt}
                        </time>
                      </dd>
                    </div>
                    <div>
                      <dt>Visibility and tags</dt>
                      <dd>
                        {event.visibility} ·{" "}
                        {event.tags.join(" · ") || "No tags"}
                      </dd>
                    </div>
                    <div>
                      <dt>Location / setting</dt>
                      <dd>
                        {event.context.location
                          ? `${event.context.location.label}${
                              event.context.location.setting
                                ? ` — ${event.context.location.setting}`
                                : ""
                            }`
                          : "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt>Social context</dt>
                      <dd>{event.context.socialContext ?? "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Pressure / choice</dt>
                      <dd>
                        {event.context.pressure ?? "No pressure recorded"} /{" "}
                        {event.context.choice ?? "No choice recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt>Motivation / reaction</dt>
                      <dd>
                        {event.context.motivation ?? "Unknown"} /{" "}
                        {event.context.immediateReaction ?? "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt>Involved</dt>
                      <dd>
                        <ul className="entity-list" role="list">
                          {event.involvedEntityIds.map((entityId) => (
                            <li key={entityId}>
                              {resolveEntityLabel(world, entityId)}{" "}
                              <code>{entityId}</code>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt>Participants</dt>
                      <dd>
                        {event.participants.length === 0 ? (
                          "No person participants"
                        ) : (
                          <ul className="entity-list" role="list">
                            {event.participants.map((participant) => (
                              <li
                                key={`${participant.personId}:${participant.role}`}
                              >
                                {resolveEntityLabel(
                                  world,
                                  participant.personId,
                                )}{" "}
                                — {participant.role}
                                {participant.detail
                                  ? ` (${participant.detail})`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Known by</dt>
                      <dd>
                        {knownBy.length === 0 ? (
                          "No knowledge records"
                        ) : (
                          <ul className="entity-list" role="list">
                            {knownBy.map((knowledge) => (
                              <li key={knowledge.id}>
                                {resolveEntityLabel(world, knowledge.personId)}{" "}
                                — {knowledge.accuracy}, {knowledge.confidence}{" "}
                                confidence, via{" "}
                                {knowledgeSourceLabel(world, knowledge)}: {" “"}
                                {knowledge.believedSummary}”
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Claims / statements</dt>
                      <dd>
                        {claims.length === 0 ? (
                          "No claims"
                        ) : (
                          <ul className="entity-list" role="list">
                            {claims.map((claim) => (
                              <li key={claim.id}>
                                {resolveEntityLabel(
                                  world,
                                  claim.speakerPersonId,
                                )}{" "}
                                ({claim.audience}, {claim.relationshipToTruth}):
                                “{claim.statement}”
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  </dl>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function knowledgeSourceLabel(
  world: World,
  knowledge: EventKnowledgeRecord,
): string {
  switch (knowledge.source.kind) {
    case "direct":
      return "direct experience";
    case "told-by":
      return `told by ${resolveEntityLabel(world, knowledge.source.sourcePersonId)}`;
    case "public-record":
      return `public record (${knowledge.source.reference})`;
    case "media":
      return `media (${knowledge.source.outlet})`;
    case "rumor":
      return knowledge.source.sourcePersonId
        ? `rumor from ${resolveEntityLabel(world, knowledge.source.sourcePersonId)}`
        : "rumor";
  }
}
