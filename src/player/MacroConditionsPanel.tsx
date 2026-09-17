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

function formatValue(value: number | null, unit: string): string {
  if (value === null) return "—";
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
        {series.points.map((point) => (
          <tr key={point.period}>
            <th scope="row">{macroPeriodLabel(point.period)}</th>
            <td>
              {point.value === null
                ? `No value — ${point.missingReason ?? "not recorded"}`
                : formatValue(point.value, series.unit)}
            </td>
          </tr>
        ))}
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
        aria-labelledby="pg-macro-conditions-title"
        data-testid="pg-macro-conditions-unavailable"
      >
        <h4 id="pg-macro-conditions-title">This world&rsquo;s economy</h4>
        <p>
          This life began before the world kept its own economic history, so
          there are no national conditions to show. Nothing has been filled in.
        </p>
      </section>
    );
  }
  const open = model.series.find((series) => series.key === openKey) ?? null;
  const openGraph = model.graphs.find((graph) => graph.graphKey === openKey);
  return (
    <section
      className="pg-macro-conditions"
      aria-labelledby="pg-macro-conditions-title"
      data-testid="pg-macro-conditions"
    >
      <h4 id="pg-macro-conditions-title">This world&rsquo;s economy</h4>
      {model.startingConditions ? (
        <p className="pg-macro-conditions-start">
          At the start of this life (
          {proseDate(model.startingConditions.effectiveDate)}) unemployment
          stood near {model.startingConditions.unemploymentPct.toFixed(1)}% and
          prices were rising about{" "}
          {model.startingConditions.inflation12mPct.toFixed(1)}% a year. These
          are starting conditions, not released figures.
        </p>
      ) : null}
      <ul className="pg-macro-card-grid">
        {model.cards.map((card) => (
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
                {card.period ?? "No value yet"} · {card.geographyLabel}
              </span>
              <span className="pg-macro-card-meta">
                {card.unit} · {CLASS_LABEL[card.valueClass]}
              </span>
            </button>
          </li>
        ))}
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
      {model.localNote ? (
        <p className="pg-macro-conditions-local">{model.localNote}</p>
      ) : null}
    </section>
  );
}
