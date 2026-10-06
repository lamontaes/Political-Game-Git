import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { EntityId, World } from "../simulation";
import {
  OBSERVER_STEPS,
  observerPeople,
  projectObserverPerson,
  projectObserverRecord,
} from "../presentation/observer-world";
import { proseDate } from "../presentation/prose-dates";
import { CausalTraceView } from "../ui/CausalTraceView";
import type { ObserverRunController } from "./observer-run-controller";

/**
 * Observer Mode's two pieces of furniture: the clock, and the whole record.
 *
 * The clock is the only thing an observer can do, and it does nothing but let
 * time pass. Running keeps passing a week at a time until paused, so the world
 * can be left to go on for years with nobody stepping in.
 */
export function ObserverClock({
  runner,
  onOpenRecord,
  onOpenInspector,
}: {
  readonly runner: ObserverRunController;
  readonly onOpenRecord: () => void;
  readonly onOpenInspector?: (pausedWorld: World) => void;
}) {
  const view = useSyncExternalStore(
    runner.subscribe,
    runner.getSnapshot,
    runner.getSnapshot,
  );

  return (
    <div className="pg-observer-clock" data-testid="observer-clock">
      <span data-testid="observer-date">{proseDate(view.date)}</span>
      <button
        type="button"
        className="ui-action"
        data-testid="observer-run"
        aria-pressed={view.running}
        disabled={view.busy}
        onClick={() => {
          if (view.running) void runner.pause().catch(() => undefined);
          else runner.start();
        }}
      >
        {view.running ? "Pause" : view.busy ? "Pausing…" : "Run"}
      </button>
      {OBSERVER_STEPS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          className="ui-action ui-action--subtle"
          data-testid={`observer-step-${entry.key}`}
          disabled={view.running || view.busy}
          onClick={() => void runner.step(entry.days).catch(() => undefined)}
        >
          {entry.label}
        </button>
      ))}
      <button
        type="button"
        className="ui-action ui-action--subtle"
        data-testid="open-world-record"
        disabled={view.busy}
        onClick={() => {
          void runner
            .pause()
            .then(onOpenRecord)
            .catch(() => undefined);
        }}
      >
        World record
      </button>
      {onOpenInspector ? (
        <button
          type="button"
          className="ui-action ui-action--subtle"
          data-testid="open-observer-inspector"
          disabled={view.busy}
          onClick={() => {
            void runner
              .pause()
              .then(onOpenInspector)
              .catch(() => undefined);
          }}
        >
          Developer inspector
        </button>
      ) : null}
      {view.problem ? (
        <span className="pg-observer-problem" role="alert">
          {view.problem}
        </span>
      ) : null}
    </div>
  );
}

/** Read the exact settled Observer checkpoint; never substitute a fixture. */
export function ObserverInspectorWorkspace({
  world,
}: {
  readonly world: World;
}) {
  return <CausalTraceView reviewWorld={world} />;
}

/**
 * Everything in the world, not what any one person knows: every bill and
 * law, every amendment, every election, who holds office, everyone alive,
 * the news and what has happened lately.
 */
