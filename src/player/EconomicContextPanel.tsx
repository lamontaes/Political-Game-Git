import { useEffect, useMemo, useState } from "react";
import {
  createEconomicContextBrowserProvider,
  type BrowserEconomicContextResult,
  type BrowserEconomicGeographyBinding,
  type EconomicContextBrowserProvider,
} from "../presentation/economic-context-browser";
import {
  economicObservationGraphs,
  type EconomicGraphModel,
  type EconomicGraphPoint,
  type EconomicGraphRecordClass,
} from "../presentation/economic-graphs";
import "./economic-context-panel.css";

export const LEXINGTON_ECONOMIC_BINDING: BrowserEconomicGeographyBinding = {
  bindingKey: "economic-context.lexington-ky.v2",
  placeKey: "lexington-fayette",
  placeLabel: "Lexington, Kentucky",
  beaAreas: [
    {
      geographyLevel: "county",
      geoFips: "21067",
      relationship: "same-jurisdiction",
    },
    {
      geographyLevel: "msa",
      geoFips: "30460",
      relationship: "containing-metro",
    },
    {
      geographyLevel: "state",
      geoFips: "21000",
      relationship: "containing-state",
    },
  ],
  lausAreaCodes: [
    { areaCode: "ST2100000000000", relationship: "containing-state" },
  ],
  hudFipsCodes: [
    { hudFipsCode: "2106799999", relationship: "same-jurisdiction" },
  ],
};

const DEFAULT_PROVIDER = createEconomicContextBrowserProvider();

interface EconomicContextPanelProps {
  readonly binding: BrowserEconomicGeographyBinding;
  readonly simulationDate: string;
  readonly provider?: EconomicContextBrowserProvider;
  readonly fiscalGraphs?: readonly EconomicGraphModel[];
}

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "ready";
      readonly context: BrowserEconomicContextResult;
    };

