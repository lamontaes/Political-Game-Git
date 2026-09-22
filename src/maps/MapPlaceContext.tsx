import { useEffect, useState } from "react";
import {
  queryMapPlaceDemography,
  type MapDemographyMetric,
  type MapDemographySelection,
  type MapPlaceDemography,
} from "../presentation/map-place-demography";

function Metric({ metric }: { readonly metric: MapDemographyMetric }) {
  return (
    <div>
      <dt>{metric.label}</dt>
      <dd>
        {metric.value.toLocaleString("en-US", { maximumFractionDigits: 1 })}
        {metric.unit === "Number of persons" ? " people" : ` ${metric.unit}`}
        {" · "}
        {metric.period}
      </dd>
    </div>
  );
}

/** Selected-area reference data never changes the save or advances its clock. */
export function MapPlaceContext({
  selection,
}: {
  readonly selection: MapDemographySelection;
}) {
  const { layer, geoid, stateUsps, asOf } = selection;
  const [result, setResult] = useState<MapPlaceDemography | null>(null);
  useEffect(() => {
    let current = true;
    void queryMapPlaceDemography({ layer, geoid, stateUsps, asOf }).then(
      (next) => {
        if (current) setResult(next);
      },
    );
    return () => {
      current = false;
    };
  }, [layer, geoid, stateUsps, asOf]);
  const ready =
    result?.selection.layer === layer &&
    result.selection.geoid === geoid &&
    result.selection.stateUsps === stateUsps &&
    result.selection.asOf === asOf
      ? result
      : null;
  const metrics = ready
    ? [ready.population, ready.density, ...ready.detailFields].filter(
        (metric): metric is MapDemographyMetric => metric !== null,
      )
    : [];
  return (
    <section className="pg-map-people-place" data-testid="map-people-place">
      <h4>People and place</h4>
      {ready ? (
        <>
          {ready.population ? (
            <dl>
              <Metric metric={ready.population} />
            </dl>
          ) : (
            <p className="pg-map-muted">
              Population unavailable for this area and date.
            </p>
          )}
          {ready.density ? (
            <dl>
              <Metric metric={ready.density} />
            </dl>
          ) : null}
          <details>
            <summary>Demographic details and sources</summary>
            <p className="pg-map-muted">{ready.boundary}</p>
            <dl>
              {ready.detailFields.map((metric) => (
                <Metric key={metric.series} metric={metric} />
              ))}
            </dl>
            {metrics.map((metric) => (
              <p className="pg-map-muted" key={metric.series}>
                <a href={metric.source.url} target="_blank" rel="noreferrer">
                  {metric.series}
                </a>
                {` · ${metric.geography.name} · ${metric.period} · ${metric.release}`}
              </p>
            ))}
            <ul className="pg-map-muted">
              {ready.omissions.map((item) => (
                <li key={item.field}>
                  {item.field}: {item.reason}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="pg-map-muted">Loading area statistics…</p>
      )}
    </section>
  );
}
