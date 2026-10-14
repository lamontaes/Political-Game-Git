import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";
import { daysAfterStart } from "./tooling/test-days";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-public-pay-treasury");

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

/** Wages the people on a public payroll have actually been paid, from the work ledger. */
const publicWagesPaid = (core: CoreState) =>
  [...core.work.commitments.values()]
    .filter(
      (row) => core.organizations.get(row.organizationId)?.publicPayAuthority,
    )
    .reduce(
      (n, row) =>
        n + (core.work.payrollLedgerByCommitment.get(row.id)?.paidMinor ?? 0),
      0,
    );

/**
 * Every public payroll in the place draws from one treasury. Whether a public
 * worker draws any pay in the window is the worker's own choice (a clerk may
 * miss every day), so the tests check the treasury against the wages actually
 * paid, whatever that is in the drawn place.
 */
function world(treasuryMinor: number) {
  const core = createLifeCore(
    generatedOpening(place, { twoLevel: true, settings: { population: 1500 } }),
  );
  const employers = [...core.organizations.values()].filter(
    (row) => row.publicPayAuthority,
  );
  const api = coreAPI(core);
  api.addOrganization({
    id: "treasury:test",
    placeId:
      employers[0]?.placeId ??
      core.organizations.values().next().value!.placeId,
    name: "General fund",
    kind: "government",
    liquidMinor: treasuryMinor,
    source: (employers[0] ?? core.organizations.values().next().value!).source,
  });
  for (const employer of employers)
    api.fundPublicPay(
      employer.publicPayAuthority!.id,
      "treasury:test",
      employer.source,
    );
  return {
    core,
    api,
    authorityIds: employers.map((row) => row.publicPayAuthority!.id),
  };
}

describe(`public pay from a treasury in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("pays public wages from the treasury's cash", () => {
    const { core, api, authorityIds } = world(100_000_000);
    const start = cash(core) + outsideNet(core);
    advanceCore(core, daysAfterStart(58));
    const spent =
      100_000_000 - core.organizations.get("treasury:test")!.liquidMinor;
    // The treasury pays exactly the public wages that were paid: positive
    // where a public worker drew pay, and nothing where none did.
    expect(spent).toBe(publicWagesPaid(core));
    for (const id of authorityIds)
      expect(api.publicPayShortfallMinor(id)).toBe(0);
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 300_000);

  it("records what an empty treasury couldn't cover, and wages are still paid", () => {
    const { core, api, authorityIds } = world(0);
    const start = cash(core) + outsideNet(core);
    advanceCore(core, daysAfterStart(58));
    expect(core.organizations.get("treasury:test")!.liquidMinor).toBe(0);
    // What the empty treasury couldn't cover is every public wage paid.
    expect(
      authorityIds.reduce((n, id) => n + api.publicPayShortfallMinor(id), 0),
    ).toBe(publicWagesPaid(core));
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 300_000);
});
