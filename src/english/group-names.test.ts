import { describe, expect, it } from "vitest";
import { causeGroupName } from "./group-names";
import { allQuestions } from "./policy-names";

describe("cause group names", () => {
  it("names a group from its topic, the same way every time, with no key in it", () => {
    const topic = allQuestions()[0]!;
    const key = `organization:cause-group:person-1:drive-${topic}`;
    const name = causeGroupName(key, topic);
    expect(name).toBeTruthy();
    expect(name).toBe(causeGroupName(key, topic));
    expect(name).not.toMatch(/[:_]/);
  });
  it("says nothing for a topic with no name", () => {
    expect(
      causeGroupName("organization:cause-group:x:y", "no-such-topic"),
    ).toBeNull();
  });
});
