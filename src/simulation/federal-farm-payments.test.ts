import {
  advanceWorld,
  assertWorldIntegrity,
  withWorldIntegrityDeferred,
} from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { introduceMeasure } from "./legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { chamberByKey } from "./legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { federalProgramCostsForMonth } from "./federal-cost-ledger";
import {
  FARM_PAYMENT_QUESTION,
  farmProgramPaymentAt,
  exposeFarmPaymentCap,
} from "./federal-farm-payments";
import { makeIsoDate } from "./dates";
import {
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "./public-budgets/federal-treasury";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { addDays } from "./dates";
import { currentPresidentOf } from "./crisis/offices";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { money } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import type { World, EntityId, PublicProgramCommitmentRecord } from "./types";
import type { LawEffectStampedRecord } from "./law-effect-stamp";
import { serializeWorld, deserializeWorld } from "./serialization";
import { recordFiledProvision } from "./legislative-politics";
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programInstallments,
  programPosition,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "./governing/public-program";
import { programOperatorOrganization } from "./governing/program-governing";
import { createOrganization, createWorkRelationship } from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { createResourcePosition } from "./resources";
import { FIXTURE, cash } from "./../../tests/fixtures/public-program-fixture";

import {
  resolveLawServiceConsequence,
  applyLawServiceConsequence,
  SERVICE_DELIVERED_LAW_ROWS,
} from "./law-consequences/service-delivered";

const PROGRAM_KEY = "farm:recorded-fixture";
const place = drawRandomPlace("farm-recorded-payment-opening");
const PAYMENT = money(100_000_00, "USD");

let authorizedWorld: World;
let farmMeasureId: EntityId;

describe("recorded farm payments use the adopted annual recipient cap", () => {
  it(
    `opens ${place.key} and records the authored annual cap through the actual executive desk`,
    () =>
      assertWorldIntegrity(
        withWorldIntegrityDeferred(() => {
          const game = generateOpeningLife(
            prepareOpeningLife({
              ...DEFAULT_NEW_GAME_SETUP,
              seed: "farm-recorded-payment-opening",
              placeKey: place.key,
              startAge: 34,
              depth: "summarize-earlier-life",
            }),
          ).game;
          if (!game) throw new Error("Expected an ordinary opening life.");

          let world = ensureNationalElectionJurisdiction(game.world);
          const proposition = Object.values(
            world.policyCatalog.propositions,
          ).find((p) => p.stableKey === FARM_PAYMENT_QUESTION)!;
          // Controlled legal passage, with explicitly authored test ballots.
          // This does not prove ordinary sponsor selection or voting behavior.
          world = introduceMeasure(world, {
            stableKey: "test:farm-cost:measure",
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            rulePackId: US_CONGRESS_PACK_ID,
            designation: "H.R. TEST",
            shortTitle: "Controlled farm payment authority",
            summary: "Fixture appropriation authority, not natural passage.",
            origin: "member-introduction",
            subjectClass: "general-policy",
            originChamberKey: "house",
            sponsorPersonId: null,
            propositionIds: [proposition.id],
            propositionAnswers: [
              { propositionId: proposition.id, answer: "yes" },
            ],
          });
          const measure = world.history.legislativeMeasures!.at(-1)!;
          world = recordFiledProvision(world, {
            stableKey: "test:farm:cap",
            measureId: measure.id,
            provisionKey: "farm-cap",
            sectionNumber: 1,
            heading: "Authored annual cap",
            text: "Authored test annual farm recipient cap.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "Recorded farm recipients (authored fixture)",
            },
            applicationScope: {
              jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
              segmentKey: null,
            },
            answers: { propositionId: proposition.id, answer: "yes" },
            lawTerms: [
              {
                questionKey: FARM_PAYMENT_QUESTION,
                key: "cap",
                unit: "dollars/year",
                value: 50_000,
              },
            ],
          });
          const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map((key) => {
            const seated = seatedCongressChamber(world, key);
            if (!seated)
              throw new Error("Expected the actual seated Congress.");
            return seated.body;
          });
          const votePlan: Record<string, { yea: number }> = {};
          for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
            const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
            for (const committee of chamber.committees)
              votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
                yea: committee.appointedMembers ?? 1,
              };
            for (const stage of chamber.floorStages)
              votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
                yea: bodies.find((b) => b.chamberKey === key)!.members.length,
              };
          }
          const procedure = {
            pack: US_CONGRESS_RULE_PACK,
            measureId: measure.id,
            bodies,
            committeeMemberCount: null,
            votePlan,
            governorAction: "signed" as const,
            governorRationale: "Explicit controlled payment-authority fixture.",
          };
          world = enactThroughDesk(world, measure.id, {
            context: procedure,
            effectiveAt: world.currentDate,
          });
          const president = currentPresidentOf(world);
          if (!president) throw new Error("Expected a sitting President.");
          const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
          world = ensurePublicGovernmentAccount(world, {
            kind: "jurisdiction",
            jurisdictionId,
          });
          const account = publicTaxAccountForJurisdiction(
            world,
            jurisdictionId,
          );
          if (!account) throw new Error("Expected the federal public account.");

          authorizedWorld = world;
          farmMeasureId = measure.id;
          expect(
            world.history.legislativeEnactments?.some(
              (record) => record.measureId === measure.id,
            ),
          ).toBe(true);
          return world;
        }),
      ),
    30_000,
  );

  it(
    "caps actual cash, budget and recipient records with reload/replay protection",
    () =>
      assertWorldIntegrity(
        withWorldIntegrityDeferred(() => {
          if (!authorizedWorld)
            throw new Error("The actual legal setup must succeed first.");
          let world = authorizedWorld;
          const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
          const account = publicTaxAccountForJurisdiction(
            world,
            jurisdictionId,
          );
          const president = currentPresidentOf(world);
          if (!account || !president)
            throw new Error("Missing saved federal payer/executive.");
          world = declareProgramCapacity(world, {
            edition: "recorded-farm-payment-fixture",
            programKey: PROGRAM_KEY,
            jurisdictionId,
            serviceLabel: "Recorded farm payment authority",
            unitLabel: "service units",
            unitsTotal: 1,
            unitsOperational: 0,
            monthlyOperatingNeed: money(1, "USD"),
            completedPermille: null,
            restorationCostPerUnit: PAYMENT,
            basis: FIXTURE,
          }).world;
          const written = recordProgramAppropriation(world, {
            edition: "recorded-farm-payment-fixture",
            programKey: PROGRAM_KEY,
            jurisdictionId,
            accountOrganizationId: account.organizationId,
            amount: money(150_000_00, "USD"),
            sourceMeasureId: farmMeasureId,
            availableFrom: world.currentDate,
            availableThrough: addDays(world.currentDate, 30),
            basis: FIXTURE,
          });
          world = written.world;
          const appropriation = programAppropriations(world, PROGRAM_KEY).find(
            (record) => record.id === written.id,
          );
          if (!appropriation)
            throw new Error("The federal appropriation is missing.");

          const operator = programOperatorOrganization(
            world,
            PROGRAM_KEY,
            jurisdictionId,
          );
          world = operator.world;
          const dueAt = addDays(world.currentDate, 1);
          const committed = commitPublicProgram(world, {
            appropriationId: appropriation.id,
            alternative: {
              key: "recorded-farm-payment-proof",
              title: "One recorded farm payment",
              installments: [
                { afterDays: 1, amount: PAYMENT, purpose: "maintenance" },
              ],
              deliveryLeadDays: 1,
            },
            personId: president.personId,
            office: { kind: "federal-executive" },
            recipientOrganizationId: operator.organizationId,
          });
          expect(committed.ok).toBe(true);
          if (!committed.ok) throw new Error(committed.reason);

          const beforePayment = committed.world;
          const governmentCashBefore = cash(
            beforePayment,
            account.organizationId,
          );
          const recipientCashBefore = cash(
            beforePayment,
            operator.organizationId,
          );
          const month = makeIsoDate(`${dueAt.slice(0, 7)}-01`);
          const opened = openFederalTreasury(month);
          const unpaid = settleFederalTreasuryMonth(
            beforePayment,
            opened,
            month,
          ).months.at(-1)!;
          expect(federalProgramCostsForMonth(beforePayment, month)).toEqual([]);
          world = advanceWorld(
            beforePayment,
            1,
            createCampaignElectionTransitionRegistry(),
          );
          const installment = programInstallments(world, PROGRAM_KEY).find(
            (record) => record.commitmentId === committed.recordId,
          );
          expect(installment).toMatchObject({
            status: "posted",
            recordedAt: dueAt,
          });
          if (!installment)
            throw new Error("The federal payment did not post.");
          const outcome = world.history.resourceTransferOutcomes.find(
            (row) => row.resourceFlowId === installment.resourceFlowId,
          )!;
          expect(outcome.transferredAmount.minorUnits).toBe(50_000_00);
          expect(cash(world, account.organizationId)).toBe(
            governmentCashBefore - 50_000_00,
          );
          expect(cash(world, operator.organizationId)).toBe(
            recipientCashBefore + 50_000_00,
          );
          expect(
            (outcome as typeof outcome & LawEffectStampedRecord)
              .lawEffectStamps?.[0],
          ).toMatchObject({
            governingLawKey: farmMeasureId,
            questionKey: FARM_PAYMENT_QUESTION,
            effectKind: "service-delivered",
          });
          const personLanding = world.history.lawExposures?.find(
            (row) =>
              row.sectionKey === FARM_PAYMENT_QUESTION &&
              row.sourceRecordId === installment.eventId,
          );
          expect(personLanding).toMatchObject({
            channel: "business-rule",
            direction: "cost",
            amount: null,
          });
          expect(
            world.history.workRelationships.some(
              (row) =>
                row.organizationId === operator.organizationId &&
                row.personId === personLanding?.personId,
            ),
          ).toBe(true);
          const commitment = world.history.publicProgramRecords!.find(
            (row) => row.id === committed.recordId,
          ) as PublicProgramCommitmentRecord;
          expect(
            exposeFarmPaymentCap(world, commitment, {
              ...installment,
              status: "failed",
              resourceFlowId: null,
              reason: "The appropriation lapsed before this payment fell due.",
            }),
          ).toBe(world);
          const resolved = resolveLawServiceConsequence(
            world,
            SERVICE_DELIVERED_LAW_ROWS[FARM_PAYMENT_QUESTION]![0]!,
            {
              activity: "payment",
              activityId: outcome.id,
              onDate: dueAt,
              subjectIds: [operator.organizationId],
              questionKey: FARM_PAYMENT_QUESTION,
              governingLawId: farmMeasureId,
            },
          );
          expect(resolved).toHaveLength(1);
          expect(resolved[0]!.value).toMatchObject({
            type: "amount",
            value: 50_000_00,
            unit: "minor",
          });
          expect(applyLawServiceConsequence(world, resolved[0]!)).toBe(world);
          const costs = federalProgramCostsForMonth(world, month);
          expect(costs).toHaveLength(1);
          expect(costs[0]!.amountMinorUnits).toBe(50_000_00);
          expect(programPosition(world, PROGRAM_KEY).posted.minorUnits).toBe(
            50_000_00,
          );
          const paid = settleFederalTreasuryMonth(
            world,
            opened,
            month,
          ).months.at(-1)!;
          expect(
            paid.outlays[FEDERAL_OUTLAYS.indexOf("agriculture")]! -
              unpaid.outlays[FEDERAL_OUTLAYS.indexOf("agriculture")]!,
          ).toBe(50_000);
          const saved = deserializeWorld(serializeWorld(world));
          const repeated = settleProgramInstallment(
            saved,
            committed.recordId,
            0,
          );
          expect(repeated.world).toBe(saved);
          expect(federalProgramCostsForMonth(saved, month)).toEqual(costs);
          const exhausted = farmProgramPaymentAt(
            saved,
            appropriation,
            saved.history.publicProgramRecords!.find(
              (row) => row.id === committed.recordId,
            ) as PublicProgramCommitmentRecord,
            PAYMENT,
          );
          expect(exhausted.amount.minorUnits).toBe(0);
          expect(exhausted.reason).toMatch(/exhausted/);
          const otherProgram = farmProgramPaymentAt(
            saved,
            { ...appropriation, programKey: "non-farm:authored-refusal" },
            saved.history.publicProgramRecords!.find(
              (row) => row.id === committed.recordId,
            ) as PublicProgramCommitmentRecord,
            PAYMENT,
          );
          expect(otherProgram.amount).toEqual(PAYMENT);
          expect(otherProgram.lawEffectStamps).toEqual([]);
          return world;
        }),
      ),
    30_000,
  );
  it(
    "applies the cap to recorded farm managers working in all 56 places",
    () =>
      withWorldIntegrityDeferred(() => {
        if (!authorizedWorld || authorizedWorld.control.kind !== "person")
          throw new Error(
            "The generated-world legal setup must succeed first.",
          );
        const workerId = authorizedWorld.control.personId;
        const national = NATIONAL_ELECTION_JURISDICTION.id;
        const president = currentPresidentOf(authorizedWorld)!;
        const account = publicTaxAccountForJurisdiction(
          authorizedWorld,
          national,
        )!;
        const places = lifePlaceStateIdentities();
        expect(places).toHaveLength(56);
        for (const place of places) {
          const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey)!;
          let world = {
            ...authorizedWorld,
            jurisdictions: {
              ...authorizedWorld.jurisdictions,
              [jurisdiction.id]: jurisdiction,
            },
          };
          const key = `farm:coverage:${place.jurisdictionKey}`;
          const provenance = {
            kind: "authored" as const,
            note: "Explicit recorded farm and worker for geographic coverage; not a generated career.",
          };
          world = createOrganization(world, {
            stableKey: key,
            formedAt: world.currentDate,
            provenance,
            initialProfile: {
              name: key,
              classification: "enterprise:agriculture",
              locationJurisdictionId: jurisdiction.id,
            },
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          world = createResourcePosition(world, {
            stableKey: `${key}:cash`,
            owner: { kind: "organization", organizationId },
            openedAt: world.currentDate,
            openingBalance: money(0, "USD"),
            provenance,
          });
          world = createWorkRelationship(world, {
            stableKey: `${key}:operator`,
            personId: workerId,
            organizationId,
            startedAt: world.currentDate,
            kind: "employment:agriculture",
            compensation: "paid",
            authority: "directs-others",
            dependency: "partly-dependent",
            economicRisk: "organization-borne",
            provenance,
            initialRole: {
              title: "Farm manager",
              occupationClassification: null,
              locationJurisdictionId: jurisdiction.id,
              timeDemand: {
                expectedWeekly: { minimumHours: 1, maximumHours: 1 },
                attention: "moderate",
                concurrency: "partly-concurrent",
                scheduleRigidity: "mixed",
                interruptibility: "limited",
                locationJurisdictionId: jurisdiction.id,
              },
            },
          });
          const written = recordProgramAppropriation(world, {
            edition: key,
            programKey: key,
            jurisdictionId: national,
            accountOrganizationId: account.organizationId,
            amount: money(200_000_00, "USD"),
            sourceMeasureId: farmMeasureId,
            availableFrom: world.currentDate,
            availableThrough: addDays(world.currentDate, 30),
            basis: FIXTURE,
          });
          const committed = commitPublicProgram(written.world, {
            appropriationId: written.id,
            alternative: {
              key,
              title: key,
              installments: [0, 0].map((afterDays) => ({
                afterDays,
                amount: PAYMENT,
                purpose: "maintenance" as const,
              })),
              deliveryLeadDays: null,
            },
            personId: president.personId,
            office: { kind: "federal-executive" },
            recipientOrganizationId: organizationId,
          });
          if (!committed.ok) throw new Error(committed.reason);
          const first = settleProgramInstallment(
            committed.world,
            committed.recordId,
            0,
          );
          expect(first.installment?.status, place.jurisdictionKey).toBe(
            "posted",
          );
          expect(cash(first.world, organizationId)).toBe(50_000_00);
          expect(
            first.world.history.lawExposures?.find(
              (row) => row.sourceRecordId === first.installment!.eventId,
            ),
          ).toMatchObject({
            personId: workerId,
            direction: "cost",
            channel: "business-rule",
            amount: null,
          });
          const exhausted = settleProgramInstallment(
            first.world,
            committed.recordId,
            1,
          );
          expect(exhausted.installment?.status).toBe("failed");
          expect(
            exhausted.world.history.lawExposures?.find(
              (row) => row.sourceRecordId === exhausted.installment!.eventId,
            ),
          ).toMatchObject({
            personId: workerId,
            direction: "cost",
            channel: "business-rule",
          });
          expect(
            settleProgramInstallment(exhausted.world, committed.recordId, 1)
              .world,
          ).toBe(exhausted.world);
        }
      }),
    30_000,
  );
});
