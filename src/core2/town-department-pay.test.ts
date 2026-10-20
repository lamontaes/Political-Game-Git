/**
 * Every town department with staff pays them (world-town-public-works-staff-never-paid):
 * a public job in the town is paid from its government through the journal, so
 * its holder has been credited within a quarter. A place is drawn from all 56
 * on a seed nobody chose (GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY pin one)
 * and named in every failure message. A place without a public job in town is
 * redrawn, never skipped.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const named = process.env.GOLDEN_PATH_PLACE_KEY;

it("every named worker at a town department has been paid within a quarter", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < (named ? 1 : 6); attempt++) {
    const draw = named
      ? { key: named, seed }
      : drawPlace(seed, `town-department-pay:${attempt}`);
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `${draw.key} (${core.placeMetadata.placeName}), seed ${draw.seed}`;
    const town = lawChain(api).townPlaceId;
    const staff = [...core.jobs.values()]
      .filter((job) => {
        const org = core.organizations.get(job.organizationId);
        return (
          job.endsAt === undefined &&
          org?.placeId === town &&
          !!org.publicPayAuthority &&
          core.people.has(job.personId)
        );
      })
      .map((job) => ({
        personId: job.personId,
        department: core.organizations.get(job.organizationId)!.name,
      }));
    if (!staff.length) {
      tried.push(`${where}: no named town department staff`);
      continue;
    }
    const credited = (id: string) =>
      core.cashJournal.totalsByOwner.get(id)?.grossCreditMinor ?? 0;
    const before = new Map(
      staff.map((s) => [s.personId, credited(s.personId)]),
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    for (const s of staff) {
      if (!core.people.get(s.personId)?.alive) continue;
      expect(
        credited(s.personId),
        `${where}: ${s.department} worker ${s.personId} was paid`,
      ).toBeGreaterThan(before.get(s.personId)!);
    }
    process.stdout.write(
      `${where}: ${staff.length} town department workers paid, first ${staff[0]!.personId} at ${staff[0]!.department}\n`,
    );
    return;
  }
  throw new Error(
    `no place with town department staff in 6 draws: ${tried.join("; ")}`,
  );
}, 900_000);
