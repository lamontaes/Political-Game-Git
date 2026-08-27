import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  commitConversationTurn,
  createConversationSessionDescriptor,
} from "./run-b-conversation";
import { createRunBConversationProgress } from "./run-b-conversation-progress";
import {
  createRunCDocumentUiState,
  runCDocumentUiReducer,
} from "./run-c-document-state";
import {
  RUN_C_HIDDEN_ANALYSIS_TEXT,
  RUN_C_NARROW_VARIANT_KEY,
  RUN_C_REVISION_EVENT_STABLE_KEY,
  RUN_C_TARGET_SEGMENT_KEY,
  RUN_C_WIDE_VARIANT_KEY,
  commitRunCWorkingDraftRevision,
  createRunCFixture,
  createRunCLegislativeConversationProgress,
  policyAnalysisKnowledgeFor,
  projectRunCWorkingDocument,
  recordRunCPlayerAnalysisReview,
  runCOperationForVariant,
} from "./run-c-working-document";

describe("Stage 6.5 Run C working document", () => {
  const sharedFixture = createRunCFixture();

  it("creates deterministic working-document identity", () => {
    expect(createRunCFixture().document.id).toBe(
      createRunCFixture().document.id,
    );
  });

  it("creates deterministic provision identities", () => {
    const first = createRunCFixture();
    const second = createRunCFixture();
    expect(
      first.document.variants[RUN_C_WIDE_VARIANT_KEY].provisions.map(
        (provision) => provision.id,
      ),
    ).toEqual(
      second.document.variants[RUN_C_WIDE_VARIANT_KEY].provisions.map(
        (provision) => provision.id,
      ),
    );
  });

  it("keeps the exact amount selection identity stable across variants", () => {
    const fixture = sharedFixture;
    const selectionIds = [RUN_C_WIDE_VARIANT_KEY, RUN_C_NARROW_VARIANT_KEY].map(
      (key) =>
        fixture.document.variants[key].provisions
          .flatMap((provision) => provision.segments)
          .find((segment) => segment.kind === "selection")?.selectionId,
    );
    expect(selectionIds).toEqual([
      fixture.document.amountSelectionId,
      fixture.document.amountSelectionId,
    ]);
  });

  it("derives pre-commit current and prepared roles from document history", () => {
    const fixture = sharedFixture;
    const projection = projectRunCWorkingDocument(fixture.world, fixture);
    expect(projection.variantRoles[RUN_C_WIDE_VARIANT_KEY]).toEqual({
      role: "current",
      label: "Current office working draft",
    });
    expect(projection.variantRoles[RUN_C_NARROW_VARIANT_KEY]).toEqual({
      role: "prepared",
      label: "Prepared narrower revision",
    });
    expect(projection.paperStatusLabel).toBe(
      "$8,000,000 · Current office working draft",
    );
    expect(projection.annotationSummary).toContain(
      "$8,000,000 language is the current office working draft",
    );
    expect(projection.annotationSummary).toContain(
      "$4,000,000 is the prepared narrower revision",
    );
  });

  it("maps the visible provision explicitly to policy alternatives and operations", () => {
    const fixture = sharedFixture;
    for (const key of [
      RUN_C_WIDE_VARIANT_KEY,
      RUN_C_NARROW_VARIANT_KEY,
    ] as const) {
      const variant = fixture.document.variants[key];
      const provision = variant.provisions.find(
        (candidate) =>
          candidate.id === fixture.document.quantitativeProvisionId,
      );
      expect(provision).toMatchObject({
        policyAlternativeId: variant.policyAlternativeId,
        policyOperationId: variant.policyOperationId,
      });
    }
  });

  it("does not recover semantics by reparsing rendered prose", () => {
    const fixture = sharedFixture;
    const wide = fixture.document.variants[RUN_C_WIDE_VARIANT_KEY];
    const alteredWide = {
      ...wide,
      provisions: wide.provisions.map((provision) => ({
        ...provision,
        segments: provision.segments.map((segment) =>
          segment.kind === "selection"
            ? { ...segment, text: "$999,999,999" }
            : segment,
        ),
      })),
    };
    const alteredFixture = {
      ...fixture,
      document: {
        ...fixture.document,
        variants: {
          ...fixture.document.variants,
          [RUN_C_WIDE_VARIANT_KEY]: alteredWide,
        },
      },
    };
    const projection = projectRunCWorkingDocument(
      alteredFixture.world,
      alteredFixture,
    );
    const operation = runCOperationForVariant(
      alteredFixture.world,
      projection.activeVariant,
    );
    expect(operation.operation).toMatchObject({
      kind: "absolute-change",
      magnitude: { kind: "money", money: { minorUnits: 800_000_000 } },
    });
  });

  it("stores distinct exact $8m and $4m quantitative magnitudes", () => {
    const fixture = sharedFixture;
    const magnitudes = [RUN_C_WIDE_VARIANT_KEY, RUN_C_NARROW_VARIANT_KEY].map(
      (key) => {
        const operation = runCOperationForVariant(
          fixture.world,
          fixture.document.variants[key],
        );
        return operation.operation.kind === "absolute-change" &&
          operation.operation.magnitude.kind === "money"
          ? operation.operation.magnitude.money.minorUnits
          : null;
      },
    );
    expect(magnitudes).toEqual([800_000_000, 400_000_000]);
  });

  it("uses existing Stage 6 estimates to produce different projected consequences", () => {
    const fixture = sharedFixture;
    const estimates = [
      fixture.policy.wideEstimateId,
      fixture.policy.narrowEstimateId,
    ].map((id) =>
      fixture.world.history.policyEstimates.find((record) => record.id === id)!,
    );
    expect(estimates[0].consequences[0]?.estimatedChange).toMatchObject({
      kind: "money",
      money: { minorUnits: 800_000_000 },
    });
    expect(estimates[1].consequences[0]?.estimatedChange).toMatchObject({
      kind: "money",
      money: { minorUnits: 400_000_000 },
    });
  });

  it("does not mutate metric truth while estimating or projecting", () => {
    const fixture = sharedFixture;
    const before = serializeWorld(fixture.world);
    projectRunCWorkingDocument(fixture.world, fixture);
    expect(serializeWorld(fixture.world)).toBe(before);
    expect(fixture.world.history.effectActivations).toHaveLength(0);
    expect(fixture.world.history.policyRealizations).toHaveLength(0);
  });

  it("keeps legal text and staff annotation as distinct concepts", () => {
    const fixture = sharedFixture;
    const legalText = fixture.document.variants[
      RUN_C_WIDE_VARIANT_KEY
    ].provisions
      .flatMap((provision) => provision.segments)
      .map((segment) => segment.text)
      .join("");
    expect(legalText).not.toContain(fixture.document.annotations[0]!.teaser);
    expect(fixture.document.annotations[0]!.authorPersonId).toBe(
      fixture.scenePerson.personId,
    );
  });

  it("keeps annotation toggling outside World", () => {
    const fixture = sharedFixture;
    const worldBefore = serializeWorld(fixture.world);
    const open = runCDocumentUiReducer(createRunCDocumentUiState(), {
      type: "open",
    });
    const toggled = runCDocumentUiReducer(open, {
      type: "toggle-annotations",
    });
    expect(toggled.annotationsVisible).toBe(false);
    expect(serializeWorld(fixture.world)).toBe(worldBefore);
  });

  it("keeps phrase selection outside World", () => {
    const fixture = sharedFixture;
    const worldBefore = serializeWorld(fixture.world);
    const selected = runCDocumentUiReducer(
      runCDocumentUiReducer(createRunCDocumentUiState(), { type: "open" }),
      {
        type: "select-phrase",
        selectionId: fixture.document.amountSelectionId,
      },
    );
    expect(selected.actionMenuOpen).toBe(true);
    expect(serializeWorld(fixture.world)).toBe(worldBefore);
  });

  it("keeps opening compare outside World", () => {
    const fixture = sharedFixture;
    const worldBefore = serializeWorld(fixture.world);
    const compared = runCDocumentUiReducer(
      runCDocumentUiReducer(createRunCDocumentUiState(), { type: "open" }),
      { type: "open-compare" },
    );
    expect(compared.panel).toBe("compare");
    expect(serializeWorld(fixture.world)).toBe(worldBefore);
  });

  it("keeps closing compare outside World", () => {
    const fixture = sharedFixture;
    const worldBefore = serializeWorld(fixture.world);
    let state = runCDocumentUiReducer(createRunCDocumentUiState(), {
      type: "open",
    });
    state = runCDocumentUiReducer(state, { type: "open-compare" });
    state = runCDocumentUiReducer(state, { type: "close-panel" });
    expect(state.panel).toBe("none");
    expect(serializeWorld(fixture.world)).toBe(worldBefore);
  });

  it("omits hidden unlearned analysis from the player projection", () => {
    const fixture = sharedFixture;
    const projection = projectRunCWorkingDocument(fixture.world, fixture);
    expect(projection.staffAnalyses).toHaveLength(0);
    expect(JSON.stringify(projection)).not.toContain(
      RUN_C_HIDDEN_ANALYSIS_TEXT,
    );
    expect(
      policyAnalysisKnowledgeFor(
        fixture.world,
        fixture.playerPersonId,
        fixture.policy.hiddenEstimateId,
      ),
    ).toBeNull();
  });

  it("exposes only legitimately reviewed staff analysis with provenance and qualification", () => {
    const fixture = sharedFixture;
    const reviewed = recordRunCPlayerAnalysisReview(fixture.world, fixture);
    const projection = projectRunCWorkingDocument(reviewed, fixture);
    expect(projection.staffAnalyses).toHaveLength(2);
    expect(projection.staffAnalyses.every((item) => item.knowledgeId)).toBe(
      true,
    );
    expect(
      projection.staffAnalyses.every((item) =>
        item.qualification.includes("not an appropriation"),
      ),
    ).toBe(true);
    expect(JSON.stringify(projection)).not.toContain(
      RUN_C_HIDDEN_ANALYSIS_TEXT,
    );
  });

  it("makes staff-analysis review deterministic and idempotent", () => {
    const fixture = sharedFixture;
    const first = recordRunCPlayerAnalysisReview(fixture.world, fixture);
    const second = recordRunCPlayerAnalysisReview(first, fixture);
    expect(serializeWorld(second)).toBe(serializeWorld(first));
    expect(
      serializeWorld(recordRunCPlayerAnalysisReview(fixture.world, fixture)),
    ).toBe(serializeWorld(first));
  });

  it("grounds Collins's legislative response in Collins's own analysis knowledge", () => {
    const fixture = sharedFixture;
    const progress = createRunCLegislativeConversationProgress(
      fixture.world,
      fixture,
    );
    expect(progress.subjectFacts.analysisKnowledgeId).toBe(
      policyAnalysisKnowledgeFor(
        fixture.world,
        fixture.scenePerson.personId,
        fixture.policy.wideEstimateId,
      )?.id,
    );
  });

  it("reuses Run B listener, claim, and knowledge semantics for provision discussion", () => {
    const fixture = sharedFixture;
    const progress = createRunCLegislativeConversationProgress(
      fixture.world,
      fixture,
    );
    const session = createConversationSessionDescriptor(
      fixture.world,
      fixture.legislativeRoomContext,
    );
    const result = commitConversationTurn(fixture.world, {
      session,
      room: fixture.legislativeRoomContext,
      progress,
      turnOrdinal: 1,
      addressee: fixture.scenePerson.personId,
      audibility: "normal",
      intent: "discuss-provision",
    });
    expect(result.semantic.actualListenerPersonIds).toEqual(
      fixture.legislativeRoomContext.normalHearingPersonIds,
    );
    expect(result.semantic.claimRecipientPersonIds).toContain(
      fixture.scenePeople[1].personId,
    );
    expect(result.world.history.claims.at(-1)?.relationshipToTruth).toBe(
      "unknown",
    );
    expect(result.world.history.knowledge.length).toBeGreaterThan(
      fixture.world.history.knowledge.length,
    );
  });

  it("uses the same audibility-derived listener boundary for legislative discussion", () => {
    const fixture = sharedFixture;
    const progress = createRunCLegislativeConversationProgress(
      fixture.world,
      fixture,
    );
    const session = createConversationSessionDescriptor(
      fixture.world,
      fixture.legislativeRoomContext,
    );
    const result = commitConversationTurn(fixture.world, {
      session,
      room: fixture.legislativeRoomContext,
      progress,
      turnOrdinal: 1,
      addressee: fixture.scenePerson.personId,
      audibility: "quiet",
      intent: "discuss-provision",
    });
    expect(result.semantic.actualListenerPersonIds).toEqual([
      fixture.scenePerson.personId,
    ]);
    expect(result.semantic.claimRecipientPersonIds).not.toContain(
      fixture.scenePeople[1].personId,
    );
  });

  it("does not expose emergency-rent copy in the legislative subject", () => {
    const fixture = sharedFixture;
    const progress = createRunCLegislativeConversationProgress(
      fixture.world,
      fixture,
    );
    const result = commitConversationTurn(fixture.world, {
      session: createConversationSessionDescriptor(
        fixture.world,
        fixture.legislativeRoomContext,
      ),
      room: fixture.legislativeRoomContext,
      progress,
      turnOrdinal: 1,
      addressee: fixture.scenePerson.personId,
      audibility: "normal",
      intent: "discuss-provision",
    });
    const visible = JSON.stringify(result.presentation);
    expect(visible).toContain("$8,000,000");
    expect(visible).toContain("$4,000,000");
    expect(visible).not.toMatch(/emergency-rent|proof-of-income|referral/i);
  });

  it("writes an ordinary office-working-draft revision event", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    expect(revised.history.events.at(-1)).toMatchObject({
      stableKey: RUN_C_REVISION_EVENT_STABLE_KEY,
      type: "office.working-draft-revised",
    });
  });

  it("changes only the derived active working-draft selection", () => {
    const fixture = sharedFixture;
    const before = projectRunCWorkingDocument(fixture.world, fixture);
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    const after = projectRunCWorkingDocument(revised, fixture);
    expect(before.activeVariantKey).toBe(RUN_C_WIDE_VARIANT_KEY);
    expect(after.activeVariantKey).toBe(RUN_C_NARROW_VARIANT_KEY);
    expect(revised.history.policyAlternatives).toEqual(
      fixture.world.history.policyAlternatives,
    );
    expect(revised.history.policyOperations).toEqual(
      fixture.world.history.policyOperations,
    );
  });

  it("re-derives every visible variant role after the $4m revision event", () => {
    const fixture = sharedFixture;
    const reviewed = recordRunCPlayerAnalysisReview(fixture.world, fixture);
    const beforeRevisionEvents = reviewed.history.events.filter(
      (event) => event.type === "office.working-draft-revised",
    ).length;
    const revised = commitRunCWorkingDraftRevision(reviewed, fixture);
    const projection = projectRunCWorkingDocument(revised, fixture);

    expect(projection.paperStatusLabel).toBe(
      "$4,000,000 · Current office working draft",
    );
    expect(projection.variantRoles[RUN_C_NARROW_VARIANT_KEY]).toEqual({
      role: "current",
      label: "Current office working draft",
    });
    expect(projection.variantRoles[RUN_C_WIDE_VARIANT_KEY]).toEqual({
      role: "previous",
      label: "Earlier office working version",
    });
    expect(projection.preparedVariant).toBeNull();
    expect(projection.annotationSummary).toContain(
      "$4,000,000 narrower version is now the current office working draft",
    );
    expect(
      projection.staffAnalyses.find(
        (analysis) => analysis.variantKey === RUN_C_NARROW_VARIANT_KEY,
      ),
    ).toMatchObject({
      documentRole: "current",
      documentRoleLabel: "Current office working draft",
    });
    expect(
      projection.staffAnalyses.find(
        (analysis) => analysis.variantKey === RUN_C_WIDE_VARIANT_KEY,
      ),
    ).toMatchObject({
      documentRole: "previous",
      documentRoleLabel: "Earlier office working version",
    });
    expect(
      revised.history.events.filter(
        (event) => event.type === "office.working-draft-revised",
      ),
    ).toHaveLength(beforeRevisionEvents + 1);
    expect(revised.history.policyRealizations).toEqual(
      reviewed.history.policyRealizations,
    );
    expect(revised.history.effectActivations).toEqual(
      reviewed.history.effectActivations,
    );
    expect(revised.history.metricStates).toEqual(reviewed.history.metricStates);
  });

  it("does not realize policy when the office draft changes", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    expect(revised.history.policyRealizations).toEqual(
      fixture.world.history.policyRealizations,
    );
    expect(revised.history.effectActivations).toEqual(
      fixture.world.history.effectActivations,
    );
  });

  it("does not enact law or create institutional procedure truth", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    const event = revised.history.events.at(-1)!;
    expect(event.type).toBe("office.working-draft-revised");
    expect(event.tags).not.toEqual(
      expect.arrayContaining(["law.enacted", "legislation.passed"]),
    );
    expect(event.summary).toContain("office working draft");
  });

  it("keeps currentDate unchanged on revision", () => {
    const fixture = sharedFixture;
    expect(
      commitRunCWorkingDraftRevision(fixture.world, fixture).currentDate,
    ).toBe(fixture.world.currentDate);
  });

  it("advances ordinary same-day history sequence exactly once", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    expect(revised.history.nextSequence).toBe(
      fixture.world.history.nextSequence + 1,
    );
    expect(revised.history.events.at(-1)?.occurredAt).toBe(
      fixture.world.currentDate,
    );
  });

  it("does not repurpose actionSequence as a work clock", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    expect(revised.actionSequence).toBe(fixture.world.actionSequence);
  });

  it("rejects duplicate revision commit", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    expect(() => commitRunCWorkingDraftRevision(revised, fixture)).toThrow(
      /already selected/i,
    );
  });

  it("replays identical World plus document action exactly", () => {
    const firstFixture = createRunCFixture();
    const secondFixture = createRunCFixture();
    const first = commitRunCWorkingDraftRevision(
      firstFixture.world,
      firstFixture,
    );
    const second = commitRunCWorkingDraftRevision(
      secondFixture.world,
      secondFixture,
    );
    expect(serializeWorld(second)).toBe(serializeWorld(first));
  });

  it("preserves explicit target scope through provision and operation", () => {
    const fixture = sharedFixture;
    for (const key of [
      RUN_C_WIDE_VARIANT_KEY,
      RUN_C_NARROW_VARIANT_KEY,
    ] as const) {
      const variant = fixture.document.variants[key];
      const provision = variant.provisions.find(
        (candidate) =>
          candidate.policyOperationId === variant.policyOperationId,
      )!;
      const operation = runCOperationForVariant(fixture.world, variant);
      expect(provision.targetScope).toEqual(operation.targetScope);
      expect(operation.targetScope.segmentKey).toBe(RUN_C_TARGET_SEGMENT_KEY);
    }
  });

  it("passes full World integrity before and after revision", () => {
    const fixture = sharedFixture;
    expect(() => assertWorldIntegrity(fixture.world)).not.toThrow();
    expect(() =>
      assertWorldIntegrity(
        commitRunCWorkingDraftRevision(fixture.world, fixture),
      ),
    ).not.toThrow();
  });

  it("preserves exact serialization and replay", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(
      recordRunCPlayerAnalysisReview(fixture.world, fixture),
      fixture,
    );
    const serialized = serializeWorld(revised);
    expect(serializeWorld(deserializeWorld(serialized))).toBe(serialized);
  });

  it("keeps canonical metric state unchanged after analysis review and revision", () => {
    const fixture = sharedFixture;
    const initialMetricStates = fixture.world.history.metricStates;
    const revised = commitRunCWorkingDraftRevision(
      recordRunCPlayerAnalysisReview(fixture.world, fixture),
      fixture,
    );
    expect(revised.history.metricStates).toEqual(initialMetricStates);
  });

  it("links the revision event to both prepared semantic alternatives", () => {
    const fixture = sharedFixture;
    const revised = commitRunCWorkingDraftRevision(fixture.world, fixture);
    const event = revised.history.events.at(-1)!;
    expect(event.involvedEntityIds).toEqual(
      expect.arrayContaining([
        fixture.policy.wideAlternativeId,
        fixture.policy.wideOperationId,
        fixture.policy.narrowAlternativeId,
        fixture.policy.narrowOperationId,
      ]),
    );
  });

  it("keeps the Run B casework fixture available alongside Run C", () => {
    const fixture = sharedFixture;
    const casework = createRunBConversationProgress();
    expect(casework.subject).toBe("shared-intake-checklist");
    expect(fixture.roomContext.eligibleAddresseePersonIds).toHaveLength(2);
    expect(fixture.legislativeRoomContext.eligibleAddresseePersonIds).toEqual([
      fixture.scenePerson.personId,
    ]);
  });
});
