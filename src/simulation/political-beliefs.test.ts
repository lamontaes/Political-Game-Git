import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_POLICY_IDS,
  addDays,
  advanceWorld,
  appendPersonFact,
  assertWorldIntegrity,
  campaignCommitmentHistory,
  createFormationContext,
  createPolicyCatalog,
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
  createDemoWorld,
  createWorld,
  dateAtAge,
  deserializeWorld,
  formedBeliefsInDomain,
  hasChangedPrivatePosition,
  hasEncounteredProposition,
  hasPracticalExperienceForSubject,
  latestPrivateBelief,
  latestPrinciple,
  latestCampaignCommitment,
  latestSubjectKnowledge,
  materializePerson,
  personHoldsPrinciple,
  privateBeliefHistory,
  privateOpinionState,
  privatePositionAtDate,
  privatePositionChangeDates,
  privatePositionChanges,
  privatelySupportsProposition,
  publicPositionAtDate,
  recordCampaignCommitment,
  recordClaim,
  recordEventKnowledge,
  recordMemory,
  recordPrinciple,
  recordPrivateBelief,
  recordPropositionExposure,
  recordPublicPosition,
  recordRelationshipInteraction,
  recordSubjectKnowledge,
  recordWorldEvent,
  relevantExperiencesForBelief,
  resolvedFormationProvenanceForBelief,
  serializeWorld,
  subjectKnowledgeProfile,
} from "./index";
import type { EntityId, IsoDate, Person, PolicyCatalog, World } from "./types";

function personId(world: World, index = 1): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error("Missing test person.");
  return id;
}

function person(world: World, id: EntityId): Person {
  const found = world.people[id];
  if (!found) throw new Error("Missing test person record.");
  return found;
}

function livedDate(world: World, id: EntityId, age = 18): IsoDate {
  return dateAtAge(person(world, id).birthDate, age);
}

