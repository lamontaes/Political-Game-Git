import { describe, expect, it } from "vitest";
import {
  PUBLIC_COMMENT_EVENT,
  projectMeaningfulChanges,
  projectPartyEncounters,
  projectPublicInformationDigest,
  projectPublicMatters,
  serializeWorld,
  submitPublicComment,
} from "../simulation";
import type { World } from "../simulation";
import { searchLifePlaces } from "../simulation";
import { US_STATE_USPS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { passOrdinaryDays } from "./ordinary-life";
import { projectWorld39News } from "./world39-news";

/** A life in an actual locality with its own local governments. */
function adultLife(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: "lexington-fayette",
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!;
}

/** A civilian pressing Week: seven ordinary days at a time. */
function passWeeks(world: World, weeks: number): World {
  let current = world;
  for (let week = 0; week < weeks; week += 1)
    current = passOrdinaryDays(current, 7);
  return current;
}

describe("ALIVE43 W3 background developments", () => {
  const life = adultLife("alive43-w3-a");
  const player = life.playerPersonId;

  it("opens with a modest recent public past, already published", () => {
    const matters = projectPublicMatters(life.world);
    // The opening no longer adds the two fixed, already-concluded
    // "playtest65:prior-local" matters; what remains is the living world's own.
    expect(matters.map((m) => m.family).sort()).toEqual([
      "international",
      "local-matter",
    ]);
    expect(
      matters.some((matter) =>
        matter.matterId.startsWith("playtest65:prior-local"),
      ),
    ).toBe(false);
    expect(matters.filter((matter) => matter.concluded)).toHaveLength(0);
    const digest = projectPublicInformationDigest(life.world);
    for (const matter of matters)
      expect(
        digest.items.some(
          (item) => item.sourceEventId === matter.latestEventId,
        ),
      ).toBe(true);
  });

  it("a civilian's month moves at least two matters, published to News, without anyone learning it", () => {
    const frontier = life.world.history.nextSequence;
    const later = passWeeks(life.world, 5);
    const changes = projectMeaningfulChanges(later, player, frontier);
    const changedMatters = new Set(changes.map((c) => c.matterId));
    expect(changedMatters.size).toBeGreaterThanOrEqual(2);
    for (const change of changes) {
      expect(change.visibility).toBe("public");
      expect(change.publicationId).not.toBeNull();
    }
    const news = projectWorld39News(later, player);
    expect(JSON.stringify(news)).toContain(
      later.history.events.find((e) => e.id === changes.at(-1)!.eventId)!
        .summary,
    );
    // Publicity is not knowledge, for the player or anybody else.
    const changedIds = new Set(changes.map((c) => c.eventId));
    expect(later.history.knowledge.some((k) => changedIds.has(k.eventId))).toBe(
      false,
    );
    const organizer = projectPartyEncounters(later, player)[0]!
      .organizerPersonId!;
    expect(
      projectMeaningfulChanges(later, organizer, frontier).every(
        (c) => !c.knownToPerson,
      ),
    ).toBe(true);
  }, 60_000);

  it("a public comment changes the local continuation; without one no revision is possible", () => {
    const local = projectPublicMatters(life.world).find(
      (m) => m.family === "local-matter",
    )!;
    const commented = submitPublicComment(life.world, player, local.matterId);
    expect(
      commented.history.events.filter((e) => e.type === PUBLIC_COMMENT_EVENT),
    ).toHaveLength(1);
    const stageAfter = (world: World) =>
      projectPublicMatters(passWeeks(world, 5)).find(
        (m) => m.matterId === local.matterId,
      )!;
    const withComment = stageAfter(commented);
    const withoutComment = stageAfter(life.world);
    expect(withComment.stage).toBe("revised-proposal-posted");
    expect(withoutComment.stage).not.toBe("revised-proposal-posted");
  }, 60_000);

  it("unrelated activity continues while an optional invitation goes unanswered", () => {
    const later = passWeeks(life.world, 6);
    const invitations = projectPartyEncounters(later, player).flatMap(
      (e) => e.activities,
    );
    expect(invitations.length).toBeGreaterThan(0);
    expect(
      invitations.some((a) => ["lapsed", "expired"].includes(a.state)),
    ).toBe(true);
    // Nothing was answered, so nothing reads as a refusal.
    expect(invitations.some((a) => a.state === "declined")).toBe(false);
    expect(
      projectMeaningfulChanges(later, player, life.world.history.nextSequence)
        .length,
    ).toBeGreaterThan(0);
  }, 60_000);

  it("reads are pure, quiet intervals report nothing, and replays match", () => {
    const later = passWeeks(life.world, 5);
    const before = serializeWorld(later);
    projectPublicMatters(later);
    projectMeaningfulChanges(later, player, 0);
    expect(serializeWorld(later)).toBe(before);
    expect(
      projectMeaningfulChanges(later, player, later.history.nextSequence),
    ).toEqual([]);
    expect(serializeWorld(passWeeks(life.world, 5))).toBe(before);
    // A concluded matter is not re-stepped by a second pass over time.
    const stages = (world: World) =>
      world.history.events.filter((e) =>
        e.tags.some((t) => t.startsWith("stage:")),
      ).length;
    const again = passOrdinaryDays(later, 1);
    expect(stages(again)).toBeGreaterThanOrEqual(stages(later));
    expect(new Set(again.history.events.map((e) => e.stableKey)).size).toBe(
      again.history.events.length,
    );
  }, 60_000);

  it("measures a longer civilian skip without asserting a latency target", () => {
    const started = performance.now();
    const later = passWeeks(life.world, 26);
    const ms = performance.now() - started;
    const changes = projectMeaningfulChanges(
      later,
      player,
      life.world.history.nextSequence,
    );
    console.info(
      `[alive43-w3] 26 weekly skips ${ms.toFixed(0)}ms; ${changes.length} public development records; save ${serializeWorld(later).length} bytes`,
    );
    expect(later.currentDate > life.world.currentDate).toBe(true);
    // Concluded matters are followed by new ones after a quiet gap.
    const matters = new Set(changes.map((c) => c.matterId));
    expect(matters.size).toBeGreaterThanOrEqual(3);
    const dates = changes.map((c) => c.occurredAt).sort();
    const gaps = dates
      .slice(1)
      .map(
        (date, index) =>
          (Date.parse(date) - Date.parse(dates[index]!)) / 86_400_000,
      );
    expect(Math.max(...gaps)).toBeGreaterThanOrEqual(14);
  }, 120_000);

  it("old-save control: a save without developments stays quiet", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alive43-w3-old",
      startAge: 34,
    });
    const old = establishOpeningOfficeholders(
      created.world,
      created.playerPersonId,
    );
    const later = passWeeks(old, 5);
    expect(projectPublicMatters(later)).toEqual([]);
    expect(projectMeaningfulChanges(later, created.playerPersonId, 0)).toEqual(
      [],
    );
  }, 60_000);
});

