import { describe, expect, it } from "vitest";
import { CRISIS_FUNDING_ROWS } from "./crisis-response-funding-rows";
import { ensureCrisisStandingAppropriations } from "./crisis-standing-appropriations";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import { stateJurisdictionForKey } from "./life-places";
import { createWorld } from "./world";
import { deserializeWorld, serializeWorld } from "./serialization";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import { stableHash } from "./ids";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { ensurePublicBudgets } from "./public-budgets";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import {
  commitPublicProgram,
  programAuthority,
  programPosition,
  settleProgramInstallment,
} from "./governing/public-program";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import { city, pay } from "../../tests/fixtures/public-program-fixture";

const date = makeIsoDate("2026-01-05");
const active = CRISIS_FUNDING_ROWS.flatMap((row) =>
  "unreported" in row.state
    ? []
    : row.state.stateAdoptedAppropriations
        .filter(
          (amount) =>
            amount.availableFrom <= date && date <= amount.availableThrough,
        )
        .map((amount) => ({ row, amount })),
);
function allPlaces() {
  return createWorld({
    seed: "team6-988-authority-all-56",
    currentDate: date,
    people: [],
    jurisdictions: CRISIS_FUNDING_ROWS.map((row) =>
      stateJurisdictionForKey(row.placeKey)!,
    ),
  });
}

