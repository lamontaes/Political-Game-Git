import { describe, expect, it } from "vitest";
import { advanceWorld, createWorld, recordWorldEvent } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { makeIsoDate } from "../dates";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  referMeasure,
  replayMeasure,
  requestSenateConsentPassage,
} from "../legislation";
import { createFormationContext, recordPrinciples } from "../politics";
import { assertWorldIntegrity } from "../world";
import { applyInstitutionStep } from "./legislative-clock";
import { createStableId } from "../ids";
import { resolvePublicationSource } from "../public-information-integrity";
import { recordFiledProvision } from "../legislative-politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createLightweightPerson, createStartingPerson } from "../people";
import { congressSeats } from "../living-world/congress-seats";
import {
  LIVING_WORLD_OPENING_KEY,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_TENURE_EVENT,
} from "../living-world/opening";
import { seatedCongressChamber } from "./congress-chambers";
import { principledLeaning } from "./officeholder-principles";
import {
  reconciliationScope,
  recordBudgetInstructions,
  recordUnanimousConsent,
  congressProcedurePack,
  recordedCongressProcedure,
  SENATE_CONSENT_PASSAGE,
  SENATE_CONSENT_REQUEST,
  recordSenateConsentRequest,
  senateConsentRequestPermitsPassage,
} from "./congress-procedure";

