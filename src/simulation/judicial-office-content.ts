import type {
  JudicialKernelId,
  JudicialRoleKey,
} from "./judicial-gameplay-kernels";

/** Authored office practice, not sourced law or adjudication. */
export interface JudicialOfficeResponse {
  readonly key: string;
  readonly label: string;
  readonly statement: string;
  readonly recipient: JudicialRoleKey;
  readonly followUp: string | null;
}
export interface JudicialOfficeContent {
  readonly kernelId: JudicialKernelId;
  readonly title: string;
  readonly brief: string;
  readonly responses: readonly JudicialOfficeResponse[];
}
export const JUDICIAL_OFFICE_CONTENT: readonly JudicialOfficeContent[] = [
  {
    kernelId: "SEED-41",
    title: "Confidential draft transfer",
    brief:
      "The access log records a confidential office draft sent from the junior clerk's terminal to an outside account. The clerk and chief judge are included in the review.",
    responses: [
      {
        key: "request-account",
        label: "Ask the clerk for an account of the transfer",
        statement: "Please explain the transfer recorded in the access log.",
        recipient: "junior-law-clerk",
        followUp: "Prepare questions about the draft-transfer log",
      },
      {
        key: "request-review",
        label: "Ask the chief judge to review the log",
        statement:
          "Please review this access log with me before any personnel action is considered.",
        recipient: "chief-judge",
        followUp: "Prepare the draft-transfer log for review",
      },
    ],
  },
  {
    kernelId: "SEED-42",
    title: "Colleague's unfinished office work",
    brief:
      "A colleague has asked for help with overdue office work. The review records difficulty staying alert during office work and includes the overdue-work report. No medical diagnosis has been established.",
    responses: [
      {
        key: "offer-conversation",
        label: "Offer a private conversation",
        statement: "I can talk through the unfinished office work with you.",
        recipient: "colleague-judge",
        followUp: "Prepare a note about the colleague's reported difficulties",
      },
      {
        key: "involve-chief",
        label: "Ask for a meeting with the chief judge",
        statement: "Let's discuss the office workload with the chief judge.",
        recipient: "chief-judge",
        followUp: "Prepare the overdue-work report for review",
      },
    ],
  },
  {
    kernelId: "SEED-43",
    title: "Complaint about access to chambers",
    brief:
      "A lawyer's written complaint and an office booking audit describe unequal access to appointments. The judicial assistant is included in the review.",
    responses: [
      {
        key: "ask-assistant",
        label: "Ask the assistant to explain the bookings",
        statement:
          "Please explain the appointment entries identified in this complaint.",
        recipient: "judicial-assistant",
        followUp: "Prepare questions about the disputed bookings",
      },
      {
        key: "ask-complainant",
        label: "Ask the lawyer to identify the disputed entries",
        statement: "Please identify the booking entries you want reviewed.",
        recipient: "complaining-lawyer",
        followUp: "Prepare the disputed booking entries for review",
      },
    ],
  },
  {
    kernelId: "SEED-49",
    title: "Proposed household political event",
    brief:
      "Your spouse has proposed a political event at your shared home and asked to discuss it with an ethics adviser before making arrangements.",
    responses: [
      {
        key: "request-venue-change",
        label: "Ask your spouse to consider another venue",
        statement: "Would you consider holding the event somewhere else?",
        recipient: "spouse",
        followUp: "Prepare a note about the proposed event venue",
      },
      {
        key: "seek-guidance",
        label: "Ask the adviser for guidance",
        statement:
          "Please advise us about the proposed event before arrangements are made.",
        recipient: "ethics-advisor",
        followUp: "Prepare questions about the proposed household event",
      },
    ],
  },
  {
    kernelId: "SEED-50",
    title: "Confidential professional feedback",
    brief:
      "The bar liaison has supplied a confidential draft of written professional feedback for review with your assistant.",
    responses: [
      {
        key: "internal-practice-review",
        label: "Review the comments with your assistant",
        statement: "Let's review the written comments together.",
        recipient: "judicial-assistant",
        followUp: "Prepare the written feedback for an internal review",
      },
      {
        key: "private-committee-meeting",
        label: "Ask the liaison to discuss the comments",
        statement: "I would like to discuss the written comments privately.",
        recipient: "bar-liaison",
        followUp: "Prepare questions about the written feedback",
      },
      {
        key: "record-reading",
        label: "Keep a private note of your review",
        statement:
          "I have reviewed the written feedback and am keeping a private note.",
        recipient: "principal",
        followUp: null,
      },
    ],
  },
  {
    kernelId: "SEED-59",
    title: "Received conduct inquiry",
    brief:
      "The commission investigator has sent a formal conduct inquiry and a supporting written account, asking you for a response. No finding or deadline has been established.",
    responses: [
      {
        key: "consult-counsel",
        label: "Acknowledge receipt and ask to review the account with counsel",
        statement:
          "I have received the inquiry and would like to review the supporting account with counsel.",
        recipient: "commission-investigator",
        followUp: "Prepare questions for counsel about the received inquiry",
      },
      {
        key: "request-conference",
        label: "Request a confidential conversation",
        statement:
          "I would like a confidential conversation about the inquiry received.",
        recipient: "commission-investigator",
        followUp: "Prepare questions about the received inquiry",
      },
    ],
  },
];

/** These intake premises need actual court records, absent from this consumer. */
export const JUDICIAL_OFFICE_CONTEXT_GATES: Readonly<
  Record<string, readonly string[]>
> = {
  "SEED-04": ["court-proceeding-and-assigned-defense-counsel"],
  "SEED-08": [
    "court-case-and-filed-continuance-motion",
    "effective-jurisdiction-scheduling-rule",
  ],
  "SEED-45": ["court-case-and-pending-motion", "case-linked-pressure-event"],
  "SEED-48": [
    "court-proceeding-and-record-maker-assignment",
    "effective-jurisdiction-recording-rule",
  ],
};
export function judicialOfficeContent(
  id: JudicialKernelId,
): JudicialOfficeContent | undefined {
  return JUDICIAL_OFFICE_CONTENT.find((entry) => entry.kernelId === id);
}
