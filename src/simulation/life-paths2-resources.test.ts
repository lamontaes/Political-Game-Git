import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { deserializeWorld, serializeWorld } from "./serialization";
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
  scheduleLifePathSession,
  performLifePathSession,
  LIFE_PATHS2_HANDLERS,
} from "./life-paths2";
import type { World } from "./types";

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
function session(w: World, path: string) {
  w = enterLifePath(w, path).world;
  const id =
    path === "shop-assistant"
      ? w.history.workRelationships.at(-1)!.id
      : w.history.educationEnrollments.at(-1)!.id;
  const scheduled = scheduleLifePathSession(w, id);
  expect(scheduled.ok).toBe(true);
  return {
    world: scheduled.world,
    id: scheduled.world.history.scheduledActivities.at(-1)!.id,
  };
}
describe("LIFE normal earned-money account lifecycle", () => {
  it("uses actual normal work pay for study with no starting funds, then reloads without paying twice", () => {
    let w = normal();
    expect(w.history.resourcePositions).toHaveLength(0);
    const shift = session(w, "shop-assistant");
    const worked = performLifePathSession(shift.world, shift.id);
    expect(worked.ok).toBe(true);
    expect(balance(worked.world)).toBeUndefined();
    w = advanceWorld(worked.world, 1, LIFE_PATHS2_HANDLERS);
    expect(balance(w)).toBe(7200);
    expect(w.history.resourcePositions.at(-1)!.openingBalance.minorUnits).toBe(
      0,
    );
    const transfer = w.history.resourceTransferOutcomes.at(-1)!;
    expect(w.history.resourcePositions.at(-1)!.sequence).toBeLessThan(
      transfer.sequence,
    );
    w = deserializeWorld(serializeWorld(w));
    const study = session(w, "college-office-certificate");
    const attended = performLifePathSession(study.world, study.id);
    expect(attended.ok).toBe(true);
    expect(balance(attended.world)).toBe(4700);
    expect(
      balance(
        advanceWorld(
          deserializeWorld(serializeWorld(attended.world)),
          1,
          LIFE_PATHS2_HANDLERS,
        ),
      ),
    ).toBe(4700);
  });
  it("refuses unfunded study without creating an account or changing time", () => {
    const study = session(normal(), "college-office-certificate");
    expect(performLifePathSession(study.world, study.id).world).toBe(
      study.world,
    );
    expect(study.world.history.resourcePositions).toHaveLength(0);
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
      ["earned", employer, owner, 7200, "USD"],
      ["spent", owner, employer, 1200, "USD"],
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
    expect(balance(repaired)).toBe(6000);
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
    const study = session(
      deserializeWorld(serializeWorld(w)),
      "college-office-certificate",
    );
    expect(balance(performLifePathSession(study.world, study.id).world)).toBe(
      3500,
    );
  });
});
