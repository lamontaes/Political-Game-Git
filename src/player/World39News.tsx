import type { EntityId, World } from "../simulation";
import { projectWorld39News } from "../presentation/world39-news";
import "./world39-readers.css";

/** Mount before the existing PressWorkspace and publication search/follow reader. */
export function World39News({
  world,
  personId,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const model = projectWorld39News(world, personId);
  return (
    <section
      className="world39-reader"
      aria-label="World overview"
      data-testid="world39-news"
    >
      <header>
        <h3>{model.placeName ? `Around ${model.placeName}` : "Around here"}</h3>
        <p>
          As of <time dateTime={model.asOf}>{world39Date(model.asOf)}</time>
        </p>
      </header>
      {model.standing.length > 0 ? (
        <section
          aria-label="Public institutions"
          data-testid="world39-standing"
        >
          {model.standing.map((item) => (
            <article
              key={item.key}
              data-standing-kind={item.kind}
              data-record-id={item.recordId}
            >
              <h5>{item.headline}</h5>
              <p>{item.sentence}</p>
            </article>
          ))}
        </section>
      ) : null}
      <section aria-label="Current officeholders">
        <h4>In office</h4>
        {model.officeholders.length === 0 ? (
          <p>No public officeholders are named here yet.</p>
        ) : (
          model.officeholders.map((holder) => (
            <article
              key={holder.termId}
              data-tenure-id={holder.termId}
              data-organization-id={holder.organizationId}
            >
              <h5>{holder.headline}</h5>
              <p>{holder.sentence}</p>
              <button
                type="button"
                onClick={() => onOpenPerson(holder.personId)}
              >
                {holder.personName}
              </button>
              <details>
                <summary>Office details</summary>
                {holder.endExclusive ? (
                  <p>The term runs until {world39Date(holder.endExclusive)}.</p>
                ) : (
                  <p>The office has no fixed end date.</p>
                )}
                <p>
                  The person is a character of this fictional world; the office
                  itself is real.
                </p>
                {holder.sources.map((source, index) => (
                  <p key={source}>
                    <a href={source} target="_blank" rel="noreferrer">
                      Institutional source {index + 1}
                    </a>
                  </p>
                ))}
              </details>
            </article>
          ))
        )}
      </section>
      <section aria-label="Recent public events">
        <h4>Lately</h4>
        {model.publicEvents.length === 0 ? (
          <p data-testid="world39-no-events">
            Nothing has happened in public here lately.
          </p>
        ) : (
          model.publicEvents.map((event) => (
            <article
              key={event.id}
              id={`world39-event-${event.id}`}
              data-event-id={event.id}
              data-known-to-you={event.known ? "true" : "false"}
            >
              <p className="world39-meta">
                <time dateTime={event.at}>{world39Date(event.at)}</time>
                {event.jurisdiction ? ` · ${event.jurisdiction}` : ""}
                {event.known ? " · You already know about this." : ""}
              </p>
              <p>{event.summary}</p>
            </article>
          ))
        )}
      </section>
      {model.publications.items.length > 0 ? (
        <section aria-label="Latest reporting">
          <h4>Latest reporting</h4>
          {model.publications.items.slice(0, 4).map((item) => (
            <article
              key={item.publicationId}
              data-publication-id={item.publicationId}
              data-source-event-id={item.sourceEventId}
            >
              <h5>{item.headline}</h5>
              <p className="world39-meta">
                {item.outletName} · Published{" "}
                <time dateTime={item.publicationTime}>
                  {world39Date(item.publicationTime)}
                </time>
              </p>
              <p>{item.body}</p>
              <details id={`world39-publication-${item.publicationId}`}>
                <summary>Publication details</summary>
                <p>
                  Event date:{" "}
                  <time dateTime={item.eventTime}>
                    {world39Date(item.eventTime)}
                  </time>
                  {item.jurisdictionName ? ` · ${item.jurisdictionName}` : ""}
                </p>
                {model.learnedEventIds.has(item.sourceEventId) ? (
                  <p>You already know about this event.</p>
                ) : null}
                {item.people.map((person) => (
                  <button
                    type="button"
                    key={person.personId}
                    onClick={() => onOpenPerson(person.personId)}
                  >
                    {person.label}
                  </button>
                ))}
                {item.corrections.map((correction) => (
                  <p key={correction.publicationId}>
                    Correction, {world39Date(correction.publishedAt)}:{" "}
                    {correction.note}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </section>
      ) : (
        <p data-testid="world39-no-reporting">
          No stories have been published here yet.
        </p>
      )}
    </section>
  );
}

/** UTC date-only formatting never moves the saved date across a time zone. */
export function world39Date(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
