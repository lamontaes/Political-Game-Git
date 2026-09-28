import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

import {
  PLACE_SURFACES,
  projectBackdropSurfaces,
  type BackdropSurface,
} from "../presentation/backdrop-surfaces";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import type { BackdropVariant } from "../presentation/place-backdrops";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { projectRoomMedia } from "../presentation/room-media";
import { submitTimeCommand } from "../presentation/time-command";
import { addDays, money } from "../simulation";
import { createScheduledActivity } from "../simulation/time-work";
import { scheduleElectionContest } from "../simulation/election-contests";
import { declareProgramCapacity } from "../simulation/governing/public-program";
import type { EntityId, World } from "../simulation";
import { BackdropSurfaceFaces } from "./BackdropSurfaceLayer";

/**
 * The painted screens, boards and papers in three place pictures — a
 * legislative chamber, a campaign office and an office desk — carry the
 * world's own records after two months of play in Bloomington, Indiana, and
 * an empty world leaves every painted face as it was.
 */

const FULL_PICTURE = { left: 0, top: 0, width: 1672, height: 941 };

function advance(world: World, personId: EntityId, days: number): World {
  let next = world;
  for (let day = 0; day < days; day += 1) {
    next = submitTimeCommand(next, {
      requestId: `backdrop-surfaces-${day}`,
      personId,
      command: { kind: "days", days: 1 },
      sourceMoment: next.currentMoment,
    }).world;
  }
  return next;
}

function render(
  surfaces: readonly BackdropSurface[],
  variant = "midday",
): string {
  return renderToStaticMarkup(
    <BackdropSurfaceFaces
      surfaces={surfaces}
      variant={variant}
      rect={FULL_PICTURE}
    />,
  );
}

let opening: World;
let world: World;
let personId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "backdrop-surfaces-1805860",
      startAge: 34,
      placeKey: "1805860",
    }),
  ).game!;
  personId = game.playerPersonId;
  opening = game.world;
  const later = advance(opening, personId, 60);
  // One appointment of the player's own, written the way the game writes
  // one, two evenings from now.
  const evening = {
    ...later.currentMoment,
    date: addDays(later.currentDate, 2),
  };
  world = createScheduledActivity(later, {
    stableKey: "backdrop-surfaces:precinct-meeting",
    title: "Canvass planning meeting",
    summary: "The volunteers divide up the canvass.",
    kind: "confirmed",
    start: { ...evening, minuteOfDay: 19 * 60 },
    end: { ...evening, minuteOfDay: 20 * 60 + 30 },
    participantPersonIds: [personId],
    responsiblePersonId: personId,
    location: {
      locationKey: "campaign-office",
      label: "Campaign office",
      jurisdictionId: null,
    },
    sourceEntityIds: [later.history.events[0]!.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [personId] },
  });
});

function surfacesAt(
  target: World,
  place: string,
  variant: BackdropVariant = "midday",
) {
  return projectBackdropSurfaces(
    target,
    personId,
    { place, variant },
    projectRoomMedia(target, personId),
  );
}

