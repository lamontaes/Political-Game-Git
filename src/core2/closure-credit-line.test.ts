/** A closed business's credit line closes with it and is never repriced or billed again (audit defects 8 and 9). */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addDays } from "./kernel/dates";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

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

describe(`a closed business's credit line (seed ${seed})`, () => {
  it("is settled or written off at closing, never repriced or billed after, and the closure names its workers", () => {
    const { core } = buildBenchWorld(seed, "2026-10-12", { twoLevel: true });
    // Banks approve lines as the world runs; let a few months pass.
    for (let i = 0; i < 4; i += 1) advanceCore(core, addDays(core.date, 30));
    const api = coreAPI(core);
    const held = [...core.finance.businesses.values()]
      .filter(
        (book) =>
          !book.closedAt &&
          book.creditFacilityId &&
          core.finance.facilities.get(book.creditFacilityId)?.active,
      )
      .sort((a, b) => a.organizationId.localeCompare(b.organizationId))[0];
    expect(held, "a business with an approved credit line").toBeDefined();
    const id = held!.organizationId,
      facilityId = held!.creditFacilityId!;
    const owner = residentsRuntime(core)!.input.accounts[0]!.accountId;
    const accounts = api.accounts();
    const start = cash(core) + outsideNet(core);
    const countedBefore = residentsRuntime(core)!.jobs.size;
    const closure = api.closeBusinessByChoice({
      organizationId: id,
      ownerAccountId: accounts.main(owner),
      reasonKey: "owner.retired",
      source: core.organizations.get(id)!.source,
    });
    const facility = core.finance.facilities.get(facilityId)!;
    expect(facility.active).toBe(false);
    expect(facility.closedAt).toBe(core.date);
    expect(facility.principalMinor + facility.interestArrearsMinor).toBe(0);
    const line = closure.creditLines.find(
      (row) => row.facilityId === facilityId,
    );
    expect(line).toBeDefined();
    expect(line!.settledMinor).toBe(facility.settledMinor);
    expect(line!.writtenOffMinor).toBe(facility.writtenOffMinor);
    // The closure names the counted workers' jobs too, each a real counted job of the firm.
    expect(closure.endedCountedJobIds.length).toBe(
      closure.affectedCountedPersonIds.length,
    );
    for (const jobId of closure.endedCountedJobIds)
      expect(residentsRuntime(core)!.jobs.get(jobId)!.organizationId).toBe(id);
    expect(
      closure.endedJobIds.length + closure.endedCountedJobIds.length,
      `${countedBefore} counted jobs in the world`,
    ).toBeGreaterThan(0);
    const after = structuredClone(facility);
    advanceCore(core, addDays(core.date, 200));
    expect(core.finance.facilities.get(facilityId)).toEqual(after);
    const repricings = api
      .moduleState("macro")
      .table("repricings")
      .rows() as unknown as { facilityId: string; date: string }[];
    expect(
      repricings.filter(
        (row) => row.facilityId === facilityId && row.date > closure.date,
      ),
    ).toEqual([]);
    for (const row of core.finance.contracts.values())
      if (row.interestFacilityId === facilityId)
        expect(row.endedAt).toBe(closure.date);
    expect(cash(core) + outsideNet(core)).toBe(start);
  }, 600_000);
});
