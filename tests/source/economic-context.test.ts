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
import {
  buildEconomicContextReadModel,
  worldObservationInputFromEconomicContext,
} from "../../src/source/adapters/economic-context";
import type {
  EconomicContextCorpora,
  EconomicContextGeographyBinding,
} from "../../src/source/adapters/economic-context";
import {
  createDemoWorld,
  LEXINGTON_PLACEHOLDER_ID,
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

function lock(domain: string): ArtifactLock {
  return JSON.parse(
    readFileSync(
      resolve(REPO, "data/source", domain, "artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
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

const SOURCE_CORPORA = corpora();
const LEXINGTON_MODEL = buildEconomicContextReadModel(
  SOURCE_CORPORA,
  LEXINGTON_BINDING,
);

describe("ECON-CONTEXT2 — exact, dated economic context", () => {
  it("preserves provider geography, units, adjustment, and product vintage", () => {
    const model = LEXINGTON_MODEL;
    expect(
      model.availability.every((entry) => entry.status === "available"),
    ).toBe(true);

    const income = model.observations.find(
      (item) =>
        item.detailKey === "CAINC1:3" &&
        item.geography.providerCode === "21067" &&
        item.period === "2024",
    );
    expect(income).toMatchObject({
      geography: { level: "county", relationship: "same-jurisdiction" },
      unit: "Dollars",
      period: "2024",
      interpretationBoundary: "observation-not-forecast",
      vintage: {
        publisherReleaseDate: null,
        sourceRetrievedAt: "2026-09-03T04:21:17.858Z",
        knownAvailableOn: "2026-09-03",
        knownAvailableOnBasis: "retrieval-date-fallback",
        validityPeriod: null,
        validityBasis: "not-established-by-locked-product",
      },
    });

    const unemploymentRate = model.observations.find(
      (item) =>
        item.kind === "laus" &&
        item.detailKey.endsWith(":03") &&
        item.period === "2026-M07",
    );
    expect(unemploymentRate).toMatchObject({
      geography: {
        providerCode: "ST2100000000000",
        relationship: "containing-state",
      },
      unit: "Percent",
      vintage: { adjustment: "Seasonally adjusted" },
      interpretationBoundary: "area-rate-not-person-probability",
    });

    const rent = model.observations.find(
      (item) => item.sourceSeriesKey === "hud.fmr.2-bedroom",
    );
    expect(rent).toMatchObject({
      period: "FY2025",
      unit: "USD per month",
      geography: { providerCode: "2106799999" },
      interpretationBoundary: "benchmark-not-transaction",
      vintage: { release: null },
    });
  }, 20_000);

  it("compares historical observations without projecting a future", () => {
    const model = LEXINGTON_MODEL;
    expect(
      model.comparisons.find(
        (item) => item.earlierPeriod === "2019" && item.laterPeriod === "2024",
      ),
    ).toMatchObject({ earlierRelease: "FINAL", laterRelease: "FINAL" });
    expect(
      model.comparisons.find(
        (item) =>
          item.comparisonKind === "same-period-prior-year" &&
          item.earlierPeriod === "2025-M07" &&
          item.laterPeriod === "2026-M07",
      ),
    ).toMatchObject({
      earlierRelease: "FINAL",
      laterRelease: "PRELIMINARY",
    });
    expect(model.boundaries).toContain(
      "An observation is not a forecast or evidence of a policy effect.",
    );
  });

  it("preserves unavailable release classification on both comparison endpoints", () => {
    const latest = SOURCE_CORPORA.hud.records.find(
      (record) =>
        record.recordKind === "fair-market-rent" &&
        record.area.hudFipsCode === "2106799999",
    );
    if (!latest) throw new Error("Lexington HUD FMR fixture is missing.");
    const withPriorHudVintage: EconomicContextCorpora = {
      ...SOURCE_CORPORA,
      hud: {
        ...SOURCE_CORPORA.hud,
        records: [
          ...SOURCE_CORPORA.hud.records,
          {
            ...latest,
            recordId: `${latest.recordId}:prior-null-release-control`,
            productVintage: "FY2024",
          },
        ],
      },
    };
    const comparison = buildEconomicContextReadModel(
      withPriorHudVintage,
      LEXINGTON_BINDING,
    ).comparisons.find(
      (item) =>
        item.sourceSeriesKey === "hud.fmr.2-bedroom" &&
        item.earlierPeriod === "FY2024" &&
        item.laterPeriod === "FY2025",
    );

    expect(comparison).toMatchObject({
      earlierRelease: null,
      laterRelease: null,
    });
  });

  it("reports exact-code misses as unavailable and never falls back to a name", () => {
    const model = buildEconomicContextReadModel(SOURCE_CORPORA, {
      ...LEXINGTON_BINDING,
      beaAreas: [],
      hudFipsCodes: [],
      lausAreaCodes: [
        { areaCode: "CN2106700000000", relationship: "same-jurisdiction" },
      ],
    });
    expect(model.observations).toEqual([]);
    expect(model.availability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ product: "bls-laus", status: "unavailable" }),
      ]),
    );
    expect(model.availability.map((entry) => entry.reason).join(" ")).toMatch(
      /Names were not used|exact bound provider geography/,
    );
  });

  it("preserves unavailable source values", () => {
    const model = LEXINGTON_MODEL;
    const unavailable = model.observations.find(
      (item) =>
        item.kind === "laus" &&
        item.period === "2025-M10" &&
        item.detailKey.endsWith(":03"),
    );
    expect(unavailable?.value.state).toBe("UNKNOWN");
    expect(
      model.analystInputs.some(
        (item) => item.observationKey === unavailable?.observationKey,
      ),
    ).toBe(false);
  });

  it("does not relabel containing-area statistics as Lexington World scope", () => {
    const statewide = LEXINGTON_MODEL.analystInputs.find(
      (input) =>
        input.sourceGeography.providerCode === "ST2100000000000" &&
        input.suggestedMetricStableKey === "labor.unemployment-rate",
    );
    expect(statewide).toMatchObject({
      worldScopeJurisdictionId: null,
      worldObservationReadiness:
        "source-geography-has-no-canonical-world-scope",
    });
  });

  it("is deterministic and does not mutate source corpora or World state", () => {
    const sources: EconomicContextCorpora = {
      bea: {
        ...SOURCE_CORPORA.bea,
        records: SOURCE_CORPORA.bea.records.filter((record) =>
          ["21067", "30460", "21000"].includes(record.geoFips),
        ),
      },
      laus: {
        ...SOURCE_CORPORA.laus,
        records: SOURCE_CORPORA.laus.records.filter(
          (record) => record.area.areaCode === "ST2100000000000",
        ),
      },
      hud: {
        ...SOURCE_CORPORA.hud,
        records: SOURCE_CORPORA.hud.records.filter(
          (record) => record.area.hudFipsCode === "2106799999",
        ),
      },
      locks: SOURCE_CORPORA.locks,
    };
    const beforeSources = JSON.stringify(sources);
    const world = createDemoWorld("econ-context2-read-purity");
    const beforeWorld = JSON.stringify(world);
    const first = buildEconomicContextReadModel(sources, LEXINGTON_BINDING);
    const second = buildEconomicContextReadModel(sources, LEXINGTON_BINDING);
    expect(second).toEqual(first);
    expect(JSON.stringify(sources)).toBe(beforeSources);

    const analystInput = first.analystInputs.find(
      (input) => input.sourceGeography.relationship === "same-jurisdiction",
    );
    expect(analystInput).toBeDefined();
    if (!analystInput) return;
    expect(
      worldObservationInputFromEconomicContext(
        world,
        analystInput,
        "econ-context2:proof",
        "2026-09-08",
      ),
    ).toEqual({
      status: "unavailable",
      reason:
        "The locked source product does not establish a release date; observation as-of was not substituted.",
    });
    expect(JSON.stringify(world)).toBe(beforeWorld);
  }, 20_000);

  it("does not turn observations into publications or personal resources", () => {
    const model = LEXINGTON_MODEL;
    expect(model.publicationCandidates.length).toBeGreaterThan(0);
    expect(
      model.publicationCandidates.every(
        (candidate) => candidate.status === "not-published",
      ),
    ).toBe(true);
    expect(
      model.publicationCandidates.every(
        (candidate) => candidate.sourceReleaseDate === null,
      ),
    ).toBe(true);
    expect(JSON.stringify(model)).not.toMatch(/signed-lease|forecast-value/);
  });
});
