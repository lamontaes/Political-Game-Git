import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation/types";
import {
  careerEligibility,
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { workStatusAt } from "../simulation/life-queries";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { createExplicitGeographyLife } from "./new-game-geography";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * The older work list's offers, played in Reno and Fargo, never Kentucky.
 * They used to wait forever: an unanswered offer never lapsed, and an
 * accepted shop job in San Antonio waited three years for Begin. Now the
 * employer follows the owner's rule for every job.
 */

const RENO = "3260600";
const FARGO = "3825700";
const shop = CAREER_PROVIDERS.find((p) => p.pathId === "shop-assistant")!;
const repair = CAREER_PROVIDERS.find((p) => p.pathId === "repair-worker")!;

function adult(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({ placeKey, seed, startAge: 24 });
  const personId = life.game.playerPersonId;
  return {
    personId,
    world: openOrdinaryLife(life.game.world, personId),
  };
}

function offerFor(world: World, personId: EntityId) {
  return world.history.workRelationships.find(
    (r) =>
      r.personId === personId &&
      r.stableKey.startsWith(`career-path7:${shop.id}:`),
  )!;
}

function eventsFor(world: World, workId: EntityId, type: string) {
  return world.history.events.filter(
    (e) =>
      e.type === `career-path7.${type}` && e.involvedEntityIds.includes(workId),
  );
}

describe("an offer on the older work list", () => {
  it("lapses when nobody answers it", () => {
    const { world, personId } = adult(RENO, "career-lapse");
    const sought = seekCareerOffer(world, shop);
    expect(sought.ok).toBe(true);
    const offer = offerFor(sought.world, personId);
    const later = passOrdinaryDays(sought.world, 9);
    expect(workStatusAt(later, offer.id)?.status).toBe("ended");
    expect(workStatusAt(later, offer.id)?.reason).toBe(
      "The offer lapsed unanswered.",
    );
    expect(eventsFor(later, offer.id, "offer-lapsed")[0]!.summary).toMatch(
      /you did not answer by [A-Z][a-z]+ \d{1,2}, \d{4}\./,
    );
    assertWorldIntegrity(later);
  });

  it("stays when begun in time, across a save and reload", () => {
    const { world, personId } = adult(FARGO, "career-begin");
    const sought = seekCareerOffer(world, shop).world;
    const offer = offerFor(sought, personId);
    const accepted = respondCareerOffer(sought, offer.id, shop, true).world;
    const reloaded = deserializeWorld(
      serializeWorld(passOrdinaryDays(accepted, 1)),
    );
    const begun = startCareerWork(reloaded, offer.id, shop);
    expect(begun.ok).toBe(true);
    const later = passOrdinaryDays(begun.world, 10);
    expect(workStatusAt(later, offer.id)?.status).toBe("active");
    expect(eventsFor(later, offer.id, "withdrawn")).toHaveLength(0);
  });

  it("after a missed start, the employer calls once with a new date, or withdraws", () => {
    const outcomes = new Set<string>();
    for (let n = 1; n <= 16 && outcomes.size < 2; n += 1) {
      const { world, personId } = adult(RENO, `career-miss-${n}`);
      const sought = seekCareerOffer(world, shop).world;
      const offer = offerFor(sought, personId);
      const accepted = respondCareerOffer(sought, offer.id, shop, true).world;
      const missed = passOrdinaryDays(accepted, 5);
      const called = eventsFor(missed, offer.id, "followed-up");
      if (called.length > 0) {
        outcomes.add("followed-up");
        expect(workStatusAt(missed, offer.id)?.status).toBe("expected");
        expect(called[0]!.summary).toMatch(/still want you, starting/);
        // A second miss ends it.
        const again = passOrdinaryDays(missed, 12);
        expect(workStatusAt(again, offer.id)?.status).toBe("ended");
        expect(eventsFor(again, offer.id, "followed-up")).toHaveLength(1);
      } else {
        outcomes.add("withdrawn");
        expect(workStatusAt(missed, offer.id)?.reason).toBe(
          "The employer withdrew the offer after a missed start.",
        );
      }
      assertWorldIntegrity(missed);
    }
    expect([...outcomes].sort()).toEqual(["followed-up", "withdrawn"]);
  });
});

describe("two jobs whose shifts overlap", () => {
  it("refuses the second, naming both shifts", () => {
    const { world, personId } = adult(FARGO, "career-overlap");
    const sought = seekCareerOffer(world, shop).world;
    const offer = offerFor(sought, personId);
    const accepted = respondCareerOffer(sought, offer.id, shop, true).world;
    const begun = startCareerWork(
      passOrdinaryDays(accepted, 1),
      offer.id,
      shop,
    ).world;
    expect(careerEligibility(begun, repair)).toBe(
      "This job's 8 a.m. to 2 p.m. shift overlaps the 9 a.m. to 1 p.m. shift you work as shop assistant.",
    );
    expect(seekCareerOffer(begun, repair).ok).toBe(false);
  });
});