export function EconomicContextPanel({
  binding,
  simulationDate,
  provider = DEFAULT_PROVIDER,
  fiscalGraphs = [],
}: EconomicContextPanelProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let current = true;
    setState({ status: "loading" });
    void provider
      .query(binding, simulationDate)
      .then((context) => {
        if (current) setState({ status: "ready", context });
      })
      .catch((error: unknown) => {
        if (current) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Economic context could not be loaded.",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [binding, provider, simulationDate]);

  if (state.status === "loading") {
    return (
      <section className="economic-context-panel" aria-busy="true">
        <p>Loading dated economic context…</p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className="economic-context-panel" role="status">
        <h2>Economic context unavailable</h2>
        <p>{state.message}</p>
      </section>
    );
  }
  return (
    <EconomicContextView context={state.context} fiscalGraphs={fiscalGraphs} />
  );
}

export function EconomicContextView({
  context,
  fiscalGraphs = [],
}: {
  readonly context: BrowserEconomicContextResult;
  readonly fiscalGraphs?: readonly EconomicGraphModel[];
}) {
  const collection = useMemo(
    () => economicObservationGraphs(context),
    [context],
  );
  const graphs = [...collection.graphs, ...fiscalGraphs];
  const sourceRows = uniqueSources(context);

  return (
    <section
      className="economic-context-panel civic-glass"
      aria-labelledby="economic-context-title"
      data-testid="economic-context-panel"
    >
      <header className="economic-context-header">
        <div>
          <p className="economic-context-kicker">Dated reference context</p>
          <h2 id="economic-context-title">{context.placeLabel}</h2>
        </div>
        <span>{context.simulationDate}</span>
      </header>

      <p className="economic-context-boundary">
        These are sourced observations known by this date—not simulated history
        or a forecast of what a proposal will do.
      </p>

      <ul className="economic-availability" aria-label="Source availability">
        {context.availability.map((item) => (
          <li key={item.product} data-status={item.status}>
            <strong>{productLabel(item.product)}</strong>
            <span>
              {item.status === "available"
                ? `${item.observationCount.toLocaleString("en-US")} observations`
                : item.reason}
            </span>
          </li>
        ))}
      </ul>

      {graphs.length > 0 ? (
        <div className="economic-graph-grid">
          {graphs.map((graph) => (
            <EconomicGraph key={graph.graphKey} graph={graph} />
          ))}
        </div>
      ) : (
        <p role="status">No graphable records are available for this date.</p>
      )}

      <details className="economic-unavailable">
        <summary>Unavailable comparisons</summary>
        <ul>
          {collection.unavailable.map((item) => (
            <li key={item.graphKind}>
              <strong>{item.graphKind.replaceAll("-", " ")}</strong>:{" "}
              {item.reason}
            </li>
          ))}
        </ul>
      </details>

      <details className="economic-sources">
        <summary>Sources and scope</summary>
        <ul>
          {sourceRows.map((source) => (
            <li key={source.artifactId}>
              <a href={source.retrievalUrl} rel="noreferrer">
                {source.provider}
              </a>
              <span>
                Retrieved {source.retrievedAt.slice(0, 10)} · SHA-256{" "}
                {source.sha256}
              </span>
            </li>
          ))}
        </ul>
        <p>
          Reference periods, product vintages, release dates, retrieval dates,
          and the simulation date remain separate. Missing data stays missing.
        </p>
      </details>
    </section>
  );
}

export function EconomicGraph({
  graph,
}: {
  readonly graph: EconomicGraphModel;
}) {
  const values = graph.series.flatMap((series) =>
    series.points.flatMap((point) =>
      point.value === null ? [] : [point.value],
    ),
  );
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 0);
  const range = maximum - minimum || 1;

  return (
    <figure className="economic-graph" data-graph-kind={graph.kind}>
      <figcaption>
        <strong>{graph.title}</strong>
        <span>{graph.description}</span>
      </figcaption>
      <svg
        viewBox="0 0 640 220"
        role="img"
        aria-label={`${graph.title}. ${graph.unit}. ${graph.referenceLabel}.`}
      >
        <line className="economic-axis" x1="52" y1="12" x2="52" y2="184" />
        <line className="economic-axis" x1="52" y1="184" x2="626" y2="184" />
        {graph.kind === "comparison-bars"
          ? graph.series.map((series, index) => {
              const point = series.points[0];
              if (!point || point.value === null) return null;
              const height = ((point.value - minimum) / range) * 150;
              return (
                <rect
                  key={series.seriesKey}
                  className={`economic-mark economic-mark--${series.recordClass}`}
                  x={150 + index * 220}
                  y={184 - height}
                  width="90"
                  height={Math.max(height, 2)}
                />
              );
            })
          : graph.series.flatMap((series) =>
              lineSegments(series.points, minimum, range).map(
                (points, index) => (
                  <polyline
                    key={`${series.seriesKey}:${index}`}
                    className={`economic-line economic-line--${series.recordClass}`}
                    points={points}
                  />
                ),
              ),
            )}
      </svg>
      <div className="economic-legend" aria-label="Record classes">
        {graph.series.map((series) => (
          <span key={series.seriesKey} data-record-class={series.recordClass}>
            {recordClassLabel(series.recordClass)} · {series.label}
          </span>
        ))}
      </div>
      <details>
        <summary>Exact values</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Series</th>
              <th scope="col">Period</th>
              <th scope="col">Class</th>
              <th scope="col">Release</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {graph.series.flatMap((series) =>
              series.points.map((point) => (
                <tr key={point.pointKey}>
                  <th scope="row">{series.label}</th>
                  <td>{point.period}</td>
                  <td>{recordClassLabel(point.recordClass)}</td>
                  <td>{point.releaseStatus ?? "Not established"}</td>
                  <td>
                    {point.value === null
                      ? `Missing — ${point.missingReason ?? "No value supplied"}`
                      : formatGraphValue(point.value, graph.unit)}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </details>
      <p className="economic-graph-boundary">{graph.boundaries.join(" ")}</p>
    </figure>
  );
}

function lineSegments(
  points: readonly EconomicGraphPoint[],
  minimum: number,
  range: number,
): readonly string[] {
  const segments: string[][] = [];
  let current: string[] = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    const x = 58 + (index / Math.max(points.length - 1, 1)) * 560;
    const y = 178 - ((point.value - minimum) / range) * 158;
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length > 0) segments.push(current);
  return segments.map((segment) => segment.join(" "));
}

function uniqueSources(context: BrowserEconomicContextResult) {
  const sources = new Map<
    string,
    {
      artifactId: string;
      provider: string;
      retrievalUrl: string;
      retrievedAt: string;
      sha256: string;
    }
  >();
  for (const item of context.observations) {
    sources.set(item.source.artifactId, {
      artifactId: item.source.artifactId,
      provider: item.source.provider,
      retrievalUrl: item.source.retrievalUrl,
      retrievedAt: item.vintage.sourceRetrievedAt,
      sha256: item.source.artifactSha256,
    });
  }
  return [...sources.values()].sort((left, right) =>
    left.artifactId.localeCompare(right.artifactId),
  );
}

function formatGraphValue(value: number, unit: string): string {
  if (unit.toLowerCase().includes("usd") || unit === "Dollars") {
    const dollars = unit === "USD minor units" ? value / 100 : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(dollars);
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function productLabel(
  product: BrowserEconomicContextResult["availability"][number]["product"],
): string {
  if (product === "bea-regional") return "BEA regional";
  if (product === "bls-laus") return "BLS LAUS";
  return "HUD housing";
}

function recordClassLabel(recordClass: EconomicGraphRecordClass): string {
  return recordClass.replaceAll("-", " ");
}
