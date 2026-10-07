/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { makeIsoDate } from "../dates";
import { recordWorldEvent } from "../world";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../tax-policy";
import { ensureStartingPersonalMoney } from "../starting-money";
import {
  createResourcePosition,
  createResourceFlow,
  recordResourceTransferOutcome,
  money,
} from "../resources";
import { resourcePositionAt } from "../resource-queries";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import type { EntityId, World } from "../types";
import {
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_ENDED_EVENT,
} from "../justice/prosecution";
import { REFERRAL_TAG } from "../justice/jail-terms";
import {
  payFullCashBail,
  refundCashBailAtCaseClose,
  heldCashBailMinorUnits,
} from "../justice/cash-bail";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { ensurePublicBudgets, withOpenedBudgets } from "./index";
import { readMonthFlows, settleGovernmentMonth } from "./month";
import type { PublicBudgetGovernment, PublicBudgetStore } from "./store";

const receipts: Record<string, unknown>[] = [];
afterAll(() => {
  console.info("TEAM6_BAIL_RECEIPTS", JSON.stringify(receipts));
  if (process.env.TEAM6_BAIL_PROOF_PATH)
    writeFileSync(
      process.env.TEAM6_BAIL_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

const states = pickDistinct(
  new SeededRng("team6-held-bail-five-places"),
  lifePlaceStateIdentities(),
  5,
);
const amount = 10_000; // Explicit $100 custody fixture, not a researched bail schedule.
const month = makeIsoDate("2026-01-01");
const currency = money(0, "USD").currency;

describe("refundable bail is excluded from the existing government's spendable cash", () => {
  for (const state of states)
    describe(state.jurisdictionKey, () => {
      let base: World,
        paid: World,
        government: PublicBudgetGovernment,
        store: PublicBudgetStore;
      let subjectId: EntityId,
        organizationId: EntityId,
        depositId: EntityId,
        outcomeId: EntityId,
        referralId: EntityId;
      const balance = (world: World) =>
        resourcePositionAt(
          world,
          { kind: "organization", organizationId },
          currency,
        )!.liquidBalance.minorUnits;
      beforeAll(() => {
        const place =
          searchLifePlaces("", 5000, {
            stateJurisdictionKey: state.jurisdictionKey,
            scope: "locality",
          })[0] ??
          searchLifePlaces("", 5, {
            stateJurisdictionKey: state.jurisdictionKey,
            scope: "state",
          })[0]!;
        const game = generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            seed: `team6-held-bail:${state.jurisdictionKey}`,
            placeKey: place.key,
            startAge: 40,
            questionnaire: "skipped",
          }),
        ).game!;
        subjectId = game.playerPersonId;
        let world = ensureNationalElectionJurisdiction(
          ensurePublicBudgets(
            ensureStartingPersonalMoney(game.world, subjectId).world,
          ),
        );
        world = {
          ...world,
          publicBudgets: withOpenedBudgets(
            world,
            world.publicBudgets!,
            world.currentDate,
          ),
        };
        const court = Object.values(world.judiciary!.courts).find(
          (row) =>
            row.level === "local-general-trial" &&
            world.publicBudgets!.governments.some(
              (g) =>
                g.jurisdictionId === row.jurisdictionId &&
                g.stateKey === state.jurisdictionKey,
            ),
        )!;
        expect(court, state.jurisdictionKey).toBeDefined();
        government = world.publicBudgets!.governments.find(
          (g) => g.jurisdictionId === court.jurisdictionId,
        )!;
        world = ensureTaxPublicAccount(world, court.jurisdictionId!);
        organizationId = publicTaxAccountForJurisdiction(
          world,
          court.jurisdictionId!,
        )!.organizationId;
        const donor = world.personOrder.find(
          (id) =>
            id !== subjectId &&
            !resourcePositionAt(
              world,
              { kind: "person", personId: id },
              currency,
            ),
        )!;
        expect(donor).toBeDefined();
        world = createResourcePosition(world, {
          stableKey: "fixture:held-bail-donor",
          owner: { kind: "person", personId: donor },
          openedAt: world.currentDate,
          openingBalance: money(amount, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled fixture funding for an actual saved person; not representative wealth.",
          },
        });
        world = createResourceFlow(world, {
          stableKey: "fixture:held-bail-funding",
          source: { kind: "person", personId: donor },
          recipient: { kind: "person", personId: subjectId },
          startsAt: world.currentDate,
          amount: money(amount, "USD"),
          cadenceKind: "custom:fixture-gift",
          basisKind: "custom:fixture-gift",
          basisReference: { kind: "general" },
          restrictionKind: "custom:fixture",
          jurisdictionId: court.jurisdictionId!,
          provenance: {
            kind: "authored",
            note: "Controlled accounting fixture transfer between actual saved people.",
          },
        });
        const gift = world.history.resourceFlows.at(-1)!;
        world = recordResourceTransferOutcome(world, {
          stableKey: "fixture:held-bail-funded",
          resourceFlowId: gift.id,
          periodStartsAt: world.currentDate,
          periodEndsAt: world.currentDate,
          occurredAt: world.currentDate,
          attemptedAmount: money(amount, "USD"),
          transferredAmount: money(amount, "USD"),
          status: "completed",
          reasonKind: null,
          note: "Controlled fixture funding.",
          provenance: gift.provenance,
        });
        const referred = referForProsecution(world, {
          stableKey: "fixture:held-bail-case",
          subjectPersonId: subjectId,
          jurisdictionId: court.jurisdictionId!,
          offenseKey: "crime:robbery",
          evidence: "documentary",
          standingFindings: 6,
          basisEventIds: [],
          referredBy: {
            kind: "police",
            label: "Controlled fixture referral",
            personId: null,
          },
        });
        referralId = referred.referralId;
        base = recordWorldEvent(referred.world, {
          stableKey: "fixture:held-bail-charge",
          type: PROSECUTION_CHARGED_EVENT,
          occurredAt: world.currentDate,
          recordedAt: world.currentDate,
          jurisdictionId: court.jurisdictionId!,
          involvedEntityIds: [subjectId],
          participants: [
            { personId: subjectId, role: "focus:defendant", detail: null },
          ],
          personFactConstraints: [],
          visibility: "public",
          tags: [
            `${REFERRAL_TAG}${referralId}`,
            `justice.court:${court.courtId}`,
            `justice.cash-bail-amount:${amount}`,
          ],
          summary: "Controlled saved charge for the budget custody fixture.",
          context: {
            location: null,
            socialContext: "Controlled court accounting fixture",
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        });
        store = {
          ...world.publicBudgets!,
          governments: [government],
          cursor: {
            flows: base.history.resourceFlows.length,
            outcomes: base.history.resourceTransferOutcomes.length,
          },
        };
        const result = payFullCashBail(base, {
          chargedEventId: base.history.events.at(-1)!.id,
          courtId: court.courtId,
          defendantId: subjectId,
          payer: { kind: "person", personId: subjectId },
          amountMinorUnits: amount,
        });
        expect(result.status).toBe("paid");
        paid = result.world;
        depositId = result.paymentFlowId!;
        outcomeId = paid.history.resourceTransferOutcomes.at(-1)!.id;
        receipts.push({
          place: place.displayName,
          state: state.jurisdictionKey,
          name: personName(paid.people[subjectId]!),
          personId: subjectId,
          courtId: court.courtId,
          governmentKey: government.key,
          organizationId,
          depositId,
          outcomeId,
          amountMinorUnits: amount,
        });
      });

      it("retains physical cash and source IDs without treating the deposit as revenue", () => {
        const read = readMonthFlows(paid, store);
        const cash = read.flows.cash!.get(government.key)!;
        expect(cash.balanceMinorUnits).toBe(balance(base) + amount);
        expect(cash.heldCashBailMinorUnits).toBe(amount);
        const recorded = read.flows.recorded!.get(government.key)!;
        expect(recorded.revenueMinorUnits.reduce((a, b) => a + b, 0)).toBe(0);
        expect(recorded.spendingMinorUnits.reduce((a, b) => a + b, 0)).toBe(0);
        expect(recorded.sourceRecordIds).toEqual([depositId, outcomeId]);
        const settled = settleGovernmentMonth(
          paid,
          government,
          month,
          read.flows,
        ).government;
        expect(Math.round((settled.balance + settled.reserve) * 100)).toBe(
          balance(base),
        );
        const row = settled.months.at(-1)!;
        expect(row.cashSettlement).toMatchObject({
          organizationId,
          accountBalanceMinorUnits: balance(paid),
          heldCashBailMinorUnits: amount,
          sourceRecordIds: [depositId, outcomeId],
        });
        expect(settled.publicAccountMigration!.accountBalanceMinorUnits).toBe(
          balance(paid),
        );
        Object.assign(receipts.at(-1)!, {
          physicalMinorUnits: balance(paid),
          spendableMinorUnits: Math.round(
            (settled.balance + settled.reserve) * 100,
          ),
        });
      });

      it("refunds actual custody cash without recording an operating expense", () => {
        const ended = recordWorldEvent(paid, {
          stableKey: "fixture:held-bail-case-ended",
          type: PROSECUTION_ENDED_EVENT,
          occurredAt: paid.currentDate,
          recordedAt: paid.currentDate,
          jurisdictionId: government.jurisdictionId,
          involvedEntityIds: [subjectId],
          participants: [
            { personId: subjectId, role: "focus:defendant", detail: null },
          ],
          personFactConstraints: [],
          visibility: "public",
          tags: [`${REFERRAL_TAG}${referralId}`],
          summary:
            "Controlled saved case close for the custody refund fixture.",
          context: {
            location: null,
            socialContext: "Controlled court accounting fixture",
            pressure: null,
            choice: null,
            motivation: null,
            immediateReaction: null,
          },
        });
        const closedId = ended.history.events.at(-1)!.id;
        const refunded = refundCashBailAtCaseClose(ended, closedId);
        expect(balance(refunded)).toBe(balance(base));
        expect(heldCashBailMinorUnits(refunded, organizationId)).toBe(0);
        const read = readMonthFlows(refunded, store);
        const recorded = read.flows.recorded!.get(government.key)!;
        expect(recorded.revenueMinorUnits.reduce((a, b) => a + b, 0)).toBe(0);
        expect(recorded.spendingMinorUnits.reduce((a, b) => a + b, 0)).toBe(0);
        expect(recorded.sourceRecordIds).toEqual([
          depositId,
          outcomeId,
          refunded.history.resourceFlows.at(-1)!.id,
          refunded.history.resourceTransferOutcomes.at(-1)!.id,
        ]);
        expect(refundCashBailAtCaseClose(refunded, closedId)).toBe(refunded);
        Object.assign(receipts.at(-1)!, {
          refundFlowId: refunded.history.resourceFlows.at(-1)!.id,
          refundOutcomeId: refunded.history.resourceTransferOutcomes.at(-1)!.id,
          heldAfterRefundMinorUnits: 0,
        });
      });

      it("preserves custody evidence and spendability through canonical Save/Continue and repeat", () => {
        const read = readMonthFlows(paid, store);
        const settled = settleGovernmentMonth(
          paid,
          government,
          month,
          read.flows,
        ).government;
        // Direct writer fixture, not a clock-driven campaign or prosecution timeline.
        const saved = {
          ...paid,
          publicBudgets: {
            ...store,
            cursor: read.cursor,
            governments: [settled],
          },
        };
        const bytes = serializeWorld(saved);
        const reloaded = deserializeWorld(bytes);
        expect(serializeWorld(reloaded)).toBe(bytes);
        expect(heldCashBailMinorUnits(reloaded, organizationId)).toBe(amount);
        const repeated = readMonthFlows(reloaded, reloaded.publicBudgets!);
        expect(repeated.flows.recorded!.size).toBe(0);
        expect(
          settleGovernmentMonth(
            reloaded,
            reloaded.publicBudgets!.governments[0]!,
            month,
            repeated.flows,
          ).government,
        ).toEqual(settled);
        expect(balance(reloaded)).toBe(balance(paid));
      });

      it("refuses forecast substitution while the account holds bail", () => {
        const read = readMonthFlows(paid, store);
        const bytes = serializeWorld(paid);
        expect(
          settleGovernmentMonth(paid, government, month, {
            ...read.flows,
            recorded: undefined,
          }),
        ).toEqual({ government, adjustments: [] });
        expect(serializeWorld(paid)).toBe(bytes);
      });

      it("preserves ordinary cash settlement when the account holds no bail", () => {
        const read = readMonthFlows(base, store);
        expect(
          read.flows.cash!.get(government.key)!.heldCashBailMinorUnits,
        ).toBeUndefined();
        const settled = settleGovernmentMonth(
          base,
          government,
          month,
          read.flows,
        ).government;
        expect(Math.round((settled.balance + settled.reserve) * 100)).toBe(
          balance(base),
        );
        expect(settled.months.at(-1)!.cashSettlement).toMatchObject({
          accountBalanceMinorUnits: balance(base),
          heldCashBailMinorUnits: 0,
        });
      });

      it.each(["state", "federal"] as const)(
        "uses the same custody subtraction for the existing %s account (controlled ledger input)",
        (level) => {
          const federal = base.publicBudgets!.federalGovernment!;
          const stateGovernment = base.publicBudgets!.governments.find(
            (row) => row.key === state.jurisdictionKey,
          )!;
          const target = level === "federal" ? federal : stateGovernment;
          let world = ensureTaxPublicAccount(base, target.jurisdictionId);
          const account = publicTaxAccountForJurisdiction(
            world,
            target.jurisdictionId,
          )!;
          const physical = () =>
            resourcePositionAt(
              world,
              {
                kind: "organization",
                organizationId: account.organizationId,
              },
              currency,
            )!.liquidBalance.minorUnits;
          const opening = physical();
          const ledger: PublicBudgetStore = {
            ...world.publicBudgets!,
            cursor: {
              flows: world.history.resourceFlows.length,
              outcomes: world.history.resourceTransferOutcomes.length,
            },
          };
          // This isolates each level's accounting contract. It does not assert
          // a court's bail authority or change the real local-court fixture.
          world = createResourceFlow(world, {
            stableKey: `fixture:held-bail-level:${level}`,
            source: { kind: "person", personId: subjectId },
            recipient: {
              kind: "organization",
              organizationId: account.organizationId,
            },
            startsAt: world.currentDate,
            amount: money(amount, "USD"),
            cadenceKind: "custom:cash-bail",
            basisKind: "custom:refundable-cash-bail",
            basisReference: { kind: "general" },
            restrictionKind: "custom:held-cash-bail",
            jurisdictionId: target.jurisdictionId,
            provenance: {
              kind: "authored",
              note: "Controlled custody ledger input for the existing government account; no court authority inferred.",
            },
          });
          const flow = world.history.resourceFlows.at(-1)!;
          world = recordResourceTransferOutcome(world, {
            stableKey: `fixture:held-bail-level-paid:${level}`,
            resourceFlowId: flow.id,
            periodStartsAt: world.currentDate,
            periodEndsAt: world.currentDate,
            occurredAt: world.currentDate,
            attemptedAmount: money(amount, "USD"),
            transferredAmount: money(amount, "USD"),
            status: "completed",
            reasonKind: null,
            note: "Controlled custody accounting transfer.",
            provenance: flow.provenance,
          });
          const read = readMonthFlows(world, ledger);
          const settled =
            level === "federal"
              ? settleGovernmentMonth(world, federal, month, read.flows)
                  .government
              : settleGovernmentMonth(world, stateGovernment, month, read.flows)
                  .government;
          const row = settled.months.at(-1)!;
          expect(row.cashSettlement).toMatchObject({
            organizationId: account.organizationId,
            accountBalanceMinorUnits: opening + amount,
            heldCashBailMinorUnits: amount,
            sourceRecordIds: [
              flow.id,
              world.history.resourceTransferOutcomes.at(-1)!.id,
            ],
          });
          expect(
            Math.round(
              ((settled.balance ?? NaN) +
                ("reserve" in settled ? (settled.reserve ?? 0) : 0)) *
                100,
            ),
          ).toBe(opening);
          expect(row.revenue.reduce((a, b) => a + b, 0)).toBe(0);
          expect(row.spending.reduce((a, b) => a + b, 0)).toBe(0);
          if (level === "federal") expect(row.reserve).toBeNull();
        },
      );
    });
});
