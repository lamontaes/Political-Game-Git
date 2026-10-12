import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { createOrganization } from "../../simulation/life";
import { createResourcePosition, money } from "../../simulation/resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../../simulation/tax-policy";
import {
  declareProgramCapacity,
  recordProgramAppropriation,
  commitPublicProgram,
  programDeliveryHandler as nativeDelivery,
  PUBLIC_PROGRAM_DELIVERY,
} from "../../simulation/governing/public-program";
import {
  programDeliveryHandler,
  resumeProgramDelivery,
  type DeliveryFacts,
} from "./program-delivery";
import { addDays } from "../../simulation/dates";
import { pay, FIXTURE } from "../../../tests/fixtures/public-program-fixture";
import type { World } from "../../simulation/types";
function facts(world: World): DeliveryFacts {
  return {
    worldId: world.id,
    onDate: world.currentDate,
    moment: world.currentMoment,
    nextSequence: world.history.nextSequence,
    records: world.history.publicProgramRecords ?? [],
    jurisdictions: world.jurisdictions,
    localPlaceLabels: new Map(),
    workItems: world.history.workItems,
    workItemStates: world.history.workItemStates,
  };
}
describe("laws: native delivery parent and prepare/receiver/resume requests", () => {
  it.each(Object.keys(STATES))(
    "matches actual federal commitment and capacity delivery in %s",
    (usps) => {
      const base = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        offices: ["congress"],
        seed: "rules2-law-delivery:" + usps,
      });
      const id = NATIONAL_ELECTION_JURISDICTION.id;
      let ready = ensureTaxPublicAccount(
        ensureNationalElectionJurisdiction(base.world),
        id,
      );
      const account = publicTaxAccountForJurisdiction(ready, id)!;
      const provenance = {
        kind: "authored" as const,
        note: "Controlled payer funds and recipient, not an opening public balance.",
      };
      ready = createOrganization(ready, {
        stableKey: "rules2:program-payer",
        formedAt: ready.currentDate,
        provenance,
        initialProfile: {
          name: "Authored receipts payer",
          classification: "sector:private",
          locationJurisdictionId: id,
        },
      });
      const payer = ready.history.organizations.at(-1)!.id;
      ready = createOrganization(ready, {
        stableKey: "rules2:program-recipient",
        formedAt: ready.currentDate,
        provenance,
        initialProfile: {
          name: "Authored service operator",
          classification: "sector:private",
          locationJurisdictionId: id,
        },
      });
      const recipient = ready.history.organizations.at(-1)!.id;
      ready = createResourcePosition(ready, {
        stableKey: "rules2:payer-cash",
        owner: { kind: "organization", organizationId: payer },
        openedAt: ready.currentDate,
        openingBalance: money(300000000, "USD"),
        provenance,
      });
      ready = createResourcePosition(ready, {
        stableKey: "rules2:recipient-cash",
        owner: { kind: "organization", organizationId: recipient },
        openedAt: ready.currentDate,
        openingBalance: money(0, "USD"),
        provenance,
      });
      ready = pay(
        ready,
        "rules2:recorded-receipts",
        payer,
        account.organizationId,
        250000000,
      );
      const president = currentPresidentOf(ready)!;
      expect(president).not.toBeNull();
      for (const mode of ["normal", "zero", "unpriced", "missing"] as const) {
        let world = ready;
        const programKey = "fixture:capacity-delivery";
        if (mode !== "missing")
          world = declareProgramCapacity(world, {
            edition: "rules2:" + mode,
            programKey,
            jurisdictionId: id,
            serviceLabel: "Authored national service",
            unitLabel: "units",
            unitsTotal: 10,
            unitsOperational: 8,
            monthlyOperatingNeed: money(20000000, "USD"),
            completedPermille: 600,
            restorationCostPerUnit:
              mode === "unpriced"
                ? null
                : money(mode === "zero" ? 60000000 : 15000000, "USD"),
            basis: FIXTURE,
          }).world;
        const appropriation = recordProgramAppropriation(world, {
          edition: "rules2:" + mode,
          programKey,
          jurisdictionId: id,
          accountOrganizationId: account.organizationId,
          amount: money(200000000, "USD"),
          availableFrom: world.currentDate,
          availableThrough: addDays(world.currentDate, 364),
          basis: FIXTURE,
        });
        world = appropriation.world;
        const committed = commitPublicProgram(world, {
          appropriationId: appropriation.id,
          alternative: {
            key: "rules2-maintenance",
            title: "Authored paid maintenance",
            installments: [
              {
                afterDays: 0,
                amount: money(30000000, "USD"),
                purpose: "maintenance",
              },
            ],
            deliveryLeadDays: 0,
          },
          personId: president.personId,
          office: { kind: "federal-executive" },
          recipientOrganizationId: recipient,
        });
        if (!committed.ok) throw Error(committed.reason);
        world = committed.world;
        // Native commit posts a same-day installment immediately; its delivery is the scheduled due item.
        expect(
          world.history.publicProgramRecords?.some(
            (r) => r.kind === "installment" && r.status === "posted",
          ),
        ).toBe(true);
        const delivery = world.history.futureDueItems.find(
          (r) => r.transitionKey === PUBLIC_PROGRAM_DELIVERY,
        )!;
        expect(delivery).toBeDefined();
        const prepared = programDeliveryHandler(facts(world), delivery);
        expect(prepared.kind).toBe("apply-capacity-and-receivers");
        if (prepared.kind !== "apply-capacity-and-receivers")
          throw Error("Missing own delivery request.");
        let afterReceivers = world;
        const native = nativeDelivery(world, delivery, [
          {
            key: "rules2:record-midpoint",
            receive: (next) => {
              afterReceivers = next;
              return next;
            },
          },
        ]);
        const resumed = resumeProgramDelivery(facts(afterReceivers), prepared);
        const { kind, completion, ...result } = resumed;
        expect(kind).toBe("result");
        expect(result).toEqual({
          status: native.status,
          reasonKey: native.reasonKey,
          context: native.context,
          outcomeEventId: native.outcomeEventId,
        });
        if (prepared.capacity) {
          const outturn = native.world.history.publicProgramRecords!.find(
            (r) => r.kind === "capacity-outturn",
          )!;
          expect(outturn).toMatchObject(prepared.capacity.record);
          const event = native.world.history.events.find(
            (e) => e.id === outturn.eventId,
          )!;
          expect(event.summary).toBe(prepared.capacity.event.summary);
        } else expect(native.status).toBe("blocked");
        if (completion)
          expect(native.world.history.workItemStates.at(-1)).toEqual(
            completion,
          );
        const repeated = programDeliveryHandler(facts(native.world), delivery);
        if (mode !== "missing") {
          expect(repeated.kind).toBe("result");
          if (repeated.kind === "result")
            expect(repeated.context).toBe(
              nativeDelivery(native.world, delivery, []).context,
            );
        }
      }
    },
  );
});
