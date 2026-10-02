import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { lawInForce } from "./governing/law-in-force";
import { PAID_LEAVE_QUESTION } from "./state-paid-leave-law";
import {
  paidLeaveBenefitRate,
  paidLeaveBenefitMinor,
  payPaidLeaveClaims,
} from "./paid-leave-benefits";
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { serializeWorld, deserializeWorld } from "./serialization";
import { personName } from "./people";
import { currentStateExecutiveHolders } from "./nationwide-world/state-executives";
import type { LawEffectStampedRecord } from "./law-effect-stamp";
import type { LawAmountUnit } from "./law-consequence-types";

const SEED = "a45-enacted-replacement-all56";
const places = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`${SEED}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${SEED}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

function enactedReplacement(
  place: string,
  value: number,
  unit: LawAmountUnit = "ratio",
) {
  const f = smallWorld({
    place,
    date: "2026-01-05",
    people: 3,
    seed: `${SEED}:${place}`,
    offices: ["governor"],
    laws: [PAID_LEAVE_QUESTION],
  });
  const pack = legislativePackForJurisdiction(f.stateJurisdictionId);
  if (!pack) return { f, world: f.world, measureId: null };
  let world = introduceMeasure(f.world, {
    stableKey: `${SEED}:bill`,
    jurisdictionId: f.stateJurisdictionId,
    rulePackId: pack.packId,
    designation: "Authored replacement rate",
    shortTitle: "Paid-leave replacement terms",
    summary: "Controlled terms and votes; not a researched rate.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: pack.chamberOrder[0]!,
    sponsorPersonId: null,
    propositionIds: [f.propositionIds[PAID_LEAVE_QUESTION]!],
    propositionAnswers: [
      { propositionId: f.propositionIds[PAID_LEAVE_QUESTION]!, answer: "yes" },
    ],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: `${SEED}:terms`,
    measureId,
    provisionKey: "replacement",
    sectionNumber: 1,
    heading: "Share of covered wages",
    text: "The replacement share is specified by this provision.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "covered workers",
    },
    applicationScope: {
      jurisdictionId: f.stateJurisdictionId,
      segmentKey: null,
    },
    lawTerms: [
      { questionKey: PAID_LEAVE_QUESTION, key: "replacement", value, unit },
    ],
  });
  const before = world;
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
      votePlan: Object.fromEntries(
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
      ),
      governorAction: null,
      governorRationale: "Controlled favorable votes for replacement terms.",
    },
  });
  return { f, world, measureId, before };
}

describe("A45 adopted replacement terms reach the existing saved benefit writer", () => {
  it.each(places)(
    "pays the adopted share to a named person in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const {
        f,
        world: enacted,
        measureId,
        before,
      } = enactedReplacement(jurisdictionKey, 0.6);
      const law = measureId
        ? lawInForce(
            enacted,
            f.stateJurisdictionId,
            f.propositionIds[PAID_LEAVE_QUESTION]!,
            enacted.currentDate,
            "enacted-only",
          )
        : null;
      if (!law) {
        stdout.write(
          JSON.stringify({
            place: jurisdictionKey,
            seed: SEED,
            unsupported:
              "No canonical procedure or lawful enacted paid-leave binding.",
          }),
        );
        expect(law).toBeNull();
        return;
      }
      expect(law.measureId).toBe(measureId);
      expect(
        (before!.history.legislativeEnactments ?? []).some(
          (row) => row.measureId === measureId,
        ),
      ).toBe(false);
      expect(
        paidLeaveBenefitRate(before!, jurisdictionKey, before!.currentDate),
      ).toEqual(
        paidLeaveBenefitRate(f.world, jurisdictionKey, f.world.currentDate),
      );
      const rate = paidLeaveBenefitRate(
        enacted,
        jurisdictionKey,
        enacted.currentDate,
      )!;
      expect(rate.percent).toBe(60);
      expect(rate.estimatedFromAverage).toBeUndefined();
      const amountMinor = paidLeaveBenefitMinor(rate, 20_000, 1, 1);
      expect(amountMinor).toBe(
        Math.min(
          12_000,
          rate.maxWeeklyMinor === null
            ? 12_000
            : Math.round(rate.maxWeeklyMinor / 5),
        ),
      );
      const signer = currentStateExecutiveHolders(enacted).find(
        (row) => row.stateUsps === f.stateUsps,
      )!;
      expect(signer).toBeDefined();
      let world = ensureTaxPublicAccount(
        { ...enacted, control: { kind: "person", personId: signer.personId } },
        f.stateJurisdictionId,
      );
      const account = world.history.organizations.find(
        (row) => row.stableKey === publicOrganizationKey(f.stateJurisdictionId),
      )!;
      const recipient = { kind: "person" as const, personId: f.personId };
      const source = {
        kind: "organization" as const,
        organizationId: account.id,
      };
      const provenance = {
        kind: "authored" as const,
        note: "Controlled claim and funding; not natural eligibility, lost wages or tax revenue.",
      };
      world = createResourcePosition(world, {
        stableKey: `${SEED}:funding-position`,
        owner: recipient,
        openedAt: world.currentDate,
        openingBalance: money(20_000, "USD"),
        provenance,
      });
      world = createResourceFlow(world, {
        stableKey: `${SEED}:funding-flow`,
        source: recipient,
        recipient: source,
        startsAt: world.currentDate,
        amount: money(20_000, "USD"),
        cadenceKind: "custom:one-time",
        basisKind: "custom:claim-fixture-funding",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: f.stateJurisdictionId,
        provenance,
      });
      const fundingFlow = world.history.resourceFlows.at(-1)!;
      world = recordResourceTransferOutcome(world, {
        stableKey: `${SEED}:funding-outcome`,
        resourceFlowId: fundingFlow.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        attemptedAmount: money(20_000, "USD"),
        transferredAmount: money(20_000, "USD"),
        status: "completed",
        reasonKind: null,
        note: provenance.note,
        provenance,
      });
      const priorCash = resourcePositionAt(
        world,
        source,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const priorRecipientCash = resourcePositionAt(
        world,
        recipient,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const claims = [
        {
          personId: f.personId,
          stateKey: jurisdictionKey,
          paycheckKey: `${SEED}:claim`,
          coveredDays: 1,
          caring: true,
          amountMinor,
          rate,
        },
      ];
      const paid = payPaidLeaveClaims(world, claims);
      const outcome = paid.history.resourceTransferOutcomes.at(-1)!;
      expect(outcome.status).toBe("completed");
      expect(outcome.transferredAmount.minorUnits).toBe(amountMinor);
      expect(
        resourcePositionAt(paid, source, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(priorCash - amountMinor);
      expect(
        resourcePositionAt(paid, recipient, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(priorRecipientCash + amountMinor);
      expect(
        (outcome as typeof outcome & LawEffectStampedRecord).lawEffectStamps,
      ).toEqual([
        expect.objectContaining({
          governingLawKey: measureId,
          questionKey: PAID_LEAVE_QUESTION,
          effectKind: "paid-leave-benefit",
        }),
      ]);
      const restored = deserializeWorld(serializeWorld(paid));
      expect(restored.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
      expect(
        paidLeaveBenefitRate(restored, jurisdictionKey, restored.currentDate),
      ).toEqual(rate);
      expect(payPaidLeaveClaims(restored, claims)).toBe(restored);
      stdout.write(
        JSON.stringify({
          place: jurisdictionKey,
          seed: SEED,
          person: personName(paid.people[f.personId]!),
          personId: f.personId,
          lawId: measureId,
          paymentId: outcome.id,
          flowId: outcome.resourceFlowId,
          transferredMinor: amountMinor,
          replacementPercent: rate.percent,
        }) + "\n",
      );
    },
  );
  it.each([
    { value: 60, unit: "minor" as const },
    { value: -0.1, unit: "ratio" as const },
    { value: 1.1, unit: "ratio" as const },
  ])("retains the labeled fallback for $value $unit", ({ value, unit }) => {
    const { world, f, measureId } = enactedReplacement(
      places[0]!.jurisdictionKey,
      value,
      unit,
    );
    expect(measureId).not.toBeNull();
    const rate = paidLeaveBenefitRate(
      world,
      places[0]!.jurisdictionKey,
      world.currentDate,
    )!;
    expect(rate.percent).toBeGreaterThan(0);
    expect(rate.percent).toBeLessThanOrEqual(100);
    expect(rate.percent).not.toBe(value * 100);
    expect(rate.estimatedFromAverage).toMatch(/^ESTIMATED FROM AVERAGE:/);
    expect(
      world.history.resourceTransferOutcomes.some((row) =>
        row.note?.startsWith("State paid leave benefit"),
      ),
    ).toBe(false);
    expect(f.propositionIds[PAID_LEAVE_QUESTION]).toBeDefined();
  });
  it("reads an explicit zero replacement without substituting the peer mean", () => {
    const { world } = enactedReplacement(places[0]!.jurisdictionKey, 0);
    const rate = paidLeaveBenefitRate(
      world,
      places[0]!.jurisdictionKey,
      world.currentDate,
    )!;
    expect(rate.percent).toBe(0);
    expect(rate.estimatedFromAverage).toBeUndefined();
    expect(paidLeaveBenefitMinor(rate, 20_000, 1, 1)).toBe(0);
  });
});
