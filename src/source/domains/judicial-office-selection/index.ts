/** Public capability boundary for the national judicial-office source domain. */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  JUDICIAL_RESEARCH_ARTIFACT_ID,
  normalizeJudicialResearch,
} from "./normalize";
import { parseJudicialPacket, readResearchTranscription } from "./parse";
import type { JudicialResearchInventory } from "./parse";
import type { JudicialOfficeSelectionRecord } from "./types";
import { validateJudicialOfficeSelectionCorpus } from "./validate";

export * from "./types";
export {
  JUDICIAL_RESEARCH_ARTIFACT_ID,
  JUDICIAL_RESEARCH_DRIVE_FILE_ID,
  normalizeJudicialResearch,
} from "./normalize";
export {
  parseJudicialPacket,
  parseResearchTranscription,
  readResearchTranscription,
} from "./parse";
export {
  EXPECTED_ACTIVE_JUDICIAL_OFFICES,
  EXPECTED_JUDICIAL_JURISDICTIONS,
  EXPECTED_JUDICIAL_SLOTS,
  NO_INTERMEDIATE_APPELLATE,
  validateJudicialOfficeSelectionCorpus,
} from "./validate";

export const JUDICIAL_COMPILER_VERSION = "2.0.0";
export const JUDICIAL_PARSER_VERSION = "1.0.0";
export const JUDICIAL_CORPUS_AS_OF = "2026-09-05";

type JudicialArtifactRole = "packet";
export type JudicialOfficeSelectionArtifacts =
  OpenedArtifacts<JudicialArtifactRole>;

/**
 * Compile the exact 92L universe.
 *
 * The locked Markdown packet is the evidence artifact. The adjacent
 * transcription is compiler-owned data generated from the companion inventory
 * the packet itself names; normalization verifies every jurisdiction and court
 * name back against the locked packet before producing a record.
 */
export function compileJudicialOfficeSelection(
  input: ProductionInput<JudicialOfficeSelectionArtifacts>,
  inventory: JudicialResearchInventory = readResearchTranscription(),
): CompiledCorpus<JudicialOfficeSelectionRecord, "production"> {
  const packet = input.artifacts.packet;
  const packetIndex = parseJudicialPacket(packet.bytes.toString("utf-8"));
  const records = normalizeJudicialResearch(
    inventory,
    packetIndex,
    packet.artifact.artifactId,
  );

  return {
    corpus: {
      corpusId: "judicial-office-selection",
      compiler: {
        name: "judicial-office-selection",
        version: JUDICIAL_COMPILER_VERSION,
      },
      parser: {
        name: "92l-markdown-and-companion-transcription",
        version: JUDICIAL_PARSER_VERSION,
      },
      inputs: [
        {
          artifactId: packet.artifact.artifactId,
          sha256: packet.artifact.bytes.sha256,
        },
      ],
      asOf: JUDICIAL_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: true,
        universeDescription:
          "Every highest-court, intermediate-appellate, and general-trial office-family slot reported by 92L across the United States federal judiciary and all fifty states, plus its separately reported split-apex and chancery families: 156 slots, 148 active offices, and eight explicit non-applicable intermediate-court slots, as of 2026-09-05.",
        boundedSampleReason: null,
      },
    },
    records,
  };
}

export function openJudicialOfficeSelectionProduction(
  lock: ArtifactLock,
): ProductionInput<JudicialOfficeSelectionArtifacts> {
  return openProductionArtifacts<JudicialArtifactRole>(
    "judicial-office-selection",
    lock,
    { packet: JUDICIAL_RESEARCH_ARTIFACT_ID },
  );
}

export const sourceDomain: SourceDomainModule<JudicialOfficeSelectionRecord> = {
  domain: "judicial-office-selection",
  compilerVersion: JUDICIAL_COMPILER_VERSION,
  // The authenticated Drive packet is committed and locked. Refreshes are an
  // explicit intake operation; the unauthenticated CLI must not fetch a login page.
  acquisitionPlan: { domain: "judicial-office-selection", requests: [] },
  lockPath: "data/source/judicial-office-selection/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<JudicialOfficeSelectionRecord, "production"> {
    return compileJudicialOfficeSelection(
      openJudicialOfficeSelectionProduction(lock),
    );
  },
  validateCorpus(
    corpus: CompiledCorpus<JudicialOfficeSelectionRecord>,
  ): ValidationReport {
    return validateJudicialOfficeSelectionCorpus(corpus);
  },
};
