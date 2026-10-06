import { useState } from "react";
import { makeIsoDate } from "../simulation/dates";
import {
  enactedFamilyAppropriations,
  executiveBudgetIdentity,
  executiveBudgetRequestPeriod,
  executiveBudgetRequests,
  modeledExecutiveBudgetBaseline,
  parseExecutiveBudgetDollars,
  type ExecutiveBudgetRequest,
  type ExecutiveBudgetRequestLine,
} from "../simulation/governing/executive-budget-requests";
import {
  PROGRAM_FAMILIES,
  programFamilyTitle,
} from "../simulation/governing/program-families";
import {
  decideGoverningBudgetRequest,
  type GoverningActionResult,
} from "../simulation/governing/state-governing";
import type { EntityId, MoneyAmount, World } from "../simulation/types";

const dollarText = (amount: MoneyAmount) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount.minorUnits / 100);

export function ExecutiveBudgetRequestEditor({
  world,
  personId,
  matterId,
  onCommit,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly matterId: EntityId;
  readonly onCommit: (result: GoverningActionResult) => void;
}) {
  const period = executiveBudgetRequestPeriod(world, personId);
  const [startsOn, setStartsOn] = useState(period?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(period?.endsOn ?? "");
  const [family, setFamily] = useState("");
  const [dollars, setDollars] = useState("");
  const [lines, setLines] = useState<readonly ExecutiveBudgetRequestLine[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const identity = executiveBudgetIdentity(world, personId);
  const baseline = identity
    ? modeledExecutiveBudgetBaseline(world, identity, world.currentDate)
    : null;
  const addLine = () => {
    const amount = parseExecutiveBudgetDollars(dollars);
    if (!family || !amount) {
      setProblem(
        "Choose a program family and enter a nonnegative dollar amount with at most two decimal places.",
      );
      return;
    }
    setLines([
      ...lines.filter((line) => line.familyKey !== family),
      { familyKey: family, amount },
    ]);
    setProblem(null);
    setDollars("");
  };
  const submit = () => {
    try {
      const result = decideGoverningBudgetRequest(world, matterId, {
        startsOn: makeIsoDate(startsOn),
        endsOn: makeIsoDate(endsOn),
        lines,
      });
      if (!result.ok) setProblem(result.reason);
      else {
        setProblem(null);
        onCommit(result);
      }
    } catch {
      setProblem("Enter a valid start and end date for the budget request.");
    }
  };
  return (
    <details data-testid="executive-budget-editor">
      <summary>Prepare a dollar request</summary>
      <p>
        Your request goes to the legislature. It may change the amounts; an
        enacted appropriation supplies authority to spend.
      </p>
      <label>
        Period begins{" "}
        <input
          aria-label="Budget request begins"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
        />
      </label>
      <label>
        Period ends{" "}
        <input
          aria-label="Budget request ends"
          type="date"
          value={endsOn}
          onChange={(event) => setEndsOn(event.target.value)}
        />
      </label>
      {period ? (
        <p className="game-note">
          The suggested dates follow this government's fiscal year (
          {period.basis}).
        </p>
      ) : (
        <p className="game-note">
          No fiscal-year calendar is recorded for this government. Choose the
          period you are requesting.
        </p>
      )}
      <label>
        Program family{" "}
        <select
          aria-label="Budget program family"
          value={family}
          onChange={(event) => setFamily(event.target.value)}
        >
          <option value="">Choose a program family</option>
          {PROGRAM_FAMILIES.map((entry) => (
            <option key={entry.familyKey} value={entry.familyKey}>
              {entry.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Requested dollars{" "}
        <input
          aria-label="Requested dollars"
          inputMode="decimal"
          value={dollars}
          onChange={(event) => setDollars(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="ui-action ui-action--quiet"
        onClick={addLine}
      >
        Add or replace amount
      </button>
      <ul>
        {lines.map((line) => (
          <li key={line.familyKey}>
            {programFamilyTitle(line.familyKey)}: {dollarText(line.amount)}{" "}
            <button
              type="button"
              onClick={() =>
                setLines(
                  lines.filter((entry) => entry.familyKey !== line.familyKey),
                )
              }
            >
              Remove {programFamilyTitle(line.familyKey)}
            </button>
          </li>
        ))}
      </ul>
      {baseline ? (
        <details>
          <summary>Current modeled budget totals</summary>
          <p>
            {baseline.startsOn} through {baseline.endsOn}. These category totals
            are not allocations to individual program families.
          </p>
          <dl>
            {baseline.categories.map((entry) => (
              <div key={entry.category}>
                <dt>
                  {entry.category.replace(/([A-Z])/g, " $1").toLowerCase()}
                </dt>
                <dd>{dollarText(entry.amount)}</dd>
              </div>
            ))}
          </dl>
          <details>
            <summary>Budget sources</summary>
            <ul>
              {baseline.sourceNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </details>
        </details>
      ) : (
        <p className="game-note">
          No current modeled budget is recorded for this exact government.
        </p>
      )}
      {problem ? <p role="alert">{problem}</p> : null}
      <button
        type="button"
        className="ui-action ui-action--choice"
        disabled={!lines.length}
        onClick={submit}
      >
        Send dollar request
      </button>
    </details>
  );
}

export function ExecutiveBudgetRequestComparison({
  world,
  request,
}: {
  readonly world: World;
  readonly request: ExecutiveBudgetRequest;
}) {
  return (
    <section data-testid="executive-budget-comparison">
      <h4>Requested and appropriated</h4>
      <p>{request.event.summary}</p>
      <table>
        <thead>
          <tr>
            <th>Program family</th>
            <th>Requested</th>
            <th>Enacted authorizations</th>
          </tr>
        </thead>
        <tbody>
          {request.lines.map((line) => {
            const appropriations = enactedFamilyAppropriations(
              world,
              request,
              line.familyKey,
            );
            return (
              <tr key={line.familyKey}>
                <th scope="row">{programFamilyTitle(line.familyKey)}</th>
                <td>
                  {dollarText(line.amount)}
                  <small>
                    {" "}
                    {request.startsOn}–{request.endsOn}
                  </small>
                </td>
                <td>
                  {appropriations.length ? (
                    <ul>
                      {appropriations.map((record) => (
                        <li key={record.id}>
                          {dollarText(record.amount)}
                          <small>
                            {" "}
                            {record.availableFrom}–{record.availableThrough}
                          </small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No enacted authorization recorded for this family in the requested period."
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="game-note">
        Each authorization shows its own dates. Amounts cover that
        authorization's period.
      </p>
    </section>
  );
}

export function ExecutiveBudgetRequestHistory({
  world,
  personId,
  jurisdictionId,
}: {
  readonly world: World;
  readonly personId?: EntityId;
  readonly jurisdictionId?: EntityId;
}) {
  const identity = personId ? executiveBudgetIdentity(world, personId) : null;
  const requests = executiveBudgetRequests(world, identity ?? undefined).filter(
    (request) =>
      jurisdictionId
        ? request.governmentIdentity.jurisdictionId === jurisdictionId
        : identity !== null,
  );
  const latest = new Map<string, ExecutiveBudgetRequest>();
  for (const request of requests) latest.set(request.officeKey, request);
  return (
    <>
      {[...latest.values()].map((request) => (
        <ExecutiveBudgetRequestComparison
          key={request.event.id}
          world={world}
          request={request}
        />
      ))}
    </>
  );
}
