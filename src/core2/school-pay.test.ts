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
import { publicPayTreasuries } from "./public-work-pay";

// A town's public school district holds no cash. It joins the town
// government's pay group at the opening, and the treasury pays its teachers on
// every payday (pool item world-public-school-staff-never-paid).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a public school district's teachers are paid from the town treasury, seed ${seed}`, () => {
  setBookkeeping(false);
  // Draw places until one opens with a school district that has teachers.
  for (let draw = 0; draw < 8; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "school-pay");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const district = [...core.organizations.values()].find(
      (org) =>
        (org.classification ?? "").startsWith(schools.classification) &&
        [...core.jobs.values()].some((job) => job.organizationId === org.id),
    );
    if (!district) continue;
    const authority = district.publicPayAuthority;
    expect(authority, `${district.name} has a pay authority`).toBeDefined();
    const link = publicPayTreasuries(core).get(authority!.id);
    expect(link, `${authority!.id} is funded by a treasury`).toBeDefined();
    const treasury = core.organizations.get(link!.treasuryId)!;
    expect(treasury.kind).toBe("government-treasury");
    expect(sameGovernment(district, treasury), district.name).toBe(true);
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    // A teacher who left in the window (the post replaced their job) has no pay to check.
    const ids = authority!.workCommitmentIds.filter(
      (id) => core.work.commitments.get(id)?.endsAt === undefined,
    );
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids)
      expect(
        core.work.payrollLedgerByCommitment.get(id)?.paidMinor ?? 0,
        `${district.name} ${id}`,
      ).toBeGreaterThan(0);
    console.log(
      `school-pay: ${place.name} (seed ${seed}:${draw}): ${district.name}, ${ids.length} teachers paid, e.g. ${ids[0]} from ${link!.treasuryId}`,
    );
    return;
  }
  throw new Error(
    `No drawn place opened with a staffed school district (seed ${seed}).`,
  );
}, 900_000);
