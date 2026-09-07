import { known, normalizeRetrievedText, unknown } from "../../core/index";
import type { Evidence, OpenedArtifact, Sourced } from "../../core/index";
import {
  CIVIL_SERVICE_LABOR_AS_OF,
  FEDERAL_SECTION_ARTIFACTS,
} from "./acquisition";
import type {
  AppealBody,
  AppointmentProtection,
  BargainingCoverage,
  BargainingScope,
  CivilServiceLaborRecord,
  ClassificationDistinction,
  ImpasseRule,
  ManagementRights,
  RemovalProtection,
  StrikeRestriction,
} from "./types";

interface Declaration<T> {
  readonly artifactId: string;
  readonly citation: string;
  readonly excerpt: string;
  readonly value: T;
}

type Opened = Readonly<Record<string, OpenedArtifact>>;

function evidence(declaration: Declaration<unknown>): Evidence {
  return {
    artifactId: declaration.artifactId,
    locator: {
      kind: "legal-section",
      artifactId: declaration.artifactId,
      citation: declaration.citation,
      pageOrSection: declaration.citation,
    },
  };
}

function compileFact<T>(
  opened: Opened,
  declaration: Declaration<T>,
): Sourced<T> {
  const artifact = opened[declaration.artifactId];
  if (!artifact)
    throw new Error(
      `Declaration cites unopened artifact ${declaration.artifactId}.`,
    );
  const text = normalizeRetrievedText(artifact.bytes);
  if (!text.includes(declaration.excerpt)) {
    throw new Error(
      `${declaration.citation} no longer contains its declared excerpt in ${declaration.artifactId}.`,
    );
  }
  return known(
    declaration.value,
    [evidence(declaration)],
    "FINAL",
    CIVIL_SERVICE_LABOR_AS_OF,
  );
}

function compileCombinedFact<T>(
  opened: Opened,
  value: T,
  declarations: readonly Omit<Declaration<T>, "value">[],
): Sourced<T> {
  const compiledEvidence = declarations.map((declaration) => {
    const artifact = opened[declaration.artifactId];
    if (!artifact) {
      throw new Error(
        `Declaration cites unopened artifact ${declaration.artifactId}.`,
      );
    }
    if (!normalizeRetrievedText(artifact.bytes).includes(declaration.excerpt)) {
      throw new Error(
        `${declaration.citation} no longer contains its declared excerpt in ${declaration.artifactId}.`,
      );
    }
    return evidence({ ...declaration, value });
  });
  return known(value, compiledEvidence, "FINAL", CIVIL_SERVICE_LABOR_AS_OF);
}

function unknownField<T>(reason: string): Sourced<T> {
  return unknown(reason, []);
}

function replaceRecord(
  base: CivilServiceLaborRecord,
  civil: Partial<CivilServiceLaborRecord["civilService"]>,
  labor: Partial<CivilServiceLaborRecord["laborBargaining"]>,
): CivilServiceLaborRecord {
  return {
    ...base,
    civilService: { ...base.civilService, ...civil },
    laborBargaining: { ...base.laborBargaining, ...labor },
  };
}

