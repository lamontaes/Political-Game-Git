import type { PlaceOutcomeMeasureBase } from "./place-values";
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

export type GenerationDataset = {
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

const fuelNames: Readonly<Record<ElectricityGenerationFuel, string>> = {
  coal: "coal",
  naturalGas: "natural gas",
  nuclear: "nuclear",
  wind: "wind",
  solar: "solar",
  hydro: "conventional hydroelectric",
};

export function electricityGenerationMixOutcomeBasesFromFacts(
  dataset: GenerationDataset,
): Readonly<Record<string, PlaceOutcomeMeasureBase>> {
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
