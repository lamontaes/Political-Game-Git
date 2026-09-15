import {
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  CompiledCorpus,
  OpenedArtifact,
  ProductionInput,
  SourceDomainModule,
} from "../../core/index";
import { normalizeRetrievedText } from "../../core/parse/html-text";
import { CONSTITUTIONAL_FACTS, CONSTITUTIONAL_SOURCES } from "./sources";

export function compileConstitutionalSources(
  input: ProductionInput<Record<string, OpenedArtifact>>,
): CompiledCorpus<(typeof CONSTITUTIONAL_FACTS)[number], "production"> {
  for (const fact of CONSTITUTIONAL_FACTS) {
    const artifact = input.artifacts[fact.artifactId];
    if (!artifact || artifact.artifact.bytes.sha256 !== fact.sha256)
      throw new Error(`Constitutional evidence changed: ${fact.artifactId}`);
    const text =
      artifact.contentScope === "enacted-text-only"
        ? artifact.bytes.toString("utf8")
        : normalizeRetrievedText(artifact.bytes, artifact.artifact.mediaType);
    for (const excerpt of fact.excerpts)
      if (!text.includes(excerpt))
        throw new Error(`Missing enacted proposition: ${fact.artifactId}`);
    if (
      fact.artifactId === "us-process" &&
      !text.includes("President does not have a constitutional role")
    )
      throw new Error("Federal approval role is not verified.");
  }
  return {
    corpus: {
      corpusId: "constitutional-process",
      compiler: { name: "constitutional-process", version: "1.0.0" },
      parser: { name: "pinned-enacted-text", version: "1.0.0" },
      inputs: CONSTITUTIONAL_FACTS.map((f) => ({
        artifactId: f.artifactId,
        sha256: f.sha256,
      })),
      asOf: "2026-09-13",
      recordCount: CONSTITUTIONAL_FACTS.length,
      canonicalSha256: corpusCanonicalDigest(CONSTITUTIONAL_FACTS),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Article V, California legislative amendment/revision, and Carson charter legislative route.",
        boundedSampleReason:
          "These acquired provisions do not establish all states, initiative qualification, conventions or disputed ratification rules.",
      },
    },
    records: CONSTITUTIONAL_FACTS,
  };
}
export const sourceDomain: SourceDomainModule = {
  domain: "constitutional-process",
  compilerVersion: "1.0.0",
  lockPath: "data/source/constitutional-process/artifact-lock.json",
  acquisitionPlan: {
    domain: "constitutional-process",
    requests: CONSTITUTIONAL_SOURCES,
  },
  compileProduction(lock) {
    return compileConstitutionalSources(
      openProductionArtifacts(
        "constitutional-process",
        lock,
        Object.fromEntries(
          CONSTITUTIONAL_SOURCES.map((s) => [s.artifactId, s.artifactId]),
        ),
      ),
    );
  },
  validateCorpus(corpus) {
    return {
      domain: "constitutional-process",
      checked: corpus.records.length,
      findings:
        corpus.corpus.canonicalSha256 ===
          corpusCanonicalDigest(corpus.records) &&
        corpusCanonicalDigest(corpus.records) ===
          corpusCanonicalDigest(CONSTITUTIONAL_FACTS) &&
        corpus.corpus.recordCount === CONSTITUTIONAL_FACTS.length
          ? []
          : [
              {
                severity: "error",
                code: "digest",
                message: "Constitutional corpus digest changed.",
              },
            ],
    };
  },
};
