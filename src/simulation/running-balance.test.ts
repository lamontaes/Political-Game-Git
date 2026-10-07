import { describe, expect, it } from "vitest";

import { appendedList } from "./history-index";
import { resourcePositionAt } from "./resource-queries";
import type {
  EntityId,
  HistoricalCutoff,
  ResourceEndpoint,
  ResourceFlow,
  ResourcePosition,
  ResourceTransferOutcome,
  World,
} from "./types";

/**
 * A balance is read from running totals kept as payments are recorded. It must
 * be exactly what adding up every payment gives: at the present moment, at an
 * earlier moment, for a position opened after some payments, in each currency,
 * and for an account that pays itself.
 */

const id = (value: string) => value as EntityId;
const person = (n: number): ResourceEndpoint => ({
  kind: "person",
  personId: id(`person_${n}`),
});
const owner = (n: number) =>
  ({ kind: "person", personId: id(`person_${n}`) }) as const;
const sameKey = (left: ResourceEndpoint, right: ResourceEndpoint) =>
  JSON.stringify(left) === JSON.stringify(right);

interface Lists {
  positions: readonly ResourcePosition[];
  flows: readonly ResourceFlow[];
  outcomes: readonly ResourceTransferOutcome[];
  sequence: number;
  date: string;
}

const worldOf = (lists: Lists): World =>
  ({
    currentDate: lists.date,
    history: {
      resourcePositions: lists.positions,
      resourceFlows: lists.flows,
      resourceTransferOutcomes: lists.outcomes,
      nextSequence: lists.sequence,
    },
  }) as unknown as World;

/** What adding up every payment gives, read the slow way. */
function expected(
  lists: Lists,
  who: ReturnType<typeof owner>,
  currency: string,
  cutoff: HistoricalCutoff,
) {
  const endpoint = { kind: "person", personId: who.personId } as const;
  const position = lists.positions.find(
    (row) =>
      JSON.stringify(row.owner) === JSON.stringify(who) &&
      row.openingBalance.currency === currency &&
      row.openedAt <= cutoff.asOfDate &&
      row.sequence < cutoff.historySequenceExclusive,
  );
  if (!position) return undefined;
  let inflows = 0;
  let outflows = 0;
  const outcomeIds: EntityId[] = [];
  for (const outcome of lists.outcomes) {
    const flow = lists.flows.find((row) => row.id === outcome.resourceFlowId)!;
    const into = sameKey(flow.recipient, endpoint);
    const outOf = sameKey(flow.source, endpoint);
    if (!into && !outOf) continue;
    if (
      outcome.sequence <= position.sequence ||
      outcome.sequence >= cutoff.historySequenceExclusive ||
      outcome.occurredAt < position.openedAt ||
      outcome.occurredAt > cutoff.asOfDate ||
      outcome.transferredAmount.currency !== currency ||
      outcome.transferredAmount.minorUnits === 0
    )
      continue;
    if (into) inflows += outcome.transferredAmount.minorUnits;
    if (outOf) outflows += outcome.transferredAmount.minorUnits;
    outcomeIds.push(outcome.id);
  }
  return {
    inflows,
    outflows,
    liquid: position.openingBalance.minorUnits + inflows - outflows,
    outcomeIds,
  };
}

function day(n: number): string {
  const date = new Date(Date.UTC(2026, 0, 1 + n));
  return date.toISOString().slice(0, 10);
}