describe("sourced standing 988 authority uses the existing appropriation path", () => {
  it("records each actual active state amount across all 56 places without grant receipts or services", () => {
    expect(CRISIS_FUNDING_ROWS).toHaveLength(56);
    const start = allPlaces();
    const world = ensureCrisisStandingAppropriations(start);
    const records = world.history.publicProgramRecords ?? [];
    expect(records).toHaveLength(active.length);
    for (const { row, amount } of active) {
      const record = records.find(
        (r) => r.jurisdictionId === stateJurisdictionForKey(row.placeKey)!.id,
      );
      expect(record?.kind).toBe("appropriation");
      if (record?.kind !== "appropriation")
        throw new Error("Missing actual state authority");
      expect(record.amount).toEqual(money(amount.amountMinorUnits, "USD"));
      expect(record.availableFrom).toBe(amount.availableFrom);
      expect(record.availableThrough).toBe(amount.availableThrough);
      expect(record.sourceMeasureId).toBeNull();
      expect(record.basis.kind).toBe("sourced");
      expect(record.basis.note).toContain(amount.sourceQuote);
      expect(
        resourcePositionAt(
          world,
          {
            kind: "organization",
            organizationId: record.accountOrganizationId,
          },
          record.amount.currency,
        )!.liquidBalance.minorUnits,
      ).toBe(0);
      expect(
        programPosition(world, record.programKey, record.id),
      ).toMatchObject({
        committed: money(0, "USD"),
        posted: money(0, "USD"),
        unitsOperational: null,
      });
    }
    expect(world.history.resourceFlows).toEqual(start.history.resourceFlows);
    expect(world.history.resourceTransferOutcomes).toEqual(
      start.history.resourceTransferOutcomes,
    );
    expect(world.personOrder).toEqual(start.personOrder);
    const bytes = serializeWorld(world);
    const loaded = deserializeWorld(bytes);
    expect(serializeWorld(loaded)).toBe(bytes);
    expect(ensureCrisisStandingAppropriations(loaded)).toBe(loaded);
    console.log(
      "988_AUTHORITY",
      "places",
      56,
      "activeRecords",
      records.length,
      "appropriationIDs",
      records.map((r) => r.id),
    );
  });

  it("does not renew expired periods, use federal ceilings, or fill unreported places", () => {
    const end = CRISIS_FUNDING_ROWS.flatMap((row) =>
      "unreported" in row.state
        ? []
        : row.state.stateAdoptedAppropriations.map((a) => a.availableThrough),
    )
      .sort()
      .at(-1)!;
    const start = createWorld({
      seed: "team6-988-expired",
      currentDate: addDays(makeIsoDate(end), 1),
      jurisdictions: CRISIS_FUNDING_ROWS.map((row) =>
        stateJurisdictionForKey(row.placeKey)!,
      ),
      people: [],
    });
    expect(ensureCrisisStandingAppropriations(start)).toBe(start);
    const missing = createWorld({
      seed: "team6-988-no-government",
      currentDate: date,
      jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
      people: [],
    });
    expect(ensureCrisisStandingAppropriations(missing)).toBe(missing);
  });

  it("the actual budget opening records authority once and preserves it through reload", () => {
    const opening = ensureWorldStartingConditions(allPlaces(), {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const world = ensurePublicBudgets(opening);
    expect(
      world.history.publicProgramRecords?.filter(
        (r) => r.kind === "appropriation",
      ),
    ).toHaveLength(active.length);
    expect(world.history.resourceTransferOutcomes).toEqual(
      opening.history.resourceTransferOutcomes,
    );
    const loaded = deserializeWorld(serializeWorld(world));
    expect(ensurePublicBudgets(loaded)).toBe(loaded);
  });

  it("a named office holder cannot spend above authority, after lapse or without actual cash", () => {
    const fixture = city("team6-988-cash-limits", 2_500_000_00);
    const selected =
      active[
        parseInt(stableHash("team6-988-cash-limits").slice(0, 8), 16) %
          active.length
      ]!;
    const stateUsps = selected.row.placeKey.slice(3);
    let world = ensureStateExecutiveIncumbent(
      fixture.world,
      fixture.manager,
      stateUsps,
    );
    world = ensureCrisisStandingAppropriations(world);
    const governor = currentStateExecutiveHolders(world).find(
      (h) => h.stateUsps === stateUsps,
    )!;
    const appropriation = world.history.publicProgramRecords?.find(
      (r) =>
        r.kind === "appropriation" &&
        r.programKey.startsWith("behavioral-health-crisis-response:"),
    );
    if (appropriation?.kind !== "appropriation")
      throw new Error(`No actual ${selected.row.placeName} authority`);
    expect(
      programAuthority(
        world,
        governor.personId,
        { kind: "state-executive" },
        appropriation,
      ).status,
    ).toBe("available");
    const request = (key: string, amount: number, afterDays = 0) =>
      commitPublicProgram(world, {
        appropriationId: appropriation.id,
        personId: governor.personId,
        office: { kind: "state-executive" },
        recipientOrganizationId: fixture.operator,
        alternative: {
          key,
          title: "Explicit test decision, not a natural operating cost",
          installments: [
            { afterDays, amount: money(amount, "USD"), purpose: "operating" },
          ],
          deliveryLeadDays: null,
        },
      });
    expect(
      request("above-limit", appropriation.amount.minorUnits + 1),
    ).toMatchObject({ ok: false, world });
    expect(
      request(
        "after-lapse",
        100,
        daysBetween(world.currentDate, appropriation.availableThrough) + 1,
      ),
    ).toMatchObject({ ok: false, world });
    const noCash = request("no-cash", 100);
    if (!noCash.ok) throw new Error(noCash.reason);
    const failed = settleProgramInstallment(noCash.world, noCash.recordId, 0);
    expect(failed.installment).toMatchObject({
      status: "failed",
      resourceFlowId: null,
    });
    expect(failed.installment.reason).toContain("An appropriation is not cash");
    expect(failed.world.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    world = pay(
      failed.world,
      "team6-988-real-fixture-receipt",
      fixture.payer,
      appropriation.accountOrganizationId,
      100,
    );
    const funded = request("actual-cash", 100);
    if (!funded.ok) throw new Error(funded.reason);
    const paid = settleProgramInstallment(funded.world, funded.recordId, 0);
    expect(paid.installment.status).toBe("posted");
    const outcome = paid.world.history.resourceTransferOutcomes.at(-1)!;
    expect(outcome.transferredAmount).toEqual(money(100, "USD"));
    expect(
      programPosition(paid.world, appropriation.programKey, appropriation.id)
        .posted,
    ).toEqual(money(100, "USD"));
    expect(settleProgramInstallment(paid.world, funded.recordId, 0).world).toBe(
      paid.world,
    );
    const restored = deserializeWorld(serializeWorld(paid.world));
    expect(settleProgramInstallment(restored, funded.recordId, 0).world).toBe(
      restored,
    );
    console.log(
      "988_PAYMENT_FIXTURE",
      selected.row.placeKey,
      "seed team6-988-cash-limits",
      governor.personId,
      appropriation.id,
      paid.installment.id,
      outcome.id,
    );
  });
});
