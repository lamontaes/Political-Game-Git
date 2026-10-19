import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { heirsOf, openEstates, settleEstate, trustOf, willOf } from "./estates";
import { bankDeposit, depositsHeld, moveBankDeposit } from "./accounts";
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

  it("passes an old person's estate by their will, in shares by how close each heir was", () => {
    const old = {
      ...person("dead", 30_000, { a: "child", b: "child" }),
      birthDate: "1925-01-01",
    };
    const core = world([
      old,
      person("a", 0, { dead: "parent" }),
      person("b", 0, { dead: "parent" }),
    ]);
    const api = coreAPI(core);
    api.relationship("dead", "a", "family", 900);
    api.relationship("dead", "b", "family", 100);
    const will = willOf(api, core.people.get("dead")!);
    expect(will?.map((row) => row.id)).toEqual(["a", "b"]);
    api.updatePerson("dead", { alive: false });
    const paid = settleEstate(api, "dead", "event:death");
    const byId = Object.fromEntries(
      paid.map((row) => [row.toId, row.amountMinor]),
    );
    expect(byId.a! + byId.b!).toBe(30_000);
    expect(byId.a!).toBeGreaterThan(byId.b!);
  });

  it("gives a person of means a living trust whose beneficiaries are paid at death, outside probate, and sends the rest through probate", () => {
    const core = world([
      person("dead", 5_000_000_000, { a: "child", b: "child" }),
      person("a", 0, { dead: "parent" }),
      person("b", 0, { dead: "parent" }),
    ]);
    openEstates(core);
    const api = coreAPI(core);
    api.relationship("dead", "a", "family", 900);
    api.relationship("dead", "b", "family", 100);
    const before = cash(core);
    const trust = trustOf(api, core.people.get("dead")!, 5_000_000_000);
    expect(trust, "a $50 million estate has a trust").not.toBeNull();
    expect(trust!.share).toBeGreaterThan(0.5);
    expect(trust!.share).toBeLessThan(1);
    api.updatePerson("dead", { alive: false });
    const paid = settleEstate(api, "dead", "event:death");
    // The trust pays at death, by closeness, with no wait for probate.
    expect(paid.map((row) => row.toId).sort()).toEqual(["a", "b"]);
    const atDeath = paid.reduce((n, row) => n + row.amountMinor, 0);
    expect(atDeath).toBe(trust!.fundedMinor);
    expect(core.people.get("a")!.liquidMinor).toBeGreaterThan(
      core.people.get("b")!.liquidMinor,
    );
    // What the trust does not hold waits in probate.
    const waiting = core.people.get("dead")!.liquidMinor;
    expect(waiting).toBe(5_000_000_000 - trust!.fundedMinor);
    advanceCore(
      core,
      addDays(makeIsoDate(core.date), api.parameter("probateDays") + 1),
    );
    expect(core.people.get("dead")!.liquidMinor).toBe(0);
    expect(cash(core)).toBe(before);
  });

  it("leaves an ordinary estate no trust", () => {
    const core = world([
      person("dead", 10_001, { a: "child" }),
      person("a", 0, { dead: "parent" }),
    ]);
    const api = coreAPI(core);
    api.relationship("dead", "a", "family", 900);
    expect(trustOf(api, core.people.get("dead")!, 10_001)).toBeNull();
  });

  it("pays a dead person's savings to their estate before it passes to the heirs, every cent balanced", () => {
    const people = [
      { ...person("dead", 10_000, { a: "child" }), householdId: "alone" },
      { ...person("a", 0, { dead: "parent" }), householdId: "child-home" },
    ];
    const input: CoreInput = {
      ...piecesInput(),
      people,
      households: [
        {
          id: "alone",
          placeId: "place",
          memberIds: ["dead"],
          source: piecesSource,
        },
        {
          id: "child-home",
          placeId: "place",
          memberIds: ["a"],
          source: piecesSource,
        },
      ],
      organizations: [
        {
          id: "bank",
          placeId: "place",
          name: "Bank",
          kind: "bank",
          liquidMinor: 100,
          source: piecesSource,
        },
      ],
    };
    const core = createLifeCore(input);
    const api = coreAPI(core);
    const everyone = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const before = everyone();
    // Savings are held under the household while anyone shares it.
    moveBankDeposit(core, api, {
      id: "saved",
      bankId: "bank",
      holderId: "alone",
      customerAccountId: api.accounts().main("dead"),
      direction: "deposit",
      amountMinor: 6_000,
      source: piecesSource,
    });
    expect(core.people.get("dead")!.liquidMinor).toBe(4_000);
    expect(depositsHeld(core, "alone")).toBe(6_000);
    api.updatePerson("dead", { alive: false });
    const paid = settleEstate(api, "dead", "event:death");
    expect(paid).toEqual([{ toId: "a", amountMinor: 10_000 }]);
    expect(depositsHeld(core, "alone")).toBe(0);
    expect(bankDeposit(core, "bank", "alone")!.balanceMinor).toBe(0);
    expect(core.people.get("a")!.liquidMinor).toBe(10_000);
    expect(everyone()).toBe(before);
  });
});
