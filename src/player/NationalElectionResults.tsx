import { useState } from "react";
import { projectNationalElectionResults } from "../presentation/national-election-results";
import type { EntityId, World } from "../simulation";

/** Feature-local, read-only surface; shared Politics adapter is handed to A. */
export function NationalElectionResults({
  world,
  electionId,
}: {
  readonly world: World;
  readonly electionId: EntityId;
}) {
  const [showUnits, setShowUnits] = useState(false);
  const view = projectNationalElectionResults(world, electionId);
  return (
    <section
      aria-label="National election results"
      data-testid="national-election-results"
    >
      <h3>{view.cycle} national election</h3>
      <p role="status">
        {view.popularComplete
          ? "Recorded statewide popular totals"
          : "Incomplete statewide popular totals"}
        .{" "}
        {view.countRecorded
          ? "Congressional count recorded."
          : "Congressional count pending."}
      </p>
      <p>No media projection is supplied to this view.</p>
      <table>
        <caption>Recorded totals and electoral stages</caption>
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">Popular votes</th>
            <th scope="col">Allocated electors</th>
            <th scope="col">Counted president ballots</th>
            <th scope="col">Counted vice-president ballots</th>
          </tr>
        </thead>
        <tbody>
          {view.tickets.map((ticket) => (
            <tr key={ticket.presidentPersonId}>
              <th scope="row">
                {ticket.presidentName} / {ticket.vicePresidentName}
              </th>
              <td>{ticket.popularVotes.toLocaleString("en-US")}</td>
              <td>{ticket.allocatedElectors}</td>
              <td>{ticket.countedPresidentialBallots ?? "Pending"}</td>
              <td>{ticket.countedVicePresidentialBallots ?? "Pending"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        President: {view.president.chosenName ?? "No chosen person"}.{" "}
        {view.president.state}. Current holder:{" "}
        {view.president.possessionName ??
          "No supported office possession recorded"}
        .
      </p>
      <p>
        Vice President: {view.vicePresident.chosenName ?? "No chosen person"}.{" "}
        {view.vicePresident.state}. Current holder:{" "}
        {view.vicePresident.possessionName ??
          "No supported office possession recorded"}
        .
      </p>
      <button
        type="button"
        aria-expanded={showUnits}
        onClick={() => setShowUnits((value) => !value)}
      >
        State and district records
      </button>
      {showUnits ? (
        <ul>
          {view.units.map((unit) => (
            <li key={unit.key}>
              {unit.key}: {unit.status.replaceAll("-", " ")} ({unit.electors}{" "}
              electors)
            </li>
          ))}
        </ul>
      ) : null}
      <details>
        <summary>Rules and sources</summary>
        <p>
          Allocation version: {view.ruleVersion}. Supported cycles: 2024 and
          2028.
        </p>
        <a href={view.sources.allocation}>National Archives allocation</a>
        {" · "}
        <a href={view.sources.constitution}>Constitutional amendments</a>
      </details>
    </section>
  );
}
