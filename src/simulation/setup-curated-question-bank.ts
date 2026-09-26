import type { QuestionnaireItem } from "./setup-questionnaire-bank";

/**
 * Hypotheticals in this bank address the human player. They create no city,
 * mayor, police action, vendor contract, relationship or character history.
 * Follow-ups are admitted only by the recorded choice named in `followUpTo`.
 */
const MAYOR_PLATE_READER: QuestionnaireItem = {
  key: "hypothetical_mayor_plate_reader.curated-v1",
  source: {
    sourceDocument: "Owner-reviewed Who are you? calibration direction",
    reference:
      "September 23, 2026: mayor/license-plate-camera example rated gold standard; human-player hypothetical confirmed; prose grounded against the stated fact packet",
  },
  review: {
    verdict: "non-transparent",
    note: "A concrete public decision with three defensible choices and no predicted outcome.",
  },
  register: "policy-lived",
  fixedOrdinal: null,
  observationWeight: 0.4,
  eligibility: {
    bands: ["middle-childhood", "adolescence", "adult"],
    agency: [],
    relationships: [],
    settings: ["institution"],
  },
  prompt:
    "For this question, imagine yourself as mayor of a fictional American city. The city council has appropriated money for an automatic license-plate-reader pilot. City law permits it only if you sign the vendor agreement. Police say the reads could help identify cars in a recent series of hit-and-runs. A civil-liberties group says 90-day retention would store every passing plate, including people visiting a nearby legal aid office. The vendor offers 14-day retention for the same price; police say it could miss some older leads. What would you choose?",
  options: [
    {
      key: "sign-90-days",
      text: "Sign the 90-day agreement",
      nudges: [
        { dimension: "civic-order", magnitude: 0.4 },
        { dimension: "institutional-trust", magnitude: 0.2 },
      ],
      hypotheses: [
        { hypothesisKey: "mayor.identification-priority", support: 0.6 },
      ],
      ambiguity: null,
    },
    {
      key: "sign-14-days",
      text: "Sign the 14-day agreement",
      nudges: [
        { dimension: "decision-style", magnitude: 0.3 },
        { dimension: "civic-order", magnitude: 0.1 },
      ],
      hypotheses: [
        { hypothesisKey: "mayor.retention-concern", support: 0.5 },
        { hypothesisKey: "mayor.pilot-support", support: 0.5 },
      ],
      ambiguity: {
        key: "mayor.why-fourteen-days",
        hypothesisKeys: ["mayor.retention-concern", "mayor.pilot-support"],
        note: "Signing the shorter agreement alone does not establish which consideration mattered.",
      },
    },
    {
      key: "decline",
      text: "Decline to sign",
      nudges: [
        { dimension: "civic-order", magnitude: -0.3 },
        { dimension: "institutional-trust", magnitude: -0.1 },
      ],
      hypotheses: [{ hypothesisKey: "mayor.do-not-sign", support: 0.6 }],
      ambiguity: null,
    },
  ],
};

const MAYOR_FOURTEEN_DAY_FOLLOW_UP: QuestionnaireItem = {
  key: "hypothetical_mayor_plate_reader_why_14.curated-v1",
  source: {
    sourceDocument: "Owner-reviewed Who are you? calibration direction",
    reference:
      "September 23, 2026: grounded follow-up for the fictional mayor's 14-day choice",
  },
  review: {
    verdict: "non-transparent",
    note: "Clarifies one choice without treating it as a fixed ideology.",
  },
  register: "policy-lived",
  fixedOrdinal: null,
  followUpTo: {
    questionKey: MAYOR_PLATE_READER.key,
    choiceId: "sign-14-days",
  },
  observationWeight: 0.3,
  eligibility: MAYOR_PLATE_READER.eligibility,
  prompt: "If you would choose 14 days, what would matter most to you?",
  options: [
    {
      key: "shorter-retention",
      text: "Keep retention shorter than 90 days",
      nudges: [{ dimension: "civic-order", magnitude: -0.2 }],
      hypotheses: [{ hypothesisKey: "mayor.retention-concern", support: 0.7 }],
      ambiguity: null,
    },
    {
      key: "same-price",
      text: "Keep the same price with 14-day retention",
      nudges: [{ dimension: "decision-style", magnitude: 0.2 }],
      hypotheses: [{ hypothesisKey: "mayor.pilot-support", support: 0.4 }],
      ambiguity: null,
    },
    {
      key: "older-leads",
      text: "Police’s concern that 14 days could miss some older leads",
      nudges: [{ dimension: "civic-order", magnitude: 0.2 }],
      hypotheses: [
        { hypothesisKey: "mayor.identification-priority", support: 0.5 },
      ],
      ambiguity: null,
    },
    {
      key: "other",
      text: "Something else / prefer not to say",
      nudges: [],
      hypotheses: [],
      ambiguity: null,
    },
  ],
};

export const CURATED_PRIMARY_ITEMS: readonly QuestionnaireItem[] = [
  MAYOR_PLATE_READER,
];
export const CURATED_FOLLOW_UP_ITEMS: readonly QuestionnaireItem[] = [
  MAYOR_FOURTEEN_DAY_FOLLOW_UP,
];
export const CURATED_QUESTION_ITEMS: readonly QuestionnaireItem[] = [
  ...CURATED_PRIMARY_ITEMS,
  ...CURATED_FOLLOW_UP_ITEMS,
];
