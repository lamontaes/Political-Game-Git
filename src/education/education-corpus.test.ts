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
  loadEducationCorpus,
  queryEducationInstitutions,
  validateEducationCorpus,
} from "./education-corpus";
import type { EducationCorpusSnapshot } from "./types";

describe("Education Corpus & NCES/IPEDS Source Module", () => {
  it("loads and validates the compiled production corpus snapshot cleanly", () => {
    const corpus = loadEducationCorpus();
    expect(corpus.version).toBe("1.0.0");
    expect(corpus.rawArtifacts).toHaveLength(3);
    expect(corpus.counts.publicDistricts).toBe(7);
    expect(corpus.counts.publicSchools).toBe(11);
    expect(corpus.counts.postsecondaryInstitutions).toBe(14);
    expect(corpus.counts.total).toBe(32);
  });

  it("proves raw artifact hashes in manifest match actual raw zip byte hashes if downloaded", () => {
    const corpus = loadEducationCorpus();
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
    const corpus = loadEducationCorpus();

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

  it("proves unsupported historical dates remain null and are not fabricated", () => {
    const corpus = loadEducationCorpus();

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
    const corpus = loadEducationCorpus();
    const corpusNames = new Set([
      ...corpus.districts.map((d) => d.name),
      ...corpus.institutions.map((i) => i.name),
    ]);

    for (const name of createdOrgNames) {
      expect(corpusNames.has(name)).toBe(false);
    }
  });

  it("queries institutions by name, city, state, level, and effective year", () => {
    const corpus = loadEducationCorpus();

    // Query Lafayette High School in Lexington, KY
    const lafayette = queryEducationInstitutions(
      { nameQuery: "Lafayette", city: "Lexington", state: "KY" },
      corpus,
    );
    expect(lafayette).toHaveLength(1);
    expect(lafayette[0]?.name).toBe("Lafayette High School");
    expect(lafayette[0]?.stableId).toBe("nces-sch:210186000367");

    // Query University of Kentucky
    const uk = queryEducationInstitutions(
      { nameQuery: "University of Kentucky", state: "KY" },
      corpus,
    );
    expect(uk).toHaveLength(1);
    expect(uk[0]?.stableId).toBe("ipeds-unit:157085");
    expect(uk[0]?.level).toBe("postsecondary-4yr");
  });

  it("resolves stable IDs directly using findInstitutionByStableId", () => {
    const corpus = loadEducationCorpus();

    const district = findInstitutionByStableId("nces-lea:2101860", corpus);
    expect(district?.name).toBe("Fayette County School District");

    const school = findInstitutionByStableId("nces-sch:210186000367", corpus);
    expect(school?.name).toBe("Lafayette High School");

    const college = findInstitutionByStableId("ipeds-unit:157085", corpus);
    expect(college?.name).toBe("University of Kentucky");

    const missing = findInstitutionByStableId("ipeds-unit:999999", corpus);
    expect(missing).toBeNull();
  });

  it("converts corpus institutions to simulation organization inputs cleanly", () => {
    const corpus = loadEducationCorpus();
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
    expect(orgInput.provenance.kind).toBe("authored");
  });

  it("detects and rejects corrupted or malformed corpus snapshots", () => {
    const badSnapshot: EducationCorpusSnapshot = {
      version: "1.0.0",
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
            fipsCounty: null,
            latitude: null,
            longitude: null,
          },
          vintages: [],
          provenance: {
            sourceName: "NCES CCD",
            datasetName: "Test",
            vintage: "2022-2023",
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
            fipsCounty: null,
            latitude: null,
            longitude: null,
          },
          vintages: [],
          provenance: {
            sourceName: "NCES CCD",
            datasetName: "Test",
            vintage: "2022-2023",
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
