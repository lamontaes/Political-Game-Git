import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { sameGovernment } from "./budgets-treasury";
import departments from "./data/opening/department-governments.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { publicPayTreasuries } from "./public-work-pay";

// A town's police, fire, public works and health departments, its state
// offices and its post office hold no cash of their own. Each is linked to its
// government's treasury at the opening, and its staff are paid from it
// (pool item world-public-employer-staff-never-paid).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`a town department's staff are paid from their government's treasury, seed ${seed}`, () => {
  setBookkeeping(false);
  // Draw places until one has a department with a paid staff job.
  for (let draw = 0; draw < 8; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "department-pay");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const owning = departments.owning as Record<string, string>;
    const staffed = [...core.organizations.values()].filter(
      (org) =>
        org.classification !== undefined &&
        owning[org.classification] !== undefined &&
        [...core.jobs.values()].some((job) => job.organizationId === org.id),
    );
    if (!staffed.length) continue;
    const links = publicPayTreasuries(core);
    for (const department of staffed) {
      const authority = department.publicPayAuthority;
      expect(authority, `${department.name} has a pay authority`).toBeDefined();
      const link = links.get(authority!.id);
      expect(link, `${authority!.id} is funded by a treasury`).toBeDefined();
      const treasury = core.organizations.get(link!.treasuryId)!;
      expect(treasury.kind).toBe("government-treasury");
      expect(sameGovernment(department, treasury), department.name).toBe(true);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    let checked = 0;
    for (const department of staffed) {
      // A worker who left in the window (the post replaced their job) has no pay to check.
      const ids = department.publicPayAuthority!.workCommitmentIds.filter(
        (id) => core.work.commitments.get(id)?.endsAt === undefined,
      );
      for (const id of ids) {
        checked++;
        expect(
          core.work.payrollLedgerByCommitment.get(id)?.paidMinor ?? 0,
          `${department.name} ${id}`,
        ).toBeGreaterThan(0);
      }
    }
    expect(checked).toBeGreaterThan(0);
    const first = staffed[0]!;
    console.log(
      `department-pay: ${place.name} (seed ${seed}:${draw}): ${staffed.map((org) => org.name).join(", ")}; ${first.name} commitment ${first.publicPayAuthority!.workCommitmentIds[0]} paid from ${publicPayTreasuries(core).get(first.publicPayAuthority!.id)!.treasuryId}`,
    );
    return;
  }
  throw new Error(
    `No drawn place had a staffed town department (seed ${seed}).`,
  );
}, 600_000);
