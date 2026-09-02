import * as fs from "node:fs";
import * as path from "node:path";
import type {
  CompiledQualificationsCorpus,
  OfficeQualificationFacts,
  StateOfficeQualificationRecord,
} from "../../src/state_office_qualifications/types.js";

const ROOT_DIR = process.cwd();
const COMPILED_FILE = path.join(
  ROOT_DIR,
  "data",
  "state-office-qualifications",
  "compiled-state-office-qualifications.json",
);

export function validateCorpus() {
  console.log("Validating state office qualifications corpus...");

  if (!fs.existsSync(COMPILED_FILE)) {
    throw new Error(
      `Compiled file not found at ${COMPILED_FILE}. Run compiler first.`,
    );
  }

  const raw = fs.readFileSync(COMPILED_FILE, "utf8");
  const corpus: CompiledQualificationsCorpus = JSON.parse(raw);

  // Assertion 1: Total 50 states
  const stateCodes = Object.keys(corpus.states);
  if (stateCodes.length !== 50) {
    throw new Error(`Expected 50 states in corpus, found ${stateCodes.length}`);
  }

  // Assertion 2: Check all 50 US state codes
  const ALL_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  for (const code of ALL_STATES) {
    if (!corpus.states[code]) {
      throw new Error(`State ${code} missing from compiled corpus.`);
    }
  }

  // Assertion 3: Nebraska unicameral handled truthfully
  const nebraskaRecord = corpus.states["NE"];
  if (!nebraskaRecord) throw new Error("Nebraska record missing.");

  const neUnicameral = nebraskaRecord.offices["NEBRASKA_UNICAMERAL"];
  if (!neUnicameral || neUnicameral.selectionType !== "ELECTED_GENERAL") {
    throw new Error(
      "Nebraska unicameral legislator must exist and be ELECTED_GENERAL.",
    );
  }

  const neLower = nebraskaRecord.offices["STATE_LOWER_CHAMBER"];
  const neUpper = nebraskaRecord.offices["STATE_UPPER_CHAMBER"];
  if (
    neLower.selectionType !== "OFFICE_DOES_NOT_EXIST" ||
    neUpper.selectionType !== "OFFICE_DOES_NOT_EXIST"
  ) {
    throw new Error(
      "Nebraska must NOT have active separate lower or upper chambers.",
    );
  }

  // Assertion 4: No other state has active NEBRASKA_UNICAMERAL
  for (const [code, record] of Object.entries(corpus.states) as [
    string,
    StateOfficeQualificationRecord,
  ][]) {
    if (code !== "NE") {
      const uni = record.offices["NEBRASKA_UNICAMERAL"];
      if (uni && uni.selectionType !== "OFFICE_DOES_NOT_EXIST") {
        throw new Error(
          `State ${code} cannot have active NEBRASKA_UNICAMERAL office.`,
        );
      }
    }
  }

  // Assertion 5: Check zero-coercion rule (missing != zero) & citations presence
  for (const [code, record] of Object.entries(corpus.states) as [
    string,
    StateOfficeQualificationRecord,
  ][]) {
    for (const office of Object.values(
      record.offices,
    ) as OfficeQualificationFacts[]) {
      if (office.selectionType === "ELECTED_GENERAL") {
        if (
          office.minimumAge.status === "KNOWN" &&
          office.minimumAge.value === 0
        ) {
          throw new Error(
            `State ${code} ${office.officeFamilyId}: Age cannot be zero for known rule.`,
          );
        }
        if (
          office.minimumAge.status === "NOT_APPLICABLE" ||
          office.minimumAge.status === "NO_REQUIREMENT_FOUND"
        ) {
          if (office.minimumAge.value !== null) {
            throw new Error(
              `State ${code} ${office.officeFamilyId}: Value must be null when status is missing/not-applicable.`,
            );
          }
        }
        // Citations check for known facts
        if (office.minimumAge.status === "KNOWN") {
          if (
            !office.minimumAge.citations ||
            office.minimumAge.citations.length === 0
          ) {
            throw new Error(
              `State ${code} ${office.officeFamilyId}: Missing citations for minimumAge.`,
            );
          }
        }
      }
    }
  }

  console.log("Validation passed cleanly! Corpus invariants verified.");
}

if (process.argv[1] && process.argv[1].endsWith("validate.ts")) {
  validateCorpus();
}
