import { describe, expect, it } from "vitest";
import causes from "../../data/english/group-causes.json" with { type: "json" };
import {
  causeGroupForm,
  causeGroupName,
  stanceGroupForm,
  stanceGroupName,
} from "./group-names";
import { allQuestions } from "./policy-names";

describe("cause group names", () => {
  it("names a group from its topic, the same way every time, with no key in it", () => {
    const topic = allQuestions()[0]!;
    const key = `organization:cause-group:person-1:drive-${topic}`;
    const name = causeGroupName(key, topic);
    expect(name).toBeTruthy();
    expect(name).toBe(causeGroupName(key, topic));
    expect(name).not.toMatch(/[:_]/);
    // Cased whole, like any name: every word of the topic but the small ones.
    expect(name).toMatch(/^[A-Z]/);
    for (const word of name!.split(" "))
      if (
        ![
          "a",
          "an",
          "and",
          "for",
          "in",
          "of",
          "on",
          "or",
          "the",
          "to",
        ].includes(word)
      )
        expect(word.charAt(0), name!).toBe(word.charAt(0).toUpperCase());
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

  // A group formed over a stance is named from the cause its side would put
  // on a sign (Words lead, Nov 14; data/english/group-causes.json).
  describe("stance group names", () => {
    const rows = Object.entries(causes.questions);
    const idOf = (key: string, side: string) =>
      `organization:group:jurisdiction_x:us-policy-positions:topic.${key}:${side}`;
    const BANNED = /Citizens' Council|\bWatch\b|Concerned About|\bagainst\b/i;

    it("names every question on both sides from that side's own causes", () => {
      expect(rows.length).toBeGreaterThanOrEqual(73);
      for (const [key, row] of rows)
        for (const side of ["for", "against"] as const) {
          const made = stanceGroupName(
            idOf(key, side),
            `us-policy-positions:topic.${key}`,
            "Laurel",
          );
          expect(made, `${key} ${side}`).toBeTruthy();
          const own = row[side];
          const other = row[side === "for" ? "against" : "for"];
          expect(
            own.some((cause) => made!.name.includes(cause)),
            `${key} ${side}: ${made!.name}`,
          ).toBe(true);
          expect(
            other.some((cause) => made!.name.includes(cause)),
            `${key} ${side} says the other side's cause: ${made!.name}`,
          ).toBe(false);
          expect(made!.name, key).not.toMatch(BANNED);
          expect(
            (made!.name.match(/\bfor\b/g) ?? []).length,
            made!.name,
          ).toBeLessThanOrEqual(1);
          expect(stanceGroupForm(made!.name), made!.name).toEqual({
            plural: made!.plural,
          });
        }
    });

    it("gives no two groups of one town the same name, for every question and side", () => {
      const taken = new Set<string>();
      for (const [key] of rows)
        for (const side of ["for", "against"] as const) {
          const made = stanceGroupName(
            idOf(key, side),
            `us-policy-positions:topic.${key}`,
            "Laurel",
            taken,
          );
          expect(made, `${key} ${side}`).toBeTruthy();
          expect(taken.has(made!.name), made!.name).toBe(false);
          taken.add(made!.name);
        }
      expect(taken.size).toBe(rows.length * 2);
      // No name says "for" twice (Words lead, Nov 14): a form ending in "for"
      // never takes a cause that holds one, so the namer moves to the next form.
      for (const name of taken)
        expect((name.match(/\bfor\b/g) ?? []).length, name).toBeLessThanOrEqual(
          1,
        );
    });

    it("holds a cause for every platform question the catalog has", () => {
      const missing = allQuestions().filter(
        (q) => !(q.slice(q.lastIndexOf(".") + 1) in causes.questions),
      );
      expect(missing).toEqual([]);
    });

    it("keeps a group's name the same each time, and says nothing for a question with no cause", () => {
      const id = idOf("rent-stabilization", "for");
      const question = "us-policy-positions:topic.rent-stabilization";
      expect(stanceGroupName(id, question, "Laurel")).toEqual(
        stanceGroupName(id, question, "Laurel"),
      );
      expect(stanceGroupName(id, "no-such-question", "Laurel")).toBeNull();
    });
  });
});
