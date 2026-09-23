import { describe, expect, it } from "vitest";
import type { EntityId, World } from "../simulation/types";
import { careerReplyBy, seekCareerOffer } from "../simulation/career-path7";
import {
  applicationsFor,
  applyForJob,
  latestApplicationStep,
  openJobListings,
} from "../simulation/job-market";
import { workStatusAt } from "../simulation/life-queries";
import { letAdultTimePass } from "./adult-life";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { projectToday } from "./day-overview";
import { projectLifeRecord } from "./life-record";
import { createExplicitGeographyLife } from "./new-game-geography";
import { openOrdinaryLife } from "./ordinary-life";
import { submitTimeCommand } from "./time-command";

/**
 * An offer of work never lapses unseen. In Atlanta, Fulton County offered
 * Sofia a clerk job that lapsed having appeared only on the Jobs list. A skip
 * now stops on the last day to answer, says so, and the day overview names
 * the date. Played in Reno and Houma, never Kentucky.
 */

const RENO = "3260600";
const HOUMA = "2236255";
const shop = CAREER_PROVIDERS.find((p) => p.pathId === "shop-assistant")!;

function adult(placeKey: string, seed: string) {
  const life = createExplicitGeographyLife({ placeKey, seed, startAge: 24 });
  const personId = life.game.playerPersonId;
  return { personId, world: openOrdinaryLife(life.game.world, personId) };
}

function skip(world: World, personId: EntityId, days: number) {
  return submitTimeCommand(world, {
    requestId: `skip-${world.currentDate}`,
    personId,
    sourceMoment: world.currentMoment,
    command: { kind: "days", days },
  });
}

function recordSentences(world: World, personId: EntityId): string[] {
  return projectLifeRecord(world, personId).chapters.flatMap((chapter) =>
    chapter.entries.map((entry) => entry.sentence),
  );
}

describe("an offer with a reply date", () => {
  it("on the older work list stops a month's skip on its last day", () => {
    const { world, personId } = adult(RENO, "offer-stop-career");
    const sought = seekCareerOffer(world, shop).world;
    const offer = sought.history.workRelationships.at(-1)!;
    const replyBy = careerReplyBy(sought, offer.id)!;
    const today = projectToday(sought, personId);
    expect(
      today.waiting.some((entry) =>
        /Answer by .+, or it lapses\./.test(entry.sentence),
      ),
    ).toBe(true);
    const { world: after, receipt } = skip(sought, personId, 30);
    expect(after.currentDate).toBe(replyBy);
    expect(workStatusAt(after, offer.id)?.status).toBe("expected");
    expect(receipt.outcome).toMatch(/Today is the last day to answer\./);
    // Passed over knowingly, it lapses.
    const later = skip(after, personId, 7).world;
    expect(workStatusAt(later, offer.id)?.status).toBe("ended");
    // The offer and its lapse both read back in the life record.
    const record = recordSentences(later, personId);
    expect(record.some((line) => /offers Shop assistant/.test(line))).toBe(
      true,
    );
    expect(
      record.some((line) => /lapsed: you did not answer by/.test(line)),
    ).toBe(true);
  });

  it("from a town listing stops the skip too, even when the offer came during it", () => {
    let stopped = false;
    for (let n = 1; n <= 12 && !stopped; n += 1) {
      const start = adult(HOUMA, `offer-stop-listing-${n}`);
      let world = start.world;
      for (let week = 0; week < 12; week += 1) {
        if (openJobListings(world, start.personId).length > 0) break;
        world = letAdultTimePass(world, 7);
      }
      const opening = openJobListings(world, start.personId)[0];
      if (!opening) continue;
      const applied = applyForJob(world, start.personId, opening.id);
      if (!applied.ok) continue;
      const application = applicationsFor(applied.world, start.personId)[0]!;
      const { world: after, receipt } = skip(applied.world, start.personId, 60);
      const step = latestApplicationStep(after, application.id);
      if (step?.kind !== "offered") continue;
      stopped = true;
      expect(after.currentDate).toBe(step.replyBy);
      expect(receipt.outcome).toMatch(/Today is the last day to answer\./);
      expect(
        projectToday(after, start.personId).waiting.some((entry) =>
          entry.key.startsWith("job-offer:"),
        ),
      ).toBe(true);
    }
    expect(stopped).toBe(true);
  });
});
