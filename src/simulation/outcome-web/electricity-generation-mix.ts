import source from "../../../data/research/outcome-web/electricity-generation-mix-2024.json" with { type: "json" };
import type { PlaceOutcomeMeasureBase } from "./place-outcome-store";

export const ELECTRICITY_GENERATION_FUELS = [
  "coal",
  "naturalGas",
  "nuclear",
  "wind",
  "solar",
  "hydro",
] as const;

export type ElectricityGenerationFuel =
  (typeof ELECTRICITY_GENERATION_FUELS)[number];

type SourcePlace = {
  readonly totalNetGenerationMwh: number;
  readonly fuelGenerationMwh: Readonly<
    Record<ElectricityGenerationFuel, number>
  >;
  readonly sharesOfTotalNetGeneration: Readonly<
    Record<ElectricityGenerationFuel, number>
  >;
  readonly untrackedResidualMwh: number;
  readonly untrackedResidualShare: number;
};

const dataset = source as unknown as {
  readonly dataset: string;
  readonly asOfYear: number;
  readonly source: {
    readonly agency: string;
    readonly title: string;
    readonly url: string;
    readonly selection: {
      readonly year: number;
      readonly typeOfProducer: string;
    };
  };
  readonly places: Readonly<Record<string, SourcePlace>>;
};

export interface StartingElectricityGenerationMix {
  readonly placeKey: string;
  readonly asOfYear: number;
  readonly totalNetGenerationMwh: number;
  readonly fuelGenerationMwh: Readonly<
    Record<ElectricityGenerationFuel, number>
  >;
  /** Fractions of total generation, as represented by the source dataset. */
  readonly shares: Readonly<Record<ElectricityGenerationFuel, number>>;
  readonly untrackedResidualMwh: number;
  readonly untrackedResidualShare: number;
  readonly source: {
    readonly dataset: string;
    readonly agency: string;
    readonly title: string;
    readonly url: string;
    readonly year: number;
    readonly typeOfProducer: string;
    /** A stable key constructed from the selected source row dimensions. */
    readonly sourceRowKey: string;
  };
}

/** Returns the published state/D.C. row; absent places stay unknown. */
export function startingElectricityGenerationMix(
  placeKey: string,
): StartingElectricityGenerationMix | null {
  const row = dataset.places[placeKey];
  if (!row) return null;
  return {
    placeKey,
    asOfYear: dataset.asOfYear,
    totalNetGenerationMwh: row.totalNetGenerationMwh,
    fuelGenerationMwh: { ...row.fuelGenerationMwh },
    shares: { ...row.sharesOfTotalNetGeneration },
    untrackedResidualMwh: row.untrackedResidualMwh,
    untrackedResidualShare: row.untrackedResidualShare,
    source: {
      dataset: dataset.dataset,
      agency: dataset.source.agency,
      title: dataset.source.title,
      url: dataset.source.url,
      year: dataset.source.selection.year,
      typeOfProducer: dataset.source.selection.typeOfProducer,
      sourceRowKey:
        `${dataset.dataset}:${dataset.source.selection.year}:` +
        `${placeKey}:${dataset.source.selection.typeOfProducer}`,
    },
  };
}

const fuelNames: Readonly<Record<ElectricityGenerationFuel, string>> = {
  coal: "coal",
  naturalGas: "natural gas",
  nuclear: "nuclear",
  wind: "wind",
  solar: "solar",
  hydro: "conventional hydroelectric",
};

/**
 * Source-backed numeric outcomes for each reported fuel share and the explicit
 * untracked remainder. Their six shares are not normalized to absorb that
 * remainder; no law-to-mix transfer rule is assumed here.
 */
export function electricityGenerationMixOutcomeBases(): Readonly<
  Record<string, PlaceOutcomeMeasureBase>
> {
  const placeKeys = Object.keys(dataset.places);
  const fuelMeasures = Object.fromEntries(
    ELECTRICITY_GENERATION_FUELS.map((fuel) => {
      const measure = `energy.generation-share.${fuel}`;
      return [
        measure,
        {
          name: `Electricity generated from ${fuelNames[fuel]}`,
          unit: "percent of total net generation",
          scale: "share",
          source:
            `${dataset.source.agency}, ${dataset.source.title}, ` +
            `${dataset.source.selection.year}, ` +
            `${dataset.source.selection.typeOfProducer}; ` +
            `${dataset.source.url}`,
          places: Object.fromEntries(
            placeKeys.map((placeKey) => [
              placeKey,
              dataset.places[placeKey]!.sharesOfTotalNetGeneration[fuel] * 100,
            ]),
          ),
          drift: { minPct: 0, maxPct: 100 },
        } satisfies PlaceOutcomeMeasureBase,
      ];
    }),
  );
  const residualMeasure = {
    name: "Electricity generation from untracked source categories",
    unit: "percent of total net generation",
    scale: "share",
    source:
      `${dataset.source.agency}, ${dataset.source.title}, ` +
      `${dataset.source.selection.year}, ` +
      `${dataset.source.selection.typeOfProducer}; remainder after the six ` +
      `tracked fuels, including other source categories and source-total ` +
      `rounding; ${dataset.source.url}`,
    places: Object.fromEntries(
      placeKeys.map((placeKey) => [
        placeKey,
        dataset.places[placeKey]!.untrackedResidualShare * 100,
      ]),
    ),
    drift: { minPct: 0, maxPct: 100 },
  } satisfies PlaceOutcomeMeasureBase;
  return {
    ...fuelMeasures,
    "energy.generation-share.untracked-residual": residualMeasure,
  };
}
