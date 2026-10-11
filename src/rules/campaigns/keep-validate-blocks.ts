// Lifted unchanged from src/simulation/campaign-routine.ts; RULES-3, 2026-10-11.
import type {
  CampaignRoutineBlock,
  CampaignRoutineWork,
} from "../../simulation/campaign-life-types";

export const CAMPAIGN_ROUTINE_WORK: Readonly<
  Record<
    CampaignRoutineWork,
    {
      readonly label: string;
      readonly locationKey: string;
      readonly locationLabel: string;
      readonly title: string;
      readonly summary: string;
    }
  >
> = {
  outreach: {
    label: "Knocking on doors",
    locationKey: "campaign-doors",
    locationLabel: "Somebody's street",
    title: "A field shift",
    summary:
      "The standing shift on the doors, talking to whoever answers. One way to learn what people are hearing.",
  },
  fundraising: {
    label: "Fundraising calls",
    locationKey: "campaign-call-desk",
    locationLabel: "The campaign's call desk",
    title: "A fundraising call session",
    summary:
      "The standing session on the phones, asking people who might give for something the campaign cannot do without.",
  },
  // Reuse the existing routine copy. The work kind drives petition asks; no
  // additional player-facing wording is introduced here.
  petition: {
    label: "Knocking on doors",
    locationKey: "campaign-doors",
    locationLabel: "Somebody's street",
    title: "A field shift",
    summary:
      "The standing shift on the doors, talking to whoever answers. One way to learn what people are hearing.",
  },
};

export function validateBlocks(blocks: readonly CampaignRoutineBlock[]): void {
  for (const block of blocks) {
    if (!(block.work in CAMPAIGN_ROUTINE_WORK))
      throw new Error("A routine session is either doors or phones.");
    if (
      block.weekdays.length === 0 ||
      block.weekdays.some(
        (day) => !Number.isSafeInteger(day) || day < 0 || day > 6,
      )
    )
      throw new Error("Pick at least one day of the week for each session.");
    if (
      !Number.isSafeInteger(block.startMinute) ||
      !Number.isSafeInteger(block.minutes) ||
      block.startMinute < 0 ||
      block.minutes <= 0 ||
      block.startMinute + block.minutes > 24 * 60
    )
      throw new Error(
        "A routine session has to start and end on the same day.",
      );
  }
  // Two sessions on the same day may not overlap: the hours are the
  // candidate's, and they cannot be in two places.
  for (let day = 0; day <= 6; day += 1) {
    const onDay = blocks
      .filter((block) => block.weekdays.includes(day))
      .sort((a, b) => a.startMinute - b.startMinute);
    for (let index = 1; index < onDay.length; index += 1) {
      const before = onDay[index - 1]!;
      if (before.startMinute + before.minutes > onDay[index]!.startMinute)
        throw new Error("Two routine sessions overlap on the same day.");
    }
  }
}
