import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { jobsGivenUpOnSeating } from "./modules/office-day";
import { OFFICES_MODULE_ID, townSeats } from "./modules/offices";

/**
 * A holder gives up the jobs a seat takes (CTO playtest C10, Nov 23: a mayor
 * "works as a campaign field organizer while mayor"): every other job in a full-time
 * seat, and in any seat a job at an employer whose work is the seat's own
 * politics. The place is drawn; the seed prints and GOLDEN_PATH_SEED replays it.
 */
it("a seat takes a campaign or party job from its holder, and a full-time seat every job", () => {
  setBookkeeping(false);
  const seed = process.env.GOLDEN_PATH_SEED ?? `office-job-${Date.now()}`;
  // A town with campaign or party staff: draw until one has it, and name the towns passed over.
  const passed: string[] = [];
  let found: ReturnType<typeof buildBenchWorld> | undefined;
  let where = "";
  for (let attempt = 0; attempt < 12 && !found; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-job-conflict");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const label = `${place.name} (${place.key}), seed ${place.seed}`;
    const has = [...world.core.organizations.values()].some((o) =>
      /political-consulting|party-chapter/.test(o.classification ?? ""),
    );
    if (has) {
      found = world;
      where = label;
    } else passed.push(label);
  }
  process.stdout.write(
    `office-job-conflict: ${where}; passed over: ${passed.join("; ")}\n`,
  );
  expect(
    found,
    `no town with campaign or party staff in 12 draws; passed over: ${passed.join("; ")}`,
  ).toBeTruthy();
  const core = found!.core;
  const api = coreAPI(core);
  const political = new Set(
    [...core.organizations.values()]
      .filter((o) =>
        /political-consulting|party-chapter/.test(o.classification ?? ""),
      )
      .map((o) => o.id),
  );
  const politicalJob = [...core.jobs.values()].find(
    (j) => j.endsAt === undefined && political.has(j.organizationId),
  );
  expect(
    politicalJob,
    `${where}: no campaign or party job in this town`,
  ).toBeTruthy();
  // The seat's own politics goes in any seat; another employer's job only in a full-time one.
  expect(
    jobsGivenUpOnSeating(core, politicalJob!.personId, false),
    where,
  ).toContain(politicalJob!.id);
  const other = [...core.jobs.values()].find(
    (j) => j.endsAt === undefined && !political.has(j.organizationId),
  )!;
  const own = jobsGivenUpOnSeating(core, other.personId, false);
  expect(own, where).not.toContain(other.id);
  expect(jobsGivenUpOnSeating(core, other.personId, true), where).toContain(
    other.id,
  );
  // In the world as opened, no holder keeps work the seat takes.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  expect(offices).toBeTruthy();
  for (const { holder } of townSeats(api)) {
    if (!holder?.personId || holder.status !== "serving") continue;
    const left = jobsGivenUpOnSeating(core, holder.personId, false);
    expect(
      left,
      `${where}: ${holder.personId} still works for politics`,
    ).toEqual([]);
  }
}, 600000);
