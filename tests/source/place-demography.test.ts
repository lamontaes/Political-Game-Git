import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  ArtifactLock,
  CompiledCorpus,
  NormalizedCorpus,
} from "../../src/source/core/index";
import type { BeaObservationRecord } from "../../src/source/domains/bea-regional/index";
import type { LausObservationRecord } from "../../src/source/domains/bls-laus/index";
import type { HudRecord } from "../../src/source/domains/hud-housing/index";
import { buildEconomicContextReadModel } from "../../src/source/adapters/economic-context";
import type {
  EconomicContextCorpora,
  EconomicContextGeographyBinding,
  EconomicContextObservation,
  EconomicContextReadModel,
} from "../../src/source/adapters/economic-context";
import { readPlaceDemography } from "../../src/source/adapters/place-demography";
import {
  LEXINGTON_PLACEHOLDER_ID,
  lifePlaceByKey,
  searchLifePlaces,
} from "../../src/simulation/index";

const REPO = resolve(import.meta.dirname, "../..");

function corpus<T>(domain: string): CompiledCorpus<T> {
  const directory = resolve(REPO, "data/source", domain);
  return {
    records: JSON.parse(
      readFileSync(resolve(directory, "corpus.json"), "utf8"),
    ) as T[],
    corpus: JSON.parse(
      readFileSync(resolve(directory, "corpus-manifest.json"), "utf8"),
    ) as NormalizedCorpus,
  };
}

function lock(domain: string): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source", domain, "artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
}

function corpora(): EconomicContextCorpora {
  return {
    bea: corpus<BeaObservationRecord>("bea-regional"),
    laus: corpus<LausObservationRecord>("bls-laus"),
    hud: corpus<HudRecord>("hud-housing"),
    locks: {
      bea: lock("bea-regional"),
      laus: lock("bls-laus"),
      hud: lock("hud-housing"),
    },
  };
}

const LEXINGTON_BINDING: EconomicContextGeographyBinding = {
  bindingKey: "economic-context.lexington-ky.v1",
  jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
  placeKey: "lexington-ky",
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

const LEXINGTON_MODEL = buildEconomicContextReadModel(
  corpora(),
  LEXINGTON_BINDING,
);

function withPopulationObservation(
  model: EconomicContextReadModel,
  observation: EconomicContextObservation,
): EconomicContextReadModel {
  return { ...model, observations: [observation, ...model.observations] };
}

function beaPopulation(args: {
  readonly people: number | "unknown";
  readonly geoFips: string;
  readonly geoName: string;
  readonly relationship: EconomicContextObservation["geography"]["relationship"];
  readonly period?: string;
}): EconomicContextObservation {
  const template = LEXINGTON_MODEL.observations.find(
    (row) => row.kind === "bea",
  )!;
  const value =
    args.people === "unknown"
      ? {
          state: "UNKNOWN" as const,
          reason: "The Bureau withheld this headcount.",
          investigated: template.evidence ? [template.evidence] : [],
        }
      : {
          state: "KNOWN" as const,
          value: args.people,
          evidence: [template.evidence],
          release: "FINAL" as const,
          asOf: `${args.period ?? "2024"}-12-31`,
        };
  return {
    ...template,
    observationKey: `bea:CAINC1:${args.geoFips}:2:${args.period ?? "2024"}`,
    sourceSeriesKey: "bea.cainc1.2",
    label: "Population (persons)",
    detailKey: "CAINC1:2",
    period: args.period ?? "2024",
    unit: "Number of persons",
    geography: {
      providerCode: args.geoFips,
      providerName: args.geoName,
      level: "county",
      relationship: args.relationship,
    },
    value,
  };
}

describe("Place demography uses provider geography, not a substitute city series", () => {
  it("keeps unknown city population unknown when no place-level series exists", () => {
    const auburn = searchLifePlaces("Auburn", 8, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    }).find((place) => /^Auburn,/i.test(place.displayName))!;
    const facts = readPlaceDemography(auburn);
    expect(facts.population).toBeNull();
    expect(
      facts.omissions.some((row) => row.reason === "no-place-series"),
    ).toBe(true);
    expect(
      facts.omissions.some((row) => row.reason === "voter-unresolved"),
    ).toBe(true);
    expect(
      facts.omissions.some((row) => row.reason === "acs-pums-not-place"),
    ).toBe(true);
  });

  it("does not treat locked BEA income or HUD FMR area figures as city population", () => {
    const lexington = lifePlaceByKey("lexington-fayette")!;
    const facts = readPlaceDemography(lexington, LEXINGTON_MODEL);
    expect(facts.population).toBeNull();
    expect(
      facts.omissions.some((row) => row.reason === "county-not-city"),
    ).toBe(true);
    expect(
      facts.omissions.some((row) => row.reason === "hud-area-not-place"),
    ).toBe(true);
    expect(
      facts.omissions.some((row) => row.reason === "voter-unresolved"),
    ).toBe(true);
  });

  it("refuses Fayette County headcount as Lexington or Auburn city population", () => {
    const county = beaPopulation({
      people: 322570,
      geoFips: "21067",
      geoName: "Fayette, KY",
      relationship: "same-jurisdiction",
    });
    const model = withPopulationObservation(LEXINGTON_MODEL, county);
    const lexington = readPlaceDemography(
      lifePlaceByKey("lexington-fayette")!,
      model,
    );
    const auburn = searchLifePlaces("Auburn", 8, {
      stateJurisdictionKey: "US-AL",
      scope: "locality",
    }).find((place) => /^Auburn,/i.test(place.displayName))!;
    expect(lexington.population).toBeNull();
    expect(
      lexington.omissions.some((row) => row.reason === "county-not-city"),
    ).toBe(true);
    expect(readPlaceDemography(auburn, model).population).toBeNull();
    expect(
      readPlaceDemography(auburn, model).omissions.some(
        (row) => row.reason === "county-not-city",
      ),
    ).toBe(true);
  });

  it("keeps a withheld headcount unknown instead of writing zero", () => {
    const richmond = lifePlaceByKey("5167000")!;
    const unknown = withPopulationObservation(
      LEXINGTON_MODEL,
      beaPopulation({
        people: "unknown",
        geoFips: "51760",
        geoName: "Richmond city, VA",
        relationship: "same-jurisdiction",
      }),
    );
    const facts = readPlaceDemography(richmond, unknown);
    expect(facts.population).toBeNull();
    expect(facts.omissions.some((row) => row.reason === "unknown-value")).toBe(
      true,
    );
  });

  it("records a county-equivalent headcount, including a published zero, on that unit's year", () => {
    const richmond = lifePlaceByKey("5167000")!;
    const known = withPopulationObservation(
      LEXINGTON_MODEL,
      beaPopulation({
        people: 226610,
        geoFips: "51760",
        geoName: "Richmond city, VA",
        relationship: "same-jurisdiction",
        period: "2023",
      }),
    );
    const facts = readPlaceDemography(richmond, known);
    expect(facts.population).toEqual(
      expect.objectContaining({
        kind: "population",
        people: 226610,
        period: "2023",
        geographyLevel: "county",
        geographyCode: "51760",
        relationship: "same-jurisdiction",
        sourceProduct: "bea-regional",
      }),
    );

    const zero = withPopulationObservation(
      LEXINGTON_MODEL,
      beaPopulation({
        people: 0,
        geoFips: "51760",
        geoName: "Richmond city, VA",
        relationship: "same-jurisdiction",
      }),
    );
    expect(readPlaceDemography(richmond, zero).population?.people).toBe(0);
  });
});