export function applyVerifiedFacts(
  records: readonly CivilServiceLaborRecord[],
  opened: Opened,
): readonly CivilServiceLaborRecord[] {
  return records.map((base) => {
    if (base.jurisdictionKey === "US-FEDERAL") {
      return replaceRecord(
        base,
        {
          classificationDistinction:
            compileCombinedFact<ClassificationDistinction>(
              opened,
              {
                coveredService: "competitive service",
                outsideCoveredService: [
                  "excepted service",
                  "Senior Executive Service",
                ],
              },
              [
                {
                  artifactId: FEDERAL_SECTION_ARTIFACTS.classification,
                  citation: "5 U.S.C. § 2102",
                  excerpt: 'The "competitive service" consists of-',
                },
                {
                  artifactId: FEDERAL_SECTION_ARTIFACTS.exceptedService,
                  citation: "5 U.S.C. § 2103",
                  excerpt:
                    'the "excepted service" consists of those civil service positions which are not in the competitive service or the Senior Executive Service.',
                },
              ],
            ),
          appointmentProtection: compileFact<AppointmentProtection>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.appointment,
            citation: "5 U.S.C. § 3304",
            excerpt:
              "open, competitive examinations for testing applicants for appointment in the competitive service",
            value: {
              rule: "Competitive-service appointments use open competitive examinations, subject to statutory exceptions.",
              probationaryRule: null,
            },
          }),
          removalProtection: compileFact<RemovalProtection>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.removalAndAppeal,
            citation: "5 U.S.C. § 7513",
            excerpt:
              "only for such cause as will promote the efficiency of the service.",
            value: {
              standard:
                "Covered adverse actions must promote the efficiency of the service.",
              requiredProcedure: [
                "advance written notice",
                "opportunity to answer",
                "representation",
                "written decision with reasons",
              ],
            },
          }),
          appealBody: compileFact<AppealBody>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.removalAndAppeal,
            citation: "5 U.S.C. § 7513(d)",
            excerpt:
              "appeal to the Merit Systems Protection Board under section 7701 of this title",
            value: {
              bodies: ["Merit Systems Protection Board"],
              reviewScope:
                "Covered adverse actions taken under 5 U.S.C. § 7513.",
            },
          }),
        },
        {
          bargainingCoverage: compileFact<BargainingCoverage>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.bargainingCoverage,
            citation: "5 U.S.C. § 7102",
            excerpt:
              "to engage in collective bargaining with respect to conditions of employment through representatives chosen by employees under this chapter.",
            value: {
              regime: "broad-duty",
              appliesTo: "Federal employees covered by chapter 71.",
              exclusions: ["employees excluded elsewhere in chapter 71"],
            },
          }),
          bargainingScope: compileFact<BargainingScope>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.bargainingCoverage,
            citation: "5 U.S.C. § 7102",
            excerpt:
              "collective bargaining with respect to conditions of employment",
            value: {
              mandatorySubjects: ["conditions of employment"],
              excludedSubjects: [
                "subjects reserved by 5 U.S.C. § 7106 or otherwise excluded by chapter 71",
              ],
            },
          }),
          managementRights: compileFact<ManagementRights>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.managementRights,
            citation: "5 U.S.C. § 7106",
            excerpt:
              "determine the mission, budget, organization, number of employees, and internal security practices of the agency",
            value: {
              reservedSubjects: [
                "mission",
                "budget",
                "organization",
                "number of employees",
                "internal security practices",
                "hiring and assignment",
                "discipline",
              ],
              limitation:
                "Procedures and appropriate arrangements remain negotiable as provided by § 7106(b).",
            },
          }),
          impasseRule: compileFact<ImpasseRule>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.impasse,
            citation: "5 U.S.C. § 7119",
            excerpt:
              "either party may request the Federal Service Impasses Panel to consider the matter",
            value: {
              mechanisms: [
                "mediation",
                "Federal Service Impasses Panel",
                "Panel-approved binding arbitration",
              ],
              bindingFor:
                "A procedure for binding arbitration requires Panel approval.",
            },
          }),
          strikeRestriction: compileFact<StrikeRestriction>(opened, {
            artifactId: FEDERAL_SECTION_ARTIFACTS.strikes,
            citation: "5 U.S.C. § 7311",
            excerpt:
              "participates in a strike, or asserts the right to strike, against the Government of the United States",
            value: {
              rule: "prohibited",
              appliesTo: "Individuals holding federal government positions.",
              conditions: [],
            },
          }),
        },
      );
    }

    if (base.jurisdictionKey === "US-AK") {
      return replaceRecord(
        base,
        {
          classificationDistinction: compileFact<ClassificationDistinction>(
            opened,
            {
              artifactId: "ak-civil-service-statutes",
              citation: "Alaska Stat. §§ 39.25.110-.120",
              excerpt:
                "positions in the state service constitute the exempt service and are exempt from the provisions of this chapter",
              value: {
                coveredService:
                  "classified service under Alaska Statutes chapter 39.25",
                outsideCoveredService: [
                  "exempt service",
                  "partially exempt service",
                ],
              },
            },
          ),
          appointmentProtection: compileFact<AppointmentProtection>(opened, {
            artifactId: "ak-civil-service-statutes",
            citation: "Alaska Stat. § 39.25.150",
            excerpt:
              "open competitive assessment devices, when appropriate, that will fairly evaluate the capacity and fitness of the person assessed",
            value: {
              rule: "Classified selection rules include open competitive assessment when appropriate.",
              probationaryRule:
                "A probationary period may not exceed one year.",
            },
          }),
          removalProtection: compileFact<RemovalProtection>(opened, {
            artifactId: "ak-civil-service-statutes",
            citation: "Alaska Stat. § 39.25.170",
            excerpt:
              "shall be notified in writing by the employer of the action and the reason for it and may be heard publicly by the personnel board",
            value: {
              standard:
                "The Personnel Board may remedy action based on political, racial, or religious reasons or violation of chapter 39.25 or its rules.",
              requiredProcedure: [
                "written notice and reason",
                "hearing requested within 15 days",
              ],
            },
          }),
          appealBody: compileFact<AppealBody>(opened, {
            artifactId: "ak-civil-service-statutes",
            citation: "Alaska Stat. § 39.25.170",
            excerpt:
              "may be heard publicly by the personnel board and may be represented by counsel at the hearing.",
            value: {
              bodies: ["Alaska Personnel Board"],
              reviewScope:
                "Dismissal, demotion, or suspension over 30 working days in a 12-month period for classified employees.",
            },
          }),
        },
        {
          bargainingCoverage: compileFact<BargainingCoverage>(opened, {
            artifactId: "ak-public-employment-relations-statutes",
            citation: "Alaska Stat. § 23.40.070",
            excerpt:
              "recognizing the right of public employees to organize for the purpose of collective bargaining",
            value: {
              regime: "broad-duty",
              appliesTo:
                "Public employees covered by the Public Employment Relations Act.",
              exclusions: [
                "statutory exclusions and authorized local rejection under § 23.40.245",
              ],
            },
          }),
          bargainingScope: compileFact<BargainingScope>(opened, {
            artifactId: "ak-public-employment-relations-statutes",
            citation: "Alaska Stat. §§ 23.40.070-.075",
            excerpt:
              "wages, hours, and other terms and conditions of employment",
            value: {
              mandatorySubjects: [
                "wages",
                "hours",
                "other terms and conditions of employment",
              ],
              excludedSubjects: ["items made nonnegotiable by § 23.40.075"],
            },
          }),
          impasseRule: compileFact<ImpasseRule>(opened, {
            artifactId: "ak-public-employment-relations-statutes",
            citation: "Alaska Stat. § 23.40.200",
            excerpt:
              "mediation has been utilized without resolving the deadlock, the parties shall submit to arbitration",
            value: {
              mechanisms: [
                "mediation",
                "arbitration for class (a)(1)",
                "conditional arbitration for class (a)(2)",
                "advisory arbitration for specified school employees",
              ],
              bindingFor: "Class (a)(1) employees after unresolved mediation.",
            },
          }),
          strikeRestriction: compileFact<StrikeRestriction>(opened, {
            artifactId: "ak-public-employment-relations-statutes",
            citation: "Alaska Stat. § 23.40.200",
            excerpt: "Employees in this class may not engage in strikes.",
            value: {
              rule: "tiered",
              appliesTo:
                "Public employees are divided into three service classes.",
              conditions: [
                "class (a)(1) may not strike",
                "class (a)(2) may strike for a limited time after mediation",
                "class (a)(3) may strike after a majority secret-ballot vote, subject to school-employee conditions",
              ],
            },
          }),
        },
      );
    }

    if (base.jurisdictionKey === "US-MN") {
      return replaceRecord(
        base,
        {
          classificationDistinction: compileFact<ClassificationDistinction>(
            opened,
            {
              artifactId: "mn-civil-service-statutes",
              citation: "Minn. Stat. §§ 43A.07-.08",
              excerpt: "Unclassified positions are held by employees who are:",
              value: {
                coveredService:
                  "classified service administered under chapter 43A",
                outsideCoveredService: [
                  "unclassified positions enumerated by § 43A.08",
                ],
              },
            },
          ),
          removalProtection: compileFact<RemovalProtection>(opened, {
            artifactId: "mn-civil-service-statutes",
            citation: "Minn. Stat. § 43A.33",
            excerpt:
              "No permanent employee in the classified service shall be reprimanded, discharged, suspended without pay, or demoted, except for just cause.",
            value: {
              standard:
                "Just cause for covered discipline of permanent classified employees.",
              requiredProcedure: [
                "informal resolution attempt",
                "written notice",
                "appeal within 30 calendar days",
              ],
            },
          }),
          appealBody: compileFact<AppealBody>(opened, {
            artifactId: "mn-civil-service-statutes",
            citation: "Minn. Stat. § 43A.33",
            excerpt:
              "may elect to appeal the action to the Bureau of Mediation Services within 30 calendar days",
            value: {
              bodies: [
                "Minnesota Bureau of Mediation Services",
                "arbitrator selected under Bureau rules",
              ],
              reviewScope:
                "Specified discipline of permanent classified employees not covered by a collective bargaining agreement.",
            },
          }),
        },
        {
          bargainingCoverage: compileFact<BargainingCoverage>(opened, {
            artifactId: "mn-public-employment-labor-relations-statutes",
            citation: "Minn. Stat. § 179A.07",
            excerpt:
              "A public employer has an obligation to meet and negotiate in good faith with the exclusive representative of public employees in an appropriate unit",
            value: {
              regime: "broad-duty",
              appliesTo: "Public employees in appropriate units under PELRA.",
              exclusions: [
                "employees excluded by chapter 179A definitions or unit rules",
              ],
            },
          }),
          bargainingScope: compileFact<BargainingScope>(opened, {
            artifactId: "mn-public-employment-labor-relations-statutes",
            citation: "Minn. Stat. § 179A.07",
            excerpt:
              "regarding grievance procedures and the terms and conditions of employment",
            value: {
              mandatorySubjects: [
                "grievance procedures",
                "terms and conditions of employment",
              ],
              excludedSubjects: ["inherent managerial policy"],
            },
          }),
          managementRights: compileFact<ManagementRights>(opened, {
            artifactId: "mn-public-employment-labor-relations-statutes",
            citation: "Minn. Stat. § 179A.07",
            excerpt:
              "functions and programs of the employer, its overall budget, utilization of technology, the organizational structure, selection of personnel, and direction of personnel",
            value: {
              reservedSubjects: [
                "functions and programs",
                "overall budget",
                "technology",
                "organizational structure",
                "selection of personnel",
                "direction of personnel",
              ],
              limitation:
                "A public employer must negotiate the effects of inherent managerial policy decisions on terms and conditions of employment.",
            },
          }),
          impasseRule: compileFact<ImpasseRule>(opened, {
            artifactId: "mn-public-employment-labor-relations-statutes",
            citation: "Minn. Stat. § 179A.16",
            excerpt:
              "An exclusive representative or employer of a unit of essential employees may petition for binding interest arbitration",
            value: {
              mechanisms: [
                "mediation",
                "voluntary interest arbitration for nonessential employees",
                "binding interest arbitration for essential employees",
              ],
              bindingFor: "Essential employee units under § 179A.16.",
            },
          }),
          strikeRestriction: compileFact<StrikeRestriction>(opened, {
            artifactId: "mn-public-employment-labor-relations-statutes",
            citation: "Minn. Stat. §§ 179A.18-.19",
            excerpt: "Essential employees may not strike.",
            value: {
              rule: "limited",
              appliesTo:
                "Essential employees are barred; other public employees may strike only under § 179A.18 conditions.",
              conditions: [
                "statutory authorization",
                "applicable impasse and mediation requirements",
              ],
            },
          }),
        },
      );
    }

    if (base.jurisdictionKey === "US-NE") {
      return replaceRecord(
        base,
        {
          classificationDistinction: compileFact<ClassificationDistinction>(
            opened,
            {
              artifactId: "ne-classified-service-statutes",
              citation: "Neb. Rev. Stat. § 81-1316",
              excerpt:
                "All agencies and personnel of state government shall be covered by sections 81-1301 to 81-1319 and shall be considered subject to the State Personnel System, except the following:",
              value: {
                coveredService:
                  "State Personnel System coverage under §§ 81-1301 to 81-1319",
                outsideCoveredService: [
                  "positions exempted or designated noncovered by § 81-1316",
                ],
              },
            },
          ),
        },
        {
          bargainingCoverage: compileFact<BargainingCoverage>(opened, {
            artifactId: "ne-bargaining-scope-statutes",
            citation: "Neb. Rev. Stat. § 48-816",
            excerpt:
              "The commission shall require good faith bargaining concerning the terms and conditions of employment of its employees by any public employer.",
            value: {
              regime: "broad-duty",
              appliesTo:
                "Public employers and public employees covered by the Industrial Relations Act.",
              exclusions: [
                "subjects or employees governed by more specific Nebraska statutes",
              ],
            },
          }),
          bargainingScope: compileFact<BargainingScope>(opened, {
            artifactId: "ne-bargaining-scope-statutes",
            citation: "Neb. Rev. Stat. § 48-816",
            excerpt:
              "meet at reasonable times and confer in good faith with respect to wages, hours, and other terms and conditions of employment",
            value: {
              mandatorySubjects: [
                "wages",
                "hours",
                "other terms and conditions of employment",
              ],
              excludedSubjects: [
                "staffing subjects made permissive by § 48-816(1)(b)",
              ],
            },
          }),
          impasseRule: compileFact<ImpasseRule>(opened, {
            artifactId: "ne-impasse-statutes",
            citation: "Neb. Rev. Stat. § 48-818",
            excerpt:
              "the findings and order or orders may establish or alter the scale of wages, hours of labor, or conditions of employment",
            value: {
              mechanisms: [
                "Commission for Industrial Relations adjudication and order",
              ],
              bindingFor:
                "Industrial disputes within § 48-818, subject to the State Employees Collective Bargaining Act exception.",
            },
          }),
          strikeRestriction: unknownField(
            "The official § 48-821 page was rate-limited during acquisition; no strike rule is compiled for Nebraska in this wave.",
          ),
        },
      );
    }

    return base;
  });
}
