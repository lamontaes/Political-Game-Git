import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { ordinaryMeetingCommentConsiderationsForMember } from "./ordinary-meeting-presence";
import { recordWorldEvent } from "./world";
import type { EntityId } from "./types";

describe("ordinary meeting comment vote source", () => {
  it("returns only an explicitly linked comment heard by the member", () => {
    const world = createDemoWorld();
    const [speaker, member, absent] = world.personOrder;
    if (!speaker || !member || !absent) throw new Error("demo people missing");
    const commented = recordWorldEvent(world, {
      stableKey: "meeting-comment-test",
      type: "civic.meeting-public-comment",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [speaker, member],
      participants: [
        { personId: speaker, role: "agency:actor", detail: "support" },
        { personId: member, role: "observation:witness", detail: "heard" },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: ["position:support", "measure:measure-test"],
      summary: "A resident supported the measure.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "support",
        motivation: null,
        immediateReaction: null,
      },
    });
    const measureId = "measure-test" as EntityId;
    const reasons = ordinaryMeetingCommentConsiderationsForMember(
      commented,
      member,
      measureId,
    );
    expect(reasons).toHaveLength(1);
    expect(reasons[0]?.direction).toBe("supports");
    expect(
      ordinaryMeetingCommentConsiderationsForMember(
        commented,
        absent,
        measureId,
      ),
    ).toHaveLength(0);
    expect(
      ordinaryMeetingCommentConsiderationsForMember(
        commented,
        member,
        "another-measure" as EntityId,
      ),
    ).toHaveLength(0);
  });
});