export function ObserverRecordWorkspace({
  world,
  onOpenPerson,
}: {
  readonly world: World;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const record = useMemo(() => projectObserverRecord(world), [world]);
  const [query, setQuery] = useState("");
  const people = useMemo(() => observerPeople(world, query), [world, query]);
  const [selected, setSelected] = useState<EntityId | null>(null);
  const [summaryPage, setSummaryPage] = useState(0);
  const [expandedSummaryId, setExpandedSummaryId] = useState<EntityId | null>(
    null,
  );
  const summaryPageSize = 8;
  const summaryPageCount = Math.max(
    1,
    Math.ceil(record.electionSummaries.length / summaryPageSize),
  );
  const visibleSummaryPage = Math.min(summaryPage, summaryPageCount - 1);
  const visibleSummaries = record.electionSummaries.slice(
    visibleSummaryPage * summaryPageSize,
    (visibleSummaryPage + 1) * summaryPageSize,
  );
  const file = useMemo(
    () => (selected ? projectObserverPerson(world, selected) : null),
    [world, selected],
  );
  const top = useRef<HTMLDivElement>(null);

  const personLink = (personId: EntityId | null, name: string | null) =>
    personId && name ? (
      <button
        type="button"
        className="ui-link"
        onClick={() => {
          setSelected(personId);
          top.current?.scrollIntoView?.({ block: "start" });
        }}
      >
        {name}
      </button>
    ) : (
      (name ?? "Nobody")
    );

  return (
    <div className="pg-world-record" data-testid="world-record" ref={top}>
      {file ? (
        <section
          className="pg-world-record-file"
          data-testid="observer-person-file"
        >
          <h3>{file.name}</h3>
          <p>
            Born {proseDate(file.born)}
            {file.died
              ? `, died ${file.diedHow ? `${file.diedHow} on ` : ""}${proseDate(file.died)} at ${file.age}`
              : `, ${file.age} years old`}
            {file.home ? `. Lives in ${file.home}` : ""}.
          </p>
          <p>
            {file.work.length > 0
              ? `Works as ${file.work.join("; ")}.`
              : "No current job on record."}{" "}
            {file.party ? `Belongs to the ${file.party}.` : "No party."}
          </p>
          <h4>Everything recorded about them</h4>
          {file.record.length === 0 ? (
            <p className="game-note">Nothing has been recorded yet.</p>
          ) : (
            <ul>
              {file.record.map((item) => (
                <li key={item.id}>
                  {proseDate(item.at)}: {item.text}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="ui-action ui-action--subtle"
            onClick={() => onOpenPerson(file.personId)}
          >
            Open their card
          </button>{" "}
          <button
            type="button"
            className="ui-action ui-action--subtle"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </section>
      ) : null}
      <p className="game-note" data-testid="world-record-summary">
        Watching since {proseDate(record.startedOn)}. It is now{" "}
        {proseDate(record.date)}. {record.livingCount.toLocaleString("en-US")}{" "}
        people are alive, and {record.deathCount.toLocaleString("en-US")} have
        died. {record.laws.length} bills have been introduced and{" "}
        {record.enactedCount} became law.
      </p>

      <section data-testid="world-record-laws">
        <h3>Bills and laws</h3>
        {record.laws.length === 0 ? (
          <p className="game-note">
            No bill has been introduced anywhere in this world yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bill</th>
                <th>Where</th>
                <th>Introduced</th>
                <th>What happened</th>
              </tr>
            </thead>
            <tbody>
              {record.laws.slice(0, 100).map((law) => (
                <tr key={law.id}>
                  <td>
                    {law.designation} · {law.title}
                  </td>
                  <td>{law.place}</td>
                  <td>{proseDate(law.introducedAt)}</td>
                  <td>
                    {law.status}
                    {law.resolvedAt ? `, ${proseDate(law.resolvedAt)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section data-testid="world-record-amendments">
        <h3>Constitutional amendments</h3>
        {record.amendments.length === 0 ? (
          <p className="game-note">No amendment has been proposed yet.</p>
        ) : (
          <ul>
            {record.amendments.map((amendment) => (
              <li key={amendment.id}>
                <strong>{amendment.status}</strong>, {proseDate(amendment.at)}:{" "}
                {amendment.text}
                {amendment.cause ? ` (${amendment.cause}.)` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="world-record-elections">
        <h3>Elections</h3>
        {record.elections.length === 0 &&
        record.electionSummaries.length === 0 ? (
          <p className="game-note">No election has been decided yet.</p>
        ) : null}
        {record.elections.length > 0 ? (
          <ul>
            {record.elections.slice(0, 60).map((election) => (
              <li key={election.id}>
                {proseDate(election.date)}: {election.office}
                {election.place ? `, ${election.place}` : ""}. Won by{" "}
                {personLink(election.winnerPersonId, election.winnerName)}.
              </li>
            ))}
          </ul>
        ) : null}
        {record.electionSummaries.length > 0 ? (
          <div data-testid="world-record-election-summaries">
            <h4>Legislative results on record</h4>
            <ul>
              {visibleSummaries.map((summary) => (
                <li
                  key={summary.id}
                  data-testid="world-record-election-summary"
                >
                  <strong>{summary.body}</strong>
                  {summary.place ? `, ${summary.place}` : ""} ·{" "}
                  {proseDate(summary.date)}
                  <p>
                    {summary.seatCount.toLocaleString("en-US")}{" "}
                    {summary.seatCount === 1 ? "seat" : "seats"} counted;{" "}
                    {summary.winnerCount.toLocaleString("en-US")}{" "}
                    {summary.winnerCount === 1 ? "winner" : "winners"} named in
                    this summary.
                    {summary.separateContestCount > 0
                      ? ` ${summary.separateContestCount.toLocaleString("en-US")} ${summary.separateContestCount === 1 ? "seat has" : "seats have"} separate contest records.`
                      : ""}
                  </p>
                  {summary.offices.length > 0 ? (
                    <ul>
                      {summary.offices.map((office) => (
                        <li key={office.key}>
                          {office.title}:{" "}
                          {office.winnerCount.toLocaleString("en-US")} named
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {summary.winners.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="ui-action ui-action--subtle"
                        aria-expanded={expandedSummaryId === summary.id}
                        onClick={() =>
                          setExpandedSummaryId((id) =>
                            id === summary.id ? null : summary.id,
                          )
                        }
                      >
                        {expandedSummaryId === summary.id
                          ? "Hide named winners"
                          : "Show named winners"}
                      </button>
                      {expandedSummaryId === summary.id ? (
                        <ul>
                          {summary.winners.map((winner) => (
                            <li key={`${summary.id}:${winner.seatKey}`}>
                              {winner.personName
                                ? personLink(winner.personId, winner.personName)
                                : "Name unavailable in this save"}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            {summaryPageCount > 1 ? (
              <div role="group" aria-label="Legislative result pages">
                <button
                  type="button"
                  className="ui-action ui-action--subtle"
                  disabled={visibleSummaryPage === 0}
                  onClick={() => setSummaryPage(visibleSummaryPage - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {visibleSummaryPage + 1} of {summaryPageCount}
                </span>
                <button
                  type="button"
                  className="ui-action ui-action--subtle"
                  disabled={visibleSummaryPage + 1 === summaryPageCount}
                  onClick={() => setSummaryPage(visibleSummaryPage + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section data-testid="world-record-offices">
        <h3>Who holds office</h3>
        <ul>
          {record.officeholders.map((holder) => (
            <li key={holder.key}>
              {holder.title}: {personLink(holder.personId, holder.personName)}
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="world-record-people">
        <h3>Everyone</h3>
        <label>
          Find someone by name or town{" "}
          <input
            type="search"
            value={query}
            data-testid="world-record-people-search"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="game-note">
          {people.total > people.rows.length
            ? `Showing ${people.rows.length} of ${people.total.toLocaleString("en-US")}.`
            : `${people.total.toLocaleString("en-US")} found.`}
        </p>
        <ul>
          {people.rows.map((row) => (
            <li key={row.personId}>
              {personLink(row.personId, row.name)}, {row.age}
              {row.place ? `, ${row.place}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="world-record-news">
        <h3>The news</h3>
        {record.news.length === 0 ? (
          <p className="game-note">Nothing has been published yet.</p>
        ) : (
          <ul>
            {record.news.map((item) => (
              <li key={item.id}>
                {proseDate(item.at)}: {item.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="world-record-happenings">
        <h3>What has happened lately</h3>
        <ul>
          {record.happenings.map((item) => (
            <li key={item.id}>
              {proseDate(item.at)}: {item.text}
              {item.count > 1 ? ` (${item.count} times)` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
