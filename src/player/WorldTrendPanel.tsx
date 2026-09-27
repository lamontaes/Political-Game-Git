import { useMemo } from "react";

import { projectMacroConditions } from "../presentation/macro-conditions";
import type { EntityId, World } from "../simulation";
import { EconomicGraph } from "./EconomicContextPanel";
import "./world-trend-panel.css";

const WORLD_SERIES = [
  "macro.unemployment-rate",
  "macro.consumer-price-inflation-12m",
  "macro.housing-supply-demand-ratio",
  "budget.receipts",
  "budget.outlays",
] as const;

/** Dated records already in this save. Opening and later visits are reads. */
export function WorldTrendPanel({
  world,
  jurisdictionId,
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
}) {
  const model = useMemo(
    () => projectMacroConditions(world, jurisdictionId),
    [world, jurisdictionId],
  );
  const graphs = WORLD_SERIES.flatMap((key) => {
    const graph = model.graphs.find((item) => item.graphKey === key);
    return graph ? [graph] : [];
  });

  return (
    <section
      className="pg-world-trends"
      aria-label="Your world over time"
      data-testid="world-trends"
    >
      {model.status === "no-history" ? (
        <p data-testid="world-trends-unavailable">
          This life has no recorded economic history to draw. No earlier values
          have been filled in.
        </p>
      ) : (
        <>
          <p>
            These lines read the dates saved in this world. National conditions
            and this place&rsquo;s recorded account money carry their own
            labels; neither is a forecast.
          </p>
          <div className="pg-world-trend-list">
            {graphs.map((graph) => {
              const values = graph.series.flatMap((series) =>
                series.points.filter((point) => point.value !== null),
              );
              return (
                <div key={graph.graphKey} data-series-key={graph.graphKey}>
                  {values.length === 0 ? (
                    <p className="pg-world-trend-gap">
                      {graph.title}: no recorded value yet. The exact periods
                      remain available in the table.
                    </p>
                  ) : values.length === 1 ? (
                    <p className="pg-world-trend-gap">
                      {graph.title}: one recorded period; a trend is not yet
                      established.
                    </p>
                  ) : null}
                  <EconomicGraph graph={graph} />
                </div>
              );
            })}
          </div>
          <p className="pg-world-trend-gap">
            Rent observations for an exact place appear under Politics, Budget
            &amp; economy when that place has a reviewed binding. No line is
            drawn here for missing tax take, party standing, or opinion on a
            particular law.
          </p>
        </>
      )}
    </section>
  );
}
