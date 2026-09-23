import { describe, expect, it } from "vitest";
import type { EntityId } from "../simulation";
import {
  groupCampaignSessions,
  type CampaignSessionRecord,
} from "./campaign-projection";

function session(
  index: number,
  overrides: Partial<CampaignSessionRecord> = {},
): CampaignSessionRecord {
  return {
    id: `action-${index}` as EntityId,
    kind: "outreach",
    title: "Knocking on doors",
    on: `2026-${String(3 + Math.floor(index / 28)).padStart(2, "0")}-${String(1 + (index % 28)).padStart(2, "0")}`,
    done: true,
    outcome: "You spent the afternoon knocking on doors.",
    raised: null,
    spent: null,
    blockedBy: [],
    ...overrides,
  };
}

describe("the campaign log says a repeated session once", () => {
  it("collapses 300 identical sessions into one line with a count and span", () => {
    const sessions = Array.from({ length: 300 }, (_, index) => session(index));
    const groups = groupCampaignSessions(sessions);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      title: "Knocking on doors",
      count: 300,
      firstOn: sessions[0]!.on,
      outcome: "You spent the afternoon knocking on doors.",
    });
    expect(groups[0]!.lastOn > groups[0]!.firstOn).toBe(true);
  });

  it("keeps different work apart, and drops a sentence the sessions disagree on", () => {
    const groups = groupCampaignSessions([
      session(0),
      session(1, { outcome: "Nobody answered on Elm Street." }),
      session(2, {
        kind: "fundraising",
        title: "Calling donors",
        outcome: "You raised $120.",
      }),
    ]);
    expect(groups.map((group) => [group.title, group.count])).toEqual([
      ["Knocking on doors", 2],
      ["Calling donors", 1],
    ]);
    expect(groups[0]!.outcome).toBeNull();
    expect(groups[1]!.outcome).toBe("You raised $120.");
  });

  it("leaves a session that is waiting on somebody on its own line", () => {
    const groups = groupCampaignSessions([
      session(0, { done: false, blockedBy: ["Dinner with Ana"] }),
      session(1, { done: false, blockedBy: ["A shift at the store"] }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.blockedBy[0])).toEqual([
      "Dinner with Ana",
      "A shift at the store",
    ]);
  });
});
