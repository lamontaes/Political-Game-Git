import type { LawConsequenceRow } from "../../../law-consequence-types";

export const LW08_LIBRARY_MATERIALS_QUESTION =
  "us-policy-positions:civil-family-community.local-control-of-library-materials";

export const LW08_LIBRARY_VISIT_SELECTOR =
  "library.completed-public-library-visit-participants";
export const LW08_LIBRARY_VISIT_ACTION = "record-library-governance-context";
export const LW08_LIBRARY_VISIT_EVIDENCE =
  "library.recorded-completed-public-visit";
export const LW08_LIBRARY_VISIT_COUNT = "library.completed-public-visit-count";

/**
 * The row records a neutral, named-person contact with the governing policy
 * only when a saved public-library visit proves that the person used the
 * library. It makes no claim about a title read, a challenge, removal, access
 * lost or gained, or a reading outcome.
 */
export const LW08_LIBRARY_MATERIALS_ROW = {
  id: `${LW08_LIBRARY_MATERIALS_QUESTION}:recorded-library-visit-context`,
  kind: "public-library-service",
  when: "service",
  who: { selector: LW08_LIBRARY_VISIT_SELECTOR, predicates: [] },
  what: LW08_LIBRARY_VISIT_ACTION,
  amount: { op: "record", key: LW08_LIBRARY_VISIT_COUNT, unit: "count" },
  conditions: [{ capability: LW08_LIBRARY_VISIT_EVIDENCE, parameters: {} }],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: [
      "src/simulation/public-service-requests.ts:requestPublicService",
      "src/simulation/public-service-producer.ts:serviceAttendanceHandler",
      "src/simulation/time-work.ts:completeActivity",
      "src/simulation/law-exposure.ts:recordLawExposure",
      "data/research/outcome-web/links.json:library-materials-to-reading",
    ],
    population:
      "People whose saved public-library request, active library membership and completed visit identify them by name.",
    scope:
      "One neutral policy-context exposure from an actual completed library visit; no title, challenge, removal, access change or reading effect is inferred.",
    why: "A completed visit joined to the request, public-library-funded commitment and active service-recipient membership proves that the named person used a library while the local-board materials rule was in force. The linked research does not establish a reading effect.",
    uncertainty:
      "No exposure is written from funding, a card alone, an uncompleted booking, an assumed visit, or the law answer by itself. This record does not identify the materials carried or any person's reading.",
  },
} satisfies LawConsequenceRow;
