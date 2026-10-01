import { describe, expect, it } from "vitest";
import { createStableId } from "./ids";
import { makeIsoDate } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { createOrganization } from "./life";
import { stateJurisdictionForKey } from "./life-places";
import { createLightweightPerson } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { deserializeWorld, serializeWorld } from "./serialization";
import { STATES } from "./state-reference";
import type { DecisionContext, EntityId } from "./types";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "./world";
import { applyForPermit, permitApplications, permitStatuses } from "./permits";

const questionKey =
  "us-policy-positions:justice-public-safety.permit-to-carry-concealed";
const seed = "team8-permit-applications-all56";
const selected = Object.keys(STATES).sort((a, b) =>
  createStableId("decision", `${seed}:${a}`).localeCompare(
    createStableId("decision", `${seed}:${b}`),
  ),
);
function fixture(
  usps: string,
  withAuthority = true,
  choice: "apply" | "wait" | null = "apply",
) {
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const date = makeIsoDate("2026-01-05");
  const person = createLightweightPerson({
    worldId: createWorldId(`${seed}:${usps}`),
    worldSeed: `${seed}:${usps}`,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed: `${seed}:${usps}`,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
    policyCatalog: createProductionPolicyCatalog(),
  });
  if (withAuthority)
    world = createOrganization(world, {
      stableKey: "fixture:actual-issuer",
      formedAt: date,
      detailLevel: "detailed",
      provenance: {
        kind: "authored",
        note: "Controlled actual authority record, not a claim of any state's legal issuer.",
      },
      initialProfile: {
        name: "Recorded fixture issuing authority",
        classification: "custom:permit-authority",
        locationJurisdictionId: state.id,
      },
    });
  const authority = world.history.organizations.at(-1);
  world = recordWorldEvent(world, {
    stableKey: "fixture:application-reason",
    type: "fixture.permit-need",
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: state.id,
    involvedEntityIds: [person.id],
    participants: [
      {
        personId: person.id,
        role: "agency:actor",
        detail: "Recorded fixture application consideration.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture:explicit-permit-interest"],
    summary: "Recorded fixture reason for considering an application.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const evidence = world.history.events.at(-1)!;
  const question = Object.values(world.policyCatalog.propositions).find(
    (q) => q.stableKey === questionKey,
  )!;
  const law = lawInForce(world, state.id, question.id, date);
  const decision: DecisionContext = {
    stableKey: "fixture:apply-decision",
    decisionType: "permit.apply",
    actorPersonId: person.id,
    cutoff: {
      asOfDate: date,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: {
      kind: "domain:permit-application",
      key: "fixture:concealed-carry",
      entityId: authority?.id ?? null,
    },
    options: [
      {
        key: "apply",
        label: "Apply",
        description: "Submit an actual permit application.",
      },
      {
        key: "wait",
        label: "Wait",
        description: "Do not submit an application.",
      },
    ],
    constraints: [],
    considerations: choice
      ? [
          {
            stableKey: "fixture:saved-consideration",
            optionKey: choice,
            sourceType: "context:recorded-interest",
            direction: "supports",
            importance: "strong",
            confidence: "high",
            explanation:
              "The actual saved fixture consideration favors this option.",
            sourceRefs: [{ kind: "historical-event", eventId: evidence.id }],
          },
        ]
      : [],
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  };
  const rule = {
    jurisdictionId: state.id,
    questionKey,
    permitKind: "fixture:concealed-carry",
    issuingAuthorityOrganizationKey: "fixture:actual-issuer",
    minimumAgeYears: 21,
    sourceUrl: "https://example.test/authored-permit-rule",
  };
  return {
    world,
    person,
    input: {
      stableKey: "fixture:permit-application",
      personId: person.id,
      law,
      rule,
      decision,
    },
  };
}
// Selection covers all56; only places with a real starting-law yes support the
// controlled application. No fixture authority/age is promoted to legal data.
const supported = selected
  .filter((usps) => fixture(usps).input.law?.answer === "yes")
  .slice(0, 5);
describe("actual decision-backed permit applications", () => {
  it.each(supported)(
    "saves an application without issuing a permit in %s",
    (usps) => {
      const { world, person, input } = fixture(usps);
      const result = applyForPermit(world, input);
      expect(result.status).toBe("applied");
      expect(permitApplications(result.world)).toHaveLength(1);
      expect(permitApplications(result.world)[0]).toMatchObject({
        personId: person.id,
        governingLawKey: input.law!.measureId,
        issuingAuthorityOrganizationId: input.decision.subject.entityId,
      });
      expect(permitStatuses(result.world)).toEqual([]);
      expect(result.world.history.lawPermissionRecords ?? []).toEqual([]);
      assertWorldIntegrity(result.world);
      const application = permitApplications(result.world)[0]!;
      const earlyIds = new Set<EntityId>();
      expect(() => assertPermitIntegrity(result.world, earlyIds)).not.toThrow();
      expect(earlyIds.has(application.id)).toBe(true);
      expect(() => assertPermitIntegrity(result.world, earlyIds)).toThrow(
        /identity/,
      );
      const payload = serializeWorld(result.world);
      const loaded = deserializeWorld(payload);
      expect(serializeWorld(loaded)).toBe(payload);
      const repeated = applyForPermit(loaded, input);
      expect(repeated.world).toBe(loaded);
      expect(repeated.applicationId).toBe(result.applicationId);
    },
  );
  it("keeps missing authority unsupported in all56 jurisdictions", () => {
    expect(selected).toHaveLength(56);
    for (const usps of selected) {
      const { world, input } = fixture(usps, false);
      const result = applyForPermit(world, input);
      expect(result.status).toBe("unsupported");
      expect(result.world).toBe(world);
      expect(permitApplications(result.world)).toEqual([]);
    }
  });
  it.each(["wait", null] as const)(
    "does not apply when the actual decision is %s",
    (choice) => {
      const { world, input } = fixture(supported[0]!, true, choice);
      const result = applyForPermit(world, input);
      expect(result.status).toBe(choice === null ? "undecided" : "declined");
      expect(result.world.history.decisionTraces).toHaveLength(
        choice === null ? 0 : 1,
      );
      expect(permitApplications(result.world)).toEqual([]);
      expect(permitStatuses(result.world)).toEqual([]);
      expect(
        applyForPermit(result.world, {
          ...input,
          decision: {
            ...input.decision,
            cutoff: {
              asOfDate: result.world.currentDate,
              historySequenceExclusive: result.world.history.nextSequence,
            },
          },
        }).world,
      ).toBe(result.world);
      expect(
        serializeWorld(deserializeWorld(serializeWorld(result.world))),
      ).toBe(serializeWorld(result.world));
    },
  );
});
