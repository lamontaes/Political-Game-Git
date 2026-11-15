import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { openEstates, settleEstate } from "./estates";
import type { CoreInput, CoreState, PersonInput } from "./types";

// The estate is left to the kin the law names on the day of death; someone
// who dies while probate waits is represented by their own descendants.

const fact = (personId: string, relation: string, otherId: string) => ({
  id: `${personId}:past:${otherId}`,
  date: "2000-01-01",
  kind: `family:${relation}`,
  summary: "Recorded relation.",
  source: piecesSource,
  facts: { otherPersonId: otherId },
});

function person(
  id: string,
  liquidMinor: number,
  relations: Record<string, string>,
): PersonInput {
  const base = piecesInput().people[0]!;
  return {
    ...base,
    id,
    liquidMinor,
    familyIds: Object.keys(relations),
    pastFacts: Object.entries(relations).map(([otherId, relation]) =>
      fact(id, relation, otherId),
    ),
  };
}

function world(people: PersonInput[]): CoreState {
  const input: CoreInput = {
    ...piecesInput(),
    people,
    households: [
      {
        id: "home",
        placeId: "place",
        memberIds: people.map((row) => row.id),
        source: piecesSource,
      },
    ],
  };
  const core = createLifeCore(input);
  openEstates(core);
  return core;
}

const probateDone = (core: CoreState, extraDays: number) =>
  advanceCore(
    core,
    addDays(
      makeIsoDate(core.date),
      coreAPI(core).parameter("probateDays") + extraDays,
    ),
  );

describe("estate heirs are fixed at death", () => {
  it("pays a child who dies during probate's share to that child's own child, and the other child theirs", () => {
    const core = world([
      person("dead", 10_000, { a: "child", b: "child" }),
      person("a", 0, { dead: "parent", grandkid: "child" }),
      person("b", 0, { dead: "parent" }),
      person("grandkid", 0, { a: "parent" }),
    ]);
    const api = coreAPI(core);
    api.updatePerson("dead", { alive: false });
    settleEstate(api, "dead", "event:death");
    // The first child dies while the estate waits.
    api.updatePerson("a", { alive: false });
    probateDone(core, 1);
    expect(core.people.get("b")!.liquidMinor).toBe(5_000);
    expect(core.people.get("grandkid")!.liquidMinor).toBe(5_000);
    expect(core.people.get("a")!.liquidMinor).toBe(0);
    expect(core.people.get("dead")!.liquidMinor).toBe(0);
  });

  it("passes the whole estate to the next class when the only heir dies leaving no one to represent them", () => {
    const core = world([
      person("dead", 900, { mate: "partner", sis: "sibling" }),
      person("mate", 0, { dead: "partner" }),
      person("sis", 0, { dead: "sibling" }),
    ]);
    const api = coreAPI(core);
    api.updatePerson("dead", { alive: false });
    settleEstate(api, "dead", "event:death");
    api.updatePerson("mate", { alive: false });
    probateDone(core, 1);
    expect(core.people.get("sis")!.liquidMinor).toBe(900);
  });

  it("does not hand the estate to someone who only became kin during probate", () => {
    const core = world([person("dead", 900, {}), person("late", 0, {})]);
    const api = coreAPI(core);
    api.updatePerson("dead", { alive: false });
    settleEstate(api, "dead", "event:death");
    // A relation recorded after the death does not make an heir.
    const dead = core.people.get("dead")!;
    api.updatePerson("dead", {
      pastFacts: [...(dead.pastFacts ?? []), fact("dead", "child", "late")],
    });
    probateDone(core, 1);
    expect(core.people.get("late")!.liquidMinor).toBe(0);
  });
});
