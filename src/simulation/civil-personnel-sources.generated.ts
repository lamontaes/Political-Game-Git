/**
 * GENERATED — do not edit by hand.
 *
 * Written by `scripts/compile-civil-personnel.ts` from the locked
 * civil-service-labor artifacts. Every procedure excerpt was re-found in the
 * rights-scoped enacted text. Regenerate with
 * `node --import tsx scripts/compile-civil-personnel.ts`; `--check` replays.
 */
import type { PersonnelSourceProjection } from "./civil-personnel-contract";

export const CIVIL_PERSONNEL_SOURCE_PROJECTION: PersonnelSourceProjection = {
  schemaVersion: 2,
  corpusSha256:
    "9d63e5a66a1e4dcc9e08311b62c167818f705737779432a25dc17fb67dfd5c1f",
  compilerVersion: "1.0.0",
  profiles: [
    {
      jurisdictionKey: "US-FEDERAL",
      jurisdictionName: "United States federal government",
      employerLevel: "federal",
      fields: {
        classificationDistinction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "coveredService", value: "competitive service" },
            {
              key: "outsideCoveredService",
              value: ["excepted service", "Senior Executive Service"],
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section2102",
              sha256:
                "b8c26d4a76baaea9dd3a40e596f1fb51276a262eaa28962717b90aa7fe45040b",
              citation: "5 U.S.C. § 2102",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section2102&num=0&edition=prelim",
            },
            {
              artifactId: "uscode-title5-section2103",
              sha256:
                "c3282aff61dfef6cff098b484cbb3bc6c48c38cf077a78651f78897be334ee40",
              citation: "5 U.S.C. § 2103",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section2103&num=0&edition=prelim",
            },
          ],
        },
        appointmentProtection: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "rule",
              value:
                "Competitive-service appointments use open competitive examinations, subject to statutory exceptions.",
            },
            { key: "probationaryRule", value: null },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section3304",
              sha256:
                "244d982091b141f991148b858683a9f445aa0cefc0757a4bc8443aa2a96d4644",
              citation: "5 U.S.C. § 3304",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section3304&num=0&edition=prelim",
            },
          ],
        },
        removalProtection: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "standard",
              value:
                "Covered adverse actions must promote the efficiency of the service.",
            },
            {
              key: "requiredProcedure",
              value: [
                "advance written notice",
                "opportunity to answer",
                "representation",
                "written decision with reasons",
              ],
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7513",
              sha256:
                "08527db9be8d2d137a92f40f49fbfb4db726a8128faa9c507b99d3d3304dd962",
              citation: "5 U.S.C. § 7513",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7513&num=0&edition=prelim",
            },
          ],
        },
        appealBody: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "bodies", value: ["Merit Systems Protection Board"] },
            {
              key: "reviewScope",
              value: "Covered adverse actions taken under 5 U.S.C. § 7513.",
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7513",
              sha256:
                "08527db9be8d2d137a92f40f49fbfb4db726a8128faa9c507b99d3d3304dd962",
              citation: "5 U.S.C. § 7513(d)",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7513&num=0&edition=prelim",
            },
          ],
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "regime", value: "broad-duty" },
            {
              key: "appliesTo",
              value: "Federal employees covered by chapter 71.",
            },
            {
              key: "exclusions",
              value: ["employees excluded elsewhere in chapter 71"],
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7102",
              sha256:
                "b6fa57115156b83e983fa3ef72e321839357fa44bb790097db46faae5485de61",
              citation: "5 U.S.C. § 7102",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7102&num=0&edition=prelim",
            },
          ],
        },
        bargainingScope: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "mandatorySubjects", value: ["conditions of employment"] },
            {
              key: "excludedSubjects",
              value: [
                "subjects reserved by 5 U.S.C. § 7106 or otherwise excluded by chapter 71",
              ],
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7102",
              sha256:
                "b6fa57115156b83e983fa3ef72e321839357fa44bb790097db46faae5485de61",
              citation: "5 U.S.C. § 7102",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7102&num=0&edition=prelim",
            },
          ],
        },
        managementRights: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "reservedSubjects",
              value: [
                "mission",
                "budget",
                "organization",
                "number of employees",
                "internal security practices",
                "hiring and assignment",
                "discipline",
              ],
            },
            {
              key: "limitation",
              value:
                "Procedures and appropriate arrangements remain negotiable as provided by § 7106(b).",
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7106",
              sha256:
                "b9c77eda23b486d05972f1328d34fd6a9b834e3b7b58ac698fd9c2f860d8c6da",
              citation: "5 U.S.C. § 7106",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7106&num=0&edition=prelim",
            },
          ],
        },
        impasseRule: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mechanisms",
              value: [
                "mediation",
                "Federal Service Impasses Panel",
                "Panel-approved binding arbitration",
              ],
            },
            {
              key: "bindingFor",
              value:
                "A procedure for binding arbitration requires Panel approval.",
            },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7119",
              sha256:
                "5fa24b1ee07bea3d5dc8d9c02b570702caa441c62c164367af46ce4f67463f67",
              citation: "5 U.S.C. § 7119",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7119&num=0&edition=prelim",
            },
          ],
        },
        strikeRestriction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "rule", value: "prohibited" },
            {
              key: "appliesTo",
              value: "Individuals holding federal government positions.",
            },
            { key: "conditions", value: [] },
          ],
          citations: [
            {
              artifactId: "uscode-title5-section7311",
              sha256:
                "02ad33707e2229b3558ede366ba3e74b3bb359e1af7441e4c5070f506d700499",
              citation: "5 U.S.C. § 7311",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title5-section7311&num=0&edition=prelim",
            },
          ],
        },
      },
    },
    {
      jurisdictionKey: "US-AL",
      jurisdictionName: "Alabama",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-AK",
      jurisdictionName: "Alaska",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "coveredService",
              value: "classified service under Alaska Statutes chapter 39.25",
            },
            {
              key: "outsideCoveredService",
              value: ["exempt service", "partially exempt service"],
            },
          ],
          citations: [
            {
              artifactId: "ak-civil-service-statutes",
              sha256:
                "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
              citation: "Alaska Stat. §§ 39.25.110-.120",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
            },
          ],
        },
        appointmentProtection: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "rule",
              value:
                "Classified selection rules include open competitive assessment when appropriate.",
            },
            {
              key: "probationaryRule",
              value: "A probationary period may not exceed one year.",
            },
          ],
          citations: [
            {
              artifactId: "ak-civil-service-statutes",
              sha256:
                "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
              citation: "Alaska Stat. § 39.25.150",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
            },
          ],
        },
        removalProtection: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "standard",
              value:
                "The Personnel Board may remedy action based on political, racial, or religious reasons or violation of chapter 39.25 or its rules.",
            },
            {
              key: "requiredProcedure",
              value: [
                "written notice and reason",
                "hearing requested within 15 days",
              ],
            },
          ],
          citations: [
            {
              artifactId: "ak-civil-service-statutes",
              sha256:
                "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
              citation: "Alaska Stat. § 39.25.170",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
            },
          ],
        },
        appealBody: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "bodies", value: ["Alaska Personnel Board"] },
            {
              key: "reviewScope",
              value:
                "Dismissal, demotion, or suspension over 30 working days in a 12-month period for classified employees.",
            },
          ],
          citations: [
            {
              artifactId: "ak-civil-service-statutes",
              sha256:
                "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
              citation: "Alaska Stat. § 39.25.170",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
            },
          ],
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "regime", value: "broad-duty" },
            {
              key: "appliesTo",
              value:
                "Public employees covered by the Public Employment Relations Act.",
            },
            {
              key: "exclusions",
              value: [
                "statutory exclusions and authorized local rejection under § 23.40.245",
              ],
            },
          ],
          citations: [
            {
              artifactId: "ak-public-employment-relations-statutes",
              sha256:
                "158789e5e2315237f2ef1151caf5ed25040b51fc76c1e3129290cb63ce9c061b",
              citation: "Alaska Stat. § 23.40.070",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=23.40.070&secEnd=23.40.260",
            },
          ],
        },
        bargainingScope: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mandatorySubjects",
              value: [
                "wages",
                "hours",
                "other terms and conditions of employment",
              ],
            },
            {
              key: "excludedSubjects",
              value: ["items made nonnegotiable by § 23.40.075"],
            },
          ],
          citations: [
            {
              artifactId: "ak-public-employment-relations-statutes",
              sha256:
                "158789e5e2315237f2ef1151caf5ed25040b51fc76c1e3129290cb63ce9c061b",
              citation: "Alaska Stat. §§ 23.40.070-.075",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=23.40.070&secEnd=23.40.260",
            },
          ],
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mechanisms",
              value: [
                "mediation",
                "arbitration for class (a)(1)",
                "conditional arbitration for class (a)(2)",
                "advisory arbitration for specified school employees",
              ],
            },
            {
              key: "bindingFor",
              value: "Class (a)(1) employees after unresolved mediation.",
            },
          ],
          citations: [
            {
              artifactId: "ak-public-employment-relations-statutes",
              sha256:
                "158789e5e2315237f2ef1151caf5ed25040b51fc76c1e3129290cb63ce9c061b",
              citation: "Alaska Stat. § 23.40.200",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=23.40.070&secEnd=23.40.260",
            },
          ],
        },
        strikeRestriction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "rule", value: "tiered" },
            {
              key: "appliesTo",
              value: "Public employees are divided into three service classes.",
            },
            {
              key: "conditions",
              value: [
                "class (a)(1) may not strike",
                "class (a)(2) may strike for a limited time after mediation",
                "class (a)(3) may strike after a majority secret-ballot vote, subject to school-employee conditions",
              ],
            },
          ],
          citations: [
            {
              artifactId: "ak-public-employment-relations-statutes",
              sha256:
                "158789e5e2315237f2ef1151caf5ed25040b51fc76c1e3129290cb63ce9c061b",
              citation: "Alaska Stat. § 23.40.200",
              url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=23.40.070&secEnd=23.40.260",
            },
          ],
        },
      },
    },
    {
      jurisdictionKey: "US-AZ",
      jurisdictionName: "Arizona",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-AR",
      jurisdictionName: "Arkansas",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-CA",
      jurisdictionName: "California",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-CO",
      jurisdictionName: "Colorado",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-CT",
      jurisdictionName: "Connecticut",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-DE",
      jurisdictionName: "Delaware",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-FL",
      jurisdictionName: "Florida",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-GA",
      jurisdictionName: "Georgia",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-HI",
      jurisdictionName: "Hawaii",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-ID",
      jurisdictionName: "Idaho",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-IL",
      jurisdictionName: "Illinois",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-IN",
      jurisdictionName: "Indiana",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-IA",
      jurisdictionName: "Iowa",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-KS",
      jurisdictionName: "Kansas",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-KY",
      jurisdictionName: "Kentucky",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-LA",
      jurisdictionName: "Louisiana",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-ME",
      jurisdictionName: "Maine",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MD",
      jurisdictionName: "Maryland",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MA",
      jurisdictionName: "Massachusetts",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MI",
      jurisdictionName: "Michigan",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MN",
      jurisdictionName: "Minnesota",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "coveredService",
              value: "classified service administered under chapter 43A",
            },
            {
              key: "outsideCoveredService",
              value: ["unclassified positions enumerated by § 43A.08"],
            },
          ],
          citations: [
            {
              artifactId: "mn-civil-service-statutes",
              sha256:
                "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
              citation: "Minn. Stat. §§ 43A.07-.08",
              url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
            },
          ],
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "standard",
              value:
                "Just cause for covered discipline of permanent classified employees.",
            },
            {
              key: "requiredProcedure",
              value: [
                "informal resolution attempt",
                "written notice",
                "appeal within 30 calendar days",
              ],
            },
          ],
          citations: [
            {
              artifactId: "mn-civil-service-statutes",
              sha256:
                "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
              citation: "Minn. Stat. § 43A.33",
              url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
            },
          ],
        },
        appealBody: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "bodies",
              value: [
                "Minnesota Bureau of Mediation Services",
                "arbitrator selected under Bureau rules",
              ],
            },
            {
              key: "reviewScope",
              value:
                "Specified discipline of permanent classified employees not covered by a collective bargaining agreement.",
            },
          ],
          citations: [
            {
              artifactId: "mn-civil-service-statutes",
              sha256:
                "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
              citation: "Minn. Stat. § 43A.33",
              url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
            },
          ],
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "regime", value: "broad-duty" },
            {
              key: "appliesTo",
              value: "Public employees in appropriate units under PELRA.",
            },
            {
              key: "exclusions",
              value: [
                "employees excluded by chapter 179A definitions or unit rules",
              ],
            },
          ],
          citations: [
            {
              artifactId: "mn-public-employment-labor-relations-statutes",
              sha256:
                "b2236aba710d4ddfe374a19bdbc5f93ccb9a92f1ab5fa6f49a3be3afdf25addd",
              citation: "Minn. Stat. § 179A.07",
              url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
            },
          ],
        },
        bargainingScope: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mandatorySubjects",
              value: [
                "grievance procedures",
                "terms and conditions of employment",
              ],
            },
            { key: "excludedSubjects", value: ["inherent managerial policy"] },
          ],
          citations: [
            {
              artifactId: "mn-public-employment-labor-relations-statutes",
              sha256:
                "b2236aba710d4ddfe374a19bdbc5f93ccb9a92f1ab5fa6f49a3be3afdf25addd",
              citation: "Minn. Stat. § 179A.07",
              url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
            },
          ],
        },
        managementRights: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "reservedSubjects",
              value: [
                "functions and programs",
                "overall budget",
                "technology",
                "organizational structure",
                "selection of personnel",
                "direction of personnel",
              ],
            },
            {
              key: "limitation",
              value:
                "A public employer must negotiate the effects of inherent managerial policy decisions on terms and conditions of employment.",
            },
          ],
          citations: [
            {
              artifactId: "mn-public-employment-labor-relations-statutes",
              sha256:
                "b2236aba710d4ddfe374a19bdbc5f93ccb9a92f1ab5fa6f49a3be3afdf25addd",
              citation: "Minn. Stat. § 179A.07",
              url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
            },
          ],
        },
        impasseRule: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mechanisms",
              value: [
                "mediation",
                "voluntary interest arbitration for nonessential employees",
                "binding interest arbitration for essential employees",
              ],
            },
            {
              key: "bindingFor",
              value: "Essential employee units under § 179A.16.",
            },
          ],
          citations: [
            {
              artifactId: "mn-public-employment-labor-relations-statutes",
              sha256:
                "b2236aba710d4ddfe374a19bdbc5f93ccb9a92f1ab5fa6f49a3be3afdf25addd",
              citation: "Minn. Stat. § 179A.16",
              url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
            },
          ],
        },
        strikeRestriction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "rule", value: "limited" },
            {
              key: "appliesTo",
              value:
                "Essential employees are barred; other public employees may strike only under § 179A.18 conditions.",
            },
            {
              key: "conditions",
              value: [
                "statutory authorization",
                "applicable impasse and mediation requirements",
              ],
            },
          ],
          citations: [
            {
              artifactId: "mn-public-employment-labor-relations-statutes",
              sha256:
                "b2236aba710d4ddfe374a19bdbc5f93ccb9a92f1ab5fa6f49a3be3afdf25addd",
              citation: "Minn. Stat. §§ 179A.18-.19",
              url: "https://www.revisor.mn.gov/statutes/cite/179A/full",
            },
          ],
        },
      },
    },
    {
      jurisdictionKey: "US-MS",
      jurisdictionName: "Mississippi",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MO",
      jurisdictionName: "Missouri",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-MT",
      jurisdictionName: "Montana",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NE",
      jurisdictionName: "Nebraska",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "coveredService",
              value:
                "State Personnel System coverage under §§ 81-1301 to 81-1319",
            },
            {
              key: "outsideCoveredService",
              value: [
                "positions exempted or designated noncovered by § 81-1316",
              ],
            },
          ],
          citations: [
            {
              artifactId: "ne-classified-service-statutes",
              sha256:
                "519c7539f84356aab9cb322d19fed430e1e80a62010857e71fe27b8e58cbaaa5",
              citation: "Neb. Rev. Stat. § 81-1316",
              url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=81-1316",
            },
          ],
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            { key: "regime", value: "broad-duty" },
            {
              key: "appliesTo",
              value:
                "Public employers and public employees covered by the Industrial Relations Act.",
            },
            {
              key: "exclusions",
              value: [
                "subjects or employees governed by more specific Nebraska statutes",
              ],
            },
          ],
          citations: [
            {
              artifactId: "ne-bargaining-scope-statutes",
              sha256:
                "02b242860b6c9d0e8fa628486e2a43bdb7c41123c94d118dad44afff117fb2a5",
              citation: "Neb. Rev. Stat. § 48-816",
              url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=48-816",
            },
          ],
        },
        bargainingScope: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mandatorySubjects",
              value: [
                "wages",
                "hours",
                "other terms and conditions of employment",
              ],
            },
            {
              key: "excludedSubjects",
              value: ["staffing subjects made permissive by § 48-816(1)(b)"],
            },
          ],
          citations: [
            {
              artifactId: "ne-bargaining-scope-statutes",
              sha256:
                "02b242860b6c9d0e8fa628486e2a43bdb7c41123c94d118dad44afff117fb2a5",
              citation: "Neb. Rev. Stat. § 48-816",
              url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=48-816",
            },
          ],
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "known",
          observedOn: "2026-09-06",
          attributes: [
            {
              key: "mechanisms",
              value: [
                "Commission for Industrial Relations adjudication and order",
              ],
            },
            {
              key: "bindingFor",
              value:
                "Industrial disputes within § 48-818, subject to the State Employees Collective Bargaining Act exception.",
            },
          ],
          citations: [
            {
              artifactId: "ne-impasse-statutes",
              sha256:
                "874487b2d2383f5c07721f16ceacde08594701aa8aa28418e7b7222e16b1f587",
              citation: "Neb. Rev. Stat. § 48-818",
              url: "https://www.nebraskalegislature.gov/laws/statutes.php?statute=48-818",
            },
          ],
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "The official § 48-821 page was rate-limited during acquisition; no strike rule is compiled for Nebraska in this wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NV",
      jurisdictionName: "Nevada",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NH",
      jurisdictionName: "New Hampshire",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NJ",
      jurisdictionName: "New Jersey",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NM",
      jurisdictionName: "New Mexico",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NY",
      jurisdictionName: "New York",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-NC",
      jurisdictionName: "North Carolina",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-ND",
      jurisdictionName: "North Dakota",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-OH",
      jurisdictionName: "Ohio",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-OK",
      jurisdictionName: "Oklahoma",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-OR",
      jurisdictionName: "Oregon",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-PA",
      jurisdictionName: "Pennsylvania",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-RI",
      jurisdictionName: "Rhode Island",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-SC",
      jurisdictionName: "South Carolina",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-SD",
      jurisdictionName: "South Dakota",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-TN",
      jurisdictionName: "Tennessee",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-TX",
      jurisdictionName: "Texas",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-UT",
      jurisdictionName: "Utah",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-VT",
      jurisdictionName: "Vermont",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-VA",
      jurisdictionName: "Virginia",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-WA",
      jurisdictionName: "Washington",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-WV",
      jurisdictionName: "West Virginia",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-WI",
      jurisdictionName: "Wisconsin",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
    {
      jurisdictionKey: "US-WY",
      jurisdictionName: "Wyoming",
      employerLevel: "state",
      fields: {
        classificationDistinction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appointmentProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        removalProtection: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        appealBody: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        localCivilServiceMandate: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingCoverage: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        bargainingScope: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        managementRights: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        impasseRule: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
        strikeRestriction: {
          state: "unknown",
          reason:
            "No operative official authority for this field was acquired and verified in the bounded 92P first wave.",
        },
      },
    },
  ],
  procedures: [
    {
      key: "mn-just-cause",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "A permanent classified employee may be reprimanded, discharged, suspended without pay or demoted only for just cause, after managers and employees attempt informal resolution.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 1",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "Managers and employees shall attempt to resolve disputes through informal means prior to the initiation of disciplinary action.",
        "No permanent employee in the classified service shall be reprimanded, discharged, suspended without pay, or demoted, except for just cause.",
      ],
      terms: {},
    },
    {
      key: "mn-just-cause-grounds",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Just cause includes, without being limited to, the four named grounds; policy violations count only when the policies are applied uniformly and without discrimination.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 2",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "just cause includes, but is not limited to, consistent failure to perform assigned duties, substandard performance, insubordination, and serious violation of written policies and procedures, provided the policies and procedures are applied in a uniform, nondiscriminatory manner.",
      ],
      terms: {
        grounds: [
          "consistent-failure-to-perform",
          "substandard-performance",
          "insubordination",
          "serious-policy-violation",
        ],
      },
    },
    {
      key: "mn-agreement-procedures",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Discipline and discharge procedures for employees covered by a collective bargaining agreement are governed by that agreement.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(a)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "Procedures for discipline and discharge of employees covered by collective bargaining agreements shall be governed by the agreements.",
      ],
      terms: {},
    },
    {
      key: "mn-discipline-notice",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "For a discharge, suspension without pay or demotion of a permanent classified employee not covered by an agreement, the appointing authority gives written notice no later than the effective date. The notice states the right to appeal to the Bureau of Mediation Services within 30 calendar days, and the notice and any reply are filed with the commissioner within ten calendar days.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(b)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "For discharge, suspension without pay or demotion, no later than the effective date of such action, a permanent classified employee not covered by a collective bargaining agreement shall be given written notice by the appointing authority.",
        "The notice shall also include a statement that the employee may elect to appeal the action to the Bureau of Mediation Services within 30 calendar days following the effective date of the disciplinary action.",
        "A copy of the notice and the employee's reply, if any, shall be filed by the appointing authority with the commissioner no later than ten calendar days following the effective date of the disciplinary action.",
      ],
      terms: {
        appealWithinCalendarDays: 30,
        commissionerFilingWithinCalendarDays: 10,
      },
    },
    {
      key: "mn-notice-plan-content",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "The applicable plan's grievance procedure prescribes further notice content and the reply procedure; that plan is not acquired.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(b)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "The content of that notice as well as the employee's right to reply to the appointing authority shall be as prescribed in the grievance procedure contained in the applicable plan established pursuant to section 43A.18 .",
      ],
      terms: {},
    },
    {
      key: "mn-commissioner-settlement",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "The commissioner decides whether the appointing authority must settle the dispute before the hearing.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(b)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "The commissioner shall have final authority to decide whether the appointing authority shall settle the dispute prior to the hearing provided under this subdivision.",
      ],
      terms: {},
    },
    {
      key: "mn-probationary-grievance",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Grievances over discipline during an initial probationary period follow the plan, which is not acquired.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(c)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "For discharge, suspension, or demotion of an employee serving an initial probationary period, and for noncertification in any subsequent probationary period, grievance procedures shall be as provided in the plan established pursuant to section 43A.18 .",
      ],
      terms: {},
    },
    {
      key: "mn-arbitration",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "The Bureau's commissioner provides a list of potential arbitrators under Bureau rules. Selection follows the plan and the hearing follows Bureau rules; neither is acquired.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.33, subd. 3(d)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "Within ten days of receipt of the employee's written notice of appeal, the commissioner of the Bureau of Mediation Services shall provide both parties with a list of potential arbitrators according to the rules of the Bureau of Mediation Services to hear the appeal.",
        "The process of selecting the arbitrator from the list shall be determined by the plan.",
      ],
      terms: {},
    },
    {
      key: "mn-reinstatement",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "An appointing authority may directly reinstate a former permanent or probationary employee of the job class within four years of separation from the class.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.15, subd. 15",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "An appointing authority may directly reinstate a person who is a former permanent or probationary employee of the job class, within four years of separation from the class.",
      ],
      terms: { withinYearsOfSeparation: 4 },
    },
    {
      key: "mn-probation",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "A classified probationary period lasts between 30 days and two years of full-time-equivalent service, as the agreement or plan sets. An appointing authority may require probation for reinstatements of former employees of a different appointing authority.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.16, subds. 1-2",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "All unlimited appointments to positions in the classified service except as provided in this subdivision shall be for a probationary period the duration of which shall be determined through collective bargaining agreements or plans established pursuant to section 43A.18 but which shall not be less than 30 days of full-time equivalent service nor more than two years of full-time equivalent service.",
        "An appointing authority may require a probationary period for transfers, reinstatements, voluntary demotions, and appointments from layoff lists of former employees of a different appointing authority.",
        "There is no presumption of continued employment during a probationary period.",
      ],
      terms: {
        minimumFullTimeEquivalentDays: 30,
        maximumFullTimeEquivalentYears: 2,
      },
    },
    {
      key: "mn-unclassified-offices",
      jurisdictionKey: "US-MN",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Employees in the offices of the governor and lieutenant governor, and the attorney general's attorneys, legal assistants and three confidential employees, hold unclassified positions.",
      citation: {
        artifactId: "mn-civil-service-statutes",
        sha256:
          "de3fde142b04ce7ef8788f088e6fb09f501c8b4a944c8886e6314974ff92f542",
        citation: "Minn. Stat. § 43A.08, subd. 1(6), (11)",
        url: "https://www.revisor.mn.gov/statutes/cite/43A/full",
      },
      excerpts: [
        "Unclassified positions are held by employees who are:",
        "(6) employees in the offices of the governor and of the lieutenant governor",
        "(11) attorneys, legal assistants, and three confidential employees appointed by the attorney general or employed with the attorney general's authorization",
      ],
      terms: {},
    },
    {
      key: "ak-hearing",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "A classified employee who is dismissed, demoted or suspended for more than 30 working days in 12 months gets written notice and a reason from the employer, and may request a public Personnel Board hearing within 15 days.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.170(a)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "An employee in the classified service who is dismissed, demoted, or suspended for more than 30 working days in a 12-month period shall be notified in writing by the employer of the action and the reason for it and may be heard publicly by the personnel board and may be represented by counsel at the hearing.",
        "In order to be heard, the complainant shall request a hearing within 15 days of dismissal, demotion, or suspension.",
      ],
      terms: { requestWithinDays: 15, suspensionThresholdWorkingDays: 30 },
    },
    {
      key: "ak-board-remedy",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "The board reinstates without loss when it finds a political, racial or religious reason or a violation of the chapter or its rules; otherwise it reports findings and recommendations.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.170(b)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "If the board finds that the action complained of was taken for a political, racial, or religious reason, or in violation of this chapter or the rules adopted under this chapter, the officer or employee shall be reinstated to the position without loss of pay or leave benefit for the period of dismissal, demotion, or suspension.",
        "In all other cases, the board shall report its findings and recommendations to both parties.",
      ],
      terms: {},
    },
    {
      key: "ak-partially-exempt",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "A partially exempt employee is not eligible for a Personnel Board hearing on dismissal, demotion or suspension.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.120(b)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "A person holding a position in the partially exempt service is not required to complete an assessment and is not eligible for a hearing by the personnel board in case of dismissal, demotion, or suspension.",
      ],
      terms: {},
    },
    {
      key: "ak-exempt",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Exempt-service positions are outside chapter 39.25 and its rules, including its hearing right.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.110",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "positions in the state service constitute the exempt service and are exempt from the provisions of this chapter and the rules adopted under it",
      ],
      terms: {},
    },
    {
      key: "ak-governor-office-exempt",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Employees of the offices of the governor and lieutenant governor are in the exempt service.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.110(20)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "(20) employees of the Office of the Governor and the office of the lieutenant governor, including the staff of the governor's mansion;",
      ],
      terms: {},
    },
    {
      key: "ak-probation",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Personnel rules provide a probation of at most one year before an appointment becomes permanent, unless an agreement extends it.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.150(7)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "a period of probation not to exceed one year before an appointment to a position becomes permanent, unless the period of probation is extended as set out in a collective bargaining agreement under AS 23.40",
      ],
      terms: { maximumYears: 1 },
    },
    {
      key: "ak-discipline-rules",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "Disciplinary measures and the review of disputed personnel actions are set by personnel rules, which are not acquired.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.150(15)-(16)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "the establishment of disciplinary measures, which may include disciplinary suspension without pay;",
        "the procedures for review of disputed personnel actions, for resolving employee and interagency grievances",
      ],
      terms: {},
    },
    {
      key: "ak-merit",
      jurisdictionKey: "US-AK",
      validity: { state: "CURRENT_OBSERVATION", observedOn: "2026-09-06" },
      statement:
        "An action affecting a classified employee's status may not be taken or withheld for a reason not related to merit.",
      citation: {
        artifactId: "ak-civil-service-statutes",
        sha256:
          "43e12497ea345b0c1609567bfa52d5c23b708e1ed76c6a6c574136e164eb8d2f",
        citation: "Alaska Stat. § 39.25.160(f)",
        url: "https://www.akleg.gov/basis/statutes.asp?media=print&secStart=39.25.110&secEnd=39.25.180",
      },
      excerpts: [
        "action affecting the employment status of an employee in the classified service, including appointment, promotion, demotion, suspension, or removal, may not be taken or withheld for a reason not related to merit.",
      ],
      terms: {},
    },
  ],
};
