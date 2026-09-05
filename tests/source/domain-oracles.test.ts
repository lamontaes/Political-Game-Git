/**
 * Domain oracles: facts checked against the publishers, not against the
 * compilers that produced them.
 *
 * 13B N2's complaint about the rejected architecture was that its tests proved
 * the implementation agreed with itself. Every assertion here would fail on a
 * corpus that was internally perfect and factually wrong.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ValidationReport } from "../../src/source/core/index";
import { isClean } from "../../src/source/core/index";
import { loadDomains } from "../../scripts/source/registry";
import {
  EXPECTED_COUNTY_RECORD_COUNT,
  OFFICIAL_COUNTY_VECTORS,
  deriveDisplayName,
} from "../../src/source/domains/counties/index";
import { EXPECTED_PLACE_RECORD_COUNT } from "../../src/source/domains/places/index";
import {
  EXPECTED_CONGRESSIONAL_COUNT,
  EXPECTED_STATE_LOWER_COUNT,
  EXPECTED_STATE_UPPER_COUNT,
} from "../../src/source/domains/political-districts/index";
import {
  EXPECTED_CIRCUIT_COUNT,
  EXPECTED_DISTRICT_COURT_COUNT,
} from "../../src/source/domains/federal-courts/index";
import {
  EASTERN_BAND_DESIGNATED_AREA,
  FEMA_FRAUD_ORACLES,
  deriveDesignatedAreaType,
} from "../../src/source/domains/fema-disasters/index";
import {
  readBeaValue,
  classifyBeaGeography,
} from "../../src/source/domains/bea-regional/index";
import {
  readLausValue,
  splitFootnoteCodes,
} from "../../src/source/domains/bls-laus/index";
import {
  readPumsCell,
  parsePumsDictionary,
} from "../../src/source/domains/acs-pums/index";

const DATA = resolve(import.meta.dirname, "../../data/source");

function records<T>(domain: string): T[] {
  return readFileSync(resolve(DATA, domain, "corpus.json"), "utf-8")
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line.replace(/,$/, "")) as T);
}

describe("every compiled corpus validates against its own oracles", () => {
  it("reports no errors in any domain", async () => {
    const reports: ValidationReport[] = [];
    for (const domain of await loadDomains()) {
      if (domain.productionGate) continue;
      const corpus = JSON.parse(
        readFileSync(
          resolve(DATA, domain.domain, "corpus-manifest.json"),
          "utf-8",
        ),
      ) as never;
      reports.push(
        domain.validateCorpus({
          corpus,
          records: records(domain.domain),
        } as never),
      );
    }
    const failing = reports.filter((report) => !isClean(report));
    expect(failing.map((report) => report.domain)).toEqual([]);
  }, 120_000);
});

describe("counties", () => {
  interface County {
    geoid: string;
    stateUsps: string;
    sourceName: string;
    displayName: string;
  }
  const all = records<County>("counties");

  it("holds the universe the Gazetteer publishes", () => {
    expect(all).toHaveLength(EXPECTED_COUNTY_RECORD_COUNT);
  });

  it("agrees with every official identifier vector", () => {
    for (const vector of OFFICIAL_COUNTY_VECTORS) {
      const record = all.find((county) => county.geoid === vector.geoid);
      expect(record, `${vector.geoid} — ${vector.note}`).toBeDefined();
      expect(record?.sourceName).toBe(vector.sourceName);
      expect(record?.stateUsps).toBe(vector.stateUsps);
    }
  });

  it("keeps an independent city distinguishable from the county beside it", () => {
    const city = all.find((county) => county.geoid === "24510");
    const county = all.find((county) => county.geoid === "24005");
    expect(city?.displayName).toBe("Baltimore City");
    expect(county?.displayName).toBe("Baltimore");
    expect(city?.displayName).not.toBe(county?.displayName);
    expect(deriveDisplayName("St. Louis city")).toBe("St. Louis City");
    expect(deriveDisplayName("Acadia Parish")).toBe("Acadia");
  });
});

describe("places", () => {
  interface Place {
    geoid: string;
    sourceName: string;
    displayName: string;
    legalStatisticalAreaDescriptionCode: string;
  }
  const all = records<Place>("places");

  it("holds the universe the Gazetteer publishes", () => {
    expect(all).toHaveLength(EXPECTED_PLACE_RECORD_COUNT);
  });

  it("removes a two-word class description without removing part of a name", () => {
    const sanJuan = all.find((place) => place.geoid === "7276770");
    expect(sanJuan?.sourceName).toBe("San Juan zona urbana");
    expect(sanJuan?.displayName).toBe("San Juan");
  });

  it("leaves a consolidated-government name alone, because the source shares no suffix", () => {
    const balances = all.filter(
      (place) => place.legalStatisticalAreaDescriptionCode === "00",
    );
    expect(balances.length).toBeGreaterThan(0);
    for (const place of balances)
      expect(place.displayName).toBe(place.sourceName);
  });
});

describe("political districts", () => {
  interface District {
    chamber: string;
    geoid: string;
    stateUsps: string;
    districtCode: string;
    sourceName: string | null;
    isUnassignedResidual: boolean;
  }
  const all = records<District>("political-districts");
  const chamber = (name: string): District[] =>
    all.filter((d) => d.chamber === name);

  it("holds each product's published universe", () => {
    expect(chamber("congressional")).toHaveLength(EXPECTED_CONGRESSIONAL_COUNT);
    expect(chamber("state-lower")).toHaveLength(EXPECTED_STATE_LOWER_COUNT);
    expect(chamber("state-upper")).toHaveLength(EXPECTED_STATE_UPPER_COUNT);
  });

  it("keeps Nebraska unicameral", () => {
    expect(
      chamber("state-lower").filter((d) => d.stateUsps === "NE"),
    ).toHaveLength(0);
    expect(
      chamber("state-upper").filter((d) => d.stateUsps === "NE"),
    ).toHaveLength(49);
  });

  it("keeps Vermont's hyphenated house districts, which an alphanumeric grammar drops", () => {
    const vermont = chamber("state-lower").filter((d) => d.stateUsps === "VT");
    expect(vermont.length).toBeGreaterThan(60);
    expect(vermont.some((d) => d.districtCode === "A-1")).toBe(true);
    expect(vermont.some((d) => d.districtCode.includes("-"))).toBe(true);
  });

  it("carries no name for congressional districts, because the product publishes none", () => {
    for (const district of chamber("congressional"))
      expect(district.sourceName).toBeNull();
    for (const district of chamber("state-lower"))
      expect(district.sourceName).not.toBeNull();
  });

  it("keeps the residual rows the Census publishes", () => {
    expect(all.filter((d) => d.isUnassignedResidual).length).toBeGreaterThan(0);
    expect(
      chamber("congressional").filter((d) => d.districtCode === "00"),
    ).toHaveLength(6);
    expect(
      chamber("congressional")
        .filter((d) => d.districtCode === "98")
        .map((d) => d.stateUsps)
        .sort(),
    ).toEqual(["DC", "PR"]);
  });
});

describe("federal courts", () => {
  interface Court {
    courtId: string;
    courtKind: string;
    statutoryTitle: number;
    circuitId: string | null;
    composition: string[] | null;
    parentDistrictCourtId: string | null;
    divisions: { comprisesCounties: string[] }[] | null;
  }
  const all = records<Court>("federal-courts");

  it("holds thirteen circuits and ninety-four districts, each with a bankruptcy court", () => {
    expect(all.filter((c) => c.courtKind === "court-of-appeals")).toHaveLength(
      EXPECTED_CIRCUIT_COUNT,
    );
    expect(all.filter((c) => c.courtKind === "district-court")).toHaveLength(
      EXPECTED_DISTRICT_COURT_COUNT,
    );
    expect(all.filter((c) => c.courtKind === "bankruptcy-court")).toHaveLength(
      EXPECTED_DISTRICT_COURT_COUNT,
    );
  });

  it("takes three territorial courts from Title 48, which Title 28 does not create", () => {
    const territorial = all.filter(
      (c) => c.courtKind === "district-court" && c.statutoryTitle === 48,
    );
    expect(territorial.map((c) => c.courtId).sort()).toEqual([
      "d-gu",
      "d-mp",
      "d-vi",
    ]);
  });

  it("keeps § 41's composition as the statute reads, including what Congress never repealed", () => {
    const fifth = all.find((c) => c.courtId === "ca5");
    expect(fifth?.composition).toContain("District of the Canal Zone");
    const federal = all.find((c) => c.courtId === "ca-fed");
    expect(federal?.composition?.join(" ")).toMatch(
      /Federal judicial districts/i,
    );
  });

  it("keeps a county name that contains a full stop", () => {
    const arkansas = all.find((c) => c.courtId === "d-arkansas-eastern");
    const counties = (arkansas?.divisions ?? []).flatMap(
      (division) => division.comprisesCounties,
    );
    expect(counties).toContain("St. Francis");
  });
});

describe("FEMA — the fraud oracles", () => {
  interface Declaration {
    disasterNumber: number;
    femaDeclarationString: string;
    state: string;
    designatedArea: string;
    derivedDesignatedAreaType: string;
    incidentType: string | null;
    declarationTitle: string;
    iaProgramDeclared: boolean | null;
  }
  const all = records<Declaration>("fema-disasters");

  it("holds the authentic record behind each fabricated declaration", () => {
    for (const oracle of FEMA_FRAUD_ORACLES) {
      const found = all.filter(
        (r) => r.disasterNumber === oracle.disasterNumber,
      );
      expect(found.length, oracle.rejectedClaim).toBeGreaterThan(0);
      for (const record of found) {
        expect(record.femaDeclarationString, oracle.rejectedClaim).toBe(
          oracle.expectedDeclarationString,
        );
        expect(record.state, oracle.rejectedClaim).toBe(oracle.expectedState);
      }
    }
  });

  it("holds no federal border emergency, because none has ever been declared", () => {
    expect(
      all.filter((r) => /BORDER EMERGENCY/i.test(r.declarationTitle)),
    ).toHaveLength(0);
  });

  it("keeps the provider's own incident type, title and legacy programme flag", () => {
    expect(all.find((r) => r.disasterNumber === 4586)?.incidentType).toBe(
      "Severe Ice Storm",
    );
    expect(all.find((r) => r.disasterNumber === 4724)?.declarationTitle).toBe(
      "WILDFIRES AND HIGH WINDS",
    );
    for (const record of all.filter((r) => r.disasterNumber === 4085)) {
      expect(record.iaProgramDeclared).toBe(false);
    }
  });

  it("distinguishes a tribe from a county of a similar name in the same declaration", () => {
    const helene = all.filter((r) => r.disasterNumber === 4827);
    const tribe = helene.find(
      (r) => r.designatedArea === EASTERN_BAND_DESIGNATED_AREA,
    );
    const county = helene.find((r) => r.designatedArea === "Cherokee (County)");
    expect(tribe?.derivedDesignatedAreaType).toBe("tribal");
    expect(county?.derivedDesignatedAreaType).toBe("county-or-parish");
    expect(all.some((r) => r.designatedArea === "Cherokee Nation")).toBe(false);
  });

  it("types a Rhode Island area that carries a metropolitan note after its class", () => {
    expect(
      deriveDesignatedAreaType(
        "Washington (County)(in (P)MSA 5520,6480)",
        false,
      ),
    ).toBe("county-or-parish");
    expect(deriveDesignatedAreaType(EASTERN_BAND_DESIGNATED_AREA, false)).toBe(
      "tribal",
    );
    expect(deriveDesignatedAreaType("Statewide", false)).toBe("statewide");
  });
});

describe("BEA", () => {
  interface Observation {
    recordId: string;
    geoName: string;
    geographyLevel: string;
    unit: string;
    value: { state: string; value?: number };
  }
  const all = records<Observation>("bea-regional");

  it("classifies a metropolitan area as one, which the rejected classifier could not", () => {
    const msa = all.filter((o) => o.geographyLevel === "msa");
    expect(msa.length).toBeGreaterThan(1000);
    const austin = all.find((o) => o.recordId.startsWith("MARPP:12420:1:"));
    expect(austin?.geographyLevel).toBe("msa");
  });

  it("keeps a county name whose spelling needs the publisher's own encoding", () => {
    const donaAna = all.find((o) => o.recordId.startsWith("CAINC1:35013:1:"));
    expect(donaAna?.geoName).toBe("Doña Ana, NM");
    expect(donaAna?.geoName).not.toContain("�");
  });

  it("reads the Bureau's withholding codes as distinct states, never as numbers", () => {
    const evidence = {
      artifactId: "a",
      locator: {
        kind: "table-cell" as const,
        artifactId: "a",
        table: "T",
        lineCode: "1",
        period: "2024",
      },
    };
    expect(readBeaValue("(D)", "2024", evidence).state).toBe("SUPPRESSED");
    expect(readBeaValue("(NA)", "2024", evidence).state).toBe("UNKNOWN");
    expect(readBeaValue("(NM)", "2024", evidence).state).toBe("NOT_APPLICABLE");
    const real = readBeaValue("1234", "2024", evidence);
    expect(real.state).toBe("KNOWN");
    if (real.state === "KNOWN") expect(real.value).toBe(1234);
  });

  it("reads geography from the product, not from the shape of a five-digit code", () => {
    expect(
      classifyBeaGeography("00000", "United States", {
        defaultLevel: "county",
      }),
    ).toBe("nation");
    expect(
      classifyBeaGeography("01000", "Alabama", { defaultLevel: "county" }),
    ).toBe("state");
    expect(
      classifyBeaGeography("12420", "Austin, TX (MSA)", {
        defaultLevel: "msa",
      }),
    ).toBe("msa");
    expect(
      classifyBeaGeography("12420", "Some County", { defaultLevel: "county" }),
    ).toBe("county");
  });
});

describe("BLS LAUS", () => {
  const evidence = {
    artifactId: "a",
    locator: { kind: "delimited-row" as const, artifactId: "a", line: 2 },
  };
  const context = (codes: string[]) => ({
    footnoteCodes: codes,
    footnoteText: (code: string) => `text for ${code}`,
    asOf: "2024-01-31",
    evidence,
    isAnnualAverage: false,
  });

  it("carries the Bureau's preliminary flag onto the value's release status", () => {
    const preliminary = readLausValue("3.1", context(["P"]));
    expect(preliminary.state).toBe("KNOWN");
    if (preliminary.state === "KNOWN")
      expect(preliminary.release).toBe("PRELIMINARY");
    const final = readLausValue("3.1", context([]));
    if (final.state === "KNOWN") expect(final.release).toBe("FINAL");
  });

  it("treats an uncollected value as unknown rather than as withheld", () => {
    // The Bureau is not holding these back; it does not have them.
    expect(readLausValue("", context(["X"])).state).toBe("UNKNOWN");
    expect(readLausValue("", context(["N"])).state).toBe("UNKNOWN");
    expect(readLausValue("", context(["U"])).state).toBe("NOT_APPLICABLE");
    expect(readLausValue("-", context([])).state).toBe("UNKNOWN");
  });

  it("splits a footnote cell into codes", () => {
    expect(splitFootnoteCodes(" P ")).toEqual(["P"]);
    expect(splitFootnoteCodes("")).toEqual([]);
  });

  it("holds observations whose footnotes exercise both paths", () => {
    interface Observation {
      footnoteCodes: string[];
      value: { state: string; release?: string };
    }
    const all = records<Observation>("bls-laus");
    expect(all.some((o) => o.footnoteCodes.includes("P"))).toBe(true);
    expect(all.some((o) => o.value.state !== "KNOWN")).toBe(true);
  });
});

describe("ACS PUMS", () => {
  const dictionary = parsePumsDictionary(
    readFileSync(resolve(DATA, "acs-pums/raw/PUMS_Data_Dictionary_2023.csv")),
  );
  const asOf = "2023-12-31";

  it("types a variable from the dictionary rather than from a list of names", () => {
    const age = readPumsCell(dictionary, "AGEP", "42", "a", 2, asOf);
    expect(age.state).toBe("KNOWN");
    if (age.state === "KNOWN") expect(age.value).toBe(42);
    const relationship = readPumsCell(dictionary, "RT", "P", "a", 2, asOf);
    if (relationship.state === "KNOWN") expect(relationship.value).toBe("P");
  });

  it("keeps a self-employment loss as a value, because the dictionary declares one", () => {
    const loss = readPumsCell(dictionary, "SEMP", "-4000", "a", 2, asOf);
    expect(loss.state).toBe("KNOWN");
    if (loss.state === "KNOWN") expect(loss.value).toBe(-4000);
  });

  it("reads a blank as the not-applicable the dictionary names, never as zero", () => {
    const blank = readPumsCell(dictionary, "SEMP", "", "a", 2, asOf);
    expect(blank.state).toBe("NOT_APPLICABLE");
    expect(blank).not.toHaveProperty("value");
    if (blank.state === "NOT_APPLICABLE") {
      expect(blank.reason).toMatch(/less than 15 years old/i);
    }
  });

  it("reads a dictionary-declared suppression as suppression", () => {
    const suppressed = readPumsCell(dictionary, "JWMNP", "888", "a", 2, asOf);
    expect(suppressed.state).toBe("SUPPRESSED");
    if (suppressed.state === "SUPPRESSED") {
      expect(suppressed.providerFlag).toMatch(/suppressed/i);
    }
  });

  it("keeps the person weight distinct from the housing weight", () => {
    interface Household {
      housingWeight: { state: string; value?: number };
      persons: { personWeight: { state: string; value?: number } }[];
    }
    const all = records<Household>("acs-pums");
    const multi = all.filter((household) => household.persons.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    const differing = all.some((household) =>
      household.persons.some(
        (person) => person.personWeight.value !== household.housingWeight.value,
      ),
    );
    expect(differing).toBe(true);
  });
});

describe("HUD", () => {
  interface Record_ {
    recordKind: string;
    productVintage: string;
    rentByBedrooms?: Record<string, number>;
    areaMedianFamilyIncome?: number;
    area: { countyTownName: string | null };
  }
  const all = records<Record_>("hud-housing");

  it("keeps rents and income limits as separate products", () => {
    const rents = all.filter((r) => r.recordKind === "fair-market-rent");
    const limits = all.filter((r) => r.recordKind === "income-limit");
    expect(rents.length).toBeGreaterThan(4000);
    expect(limits.length).toBe(rents.length);
    for (const record of all) {
      const merged =
        record.rentByBedrooms !== undefined &&
        record.areaMedianFamilyIncome !== undefined;
      expect(merged).toBe(false);
    }
  });

  it("keeps a rent schedule increasing with bedroom count", () => {
    for (const record of all.filter((r) => r.rentByBedrooms).slice(0, 500)) {
      const rents = record.rentByBedrooms as Record<string, number>;
      expect(rents["0"]).toBeLessThanOrEqual(rents["1"] as number);
      expect(rents["3"]).toBeLessThanOrEqual(rents["4"] as number);
      expect(rents["0"]).toBeGreaterThan(0);
    }
  });

  it("leaves a row that describes no town with no town name, rather than an empty one", () => {
    const withoutTown = all.filter((r) => r.area.countyTownName === null);
    expect(withoutTown.length).toBeGreaterThan(0);
    expect(all.some((r) => r.area.countyTownName === "")).toBe(false);
  });
});

describe("FEC", () => {
  interface Row {
    recordKind: string;
    candidateId?: string;
    officeDistrict?: string | null;
    committeeId?: string;
  }
  const all = records<Row>("fec");

  it("holds every row of all three bulk files", () => {
    expect(all.filter((r) => r.recordKind === "candidate")).toHaveLength(9798);
    expect(all.filter((r) => r.recordKind === "committee")).toHaveLength(20938);
    expect(all.filter((r) => r.recordKind === "linkage")).toHaveLength(8619);
  });

  it("keeps an at-large House district as the 00 the Commission publishes", () => {
    const alaska = all.find((r) => r.candidateId === "H0AK00105");
    expect(alaska?.officeDistrict).toBe("00");
  });
});
