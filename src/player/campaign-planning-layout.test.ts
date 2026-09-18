import { describe, expect, it } from "vitest";

import {
  campaignPlanningLayout,
  isPrimaryCampaignPlanningSlot,
  type CampaignPlanningInput,
  type CampaignPlanningSlot,
} from "./campaign-planning-layout";

const ALL: CampaignPlanningInput = {
  weekPlanAvailable: true,
  detailedEditingAvailable: true,
  immediateActionsAvailable: true,
};

const SLOTS: readonly CampaignPlanningSlot[] = ["week", "detail", "immediate"];

/** Every combination of the three availability flags. */
function everyInput(): readonly CampaignPlanningInput[] {
  const inputs: CampaignPlanningInput[] = [];
  for (const week of [false, true]) {
    for (const detail of [false, true]) {
      for (const immediate of [false, true]) {
        inputs.push({
          weekPlanAvailable: week,
          detailedEditingAvailable: detail,
          immediateActionsAvailable: immediate,
        });
      }
    }
  }
  return inputs;
}

describe("campaignPlanningLayout", () => {
  it("draws the week first, then the editor, then the immediate action", () => {
    expect(campaignPlanningLayout(ALL).slots).toEqual([
      "week",
      "detail",
      "immediate",
    ]);
  });

  it("makes the weekly plan primary whenever there is one", () => {
    const layout = campaignPlanningLayout(ALL);
    expect(layout.primary).toBe("week");
    expect(isPrimaryCampaignPlanningSlot(layout, "week")).toBe(true);
    expect(isPrimaryCampaignPlanningSlot(layout, "detail")).toBe(false);
    expect(isPrimaryCampaignPlanningSlot(layout, "immediate")).toBe(false);
  });

  it("falls back to the immediate action when there is no weekly plan", () => {
    expect(
      campaignPlanningLayout({ ...ALL, weekPlanAvailable: false }).primary,
    ).toBe("immediate");
  });

  it("falls back to the editor only when nothing can be done now", () => {
    expect(
      campaignPlanningLayout({
        weekPlanAvailable: false,
        detailedEditingAvailable: true,
        immediateActionsAvailable: false,
      }).primary,
    ).toBe("detail");
  });

  it("has no primary, and nothing to draw, when the region is empty", () => {
    const layout = campaignPlanningLayout({
      weekPlanAvailable: false,
      detailedEditingAvailable: false,
      immediateActionsAvailable: false,
    });
    expect(layout.primary).toBeNull();
    expect(layout.slots).toEqual([]);
  });

  it("never marks two slots primary, for any availability", () => {
    for (const input of everyInput()) {
      const layout = campaignPlanningLayout(input);
      const primaries = SLOTS.filter((slot) =>
        isPrimaryCampaignPlanningSlot(layout, slot),
      );
      expect(primaries.length).toBeLessThanOrEqual(1);
    }
  });

  it("only ever marks a slot it actually draws, and marks one whenever it draws any", () => {
    for (const input of everyInput()) {
      const layout = campaignPlanningLayout(input);
      if (layout.primary === null) {
        expect(layout.slots).toEqual([]);
      } else {
        expect(layout.slots).toContain(layout.primary);
      }
    }
  });

  it("keeps the drawn slots in reading order for every availability", () => {
    for (const input of everyInput()) {
      const layout = campaignPlanningLayout(input);
      const expected = SLOTS.filter((slot) => layout.slots.includes(slot));
      expect(layout.slots).toEqual(expected);
    }
  });
});
