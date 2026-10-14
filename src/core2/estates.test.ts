import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { heirsOf, settleEstate } from "./estates";
import type { CoreInput, CoreState, PersonInput } from "./types";

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
  return createLifeCore(input);
}

const cash = (core: CoreState) =>
  [...core.people.values()].reduce((n, row) => n + row.liquidMinor, 0);

describe("estates (money audit defect 6)", () => {
  it("passes a dead person's cash to their children before their parents, in equal shares, every cent balanced", () => {
    const core = world([
      person("dead", 10_001, { a: "child", b: "child", mom: "parent" }),
      person("a", 0, { dead: "parent" }),
      person("b", 0, { dead: "parent" }),
      person("mom", 0, { dead: "child" }),
    ]);
    const api = coreAPI(core);
    const before = cash(core);
    expect(heirsOf(api, core.people.get("dead")!).heirs).toEqual(["a", "b"]);
    api.updatePerson("dead", { alive: false });
    const paid = settleEstate(api, "dead", "event:death");
    expect(paid).toEqual([
      { toId: "a", amountMinor: 5_001 },
      { toId: "b", amountMinor: 5_000 },
    ]);
    expect(core.people.get("dead")!.liquidMinor).toBe(0);
    expect(core.people.get("mom")!.liquidMinor).toBe(0);
    expect(cash(core)).toBe(before);
  });

  it("goes to the next class only when no one in a nearer one is alive", () => {
    const core = world([
      person("dead", 900, { kid: "child", sis: "sibling" }),
      person("kid", 0, { dead: "parent" }),
      person("sis", 0, { dead: "sibling" }),
    ]);
    const api = coreAPI(core);
    api.updatePerson("kid", { alive: false });
    api.updatePerson("dead", { alive: false });
    expect(settleEstate(api, "dead", "event:death")).toEqual([
      { toId: "sis", amountMinor: 900 },
    ]);
  });

  it("ends standing payments to the dead, such as a benefit award", () => {
    const core = world([
      person("dead", 0, { kid: "child" }),
      person("kid", 500, { dead: "parent" }),
    ]);
    const api = coreAPI(core);
    const accounts = api.accounts();
    accounts.addObligation({
      id: "award",
      from: accounts.main("kid"),
      to: accounts.main("dead"),
      amountMinor: 100,
      firstDueAt: "2026-02-01",
      cadence: { kind: "months", every: 1 },
      accruesArrears: false,
      reasonKey: "benefit.test",
      source: piecesSource,
    });
    api.updatePerson("dead", { alive: false });
    settleEstate(api, "dead", "event:death");
    expect(accounts.obligation("award")!.endedAt).toBe(core.date);
  });

  it("leaves cash in place when there is no kin and no state treasury to escheat to", () => {
    const core = world([person("dead", 900, {})]);
    const api = coreAPI(core);
    api.updatePerson("dead", { alive: false });
    expect(settleEstate(api, "dead", "event:death")).toEqual([]);
    expect(core.people.get("dead")!.liquidMinor).toBe(900);
  });
});
