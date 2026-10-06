import type { OfficeCaseworkWorkflowMode } from "../simulation";

/** One shared casework preference list for onboarding and the office desk. */
export const OFFICE_CASEWORK_CHOICES: readonly {
  readonly mode: OfficeCaseworkWorkflowMode;
  readonly label: string;
  readonly detail: string;
}[] = [
  {
    mode: "staff-routine-player-exceptions",
    label: "Staff handle routine requests; bring exceptions to me",
    detail:
      "Ordinary constituent work stays with the people who already work here. Unusual or contested requests come to you.",
  },
  {
    mode: "player-handles-all",
    label: "I will handle constituent work myself",
    detail: "Staff may still brief. They do not take the case unless you ask.",
  },
  {
    mode: "staff-handles-and-briefs",
    label: "Staff handle the casework and brief me",
    detail:
      "The office works the file and tells you what they did. You can change this later.",
  },
];
