import { describe, expect, it } from "vitest";
import { appendedList } from "./history-index";
import {
  flowsOfPerson,
  holdsUsdPosition,
  transferOutcomesOfPerson,
} from "./person-money-index";
import type {
  EntityId,
  ResourceFlow,
  ResourcePosition,
  ResourceTransferOutcome,
} from "./types";

const person = (personId: string) => ({ kind: "person" as const, personId });
const organization = { kind: "organization" as const, organizationId: "org" };

function flow(id: string, source: object, recipient: object): ResourceFlow {
  return { id, source, recipient } as unknown as ResourceFlow;
}

function outcome(id: string, resourceFlowId: string): ResourceTransferOutcome {
  return { id, resourceFlowId } as unknown as ResourceTransferOutcome;
}

/** What the whole-history scan returned before the index. */
function scanned(
  flows: readonly ResourceFlow[],
  outcomes: readonly ResourceTransferOutcome[],
  personId: string,
): readonly ResourceTransferOutcome[] {
  return outcomes.filter((candidate) => {
    const found = flows.find((each) => each.id === candidate.resourceFlowId);
    return (
      (found?.source.kind === "person" && found.source.personId === personId) ||
      (found?.recipient.kind === "person" &&
        found.recipient.personId === personId)
    );
  });
}

describe("person money index", () => {
  const flows = [
    flow("pay", organization, person("ana")),
    flow("gift", person("ana"), person("ben")),
    flow("self", person("ana"), person("ana")),
    // A later flow reusing an id is ignored, as `find` ignores it.
    flow("pay", organization, person("ben")),
    flow("ben-pay", organization, person("ben")),
  ];
  const outcomes = [
    outcome("o1", "pay"),
    outcome("o2", "ben-pay"),
    outcome("o3", "gift"),
    outcome("o4", "self"),
    outcome("o5", "missing"),
    outcome("o6", "pay"),
  ];

  it("returns the same transfers, in list order, as scanning all of history", () => {
    for (const personId of ["ana", "ben", "cy"] as EntityId[])
      expect(transferOutcomesOfPerson(flows, outcomes, personId)).toEqual(
        scanned(flows, outcomes, personId),
      );
    expect(
      transferOutcomesOfPerson(flows, outcomes, "ana" as EntityId).map(
        (each) => each.id,
      ),
    ).toEqual(["o1", "o3", "o4", "o6"]);
  });

  it("stays exact as the history lists grow", () => {
    let grownFlows: readonly ResourceFlow[] = flows.slice(0, 2);
    let grownOutcomes: readonly ResourceTransferOutcome[] = outcomes.slice(
      0,
      1,
    );
    for (let step = 2; step <= outcomes.length; step += 1) {
      if (step < flows.length)
        grownFlows = appendedList(grownFlows, [flows[step]!]);
      grownOutcomes = appendedList(grownOutcomes, [outcomes[step - 1]!]);
      for (const personId of ["ana", "ben"] as EntityId[])
        expect(
          transferOutcomesOfPerson(grownFlows, grownOutcomes, personId),
        ).toEqual(scanned(grownFlows, grownOutcomes, personId));
    }
  });

  it("lists a person's flows once each, in list order", () => {
    expect(
      flowsOfPerson(flows, "ana" as EntityId).map((each) => each.id),
    ).toEqual(["pay", "gift", "self"]);
  });

  it("finds a dollar position only for its person owner", () => {
    const positions = [
      { owner: person("ana"), openingBalance: { currency: "USD" } },
      { owner: person("ben"), openingBalance: { currency: "EUR" } },
      { owner: organization, openingBalance: { currency: "USD" } },
    ] as unknown as ResourcePosition[];
    expect(holdsUsdPosition(positions, "ana" as EntityId)).toBe(true);
    expect(holdsUsdPosition(positions, "ben" as EntityId)).toBe(false);
    expect(holdsUsdPosition(positions, "org" as EntityId)).toBe(false);
  });
});
