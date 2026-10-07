import type { DecisionOption } from "./types";

export type CoupleStage = "dating" | "cohabiting" | "married";

export interface CoupleStageChoice extends DecisionOption {
  readonly consent: "both" | "either" | "none";
  readonly minimumYearsTogether?: number;
}

/** CTO's recorded October 2 stage/consent contract. These are admission
 * rules, not outcome rates or a second decision-weight table. */
export const COUPLE_STAGE_CHOICES: Readonly<
  Record<CoupleStage, readonly CoupleStageChoice[]>
> = {
  dating: [
    {
      key: "stay",
      label: "Stay together",
      description: "Keep dating.",
      consent: "none",
    },
    {
      key: "break-up",
      label: "Break up",
      description: "End the relationship.",
      consent: "either",
    },
    {
      key: "move-in",
      label: "Move in together",
      description: "Share a home.",
      consent: "both",
      minimumYearsTogether: 0.5,
    },
    {
      key: "marry",
      label: "Marry",
      description: "Get married.",
      consent: "both",
    },
  ],
  cohabiting: [
    {
      key: "stay",
      label: "Stay together",
      description: "Keep living together.",
      consent: "none",
    },
    {
      key: "separate",
      label: "Separate",
      description: "Stop living together as a couple.",
      consent: "either",
    },
    {
      key: "marry",
      label: "Marry",
      description: "Get married.",
      consent: "both",
      minimumYearsTogether: 1,
    },
  ],
  married: [
    {
      key: "stay",
      label: "Stay together",
      description: "Stay together.",
      consent: "none",
    },
    {
      key: "separate",
      label: "Separate",
      description: "Separate; divorce requires its own legal steps.",
      consent: "either",
    },
  ],
};
