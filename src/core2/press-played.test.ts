/**
 * The press in the played world (OPUS-PEOPLE, Oct 14), in a random place from
 * all 56: the town as the player gets it (buildBenchWorld, two-level, every
 * module), run for four months. Each outlet's people are named full people on
 * its payroll; its reporters print stories they chose, each with a topic and
 * the reasons it was picked; and a follower's stance moves because they read
 * one. Seed and place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  followersOf,
  outletsHere,
  refreshPressStaff,
  staffOf,
  storiesPrinted,
} from "./modules/press";
import { startPublicJob } from "./public-payroll";
import { stancesOf } from "./modules/views";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("the press in the played world", () => {
  it("named reporters on the payroll print stories they chose, and readers' views move", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "press-played");
    const where = `place ${place.key}, seed ${seed}`;
    console.log(`press-played: ${where}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const outlets = outletsHere(api);
    if (!outlets.length) {
      console.log(
        `press-played: no local outlet in ${where}; nothing to check`,
      );
      return;
    }
    for (const outlet of outlets) {
      expect(outlet.ownerId, where).toBeTruthy();
      expect(outlet.headId, where).toBeTruthy();
      // A national outlet's people are named but live and work outside the
      // town (registered stopgap SG-PEOPLE-press-national-payroll).
      if (outlet.tier === "national") continue;
      expect(outlet.reporterIds.length, where).toBeGreaterThan(0);
      // A station's news director works at the station, outside the town;
      // a paper's editor and every reporter work in town.
      const inTown =
        outlet.kind === "newspaper"
          ? [outlet.headId!, ...outlet.reporterIds]
          : outlet.reporterIds;
      for (const id of inTown) {
        const person = core.people.get(id);
        expect(person?.placeId, where).toBe(world.placeId);
        const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
        expect(job?.organizationId, where).toBe(outlet.organizationId);
        expect(job?.hourlyMinor ?? 0, where).toBeGreaterThan(0);
      }
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const outlet of outlets.filter((o) => o.tier !== "national")) {
      const books = core.finance.businesses.get(outlet.organizationId);
      expect(books?.openingTownIncomeMinor, where).toBeGreaterThan(0);
      expect(
        api.moduleState("business").table("owners").get(outlet.organizationId),
        where,
      ).toMatchObject({
        ownerId: outlet.ownerId,
        basis: "press-recorded-owner",
      });
      expect(
        api.moduleState("jobs").table("employers").get(outlet.organizationId),
        where,
      ).toBeDefined();
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 120));
    const stories = outlets.flatMap((o) => storiesPrinted(api, o.id));
    expect(stories.length, where).toBeGreaterThan(0);
    for (const story of stories) {
      expect(story.topic, where).toBeTruthy();
      // Desk stories keep why they were picked; an interview, a profile, a
      // checked claim and an exposure come from their own paths.
      const ownPath = [
        "interview",
        "profile",
        "claim-checked",
        "press.exposed",
      ];
      if (!ownPath.includes(story.kind))
        expect(story.pick?.rank ?? 0, where).toBeGreaterThan(0);
    }
    // Staff are paid from the outlet's own cash.
    const paid = outlets
      .filter((o) => o.tier !== "national")
      .flatMap((o) => o.reporterIds)
      .filter((id) => (core.people.get(id)?.liquidMinor ?? 0) > 0);
    // A news desert has only the national tier, whose people the town does not pay.
    if (outlets.some((o) => o.tier !== "national"))
      expect(paid.length, where).toBeGreaterThan(0);
    // Every reporter still on the masthead works there; vacancies are allowed.
    refreshPressStaff(api);
    for (const outlet of outletsHere(api).filter((o) => o.tier !== "national"))
      for (const id of outlet.reporterIds) {
        const person = core.people.get(id);
        const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
        expect(job?.organizationId, `${where}: ${id}`).toBe(
          outlet.organizationId,
        );
      }
    // A follower read a printed story and their stance on its topic moved.
    const printed = new Set(stories.map((s) => s.id));
    const moved = outlets.some((o) =>
      followersOf(api, o.id).some((id) =>
        stancesOf(api, id).some((stance) =>
          stance.causes.some((cause) => {
            const storyId = cause.eventId
              .replace(/^news\.read:/, "")
              .replace(/:\d{4}-\d{2}-\d{2}$/, "");
            return (
              cause.eventId.startsWith("news.read:") && printed.has(storyId)
            );
          }),
        ),
      ),
    );
    expect(moved, where).toBe(true);
    // A departure must not manufacture another employee. Then the same
    // worker may return through the shared payroll route with a new job.
    const local = outletsHere(api).find(
      (o) => o.tier !== "national" && o.reporterIds.length,
    );
    expect(local, where).toBeDefined();
    const personId = local!.reporterIds[0]!;
    const oldJob = core.jobs.get(core.people.get(personId)!.jobId!)!;
    registerModule(core, {
      id: "test:press-departure",
      state: { schemaVersion: 1, tables: { state: {} } },
      onCalendarWork: (workApi) => {
        workApi.endJob(oldJob.id, "test:press-departure");
      },
    });
    const departureDate = addDays(makeIsoDate(core.date), 1);
    api.moduleCalendar("test:press-departure").schedule({
      key: "departure",
      kind: "departure",
      date: departureDate,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Controlled employment fixture",
        estimatedFrom: oldJob.id,
      },
      sourceRecordIds: [oldJob.id],
    });
    advanceCore(core, departureDate);
    const peopleBefore = core.people.size;
    const jobsBefore = core.jobs.size;
    refreshPressStaff(api);
    expect(core.people.size).toBe(peopleBefore);
    expect(core.jobs.size).toBe(jobsBefore);
    expect(
      outletsHere(api).find((o) => o.id === local!.id)!.reporterIds,
    ).not.toContain(personId);
    expect(
      staffOf(api, local!.id).find((row) => row.id === personId)?.leftOn,
    ).toBe(core.date);
    const returnedJobId = startPublicJob(api, {
      personId,
      employerId: local!.organizationId,
      post: "test:press-return",
      title: oldJob.title,
      hourlyMinor: oldJob.hourlyMinor!,
      citation: "Controlled employment fixture",
    });
    expect(returnedJobId).toBeTruthy();
    refreshPressStaff(api);
    expect(
      outletsHere(api).find((o) => o.id === local!.id)!.reporterIds,
    ).toContain(personId);
    expect(
      staffOf(api, local!.id).find((row) => row.id === personId)?.jobId,
    ).toBe(returnedJobId);
    expect(
      staffOf(api, local!.id).find((row) => row.id === personId)?.leftOn,
    ).toBeUndefined();
    const sizeAfter = core.jobs.size;
    refreshPressStaff(api);
    expect(core.jobs.size).toBe(sizeAfter);
    // The business engine's subsequent succession is also the masthead's owner.
    const owners = api.moduleState("business").table("owners");
    owners.put({ ...owners.get(local!.organizationId)!, ownerId: personId });
    refreshPressStaff(api);
    expect(outletsHere(api).find((o) => o.id === local!.id)?.ownerId).toBe(
      personId,
    );
  }, 900_000);
});
