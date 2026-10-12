import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-closure-by-choice");

const cash = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  );
const outsideNet = (core: CoreState) =>
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`an owner closes a solvent business in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("pays the owner what's left and ends its jobs and flows; every dollar balances", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    advanceCore(core, "2021-01-20");
    const api = coreAPI(core);
    const firm = [...core.finance.businesses.values()]
      .filter(
        (book) =>
          !book.closedAt &&
          (core.organizations.get(book.organizationId)?.liquidMinor ?? 0) > 0,
      )
      .sort((a, b) => a.organizationId.localeCompare(b.organizationId))[0]!;
    const id = firm.organizationId;
    const owner = residentsRuntime(core)!.input.accounts[0]!.accountId;
    const accounts = api.accounts();
    const ownerBefore = accounts.balance(accounts.main(owner)),
      left = accounts.balance(accounts.main(id));
    const start = cash(core) + outsideNet(core);
    const closure = api.closeBusinessByChoice({
      organizationId: id,
      ownerAccountId: accounts.main(owner),
      reasonKey: "owner.retired",
      source: core.organizations.get(id)!.source,
    });
    expect(closure.cause).toMatchObject({
      kind: "owner.choice",
      paidOutMinor: left,
    });
    expect(core.finance.businesses.get(id)!.closedAt).toBe(core.date);
    expect(accounts.balance(accounts.main(owner))).toBe(ownerBefore + left);
    for (const jobId of closure.endedJobIds)
      expect(core.jobs.get(jobId)!.endsAt).toBe(core.date);
    expect(() =>
      api.closeBusinessByChoice({
        organizationId: id,
        ownerAccountId: accounts.main(owner),
        reasonKey: "owner.retired",
        source: core.organizations.get(id)!.source,
      }),
    ).toThrow();
    advanceCore(core, "2021-02-28");
    const live = [...residentsRuntime(core)!.flows.values()].filter(
      (flow) => !flow.endedAt && (flow.payeeId === id || flow.payerId === id),
    );
    expect(live).toEqual([]);
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 300_000);
});
