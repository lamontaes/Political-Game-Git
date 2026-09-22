import { useEffect, useState } from "react";
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
        {stateUsps === "DC" ? "People in the District" : "People in your state"}
      </h3>
      {population ? (
        <>
          <p className="pg-state-population-number">
            {population.value.toLocaleString("en-US")} people
          </p>
          <p>{population.geography.name} · All ages</p>
        </>
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
