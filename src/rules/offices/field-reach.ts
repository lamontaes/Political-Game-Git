import type {
  CampaignFieldReach,
  CampaignLifeForm,
} from "../../simulation/campaign-life-types";
export interface FieldBenchmarks {
  readonly "door-canvass": {
    readonly completedConversations: {
      readonly min: number;
      readonly max: number;
    };
    readonly sourceObservationIds: readonly string[];
  };
  readonly "phone-shift": {
    readonly phoneDials: { readonly min: number; readonly max: number };
    readonly completedConversations: {
      readonly min: number;
      readonly max: number;
    };
    readonly sourceObservationIds: readonly string[];
  };
}
// stopgapId: "offices.petition-contact-order"
function forMinutes(
  rate: {
    readonly min: number;
    readonly max: number;
  },
  minutes: number,
): {
  readonly min: number;
  readonly max: number;
} {
  return {
    min: Math.floor((rate.min * minutes) / 60),
    max: Math.ceil((rate.max * minutes) / 60),
  };
}

export function modelCampaignFieldReach(
  form: CampaignLifeForm | "petition-circulation",
  minutes: number,
  FIELD_BENCHMARKS: FieldBenchmarks,
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
