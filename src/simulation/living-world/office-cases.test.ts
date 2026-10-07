import { describe, expect, it } from "vitest";

import { createDemoWorld } from "../demo";
import type { IsoDate } from "../types";
import { reviewTownCivicActions } from "./civic-actions";

describe("office cases opened from constituent contacts", () => {
  it("links each opened case to its contact, resident, official, and reason", () => {
    const initial = createDemoWorld("office-case-opened-from-contact");
    const people = Object.fromEntries(
      initial.personOrder.map((personId) => [
        personId,
        { ...initial.people[personId]!, birthDate: "1940-01-01" as IsoDate },
      ]),
    );
    const world = { ...initial, people };
    const residentId = world.personOrder[0]!;
    const town = world.people[residentId]!.homeJurisdictionId;
    const after = reviewTownCivicActions(world, town, null, "review-1");
    const contacts = after.history.events.filter(
      (event) => event.type === "life.contacted-official",
    );
    const cases = after.history.events.filter(
      (event) => event.type === "office.case-opened",
    );

    expect(contacts.length).toBeGreaterThan(0);
    expect(cases.length).toBeGreaterThan(0);
    for (const opened of cases) {
      const contactId = opened.tags
        .find((tag) => tag.startsWith("contact:"))
        ?.slice("contact:".length);
      const contact = contacts.find((event) => event.id === contactId);
      expect(contact).toBeDefined();
      expect(opened.stableKey).toBe(`office-case-opened:${contact!.id}`);
      expect(opened.participants.map((row) => row.personId)).toEqual(
        contact!.participants.map((row) => row.personId),
      );
      expect(opened.tags.some((tag) => tag.startsWith("reason:"))).toBe(true);
    }
  });
});
