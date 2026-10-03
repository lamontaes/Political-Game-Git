import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import stateTax from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { smallWorld } from "../../tests/fixtures/small-world";
import { makeIsoDate } from "./dates";
import { applyLawConsequences } from "./enacted-law-effects";
import { lawInForce } from "./governing/law-in-force";
import { recordsByStringField } from "./history-index";
import { stableHash } from "./ids";
import type { ResolvedLawConsequence } from "./law-consequence-types";
import { TAX_REGISTRATION, STATUTORY_TAX_ACTION } from "./law-consequences/tax";
import type { LawEffectStampedRecord } from "./law-effect-stamp";
import { introduceMeasure } from "./legislation";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import { personName } from "./people";
import { attributePaycheckTaxLaws } from "./paycheck-law-attribution";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "./state-income-tax-law";
import { assessPaychecksTaxes } from "./statutory-tax";
import {
  appendStatutoryTaxLawAttribution,
  withStatutoryTaxLawAttributionBatch,
} from "./statutory-tax-law-attribution";
import { taxBaseOccurrenceSource } from "./tax-policy";
import { advanceWorld, assertWorldIntegrity } from "./world";

const seed = "a22-adopted-income-rate-small-world";
// Sample actual place identities from all 56. No rate, money or person outcome
// is drawn; authored votes below exercise the existing legislative procedure.
const places = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);
const cache = new Map<string, ReturnType<typeof build>>();

