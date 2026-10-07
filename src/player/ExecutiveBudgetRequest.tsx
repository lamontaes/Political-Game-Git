import { useState } from "react";
import { proseDate } from "../presentation/prose-dates";
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
      setProblem("invalid-line");
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
      setProblem("invalid-dates");
    }
  };
  return (
    <details data-testid="executive-budget-editor">
      <summary>Prepare a dollar request</summary>
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
      <p
        className="game-note"
        data-testid="budget-period-basis"
        data-basis={period ? "fiscal-year" : undefined}
        data-problem={period ? undefined : "no-fiscal-calendar"}
      />
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
          <p data-testid="budget-baseline-period">
            {proseDate(baseline.startsOn)}–{proseDate(baseline.endsOn)}
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
        </details>
      ) : (
        <p className="game-note" data-problem="no-modeled-budget" />
      )}
      {problem ? (
        <p
          role="alert"
          data-testid="budget-request-problem"
          data-reason={problem}
        />
      ) : null}
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
      <p data-testid="budget-request-period">
        {proseDate(request.startsOn)}–{proseDate(request.endsOn)}
      </p>
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
                    {proseDate(request.startsOn)}–{proseDate(request.endsOn)}
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
                            {proseDate(record.availableFrom)}–
                            {proseDate(record.availableThrough)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span data-problem="no-enacted-authorization" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
