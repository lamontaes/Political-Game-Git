import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { generateQuickCharacterHistory } from "../simulation/character-history";
import { createRunAFixture } from "../presentation/run-a-fixture";
import {
  assertNoAutomaticAttendance,
  convertEducationInstitutionToOrganization,
  findInstitutionByStableId,
  queryEducationInstitutions,
  validateEducationCorpus,
} from "./education-corpus";
import { loadEducationCorpusFromFile } from "./education-node-loader";
import type { EducationCorpusSnapshot } from "./types";

describe("Education Corpus & NCES/IPEDS Source Module", () => {
  it("loads and validates the compiled production corpus snapshot cleanly", () => {
    const corpus = loadEducationCorpusFromFile();
    expect(corpus.version).toBe("1.0.0");
    expect(corpus.corpusScope).toBe("historical-2022-snapshot");
    expect(corpus.rawArtifacts).toHaveLength(3);
    expect(corpus.counts.publicDistricts).toBe(7);
    expect(corpus.counts.publicSchools).toBe(11);
    expect(corpus.counts.postsecondaryInstitutions).toBe(14);
    expect(corpus.counts.total).toBe(32);
  });

  it("proves raw artifact hashes in manifest match actual raw zip byte hashes if downloaded", () => {
    const corpus = loadEducationCorpusFromFile();
    const rawDir = path.join(process.cwd(), "data", "education", "raw");

    for (const artifact of corpus.rawArtifacts) {
      expect(artifact.filename).toBeTruthy();
      expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact.url).toContain("nces.ed.gov");

      const zipPath = path.join(rawDir, artifact.filename);
      if (fs.existsSync(zipPath)) {
        const bytes = fs.readFileSync(zipPath);
        const actualHash = crypto
          .createHash("sha256")
          .update(bytes)
          .digest("hex");
        expect(actualHash).toBe(artifact.sha256);
      }
    }
  });

  it("proves every normalized empirical record has an exact source-row locator and stable identifier", () => {
    const corpus = loadEducationCorpusFromFile();

    for (const district of corpus.districts) {
      expect(district.officialId).toMatch(/^\d{7}$/);
      expect(district.stableId).toBe(`nces-lea:${district.officialId}`);
      expect(district.provenance.officialIdName).toBe("LEAID");
      expect(district.provenance.rowLocator.sourceKeyColumn).toBe("LEAID");
      expect(district.provenance.rowLocator.sourceKeyValue).toBe(
        district.officialId,
      );
      expect(district.provenance.rowLocator.sourceRowIndex).toBeGreaterThan(1);
    }

    for (const inst of corpus.institutions) {
      if (inst.kind === "public-elementary-secondary") {
        expect(inst.officialId).toMatch(/^\d{12}$/);
        expect(inst.stableId).toBe(`nces-sch:${inst.officialId}`);
        expect(inst.provenance.officialIdName).toBe("NCESSCH");
        expect(inst.provenance.rowLocator.sourceKeyColumn).toBe("NCESSCH");
        expect(inst.provenance.rowLocator.sourceKeyValue).toBe(inst.officialId);
        expect(inst.provenance.rowLocator.sourceRowIndex).toBeGreaterThan(1);
      } else {
        expect(inst.officialId).toMatch(/^\d{6}$/);
        expect(inst.stableId).toBe(`ipeds-unit:${inst.officialId}`);
        expect(inst.provenance.officialIdName).toBe("UNITID");
        expect(inst.provenance.rowLocator.sourceKeyColumn).toBe("UNITID");
        expect(inst.provenance.rowLocator.sourceKeyValue).toBe(inst.officialId);
        expect(inst.provenance.rowLocator.sourceRowIndex).toBeGreaterThan(1);
      }
    }
  });

  it("proves correct state vs county geography semantics with Fayette County KY and Jefferson County KY regression tests", () => {
    const corpus = loadEducationCorpusFromFile();

    // Fayette County, KY regression case (University of Kentucky)
    const uk = findInstitutionByStableId("ipeds-unit:157085", corpus)!;
    expect(uk.location.state).toBe("KY");
    expect(uk.location.fipsState).toBe("21");
    expect(uk.location.countyGeoid).toBe("21067"); // Must be Fayette County GEOID 21067, NOT 21!
    expect(uk.location.countyName).toBe("Fayette County");

    // Second county regression case (Jefferson County, KY - University of Louisville)
    const uofl = findInstitutionByStableId("ipeds-unit:157289", corpus)!;
    expect(uofl.location.state).toBe("KY");
    expect(uofl.location.fipsState).toBe("21");
    expect(uofl.location.countyGeoid).toBe("21111"); // Must be Jefferson County GEOID 21111, NOT 21!
    expect(uofl.location.countyName).toBe("Jefferson County");

    // Third county regression case (Middlesex County, MA - Harvard University)
    const harvard = findInstitutionByStableId("ipeds-unit:166027", corpus)!;
    expect(harvard.location.state).toBe("MA");
    expect(harvard.location.fipsState).toBe("25");
    expect(harvard.location.countyGeoid).toBe("25017"); // Must be Middlesex County GEOID 25017, NOT 25!
    expect(harvard.location.countyName).toBe("Middlesex County");

    // Verify CCD directory records do not substitute state FIPS for county GEOID
    const lafayetteHigh = findInstitutionByStableId(
      "nces-sch:210186000367",
      corpus,
    )!;
    expect(lafayetteHigh.location.fipsState).toBe("21");
    expect(lafayetteHigh.location.countyGeoid).toBeNull(); // CCD directory file does not supply county code
  });

  it("proves unknown historical validity remains unknown: querying unsupported historical years does not return matches", () => {
    const corpus = loadEducationCorpusFromFile();

    // Querying vintageYear 2022 returns records from the 2022 snapshot
    const active2022 = queryEducationInstitutions(
      { effectiveYear: 2022 },
      corpus,
    );
    expect(active2022.length).toBeGreaterThan(0);

    // Querying an unsupported historical year (e.g. 1950) returns NO matches because opening dates are unknown
    const active1950 = queryEducationInstitutions(
      { effectiveYear: 1950 },
      corpus,
    );
    expect(active1950).toHaveLength(0);

    const active1850 = queryEducationInstitutions(
      { effectiveYear: 1850 },
      corpus,
    );
    expect(active1850).toHaveLength(0);
  });

  it("proves unsupported historical opening dates remain null and are not fabricated", () => {
    const corpus = loadEducationCorpusFromFile();

    for (const district of corpus.districts) {
      for (const vintage of district.vintages) {
        expect(vintage.effectiveDateStart).toBeNull();
      }
    }

    for (const inst of corpus.institutions) {
      for (const vintage of inst.vintages) {
        expect(vintage.effectiveDateStart).toBeNull();
      }
    }
  });

  it("proves school existence is separate from attendance: no character receives attendance automatically", () => {
    assertNoAutomaticAttendance();
    const fixture = createRunAFixture("test-seed-school-separation");
    const world = fixture.world;
    const person = Object.values(world.people)[0]!;

    const historyPlan = generateQuickCharacterHistory(world, {
      stableKey: "quick-history-test",
      personId: person.id,
      jurisdictionId: world.jurisdictionOrder[0]!,
    });

    // Check every organization created in quick character history
    const createdOrgNames = historyPlan.transitions
      .filter((t) => t.kind === "organization")
      .map(
        (t) =>
          (t as { input: { initialProfile: { name: string } } }).input
            .initialProfile.name,
      );

    // Verify that NO empirical NCES/IPEDS institution ID or name is automatically assigned to the generated character
    const corpus = loadEducationCorpusFromFile();
    const corpusNames = new Set([
      ...corpus.districts.map((d) => d.name),
      ...corpus.institutions.map((i) => i.name),
    ]);

    for (const name of createdOrgNames) {
      expect(corpusNames.has(name)).toBe(false);
    }
  });

  it("proves src/education/education-corpus.ts is pure and browser-safe without Node imports", () => {
    const filePath = path.join(
      process.cwd(),
      "src",
      "education",
      "education-corpus.ts",
    );
    const content = fs.readFileSync(filePath, "utf8");

    const forbiddenNodeTerms = [
      "import * as fs",
      "import fs",
      "import path",
      "import process",
      'require("fs")',
      "require('fs')",
      "process.cwd()",
    ];
    for (const term of forbiddenNodeTerms) {
      expect(content).not.toContain(term);
    }
  });

  it("converts corpus institutions to simulation organization inputs cleanly with unresolved jurisdiction bridge", () => {
    const corpus = loadEducationCorpusFromFile();
    const uk = findInstitutionByStableId("ipeds-unit:157085", corpus)!;
    const orgInput = convertEducationInstitutionToOrganization(
      uk,
      "1865-02-22",
    );

    expect(orgInput.stableKey).toBe("org:ipeds-unit:157085");
    expect(orgInput.formedAt).toBe("1865-02-22");
    expect(orgInput.initialProfile.name).toBe("University of Kentucky");
    expect(orgInput.initialProfile.classification).toBe(
      "service:higher-education",
    );
    expect(orgInput.initialProfile.locationJurisdictionId).toBeNull(); // Kept explicitly unresolved
    expect(orgInput.provenance.kind).toBe("authored");
  });

  it("detects and rejects corrupted or malformed corpus snapshots", () => {
    const badSnapshot: EducationCorpusSnapshot = {
      version: "1.0.0",
      corpusScope: "historical-2022-snapshot",
      generatedAt: "2026-08-30",
      counts: {
        publicDistricts: 1,
        publicSchools: 1,
        postsecondaryInstitutions: 0,
        total: 2,
      },
      stableIdStrategy: {
        publicSchoolPrefix: "nces-sch:",
        districtPrefix: "nces-lea:",
        postsecondaryPrefix: "ipeds-unit:",
      },
      rawArtifacts: [],
      districts: [
        {
          officialId: "2101860",
          stableId: "nces-lea:2101860",
          name: "Test District",
          kind: "public-district",
          level: "district",
          location: {
            address: null,
            city: "Lexington",
            state: "KY",
            zip: null,
            fipsState: "21",
            countyGeoid: "21067",
            countyName: "Fayette County",
            latitude: null,
            longitude: null,
          },
          vintages: [],
          provenance: {
            sourceName: "NCES CCD",
            datasetName: "Test",
            vintage: "2022-2023",
            releaseStatus: "preliminary-directory",
            officialIdName: "LEAID",
            sourceUrl: "http://test",
            retrievedAt: "2026-08-30",
            rowLocator: {
              sourceZipFilename: "test.zip",
              sourceZipSha256: "0".repeat(64),
              csvFilename: "test.csv",
              sourceRowIndex: 2,
              sourceKeyColumn: "LEAID",
              sourceKeyValue: "2101860",
            },
          },
        },
      ],
      institutions: [
        {
          officialId: "210186000367",
          stableId: "nces-sch:210186000367",
          name: "Test School",
          kind: "public-elementary-secondary",
          level: "high",
          parentDistrictId: "nces-lea:UNKNOWN", // Unresolved district
          location: {
            address: null,
            city: "Lexington",
            state: "KY",
            zip: null,
            fipsState: "21",
            countyGeoid: "21067",
            countyName: "Fayette County",
            latitude: null,
            longitude: null,
          },
          vintages: [],
          provenance: {
            sourceName: "NCES CCD",
            datasetName: "Test",
            vintage: "2022-2023",
            releaseStatus: "preliminary-directory",
            officialIdName: "NCESSCH",
            sourceUrl: "http://test",
            retrievedAt: "2026-08-30",
            rowLocator: {
              sourceZipFilename: "test.zip",
              sourceZipSha256: "0".repeat(64),
              csvFilename: "test.csv",
              sourceRowIndex: 2,
              sourceKeyColumn: "NCESSCH",
              sourceKeyValue: "210186000367",
            },
          },
        },
      ],
    };

    expect(() => validateEducationCorpus(badSnapshot)).toThrow(
      /unknown parent district/,
    );
  });
});
