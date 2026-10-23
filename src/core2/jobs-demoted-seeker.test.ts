import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { isDemoted } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { countedDemotions } from "./modules/counted-demotion";
import { coreAPI, fillInPerson } from "./state";
import { countedRecords } from "./tooling/counted-records";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "jobs-demoted-seeker");

const after = (days: number) => {
  const at = new Date(`${gameStartDate()}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

describe(`a person returned to the counts who is looking for work, ${place.name} (seed ${seed})`, () => {
  it("looks as a counted seeker and is never hired onto a full record", () => {
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    const api = coreAPI(core);
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    // A few counted households nobody in the player's circle belongs to, met and then left alone.
    const met = [...countedRecords(core).values()]
      .filter((row) => row.people.every((p) => !circle.has(p.id)))
      .slice(0, 4);
    for (const row of met) fillInPerson(core, row.people[0]!.id);
    advanceCore(core, after(300));
    const demoted = countedDemotions(api).flatMap((row) => row.personIds);
    // Someone back in the counts with no job, who has to be looking.
    const seeker = demoted
      .map((id) => core.people.get(id)!)
      .find((row) => isDemoted(row) && !row.jobId && row.alive);
    expect(seeker, `${place.name}; seed ${seed}`).toBeDefined();
    const job = [...core.jobs.values()].find((row) => !row.endsAt)!;
    const organization = core.organizations.get(job.organizationId)!;
    const jobs = api.moduleState("jobs");
    jobs.table("seekers").put({
      id: seeker!.id,
      isSeeker: true,
      personId: seeker!.id,
      placeId: organization.placeId,
      employed: false,
      since: core.date,
      reasonKey: "started-looking",
      referenceHourlyMinor: 0,
    });
    jobs.table("positions").put({
      id: `position:fixture:${core.date}`,
      organizationId: organization.id,
      placeId: organization.placeId,
      templateJobId: job.id,
      title: job.title,
      occupation: job.occupationClassification ?? job.title,
      hourlyMinor: job.hourlyMinor,
      openedAt: core.date,
      status: "open",
      reasonKey: "opening",
    });
    const start = core.date;
    advanceCore(
      core,
      new Date(Date.parse(start) + 15 * 86_400_000).toISOString().slice(0, 10),
    );
    expect(jobs.table("seekers").get(seeker!.id)).toBeUndefined();
    expect(core.people.get(seeker!.id)!.jobId).toBeUndefined();
    expect(
      [...core.jobs.values()].filter(
        (row) => row.personId === seeker!.id && row.endsAt === undefined,
      ),
    ).toEqual([]);
  }, 600_000);
});
