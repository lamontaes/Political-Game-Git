// STOPGAP(RULES3-CAM-001): see docs/plans/rules3/campaigns-stopgaps.json.
// Lifted unchanged from src/simulation/campaign-contact-calibration.ts; RULES-3, 2026-10-11.
import type {
  CampaignFieldReach,
  CampaignLifeForm,
} from "../../simulation/campaign-life-types";

export const FIELD_BENCHMARKS = {
  // PLACEHOLDER(wave2): Nickerson's contextual nonpartisan GOTV comparison
  // is applied to the game's candidate survey shift without an office factor.
  "door-canvass": {
    completedConversations: { min: 3, max: 8 },
    sourceObservationIds: ["volunteer-door-conversations"],
  },
  // PLACEHOLDER(wave2): this phone shift is treated as manual dialing until
  // the activity records an actual dialing mode and list quality.
  "phone-shift": {
    phoneDials: { min: 35, max: 35 },
    completedConversations: { min: 10, max: 15 },
    sourceObservationIds: ["blueprints-manual-phone"],
  },
} as const;

export function forMinutes(
  rate: { readonly min: number; readonly max: number },
  minutes: number,
): { readonly min: number; readonly max: number } {
  return {
    min: Math.floor((rate.min * minutes) / 60),
    max: Math.ceil((rate.max * minutes) / 60),
  };
}

export function modelCampaignFieldReach(
  form: CampaignLifeForm | "petition-circulation",
  minutes: number,
): CampaignFieldReach | null {
  if (
    form !== "door-canvass" &&
    form !== "phone-shift" &&
    form !== "petition-circulation"
  )
    return null;
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error("Completed field work requires positive whole minutes.");
  }
  // PLACEHOLDER(wave2): one candidate shift minute counts as one volunteer-
  // equivalent minute until staffing and participation have a measured rule.
  const benchmark =
    FIELD_BENCHMARKS[form === "petition-circulation" ? "door-canvass" : form];
  return {
    profileVersion: "research1-wave2-v1",
    volunteerEquivalentMinutes: minutes,
    estimatedDoorKnocks: null,
    estimatedPhoneDials:
      form === "phone-shift"
        ? forMinutes(FIELD_BENCHMARKS["phone-shift"].phoneDials, minutes)
        : null,
    estimatedCompletedConversations: forMinutes(
      benchmark.completedConversations,
      minutes,
    ),
    sourceObservationIds: [...benchmark.sourceObservationIds],
  };
}
