import type { World } from "../simulation";

interface WorldSummaryProps {
  readonly world: World;
}

export function WorldSummary({ world }: WorldSummaryProps) {
  const jurisdiction = world.jurisdictionOrder[0]
    ? world.jurisdictions[world.jurisdictionOrder[0]]
    : undefined;

  return (
    <section className="world-summary" aria-labelledby="world-summary-title">
      <h2 className="visually-hidden" id="world-summary-title">
        Loaded world summary
      </h2>
      <dl>
        <div>
          <dt>Simulated date</dt>
          <dd>
            <time dateTime={world.currentDate}>{world.currentDate}</time>
          </dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>{world.personOrder.length}</dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd>{world.history.events.length}</dd>
        </div>
        <div>
          <dt>Jurisdiction</dt>
          <dd>{jurisdiction?.name ?? "None"}</dd>
        </div>
        <div>
          <dt>Data status</dt>
          <dd className="placeholder-value">
            {jurisdiction?.provenance.status ?? "unknown"}
          </dd>
        </div>
        <div className="summary-id">
          <dt>Stable world ID</dt>
          <dd>
            <code>{world.id}</code>
          </dd>
        </div>
      </dl>
    </section>
  );
}
