import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { residentsRuntime } from "../core2/modules/residents";
import { buildBenchWorld } from "./world";
import { personCard } from "./card";

describe("the person card", () => {
  it("fills in a clicked counted resident, with the job and pay the business's books give", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const place = drawPlace(seed, "card-fill-in");
    const where = `${place.name}, seed ${seed}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const counted = [...(residentsRuntime(core)?.jobs.values() ?? [])].find(
      (job) =>
        !core.people.has(job.personId) &&
        !job.endsAt &&
        core.organizations.has(job.organizationId),
    );
    expect(counted, `${where}: a counted worker with a job`).toBeDefined();
    const row = counted!;
    const books = core.organizations.get(row.organizationId)!;
    const card = personCard(core, row.personId);
    // The clicked resident is a full person now, and the same one next time.
    expect(core.people.has(row.personId), where).toBe(true);
    expect(personCard(core, row.personId).name, where).toBe(card.name);
    // Their job and pay are the counted books' row, by record id.
    expect(card.id, where).toBe(row.personId);
    expect(card.job?.jobId, `${where}: ${row.id}`).toBe(row.id);
    expect(card.job?.employer, where).toBe(books.name);
    expect(card.job?.title, where).toBe(row.title);
    expect(card.job?.wageDailyMinor, where).toBe(row.wageDailyMinor);
  }, 600_000);
});
