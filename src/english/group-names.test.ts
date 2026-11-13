import { describe, expect, it } from "vitest";
import { causeGroupForm, causeGroupName } from "./group-names";
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
  // A founded group's name keeps its capitals and its number (P2, Fruitland,
  // Idaho, Nov 13: "The friends of policing backs Clara Evans").
  it("knows the form a name was made from and the verb it takes", () => {
    expect(causeGroupForm("Friends of policing")).toEqual({ plural: true });
    expect(causeGroupForm("Neighbors Concerned About rental rules")).toEqual({
      plural: true,
    });
    expect(causeGroupForm("Coalition for clean water")).toEqual({
      plural: false,
    });
    expect(causeGroupForm("the Republican Party")).toBeNull();
  });
});