function initialBelief(
  world: World,
  id: EntityId,
  propositionId: EntityId,
  stableKey: string,
  position: "support" | "oppose" | "uncertain" | "conflicted",
  overrides: {
    readonly conviction?: "tentative" | "moderate" | "strong" | "settled";
    readonly salience?: "low" | "moderate" | "high" | "central";
    readonly flexibility?: "open" | "negotiable" | "conditional" | "firm";
    readonly formedAt?: IsoDate;
  } = {},
): World {
  return recordPrivateBelief(world, {
    stableKey,
    personId: id,
    propositionId,
    formedAt: overrides.formedAt ?? livedDate(world, id),
    position,
    conviction: overrides.conviction ?? "moderate",
    salience: overrides.salience ?? "moderate",
    flexibility: overrides.flexibility ?? "negotiable",
    rationale: null,
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
}

function catalogValues<T>(
  records: Readonly<Record<string, T>>,
  order: readonly EntityId[],
): T[] {
  return order.flatMap((id) => {
    const value = records[id];
    return value ? [value] : [];
  });
}

describe("sparse political beliefs and principles", () => {
  it("supports an unusual combination without ideology or party normalization", () => {
    let world = createDemoWorld("unusual-belief-combination");
    const id = personId(world);
    const positions = [
      [SYNTHETIC_POLICY_IDS.propositions.collectiveBargaining, "support"],
      [SYNTHETIC_POLICY_IDS.propositions.abortionRestriction, "support"],
      [SYNTHETIC_POLICY_IDS.propositions.cleanElectricity, "support"],
      [SYNTHETIC_POLICY_IDS.propositions.concealedCarry, "support"],
      [SYNTHETIC_POLICY_IDS.propositions.defenseReadiness, "support"],
      [SYNTHETIC_POLICY_IDS.propositions.universalCoverage, "support"],
    ] as const;
    for (const [propositionId, position] of positions) {
      world = initialBelief(
        world,
        id,
        propositionId,
        `belief:unusual:${propositionId}`,
        position,
      );
    }

    expect(
      positions.map(([propositionId]) =>
        privatelySupportsProposition(world, id, propositionId),
      ),
    ).toStrictEqual([true, true, true, true, true, true]);
    expect(world.people[id]).not.toHaveProperty("ideology");
    expect(world.people[id]).not.toHaveProperty("partyBeliefs");
  });

  it("distinguishes never encountered, encountered without a view, formed uncertainty, conflict, tentativeness, low salience, and withholding", () => {
    let world = createDemoWorld("no-opinion-states");
    const id = personId(world, 2);
    const nuclear = SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment;
    const encountered = SYNTHETIC_POLICY_IDS.propositions.drugNegotiation;
    const monetary = SYNTHETIC_POLICY_IDS.propositions.monetaryFramework;
    const coverage = SYNTHETIC_POLICY_IDS.propositions.universalCoverage;
    const withheld = SYNTHETIC_POLICY_IDS.propositions.concealedCarry;

    expect(latestPrivateBelief(world, id, nuclear)).toBeUndefined();
    expect(privateOpinionState(world, id, nuclear)).toMatchObject({
      kind: "never-encountered",
    });
    expect(hasEncounteredProposition(world, id, nuclear)).toBe(false);
    expect(
      subjectKnowledgeProfile(
        world,
        id,
        SYNTHETIC_POLICY_IDS.subjects.nuclearPower,
      ),
    ).toBeUndefined();

    world = recordPropositionExposure(world, {
      stableKey: "exposure:no-opinion:encountered",
      personId: id,
      propositionId: encountered,
      encounteredAt: livedDate(world, id, 18),
      summary: "Encountered the proposal without forming a private view.",
      provenance: {
        kind: "manual",
        note: "Synthetic encounter used to distinguish absence states.",
      },
    });
    world = recordPropositionExposure(world, {
      stableKey: "exposure:no-opinion:withheld",
      personId: id,
      propositionId: withheld,
      encounteredAt: livedDate(world, id, 18),
      summary: "Encountered the proposal but withheld a later public answer.",
      provenance: {
        kind: "manual",
        note: "Synthetic encounter preceding public withholding.",
      },
    });
    world = initialBelief(
      world,
      id,
      monetary,
      "belief:no-opinion:uncertain",
      "uncertain",
      { conviction: "tentative", salience: "low", flexibility: "open" },
    );
    world = initialBelief(
      world,
      id,
      coverage,
      "belief:no-opinion:conflicted",
      "conflicted",
    );
    world = recordPublicPosition(world, {
      stableKey: "public:no-opinion:withheld",
      personId: id,
      propositionId: withheld,
      statedAt: livedDate(world, id, 19),
      stance: "withheld",
      statement: "I am withholding a public position.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });

    expect(latestPrivateBelief(world, id, monetary)).toMatchObject({
      position: "uncertain",
      conviction: "tentative",
      salience: "low",
    });
    expect(privateOpinionState(world, id, monetary)).toMatchObject({
      kind: "formed-belief",
    });
    expect(latestPrivateBelief(world, id, coverage)?.position).toBe(
      "conflicted",
    );
    expect(privateOpinionState(world, id, coverage)).toMatchObject({
      kind: "formed-belief",
    });
    expect(latestPrivateBelief(world, id, nuclear)).toBeUndefined();
    expect(privateOpinionState(world, id, encountered)).toMatchObject({
      kind: "encountered-no-formed-view",
    });
    expect(hasEncounteredProposition(world, id, encountered)).toBe(true);
    expect(latestPrivateBelief(world, id, withheld)).toBeUndefined();
    expect(privateOpinionState(world, id, withheld)).toMatchObject({
      kind: "encountered-no-formed-view",
    });
    expect(
      publicPositionAtDate(world, id, withheld, world.currentDate)?.stance,
    ).toBe("withheld");
  });

  it("lets closely related propositions retain different private positions", () => {
    let world = createDemoWorld("proposition-specific-beliefs");
    const id = personId(world);
    world = initialBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
      "belief:related:negotiation",
      "support",
    );
    world = initialBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
      "belief:related:cap",
      "oppose",
    );

    expect(
      latestPrivateBelief(
        world,
        id,
        SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
      )?.position,
    ).toBe("support");
    expect(
      latestPrivateBelief(
        world,
        id,
        SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
      )?.position,
    ).toBe("oppose");
    expect(
      world.policyCatalog.propositions[
        SYNTHETIC_POLICY_IDS.propositions.drugNegotiation
      ]?.parameters,
    ).not.toStrictEqual(
      world.policyCatalog.propositions[
        SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps
      ]?.parameters,
    );
  });

  it("keeps private support, public indecision, and an opposing campaign promise distinct", () => {
    let world = createDemoWorld("private-public-commitment");
    const id = personId(world);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.universalCoverage;
    world = initialBelief(
      world,
      id,
      propositionId,
      "belief:three-layers",
      "support",
    );
    world = recordPublicPosition(world, {
      stableKey: "public:three-layers",
      personId: id,
      propositionId,
      statedAt: livedDate(world, id, 19),
      stance: "undecided",
      statement: "I have not taken a public position on this proposal.",
      audience: "public",
      venue: "Synthetic press availability",
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
    world = recordCampaignCommitment(world, {
      stableKey: "commitment:three-layers",
      personId: id,
      propositionId,
      madeAt: livedDate(world, id, 20),
      stance: "oppose",
      level: "pledge",
      statement: "I promise to oppose this proposal during the campaign.",
      conditions: null,
      sourceEventId: null,
      supersedesCommitmentId: null,
    });

    expect(latestPrivateBelief(world, id, propositionId)?.position).toBe(
      "support",
    );
    expect(
      publicPositionAtDate(world, id, propositionId, world.currentDate)?.stance,
    ).toBe("undecided");
    expect(
      campaignCommitmentHistory(world, id, propositionId)[0],
    ).toMatchObject({ stance: "oppose", level: "pledge" });
  });

  it("stores append-only changes with reasons and trusted-cue provenance", () => {
    let world = createDemoWorld("belief-change-history");
    const id = personId(world);
    const trustedId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    world = initialBelief(
      world,
      id,
      propositionId,
      "belief:change:initial",
      "oppose",
      { formedAt: livedDate(world, id, 18) },
    );
    const prior = latestPrivateBelief(world, id, propositionId);
    if (!prior) throw new Error("Missing prior belief.");
    expect(() =>
      initialBelief(
        world,
        id,
        propositionId,
        "belief:change:unlinked",
        "support",
        { formedAt: livedDate(world, id, 22) },
      ),
    ).toThrow(/supersession/i);
    world = recordPrivateBelief(world, {
      stableKey: "belief:change:reconsidered",
      personId: id,
      propositionId,
      formedAt: livedDate(world, id, 22),
      position: "support",
      conviction: "tentative",
      salience: "high",
      flexibility: "open",
      rationale: "A trusted person's evidence prompted reconsideration.",
      formation: createFormationContext("cue:trusted", {
        cue: {
          kind: "person:social-contact",
          sourcePersonId: trustedId,
          sourceLabel: "Trusted colleague",
        },
        evidenceReference: "Synthetic briefing reference",
      }),
      supersedesBeliefId: prior.id,
    });

    const history = privateBeliefHistory(world, id, propositionId);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      supersedesBeliefId: history[0]?.id,
      formation: {
        reason: "cue:trusted",
        cue: { sourcePersonId: trustedId },
      },
    });
    expect(hasChangedPrivatePosition(world, id, propositionId)).toBe(true);
    expect(
      privatePositionAtDate(world, id, propositionId, livedDate(world, id, 20)),
    ).toBe("oppose");
    expect(
      privatePositionAtDate(world, id, propositionId, livedDate(world, id, 23)),
    ).toBe("support");
    expect(
      privatePositionChanges(world, id, propositionId).map(
        (record) => record.id,
      ),
    ).toStrictEqual([history[1]?.id]);
    expect(privatePositionChangeDates(world, id, propositionId)).toStrictEqual([
      livedDate(world, id, 22),
    ]);
  });

  it("allows broad principles to conflict without generating proposition positions", () => {
    let world = createDemoWorld("principles-no-inference");
    const id = personId(world);
    const before = world.history.privateBeliefs.length;
    for (const [key, principleId] of [
      ["markets", SYNTHETIC_POLICY_IDS.principles.marketRestraint],
      ["inequality", SYNTHETIC_POLICY_IDS.principles.reduceInequality],
    ] as const) {
      world = recordPrinciple(world, {
        stableKey: `principle:conflict:${key}`,
        personId: id,
        principleId,
        formedAt: livedDate(world, id),
        stance: "endorses",
        conviction: "strong",
        flexibility: "conditional",
        qualification: "Other principles can matter in a concrete case.",
        formation: createFormationContext("reflection:initial"),
        supersedesPrincipleRecordId: null,
      });
    }

    expect(
      personHoldsPrinciple(
        world,
        id,
        SYNTHETIC_POLICY_IDS.principles.marketRestraint,
      ),
    ).toBe(true);
    expect(
      personHoldsPrinciple(
        world,
        id,
        SYNTHETIC_POLICY_IDS.principles.reduceInequality,
      ),
    ).toBe(true);
    expect(world.history.privateBeliefs).toHaveLength(before);
  });

  it("resolves public positions, commitments, and principles through explicit supersession", () => {
    let world = createDemoWorld("political-record-supersession");
    const id = personId(world);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const principleId = SYNTHETIC_POLICY_IDS.principles.institutionalStability;

    world = recordPublicPosition(world, {
      stableKey: "public:supersession:first",
      personId: id,
      propositionId,
      statedAt: livedDate(world, id, 18),
      stance: "undecided",
      statement: "I remain undecided.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
    const firstPublic = world.history.publicPositions.at(-1);
    if (!firstPublic) throw new Error("Missing first public position.");
    world = recordPublicPosition(world, {
      stableKey: "public:supersession:second",
      personId: id,
      propositionId,
      statedAt: livedDate(world, id, 19),
      stance: "support",
      statement: "I now support the proposal.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: firstPublic.id,
    });

    world = recordCampaignCommitment(world, {
      stableKey: "commitment:supersession:first",
      personId: id,
      propositionId,
      madeAt: livedDate(world, id, 18),
      stance: "defer",
      level: "aspiration",
      statement: "I will study the proposal.",
      conditions: null,
      sourceEventId: null,
      supersedesCommitmentId: null,
    });
    const firstCommitment = world.history.campaignCommitments.at(-1);
    if (!firstCommitment) throw new Error("Missing first commitment.");
    world = recordCampaignCommitment(world, {
      stableKey: "commitment:supersession:second",
      personId: id,
      propositionId,
      madeAt: livedDate(world, id, 19),
      stance: "support",
      level: "pledge",
      statement: "I pledge to support the proposal.",
      conditions: null,
      sourceEventId: null,
      supersedesCommitmentId: firstCommitment.id,
    });

    world = recordPrinciple(world, {
      stableKey: "principle:supersession:first",
      personId: id,
      principleId,
      formedAt: livedDate(world, id, 18),
      stance: "conflicted",
      conviction: "tentative",
      flexibility: "open",
      qualification: null,
      formation: createFormationContext("reflection:initial"),
      supersedesPrincipleRecordId: null,
    });
    const firstPrinciple = world.history.principles.at(-1);
    if (!firstPrinciple) throw new Error("Missing first principle.");
    world = recordPrinciple(world, {
      stableKey: "principle:supersession:second",
      personId: id,
      principleId,
      formedAt: livedDate(world, id, 19),
      stance: "endorses",
      conviction: "strong",
      flexibility: "conditional",
      qualification: "Stability remains subject to democratic legitimacy.",
      formation: createFormationContext("reflection:reconsideration"),
      supersedesPrincipleRecordId: firstPrinciple.id,
    });

    expect(
      publicPositionAtDate(world, id, propositionId, world.currentDate),
    ).toMatchObject({
      stance: "support",
      supersedesPublicPositionId: firstPublic.id,
    });
    expect(latestCampaignCommitment(world, id, propositionId)).toMatchObject({
      stance: "support",
      level: "pledge",
      supersedesCommitmentId: firstCommitment.id,
    });
    expect(latestPrinciple(world, id, principleId)).toMatchObject({
      stance: "endorses",
      supersedesPrincipleRecordId: firstPrinciple.id,
    });
  });
});

describe("knowledge, expertise, and lived context", () => {
  it("permits deep expertise with an uncertain belief", () => {
    let world = createDemoWorld("expert-but-uncertain");
    const id = personId(world);
    const subjectId = SYNTHETIC_POLICY_IDS.subjects.monetaryPolicy;
    world = recordSubjectKnowledge(world, {
      stableKey: "knowledge:monetary:expert",
      personId: id,
      subjectId,
      recordedAt: livedDate(world, id, 21),
      familiarity: "deep",
      understanding: "expert",
      expertise: "specialist",
      practicalExperience: "direct",
      provenance: { kind: "study", reference: "Synthetic graduate study" },
      supersedesKnowledgeId: null,
    });
    world = initialBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.monetaryFramework,
      "belief:monetary:uncertain",
      "uncertain",
      { formedAt: livedDate(world, id, 22) },
    );

    expect(latestSubjectKnowledge(world, id, subjectId)).toMatchObject({
      understanding: "expert",
      expertise: "specialist",
    });
    expect(hasPracticalExperienceForSubject(world, id, subjectId)).toBe(true);
    expect(
      latestPrivateBelief(
        world,
        id,
        SYNTHETIC_POLICY_IDS.propositions.monetaryFramework,
      )?.position,
    ).toBe("uncertain");
  });

  it("permits strong conviction with low subject knowledge", () => {
    let world = createDemoWorld("strong-low-knowledge");
    const id = personId(world);
    const subjectId = SYNTHETIC_POLICY_IDS.subjects.nuclearPower;
    world = recordSubjectKnowledge(world, {
      stableKey: "knowledge:nuclear:minimal",
      personId: id,
      subjectId,
      recordedAt: livedDate(world, id, 18),
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "none",
      provenance: { kind: "manual", note: "Synthetic low-knowledge state." },
      supersedesKnowledgeId: null,
    });
    world = initialBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      "belief:nuclear:strong",
      "oppose",
      {
        conviction: "strong",
        flexibility: "firm",
        formedAt: livedDate(world, id, 19),
      },
    );

    expect(subjectKnowledgeProfile(world, id, subjectId)).toMatchObject({
      understanding: "minimal",
      expertise: "none",
    });
    expect(
      latestPrivateBelief(
        world,
        id,
        SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      ),
    ).toMatchObject({ position: "oppose", conviction: "strong" });
  });

  it("derives education understanding and occupation practice from separate biography facts", () => {
    let world = createDemoWorld("fact-derived-expertise");
    const beforeBeliefs = world.history.privateBeliefs.length;
    for (const id of world.personOrder) world = materializePerson(world, id);

    const candidates = world.personOrder.flatMap((id) => {
      const detailed = person(world, id);
      return detailed.detailLevel === "materialized"
        ? [{ id, facts: detailed.details.generatedFacts }]
        : [];
    });
    const educationFixture = candidates
      .flatMap(({ id, facts }) =>
        facts.flatMap((fact) =>
          fact.kind === "education"
            ? fact.subjectIds.map((subjectId) => ({
                id,
                fact,
                facts,
                subjectId,
              }))
            : [],
        ),
      )
      .find(
        ({ id, facts, subjectId }) =>
          facts.every(
            (fact) =>
              fact.kind !== "occupation" ||
              !fact.subjectIds.includes(subjectId),
          ) &&
          world.history.subjectKnowledge.every(
            (record) =>
              record.personId !== id || record.subjectId !== subjectId,
          ),
      );
    const occupationFixture = candidates
      .flatMap(({ id, facts }) =>
        facts.flatMap((fact) =>
          fact.kind === "occupation"
            ? fact.subjectIds.map((subjectId) => ({
                id,
                fact,
                facts,
                subjectId,
              }))
            : [],
        ),
      )
      .find(
        ({ id, facts, subjectId }) =>
          facts.every(
            (fact) =>
              fact.kind !== "education" || !fact.subjectIds.includes(subjectId),
          ) &&
          world.history.subjectKnowledge.every(
            (record) =>
              record.personId !== id || record.subjectId !== subjectId,
          ),
      );
    if (!educationFixture || !occupationFixture) {
      throw new Error(
        "Expected separate subject-bearing education and occupation fixtures.",
      );
    }

    expect(
      subjectKnowledgeProfile(
        world,
        educationFixture.id,
        educationFixture.subjectId,
      ),
    ).toMatchObject({
      familiarity: "familiar",
      understanding: "working",
      expertise: "basic",
      practicalExperience: "indirect",
      explicitRecordId: null,
      supportingFactIds: expect.arrayContaining([educationFixture.fact.id]),
    });
    expect(
      subjectKnowledgeProfile(
        world,
        occupationFixture.id,
        occupationFixture.subjectId,
      ),
    ).toMatchObject({
      familiarity: "deep",
      understanding: "advanced",
      expertise: "practitioner",
      practicalExperience: "direct",
      explicitRecordId: null,
      supportingFactIds: expect.arrayContaining([occupationFixture.fact.id]),
    });
    expect(world.history.privateBeliefs).toHaveLength(beforeBeliefs);
    expect(person(world, educationFixture.id)).not.toHaveProperty("ideology");
  });

  it("lets a latest explicit knowledge assessment revise an earlier level downward despite fact support", () => {
    let world = createDemoWorld("knowledge-downward-revision");
    const id = personId(world, 3);
    world = materializePerson(world, id);
    const detailed = person(world, id);
    if (detailed.detailLevel !== "materialized") {
      throw new Error("Expected a materialized person.");
    }
    const fact = detailed.details.generatedFacts.find(
      (candidate) =>
        (candidate.kind === "education" || candidate.kind === "occupation") &&
        candidate.subjectIds.length > 0,
    );
    if (!fact || (fact.kind !== "education" && fact.kind !== "occupation")) {
      throw new Error("Expected a subject-bearing fact.");
    }
    const subjectId = fact.subjectIds[0];
    if (!subjectId) throw new Error("Expected a subject-bearing fact.");

    world = recordSubjectKnowledge(world, {
      stableKey: "knowledge:revision:high",
      personId: id,
      subjectId,
      recordedAt: world.currentDate,
      familiarity: "deep",
      understanding: "expert",
      expertise: "authority",
      practicalExperience: "extensive",
      provenance: { kind: "person-facts", factIds: [fact.id] },
      supersedesKnowledgeId: null,
    });
    const earlier = latestSubjectKnowledge(world, id, subjectId);
    if (!earlier) throw new Error("Missing earlier knowledge record.");
    world = recordSubjectKnowledge(world, {
      stableKey: "knowledge:revision:lower",
      personId: id,
      subjectId,
      recordedAt: world.currentDate,
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "none",
      provenance: {
        kind: "manual",
        note: "Later assessment corrected an earlier overstatement.",
      },
      supersedesKnowledgeId: earlier.id,
    });

    expect(latestSubjectKnowledge(world, id, subjectId)).toMatchObject({
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "none",
      supersedesKnowledgeId: earlier.id,
    });
    expect(subjectKnowledgeProfile(world, id, subjectId)).toMatchObject({
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "none",
      explicitRecordId: latestSubjectKnowledge(world, id, subjectId)?.id,
      supportingFactIds: expect.arrayContaining([fact.id]),
    });
  });

  it("uses an event as immutable formation context without automatically dictating a belief", () => {
    let world = createDemoWorld("event-belief-context");
    const id = personId(world);
    const eventDate = livedDate(world, id, 17);
    const beforeBeliefs = world.history.privateBeliefs.length;
    world = recordWorldEvent(world, {
      stableKey: "life:minor-teen-experience",
      type: "personal.peer-group-choice",
      occurredAt: eventDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [id],
      participants: [
        { personId: id, role: "agency:actor", detail: "Made a choice" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["life.minor", "peer-pressure"],
      summary: "A minor teenage choice occurred under peer pressure.",
      context: {
        location: null,
        socialContext: "A small gathering of peers.",
        pressure: "Wanted to fit in.",
        choice: "Went along with the group.",
        motivation: "Social acceptance.",
        immediateReaction: "Regretted it afterward.",
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing context event.");
    const originalEvent = structuredClone(event);
    expect(world.history.privateBeliefs).toHaveLength(beforeBeliefs);

    world = recordSubjectKnowledge(world, {
      stableKey: "knowledge:event-context:direct",
      personId: id,
      subjectId: SYNTHETIC_POLICY_IDS.subjects.nuclearPower,
      recordedAt: livedDate(world, id, 18),
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "direct",
      provenance: { kind: "historical-events", eventIds: [event.id] },
      supersedesKnowledgeId: null,
    });

    world = recordPrivateBelief(world, {
      stableKey: "belief:event-context:initial",
      personId: id,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.concealedCarry,
      formedAt: livedDate(world, id, 18),
      position: "support",
      conviction: "tentative",
      salience: "low",
      flexibility: "open",
      rationale:
        "The event was one context considered, not a deterministic cause.",
      formation: createFormationContext("experience:lived", {
        relevantEventIds: [event.id],
      }),
      supersedesBeliefId: null,
    });
    const belief = latestPrivateBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.concealedCarry,
    );
    if (!belief) throw new Error("Missing context-linked belief.");

    const decadesLater = advanceWorld(world, 365 * 40);
    expect(relevantExperiencesForBelief(decadesLater, belief.id)).toStrictEqual(
      [originalEvent],
    );
    expect(
      decadesLater.history.events.find(
        (candidate) => candidate.id === event.id,
      ),
    ).toStrictEqual(originalEvent);
    expect(
      formedBeliefsInDomain(
        decadesLater,
        id,
        SYNTHETIC_POLICY_IDS.domains.firearms,
      ).map((record) => record.id),
    ).toContain(belief.id);
  });

  it("grounds belief formation in a person's imperfect knowledge instead of omniscient event truth", () => {
    let world = createDemoWorld("belief-imperfect-event-knowledge");
    const id = personId(world);
    const otherId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.concealedCarry;
    world = recordWorldEvent(world, {
      stableKey: "belief-provenance:event-observed-by-another",
      type: "personal.observed-by-another",
      occurredAt: livedDate(world, otherId, 18),
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [otherId],
      participants: [
        {
          personId: otherId,
          role: "presence:participant",
          detail: "Was present",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["belief-provenance"],
      summary: "An event occurred outside the believer's direct experience.",
      context: {
        location: null,
        socialContext: "A private encounter.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing provenance event.");

    expect(() =>
      recordPrivateBelief(world, {
        stableKey: "belief-provenance:omniscient",
        personId: id,
        propositionId,
        formedAt: world.currentDate,
        position: "support",
        conviction: "tentative",
        salience: "low",
        flexibility: "open",
        rationale: "Invalidly treats historical truth as personally available.",
        formation: createFormationContext("evidence:new", {
          relevantEventIds: [event.id],
        }),
        supersedesBeliefId: null,
      }),
    ).toThrow(/unavailable event/i);

    world = recordEventKnowledge(world, {
      stableKey: "belief-provenance:inaccurate-rumor",
      personId: id,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: "The believer heard a materially inaccurate version.",
      accuracy: "inaccurate",
      confidence: "medium",
      source: {
        kind: "rumor",
        sourcePersonId: otherId,
        chainDescription: "A secondhand social chain.",
      },
    });
    const knowledge = world.history.knowledge.at(-1);
    if (!knowledge) throw new Error("Missing imperfect event knowledge.");
    world = recordPrivateBelief(world, {
      stableKey: "belief-provenance:known-version",
      personId: id,
      propositionId,
      formedAt: world.currentDate,
      position: "support",
      conviction: "tentative",
      salience: "low",
      flexibility: "open",
      rationale: "Responds to what the believer heard, not omniscient truth.",
      formation: createFormationContext("evidence:new", {
        relevantEventIds: [event.id],
        eventKnowledgeIds: [knowledge.id],
      }),
      supersedesBeliefId: null,
    });

    expect(latestPrivateBelief(world, id, propositionId)).toMatchObject({
      formation: {
        relevantEventIds: [event.id],
        eventKnowledgeIds: [knowledge.id],
      },
    });
    expect(knowledge).toMatchObject({
      accuracy: "inaccurate",
      source: { kind: "rumor", sourcePersonId: otherId },
    });
  });

  it("resolves every structured formation source without parsing rationale prose", () => {
    let world = createDemoWorld("resolved-belief-formation-provenance");
    const id = personId(world);
    const otherId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.concealedCarry;
    const subjectId = SYNTHETIC_POLICY_IDS.subjects.healthcare;
    const fact = person(world, id).establishedFacts[0];
    if (!fact) throw new Error("Missing source biography fact.");

    world = recordWorldEvent(world, {
      stableKey: "belief-provenance:resolved:event",
      type: "personal.shared-policy-conversation",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [id, otherId],
      participants: [
        {
          personId: id,
          role: "presence:participant",
          detail: "Joined discussion",
        },
        {
          personId: otherId,
          role: "presence:participant",
          detail: "Joined discussion",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["belief-provenance"],
      summary: "Two people discussed a synthetic policy proposition.",
      context: {
        location: null,
        socialContext: "A small policy discussion.",
        pressure: null,
        choice: "The person chose to participate.",
        motivation: "Consider the proposal.",
        immediateReaction: "The person reserved judgment.",
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing formation event.");

    world = recordMemory(world, {
      stableKey: "belief-provenance:resolved:memory",
      personId: id,
      eventId: event.id,
      formedAt: world.currentDate,
      rememberedSummary: "A focused policy conversation.",
      interpretation: "Worth considering without treating it as decisive.",
      strength: "moderate",
      relevanceTags: ["belief-provenance"],
      supersedesMemoryId: null,
    });
    const memory = world.history.memories.at(-1);
    if (!memory) throw new Error("Missing formation memory.");

    world = recordEventKnowledge(world, {
      stableKey: "belief-provenance:resolved:event-knowledge",
      personId: id,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: event.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const eventKnowledge = world.history.knowledge.at(-1);
    if (!eventKnowledge) throw new Error("Missing formation event knowledge.");

    world = recordClaim(world, {
      stableKey: "belief-provenance:resolved:claim",
      speakerPersonId: id,
      eventId: event.id,
      madeAt: world.currentDate,
      audience: "limited",
      statement: "I heard the arguments and am considering them.",
      relationshipToTruth: "consistent",
      provenance: { kind: "direct-record" },
    });
    const claim = world.history.claims.at(-1);
    if (!claim) throw new Error("Missing formation claim.");

    world = recordRelationshipInteraction(world, {
      stableKey: "belief-provenance:resolved:relationship",
      personIds: [id, otherId],
      eventId: event.id,
      occurredAt: world.currentDate,
      kind: "experience:shared",
      change: "formed",
      significance: "minor",
      summary: "The policy discussion became a shared experience.",
      tags: ["belief-provenance"],
    });
    const interaction = world.history.relationshipInteractions.at(-1);
    if (!interaction) throw new Error("Missing formation interaction.");

    world = recordSubjectKnowledge(world, {
      stableKey: "belief-provenance:resolved:subject-knowledge",
      personId: id,
      subjectId,
      recordedAt: world.currentDate,
      familiarity: "familiar",
      understanding: "working",
      expertise: "basic",
      practicalExperience: "indirect",
      provenance: {
        kind: "manual",
        note: "Synthetic assessment used for formation provenance.",
      },
      supersedesKnowledgeId: null,
    });
    const subjectKnowledge = world.history.subjectKnowledge.at(-1);
    if (!subjectKnowledge)
      throw new Error("Missing formation subject knowledge.");

    world = recordPropositionExposure(world, {
      stableKey: "belief-provenance:resolved:exposure",
      personId: id,
      propositionId,
      encounteredAt: world.currentDate,
      summary: "Encountered the proposition during the policy discussion.",
      provenance: { kind: "direct-experience", eventId: event.id },
    });
    const exposure = world.history.propositionExposures.at(-1);
    if (!exposure) throw new Error("Missing formation exposure.");

    world = recordPrivateBelief(world, {
      stableKey: "belief-provenance:resolved:belief",
      personId: id,
      propositionId,
      formedAt: world.currentDate,
      position: "uncertain",
      conviction: "tentative",
      salience: "moderate",
      flexibility: "open",
      rationale: "A provisional view after considering several sources.",
      formation: createFormationContext("experience:lived", {
        relevantEventIds: [event.id],
        sourceFactIds: [fact.id],
        propositionExposureIds: [exposure.id],
        memoryIds: [memory.id],
        eventKnowledgeIds: [eventKnowledge.id],
        claimIds: [claim.id],
        relationshipInteractionIds: [interaction.id],
        subjectKnowledgeIds: [subjectKnowledge.id],
        evidenceReference: "Synthetic discussion notes",
        note: "No source mechanically determines the position.",
      }),
      supersedesBeliefId: null,
    });
    const belief = world.history.privateBeliefs.at(-1);
    if (!belief) throw new Error("Missing provenance-linked belief.");

    const resolved = resolvedFormationProvenanceForBelief(world, belief.id);
    expect(resolved).toMatchObject({
      events: [{ id: event.id }],
      facts: [{ id: fact.id }],
      propositionExposures: [{ id: exposure.id }],
      memories: [{ id: memory.id }],
      eventKnowledge: [{ id: eventKnowledge.id }],
      claims: [{ id: claim.id }],
      relationshipInteractions: [{ id: interaction.id }],
      subjectKnowledge: [{ id: subjectKnowledge.id }],
    });
  });
});

describe("political history integrity boundaries", () => {
  it("rejects a reported-by claim whose reporter is also its speaker", () => {
    let world = createDemoWorld("self-reported-claim");
    const id = personId(world);
    const otherId = personId(world, 2);
    world = recordWorldEvent(world, {
      stableKey: "self-reported-claim:event",
      type: "personal.claimed-event",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [id],
      participants: [
        {
          personId: id,
          role: "presence:participant",
          detail: "Was present",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["claim-provenance"],
      summary: "An event later described in a reported claim.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing reported-claim event.");
    const input = {
      stableKey: "self-reported-claim:record",
      speakerPersonId: id,
      eventId: event.id,
      madeAt: world.currentDate,
      audience: "limited" as const,
      statement: "A reporter attributed this account to the speaker.",
      relationshipToTruth: "consistent" as const,
      provenance: { kind: "reported-by" as const, reporterPersonId: id },
    };

    expect(() => recordClaim(world, input)).toThrow(/another person/i);
    world = recordClaim(world, {
      ...input,
      provenance: { ...input.provenance, reporterPersonId: otherId },
    });
    const tampered = structuredClone(world) as unknown as {
      history: {
        claims: Array<{
          speakerPersonId: EntityId;
          provenance: { kind: string; reporterPersonId: EntityId };
        }>;
      };
    };
    const claim = tampered.history.claims.at(-1);
    if (!claim) throw new Error("Missing valid reported-by claim.");
    claim.provenance.reporterPersonId = claim.speakerPersonId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /missing reporter/i,
    );
  });

  it("requires political source events to involve the person on the record date", () => {
    let world = createDemoWorld("political-source-event-provenance");
    const id = personId(world);
    const otherId = personId(world, 2);
    const recordEvent = (
      stableKey: string,
      occurredAt: IsoDate,
      involvedPersonId: EntityId,
    ) => {
      world = recordWorldEvent(world, {
        stableKey,
        type: "political.source-event",
        occurredAt,
        recordedAt: world.currentDate,
        jurisdictionId: world.jurisdictionOrder[0] ?? null,
        involvedEntityIds: [involvedPersonId],
        participants: [
          {
            personId: involvedPersonId,
            role: "presence:participant",
            detail: "Made a political statement",
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["political-source"],
        summary: "A synthetic political source event.",
        context: {
          location: null,
          socialContext: "A public appearance.",
          pressure: null,
          choice: "Addressed a policy proposition.",
          motivation: null,
          immediateReaction: null,
        },
      });
      const event = world.history.events.at(-1);
      if (!event) throw new Error("Missing political source event.");
      return event;
    };
    const unrelated = recordEvent(
      "political-source:unrelated",
      world.currentDate,
      otherId,
    );
    const mismatchedDate = recordEvent(
      "political-source:wrong-date",
      livedDate(world, id, 20),
      id,
    );
    const publicInput = {
      stableKey: "political-source:public",
      personId: id,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.cleanElectricity,
      statedAt: world.currentDate,
      stance: "support" as const,
      statement: "I support this proposal.",
      audience: "public" as const,
      venue: "Synthetic public appearance",
      sourceEventId: unrelated.id,
      supersedesPublicPositionId: null,
    };
    const commitmentInput = {
      stableKey: "political-source:commitment",
      personId: id,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps,
      madeAt: world.currentDate,
      stance: "oppose" as const,
      level: "pledge" as const,
      statement: "I pledge to oppose this proposal.",
      conditions: null,
      sourceEventId: unrelated.id,
      supersedesCommitmentId: null,
    };

    expect(() => recordPublicPosition(world, publicInput)).toThrow(
      /unavailable event/i,
    );
    expect(() => recordCampaignCommitment(world, commitmentInput)).toThrow(
      /unavailable event/i,
    );
    expect(() =>
      recordPublicPosition(world, {
        ...publicInput,
        sourceEventId: mismatchedDate.id,
      }),
    ).toThrow(/unavailable event/i);

    const valid = recordEvent("political-source:valid", world.currentDate, id);
    world = recordPublicPosition(world, {
      ...publicInput,
      sourceEventId: valid.id,
    });
    world = recordCampaignCommitment(world, {
      ...commitmentInput,
      sourceEventId: valid.id,
    });

    const tamperedPublic = structuredClone(world) as unknown as {
      history: { publicPositions: Array<{ sourceEventId: EntityId | null }> };
    };
    const publicPosition = tamperedPublic.history.publicPositions.at(-1);
    if (!publicPosition) throw new Error("Missing valid public position.");
    publicPosition.sourceEventId = unrelated.id;
    expect(() =>
      assertWorldIntegrity(tamperedPublic as unknown as World),
    ).toThrow(/invalid source event/i);

    const tamperedCommitment = structuredClone(world) as unknown as {
      history: {
        campaignCommitments: Array<{ sourceEventId: EntityId | null }>;
      };
    };
    const commitment = tamperedCommitment.history.campaignCommitments.at(-1);
    if (!commitment) throw new Error("Missing valid campaign commitment.");
    commitment.sourceEventId = unrelated.id;
    expect(() =>
      assertWorldIntegrity(tamperedCommitment as unknown as World),
    ).toThrow(/invalid source event/i);
  });

  it("isolates an appended fact from later caller mutation of subject IDs", () => {
    const base = createDemoWorld("person-fact-subject-isolation");
    const id = personId(base);
    const subjectIds: EntityId[] = [SYNTHETIC_POLICY_IDS.subjects.healthcare];
    const world = appendPersonFact(base, id, {
      stableKey: "education:caller-owned-subjects",
      kind: "education",
      occurredAt: livedDate(base, id, 18),
      endedAt: livedDate(base, id, 20),
      jurisdictionId: null,
      institution: "Synthetic community college",
      field: "health studies",
      credential: "associate degree",
      status: "completed",
      subjectIds,
      summary: "Completed a synthetic health-studies program.",
      provenance: {
        method: "manual",
        sourceEventId: null,
        note: "Input-isolation regression fixture.",
      },
    });

    subjectIds.push(SYNTHETIC_POLICY_IDS.subjects.nuclearPower);
    const fact = person(world, id).establishedFacts.find(
      (candidate) => candidate.stableKey === "education:caller-owned-subjects",
    );
    if (!fact || fact.kind !== "education") {
      throw new Error("Missing appended education fact.");
    }
    expect(fact.subjectIds).toStrictEqual([
      SYNTHETIC_POLICY_IDS.subjects.healthcare,
    ]);
    expect(() => assertWorldIntegrity(world)).not.toThrow();
  });

  it("rejects a trusted political cue sourced from the believer at runtime and integrity boundaries", () => {
    let world = createDemoWorld("self-sourced-trusted-cue");
    const id = personId(world);
    const otherId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const input = {
      stableKey: "self-source-cue:belief",
      personId: id,
      propositionId,
      formedAt: world.currentDate,
      position: "support" as const,
      conviction: "tentative" as const,
      salience: "moderate" as const,
      flexibility: "open" as const,
      rationale: "A view shaped by a trusted social cue.",
      formation: createFormationContext("cue:trusted", {
        cue: {
          kind: "person:social-contact",
          sourcePersonId: id,
          sourceLabel: "Trusted colleague",
        },
      }),
      supersedesBeliefId: null,
    };

    expect(() => recordPrivateBelief(world, input)).toThrow(/another person/i);
    world = recordPrivateBelief(world, {
      ...input,
      formation: createFormationContext("cue:trusted", {
        cue: {
          kind: "person:social-contact",
          sourcePersonId: otherId,
          sourceLabel: "Trusted colleague",
        },
      }),
    });
    const tampered = structuredClone(world) as unknown as {
      history: {
        privateBeliefs: Array<{
          personId: EntityId;
          formation: { cue: { sourcePersonId: EntityId | null } | null };
        }>;
      };
    };
    const belief = tampered.history.privateBeliefs.at(-1);
    if (!belief?.formation.cue) throw new Error("Missing valid trusted cue.");
    belief.formation.cue.sourcePersonId = belief.personId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /another person/i,
    );
  });

  it("rejects a trusted knowledge report sourced from its recipient at runtime and integrity boundaries", () => {
    let world = createDemoWorld("self-sourced-trusted-report");
    const id = personId(world);
    const otherId = personId(world, 2);
    const input = {
      stableKey: "self-source-report:knowledge",
      personId: id,
      subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
      recordedAt: world.currentDate,
      familiarity: "familiar" as const,
      understanding: "working" as const,
      expertise: "basic" as const,
      practicalExperience: "indirect" as const,
      provenance: {
        kind: "trusted-report" as const,
        sourcePersonId: id,
        reference: "Synthetic briefing",
      },
      supersedesKnowledgeId: null,
    };

    expect(() => recordSubjectKnowledge(world, input)).toThrow(
      /another person/i,
    );
    world = recordSubjectKnowledge(world, {
      ...input,
      provenance: { ...input.provenance, sourcePersonId: otherId },
    });
    const tampered = structuredClone(world) as unknown as {
      history: {
        subjectKnowledge: Array<{
          personId: EntityId;
          provenance: { kind: string; sourcePersonId: EntityId };
        }>;
      };
    };
    const knowledge = tampered.history.subjectKnowledge.at(-1);
    if (!knowledge) throw new Error("Missing valid trusted report.");
    knowledge.provenance.sourcePersonId = knowledge.personId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /unavailable source person/i,
    );
  });

  it("requires a superseding memory to be formed no earlier than its predecessor", () => {
    let world = createDemoWorld("memory-supersession-chronology");
    const id = personId(world);
    world = recordWorldEvent(world, {
      stableKey: "memory-chronology:event",
      type: "personal.remembered-event",
      occurredAt: livedDate(world, id, 18),
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [id],
      participants: [
        {
          personId: id,
          role: "presence:participant",
          detail: "Was present",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["memory-chronology"],
      summary: "An event later remembered more than once.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing memory chronology event.");
    world = recordMemory(world, {
      stableKey: "memory-chronology:first",
      personId: id,
      eventId: event.id,
      formedAt: livedDate(world, id, 20),
      rememberedSummary: "The first remembered account.",
      interpretation: "The event initially seemed minor.",
      strength: "moderate",
      relevanceTags: ["memory-chronology"],
      supersedesMemoryId: null,
    });
    const first = world.history.memories.at(-1);
    if (!first) throw new Error("Missing first memory.");
    const supersedingInput = {
      stableKey: "memory-chronology:second",
      personId: id,
      eventId: event.id,
      formedAt: livedDate(world, id, 21),
      rememberedSummary: "The later remembered account.",
      interpretation: "The event later seemed more important.",
      strength: "strong" as const,
      relevanceTags: ["memory-chronology"],
      supersedesMemoryId: first.id,
    };

    expect(() =>
      recordMemory(world, {
        ...supersedingInput,
        stableKey: "memory-chronology:invalid-earlier",
        formedAt: livedDate(world, id, 19),
      }),
    ).toThrow(/earlier-dated memory/i);

    world = recordMemory(world, supersedingInput);
    const tampered = structuredClone(world) as unknown as {
      history: { memories: Array<{ formedAt: IsoDate }> };
    };
    const second = tampered.history.memories.at(-1);
    if (!second) throw new Error("Missing valid superseding memory.");
    second.formedAt = livedDate(world, id, 19);
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /invalid chronology or supersession/i,
    );
  });

  it("rejects self-sourced told-by event knowledge at append and integrity boundaries", () => {
    let world = createDemoWorld("self-sourced-event-knowledge");
    const id = personId(world);
    const otherId = personId(world, 2);
    world = recordWorldEvent(world, {
      stableKey: "self-source-knowledge:event",
      type: "personal.secondhand-source-event",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [otherId],
      participants: [
        {
          personId: otherId,
          role: "presence:participant",
          detail: "Was present",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["provenance"],
      summary: "An event later described to another person.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing self-source test event.");
    const input = {
      stableKey: "self-source-knowledge:record",
      personId: id,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: "A secondhand description.",
      accuracy: "partial" as const,
      confidence: "medium" as const,
      source: { kind: "told-by" as const, sourcePersonId: id, claimId: null },
    };

    expect(() => recordEventKnowledge(world, input)).toThrow(/another person/i);
    world = recordEventKnowledge(world, {
      ...input,
      source: { ...input.source, sourcePersonId: otherId },
    });
    const tampered = structuredClone(world) as unknown as {
      history: {
        knowledge: Array<{
          personId: EntityId;
          source: { kind: string; sourcePersonId: EntityId };
        }>;
      };
    };
    const knowledge = tampered.history.knowledge.at(-1);
    if (!knowledge) throw new Error("Missing valid told-by knowledge.");
    knowledge.source.sourcePersonId = knowledge.personId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /missing source person/i,
    );
  });

  it("rejects self-sourced told-by proposition exposure at append and integrity boundaries", () => {
    let world = createDemoWorld("self-sourced-proposition-exposure");
    const id = personId(world);
    const otherId = personId(world, 2);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const input = {
      stableKey: "self-source-exposure:record",
      personId: id,
      propositionId,
      encounteredAt: world.currentDate,
      summary: "A proposal described by another person.",
      provenance: {
        kind: "told-by" as const,
        sourcePersonId: id,
        claimId: null,
      },
    };

    expect(() => recordPropositionExposure(world, input)).toThrow(
      /another person/i,
    );
    world = recordPropositionExposure(world, {
      ...input,
      provenance: { ...input.provenance, sourcePersonId: otherId },
    });
    const tampered = structuredClone(world) as unknown as {
      history: {
        propositionExposures: Array<{
          personId: EntityId;
          provenance: { kind: string; sourcePersonId: EntityId };
        }>;
      };
    };
    const exposure = tampered.history.propositionExposures.at(-1);
    if (!exposure) throw new Error("Missing valid told-by exposure.");
    exposure.provenance.sourcePersonId = exposure.personId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /unavailable source person/i,
    );
  });

  it("requires prior event access before an uninvolved person can form a memory", () => {
    let world = createDemoWorld("memory-access-boundary");
    const id = personId(world);
    const otherId = personId(world, 2);
    world = recordWorldEvent(world, {
      stableKey: "memory-access:event",
      type: "personal.private-other-event",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0] ?? null,
      involvedEntityIds: [otherId],
      participants: [
        {
          personId: otherId,
          role: "presence:participant",
          detail: "Was present",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["memory-access"],
      summary: "An event occurred without the later rememberer present.",
      context: {
        location: null,
        socialContext: "A private setting.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = world.history.events.at(-1);
    if (!event) throw new Error("Missing memory-access event.");
    const memoryInput = {
      stableKey: "memory-access:memory",
      personId: id,
      eventId: event.id,
      formedAt: world.currentDate,
      rememberedSummary: "A secondhand version of the event.",
      interpretation: "The account felt personally important.",
      strength: "moderate" as const,
      relevanceTags: ["memory-access"],
      supersedesMemoryId: null,
    };

    expect(() => recordMemory(world, memoryInput)).toThrow(
      /prior event knowledge/i,
    );
    world = recordEventKnowledge(world, {
      stableKey: "memory-access:knowledge",
      personId: id,
      eventId: event.id,
      learnedAt: world.currentDate,
      believedSummary: "A secondhand account of the event.",
      accuracy: "partial",
      confidence: "medium",
      source: {
        kind: "rumor",
        sourcePersonId: otherId,
        chainDescription: "The participant told mutual acquaintances.",
      },
    });
    world = recordMemory(world, memoryInput);
    expect(world.history.memories.at(-1)).toMatchObject({
      personId: id,
      eventId: event.id,
    });
  });

  it("treats formed beliefs, public speech, and campaign commitments as encounter evidence", () => {
    let world = createDemoWorld("implicit-proposition-encounters");
    const id = personId(world);
    const believed = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const spoken = SYNTHETIC_POLICY_IDS.propositions.concealedCarry;
    const promised = SYNTHETIC_POLICY_IDS.propositions.drugPriceCaps;
    world = initialBelief(
      world,
      id,
      believed,
      "implicit-encounter:belief",
      "support",
    );
    world = recordPublicPosition(world, {
      stableKey: "implicit-encounter:speech",
      personId: id,
      propositionId: spoken,
      statedAt: world.currentDate,
      stance: "withheld",
      statement: "I am not stating a view today.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
    world = recordCampaignCommitment(world, {
      stableKey: "implicit-encounter:commitment",
      personId: id,
      propositionId: promised,
      madeAt: world.currentDate,
      stance: "defer",
      level: "aspiration",
      statement: "I commit to reviewing the proposal.",
      conditions: null,
      sourceEventId: null,
      supersedesCommitmentId: null,
    });

    expect(
      world.history.propositionExposures.filter(
        (exposure) =>
          exposure.personId === id &&
          [believed, spoken, promised].includes(exposure.propositionId),
      ),
    ).toHaveLength(0);
    expect(hasEncounteredProposition(world, id, believed)).toBe(true);
    expect(privateOpinionState(world, id, spoken)).toMatchObject({
      kind: "encountered-no-formed-view",
      evidence: { kind: "public-position" },
    });
    expect(privateOpinionState(world, id, promised)).toMatchObject({
      kind: "encountered-no-formed-view",
      evidence: { kind: "campaign-commitment" },
    });
  });

  it("selects mixed encounter evidence by effective date rather than append order", () => {
    let world = createDemoWorld("backdated-proposition-encounter");
    const id = personId(world);
    const propositionId = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const exposureDate = livedDate(world, id, 18);
    const publicDate = world.currentDate;
    world = recordPublicPosition(world, {
      stableKey: "backdated-encounter:public-position",
      personId: id,
      propositionId,
      statedAt: publicDate,
      stance: "undecided",
      statement: "I remain publicly undecided.",
      audience: "public",
      venue: null,
      sourceEventId: null,
      supersedesPublicPositionId: null,
    });
    world = recordPropositionExposure(world, {
      stableKey: "backdated-encounter:earlier-exposure",
      personId: id,
      propositionId,
      encounteredAt: exposureDate,
      summary: "An earlier encounter was backfilled after the public record.",
      provenance: {
        kind: "manual",
        note: "Synthetic backdated encounter used to verify date ordering.",
      },
    });

    expect(privateOpinionState(world, id, propositionId)).toMatchObject({
      kind: "encountered-no-formed-view",
      evidence: { kind: "public-position", record: { statedAt: publicDate } },
    });
    expect(
      privateOpinionState(world, id, propositionId, livedDate(world, id, 20)),
    ).toMatchObject({
      kind: "encountered-no-formed-view",
      evidence: {
        kind: "proposition-exposure",
        record: { encounteredAt: exposureDate },
      },
    });
  });

  it("rejects malformed provenance, categories, chronology references, and family ordering", () => {
    let world = createDemoWorld("integrity-malformed-political-history");
    const id = personId(world);
    const firstProposition = SYNTHETIC_POLICY_IDS.propositions.cleanElectricity;
    const secondProposition = SYNTHETIC_POLICY_IDS.propositions.concealedCarry;
    world = recordPropositionExposure(world, {
      stableKey: "integrity:exposure",
      personId: id,
      propositionId: firstProposition,
      encounteredAt: world.currentDate,
      summary: "A valid exposure before snapshot tampering.",
      provenance: { kind: "manual", note: "Valid before mutation." },
    });
    world = initialBelief(
      world,
      id,
      firstProposition,
      "integrity:belief:first",
      "support",
      { formedAt: world.currentDate },
    );
    world = initialBelief(
      world,
      id,
      secondProposition,
      "integrity:belief:second",
      "oppose",
      { formedAt: world.currentDate },
    );
    world = recordSubjectKnowledge(world, {
      stableKey: "integrity:later-knowledge",
      personId: id,
      subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
      recordedAt: world.currentDate,
      familiarity: "aware",
      understanding: "minimal",
      expertise: "none",
      practicalExperience: "none",
      provenance: { kind: "manual", note: "Recorded after both beliefs." },
      supersedesKnowledgeId: null,
    });

    const malformedProvenance = JSON.parse(serializeWorld(world)) as {
      world: {
        history: {
          propositionExposures: Array<{ provenance: { kind: string } }>;
        };
      };
    };
    const exposure = malformedProvenance.world.history.propositionExposures[0];
    if (!exposure) throw new Error("Missing serialized exposure.");
    exposure.provenance.kind = "telepathy";
    expect(() => deserializeWorld(JSON.stringify(malformedProvenance))).toThrow(
      /invalid proposition-exposure provenance/i,
    );

    const malformedCategory = JSON.parse(serializeWorld(world)) as {
      world: { history: { privateBeliefs: Array<{ position: string }> } };
    };
    const serializedBelief = malformedCategory.world.history.privateBeliefs[0];
    if (!serializedBelief) throw new Error("Missing serialized belief.");
    serializedBelief.position = "enthusiastic";
    expect(() => deserializeWorld(JSON.stringify(malformedCategory))).toThrow(
      /invalid belief position/i,
    );

    const laterKnowledge = world.history.subjectKnowledge.at(-1);
    if (!laterKnowledge) throw new Error("Missing later subject knowledge.");
    const laterReference = structuredClone(world) as unknown as {
      history: {
        privateBeliefs: Array<{
          formation: { subjectKnowledgeIds: EntityId[] };
        }>;
      };
    };
    const earlierBelief = laterReference.history.privateBeliefs[0];
    if (!earlierBelief) throw new Error("Missing earlier belief.");
    earlierBelief.formation.subjectKnowledgeIds = [laterKnowledge.id];
    expect(() =>
      assertWorldIntegrity(laterReference as unknown as World),
    ).toThrow(/unavailable subject knowledge/i);

    const outOfOrder = structuredClone(world) as unknown as {
      history: { privateBeliefs: unknown[] };
    };
    outOfOrder.history.privateBeliefs.reverse();
    expect(() => assertWorldIntegrity(outOfOrder as unknown as World)).toThrow(
      /private belief history is not stored/i,
    );
  });

  it("rejects a pre-birth involved person even when the participant list omits them", () => {
    const world = createDemoWorld("prebirth-involved-entity");
    const id = personId(world);
    expect(() =>
      recordWorldEvent(world, {
        stableKey: "integrity:prebirth-involved",
        type: "personal.invalid-prebirth-involvement",
        occurredAt: addDays(person(world, id).birthDate, -1),
        recordedAt: world.currentDate,
        jurisdictionId: world.jurisdictionOrder[0] ?? null,
        involvedEntityIds: [id],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["integrity"],
        summary: "An invalid event attempts to involve a person before birth.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      }),
    ).toThrow(/not yet born/i);
  });
});

describe("sparse scaling, persistence, and determinism", () => {
  function largeCatalog(base: PolicyCatalog, count: number): PolicyCatalog {
    const domain = createPolicyDomainDefinition(
      "synthetic-scale",
      "Synthetic scale",
      "Synthetic domain used only for sparse scaling tests.",
    );
    const issue = createPolicyIssueDefinition(
      "synthetic-scale.issue",
      domain.id,
      "Synthetic scale issue",
      "Synthetic issue used only for sparse scaling tests.",
    );
    const propositions = Array.from({ length: count }, (_, index) =>
      createPolicyPropositionDefinition(
        `synthetic-scale.proposition-${index}`,
        issue.id,
        `Synthetic proposition ${index}`,
        `Should synthetic policy variant ${index} be adopted?`,
        [{ key: "variant", value: String(index) }],
      ),
    );
    return createPolicyCatalog({
      catalogVersion: `synthetic-scale-${count}`,
      domains: [...catalogValues(base.domains, base.domainOrder), domain],
      issues: [...catalogValues(base.issues, base.issueOrder), issue],
      propositions: [
        ...catalogValues(base.propositions, base.propositionOrder),
        ...propositions,
      ],
      subjects: catalogValues(base.subjects, base.subjectOrder),
      principles: catalogValues(base.principles, base.principleOrder),
    });
  }

  it("keeps people sparse when the shared catalog contains thousands of propositions", () => {
    const demo = createDemoWorld("sparse-thousands");
    const catalog = largeCatalog(demo.policyCatalog, 2_000);
    let world = createWorld({
      seed: demo.seed,
      currentDate: demo.currentDate,
      jurisdictions: catalogValues(demo.jurisdictions, demo.jurisdictionOrder),
      people: catalogValues(demo.people, demo.personOrder),
      policyCatalog: catalog,
    });
    const id = personId(world);
    for (const [index, propositionId] of catalog.propositionOrder
      .slice(-3)
      .entries()) {
      world = initialBelief(
        world,
        id,
        propositionId,
        `belief:sparse:${index}`,
        index % 2 === 0 ? "support" : "oppose",
      );
    }

    expect(world.policyCatalog.propositionOrder.length).toBeGreaterThan(2_000);
    expect(world.history.privateBeliefs).toHaveLength(3);
    const scaleDomainId = catalog.domainOrder.at(-1);
    if (!scaleDomainId) throw new Error("Missing synthetic scale domain.");
    expect(
      formedBeliefsInDomain(world, id, scaleDomainId).map(
        (belief) => belief.propositionId,
      ),
    ).toStrictEqual(catalog.propositionOrder.slice(-3));
    expect(world.people[id]).not.toHaveProperty("beliefs");
    expect(JSON.stringify(world.people[id])).not.toContain(
      "synthetic-scale.proposition-1999",
    );
  });

  it("round-trips catalog and political histories through versioned JSON", () => {
    let world = createDemoWorld("political-json-persistence");
    const id = personId(world);
    world = initialBelief(
      world,
      id,
      SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      "belief:persistence:nuclear",
      "conflicted",
    );
    const payload = serializeWorld(world);
    const parsed = JSON.parse(payload) as { readonly formatVersion: number };
    const restored = deserializeWorld(payload);

    expect(parsed.formatVersion).toBe(13);
    expect(restored).toStrictEqual(world);
    expect(restored.policyCatalog).toStrictEqual(world.policyCatalog);
    expect(restored.history.privateBeliefs).toStrictEqual(
      world.history.privateBeliefs,
    );
    expect(serializeWorld(restored)).toBe(payload);

    const tampered = structuredClone(world) as unknown as {
      history: { privateBeliefs: Array<{ propositionId: EntityId }> };
    };
    const belief = tampered.history.privateBeliefs.at(-1);
    if (!belief) throw new Error("Missing belief to tamper.");
    belief.propositionId = "proposition_missing" as EntityId;
    expect(() => assertWorldIntegrity(tampered as unknown as World)).toThrow(
      /missing proposition/i,
    );
  });

  it("replays identical political record sequences deterministically", () => {
    const play = () => {
      let world = createDemoWorld("political-determinism");
      const id = personId(world);
      world = initialBelief(
        world,
        id,
        SYNTHETIC_POLICY_IDS.propositions.drugNegotiation,
        "belief:determinism:drug",
        "support",
      );
      world = recordSubjectKnowledge(world, {
        stableKey: "knowledge:determinism:healthcare",
        personId: id,
        subjectId: SYNTHETIC_POLICY_IDS.subjects.healthcare,
        recordedAt: livedDate(world, id, 19),
        familiarity: "familiar",
        understanding: "working",
        expertise: "basic",
        practicalExperience: "indirect",
        provenance: { kind: "study", reference: "Synthetic reading" },
        supersedesKnowledgeId: null,
      });
      return world;
    };

    expect(play()).toStrictEqual(play());
    expect(serializeWorld(play())).toBe(serializeWorld(play()));
  });
});
