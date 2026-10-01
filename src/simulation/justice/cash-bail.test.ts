import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { ensureOpeningJudiciary } from "../judiciary/opening";
import { lifePlaceStateIdentities } from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { addDays } from "../dates";
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
import { currentLifeCutoff, householdMembershipsAt } from "../life-queries";
import { heldBeforeTrialOn } from "./jail-terms";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  scheduleFutureDueItem,
  resolveFutureDueItemsThrough,
  createFutureTransitionHandlerRegistry,
} from "../future-transitions";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { personName } from "../people";
import type { EntityId, World, HistoricalEvent } from "../types";
import { sentencingJudge, type CourtCase } from "./court-reasoning";
import {
  advanceProsecutions,
  referForProsecution,
  enterPlea,
  postCashBail,
  PROSECUTION_CHARGED_EVENT,
  PRETRIAL_RELEASED_EVENT,
  PRETRIAL_HELD_EVENT,
  PROSECUTION_ENDED_EVENT,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import {
  payFullCashBail,
  refundCashBailAtCaseClose,
  heldCashBailMinorUnits,
} from "./cash-bail";
import { bailMinorUnits } from "./pretrial";

const receipts: Record<string, unknown>[] = [];
afterAll(() => {
  if (process.env.G11_PROOF_PATH)
    writeFileSync(
      process.env.G11_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("full cash bail reaches a saved court government and returns at case close", () => {
  const states = pickDistinct(
    new SeededRng("team9-g10-floor-five-20260930"),
    lifePlaceStateIdentities(),
    1,
  );
  for (const state of states)
    describe(state.jurisdictionKey, () => {
      let base: World,
        paid: World,
        subjectId: EntityId,
        donorId: EntityId,
        referralId: EntityId,
        courtId: string,
        organizationId: EntityId,
        charged: HistoricalEvent;
      const currency = money(0, "USD").currency;
      const amount = bailMinorUnits("crime:robbery");
      const seed = `team9-g11-cash:${state.jurisdictionKey}`;
      const balance = (
        world: World,
        owner:
          | { kind: "person"; personId: EntityId }
          | { kind: "organization"; organizationId: EntityId },
      ) => resourcePositionAt(world, owner, currency)!.liquidBalance.minorUnits;
      function unfundedCase(): World {
        const amount = money(
          balance(base, { kind: "person", personId: subjectId }),
          "USD",
        );
        let drained = createResourceFlow(base, {
          stableKey: "fixture:g11-spent",
          source: { kind: "person", personId: subjectId },
          recipient: { kind: "person", personId: donorId },
          startsAt: base.currentDate,
          amount,
          cadenceKind: "custom:fixture-spending",
          basisKind: "custom:fixture-spending",
          basisReference: { kind: "general" },
          restrictionKind: "custom:fixture",
          jurisdictionId: charged.jurisdictionId,
          provenance: {
            kind: "authored",
            note: "Controlled depleted-funds branch using an actual transfer.",
          },
        });
        const flow = drained.history.resourceFlows.at(-1)!;
        drained = recordResourceTransferOutcome(drained, {
          stableKey: "fixture:g11-spent-paid",
          resourceFlowId: flow.id,
          periodStartsAt: drained.currentDate,
          periodEndsAt: drained.currentDate,
          occurredAt: drained.currentDate,
          attemptedAmount: amount,
          transferredAmount: amount,
          status: "completed",
          reasonKind: null,
          note: "Controlled spending.",
          provenance: flow.provenance,
        });
        return advanceProsecutions(drained);
      }
      function closeCase(input: World): World {
        let isolated = input;
        for (const item of isolated.history.futureDueItems)
          if (
            futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
              ?.status === "scheduled"
          )
            isolated = cancelFutureDueItem(isolated, {
              stableKey: `fixture:g11-cancel:${item.id}`,
              dueItemId: item.id,
              effectiveAt: isolated.currentDate,
              reasonKey: "fixture:isolated-court",
              context: "Isolate the court's saved due date.",
            });
        const due = addDays(
          charged.occurredAt,
          prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
        );
        const key = "fixture:g11-case-boundary";
        isolated = scheduleFutureDueItem(isolated, {
          stableKey: key,
          dueAt: due,
          transitionKey: key,
          entityIds: [subjectId],
          jurisdictionId: charged.jurisdictionId,
          provenance: { kind: "simulated", sourceEntityIds: [subjectId] },
        });
        const atDue = resolveFutureDueItemsThrough(
          isolated,
          due,
          createFutureTransitionHandlerRegistry([
            [
              key,
              (world) => ({
                world,
                status: "resolved",
                reasonKey: key,
                context: "Test-only clock boundary, no production polling.",
                outcomeEventId: null,
              }),
            ],
          ]),
        );
        expect(atDue.currentDate).toBe(due);
        const plea = enterPlea(atDue, {
          personId: subjectId,
          referralId,
          plea: "guilty",
        });
        expect(plea.ok).toBe(true);
        return advanceProsecutions(plea.world);
      }
      beforeAll(() => {
        // A small world (tests/fixtures/small-world.ts) plus the opening's
        // judges, through their existing writer: the case needs a court.
        const small = smallWorld({ place: state.jurisdictionKey, seed });
        subjectId = small.personId;
        let world = ensureStartingPersonalMoney(
          ensureOpeningJudiciary(small.world),
          subjectId,
        ).world;
        // A small world has no starting pay, so the defendant's wallet is a
        // controlled known-zero position before the funding transfer.
        if (
          !resourcePositionAt(
            world,
            { kind: "person", personId: subjectId },
            currency,
          )
        )
          world = createResourcePosition(world, {
            stableKey: "fixture:g11-subject-wallet",
            owner: { kind: "person", personId: subjectId },
            openedAt: world.currentDate,
            openingBalance: money(0, "USD"),
            provenance: {
              kind: "authored",
              note: "Controlled known-zero fixture wallet before the funding transfer.",
            },
          });
        // The defendant's resident household, through the life writers (a
        // small world carries people, not the opening's households).
        const homeProvenance = {
          kind: "authored" as const,
          note: "Controlled fixture household for the defendant.",
        };
        world = createHousehold(world, {
          stableKey: "fixture:g11-household",
          formedAt: world.currentDate,
          label: "Fixture resident household",
          provenance: homeProvenance,
        });
        const homeId = world.history.households.at(-1)!.id;
        world = recordHouseholdLocation(world, {
          stableKey: "fixture:g11-household-location",
          householdId: homeId,
          effectiveAt: world.currentDate,
          jurisdictionId: world.people[subjectId]!.homeJurisdictionId,
          label: "Fixture residence",
          kind: "residence:community-base",
          provenance: homeProvenance,
          supersedesLocationId: null,
        });
        world = startHouseholdMembership(world, {
          stableKey: "fixture:g11-household-membership",
          personId: subjectId,
          householdId: homeId,
          startedAt: world.currentDate,
          residenceRole: "primary",
          kind: "resident:member",
          provenance: homeProvenance,
        });
        const courtCase: CourtCase = {
          caseKey: "g11",
          defendantId: subjectId,
          offenseKey: "crime:robbery",
          offenseLabel: "robbery",
          evidence: "documentary",
          standingFindings: 6,
          venueJurisdictionId: world.people[subjectId]!.homeJurisdictionId,
          stateKey: state.jurisdictionKey,
        };
        const judge = sentencingJudge(world, courtCase, 0)!;
        const tenure = world.judiciary!.seatTenures.find(
          (row) =>
            row.personId === judge &&
            row.endedAt === null &&
            world.judiciary!.courts[world.judiciary!.seats[row.seatId]!.courtId]
              ?.level === "local-general-trial",
        )!;
        courtId = world.judiciary!.seats[tenure.seatId]!.courtId;
        const court = world.judiciary!.courts[courtId]!;
        world = ensureTaxPublicAccount(world, court.jurisdictionId!);
        organizationId = publicTaxAccountForJurisdiction(
          world,
          court.jurisdictionId!,
        )!.organizationId;
        // Explicit controlled funding, not a simulated income or an invented person.
        const donor = world.personOrder.find(
          (id) =>
            id !== subjectId &&
            !resourcePositionAt(
              world,
              { kind: "person", personId: id },
              currency,
            ),
        )!;
        donorId = donor;
        world = createResourcePosition(world, {
          stableKey: "fixture:g11-donor",
          owner: { kind: "person", personId: donor },
          openedAt: world.currentDate,
          openingBalance: money(amount, "USD"),
          provenance: {
            kind: "authored",
            note: "Controlled accounting fixture cash, not a representative starting balance.",
          },
        });
        world = createResourceFlow(world, {
          stableKey: "fixture:g11-funding",
          source: { kind: "person", personId: donor },
          recipient: { kind: "person", personId: subjectId },
          startsAt: world.currentDate,
          amount: money(amount, "USD"),
          cadenceKind: "custom:fixture-gift",
          basisKind: "custom:fixture-gift",
          basisReference: { kind: "general" },
          restrictionKind: "custom:fixture",
          jurisdictionId: courtCase.venueJurisdictionId,
          provenance: {
            kind: "authored",
            note: "Controlled funding transfer between actual saved people.",
          },
        });
        const gift = world.history.resourceFlows.at(-1)!;
        world = recordResourceTransferOutcome(world, {
          stableKey: "fixture:g11-funded",
          resourceFlowId: gift.id,
          periodStartsAt: world.currentDate,
          periodEndsAt: world.currentDate,
          occurredAt: world.currentDate,
          attemptedAmount: money(amount, "USD"),
          transferredAmount: money(amount, "USD"),
          status: "completed",
          reasonKind: null,
          note: "Controlled funding.",
          provenance: gift.provenance,
        });
        const referred = referForProsecution(world, {
          stableKey: "g11-cash-case",
          subjectPersonId: subjectId,
          jurisdictionId: courtCase.venueJurisdictionId,
          offenseKey: courtCase.offenseKey,
          evidence: "documentary",
          standingFindings: 6,
          basisEventIds: [],
          referredBy: { kind: "police", label: "police", personId: null },
        });
        referralId = referred.referralId;
        base = {
          ...referred.world,
          history: {
            ...referred.world.history,
            events: referred.world.history.events.map((event) =>
              event.id === referred.referralId
                ? { ...event, occurredAt: addDays(world.currentDate, -200) }
                : event,
            ),
          },
        };
        paid = advanceProsecutions(base);
        charged = paid.history.events.find(
          (event) =>
            event.type === PROSECUTION_CHARGED_EVENT &&
            event.involvedEntityIds.includes(subjectId),
        )!;
        expect(charged.tags).toContain(`justice.court:${courtId}`);
        expect(charged.tags).toContain(`justice.cash-bail-amount:${amount}`);
      });
      it("debits the named payer and holds the entire saved amount", () => {
        expect(
          paid.history.events.some(
            (event) =>
              event.type === PRETRIAL_RELEASED_EVENT &&
              event.involvedEntityIds.includes(subjectId),
          ),
          `${seed}: ${personName(paid.people[subjectId]!)}`,
        ).toBe(true);
        expect(
          paid.history.events.some(
            (event) =>
              event.type === PRETRIAL_HELD_EVENT &&
              event.involvedEntityIds.includes(subjectId),
          ),
        ).toBe(false);
        expect(balance(paid, { kind: "person", personId: subjectId })).toBe(
          balance(base, { kind: "person", personId: subjectId }) - amount,
        );
        expect(balance(paid, { kind: "organization", organizationId })).toBe(
          balance(base, { kind: "organization", organizationId }) + amount,
        );
        expect(heldCashBailMinorUnits(paid, organizationId)).toBe(amount);
        const deposit = paid.history.resourceFlows.find(
          (flow) => flow.basisKind === "custom:refundable-cash-bail",
        )!;
        receipts.push({
          seed,
          place: state.jurisdictionKey,
          personId: subjectId,
          name: personName(paid.people[subjectId]!),
          courtId,
          organizationId,
          chargedEventId: charged.id,
          depositFlowId: deposit.id,
          amountMinorUnits: amount,
          payerBalance: balance(paid, { kind: "person", personId: subjectId }),
          governmentBalance: balance(paid, {
            kind: "organization",
            organizationId,
          }),
        });
        const saved = deserializeWorld(serializeWorld(paid));
        expect(
          payFullCashBail(saved, {
            chargedEventId: charged.id,
            courtId,
            defendantId: subjectId,
            payer: { kind: "person", personId: subjectId },
            amountMinorUnits: amount,
          }).world,
        ).toBe(saved);
      });
      it("refunds at the actual case close and never pays twice", () => {
        const closed = closeCase(paid);
        const ended = closed.history.events.find(
          (event) =>
            event.type === PROSECUTION_ENDED_EVENT &&
            event.involvedEntityIds.includes(subjectId),
        )!;
        expect(ended).toBeDefined();
        expect(balance(closed, { kind: "person", personId: subjectId })).toBe(
          balance(base, { kind: "person", personId: subjectId }),
        );
        expect(balance(closed, { kind: "organization", organizationId })).toBe(
          balance(base, { kind: "organization", organizationId }),
        );
        expect(heldCashBailMinorUnits(closed, organizationId)).toBe(0);
        const restored = deserializeWorld(serializeWorld(closed));
        expect(refundCashBailAtCaseClose(restored, ended.id)).toBe(restored);
        Object.assign(
          receipts.find((row) => row.seed === seed)!,
          {
            closeEventId: ended.id,
            closeDate: ended.occurredAt,
            refundFlowId: restored.history.resourceFlows.find(
              (flow) => flow.basisKind === "custom:cash-bail-refund",
            )!.id,
          },
        );
      });
      it("keeps an actually unfunded defendant held without claiming payment", () => {
        const held = unfundedCase();
        expect(
          held.history.events.some(
            (event) =>
              event.type === PRETRIAL_HELD_EVENT &&
              event.involvedEntityIds.includes(subjectId),
          ),
        ).toBe(true);
        expect(
          held.history.resourceFlows.some(
            (flow) => flow.basisKind === "custom:refundable-cash-bail",
          ),
        ).toBe(false);
        expect(balance(held, { kind: "organization", organizationId })).toBe(
          balance(base, { kind: "organization", organizationId }),
        );
        expect(
          payFullCashBail(held, {
            chargedEventId: charged.id,
            courtId: "missing-saved-court",
            defendantId: subjectId,
            payer: { kind: "person", personId: subjectId },
            amountMinorUnits: bailMinorUnits("crime:robbery"),
          }).status,
        ).toBe("unsupported");
      });
      it("allows an actual resident household to post cash and ends the hold", () => {
        let held = unfundedCase();
        expect(heldBeforeTrialOn(held, subjectId)).toBe(true);
        const householdId = householdMembershipsAt(held, subjectId)[0]!
          .membership.householdId;
        const payer = { kind: "household" as const, householdId };
        if (!resourcePositionAt(held, payer, currency))
          held = createResourcePosition(held, {
            stableKey: "fixture:g11-household-position",
            owner: payer,
            openedAt: held.currentDate,
            openingBalance: money(0, "USD"),
            provenance: {
              kind: "authored",
              note: "Controlled known-zero fixture wallet before the actual funding transfer.",
            },
          });
        held = createResourceFlow(held, {
          stableKey: "fixture:g11-household-funding",
          source: { kind: "person", personId: donorId },
          recipient: payer,
          startsAt: held.currentDate,
          amount: money(amount, "USD"),
          cadenceKind: "custom:fixture-gift",
          basisKind: "custom:fixture-gift",
          basisReference: { kind: "general" },
          restrictionKind: "custom:fixture",
          jurisdictionId: charged.jurisdictionId,
          provenance: {
            kind: "authored",
            note: "Controlled actual transfer to the defendant's recorded resident household.",
          },
        });
        const funding = held.history.resourceFlows.at(-1)!;
        held = recordResourceTransferOutcome(held, {
          stableKey: "fixture:g11-household-funded",
          resourceFlowId: funding.id,
          occurredAt: held.currentDate,
          periodStartsAt: held.currentDate,
          periodEndsAt: held.currentDate,
          attemptedAmount: money(amount, "USD"),
          transferredAmount: money(amount, "USD"),
          status: "completed",
          reasonKind: null,
          note: "Controlled household funding.",
          provenance: funding.provenance,
        });
        const before = resourcePositionAt(held, payer, currency)!.liquidBalance
          .minorUnits;
        const posted = postCashBail(held, { referralId, payer });
        expect(posted.status).toBe("paid");
        expect(heldBeforeTrialOn(posted.world, subjectId)).toBe(false);
        expect(
          resourcePositionAt(posted.world, payer, currency)!.liquidBalance
            .minorUnits,
        ).toBe(before - amount);
        expect(heldCashBailMinorUnits(posted.world, organizationId)).toBe(
          amount,
        );
        const saved = deserializeWorld(serializeWorld(posted.world));
        expect(postCashBail(saved, { referralId, payer }).world).toBe(saved);
        const closed = closeCase(saved);
        expect(
          resourcePositionAt(closed, payer, currency)!.liquidBalance.minorUnits,
        ).toBe(before);
        expect(heldCashBailMinorUnits(closed, organizationId)).toBe(0);
        const ended = closed.history.events.find(
          (event) =>
            event.type === PROSECUTION_ENDED_EVENT &&
            event.involvedEntityIds.includes(subjectId),
        )!;
        const restored = deserializeWorld(serializeWorld(closed));
        expect(refundCashBailAtCaseClose(restored, ended.id)).toBe(restored);
        Object.assign(
          receipts.find((row) => row.seed === seed)!,
          {
            householdId,
            householdCloseEventId: ended.id,
            householdRefundFlowId: restored.history.resourceFlows.find(
              (flow) => flow.basisKind === "custom:cash-bail-refund",
            )!.id,
          },
        );
      });
    });
});