function build(jurisdictionKey: string) {
  const f = smallWorld({
    place: jurisdictionKey,
    seed: `a33-attribution:${jurisdictionKey}`,
    date: "2025-12-18",
    people: 3,
    offices: ["governor"],
    laws: [
      ADOPT_STATE_INCOME_TAX_QUESTION,
      GRADUATED_STATE_INCOME_TAX_QUESTION,
    ],
  });
  const pack = legislativePackForJurisdiction(f.stateJurisdictionId);
  const originalShape = (
    stateTax.places as Record<string, { wageIncomeTax: string }>
  )[jurisdictionKey]?.wageIncomeTax;
  if (!pack || !originalShape)
    return {
      kind: "unsupported" as const,
      f,
      reason: "No canonical procedure or read schedule.",
    };
  const questionKey =
    originalShape === "none"
      ? ADOPT_STATE_INCOME_TAX_QUESTION
      : GRADUATED_STATE_INCOME_TAX_QUESTION;
  const answer = originalShape === "graduated" ? "no" : "yes";
  let world = introduceMeasure(f.world, {
    stableKey: "a33-attribution:bill",
    jurisdictionId: f.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "A33 saved attribution fixture",
    shortTitle: "Authored income-tax law",
    summary:
      "Controlled law procedure; the canonical statutory writer sets the saved liability.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId: null,
    propositionIds: [f.propositionIds[questionKey]!],
    propositionAnswers: [
      { propositionId: f.propositionIds[questionKey]!, answer },
    ],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const votePlan = Object.fromEntries(
    pack.chambers.flatMap((chamber) => [
      ...chamber.committees.map((committee) => [
        votePlanKeyForCommittee(committee.committeeKey),
        { yea: committee.appointedMembers ?? 1 },
      ]),
      ...chamber.floorStages.map((stage) => [
        votePlanKeyForFloor(chamber.chamberKey, stage.stageKey),
        { yea: authoredScenarioSeatCount(pack, chamber.chamberKey) },
      ]),
    ]),
  );
  world = enactThroughDesk(world, measureId, {
    context: {
      pack,
      measureId,
      bodies: pack.chambers.map((chamber) =>
        seatBodyForPack(
          chamber.chamberKey,
          chamber.name,
          authoredScenarioSeatCount(pack, chamber.chamberKey),
          [],
          false,
        ),
      ),
      committeeMemberCount: null,
      votePlan,
      governorAction: null,
      governorRationale:
        "Authored favorable votes for the saved-attribution fixture.",
    },
  });
  expect(world.currentDate).toBe("2026-01-01");
  const governingLaw = lawInForce(
    world,
    f.stateJurisdictionId,
    f.propositionIds[questionKey]!,
    world.currentDate,
    "enacted-only",
  );
  if (!governingLaw) {
    expect(
      world.history.legislativeEnactments!.some(
        (row) => row.measureId === measureId && row.outcome === "enacted",
      ),
    ).toBe(true);
    return {
      kind: "unsupported" as const,
      f,
      reason:
        "Canonical higher-law authority refuses this question; enactment is not permission.",
    };
  }
  const signer = currentStateExecutiveHolders(world).find(
    (row) => row.stateUsps === f.stateUsps,
  )!;
  world = { ...world, control: { kind: "person", personId: signer.personId } };
  const provenance = {
    kind: "authored" as const,
    note: "Recorded fixture work/pay; not natural work or a sourced wage.",
  };
  world = createOrganization(world, {
    stableKey: "a33-attribution:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded attribution employer",
      classification: "enterprise:retail",
      locationJurisdictionId: f.stateJurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a33-attribution:work",
    personId: f.personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:employee",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Recorded worker",
      occupationClassification: null,
      locationJurisdictionId: f.stateJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: f.stateJurisdictionId,
      },
    },
  });
  const workId = world.history.workRelationships.at(-1)!.id;
  world = createWorkCompensation(world, {
    stableKey: "a33-attribution:pay",
    workRelationshipId: workId,
    startsAt: world.currentDate,
    amount: money(240_000, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: f.stateJurisdictionId,
    provenance,
  });
  const flowId = world.history.resourceFlows.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a33-attribution:cash",
    owner: { kind: "person", personId: f.personId },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a33-attribution:actual-pay",
    resourceFlowId: flowId,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "partial",
    attemptedAmount: money(240_000, "USD"),
    transferredAmount: money(120_000, "USD"),
    reasonKind: "custom:fixture-partial-pay",
    note: "Actual partial pay for the attribution fixture.",
    provenance,
  });
  const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  world = assessPaychecksTaxes(world, [outcomeId]);
  const liability = world.history.statutoryTaxLiabilities!.find(
    (row) =>
      row.sourceOutcomeId === outcomeId &&
      row.authorityKey === jurisdictionKey &&
      row.taxKey === `${jurisdictionKey.toLowerCase()}:wage-income-tax`,
  )!;
  expect(liability.lawMeasureIds).toContain(measureId);
  expect(liability.liability!.minorUnits).toBeGreaterThan(0);
  const payment = world.history.statutoryTaxPayments!.find(
    (row) => row.liabilityId === liability.id,
  )!;
  expect(payment).toBeDefined();
  const source = taxBaseOccurrenceSource(world, liability.id)!;
  if (source.kind !== "statutory-liability")
    throw new Error("Missing saved assessment source.");
  const law = lawInForce(
    world,
    f.stateJurisdictionId,
    f.propositionIds[questionKey]!,
    liability.occurredAt,
    "enacted-only",
  )!;
  const rows = world.policyCatalog.propositions[
    f.propositionIds[questionKey]!
  ]!.consequences!.filter(
    (row) => row.kind === "tax" && row.what === STATUTORY_TAX_ACTION,
  );
  expect(rows).toHaveLength(2);
  const assessmentRow = rows.find((row) => row.when === "assessment")!;
  const paymentRow = rows.find((row) => row.when === "payment")!;
  // Read the actual production catalog. No fixture rows or registry admission
  // are authored: only the bill/votes and saved wage activity are controlled.
  const assessment: ResolvedLawConsequence = {
    row: assessmentRow,
    law,
    questionKey,
    jurisdictionId: f.stateJurisdictionId,
    subject: { kind: "person", id: f.personId },
    activityId: liability.id,
    effectiveAt: liability.occurredAt,
    sourceRecordIds: source.sourceRecordIds,
    value: {
      type: "amount",
      value: liability.liability!.minorUnits,
      unit: "minor",
      currency: liability.liability!.currency,
    },
  };
  const paidSource = taxBaseOccurrenceSource(world, payment.resourceOutcomeId)!;
  if (paidSource.kind !== "statutory-payment")
    throw new Error("Missing actual collection source.");
  const collection: ResolvedLawConsequence = {
    ...assessment,
    row: paymentRow,
    activityId: payment.resourceOutcomeId,
    effectiveAt: paidSource.occurredAt,
    sourceRecordIds: [...source.sourceRecordIds, ...paidSource.sourceRecordIds],
    value: {
      type: "amount",
      value: payment.amount.minorUnits,
      unit: "minor",
      currency: payment.amount.currency,
    },
  };
  return {
    kind: "supported" as const,
    f,
    world,
    liability,
    payment,
    assessment,
    collection,
    outcomeId,
  };
}

