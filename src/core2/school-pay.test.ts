import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { sameGovernment } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import schools from "./data/opening-public-schools.json" with { type: "json" };
import { residentsRuntime } from "./modules/residents";
import { publicPayTreasuries } from "./public-work-pay";

// A town's public school district holds no cash. It joins the town
// government's pay group at the opening, and the treasury pays its teachers on
// every payday (pool item world-public-school-staff-never-paid).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

/**
 * Draw places until a school district's staff has the tier asked for: "full"
 * teachers (the circle's, paid by their own commitments) or "counted" ones
 * (paid through the counts' payroll). A place without that tier is redrawn,
 * never passed over, so each tier's pay is proven on its own.
 */
function districtWith(tier: "full" | "counted") {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 24; draw++) {
    const place = drawPlace(`${seed}:${tier}:${draw}`, "school-pay");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const district = [...core.organizations.values()].find(
      (org) =>
        (org.classification ?? "").startsWith(schools.classification) &&
        !!org.publicPayAuthority,
    );
    if (!district) {
      tried.push(`${place.name}: no district`);
      continue;
    }
    const authority = district.publicPayAuthority!;
    const full = authority.workCommitmentIds.filter(
      (id) =>
        core.work.commitments.get(id)?.endsAt === undefined &&
        core.work.commitments.has(id),
    );
    const flows = [...residentsRuntime(core)!.flows.values()].filter(
      (flow) =>
        flow.kind === "wages" &&
        flow.organizationId === district.id &&
        (flow.jobIds?.length ?? 0) > 0,
    );
    if (tier === "full" ? !full.length : !flows.length) {
      tried.push(`${place.name}: ${full.length} full, ${flows.length} counted`);
      continue;
    }
    const link = publicPayTreasuries(core).get(authority.id);
    expect(link, `${authority.id} is funded by a treasury`).toBeDefined();
    const treasury = core.organizations.get(link!.treasuryId)!;
    expect(treasury.kind).toBe("government-treasury");
    expect(sameGovernment(district, treasury), district.name).toBe(true);
    return { core, place, district, authority, full, flows, link: link! };
  }
  throw new Error(
    `No drawn place opened with ${tier} school staff in 24 draws (seed ${seed}): ${tried.join("; ")}`,
  );
}

it(`a public school district's full teachers are paid from the town treasury, seed ${seed}`, () => {
  const { core, place, district, full, link } = districtWith("full");
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  // A teacher who left in the window (the post replaced their job) has no pay to check.
  const staying = full.filter(
    (id) => core.work.commitments.get(id)?.endsAt === undefined,
  );
  expect(staying.length, `${district.name} full teachers`).toBeGreaterThan(0);
  for (const id of staying)
    expect(
      core.work.payrollLedgerByCommitment.get(id)?.paidMinor ?? 0,
      `${district.name} ${id}`,
    ).toBeGreaterThan(0);
  process.stdout.write(
    `school-pay full: ${place.name} (seed ${seed}): ${district.name}, ${staying.length} full teachers paid from ${link.treasuryId}\n`,
  );
}, 900_000);

it(`a public school district's counted teachers are paid by the town government's treasury, seed ${seed}`, () => {
  const { core, place, district, authority, flows, link } =
    districtWith("counted");
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  // The counts' payroll is paid by the authority's pay owner (the town
  // government's), not by the cashless district.
  expect(flows.length, `${district.name} counted payrolls`).toBeGreaterThan(0);
  for (const flow of flows) {
    expect(flow.payerId, `${flow.id} payer`).toBe(authority.ownerId);
    expect(flow.lastPaidMinor ?? 0, `${flow.id} paid`).toBeGreaterThan(0);
    expect(flow.arrearsMinor, `${flow.id} arrears`).toBe(0);
  }
  process.stdout.write(
    `school-pay counted: ${place.name} (seed ${seed}): ${district.name}, ${flows.length} counted payrolls paid from ${link.treasuryId}\n`,
  );
}, 900_000);
