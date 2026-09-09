/**
 * Build the browser-sized Lexington economic context from the locked corpora.
 * The output contains observations only; it is not canonical World state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ArtifactLock,
  CompiledCorpus,
  NormalizedCorpus,
} from "../../src/source/core/index";
import { toCanonicalJson, writeText } from "../../src/source/core/index";
import type { BeaObservationRecord } from "../../src/source/domains/bea-regional/index";
import type { LausObservationRecord } from "../../src/source/domains/bls-laus/index";
import type { HudRecord } from "../../src/source/domains/hud-housing/index";
import {
  buildEconomicContextReadModel,
  type EconomicContextCorpora,
  type EconomicContextObservation,
} from "../../src/source/adapters/economic-context";
import { LEXINGTON_PLACEHOLDER_ID } from "../../src/simulation/index";
import { REPO_ROOT } from "./registry";

function readCorpus<T>(domain: string): CompiledCorpus<T> {
  const directory = resolve(REPO_ROOT, "data/source", domain);
  return {
    records: JSON.parse(
      readFileSync(resolve(directory, "corpus.json"), "utf8"),
    ) as T[],
    corpus: JSON.parse(
      readFileSync(resolve(directory, "corpus-manifest.json"), "utf8"),
    ) as NormalizedCorpus,
  };
}

const corpora: EconomicContextCorpora = {
  bea: readCorpus<BeaObservationRecord>("bea-regional"),
  laus: readCorpus<LausObservationRecord>("bls-laus"),
  hud: readCorpus<HudRecord>("hud-housing"),
  locks: {
    bea: JSON.parse(
      readFileSync(
        resolve(REPO_ROOT, "data/source/bea-regional/artifact-lock.json"),
        "utf8",
      ),
    ) as ArtifactLock,
    laus: JSON.parse(
      readFileSync(
        resolve(REPO_ROOT, "data/source/bls-laus/artifact-lock.json"),
        "utf8",
      ),
    ) as ArtifactLock,
    hud: JSON.parse(
      readFileSync(
        resolve(REPO_ROOT, "data/source/hud-housing/artifact-lock.json"),
        "utf8",
      ),
    ) as ArtifactLock,
  },
};

const model = buildEconomicContextReadModel(corpora, {
  bindingKey: "economic-context.lexington-ky.v1",
  jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
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
});

function latestKnown(
  predicate: (observation: EconomicContextObservation) => boolean,
): EconomicContextObservation {
  const matches = model.observations.filter(
    (observation) =>
      predicate(observation) && observation.value.state === "KNOWN",
  );
  const latest = matches.at(-1);
  if (!latest) {
    throw new Error(
      "Economic context export is missing a required locked observation.",
    );
  }
  return latest;
}

const selected = [
  latestKnown(
    (item) =>
      item.detailKey === "CAINC1:3" && item.geography.providerCode === "21067",
  ),
  latestKnown((item) => item.kind === "laus" && item.detailKey.endsWith(":03")),
  latestKnown((item) => item.sourceSeriesKey === "hud.fmr.2-bedroom"),
  latestKnown(
    (item) =>
      item.detailKey === "MARPP:1" && item.geography.providerCode === "30460",
  ),
];

const selectedKeys = new Set(
  selected.map((observation) => observation.observationKey),
);
const selectedSeries = new Set(
  selected.map(
    (observation) =>
      `${observation.sourceSeriesKey}:${observation.geography.providerCode}:${observation.unit}`,
  ),
);

const output = {
  schemaVersion: "1",
  bindingKey: model.bindingKey,
  placeKey: model.placeKey,
  placeLabel: model.placeLabel,
  referenceKind: model.referenceKind,
  corpora: model.corpora,
  availability: model.availability,
  observations: selected,
  comparisons: model.comparisons.filter((comparison) =>
    selectedSeries.has(
      `${comparison.sourceSeriesKey}:${comparison.geography.providerCode}:${comparison.unit}`,
    ),
  ),
  publicationCandidates: model.publicationCandidates.filter((candidate) =>
    selectedKeys.has(candidate.observationKey),
  ),
  boundaries: model.boundaries,
};

writeText(
  resolve(
    REPO_ROOT,
    "src/presentation/generated/economic-context-lexington.json",
  ),
  toCanonicalJson(output),
);
console.log(
  `export:economic-context: ${selected.length} observations for ${model.placeKey}`,
);
