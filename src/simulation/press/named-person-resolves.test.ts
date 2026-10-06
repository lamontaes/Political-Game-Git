import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, World } from "../types";
import type { MediaOutletRecord } from "./records";
import { headlineFor } from "./story-voice";

describe("names in generated news resolve to saved people", () => {
  it("renders a recorded person's name from the event's person identity", () => {
    const seed = "b30-p3-named-person-resolves";
    const place = drawRandomPlace(seed);
    const created = smallWorld({ place: place.key, seed });
    const person = created.world.people[created.personId]!;
    const name = personName(person);
    const event = {
      id: "event:b30-p3-named-person" as EntityId,
      stableKey: `${seed}:event`,
      type: "fixture.public-person-named" as HistoricalEvent["type"],
      summary: `${name} spoke at a public meeting.`,
      visibility: "public",
      jurisdictionId: created.jurisdictionId,
      participants: [{ personId: created.personId, role: "focus:subject" }],
      involvedEntityIds: [created.personId],
      tags: [],
    } as unknown as HistoricalEvent;
    const outlet = {
      kind: "media-outlet",
      name: "The Local Ledger",
      product: "general-newspaper",
      scope: "local",
      mediums: ["text"],
      resourceTier: "standard",
    } as MediaOutletRecord;

    const headline = headlineFor(created.world as World, event, outlet);
    const personId = event.participants[0]!.personId;

    expect(created.world.people[personId]).toBe(person);
    expect(headline).toContain(name);
  });
});
