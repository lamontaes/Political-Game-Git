/**
 * Build the browser-sized economic context from the locked corpora.
 * The output contains observations only; it is not canonical World state.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ArtifactLock,
  CompiledCorpus,
  NormalizedCorpus,
} from "../../src/source/core/index";
import type { EntityId } from "../../src/simulation/types";
import { toCanonicalJson, writeText } from "../../src/source/core/index";
import type { BeaObservationRecord } from "../../src/source/domains/bea-regional/index";
import type { LausObservationRecord } from "../../src/source/domains/bls-laus/index";
import type { HudRecord } from "../../src/source/domains/hud-housing/index";
import {
  buildEconomicContextReadModel,
  type EconomicContextCorpora,
  type EconomicContextObservation,
} from "../../src/source/adapters/economic-context";
import reviewedCrosswalks from "../../src/presentation/generated/economic-context-crosswalks.generated.json" with { type: "json" };
import { REPO_ROOT } from "./registry";

interface ExportBinding {
  readonly bindingKey: string;
  readonly archiveBindingKey: string;
  readonly archivePlaceKey: string;
  readonly jurisdictionId: string;
  readonly placeKey: string;
  readonly placeLabel: string;
  readonly outputFile: string;
  readonly beaAreas: readonly {
    readonly geographyLevel: "county" | "msa" | "state";
    readonly geoFips: string;
    readonly relationship:
      "same-jurisdiction" | "containing-state" | "containing-metro";
  }[];
  readonly lausAreaCodes: readonly {
    readonly areaCode: string;
    readonly relationship:
      "same-jurisdiction" | "containing-state" | "containing-metro";
  }[];
  readonly hudFipsCodes: readonly {
    readonly hudFipsCode: string;
    readonly relationship: "same-jurisdiction" | "containing-hud-area";
  }[];
}

const exportBindings = Object.values(reviewedCrosswalks) as ExportBinding[];
if (exportBindings.length !== 1) {
  throw new Error(
    "Economic context export requires exactly one generated export binding.",
  );
}
const binding = exportBindings[0]!;

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
  ...binding,
  jurisdictionId: binding.jurisdictionId as EntityId,
  bindingKey: binding.archiveBindingKey,
  placeKey: binding.archivePlaceKey,
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
      item.detailKey === "CAINC1:3" &&
      binding.beaAreas.some(
        (area) =>
          area.geographyLevel === item.geography.level &&
          area.geoFips === item.geography.providerCode &&
          area.relationship === "same-jurisdiction",
      ),
  ),
  latestKnown(
    (item) =>
      item.kind === "laus" &&
      item.detailKey.endsWith(":03") &&
      binding.lausAreaCodes.some(
        (area) => area.areaCode === item.geography.providerCode,
      ),
  ),
  latestKnown(
    (item) =>
      item.sourceSeriesKey === "hud.fmr.2-bedroom" &&
      binding.hudFipsCodes.some(
        (area) => area.hudFipsCode === item.geography.providerCode,
      ),
  ),
  latestKnown(
    (item) =>
      item.detailKey === "MARPP:1" &&
      binding.beaAreas.some(
        (area) =>
          area.geographyLevel === item.geography.level &&
          area.geoFips === item.geography.providerCode &&
          area.relationship === "containing-metro",
      ),
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

const DEFAULT_OUTPUT = resolve(
  REPO_ROOT,
  `src/presentation/generated/${binding.outputFile}`,
);

export function exportEconomicContext(outputPath: string = DEFAULT_OUTPUT): {
  readonly observationCount: number;
  readonly placeKey: string;
} {
  writeText(outputPath, toCanonicalJson(output));
  return { observationCount: selected.length, placeKey: model.placeKey };
}

if (process.argv[1]?.endsWith("export-economic-context.ts")) {
  const result = exportEconomicContext();
  console.log(
    `export:economic-context: ${result.observationCount} observations for ${result.placeKey}`,
  );
}
