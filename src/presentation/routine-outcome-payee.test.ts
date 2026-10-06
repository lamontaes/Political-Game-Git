import { describe, expect, it } from "vitest";

import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "../simulation/resources";
import type { EntityId, World } from "../simulation/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { describeRoutineOutcome } from "./routine-outcome";

const PROVENANCE = { kind: "authored" as const, note: "payee line test" };

function pay(
  world: World,
  source: { kind: "person"; personId: EntityId },
  recipient: Parameters<typeof createResourceFlow>[1]["recipient"],
  minorUnits: number,
  key: string,
): World {
  const flowed = createResourceFlow(world, {
    stableKey: `payee:${key}`,
    source,
    recipient,
    startsAt: world.currentDate,
    amount: money(minorUnits, "USD"),
    cadenceKind: "custom:test-transfer",
    basisKind: "custom:test-transfer",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance: PROVENANCE,
  });
  return recordResourceTransferOutcome(flowed, {
    stableKey: `payee:${key}:outcome`,
    resourceFlowId: flowed.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(minorUnits, "USD"),
    transferredAmount: money(minorUnits, "USD"),
    reasonKind: null,
    note: null,
    provenance: PROVENANCE,
  });
}

describe("a payment line says who was paid", () => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: 35,
    household: "lives-alone",
    seed: "routine-outcome-payee",
  });
  const world = openOrdinaryLife(game.world, game.playerPersonId);
  const playerId = game.playerPersonId;
  const source = { kind: "person" as const, personId: playerId };

  it("names the household that was paid", () => {
    const household = world.history.households[0]!;
    const after = pay(
      world,
      source,
      { kind: "household", householdId: household.id },
      19_346,
      "household",
    );
    expect(describeRoutineOutcome(world, after, playerId)).toContain(
      `Paid $193.46 to ${household.label}.`,
    );
  });

  it("names the person who was paid", () => {
    const otherId = world.personOrder.find((id) => id !== playerId)!;
    const other = world.people[otherId]!;
    const after = pay(
      world,
      source,
      { kind: "person", personId: otherId },
      5_000,
      "person",
    );
    const notice = describeRoutineOutcome(world, after, playerId);
    expect(notice).toMatch(/Paid \$50 to \S/);
    expect(notice).toContain(other.givenName);
  });
});
