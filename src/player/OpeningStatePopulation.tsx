import { useEffect, useState } from "react";
import { isTerritoryUsps } from "../simulation/state-reference";
import { districtIdentityCatalog } from "../districts/catalog";
import {
  queryMapPlaceDemography,
  type MapPlaceDemography,
} from "../presentation/map-place-demography";

const stateFips = new Map(
  districtIdentityCatalog().map((row) => [row.stateUsps, row.stateFips]),
);
stateFips.set("DC", "11");

/** Dated reference data is displayed without writing to the saved World. */
export function OpeningStatePopulation({
  stateUsps,
  asOf,
}: {
  readonly stateUsps: string | null;
  readonly asOf: string;
}) {
  const [result, setResult] = useState<MapPlaceDemography | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const key = `${stateUsps}:${asOf}`;
  const geoid = stateUsps ? stateFips.get(stateUsps) : undefined;
  useEffect(() => {
    if (!stateUsps || !geoid) return;
    let active = true;
    void queryMapPlaceDemography({
      layer: "state",
      geoid,
      stateUsps,
      asOf,
    }).then(
      (next) => {
        if (active) setResult(next);
      },
      () => {
        if (active) setFailed(key);
      },
    );
    return () => {
      active = false;
    };
  }, [stateUsps, geoid, asOf, key]);
  const ready =
    result?.selection.stateUsps === stateUsps && result.selection.asOf === asOf
      ? result
      : null;
  const population = ready?.population;
  return (
    <section data-testid="opening-state-population">
      <h3>
        {stateUsps === "DC"
          ? "People in the District"
          : isTerritoryUsps(stateUsps)
            ? "People in the territory"
            : "People in your state"}
      </h3>
      {population ? (
        <figure className="pg-state-population-figure">
          <p className="pg-state-population-number">
            <span className="pg-state-population-value">
              {population.value.toLocaleString("en-US")}
            </span>{" "}
            <span className="pg-state-population-unit">people</span>
          </p>
          <figcaption className="pg-state-population-caption">
            {populationCaption(population.geography.name, population.period)}
          </figcaption>
        </figure>
      ) : (
        <p>
          {!stateUsps || !geoid || ready || failed === key
            ? "Population unavailable for this date."
            : "Loading population…"}
        </p>
      )}
    </section>
  );
}

/**
 * The line under the figure reads as a caption, not a record label: who is
 * counted and when. The year is the figure's own reference year.
 */
export function populationCaption(placeName: string, period: string): string {
  const year = /^\d{4}$/.test(period) ? period : null;
  const place = /^District of /.test(placeName)
    ? `the ${placeName}`
    : placeName;
  return `Residents of ${place}, all ages${year ? `, ${year}` : ""}`;
}