describe("how a town's proposals end with nobody commenting", () => {
  // Observer runs with nobody played saw 111 of 111 proposals withdrawn:
  // adoption was not a possible ending at all. Cary, North Carolina.
  it("some are adopted and some withdrawn, and none is revised without a comment", () => {
    let world = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "town-proposals-end",
        placeKey: "3710740",
        startAge: 34,
        questionnaire: "skipped" as const,
      }),
    ).game!.world;
    const start = world.history.nextSequence;
    world = passOrdinaryDays(world, 7 * 80);
    const endings = world.history.events
      .filter(
        (event) =>
          event.sequence >= start &&
          event.type.startsWith("civic.local-matter-") &&
          !event.type.endsWith("-posted") &&
          !event.type.endsWith("-extended"),
      )
      .map((event) => event.type);
    expect(endings).toContain("civic.local-matter-adopted");
    expect(endings).toContain("civic.local-matter-withdrawn");
    expect(endings).not.toContain("civic.local-matter-revised");
    const adopted = world.history.events.find(
      (event) => event.type === "civic.local-matter-adopted",
    )!;
    expect(adopted.summary).toMatch(/ adopted its proposal about /);
    // What each proposal is about is an issue a county or city decides, from
    // the World's own policy catalog, not one of four fixed errands; and the
    // world news draws from more than the two old stories (audit O1).
    const subjectOf = (event: (typeof world.history.events)[number]) =>
      event.tags.find((tag) => tag.startsWith("subject:"))!.slice(8);
    const localSubjects = new Set(
      world.history.events
        .filter((event) => event.type === "civic.local-matter-proposal-posted")
        .map(subjectOf),
    );
    for (const issueId of localSubjects)
      expect(
        world.policyCatalog.issues[issueId]!.levels!.some(
          (level) => level === "municipality" || level === "county",
        ),
      ).toBe(true);
    expect(localSubjects.size).toBeGreaterThan(4);
    const internationalSubjects = new Set(
      world.history.events
        .filter((event) => event.type === "international.development-reported")
        .map(subjectOf),
    );
    expect(internationalSubjects.size).toBeGreaterThan(2);
  }, 600_000);
});

describe("background developments in every state, D.C. and the territories", () => {
  // One path for every place: the opening's local proposal names an issue a
  // county or city decides, from the same catalog, wherever the life begins.
  it("opens each life's local proposal on a catalog issue its local government decides", () => {
    const places = [...US_STATE_USPS, "DC", "PR", "GU", "VI", "AS", "MP"];
    let posted = 0;
    for (const usps of places) {
      const place = searchLifePlaces("", 1, {
        stateJurisdictionKey: `US-${usps}`,
        scope: "locality",
      })[0]!;
      const world = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `developments-${usps}`,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped" as const,
        }),
      ).game!.world;
      const proposal = world.history.events.find(
        (event) => event.type === "civic.local-matter-proposal-posted",
      );
      // A place whose local government the World does not record posts none.
      if (!proposal) continue;
      posted += 1;
      const issueId = proposal.tags
        .find((tag) => tag.startsWith("subject:"))!
        .slice(8);
      const issue = world.policyCatalog.issues[issueId]!;
      expect(
        issue.levels!.some(
          (level) => level === "municipality" || level === "county",
        ),
        usps,
      ).toBe(true);
      expect(proposal.summary).toContain(issue.name.toLowerCase());
    }
    console.info(
      `[developments] ${posted} of ${places.length} opened a local proposal`,
    );
    expect(posted).toBeGreaterThan(places.length / 2);
  }, 900_000);
});
