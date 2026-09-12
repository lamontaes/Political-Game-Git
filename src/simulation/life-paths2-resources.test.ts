import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { deserializeWorld, serializeWorld } from "./serialization";
import { addDays } from "./dates";
import { advanceWorld } from "./world";
import {
  money,
  createResourceFlow,
  recordResourceTransferOutcome,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import {
  enterLifePath,
  changeLifePathStatus,
  scheduleLifePathSession,
  performLifePathSession,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import type { EntityId, World } from "./types";

function normal() {
  return createNewGameWorld({
    seed: "life-pay-normal",
    placeKey: "kentucky",
    startAge: 30,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "lives-alone",
    givenName: "Morgan",
    familyName: "Reed",
  }).world;
}
function actor(w: World) {
  if (w.control.kind !== "person") throw new Error("Missing player");
  return w.control.personId;
}
const balance = (w: World) =>
  resourcePositionAt(
    w,
    { kind: "person", personId: actor(w) },
    money(0, "USD").currency,
  )?.liquidBalance.minorUnits;
function workSession(w: World, id: EntityId, shiftNumber: number) {
  const scheduled = scheduleLifePathSession(w, id);
  expect(scheduled.ok, `shift ${shiftNumber}: ${scheduled.message}`).toBe(true);
  return {
    world: scheduled.world,
    id: scheduled.world.history.scheduledActivities.at(-1)!.id,
  };
}
describe("LIFE normal earned-money account lifecycle", () => {
  it("uses actual normal work pay for study with no starting funds, then reloads without paying twice", () => {
    let w = normal();
    expect(w.history.resourcePositions).toHaveLength(0);
    const enteredWork = enterLifePath(w, "shop-assistant");
    expect(enteredWork.ok, enteredWork.message).toBe(true);
    w = enteredWork.world;
    const workId = w.history.workRelationships.at(-1)!.id;
    for (let shiftNumber = 0; shiftNumber < 9; shiftNumber += 1) {
      const shift = workSession(w, workId, shiftNumber + 1);
      const worked = performLifePathSession(shift.world, shift.id);
      expect(worked.ok).toBe(true);
      if (shiftNumber === 0) expect(balance(worked.world)).toBeUndefined();
      w = advanceWorld(worked.world, 1, LIFE_PATHS2_HANDLERS);
    }
    expect(balance(w)).toBe(64_800);
    expect(w.history.resourcePositions.at(-1)!.openingBalance.minorUnits).toBe(
      0,
    );
    const transfer = w.history.resourceTransferOutcomes.at(-1)!;
    expect(w.history.resourcePositions.at(-1)!.sequence).toBeLessThan(
      transfer.sequence,
    );
    w = changeLifePathStatus(w, workId, "leave").world;
    w = deserializeWorld(serializeWorld(w));
    w = enterLifePath(w, "college-office-certificate").world;
    const attended = advanceWorld(w, 161, LIFE_PATHS2_HANDLERS);
    expect(balance(attended)).toBe(4_800);
    expect(
      balance(
        advanceWorld(
          deserializeWorld(serializeWorld(attended)),
          1,
          LIFE_PATHS2_HANDLERS,
        ),
      ),
    ).toBe(4_800);
  }, 30_000);
  it("blocks an unfunded period without inventing an account or tuition payment", () => {
    const entered = enterLifePath(normal(), "college-office-certificate").world;
    const expectedDate = addDays(entered.currentDate, 161);
    const blocked = advanceWorld(entered, 161, LIFE_PATHS2_HANDLERS);
    expect(blocked.currentDate).toBe(expectedDate);
    expect(blocked.history.resourcePositions).toHaveLength(0);
    expect(blocked.history.resourceTransferOutcomes).toHaveLength(0);
    expect(blocked.history.educationEnrollmentStates.at(-1)?.status).toBe(
      "active",
    );
    expect(blocked.history.futureDueItemStates.at(-1)).toMatchObject({
      status: "blocked",
      reasonKey: "education:insufficient-tuition",
    });
  });
  it("recovers only real earlier net transfers, preserving history and excluding other currencies and owners", () => {
    let w = normal();
    const entered = enterLifePath(w, "shop-assistant").world;
    const organizationId =
      entered.history.workRelationships.at(-1)!.organizationId!;
    w = entered;
    const owner = { kind: "person" as const, personId: actor(w) };
    const employer = { kind: "organization" as const, organizationId };
    for (const [name, source, recipient, amount, currency] of [
      ["earned", employer, owner, 72_000, "USD"],
      ["spent", owner, employer, 12_000, "USD"],
      ["foreign", employer, owner, 999, "EUR"],
    ] as const) {
      w = createResourceFlow(w, {
        stableKey: name,
        source,
        recipient,
        startsAt: w.currentDate,
        amount: money(amount, currency),
        cadenceKind: "schedule:one-time",
        basisKind: "custom:repair-test",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Explicit historical transfer regression.",
        },
      });
      w = recordResourceTransferOutcome(w, {
        stableKey: name,
        resourceFlowId: w.history.resourceFlows.at(-1)!.id,
        periodStartsAt: w.currentDate,
        periodEndsAt: w.currentDate,
        occurredAt: w.currentDate,
        status: "completed",
        attemptedAmount: money(amount, currency),
        transferredAmount: money(amount, currency),
        reasonKind: null,
        note: name,
        provenance: {
          kind: "authored",
          note: "Explicit historical transfer regression.",
        },
      });
    }
    const outcomes = w.history.resourceTransferOutcomes;
    const repaired = ensureLifePathPersonalPosition(
      w,
      actor(w),
      money(0, "USD").currency,
    );
    expect(balance(repaired)).toBe(60_000);
    expect(repaired.history.resourceTransferOutcomes).toEqual(outcomes);
    expect(repaired.history.resourcePositions.at(-1)!.provenance).toMatchObject(
      { note: expect.stringContaining(outcomes[0]!.id) },
    );
    expect(
      ensureLifePathPersonalPosition(
        repaired,
        actor(w),
        money(0, "USD").currency,
      ),
    ).toBe(repaired);
    const study = enterLifePath(
      deserializeWorld(serializeWorld(w)),
      "college-office-certificate",
    ).world;
    expect(balance(advanceWorld(study, 161, LIFE_PATHS2_HANDLERS))).toBe(0);
  }, 30_000);
});
