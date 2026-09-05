/**
 * OpenFEMA rows into declaration records.
 *
 * Every provider field is carried through unchanged. The one thing this module
 * adds is `derivedDesignatedAreaType`, and it is a separate field with
 * "derived" in its name because OpenFEMA publishes no such column — #66 wrote
 * one into a file it called raw, which is how a derivation becomes indistinguishable
 * from a source fact.
 *
 * The derivation has to survive a real collision. Declaration DR-4827-NC
 * designates both "Cherokee (County)", a North Carolina county, and the
 * "Eastern Band of Cherokee Indians", a federally recognised tribe. A rule that
 * looks for tribal words first mislabels the county; a rule that trusts
 * `tribalRequest` misses the tribe, because that flag is false on this
 * declaration. So the parenthetical class the provider appends is read first,
 * and only an area with no such class is tested for tribal wording.
 */

import type { Evidence, ParseDefect } from "../../core/index";
import type { DesignatedAreaType, FemaDeclarationRecord } from "./types";

export interface FemaNormalizeResult {
  readonly records: readonly FemaDeclarationRecord[];
  readonly defects: readonly ParseDefect[];
}

const TRIBAL_WORDS = [
  "tribe",
  "tribal",
  "nation",
  "indians",
  "pueblo",
  "band",
  "rancheria",
  "reservation",
  "community of",
];

/** Read the provider's area string the way the provider writes it. */
export function deriveDesignatedAreaType(
  designatedArea: string,
  tribalRequest: boolean | null,
): DesignatedAreaType {
  const area = designatedArea.trim();
  const lower = area.toLowerCase();

  // The provider writes the geographic class in parentheses. It wins, so a
  // county named after a tribe is still a county. Rhode Island's designations
  // append a metropolitan-area note after the class — "Washington (County)(in
  // (P)MSA 5520,6480)" — so the class is looked for anywhere in the string
  // rather than only at its end.
  if (
    /\((county|parish|borough|municipality|municipio|census area|city)\)/i.test(
      area,
    )
  ) {
    return "county-or-parish";
  }
  if (lower === "statewide") return "statewide";
  if (tribalRequest === true) return "tribal";
  if (TRIBAL_WORDS.some((word) => lower.includes(word))) return "tribal";
  return "other";
}

function text(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeFemaDeclarations(
  rows: readonly Record<string, unknown>[],
  artifactId: string,
): FemaNormalizeResult {
  const records: FemaDeclarationRecord[] = [];
  const defects: ParseDefect[] = [];

  rows.forEach((row, index) => {
    const providerRecordId = text(row.id);
    const femaDeclarationString = text(row.femaDeclarationString);
    const disasterNumber = integer(row.disasterNumber);
    const state = text(row.state);
    const declarationType = text(row.declarationType);
    const declarationTitle = text(row.declarationTitle);
    const declarationDate = text(row.declarationDate);
    const designatedArea = text(row.designatedArea);

    if (
      providerRecordId === null ||
      femaDeclarationString === null ||
      disasterNumber === null ||
      state === null ||
      declarationType === null ||
      declarationTitle === null ||
      declarationDate === null ||
      designatedArea === null
    ) {
      defects.push({
        kind: "unparsable-record",
        line: index + 1,
        message: `Record ${index + 1} of the OpenFEMA payload is missing a field every declaration carries, so it is dropped rather than completed.`,
      });
      return;
    }

    const tribalRequest = bool(row.tribalRequest);
    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "api-record",
        artifactId,
        recordPath: `DisasterDeclarationsSummaries[id=${providerRecordId}]`,
      },
      providerNativeId: providerRecordId,
    };

    records.push({
      recordId: `fema-declaration:${providerRecordId}`,
      femaDeclarationString,
      disasterNumber,
      state,
      declarationType,
      declarationTitle,
      declarationDate,
      fiscalYearDeclared: integer(row.fyDeclared),
      incidentType: text(row.incidentType),
      incidentBeginDate: text(row.incidentBeginDate),
      incidentEndDate: text(row.incidentEndDate),
      disasterCloseoutDate: text(row.disasterCloseoutDate),
      designatedArea,
      tribalRequest,
      fipsStateCode: text(row.fipsStateCode),
      fipsCountyCode: text(row.fipsCountyCode),
      placeCode: text(row.placeCode),
      region: integer(row.region),
      declarationRequestNumber: text(row.declarationRequestNumber),
      lastIndividualAssistanceFilingDate: text(row.lastIAFilingDate),
      incidentId: text(row.incidentId),
      ihProgramDeclared: bool(row.ihProgramDeclared),
      iaProgramDeclared: bool(row.iaProgramDeclared),
      paProgramDeclared: bool(row.paProgramDeclared),
      hmProgramDeclared: bool(row.hmProgramDeclared),
      providerRecordId,
      providerRecordHash: text(row.hash),
      providerLastRefresh: text(row.lastRefresh),
      derivedDesignatedAreaType: deriveDesignatedAreaType(
        designatedArea,
        tribalRequest,
      ),
      evidence,
    });
  });

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  return { records, defects };
}
