import { describe, expect, it } from "vitest";

import { createDemoWorld } from "../demo";
import {
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
} from "../policy";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { recordCivicMessage } from "./civic-actions";

describe("recorded civic messages", () => {
  it("keeps the contact reason and its source across all 56 jurisdictions", () => {
    let world = createDemoWorld("civic-message-reason-all-places");
    const domain = createPolicyDomainDefinition(
      "test:civic-message-all-places-domain",
      "Public services",
      "Public services in the town.",
    );
    const issue = createPolicyIssueDefinition(
      "test:civic-message-all-places-issue",
      domain.id,
      domain.name,
      "Local service decisions.",
    );
    const proposition = createPolicyPropositionDefinition(
      "test:civic-message-all-places-proposition",
      issue.id,
      "Keep the library open later",
      "Should the town keep its library open later?",
    );
    world = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        domains: { ...world.policyCatalog.domains, [domain.id]: domain },
        domainOrder: [...world.policyCatalog.domainOrder, domain.id],
        issues: { ...world.policyCatalog.issues, [issue.id]: issue },
        issueOrder: [...world.policyCatalog.issueOrder, issue.id],
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: proposition,
        },
        propositionOrder: [
          ...world.policyCatalog.propositionOrder,
          proposition.id,
        ],
      },
    };
    const [senderId, officialId] = world.personOrder;
    const sourceRecordId = world.history.events[0]!.id;
    expect(lifePlaceStateIdentities()).toHaveLength(56);

    for (const place of lifePlaceStateIdentities()) {
      const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey)!;
      const jurisdictionId = jurisdiction.id;
      world = {
        ...world,
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdictionId]: jurisdiction,
        },
        jurisdictionOrder: world.jurisdictionOrder.includes(jurisdictionId)
          ? world.jurisdictionOrder
          : [...world.jurisdictionOrder, jurisdictionId],
        people: {
          ...world.people,
          [senderId!]: {
            ...world.people[senderId!]!,
            homeJurisdictionId: jurisdictionId,
          },
        },
      };
      const stableKey = `civic-message:${place.usps}`;
      world = recordCivicMessage(world, {
        stableKey,
        jurisdictionId,
        senderId: senderId!,
        officialId: officialId!,
        propositionId: proposition.id,
        stance: "no",
        channel: "email",
        reason: { kind: "law-cost", sourceRecordIds: [sourceRecordId] },
      });

      const event = world.history.events.find(
        (row) => row.stableKey === stableKey,
      )!;
      expect(event.jurisdictionId, place.usps).toBe(jurisdictionId);
      expect(event.tags, place.usps).toContain("reason:law-cost");
      expect(event.tags, place.usps).toContain(
        `source-record:${sourceRecordId}`,
      );
    }
  });

  it("keeps the resident's stated topic, stance, channel and named recipient", () => {
    let world = createDemoWorld("session46-civic-message-record");
    const domain = createPolicyDomainDefinition(
      "test:civic-message-domain",
      "Public services",
      "Public services in the town.",
    );
    const issue = createPolicyIssueDefinition(
      "test:civic-message-issue",
      domain.id,
      domain.name,
      "Local service decisions.",
    );
    const proposition = createPolicyPropositionDefinition(
      "test:civic-message-proposition",
      issue.id,
      "Keep the library open later",
      "Should the town keep its library open later?",
    );
    world = {
      ...world,
      policyCatalog: {
        ...world.policyCatalog,
        domains: { ...world.policyCatalog.domains, [domain.id]: domain },
        domainOrder: [...world.policyCatalog.domainOrder, domain.id],
        issues: { ...world.policyCatalog.issues, [issue.id]: issue },
        issueOrder: [...world.policyCatalog.issueOrder, issue.id],
        propositions: {
          ...world.policyCatalog.propositions,
          [proposition.id]: proposition,
        },
        propositionOrder: [
          ...world.policyCatalog.propositionOrder,
          proposition.id,
        ],
      },
    };
    const [senderId, officialId] = world.personOrder;
    const jurisdictionId = world.people[senderId!]!.homeJurisdictionId;
    world = recordCivicMessage(world, {
      stableKey: "session46:civic-message:mail",
      jurisdictionId,
      senderId: senderId!,
      officialId: officialId!,
      propositionId: proposition.id,
      stance: "no",
      channel: "email",
      reason: { kind: "general-opinion", sourceRecordIds: [] },
    });

    const event = world.history.events.find(
      (row) => row.stableKey === "session46:civic-message:mail",
    )!;
    expect(event.participants.map((row) => row.personId)).toEqual([
      senderId,
      officialId,
    ]);
    expect(event.tags).toContain(
      `message-proposition:${proposition.stableKey}`,
    );
    expect(event.tags).toContain("message-stance:no");
    expect(event.tags).toContain("message-channel:email");
    expect(event.tags).toContain("reason:general-opinion");
  });
});
