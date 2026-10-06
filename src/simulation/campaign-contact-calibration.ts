import type {
  CampaignFieldReach,
  CampaignLifeForm,
} from "./campaign-life-types";

/**
 * Research 1 packet #801, schema 1, observations as of 2026-09-27.
 * These are separate benchmark populations, not a measured conversion rate.
 * Door conversations: Nickerson (2006), page 17 contextual comparison.
 * Manual phone dials/conversations: Blueprints for Change, page 5.
 * The separately sourced door-knock goal is not joined to the conversation
 * benchmark because they have different populations and denominators.
 */
const FIELD_BENCHMARKS = {
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

function forMinutes(
  rate: { readonly min: number; readonly max: number },
  minutes: number,
): { readonly min: number; readonly max: number } {
  return {
    min: Math.floor((rate.min * minutes) / 60),
    max: Math.ceil((rate.max * minutes) / 60),
  };
}

/**
 * Save an explicit game projection from sourced per-volunteer-hour benchmarks.
 * The figures describe an estimated range, not identified voter encounters.
 */
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
  // Circulating a petition uses the same face-to-face conversation benchmark
  // as door canvassing. It is another form of field reach, not a second model.
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
