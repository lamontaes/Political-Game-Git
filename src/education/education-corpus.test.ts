import { describe, expect, it } from "vitest";
import {
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
    expect(corpus.counts.publicDistricts).toBeGreaterThan(0);
    expect(corpus.counts.publicSchools).toBeGreaterThan(0);
    expect(corpus.counts.postsecondaryInstitutions).toBeGreaterThan(0);
    expect(corpus.counts.total).toBe(
      corpus.districts.length + corpus.institutions.length,
    );
  });

  it("verifies stable official ID formatting conventions for all entries", () => {
    const corpus = loadEducationCorpus();

    for (const district of corpus.districts) {
      expect(district.officialId).toMatch(/^\d{7}$/);
      expect(district.stableId).toBe(`nces-lea:${district.officialId}`);
      expect(district.provenance.officialIdName).toBe("LEAID");
      expect(district.provenance.sourceName).toBe("NCES CCD");
    }

    for (const inst of corpus.institutions) {
      if (inst.kind === "public-elementary-secondary") {
        expect(inst.officialId).toMatch(/^\d{12}$/);
        expect(inst.stableId).toBe(`nces-sch:${inst.officialId}`);
        expect(inst.parentDistrictId).toMatch(/^nces-lea:\d{7}$/);
        expect(inst.provenance.officialIdName).toBe("NCESSCH");
        expect(inst.provenance.sourceName).toBe("NCES CCD");
      } else {
        expect(inst.officialId).toMatch(/^\d{6}$/);
        expect(inst.stableId).toBe(`ipeds-unit:${inst.officialId}`);
        expect(inst.provenance.officialIdName).toBe("UNITID");
        expect(inst.provenance.sourceName).toBe("NCES IPEDS");
      }
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
    expect(lafayette[0]?.stableId).toBe("nces-sch:210186000787");

    // Query University of Kentucky
    const uk = queryEducationInstitutions(
      { nameQuery: "University of Kentucky", state: "KY" },
      corpus,
    );
    expect(uk).toHaveLength(1);
    expect(uk[0]?.stableId).toBe("ipeds-unit:157085");
    expect(uk[0]?.level).toBe("postsecondary-4yr");

    // Query high schools in Lexington active in year 2000
    const lexHigh2000 = queryEducationInstitutions(
      { city: "Lexington", level: "high", effectiveYear: 2000 },
      corpus,
    );
    expect(lexHigh2000.map((s) => s.name)).toContain("Lafayette High School");
    expect(lexHigh2000.map((s) => s.name)).toContain(
      "Paul Laurence Dunbar High School",
    );
    // Frederick Douglass High School opened in 2017, so should not be active in 2000
    expect(lexHigh2000.map((s) => s.name)).not.toContain(
      "Frederick Douglass High School",
    );
  });

  it("resolves stable IDs directly using findInstitutionByStableId", () => {
    const corpus = loadEducationCorpus();

    const district = findInstitutionByStableId("nces-lea:2101860", corpus);
    expect(district?.name).toBe("Fayette County School District");

    const school = findInstitutionByStableId("nces-sch:210186000787", corpus);
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
      generatedAt: "2024-01-15",
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
            retrievedAt: "2024-01-15",
          },
        },
      ],
      institutions: [
        {
          officialId: "210186000787",
          stableId: "nces-sch:210186000787",
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
            retrievedAt: "2024-01-15",
          },
        },
      ],
    };

    expect(() => validateEducationCorpus(badSnapshot)).toThrow(
      /unknown parent district/,
    );
  });
});
