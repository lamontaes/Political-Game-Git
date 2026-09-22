import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  ageOnDate,
  createCampaignElectionTransitionRegistry,
  createScenarioWorld,
  GAME_ADULT_CANDIDACY_AGE,
} from "../index";
import { KENTUCKY_CONTEXT } from "../legislation-scenarios";
import type { EntityId, HistoricalEvent, World } from "../types";
import { recordWorldEvent } from "../world";
import { newsworthiness, NATIONAL_REACH_SCALE, outletCovers } from "./desk";
import {
  ensurePressDeskSchedule,
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
  storyLeads,
} from "./index";

/**
 * DEPTH2 A07: newsworthiness is public consequence, not negativity. Every
 * weight reads what the event recorded; none reads whether it is good news,
 * and a place-bound event reaches a national outlet only through a federal
 * office it concerns or a scale it records.
 */

const KY = KENTUCKY_CONTEXT.jurisdiction.id;

function fixture(): World {
  const created = createScenarioWorld("a07-news", KENTUCKY_CONTEXT, {
    peopleCount: 5,
  });
  const playerId = created.personOrder.find(
    (id) =>
      ageOnDate(created.people[id]!.birthDate, created.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  let world: World = {
    ...created,
    control: { kind: "person", personId: playerId },
  };
  world = ensurePressMediaOpening(world, playerId);
  world = ensurePressStateCoverage(world, KY);
  return ensurePressDeskSchedule(world);
}

function record(
  world: World,
  key: string,
  type: string,
  tags: readonly string[],
  jurisdictionId: EntityId | null = KY,
): { world: World; event: HistoricalEvent } {
  const next = recordWorldEvent(world, {
    stableKey: `a07-test:${key}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [jurisdictionId ?? world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [...tags],
    summary: `A07 fixture: ${key}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, event: next.history.events.at(-1)! };
}

describe("DEPTH2 A07 newsworthiness", () => {
  it("weighs a gain and a loss of the same recorded scale the same", () => {
    const base = fixture();
    const state = mediaOutlets(base).find((o) => o.scope === "state")!;
    const worse = record(base, "worse", "international.development-reported", [
      "importance:notable",
    ]);
    const eased = record(
      worse.world,
      "eased",
      "international.development-eased",
      ["importance:notable"],
    );
    expect(newsworthiness(eased.world, state, worse.event).score).toBe(
      newsworthiness(eased.world, state, eased.event).score,
    );
  });

  it("ranks a recorded scale above a routine item on the same beat", () => {
    const base = fixture();
    const state = mediaOutlets(base).find((o) => o.scope === "state")!;
    const notice = record(base, "notice", "civic.meeting-notice", []);
    const flood = record(notice.world, "flood", "crisis.hazard-occurred", [
      "crisis",
      "magnitude:moderate",
    ]);
    const routine = newsworthiness(flood.world, state, notice.event);
    const judged = newsworthiness(flood.world, state, flood.event);
    expect(judged.reasons.map((reason) => reason.key)).toContain("scale");
    expect(judged.score).toBeGreaterThan(routine.score);
  });

  it("sends a state event to national outlets only for a federal office or a national scale", () => {
    const base = fixture();
    const national = mediaOutlets(base).find((o) => o.scope === "national")!;
    const minor = record(base, "minor", "crisis.hazard-occurred", [
      "magnitude:minor",
    ]);
    const catastrophic = record(
      minor.world,
      "catastrophic",
      "crisis.hazard-occurred",
      ["magnitude:catastrophic"],
    );
    const governor = record(
      catastrophic.world,
      "governor",
      "governing.matter-decided",
      ["office:us-ky-governor"],
    );
    const member = record(
      governor.world,
      "member",
      "crisis.officeholder-died",
      ["continuity:death", "office:us-house:KY-06"],
    );
    const world = member.world;
    expect(NATIONAL_REACH_SCALE).toBe(3);
    expect(outletCovers(world, national, minor.event)).toBe(false);
    expect(outletCovers(world, national, catastrophic.event)).toBe(true);
    expect(outletCovers(world, national, governor.event)).toBe(false);
    expect(outletCovers(world, national, member.event)).toBe(true);
    // The event keeps its place: it is national news about Kentucky.
    expect(member.event.jurisdictionId).toBe(KY);
  });

  it("puts a member of Congress dying in office before a national outlet on the next sweep", () => {
    const base = fixture();
    const national = mediaOutlets(base).filter((o) => o.scope === "national");
    const member = record(base, "member-dies", "crisis.officeholder-died", [
      "crisis",
      "continuity:death",
      "office:us-house:KY-06",
    ]);
    const handlers = createCampaignElectionTransitionRegistry();
    let world = member.world;
    for (let day = 0; day < 8; day += 1)
      world = advanceWorld(world, 1, handlers);
    const nationalIds = new Set(national.map((outlet) => outlet.id));
    expect(
      storyLeads(world).some(
        (lead) =>
          nationalIds.has(lead.outletId) &&
          lead.basisEventIds.includes(member.event.id),
      ),
    ).toBe(true);
  });
});
