import { describe, expect, it } from "vitest";
import { createStableId } from "../ids";
import { agendaCaucus, majorityAgendaChoice } from "./majority-agenda";

const members = ["a", "b", "c", "d", "e"].map((key, i) => ({
  personId: createStableId("person", key),
  partyKey: i < 3 ? "majority" : "minority",
  views: i === 0 ? ["tax", "roads"] : i < 3 ? ["tax"] : ["roads"],
}));
const supports = (member: (typeof members)[number], proposal: string) =>
  member.views.includes(proposal);

describe("a majority's agenda", () => {
  it("rejects the strongest sponsor's bill without a majority of their caucus", () => {
    const caucus = agendaCaucus(members);
    const selected = majorityAgendaChoice(
      members,
      caucus,
      [
        { sponsor: members[0]!, proposal: "roads", pressure: 20 },
        { sponsor: members[1]!, proposal: "tax", pressure: 6 },
      ],
      supports,
    );
    expect(selected?.proposal).toBe("tax");
    expect(selected?.caucusBackers).toBe(3);
    expect(selected?.chamberBackers).toBe(3);
  });
  it("files nothing when caucus backing fails to reach a chamber majority", () => {
    const split = members.map((m, i) => ({
      ...m,
      partyKey: i < 2 ? "plurality" : `other-${i}`,
    }));
    expect(
      majorityAgendaChoice(
        split,
        agendaCaucus(split),
        [{ sponsor: split[0]!, proposal: "bill", pressure: 9 }],
        (m) => m.partyKey === "plurality",
      ),
    ).toBeNull();
  });
  it("lets a nonpartisan body weigh its members without inventing a party", () => {
    const nonpartisan = members.map((m) => ({ ...m, partyKey: null }));
    expect(agendaCaucus(nonpartisan)).toEqual(nonpartisan);
  });
});
