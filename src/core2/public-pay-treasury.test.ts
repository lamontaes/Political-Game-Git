import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

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

function world(treasuryMinor: number) {
  const core = createLifeCore(
    generatedOpening(place, { twoLevel: true, settings: { population: 1500 } }),
  );
  const employer = [...core.organizations.values()].find(
    (row) => row.publicPayAuthority,
  );
  if (!employer) return undefined;
  const api = coreAPI(core);
  api.addOrganization({
    id: "treasury:test",
    placeId: employer.placeId,
    name: "General fund",
    kind: "government",
    liquidMinor: treasuryMinor,
    source: employer.source,
  });
  api.fundPublicPay(
    employer.publicPayAuthority!.id,
    "treasury:test",
    employer.source,
  );
  return { core, api, authorityId: employer.publicPayAuthority!.id };
}

describe(`public pay from a treasury in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("pays public wages from the treasury's cash", () => {
    const made = world(100_000_000);
    if (!made) return; // No public employer recorded in this place.
    const { core, api, authorityId } = made;
    const start = cash(core) + outsideNet(core);
    advanceCore(core, "2021-02-28");
    const spent =
      100_000_000 - core.organizations.get("treasury:test")!.liquidMinor;
    expect(spent).toBeGreaterThan(0);
    expect(api.publicPayShortfallMinor(authorityId)).toBe(0);
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 300_000);

  it("records what an empty treasury couldn't cover, and wages are still paid", () => {
    const made = world(0);
    if (!made) return;
    const { core, api, authorityId } = made;
    const start = cash(core) + outsideNet(core);
    advanceCore(core, "2021-02-28");
    expect(core.organizations.get("treasury:test")!.liquidMinor).toBe(0);
    expect(api.publicPayShortfallMinor(authorityId)).toBeGreaterThan(0);
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 300_000);
});
