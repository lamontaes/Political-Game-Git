/**
 * Statutory text into court identity records.
 *
 * Three readings, each from the section that actually says the thing:
 *
 *  - 28 U.S.C. § 41's table gives the thirteen circuits and their composition.
 *  - 28 U.S.C. §§ 81–131 give each state's judicial districts, the counties
 *    each division comprises, and the places court is held.
 *  - 48 U.S.C. §§ 1424, 1611 and 1821 establish the three territorial district
 *    courts, which Title 28 does not create.
 *
 * Bankruptcy courts are not enumerated anywhere; 28 U.S.C. § 151 designates one
 * per judicial district as a unit of that district court. That is a derivation
 * from an operative statutory rule applied to a list the statutes do enumerate,
 * and each record cites § 151 as its basis.
 */

import { SourceParseError } from "../../core/index";
import type { Evidence } from "../../core/index";
import { readSection, readTwoColumnTable, splitStatutoryList } from "./parse";
import type { FederalCourtRecord, JudicialDivision } from "./types";

/** § 41 names circuits in words; these are the identifiers this corpus uses. */
const CIRCUIT_ID_BY_DESIGNATION: Readonly<Record<string, string>> = {
  "District of Columbia": "ca-dc",
  First: "ca1",
  Second: "ca2",
  Third: "ca3",
  Fourth: "ca4",
  Fifth: "ca5",
  Sixth: "ca6",
  Seventh: "ca7",
  Eighth: "ca8",
  Ninth: "ca9",
  Tenth: "ca10",
  Eleventh: "ca11",
  Federal: "ca-fed",
};

/** The state and territory sections of 28 U.S.C. chapter 5, in published order. */
export const DISTRICT_SECTION_NUMBERS: readonly string[] = [
  "81",
  "81A",
  ...Array.from({ length: 50 }, (_, index) => String(82 + index)),
];

/** The territorial district courts, each with the section that establishes it. */
export const TERRITORIAL_COURTS: readonly {
  readonly courtId: string;
  readonly section: string;
  readonly courtName: string;
  readonly jurisdictionName: string;
  readonly circuitId: string;
}[] = [
  {
    courtId: "d-gu",
    section: "1424",
    courtName: "District Court of Guam",
    jurisdictionName: "Guam",
    circuitId: "ca9",
  },
  {
    courtId: "d-vi",
    section: "1611",
    courtName: "District Court of the Virgin Islands",
    jurisdictionName: "Virgin Islands",
    circuitId: "ca3",
  },
  {
    courtId: "d-mp",
    section: "1821",
    courtName: "District Court for the Northern Mariana Islands",
    jurisdictionName: "Northern Mariana Islands",
    circuitId: "ca9",
  },
];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function legalEvidence(artifactId: string, citation: string, section: string): Evidence {
  return {
    artifactId,
    locator: { kind: "legal-section", artifactId, citation, pageOrSection: section },
  };
}

/** Read the thirteen circuits and their composition out of 28 U.S.C. § 41. */
export function normalizeCircuits(
  title28: string,
  artifactId: string,
): readonly FederalCourtRecord[] {
  const section = readSection(title28, "/us/usc/t28/s41");
  const rows = readTwoColumnTable(section);
  const records: FederalCourtRecord[] = [];

  for (const [designation, composition] of rows) {
    const courtId = CIRCUIT_ID_BY_DESIGNATION[designation];
    if (!courtId) continue;
    const courtName =
      courtId === "ca-dc"
        ? "United States Court of Appeals for the District of Columbia Circuit"
        : courtId === "ca-fed"
          ? "United States Court of Appeals for the Federal Circuit"
          : `United States Court of Appeals for the ${designation} Circuit`;

    records.push({
      courtId,
      courtKind: "court-of-appeals",
      courtName,
      establishedByCitation: "28 U.S.C. § 41",
      statutoryTitle: 28,
      circuitDesignation: designation,
      composition: splitStatutoryList(composition),
      circuitId: null,
      jurisdictionName: null,
      divisions: null,
      courtHeldAt: null,
      parentDistrictCourtId: null,
      evidence: legalEvidence(artifactId, "28 U.S.C. § 41", "§ 41"),
    });
  }

  if (records.length !== 13) {
    throw new SourceParseError(
      `28 U.S.C. § 41 constitutes thirteen judicial circuits; the table yielded ${records.length}.`,
    );
  }
  return records;
}

/**
 * A division sentence, in each of the forms the statute actually uses.
 *
 * Georgia capitalises "Counties", Texas has a division comprising a single
 * "county of", and one California division simply "comprises Orange County".
 * The membership list runs to the end of the sentence rather than to the first
 * full stop, because county names contain them: St. Francis, St. Joseph and
 * St. Mary's would each be truncated by a first-period rule.
 */
const DIVISION_SENTENCE =
  /^\((\d+)\)\s+The\s+(.+?)\s+[Dd]ivision comprises\s+(?:the\s+[Cc]ount(?:ies|y)\s+of\s+)?([\s\S]+)$/;
const COURT_SENTENCE = /\bCourt(?: for the .+?)? shall be held at\b/;
const COURT_HELD_AT = /Court(?: for the (.+?))? shall be held at\s+([\s\S]*?)\.\s*$/;

/**
 * Read one state's judicial districts.
 *
 * A section that carries `centered` district headings is a multi-district
 * state, and the divisions that follow a heading belong to it. A section with
 * no such heading is a state that constitutes a single judicial district, which
 * may still have divisions of its own — Maryland and Minnesota do.
 */
