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

export function describeCampaignRoutine(
  blocks: readonly CampaignRoutineBlock[],
): string {
  if (blocks.length === 0) return "No standing campaign hours.";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return blocks
    .map((block) => {
      const hour = (minute: number) => {
        const h = Math.floor(minute / 60);
        const m = minute % 60;
        const twelve = h % 12 === 0 ? 12 : h % 12;
        return `${twelve}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "a.m." : "p.m."}`;
      };
      return `${CAMPAIGN_ROUTINE_WORK[block.work].label}, ${block.weekdays
        .map((day) => names[day])
        .join(
          ", ",
        )}, ${hour(block.startMinute)} to ${hour(block.startMinute + block.minutes)}`;
    })
    .join("; ");
}
