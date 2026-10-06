import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { personName } from "../people";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { PRESS_POLICY_VERSION, type MediaOutletRecord } from "./records";
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
    const outlet: MediaOutletRecord = {
      id: "media-outlet:local-ledger" as EntityId,
      stableKey: `${seed}:outlet`,
      sequence: 1,
      recordedAt: "2026-01-01" as IsoDate,
      kind: "media-outlet",
      organizationId: "organization:local-ledger" as EntityId,
      name: "The Local Ledger",
      product: "general-newspaper",
      scope: "local",
      primaryJurisdictionIds: [created.jurisdictionId],
      mediums: ["text"],
      beats: ["general-assignment", "local-government"],
      resourceTier: "standard",
      cadence: "daily",
      acceptsDeepBackground: false,
      establishedAt: "2026-01-01" as IsoDate,
      policyVersion: PRESS_POLICY_VERSION,
      provenanceNote: "Test fixture: a local general newspaper.",
    };

    const headline = headlineFor(created.world as World, event, outlet);
    const personId = event.participants[0]!.personId;

    expect(created.world.people[personId]).toBe(person);
    expect(headline).toContain(name);
  });
});
