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
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "../simulation/dates";
import { followersOf, outletsHere, storiesPrinted } from "./modules/press";
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
      for (const id of [outlet.headId!, ...outlet.reporterIds]) {
        const person = core.people.get(id);
        expect(person?.placeId, where).toBe(world.placeId);
        const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
        expect(job?.organizationId, where).toBe(outlet.organizationId);
        expect(job?.hourlyMinor ?? 0, where).toBeGreaterThan(0);
      }
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
      .flatMap((o) => [o.headId!, ...o.reporterIds])
      .filter((id) => (core.people.get(id)?.liquidMinor ?? 0) > 0);
    // A news desert has only the national tier, whose people the town does not pay.
    if (outlets.some((o) => o.tier !== "national"))
      expect(paid.length, where).toBeGreaterThan(0);
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
  }, 900_000);
});
