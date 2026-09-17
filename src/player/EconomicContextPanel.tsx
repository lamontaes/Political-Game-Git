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
export { LEXINGTON_ECONOMIC_BINDING } from "../presentation/economic-context-bindings";
import { proseDate } from "../presentation/prose-dates";
import "./economic-context-panel.css";

const DEFAULT_PROVIDER = createEconomicContextBrowserProvider();

interface EconomicContextPanelProps {
  readonly binding: BrowserEconomicGeographyBinding;
  readonly simulationDate: string;
  readonly provider?: EconomicContextBrowserProvider;
  readonly fiscalGraphs?: readonly EconomicGraphModel[];
  /**
   * Show the ingestion machinery: which provider tables are bound, what was
   * retrieved and when, the artifact digests, and the reason each unavailable
   * comparison is unavailable.
   *
   * Off unless a caller asks for it, and ordinary play never asks. Those lines
   * are real and stay reachable from the developer routes, but a player looking
   * up what their county earns does not need "the locked BEA tables are CAINC1,
   * SARPP and MARPP; none is a GDP series" — that is an answer to a question
   * only the people building this ever ask. The numbers themselves are civic
   * information and are shown either way.
   */
  readonly diagnostics?: boolean;
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
  diagnostics = false,
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
        <p>Looking up the numbers for this place…</p>
      </section>
    );
  }
  if (state.status === "error") {
    /*
     * The thrown message names providers, bindings and query shapes. It is the
     * right thing to hand a developer and the wrong thing to hand a player, so
     * it goes to the console, where the developer routes and a browser session
     * can both still reach it, and the screen says the in-world truth: the
     * figures are not here.
     */
    if (diagnostics)
      return (
        <section className="economic-context-panel" role="status">
          <h2>Economic context unavailable</h2>
          <p>{state.message}</p>
        </section>
      );
    return (
      <section className="economic-context-panel" role="status">
        <h2>Figures unavailable</h2>
        <p>The figures for this place aren&apos;t available right now.</p>
      </section>
    );
  }
  return (
    <EconomicContextView
      context={state.context}
      fiscalGraphs={fiscalGraphs}
      diagnostics={diagnostics}
    />
  );
}