export function normalizeStateDistricts(
  title28: string,
  sectionNumber: string,
  artifactId: string,
): readonly FederalCourtRecord[] {
  const section = readSection(title28, `/us/usc/t28/s${sectionNumber}`);
  const jurisdictionName = section.heading;
  const citation = `28 U.S.C. § ${sectionNumber}`;
  const evidence = legalEvidence(artifactId, citation, `§ ${sectionNumber}`);

  const headings = section.paragraphs.filter((p) => p.className === "centered");
  const districtNames =
    headings.length > 0 ? headings.map((p) => p.text) : [`District of ${jurisdictionName}`];

  const records: FederalCourtRecord[] = [];
  let index = -1;
  let divisions: JudicialDivision[] = [];
  let heldAt: string[] = [];

  const flush = (): void => {
    if (index < 0) return;
    const districtName = districtNames[index] as string;
    const courtId =
      headings.length > 0
        ? `d-${slug(jurisdictionName)}-${slug(districtName.replace(/\s*District$/, ""))}`
        : `d-${slug(jurisdictionName)}`;
    records.push({
      courtId,
      courtKind: "district-court",
      courtName:
        headings.length > 0
          ? `United States District Court for the ${districtName} of ${jurisdictionName}`
          : `United States District Court for the District of ${jurisdictionName}`,
      establishedByCitation: citation,
      statutoryTitle: 28,
      circuitDesignation: null,
      composition: null,
      circuitId: null,
      jurisdictionName,
      divisions,
      courtHeldAt: heldAt,
      parentDistrictCourtId: null,
      evidence,
    });
    divisions = [];
    heldAt = [];
  };

  if (headings.length === 0) index = 0;

  for (const paragraph of section.paragraphs) {
    if (paragraph.className === "centered") {
      flush();
      index += 1;
      continue;
    }

    const division = DIVISION_SENTENCE.exec(paragraph.text);
    if (division) {
      const membership = (division[3] ?? "").split(COURT_SENTENCE)[0] ?? "";
      const counties = splitStatutoryList(membership);
      const inlineHeld = COURT_HELD_AT.exec(paragraph.text);
      divisions.push({
        divisionName: `${division[2] ?? ""} Division`,
        comprisesCounties: counties,
        courtHeldAt: inlineHeld ? splitStatutoryList(inlineHeld[2] ?? "") : [],
        evidence,
      });
      continue;
    }

    const held = COURT_HELD_AT.exec(paragraph.text);
    if (held) {
      const forWhat = held[1] ?? "";
      const places = splitStatutoryList(held[2] ?? "");
      const division = divisions.find((entry) => entry.divisionName === forWhat);
      if (division && division.courtHeldAt.length === 0) {
        divisions[divisions.indexOf(division)] = { ...division, courtHeldAt: places };
      } else {
        heldAt.push(...places);
      }
    }
  }

  flush();
  return records;
}

/** Read the three territorial district courts out of Title 48. */
export function normalizeTerritorialDistricts(
  title48: string,
  artifactId: string,
): readonly FederalCourtRecord[] {
  return TERRITORIAL_COURTS.map((court) => {
    const citation = `48 U.S.C. § ${court.section}`;
    readSection(title48, `/us/usc/t48/s${court.section}`);
    return {
      courtId: court.courtId,
      courtKind: "district-court" as const,
      courtName: court.courtName,
      establishedByCitation: citation,
      statutoryTitle: 48 as const,
      circuitDesignation: null,
      composition: null,
      circuitId: court.circuitId,
      jurisdictionName: court.jurisdictionName,
      divisions: [],
      courtHeldAt: [],
      parentDistrictCourtId: null,
      evidence: legalEvidence(artifactId, citation, `§ ${court.section}`),
    };
  });
}

/**
 * Designate one bankruptcy court per judicial district, per 28 U.S.C. § 151.
 *
 * § 151 states the rule rather than listing the courts, so each record cites
 * § 151 and names the district court it is a unit of. Nothing is invented: the
 * list of districts comes from the districts the statutes enumerate.
 */
export function designateBankruptcyCourts(
  districts: readonly FederalCourtRecord[],
  artifactId: string,
): readonly FederalCourtRecord[] {
  const citation = "28 U.S.C. § 151";
  return districts.map((district) => ({
    courtId: `bk-${district.courtId}`,
    courtKind: "bankruptcy-court" as const,
    courtName: district.courtName.replace(
      "United States District Court for the",
      "United States Bankruptcy Court for the",
    ),
    establishedByCitation: citation,
    statutoryTitle: 28 as const,
    circuitDesignation: null,
    composition: null,
    circuitId: district.circuitId,
    jurisdictionName: district.jurisdictionName,
    divisions: null,
    courtHeldAt: null,
    parentDistrictCourtId: district.courtId,
    evidence: legalEvidence(artifactId, citation, "§ 151"),
  }));
}

/**
 * Attach each district to its circuit, using § 41's own composition table.
 *
 * The mapping is the statute's, not this substrate's: a district sits in the
 * circuit whose § 41 composition names its state or territory.
 */
export function assignCircuits(
  districts: readonly FederalCourtRecord[],
  circuits: readonly FederalCourtRecord[],
): readonly FederalCourtRecord[] {
  const circuitByJurisdiction = new Map<string, string>();
  for (const circuit of circuits) {
    if (circuit.courtId === "ca-fed") continue;
    for (const member of circuit.composition ?? []) {
      circuitByJurisdiction.set(member, circuit.courtId);
    }
  }
  return districts.map((district) =>
    district.circuitId
      ? district
      : {
          ...district,
          circuitId: circuitByJurisdiction.get(district.jurisdictionName ?? "") ?? null,
        },
  );
}
