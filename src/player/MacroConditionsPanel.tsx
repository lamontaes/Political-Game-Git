import { useMemo, useState } from "react";

import {
  macroPeriodLabel,
  projectMacroConditions,
  type MacroCard,
  type MacroSeries,
} from "../presentation/macro-conditions";
import type { EntityId, World } from "../simulation";
import { proseDate } from "../presentation/prose-dates";
import { EconomicGraph } from "./EconomicContextPanel";
import "./macro-conditions-panel.css";

const CLASS_LABEL: Record<MacroCard["valueClass"], string> = {
  "simulated-publication": "Released in this world",
  "modeled-condition": "Modeled condition",
  "modeled-initial-condition": "Starting condition",
  "modeled-account-record": "Recorded account money",
};

function formatValue(value: number, unit: string): string {
  if (unit.startsWith("US dollars")) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  if (unit.startsWith("%")) return `${value.toFixed(1)}%`;
  return value.toFixed(2);
}

function SeriesTable({ series }: { readonly series: MacroSeries }) {
  return (
    <table className="pg-macro-series-table">
      <caption>
        {series.title} · {series.geographyLabel} · {series.unit}
      </caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {series.points.map((point) =>
          point.value === null ? null : (
            <tr key={point.period}>
              <th scope="row">{macroPeriodLabel(point.period)}</th>
              <td data-reason={point.missingReason ?? undefined}>
                {formatValue(point.value, series.unit)}
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

/**
 * This World's economic conditions: one series drives each card, graph and
 * table. Reading it moves no time and changes nothing.
 */
export function MacroConditionsPanel({
  world,
  jurisdictionId,
}: {
  readonly world: World;
  readonly jurisdictionId: EntityId;
}) {
  const model = useMemo(
    () => projectMacroConditions(world, jurisdictionId),
    [jurisdictionId, world],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (model.status === "no-history") {
    return (
      <section
        className="pg-macro-conditions"
        data-testid="pg-macro-conditions-unavailable"
      >
        <p data-problem="no-world-economic-history" />
      </section>
    );
  }
  const open = model.series.find((series) => series.key === openKey) ?? null;
  const openGraph = model.graphs.find((graph) => graph.graphKey === openKey);
  return (
    <section className="pg-macro-conditions" data-testid="pg-macro-conditions">
      {model.startingConditions ? (
        <dl className="pg-macro-conditions-start" data-basis="starting">
          <dt>Date</dt>
          <dd>{proseDate(model.startingConditions.effectiveDate)}</dd>
          <dt>Unemployment</dt>
          <dd>{model.startingConditions.unemploymentPct.toFixed(1)}%</dd>
          <dt>Prices, 12 months</dt>
          <dd>{model.startingConditions.inflation12mPct.toFixed(1)}%</dd>
        </dl>
      ) : null}
      <ul className="pg-macro-card-grid">
        {model.cards.map((card) =>
          card.value === null ? null : (
            <li key={card.seriesKey}>
              <button
                type="button"
                className="pg-macro-card"
                aria-pressed={openKey === card.seriesKey}
                data-series-key={card.seriesKey}
                onClick={() =>
                  setOpenKey(openKey === card.seriesKey ? null : card.seriesKey)
                }
              >
                <span className="pg-macro-card-title">{card.title}</span>
                <strong className="pg-macro-card-value">
                  {formatValue(card.value, card.unit)}
                </strong>
                <span className="pg-macro-card-meta">
                  {card.period ? `${card.period} · ` : ""}
                  {card.geographyLabel}
                </span>
                <span className="pg-macro-card-meta">
                  {card.unit} · {CLASS_LABEL[card.valueClass]}
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
      {open && openGraph ? (
        <div
          className="pg-macro-series-detail"
          data-testid="pg-macro-series-detail"
        >
          <EconomicGraph graph={openGraph} />
          <SeriesTable series={open} />
        </div>
      ) : null}
    </section>
  );
}
