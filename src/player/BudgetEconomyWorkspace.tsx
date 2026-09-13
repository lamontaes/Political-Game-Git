import { useMemo } from "react";

import { projectBudgetEconomy } from "../presentation/budget-economy";
import type { EntityId, World } from "../simulation";
import { EconomicContextPanel, EconomicGraph } from "./EconomicContextPanel";
import "./budget-economy-workspace.css";

export function BudgetEconomyWorkspace({
  world,
  jurisdictionId,
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
}) {
  const model = useMemo(
    () => projectBudgetEconomy(world, jurisdictionId),
    [jurisdictionId, world],
  );

  return (
    <section
      className="budget-economy-workspace"
      aria-labelledby="budget-economy-title"
      data-testid="budget-economy-workspace"
    >
      <header className="budget-economy-header">
        <div>
          <p className="pg-kicker">Public record</p>
          <h3 id="budget-economy-title">Budget &amp; economy</h3>
        </div>
        <p>
          <strong>{model.placeLabel}</strong>
          <span>{model.simulationDate}</span>
        </p>
      </header>

      <p className="budget-economy-boundary">
        Reading this page does not change a budget, grant fiscal authority, or
        move time. Reference observations and this save&rsquo;s government
        history remain separately labeled.
      </p>

      <section
        className="budget-economy-availability"
        aria-label="Budget record availability"
        data-status={model.fiscalAvailability.status}
      >
        <h4>Budget record</h4>
        {model.fiscalAvailability.status === "available" ? (
          <p>
            {model.fiscalAvailability.graphCount.toLocaleString("en-US")} exact
            fiscal{" "}
            {model.fiscalAvailability.graphCount === 1 ? "graph" : "graphs"} for{" "}
            {model.jurisdictionLabel}.
          </p>
        ) : (
          <p data-testid="budget-history-unavailable">
            {model.fiscalAvailability.reason}
          </p>
        )}
      </section>

      {model.economicBinding ? (
        <EconomicContextPanel
          binding={model.economicBinding}
          simulationDate={model.simulationDate}
          fiscalGraphs={model.fiscalGraphs}
        />
      ) : (
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
      )}
    </section>
  );
}
