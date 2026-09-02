import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type {
  CompiledQualificationsCorpus,
  CoverageMatrixEntry,
  OfficeQualificationFacts,
  ProvenanceSummary,
  StateCode,
  StateOfficeQualificationRecord,
  UnresolvedItem,
} from "../../src/state_office_qualifications/types.js";

const ROOT_DIR = process.cwd();
const STATES_DIR = path.join(
  ROOT_DIR,
  "data",
  "state-office-qualifications",
  "states",
);
const OUTPUT_DIR = path.join(ROOT_DIR, "data", "state-office-qualifications");

function computeFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

export function compileCorpus() {
  console.log("Compiling 50-state office qualifications corpus...");

  if (!fs.existsSync(STATES_DIR)) {
    throw new Error(`States directory not found: ${STATES_DIR}`);
  }

  const files = fs.readdirSync(STATES_DIR).filter((f) => f.endsWith(".json"));
  if (files.length !== 50) {
    throw new Error(`Expected 50 state JSON files, found ${files.length}`);
  }

  const statesMap: Record<string, StateOfficeQualificationRecord> = {};
  const coverageMatrix: CoverageMatrixEntry[] = [];
  const unresolvedList: UnresolvedItem[] = [];

  let totalOfficeRecords = 0;
  let totalCitations = 0;
  const sourcesByVintage: Record<string, number> = {};

  for (const file of files.sort()) {
    const filePath = path.join(STATES_DIR, file);
    const fileHash = computeFileSha256(filePath);
    const rawContent = fs.readFileSync(filePath, "utf8");
    const stateRecord: StateOfficeQualificationRecord = JSON.parse(rawContent);

    const stateCode = stateRecord.stateCode;
    statesMap[stateCode] = stateRecord;

    for (const [, officeFacts] of Object.entries(stateRecord.offices) as [
      string,
      OfficeQualificationFacts,
    ][]) {
      totalOfficeRecords++;

      // Track citations
      const fieldsToCheck = [
        officeFacts.minimumAge,
        officeFacts.usCitizenshipYears,
        officeFacts.stateResidencyYears,
        officeFacts.districtResidencyYears,
        officeFacts.voterElectorRequirement,
        officeFacts.termLengthYears,
        officeFacts.termLimits,
      ];

      for (const fieldVal of fieldsToCheck) {
        if (fieldVal && fieldVal.citations) {
          for (const cit of fieldVal.citations) {
            totalCitations++;
            cit.fileHashSha256 = fileHash;
            const vintage = cit.sourceVintage || "UNSPECIFIED";
            sourcesByVintage[vintage] = (sourcesByVintage[vintage] || 0) + 1;
          }
        }
      }

      // Coverage entry
      coverageMatrix.push({
        stateCode: stateCode as StateCode,
        officeFamilyId: officeFacts.officeFamilyId,
        selectionType: officeFacts.selectionType,
        ageStatus: officeFacts.minimumAge.status,
        citizenshipStatus: officeFacts.usCitizenshipYears.status,
        residencyStatus: officeFacts.stateResidencyYears.status,
        normalizationReviewRequired: officeFacts.normalizationReviewRequired,
      });

      // Unresolved items tracking
      if (
        officeFacts.normalizationReviewRequired ||
        officeFacts.minimumAge.status === "CONFLICTING_SOURCES" ||
        officeFacts.minimumAge.status === "UNKNOWN"
      ) {
        unresolvedList.push({
          stateCode: stateCode as StateCode,
          officeFamilyId: officeFacts.officeFamilyId,
          field: "minimumAge",
          reason:
            officeFacts.normalizationNotes ||
            "Review required or unresolved status",
        });
      }
    }
  }

  const compiledCorpus: CompiledQualificationsCorpus = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    totalStates: Object.keys(statesMap).length,
    totalOfficeRecords,
    states: statesMap,
  };

  const provenanceSummary: ProvenanceSummary = {
    generatedAt: compiledCorpus.generatedAt,
    totalCitations,
    sourcesByVintage,
    statesCovered: compiledCorpus.totalStates,
    unresolvedCount: unresolvedList.length,
  };

  // Write compiled output files
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "compiled-state-office-qualifications.json"),
    JSON.stringify(compiledCorpus, null, 2),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "provenance-summary.json"),
    JSON.stringify(provenanceSummary, null, 2),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "coverage-matrix.json"),
    JSON.stringify(coverageMatrix, null, 2),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "unresolved-list.json"),
    JSON.stringify(unresolvedList, null, 2),
  );

  console.log(
    `Successfully compiled state office qualifications corpus (${compiledCorpus.totalStates} states, ${compiledCorpus.totalOfficeRecords} office records).`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("compile.ts")) {
  compileCorpus();
}