describe("live content on the painted surfaces of place pictures", () => {
  it("shows the Senate's recorded votes and bills on its chamber wall", () => {
    const surfaces = surfacesAt(world, "us-senate-floor");
    const kinds = surfaces.map((surface) => surface.content.kind);
    expect(kinds).toContain("bills");
    const measures = world.history.legislativeMeasures ?? [];
    const html = render(surfaces);
    for (const surface of surfaces) {
      expect(html).toContain(`data-surface-id="${surface.slot.id}"`);
      if (surface.content.kind === "bills")
        for (const bill of surface.content.bills)
          expect(
            measures.some(
              (measure) =>
                measure.designation === bill.designation &&
                measure.shortTitle === bill.title,
            ),
          ).toBe(true);
      if (surface.content.kind === "votes") {
        // Only the Senate's own votes go on the Senate's wall.
        const votes = world.history.legislativeVotes ?? [];
        for (const line of surface.content.lines)
          expect(
            votes.some(
              (vote) =>
                (vote.forum as { chamberKey?: string }).chamberKey ===
                  "senate" &&
                measures.find((measure) => measure.id === vote.measureId)
                  ?.designation === line.designation,
            ),
          ).toBe(true);
      }
    }
    expect(html).toContain("backdrop-bills");
  });

  it("pins the player's own appointments up in the campaign office", () => {
    const surfaces = surfacesAt(world, "campaign-storefront");
    expect(surfaces.length).toBeGreaterThan(0);
    const plans = surfaces.find((surface) => surface.content.kind === "plans");
    expect(plans).toBeDefined();
    const html = render(surfaces);
    expect(html).toContain("backdrop-plans");
    const titles = new Set(
      world.history.scheduledActivities.map((activity) => activity.title),
    );
    if (plans?.content.kind === "plans")
      for (const note of plans.content.notes) {
        expect(titles.has(note.title)).toBe(true);
        expect(html).toContain(note.title);
      }
  });

  it("puts the town's bills and the player's plans on the office desk", () => {
    const surfaces = surfacesAt(world, "office");
    const byId = new Map(
      surfaces.map((surface) => [surface.slot.id, surface.content.kind]),
    );
    expect(byId.get("office-clipboard-front")).toBe("plans");
    expect([...byId.values()]).toContain("bills");
    const html = render(surfaces);
    expect(html).toContain('data-surface-id="office-clipboard-front"');
    expect(html).toContain("Canvass planning meeting");
    expect(html).toContain("ORD ");
  });

  it("keeps the town council's votes off the county commission's screen", () => {
    const town = world.people[personId]!.homeJurisdictionId!;
    const measures = new Map(
      (world.history.legislativeMeasures ?? []).map((measure) => [
        measure.designation,
        measure.jurisdictionId,
      ]),
    );
    // The town has voted; the county has no record of its own here.
    expect([...measures.values()]).toContain(town);
    for (const surface of surfacesAt(world, "county-commission")) {
      if (surface.content.kind === "votes")
        for (const line of surface.content.lines)
          expect(measures.get(line.designation)).not.toBe(town);
      if (surface.content.kind === "bills")
        for (const bill of surface.content.bills)
          expect(measures.get(bill.designation)).not.toBe(town);
    }
  });

  it("never repeats one list on two boards of the same room", () => {
    for (const place of Object.keys(PLACE_SURFACES)) {
      const seen = new Set<string>();
      for (const surface of surfacesAt(world, place)) {
        if (surface.slot.kind === "screen") continue;
        const key = JSON.stringify(surface.content);
        expect(seen.has(key), `${place}: ${surface.slot.id}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("leaves every painted face alone when the world has nothing to show", () => {
    // The opening day of a fresh world: no bills, no votes, no races.
    for (const place of ["us-senate-floor", "county-commission", "office"]) {
      const surfaces = surfacesAt(opening, place).filter(
        (surface) =>
          surface.content.kind !== "plans" &&
          surface.content.kind !== "broadcast" &&
          surface.content.kind !== "front-page",
      );
      expect(surfaces, place).toEqual([]);
    }
    expect(render([])).toBe("");
  });

  it("puts real candidates on the posters and real services in the brochures", () => {
    const town = world.people[personId]!.homeJurisdictionId!;
    const neighbors = world.personOrder
      .filter(
        (id) =>
          id !== personId && world.people[id]?.homeJurisdictionId === town,
      )
      .slice(0, 2);
    expect(neighbors).toHaveLength(2);
    let next = scheduleElectionContest(world, {
      stableKey: "backdrop-surfaces:mayor",
      jurisdictionId: town,
      office: {
        officeKey: "mayor",
        title: "Mayor",
        seatKey: null,
        occupationClassification: null,
      },
      electionDate: addDays(world.currentDate, 1),
      candidatePersonIds: neighbors,
      provenance: { method: "authored", sourceEntityIds: [], note: null },
    });
    next = declareProgramCapacity(next, {
      edition: "backdrop-surfaces",
      programKey: "transit:bus-service",
      jurisdictionId: town,
      serviceLabel: "City bus service",
      unitLabel: "buses",
      unitsTotal: 12,
      unitsOperational: 9,
      monthlyOperatingNeed: money(150_000_00, "USD"),
      completedPermille: null,
      restorationCostPerUnit: null,
      basis: { kind: "authored-fixture", note: "Render check." },
    }).world;

    const gym = surfacesAt(next, "school-gym-town-hall");
    const posters = gym.flatMap((surface) =>
      surface.content.kind === "candidates" ? surface.content.posters : [],
    );
    expect(posters.map((poster) => poster.personId).sort()).toEqual(
      [...neighbors].sort(),
    );
    expect(posters[0]!.office).toBe("for Mayor");
    const html = render(gym);
    expect(html).toContain("for Mayor");

    const rack = surfacesAt(next, "clerk-counter").filter(
      (surface) => surface.slot.kind === "brochure",
    );
    expect(rack).toHaveLength(1);
    expect(render(rack)).toContain("City bus service");

    // After the count, the election-night screen shows who won.
    // Election Day is tomorrow; the player's own appointment comes after it.
    const counted = advance(next, personId, 2);
    expect(counted.currentDate > addDays(world.currentDate, 1)).toBe(true);
    const screen = surfacesAt(counted, "election-night-venue");
    const results = screen.find(
      (surface) => surface.content.kind === "results",
    );
    expect(results).toBeDefined();
    expect(render(screen)).toContain("Mayor");
  });

  it("dims paper and cards in the night picture but not screens", () => {
    const html = render(surfacesAt(world, "office", "night"), "night");
    expect(html).toContain("backdrop-surfaces--night");
  });
});
