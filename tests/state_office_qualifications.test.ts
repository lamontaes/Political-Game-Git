import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  CompiledQualificationsCorpus,
  StateCode,
} from "../src/state_office_qualifications/types.js";
import {
  getQualificationForOffice,
  getQualificationsForState,
  queryQualifications,
} from "../src/state_office_qualifications/index.js";

const COMPILED_PATH = path.join(
  process.cwd(),
  "data",
  "state-office-qualifications",
  "compiled-state-office-qualifications.json",
);

describe("State Office Qualifications Corpus", () => {
  const corpus: CompiledQualificationsCorpus = JSON.parse(
    fs.readFileSync(COMPILED_PATH, "utf8"),
  );

  it("contains representation for all 50 US states", () => {
    expect(corpus.totalStates).toBe(50);
    const stateCodes = Object.keys(corpus.states);
    expect(stateCodes.length).toBe(50);

    const ALL_50_STATES: StateCode[] = [
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

    for (const code of ALL_50_STATES) {
      expect(corpus.states[code]).toBeDefined();
      expect(corpus.states[code].stateCode).toBe(code);
    }
  });

  it("truthfully handles Nebraska unicameral legislature", () => {
    const ne = corpus.states["NE"];
    expect(ne).toBeDefined();

    const unicameral = ne.offices["NEBRASKA_UNICAMERAL"];
    expect(unicameral).toBeDefined();
    expect(unicameral.selectionType).toBe("ELECTED_GENERAL");
    expect(unicameral.minimumAge.status).toBe("KNOWN");
    expect(unicameral.minimumAge.value).toBe(21);

    const lower = ne.offices["STATE_LOWER_CHAMBER"];
    const upper = ne.offices["STATE_UPPER_CHAMBER"];
    expect(lower.selectionType).toBe("OFFICE_DOES_NOT_EXIST");
    expect(upper.selectionType).toBe("OFFICE_DOES_NOT_EXIST");

    // Ensure no other state has active unicameral
    for (const [code, record] of Object.entries(corpus.states)) {
      if (code !== "NE") {
        expect(record.offices["NEBRASKA_UNICAMERAL"].selectionType).toBe(
          "OFFICE_DOES_NOT_EXIST",
        );
      }
    }
  });

  it("accurately represents states without Lt. Governor or with non-general election AG/SoS", () => {
    // Maine & NH have no Lt Governor
    expect(
      corpus.states["ME"].offices["LIEUTENANT_GOVERNOR"].selectionType,
    ).toBe("OFFICE_DOES_NOT_EXIST");
    expect(
      corpus.states["NH"].offices["LIEUTENANT_GOVERNOR"].selectionType,
    ).toBe("OFFICE_DOES_NOT_EXIST");

    // Maine AG & SoS are elected by state legislature
    expect(corpus.states["ME"].offices["ATTORNEY_GENERAL"].selectionType).toBe(
      "ELECTED_LEGISLATURE",
    );
    expect(
      corpus.states["ME"].offices["SECRETARY_OF_STATE"].selectionType,
    ).toBe("ELECTED_LEGISLATURE");

    // New Jersey AG & SoS are appointed by Governor
    expect(corpus.states["NJ"].offices["ATTORNEY_GENERAL"].selectionType).toBe(
      "APPOINTED_GOVERNOR",
    );
    expect(
      corpus.states["NJ"].offices["SECRETARY_OF_STATE"].selectionType,
    ).toBe("APPOINTED_GOVERNOR");

    // Tennessee AG is appointed by Supreme Court
    expect(corpus.states["TN"].offices["ATTORNEY_GENERAL"].selectionType).toBe(
      "APPOINTED_COURT",
    );
  });

  it("never coerces missing facts to zero", () => {
    for (const record of Object.values(corpus.states)) {
      for (const office of Object.values(record.offices)) {
        if (
          office.minimumAge.status === "NOT_APPLICABLE" ||
          office.minimumAge.status === "NO_REQUIREMENT_FOUND"
        ) {
          expect(office.minimumAge.value).toBeNull();
        }
      }
    }
  });

  it("attaches official source citations to all known facts", () => {
    for (const record of Object.values(corpus.states)) {
      for (const office of Object.values(record.offices)) {
        if (
          office.selectionType === "ELECTED_GENERAL" &&
          office.minimumAge.status === "KNOWN"
        ) {
          expect(office.minimumAge.citations.length).toBeGreaterThan(0);
          expect(office.minimumAge.citations[0].citation).toBeTruthy();
          expect(office.minimumAge.citations[0].retrievalDate).toBeTruthy();
        }
      }
    }
  });

  it("supports querying qualifications via query API", () => {
    const nvRecord = getQualificationsForState(corpus, "NV");
    expect(nvRecord).toBeDefined();
    expect(nvRecord?.stateName).toBe("Nevada");

    const nvSenate = getQualificationForOffice(
      corpus,
      "NV",
      "STATE_UPPER_CHAMBER",
    );
    expect(nvSenate).toBeDefined();
    expect(nvSenate?.minimumAge.value).toBe(21);

    const youngOffices = queryQualifications(corpus, { maxMinimumAge: 18 });
    expect(youngOffices.length).toBeGreaterThan(0);

    const caGov = queryQualifications(corpus, {
      stateCode: "CA",
      officeFamilyId: "GOVERNOR",
    });
    expect(caGov.length).toBe(1);
    expect(caGov[0].minimumAge.value).toBe(18);
  });
});