// A small canonical rule fixture. This is not a watched-world acceptance run.
function bill(
  terms: readonly { key: string; answer: "yes" | "no" }[],
  withSenator = false,
  originChamberKey: "house" | "senate" = "house",
  secondSenator = false,
) {
  const input = {
    seed: "congress-procedure-rule-fixture",
    currentDate: makeIsoDate("2026-01-15"),
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    people: [],
    policyCatalog: createProductionPolicyCatalog(),
  };
  let world = createWorld(input);
  if (withSenator) {
    const senator = createStartingPerson({
      worldId: world.id,
      worldSeed: world.seed,
      currentDate: world.currentDate,
      homeJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      age: 45,
      givenName: "Morgan",
      familyName: "Fixture",
    });
    const other = secondSenator
      ? createLightweightPerson({
          worldId: world.id,
          worldSeed: world.seed,
          currentDate: world.currentDate,
          homeJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          index: 1,
        })
      : null;
    world = createWorld({
      ...input,
      people: other ? [senator, other] : [senator],
    });
    const event = {
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [senator.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public" as const,
      tags: [LIVING_WORLD_WRITER_VERSION, "test:partial-senate-fixture"],
      summary:
        "An explicit fictional seated-member fixture, not a full Senate.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    };
    world = recordWorldEvent(world, {
      ...event,
      stableKey: LIVING_WORLD_OPENING_KEY,
      type: "setup.living-world-opening",
    });
    const seats = congressSeats().filter((s) => s.chamberKey === "us-senate");
    for (const [i, person] of [senator, ...(other ? [other] : [])].entries()) {
      const seat = seats[i]!;
      world = recordWorldEvent(world, {
        ...event,
        stableKey: `test:senator:${seat.seatKey}`,
        type: SEAT_TENURE_EVENT,
        participants: [
          {
            personId: person.id,
            role: "focus:subject",
            detail: "Explicit fictional senator without recorded principles.",
          },
        ],
        involvedEntityIds: [person.id],
        tags: [...event.tags, `seat:${seat.seatKey}`],
      });
    }
  }
  const answers = terms.map((term) => {
    const propositionId = world.policyCatalog.propositionOrder.find(
      (id) => world.policyCatalog.propositions[id]!.stableKey === term.key,
    );
    if (!propositionId)
      throw new Error(`Fixture proposition absent: ${term.key}`);
    return { propositionId, answer: term.answer };
  });
  const introduced = introduceMeasure(world, {
    stableKey: "procedure-fixture:bill",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "H.R. 1",
    shortTitle: "Explicit procedure unit fixture",
    summary: "A fictional bill for validating the Senate procedure reader.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey,
    propositionIds: answers.map((a) => a.propositionId),
    propositionAnswers: answers,
  });
  return {
    world: introduced,
    measure: introduced.history.legislativeMeasures!.at(-1)!,
  };
}
const TAX = "us-federal-positions:tax.raise-top-income-tax-rate";
const AID = "us-federal-positions:foreign-affairs.increase-foreign-aid";

function recordedFixture(
  world: ReturnType<typeof bill>["world"],
  measure: ReturnType<typeof bill>["measure"],
  occurredAt = world.currentDate,
) {
  return recordWorldEvent(world, {
    stableKey: `congress-procedure/v1:${measure.id}`,
    type: "congress.procedure-adopted",
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["test:explicit-procedure-fixture", "procedure:reconciliation"],
    summary: "An explicit fictional adoption for the historical reader test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function consentFloor(withObjector = false) {
  const fixture = bill(
    [{ key: AID, answer: "yes" }],
    true,
    "senate",
    withObjector,
  );
  let world = fixture.world;
  const members = seatedCongressChamber(world, "senate")!.body.members;
  const answer = fixture.measure.propositionAnswers![0]!;
  const bearing =
    world.policyCatalog.propositions[answer.propositionId]!.principles![0]!;
  world = recordPrinciples(
    world,
    members.map((member, index) => ({
      stableKey: `officeholder-principles/v1:fixture:consent:${member.personId}`,
      personId: member.personId!,
      principleId: bearing.principleId,
      formedAt: world.currentDate,
      stance:
        (bearing.bearing === "consistent-with") === (index === 0)
          ? ("endorses" as const)
          : ("rejects" as const),
      conviction: "strong" as const,
      flexibility: "conditional" as const,
      qualification: null,
      formation: createFormationContext("other:unit-test", {
        note: "Explicit fictional Senate consent fixture.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  const committee = US_CONGRESS_RULE_PACK.chambers.find(
    (c) => c.chamberKey === "senate",
  )!.committees[0]!;
  world = referMeasure(world, {
    stableKey: "fixture:consent-referral",
    measureId: fixture.measure.id,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "fixture:consent-committee",
    measureId: fixture.measure.id,
    recommendation: "favorable",
    rationale: "The fictional committee reported the measure favorably.",
    dispositions: Array.from(
      { length: committee.appointedMembers },
      (_, i) => ({
        memberKey: `fictional-committee:${i}`,
        personId: null,
        disposition: "yea" as const,
      }),
    ),
    provenance: {
      method: "authored-fixture",
      note: "Explicit fictional committee decisions; not a consent roll call.",
      sourceEntityIds: [],
    },
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: "fixture:consent-calendar",
    measureId: fixture.measure.id,
  });
  return { ...fixture, world, requesterId: members[0]!.personId! };
}

describe("a budget-only Senate procedure", () => {
  it("requires a scored fiscal change, not a fiscal label or an empty bill", () => {
    const empty = bill([]);
    expect(reconciliationScope(empty.world, empty.measure)).toBe(false);
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(reconciliationScope(tax.world, tax.measure)).toBe(true);
    const unchanged = bill([{ key: TAX, answer: "no" }]);
    expect(reconciliationScope(unchanged.world, unchanged.measure)).toBe(false);
  });
  it("keeps recurring deficit increases outside this conservative budget window", () => {
    const aid = bill([{ key: AID, answer: "yes" }]);
    expect(reconciliationScope(aid.world, aid.measure)).toBe(false);
    const mixed = bill([
      { key: TAX, answer: "yes" },
      { key: AID, answer: "yes" },
    ]);
    expect(reconciliationScope(mixed.world, mixed.measure)).toBe(false);
  });
  it("keeps an unscored section on the ordinary route even when its bill also raises revenue", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    const withRider = recordFiledProvision(tax.world, {
      stableKey: "procedure-fixture:unscored-section",
      measureId: tax.measure.id,
      provisionKey: "unscored-rule",
      sectionNumber: 2,
      heading: "Independent regulatory rule",
      text: "This fictional unit-test clause has no registered fiscal effect.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "The regulated public",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
    });
    expect(reconciliationScope(withRider, tax.measure)).toBe(false);
    expect(recordBudgetInstructions(withRider, tax.measure)).toBe(withRider);
  });
  it("does not invent adopted instructions or consent without a seated Congress", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(recordBudgetInstructions(tax.world, tax.measure)).toBe(tax.world);
    expect(recordUnanimousConsent(tax.world, tax.measure)).toBe(tax.world);
    expect(recordedCongressProcedure(tax.world, tax.measure.id)).toBe(
      "ordinary",
    );
  });
  it("does not turn a seated senator's missing principle evidence into consent", () => {
    const tax = bill([{ key: TAX, answer: "yes" }], true);
    const members = seatedCongressChamber(tax.world, "senate")!.body.members;
    expect(members).toHaveLength(1);
    expect(
      principledLeaning(
        tax.world,
        members[0]!.personId!,
        tax.measure.propositionAnswers![0]!.propositionId,
      ),
    ).toEqual({ score: 0, recordIds: [] });
    const saved = serializeWorld(tax.world);
    expect(recordUnanimousConsent(tax.world, tax.measure)).toBe(tax.world);
    const reopened = deserializeWorld(saved);
    expect(recordUnanimousConsent(reopened, tax.measure)).toBe(reopened);
    expect(serializeWorld(reopened)).toBe(saved);
    expect(recordedCongressProcedure(reopened, tax.measure.id)).toBe(
      "ordinary",
    );
  });
  it("keeps ordinary cloture and changes only the Senate after a recorded procedure survives save/reopen", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    expect(
      congressProcedurePack(tax.world, tax.measure, US_CONGRESS_RULE_PACK),
    ).toBe(US_CONGRESS_RULE_PACK);
    // The unit fixture supplies the adoption event explicitly. Only an actual
    // chamber/instruction producer can establish this in watched acceptance.
    const recorded = recordWorldEvent(tax.world, {
      stableKey: `congress-procedure/v1:${tax.measure.id}`,
      type: "congress.procedure-adopted",
      occurredAt: tax.world.currentDate,
      recordedAt: tax.world.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [tax.measure.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["test:explicit-procedure-fixture", "procedure:reconciliation"],
      summary:
        "The unit fixture explicitly supplies adopted reconciliation instructions.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const reopened = deserializeWorld(serializeWorld(recorded));
    const pack = congressProcedurePack(
      reopened,
      tax.measure,
      US_CONGRESS_RULE_PACK,
    );
    expect(pack.chambers.find((c) => c.chamberKey === "house")).toBe(
      US_CONGRESS_RULE_PACK.chambers.find((c) => c.chamberKey === "house"),
    );
    const senate = pack.chambers.find((c) => c.chamberKey === "senate")!;
    expect(senate.floorStages.map((s) => s.stageKey)).toEqual(["passage"]);
    expect(senate.floorStages[0]!.vote).toEqual(
      US_CONGRESS_RULE_PACK.chambers
        .find((c) => c.chamberKey === "senate")!
        .floorStages.find((s) => s.stageKey === "passage")!.vote,
    );
    expect(
      US_CONGRESS_RULE_PACK.chambers
        .find((c) => c.chamberKey === "senate")!
        .floorStages.map((s) => s.stageKey),
    ).toEqual(["cloture", "passage"]);
  });

  it("does not let a later same-day adoption reinterpret earlier action boundaries", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    const recorded = recordedFixture(tax.world, tax.measure);
    const adoption = recorded.history.events.at(-1)!;
    const saved = serializeWorld(recorded);
    const reopened = deserializeWorld(saved);
    for (const world of [recorded, reopened]) {
      const before = {
        occurredAt: adoption.occurredAt,
        sequence: adoption.sequence,
      };
      expect(recordedCongressProcedure(world, tax.measure.id, before)).toBe(
        "ordinary",
      );
      expect(
        congressProcedurePack(
          world,
          tax.measure,
          US_CONGRESS_RULE_PACK,
          before,
        ),
      ).toBe(US_CONGRESS_RULE_PACK);
      expect(
        recordedCongressProcedure(world, tax.measure.id, {
          ...before,
          sequence: adoption.sequence + 1,
        }),
      ).toBe("reconciliation");
    }
    expect(serializeWorld(reopened)).toBe(saved);
  });

  it("requires both occurrence and recording dates to precede a historical read", () => {
    const tax = bill([{ key: TAX, answer: "yes" }]);
    const advanced = advanceWorld(tax.world, 1);
    for (const occurredAt of [tax.world.currentDate, advanced.currentDate]) {
      const recorded = recordedFixture(advanced, tax.measure, occurredAt);
      const reopened = deserializeWorld(serializeWorld(recorded));
      expect(
        recordedCongressProcedure(reopened, tax.measure.id, {
          occurredAt: tax.world.currentDate,
          sequence: reopened.history.nextSequence,
        }),
      ).toBe("ordinary");
      expect(recordedCongressProcedure(reopened, tax.measure.id)).toBe(
        "reconciliation",
      );
    }
  });
});

describe("request-grounded Senate passage without a roll call", () => {
  it("records the requester before the chair's passage, preserves votes and survives save/reopen", () => {
    const fixture = consentFloor();
    expect(
      measurePosition(fixture.world, fixture.measure.id).floorStageKey,
    ).toBe("cloture");
    const original = serializeWorld(fixture.world);
    const input = {
      stableKey: "fixture:consent",
      measureId: fixture.measure.id,
      requestedByPersonId: fixture.requesterId,
    };
    const passed = requestSenateConsentPassage(fixture.world, input);
    const request = passed.history.events.find(
      (e) => e.type === SENATE_CONSENT_REQUEST,
    )!;
    const event = passed.history.events.find(
      (e) => e.type === SENATE_CONSENT_PASSAGE,
    )!;
    const action = passed.history.legislativeActions!.at(-1)!;
    expect(request.participants[0]!.personId).toBe(fixture.requesterId);
    expect(request.sequence).toBeLessThan(event.sequence);
    expect(event.sequence).toBeLessThan(action.sequence);
    expect(event.tags).toContain(`consent-request:${request.id}`);
    expect(action.voteId).toBeNull();
    expect(action.floorStageKey).toBe("passage");
    expect(resolvePublicationSource(passed, event)).toEqual({
      kind: "legislative-development",
      sourceRecordIds: [fixture.measure.id, action.id].sort(),
    });
    expect(passed.history.legislativeVotes).toBe(
      fixture.world.history.legislativeVotes,
    );
    expect(measurePosition(passed, fixture.measure.id).phase).toBe(
      "awaiting-transmittal",
    );
    assertWorldIntegrity(passed);
    const reopened = deserializeWorld(serializeWorld(passed));
    expect(replayMeasure(reopened, fixture.measure.id).violations).toEqual([]);
    expect(requestSenateConsentPassage(reopened, input)).toBe(reopened);
    expect(serializeWorld(fixture.world)).toBe(original);
  });

  it("records a principle-grounded objection and keeps the ordinary cloture gate", () => {
    const fixture = consentFloor(true);
    const requested = requestSenateConsentPassage(fixture.world, {
      stableKey: "fixture:objected",
      measureId: fixture.measure.id,
      requestedByPersonId: fixture.requesterId,
    });
    expect(requested.history.events.at(-1)!.type).toBe(SENATE_CONSENT_REQUEST);
    expect(requested.history.events.at(-1)!.tags).toContain("outcome:objected");
    expect(
      requested.history.events
        .at(-1)!
        .tags.some((tag) => tag.startsWith("objector:")),
    ).toBe(true);
    expect(
      requested.history.events
        .at(-1)!
        .participants.some((p) => p.role === "agency:objector"),
    ).toBe(true);
    expect(requested.history.legislativeActions).toBe(
      fixture.world.history.legislativeActions,
    );
    expect(requested.history.legislativeVotes).toBe(
      fixture.world.history.legislativeVotes,
    );
    expect(measurePosition(requested, fixture.measure.id).floorStageKey).toBe(
      "cloture",
    );
    assertWorldIntegrity(requested);
  });

  it("refuses absent requesters, missing principles and an automatic player response", () => {
    const fixture = consentFloor();
    expect(
      requestSenateConsentPassage(fixture.world, {
        stableKey: "fixture:absent-requester",
        measureId: fixture.measure.id,
        requestedByPersonId: createStableId("person", "not-seated-fixture"),
      }),
    ).toBe(fixture.world);
    const missing = bill([{ key: AID, answer: "yes" }], true, "senate");
    const senator = seatedCongressChamber(missing.world, "senate")!.body
      .members[0]!.personId!;
    expect(
      recordSenateConsentRequest(missing.world, missing.measure, {
        stableKey: "fixture:no-principles-request",
        requestedByPersonId: senator,
      }),
    ).toBe(missing.world);
    const controlled = {
      ...fixture.world,
      control: { kind: "person" as const, personId: fixture.requesterId },
    };
    expect(
      requestSenateConsentPassage(controlled, {
        stableKey: "fixture:player-request",
        measureId: fixture.measure.id,
        requestedByPersonId: fixture.requesterId,
      }),
    ).toBe(controlled);
  });

  it("requires a fresh request after a same-day text change", () => {
    const fixture = consentFloor();
    const requested = recordSenateConsentRequest(
      fixture.world,
      fixture.measure,
      {
        stableKey: "fixture:text-request",
        requestedByPersonId: fixture.requesterId,
      },
    );
    const request = requested.history.events.at(-1)!;
    const changed = recordFiledProvision(requested, {
      stableKey: "fixture:text-added-after-request",
      measureId: fixture.measure.id,
      provisionKey: "new-text",
      sectionNumber: 1,
      heading: "Additional terms",
      text: "Explicit fictional text added after the recorded request.",
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "The public",
      },
      applicationScope: {
        jurisdictionId: fixture.measure.jurisdictionId,
        segmentKey: null,
      },
      answers: fixture.measure.propositionAnswers![0]!,
    });
    expect(
      senateConsentRequestPermitsPassage(changed, fixture.measure, request, {
        occurredAt: changed.currentDate,
        sequence: changed.history.nextSequence,
      }),
    ).toBe(false);
    expect(measurePosition(changed, fixture.measure.id).floorStageKey).toBe(
      "cloture",
    );
  });

  it("rejects a consent action that claims a vote or relies on a late request", () => {
    const fixture = consentFloor();
    const passed = requestSenateConsentPassage(fixture.world, {
      stableKey: "fixture:tamper-consent",
      measureId: fixture.measure.id,
      requestedByPersonId: fixture.requesterId,
    });
    const action = passed.history.legislativeActions!.at(-1)!;
    const withVote = {
      ...passed,
      history: {
        ...passed.history,
        legislativeActions: passed.history.legislativeActions!.map((a) =>
          a === action
            ? { ...a, voteId: passed.history.legislativeVotes![0]!.id }
            : a,
        ),
      },
    };
    expect(
      replayMeasure(withVote, fixture.measure.id).violations.join(" "),
    ).toContain("valid prior request");
    const late = {
      ...passed,
      history: {
        ...passed.history,
        events: passed.history.events.map((e) =>
          e.type === SENATE_CONSENT_REQUEST
            ? { ...e, sequence: action.sequence + 1 }
            : e,
        ),
      },
    };
    expect(
      replayMeasure(late, fixture.measure.id).violations.join(" "),
    ).toContain("valid prior request");
  });

  it("keeps earlier consent valid after the requester's principles change", () => {
    const fixture = consentFloor();
    const passed = requestSenateConsentPassage(fixture.world, {
      stableKey: "fixture:historical-consent",
      measureId: fixture.measure.id,
      requestedByPersonId: fixture.requesterId,
    });
    const held = passed.history.principles.find(
      (r) => r.personId === fixture.requesterId,
    )!;
    const changed = recordPrinciples(passed, [
      {
        stableKey: "fixture:later-opposition",
        personId: held.personId,
        principleId: held.principleId,
        formedAt: passed.currentDate,
        stance: held.stance === "endorses" ? "rejects" : "endorses",
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("other:unit-test", {
          note: "A later fictional change of mind.",
        }),
        supersedesPrincipleRecordId: held.id,
      },
    ]);
    expect(replayMeasure(changed, fixture.measure.id).violations).toEqual([]);
    expect(
      replayMeasure(
        deserializeWorld(serializeWorld(changed)),
        fixture.measure.id,
      ).violations,
    ).toEqual([]);
  });

  it("uses the production institution step to pass without adding a vote", () => {
    const fixture = consentFloor();
    const result = applyInstitutionStep(
      fixture.world,
      fixture.measure.id,
      () => {
        throw new Error("No executive action belongs at the Senate floor.");
      },
    );
    expect(result.kind).toBe("applied");
    if (result.kind !== "applied")
      throw new Error("The actual institution step did not apply.");
    expect(result.world.history.legislativeVotes).toBe(
      fixture.world.history.legislativeVotes,
    );
    expect(result.world.history.legislativeActions!.at(-1)!.voteId).toBeNull();
    expect(
      result.world.history.events.some(
        (e) => e.type === SENATE_CONSENT_PASSAGE,
      ),
    ).toBe(true);
    expect(measurePosition(result.world, fixture.measure.id).phase).toBe(
      "awaiting-transmittal",
    );
    assertWorldIntegrity(result.world);
  });

  it("takes an ordinary recorded roll call on the institution step after an objection", () => {
    const fixture = consentFloor(true);
    const result = applyInstitutionStep(
      fixture.world,
      fixture.measure.id,
      () => {
        throw new Error("The Senate floor cannot call the executive handler.");
      },
    );
    expect(result.kind).toBe("applied");
    if (result.kind !== "applied")
      throw new Error("The ordinary vote did not apply.");
    const vote = result.world.history.legislativeVotes!.at(-1)!;
    expect(result.world.history.legislativeVotes).toHaveLength(
      fixture.world.history.legislativeVotes!.length + 1,
    );
    expect(vote.purpose).toBe("floor-stage");
    expect(vote.floorStageKey).toBe("cloture");
    expect(vote.dispositions.map((d) => d.personId).sort()).toEqual(
      fixture.world.personOrder.slice().sort(),
    );
    expect(result.world.history.legislativeActions!.at(-1)!.voteId).toBe(
      vote.id,
    );
    expect(
      result.world.history.events.some(
        (e) => e.type === SENATE_CONSENT_PASSAGE,
      ),
    ).toBe(false);
    expect(
      result.world.history.events.some(
        (e) =>
          e.type === SENATE_CONSENT_REQUEST &&
          e.tags.includes("outcome:objected"),
      ),
    ).toBe(true);
    assertWorldIntegrity(result.world);
  });
});