export function EconomicContextView({
  context,
  fiscalGraphs = [],
  diagnostics = false,
}: {
  readonly context: BrowserEconomicContextResult;
  readonly fiscalGraphs?: readonly EconomicGraphModel[];
  readonly diagnostics?: boolean;
}) {
  const collection = useMemo(
    () => economicObservationGraphs(context),
    [context],
  );
  const graphs = [...collection.graphs, ...fiscalGraphs];
  const hasBudgetHistory = fiscalGraphs.some(
    (graph) =>
      graph.graphKey.startsWith("budget-history:") &&
      graph.series.some(
        (series) =>
          series.recordClass === "simulated-history" ||
          series.recordClass === "outturn",
      ),
  );
  const hasFiscalEstimate = fiscalGraphs.some((graph) =>
    graph.series.some((series) => series.recordClass === "forecast"),
  );
  const unavailable = collection.unavailable.filter(
    (item) =>
      !(
        (item.graphKind === "budget-history" && hasBudgetHistory) ||
        (item.graphKind === "fiscal-estimate" && hasFiscalEstimate)
      ),
  );
  const sourceRows = uniqueSources(context);

  return (
    <section
      className="economic-context-panel civic-glass"
      aria-labelledby="economic-context-title"
      data-testid="economic-context-panel"
    >
      <header className="economic-context-header">
        <div>
          <p className="economic-context-kicker">How the place is doing</p>
          <h2 id="economic-context-title">{context.placeLabel}</h2>
        </div>
        <span>{proseDate(context.simulationDate)}</span>
      </header>

      {diagnostics ? (
        <p className="economic-context-boundary">
          These are sourced observations known by this date—not simulated
          history or a forecast of what a proposal will do.
        </p>
      ) : null}

      {/*
        Ordinary play lists the figures this place actually has. A product with
        nothing behind it is left out rather than listed with the binding
        failure that explains it, because an absent measure is not news and its
        cause is not the player's business.
      */}
      <ul className="economic-availability" aria-label="Figures for this place">
        {context.availability
          .filter((item) => diagnostics || item.status === "available")
          .map((item) => (
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
            <EconomicGraph
              key={graph.graphKey}
              graph={graph}
              diagnostics={diagnostics}
            />
          ))}
        </div>
      ) : (
        <p role="status">Nothing has been published for this date yet.</p>
      )}

      {diagnostics && unavailable.length > 0 ? (
        <details className="economic-unavailable">
          <summary>Unavailable comparisons</summary>
          <ul>
            {unavailable.map((item) => (
              <li key={item.graphKind}>
                <strong>{item.graphKind.replaceAll("-", " ")}</strong>:{" "}
                {item.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {diagnostics ? (
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
      ) : null}
    </section>
  );
}

export function EconomicGraph({
  graph,
  diagnostics = false,
  valuesTable = true,
}: {
  readonly graph: EconomicGraphModel;
  readonly diagnostics?: boolean;
  /** False when the caller shows its own table of the same values. */
  readonly valuesTable?: boolean;
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
        <span className="economic-graph-scope">
          {graph.geography
            ? `${graph.geography.providerName} · ${graph.geography.level}`
            : "Geography not supplied"}
          {` · ${graph.unit} · ${graph.referenceLabel}`}
        </span>
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
                (points, index) => {
                  const key = `${series.seriesKey}:${index}`;
                  const className = `economic-line economic-line--${series.recordClass}`;
                  if (!points.includes(" ")) {
                    const [cx, cy] = points.split(",");
                    return (
                      <circle
                        key={key}
                        className={className}
                        cx={cx}
                        cy={cy}
                        r="3"
                      />
                    );
                  }
                  return (
                    <polyline key={key} className={className} points={points} />
                  );
                },
              ),
            )}
      </svg>
      <div className="economic-legend" aria-label="What each line shows">
        {graph.series.map((series) => (
          <span key={series.seriesKey} data-record-class={series.recordClass}>
            {diagnostics
              ? `${recordClassLabel(series.recordClass)} · ${series.label}`
              : series.label}
          </span>
        ))}
      </div>
      {valuesTable ? (
        <details>
          <summary>Exact values</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">Period</th>
                {diagnostics ? <th scope="col">Class</th> : null}
                {diagnostics ? <th scope="col">Release</th> : null}
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {graph.series.flatMap((series) =>
                series.points.map((point) => (
                  <tr key={point.pointKey}>
                    <th scope="row">{series.label}</th>
                    <td>{point.period}</td>
                    {diagnostics ? (
                      <td>{recordClassLabel(point.recordClass)}</td>
                    ) : null}
                    {diagnostics ? (
                      <td>{point.releaseStatus ?? "Not established"}</td>
                    ) : null}
                    <td>
                      {point.value === null
                        ? diagnostics
                          ? `Missing — ${point.missingReason ?? "No value supplied"}`
                          : "—"
                        : formatGraphValue(point.value, graph.unit)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </details>
      ) : null}
      {/*
        "Drafts, forecasts, simulated history, and outturn remain distinct" is a
        promise the engine makes to its authors about how it keeps its records.
        It is kept; it is not narrated at the player.
      */}
      {diagnostics ? (
        <p className="economic-graph-boundary">{graph.boundaries.join(" ")}</p>
      ) : null}
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
  const exactNumber = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 20,
  }).format(value);
  if (unit.endsWith(" minor units")) return `${exactNumber} ${unit}`;
  if (unit.toLowerCase().includes("usd") || unit === "Dollars") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 20,
    }).format(value);
  }
  return `${exactNumber} ${unit}`;
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
