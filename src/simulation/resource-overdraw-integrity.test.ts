import { describe, expect, it } from "vitest";

import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import {
  createResourceFlows,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import type { ResourcePositionOwner, World } from "./types";
import { assertWorldIntegrityFully } from "./world";

/**
 * The check that a payment never overdraws its source reads the balance as it
 * stood when the payment was made, so a payment that passed once passes again
 * in any world that only adds to the history it was checked against. It must
 * still catch a payment added later and a payment whose history was rewritten.
 */
const provenance = {
  kind: "authored" as const,
  note: "Controlled payment fixture; not observed income or a production clock receipt.",
};

describe("a payment that overdraws its source is refused", () => {
  const seed = "resource-overdraw-integrity";
  const place = pickDistinct(
    new SeededRng(seed),
    lifePlaceStateIdentities(),
    1,
  )[0]!.jurisdictionKey;

  function fixture() {
    const small = smallWorld({
      place,
      seed,
      date: "2026-01-01",
      household: true,
    });
    const payer: ResourcePositionOwner = {
      kind: "person",
      personId: small.personId,
    };
    let world = createResourcePosition(small.world, {
      stableKey: "overdraw:position",
      owner: payer,
      openedAt: small.world.currentDate,
      openingBalance: money(100, "USD"),
      provenance,
    });
    world = createResourceFlows(
      world,
      [0, 1].map((index) => ({
        stableKey: `overdraw:flow:${index}`,
        source: payer,
        recipient: { kind: "person" as const, personId: world.personOrder[1]! },
        startsAt: world.currentDate,
        amount: money(80, "USD"),
        cadenceKind: "schedule:once",
        basisKind: "custom:payment-fixture",
        basisReference: { kind: "general" as const },
        restrictionKind: null,
        jurisdictionId: small.jurisdictionId,
        provenance,
      })),
    );
    const flows = world.history.resourceFlows.slice(-2);
    const pay = (from: World, index: number, amount: number): World =>
      recordResourceTransferOutcome(from, {
        stableKey: `overdraw:outcome:${index}`,
        resourceFlowId: flows[index]!.id,
        periodStartsAt: from.currentDate,
        periodEndsAt: from.currentDate,
        occurredAt: from.currentDate,
        status: amount === 80 ? "completed" : "partial",
        attemptedAmount: money(80, "USD"),
        transferredAmount: money(amount, "USD"),
        reasonKind: amount === 80 ? null : "custom:insufficient-funds",
        note: "Recorded fixture transfer.",
        provenance,
      });
    return { world, pay };
  }

  /** The last recorded payment, rewritten to move all 80 though 20 remain. */
  function forgeLastPayment(world: World): World {
    const outcomes = world.history.resourceTransferOutcomes;
    const last = outcomes.at(-1)!;
    return {
      ...world,
      history: {
        ...world.history,
        resourceTransferOutcomes: [
          ...outcomes.slice(0, -1),
          {
            ...last,
            status: "completed",
            reasonKind: null,
            transferredAmount: money(80, "USD"),
          },
        ],
      },
    };
  }

  it(`in ${place}: a payment added after a passing check is still checked`, () => {
    const { world: opened, pay } = fixture();
    const first = pay(opened, 0, 80);
    assertWorldIntegrityFully(first);
    // The second payment can move only the 20 left; claiming 80 overdraws.
    const forged = forgeLastPayment(pay(first, 1, 20));
    expect(() => assertWorldIntegrityFully(forged)).toThrow(/overdrew/);
  });

  it(`in ${place}: a payment whose earlier history was rewritten is checked again`, () => {
    const { world: opened, pay } = fixture();
    const both = pay(pay(opened, 0, 40), 1, 40);
    assertWorldIntegrityFully(both);
    // The first payment is rewritten to take the whole 80, so the second
    // (unchanged, same record) now overdraws what is left.
    const outcomes = both.history.resourceTransferOutcomes;
    const rewritten: World = {
      ...both,
      history: {
        ...both.history,
        resourceTransferOutcomes: [
          {
            ...outcomes[0]!,
            transferredAmount: money(80, "USD"),
            status: "completed",
            reasonKind: null,
          },
          outcomes[1]!,
        ],
      },
    };
    expect(() => assertWorldIntegrityFully(rewritten)).toThrow(/overdrew/);
  });
});