function fixture(key?: string): ReturnType<typeof build> {
  if (!key) {
    for (const place of places) {
      const f = fixture(place.jurisdictionKey);
      if (f.kind === "supported") return f;
    }
    throw new Error("No admitted sampled wage law for the validation fixture.");
  }
  let f = cache.get(key);
  if (!f) {
    f = build(key);
    cache.set(key, f);
  }
  return f;
}

function activityContext(resolved: ResolvedLawConsequence) {
  return {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
    questionKey: resolved.questionKey,
  };
}

function dispatch(
  world: Parameters<typeof applyLawConsequences>[0],
  resolved: ResolvedLawConsequence,
) {
  return applyLawConsequences(world, activityContext(resolved), [
    TAX_REGISTRATION,
  ]);
}

describe("A33 saved statutory attribution without another assessment", () => {
  it.each(places)(
    "retains named paycheck, allocation and Continue identity in $jurisdictionKey",
    ({ jurisdictionKey }: { jurisdictionKey: string }) => {
      const f = fixture(jurisdictionKey);
      if (f.kind === "unsupported") {
        expect(f.f.world.history.statutoryTaxLiabilities ?? []).toEqual([]);
        stdout.write(
          JSON.stringify({
            place: jurisdictionKey,
            seed,
            unsupported: f.reason,
          }) + "\n",
        );
        return;
      }
      const assessment = dispatch(f.world, f.assessment);
      expect(assessment).not.toBe(f.world);
      expect(
        serializeWorld(
          applyLawConsequences(f.world, activityContext(f.assessment)),
        ),
      ).toBe(serializeWorld(assessment));
      const attributed = attributePaycheckTaxLaws(f.world, [
        f.outcomeId,
        f.outcomeId,
      ]);
      expect(attributed).not.toBe(f.world);
      expect(serializeWorld(dispatch(assessment, f.collection))).toBe(
        serializeWorld(attributed),
      );
      expect(
        serializeWorld(
          applyLawConsequences(assessment, activityContext(f.collection)),
        ),
      ).toBe(serializeWorld(attributed));
      const nextLiability = attributed.history.statutoryTaxLiabilities!.find(
        (row) => row.id === f.liability.id,
      )!;
      const nextPayment = attributed.history.statutoryTaxPayments!.find(
        (row) => row.id === f.payment.id,
      )!;
      const liabilityStamps = nextLiability.lawEffectStamps!;
      const paymentStamps = (
        nextPayment as typeof nextPayment & LawEffectStampedRecord
      ).lawEffectStamps!;
      expect(liabilityStamps).toHaveLength(
        (f.liability.lawEffectStamps?.length ?? 0) + 1,
      );
      expect(paymentStamps).toHaveLength(1);
      expect(nextLiability).toEqual({
        ...f.liability,
        lawEffectStamps: liabilityStamps,
      });
      expect(nextPayment).toEqual({
        ...f.payment,
        lawEffectStamps: paymentStamps,
      });
      expect(liabilityStamps.at(-1)).toMatchObject({
        governingLawKey: f.assessment.law.measureId,
        questionKey: f.assessment.questionKey,
        effectKind: "tax",
        appliedAt: f.liability.occurredAt,
      });
      expect(paymentStamps[0]!.sourceRecordIds).toContain(f.payment.id);
      expect(paymentStamps[0]!.sourceRecordIds).toContain(
        f.payment.resourceOutcomeId,
      );
      const expected = {
        ...f.world,
        history: {
          ...f.world.history,
          statutoryTaxLiabilities: f.world.history.statutoryTaxLiabilities!.map(
            (row) => (row.id === nextLiability.id ? nextLiability : row),
          ),
          statutoryTaxPayments: f.world.history.statutoryTaxPayments!.map(
            (row) => (row.id === nextPayment.id ? nextPayment : row),
          ),
        },
      };
      expect(serializeWorld(attributed)).toBe(serializeWorld(expected));
      expect(attributePaycheckTaxLaws(attributed, [f.outcomeId])).toBe(
        attributed,
      );
      const loaded = deserializeWorld(serializeWorld(attributed));
      expect(attributePaycheckTaxLaws(loaded, [f.outcomeId])).toBe(loaded);
      expect(assessPaychecksTaxes(loaded, [f.outcomeId])).toBe(loaded);
      assertWorldIntegrity(loaded);
      stdout.write(
        JSON.stringify({
          seed,
          place: jurisdictionKey,
          person: personName(f.world.people[f.f.personId]!),
          personId: f.f.personId,
          actualPayMinor: f.liability.wages.minorUnits,
          liabilityId: f.liability.id,
          liabilityMinor: f.liability.liability!.minorUnits,
          paymentId: f.payment.id,
          collectedMinor: f.payment.amount.minorUnits,
          collectionOutcomeId: f.payment.resourceOutcomeId,
          governingLawId: f.assessment.law.measureId,
        }) + "\n",
      );
    },
  );

  it("refuses forged payer, jurisdiction, date, law, amount and missing provenance", () => {
    const f = fixture();
    if (f.kind !== "supported")
      throw new Error("Expected supported sampled fixture.");
    const otherPerson = f.world.personOrder.find((id) => id !== f.f.personId)!;
    const variations: ResolvedLawConsequence[] = [
      { ...f.assessment, subject: { kind: "person", id: otherPerson } },
      { ...f.assessment, jurisdictionId: f.f.jurisdictionId },
      { ...f.assessment, effectiveAt: makeIsoDate("2026-01-02") },
      { ...f.assessment, sourceRecordIds: [] },
      {
        ...f.assessment,
        value: { type: "amount", value: 1, unit: "minor", currency: "USD" },
      },
      {
        ...f.assessment,
        law: {
          ...f.assessment.law,
          answer: f.assessment.law.answer === "yes" ? "no" : "yes",
        },
      },
      { ...f.assessment, questionKey: "us-tax-terms:state.excise-tax-terms" },
      { ...f.assessment, activityId: f.outcomeId },
      { ...f.collection, activityId: f.payment.id },
      {
        ...f.collection,
        sourceRecordIds: f.collection.sourceRecordIds.filter(
          (id) => id !== f.payment.id,
        ),
      },
    ];
    for (const resolved of variations)
      expect(appendStatutoryTaxLawAttribution(f.world, resolved)).toBe(f.world);
  });

  it("keeps historical occurrence on late attribution and refuses sibling FICA retargeting", () => {
    const f = fixture();
    if (f.kind !== "supported")
      throw new Error("Expected supported sampled fixture.");
    const later = advanceWorld(f.world, 1);
    const attributed = attributePaycheckTaxLaws(later, [f.outcomeId]);
    expect(attributed.currentDate).toBe(later.currentDate);
    expect(attributed.history.nextSequence).toBe(later.history.nextSequence);
    expect(
      attributed.history
        .statutoryTaxLiabilities!.find((row) => row.id === f.liability.id)!
        .lawEffectStamps!.at(-1)!.appliedAt,
    ).toBe(f.liability.occurredAt);
    const sibling = f.world.history.statutoryTaxLiabilities!.find(
      (row) => row.taxKey === "us-federal:social-security-employee",
    )!;
    const source = taxBaseOccurrenceSource(f.world, sibling.id)!;
    expect(source.kind).toBe("statutory-liability");
    expect(
      appendStatutoryTaxLawAttribution(f.world, {
        ...f.assessment,
        activityId: sibling.id,
        sourceRecordIds: source.sourceRecordIds,
      }),
    ).toBe(f.world);
    expect(attributed.history.resourceTransferOutcomes).toBe(
      later.history.resourceTransferOutcomes,
    );
    expect(attributed.history.futureDueItems).toBe(
      later.history.futureDueItems,
    );
  });

  it("batches nested canonical stamps once without changing held rows or sibling histories", () => {
    const f = fixture();
    if (f.kind !== "supported")
      throw new Error("Expected supported sampled fixture.");
    const before = serializeWorld(f.world);
    const heldLiabilities = recordsByStringField(
      f.world.history.statutoryTaxLiabilities!,
      "sourceOutcomeId",
      f.outcomeId,
    );
    const heldPayments = recordsByStringField(
      f.world.history.statutoryTaxPayments!,
      "liabilityId",
      f.liability.id,
    );
    const heldJson = JSON.stringify([heldLiabilities, heldPayments]);
    const sequential = appendStatutoryTaxLawAttribution(
      appendStatutoryTaxLawAttribution(f.world, f.assessment),
      f.collection,
    );
    const batched = withStatutoryTaxLawAttributionBatch(f.world, (world) => {
      const assessment = appendStatutoryTaxLawAttribution(world, f.assessment);
      expect(assessment.history.statutoryTaxLiabilities).toBe(
        world.history.statutoryTaxLiabilities,
      );
      const nested = withStatutoryTaxLawAttributionBatch(assessment, (next) => {
        expect(appendStatutoryTaxLawAttribution(next, f.assessment)).toBe(next);
        const collection = appendStatutoryTaxLawAttribution(next, f.collection);
        expect(appendStatutoryTaxLawAttribution(collection, f.collection)).toBe(
          collection,
        );
        expect(collection.history.statutoryTaxPayments).toBe(
          world.history.statutoryTaxPayments,
        );
        return collection;
      });
      return nested;
    });
    expect(serializeWorld(batched)).toBe(serializeWorld(sequential));
    expect(serializeWorld(deserializeWorld(serializeWorld(batched)))).toBe(
      serializeWorld(batched),
    );
    expect(serializeWorld(f.world)).toBe(before);
    expect(JSON.stringify([heldLiabilities, heldPayments])).toBe(heldJson);
    expect(heldLiabilities).toContain(f.liability);
    expect(heldPayments).toContain(f.payment);
    expect(batched.history.resourceTransferOutcomes).toBe(
      f.world.history.resourceTransferOutcomes,
    );
    const sibling = withStatutoryTaxLawAttributionBatch(f.world, (world) =>
      appendStatutoryTaxLawAttribution(world, f.collection),
    );
    expect(serializeWorld(sibling)).toBe(
      serializeWorld(appendStatutoryTaxLawAttribution(f.world, f.collection)),
    );
    expect(sibling.history.statutoryTaxLiabilities).toBe(
      f.world.history.statutoryTaxLiabilities,
    );
    expect(
      withStatutoryTaxLawAttributionBatch(batched, (world) =>
        appendStatutoryTaxLawAttribution(
          appendStatutoryTaxLawAttribution(world, f.assessment),
          f.collection,
        ),
      ),
    ).toBe(batched);
    expect(withStatutoryTaxLawAttributionBatch(f.world, () => f.world)).toBe(
      f.world,
    );
  });

  it("discards an interrupted batch and restores the standalone writer", () => {
    const f = fixture();
    if (f.kind !== "supported")
      throw new Error("Expected supported sampled fixture.");
    const before = serializeWorld(f.world);
    expect(() =>
      withStatutoryTaxLawAttributionBatch(f.world, (world) => {
        appendStatutoryTaxLawAttribution(world, f.assessment);
        throw new Error("interrupted attribution pass");
      }),
    ).toThrow("interrupted attribution pass");
    expect(serializeWorld(f.world)).toBe(before);
    const standalone = appendStatutoryTaxLawAttribution(f.world, f.assessment);
    expect(standalone).not.toBe(f.world);
    expect(standalone.history.statutoryTaxLiabilities).not.toBe(
      f.world.history.statutoryTaxLiabilities,
    );
    expect(
      withStatutoryTaxLawAttributionBatch(f.world, (world) =>
        appendStatutoryTaxLawAttribution(world, f.assessment),
      ),
    ).toEqual(standalone);
  });
});

it("keeps question-specific bindings in rows rather than the attribution engine", () => {
  const source = readFileSync(
    new URL("./statutory-tax-law-attribution.ts", import.meta.url),
    "utf8",
  );
  expect(source).not.toMatch(
    /import[\s\S]*?from ["'][^"']*(?:federal-top-income-tax-law|state-income-tax-law)["']/,
  );
  expect(source).not.toMatch(
    /RAISE_TOP_FEDERAL_RATE_QUESTION|ADOPT_STATE_INCOME_TAX_QUESTION|GRADUATED_STATE_INCOME_TAX_QUESTION/,
  );
});
