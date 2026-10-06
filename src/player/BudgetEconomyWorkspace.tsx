import { useMemo } from "react";

import { projectBudgetEconomy } from "../presentation/budget-economy";
import { proseDate } from "../presentation/prose-dates";
import { projectModeledAccountHistory } from "../presentation/modeled-account-history";
import type { EntityId, World } from "../simulation";
import { DIAGNOSTICS } from "./diagnostics-profile";
import { EconomicContextPanel, EconomicGraph } from "./EconomicContextPanel";
import { MacroConditionsPanel } from "./MacroConditionsPanel";
import { ModeledAccountHistory } from "./ModeledAccountHistory";
import "./budget-economy-workspace.css";

export function BudgetEconomyWorkspace({
  world,
  jurisdictionId,
  diagnostics = DIAGNOSTICS,
  visible,
  lookItUp = "full",
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
  /**
   * Show the ingestion record behind the figures.
   *
   * Defaults to the query-string opt-in, so ordinary play gets the numbers and
   * a developer who asks for the machinery on the same screen still gets it.
   * The budget proof fixture passes it explicitly, which is why that harness
   * still walks "Sources and scope" exactly as it always did.
   */
  readonly diagnostics?: boolean;
  readonly visible?: ReadonlySet<string>;
  readonly lookItUp?: "full" | "summary" | "none";
}) {
  const model = useMemo(
    () => projectBudgetEconomy(world, jurisdictionId),
    [jurisdictionId, world],
  );
  // A separate projection of this life's modeled receipts account; the
  // aggregate budget model above is left exactly as it was.
  const modeledAccount = useMemo(
    () => projectModeledAccountHistory(world, jurisdictionId),
    [jurisdictionId, world],
  );
  const canSee = (projection: string) =>
    visible === undefined || visible.has(projection);

  return (
    <section
      className="budget-economy-workspace"
      aria-labelledby="budget-economy-title"
      data-testid="budget-economy-workspace"
      data-look-it-up={lookItUp}
    >
      <header className="budget-economy-header">
        <div>
          <p className="pg-kicker">Public record</p>
          <h3 id="budget-economy-title">Budget &amp; economy</h3>
        </div>
        <p>
          <strong>{model.placeLabel}</strong>
          <span>{proseDate(model.simulationDate)}</span>
        </p>
      </header>

      {(canSee("state-macro-series") || canSee("national-macro-series")) &&
      lookItUp === "full" ? (
        <MacroConditionsPanel world={world} jurisdictionId={jurisdictionId} />
      ) : null}

      {model.federalBudget?.status === "available" && lookItUp === "full" ? (
        <section
          aria-label="Federal budget categories"
          data-testid="federal-budget-categories"
        >
          <h4>Federal budget by category</h4>
          <p>
            {model.federalBudget.month
              ? `Latest settled month: ${proseDate(model.federalBudget.month)}`
              : "No federal budget month has settled in this save yet."}
          </p>
          <h5>Receipts</h5>
          <ul>
            {model.federalBudget.receipts.map((line) => (
              <li key={line.category}>
                {line.label}:{" "}
                {line.amount === null
                  ? "No recorded amount"
                  : formatFederalAmount(line.amount)}
              </li>
            ))}
          </ul>
          <h5>Outlays</h5>
          <ul>
            {model.federalBudget.outlays.map((line) => (
              <li key={line.category}>
                {line.label}:{" "}
                {line.amount === null
                  ? "No recorded amount"
                  : formatFederalAmount(line.amount)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {canSee("program-lines") && lookItUp === "full" && model.programLines ? (
        <section aria-label="Public budget program lines" data-testid="budget-program-lines">
          <h4>Program lines</h4>
          <p>
            {model.programLines.month
              ? `Latest settled month: ${proseDate(model.programLines.month)}`
              : "No public budget month has settled in this save yet."}
          </p>
          <ul>
            {model.programLines.lines.map((line) => (
              <li key={line.category}>
                {line.label}: {line.amount === null ? "No recorded amount" : formatFederalAmount(line.amount)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(canSee("public-budget") || canSee("fiscal-notes")) &&
      lookItUp !== "none" ? (
        <section
          className="budget-economy-availability"
          aria-label="Budget record availability"
          data-status={model.fiscalAvailability.status}
        >
          <h4>Budget record</h4>
          {model.fiscalAvailability.status === "available" ? (
            <p>
              {model.fiscalAvailability.graphCount.toLocaleString("en-US")}{" "}
              exact fiscal{" "}
              {model.fiscalAvailability.graphCount === 1 ? "graph" : "graphs"}{" "}
              for {model.jurisdictionLabel}.
            </p>
          ) : (
            <p data-testid="budget-history-unavailable">
              {model.fiscalAvailability.reason}
            </p>
          )}
        </section>
      ) : null}

      {(canSee("public-budget") ||
        canSee("state-macro-series") ||
        canSee("national-macro-series")) &&
      lookItUp === "full" &&
      model.economicBinding ? (
        <EconomicContextPanel
          binding={model.economicBinding}
          simulationDate={model.simulationDate}
          fiscalGraphs={model.fiscalGraphs}
          diagnostics={diagnostics}
        />
      ) : lookItUp === "full" &&
        (canSee("public-budget") ||
          canSee("state-macro-series") ||
          canSee("national-macro-series")) ? (
        <section
          className="budget-economy-unavailable"
          aria-label="Economic graph availability"
        >
          <h4>Dated economic graphs</h4>
          <p data-testid="economic-binding-unavailable">
            No reviewed economic source binding is available for this exact
            place. Figures from another city, county, metro, or state have not
            been substituted.
          </p>
          {model.fiscalGraphs.length > 0 ? (
            <div className="economic-graph-grid">
              {model.fiscalGraphs.map((graph) => (
                <EconomicGraph key={graph.graphKey} graph={graph} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {canSee("account-history") && lookItUp === "full" ? (
        <ModeledAccountHistory history={modeledAccount} />
      ) : null}
      {lookItUp === "summary" ? (
        <section aria-label="Budget summary" data-testid="budget-summary">
          <h4>Budget summary</h4>
          {model.federalBudget?.status === "available" ? (
            <p>
              {model.federalBudget.month
                ? `Federal categories last settled ${proseDate(model.federalBudget.month)}.`
                : "Federal budget categories are available; no month has settled yet."}
            </p>
          ) : model.fiscalAvailability.status === "available" ? (
            <p>
              {model.fiscalAvailability.graphCount} recorded fiscal graphs are
              available for {model.jurisdictionLabel}.
            </p>
          ) : (
            <p>{model.fiscalAvailability.reason}</p>
          )}
        </section>
      ) : null}
    </section>
  );
}

function formatFederalAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
