/**
 * PW-7 step 1: pay lands. Every employer with staff gets paid for by
 * someone, so its workers are paid: a union local by its members' dues,
 * an employer with no books and no public payer (a post office, a police
 * department, a nonprofit) from outside the town at its payroll (stopgap
 * SG-WORLD-business-staff-funding). A random recorded locality.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { worldGameOptions } from "./modules/world";
import { countedJobsOf } from "./residents-economy";
import { newGame } from "./saves";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "pw7-staff-funding");

describe(`employers with staff pay them in ${place.name} (seed ${seed})`, () => {
  it("every staffed employer without books or a public payer is funded, its named and counted workers are paid in full, and every dollar balances", () => {
    const { core } = newGame(
      { place: { seed: place.seed, key: place.key }, twoLevel: true },
      worldGameOptions(),
    );
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, "2021-03-01");
    const rt = residentsRuntime(core)!;
    const unfunded = [...core.organizations.values()].filter(
      (org) =>
        org.kind === "employer" &&
        org.outsideFlow === undefined &&
        !org.publicPayAuthority &&
        !core.finance.businesses.has(org.id) &&
        ([...(core.finance.jobsByOrganization.get(org.id) ?? [])].some(
          (id) => core.jobs.get(id)?.endsAt === undefined,
        ) ||
          countedJobsOf(core, org.id).length > 0),
    );
    for (const org of unfunded) {
      const funded =
        rt.flows.has(`funding:${org.id}`) || rt.flows.has(`dues:${org.id}`);
      expect(funded, org.name).toBe(true);
      // Named workers: everything due has been paid.
      for (const ledger of core.work.payrollLedgerByCommitment.values())
        if (ledger.organizationId === org.id && !rt.flows.has(`dues:${org.id}`))
          expect(ledger.paidMinor, org.name).toBe(ledger.dueRecognizedMinor);
      // Counted workers: their employer's wage flow owes nothing.
      for (const flow of rt.flows.values())
        if (
          flow.kind === "wages" &&
          flow.payerId === org.id &&
          !rt.flows.has(`dues:${org.id}`)
        )
          expect(flow.arrearsMinor, org.name).toBe(0);
    }
    let outside = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(cash()).toBe(opening - outside);
  }, 600_000);
});