describe("running balances", () => {
  it("keeps delayed fast and historical evidence fixed across appends and siblings", () => {
    const flow = {
      id: id("held-flow"),
      sequence: 2,
      source: person(1),
      recipient: person(2),
      recordedAt: day(0),
      startsAt: day(0),
    } as unknown as ResourceFlow;
    const payment = (
      key: string,
      sequence: number,
      at: number,
      amount: number,
    ) =>
      ({
        id: id(key),
        resourceFlowId: flow.id,
        sequence,
        occurredAt: day(at),
        transferredAmount: { minorUnits: amount, currency: "USD" },
      }) as unknown as ResourceTransferOutcome;
    const first = payment("held-first", 3, 1, 10);
    const lists: Lists = {
      positions: [
        {
          id: id("held-position"),
          sequence: 1,
          owner: owner(1),
          openedAt: day(0),
          openingBalance: { minorUnits: 1000, currency: "USD" },
        } as unknown as ResourcePosition,
      ],
      flows: [flow],
      outcomes: [first],
      sequence: 4,
      date: day(1),
    };
    const currency = lists.positions[0]!.openingBalance.currency;
    const held = Object.freeze(
      resourcePositionAt(worldOf(lists), owner(1), currency)!,
    );
    expect(held.liquidBalance.minorUnits).toBe(990);
    const second: Lists = {
      ...lists,
      outcomes: appendedList(lists.outcomes, [
        payment("held-second", 4, 2, 20),
      ]),
      sequence: 5,
      date: day(2),
    };
    const cutoff = {
      asOfDate: day(1),
      historySequenceExclusive: 5,
    } as HistoricalCutoff;
    const historical = Object.freeze(
      resourcePositionAt(worldOf(second), owner(1), currency, cutoff)!,
    );
    expect(historical.liquidBalance.minorUnits).toBe(990);
    const third: Lists = {
      ...second,
      outcomes: appendedList(second.outcomes, [
        payment("held-third", 5, 3, 30),
      ]),
      sequence: 6,
      date: day(3),
    };
    expect(
      resourcePositionAt(worldOf(third), owner(1), currency)!.liquidBalance
        .minorUnits,
    ).toBe(940);
    const sibling: Lists = {
      ...lists,
      outcomes: appendedList(lists.outcomes, [
        payment("held-sibling", 4, 2, 90),
      ]),
      sequence: 5,
      date: day(2),
    };
    expect(
      resourcePositionAt(worldOf(sibling), owner(1), currency)!.liquidBalance
        .minorUnits,
    ).toBe(900);
    Object.assign(cutoff, { asOfDate: day(3), historySequenceExclusive: 99 });
    for (const snapshot of [held, historical]) {
      const json = JSON.stringify(snapshot);
      expect(JSON.parse(json).outcomeIds).toEqual([first.id]);
      expect(snapshot.outcomeIds).toEqual([first.id]);
      expect(snapshot.outcomeIds).toBe(snapshot.outcomeIds);
      expect(JSON.stringify(snapshot)).toBe(json);
      expect(snapshot.liquidBalance.minorUnits).toBe(990);
    }
  });

  it("equal the sum of every payment, however the balance is read", () => {
    let lists: Lists = {
      positions: [],
      flows: [],
      outcomes: [],
      sequence: 1,
      date: day(0),
    };
    const open = (n: number, at: number, currency = "USD") => {
      lists = {
        ...lists,
        positions: appendedList(lists.positions, [
          {
            id: id(`position_${n}_${currency}`),
            sequence: lists.sequence,
            owner: owner(n),
            openedAt: day(at),
            openingBalance: { minorUnits: 1000 * n, currency },
          } as unknown as ResourcePosition,
        ]),
        sequence: lists.sequence + 1,
      };
    };
    open(1, 0);
    open(2, 0);
    open(3, 0, "CAD");
    // Deterministic pattern of payments among four people, two currencies,
    // zero amounts, self-payments, and one position opened late.
    for (let step = 1; step <= 120; step += 1) {
      if (step === 40) open(4, step);
      const from = (step % 4) + 1;
      const to = step % 7 === 0 ? from : ((step * 3) % 4) + 1;
      const flow = {
        id: id(`flow_${step}`),
        sequence: lists.sequence,
        source: person(from),
        recipient: person(to),
        recordedAt: day(step),
        startsAt: day(step),
      } as unknown as ResourceFlow;
      const outcome = {
        id: id(`outcome_${step}`),
        sequence: lists.sequence + 1,
        resourceFlowId: flow.id,
        occurredAt: day(step % 11 === 0 ? step - 5 : step),
        transferredAmount: {
          minorUnits: step % 9 === 0 ? 0 : step * 7,
          currency: step % 5 === 0 ? "CAD" : "USD",
        },
      } as unknown as ResourceTransferOutcome;
      lists = {
        ...lists,
        flows: appendedList(lists.flows, [flow]),
        outcomes: appendedList(lists.outcomes, [outcome]),
        sequence: lists.sequence + 2,
        date: day(step),
      };
      const world = worldOf(lists);
      for (let n = 1; n <= 4; n += 1)
        for (const currency of ["USD", "CAD"])
          for (const cutoff of <HistoricalCutoff[]>[
            { asOfDate: day(step), historySequenceExclusive: lists.sequence },
            {
              asOfDate: day(Math.max(0, step - 3)),
              historySequenceExclusive: lists.sequence,
            },
            {
              asOfDate: day(step),
              historySequenceExclusive: Math.max(1, lists.sequence - 6),
            },
          ]) {
            const read = resourcePositionAt(
              world,
              owner(n),
              currency as never,
              cutoff,
            );
            const want = expected(lists, owner(n), currency, cutoff);
            if (!want) {
              expect(read).toBeUndefined();
              continue;
            }
            expect({
              inflows: read!.inflows.minorUnits,
              outflows: read!.outflows.minorUnits,
              liquid: read!.liquidBalance.minorUnits,
              outcomeIds: read!.outcomeIds,
            }).toEqual(want);
          }
    }
  });
});
