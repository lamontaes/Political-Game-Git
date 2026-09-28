import { describe, expect, it } from "vitest";
import type { EntityId, World } from "../simulation/types";
import { careerReplyBy, seekCareerOffer } from "../simulation/career-path7";
import {
  answerJobOffer,
  applicationsFor,
  applyForJob,
  expectedStart,
  latestApplicationStep,
  openJobListings,
  startJob,
} from "../simulation/job-market";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { workStatusAt } from "../simulation/life-queries";
import { scheduledActivityState } from "../simulation/time-work";
import { letAdultTimePass } from "./adult-life";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { isCivicHold } from "./civic-hold";
import { projectToday } from "./day-overview";
import { projectLifeRecord } from "./life-record";
import { createExplicitGeographyLife } from "./new-game-geography";
import { openOrdinaryLife } from "./ordinary-life";
import { previewTimeCommand, submitTimeCommand } from "./time-command";
import { declineVenueActivity } from "./venue-activity";

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

function skip(
  world: World,
  personId: EntityId,
  days: number,
  kind: "days" | "quiet-stretch" = "days",
) {
  return submitTimeCommand(world, {
    requestId: `skip-${world.currentDate}`,
    personId,
    sourceMoment: world.currentMoment,
    command:
      kind === "quiet-stretch"
        ? { kind: "quiet-stretch" }
        : { kind: "days", days },
  });
}

/** The earlier civic stop is a player choice; decline it before continuing. */
function skipAfterShownCivicStops(
  world: World,
  personId: EntityId,
  days: number,
  kind: "days" | "quiet-stretch" = "days",
) {
  let result = skip(world, personId, days, kind);
  const shown: string[] = [];
  for (let step = 0; step < 12; step += 1) {
    const civic = result.world.history.scheduledActivities.find((activity) => {
      if (!isCivicHold(activity)) return false;
      const state = scheduledActivityState(result.world, activity.id);
      return (
        state.status === "scheduled" &&
        state.start.date === result.world.currentDate
      );
    });
    if (!civic) return { ...result, shown };
    shown.push(civic.title);
    const declined = declineVenueActivity(result.world, personId, civic.id);
    expect(declined).not.toBe(result.world);
    result = skip(declined, personId, days, kind);
  }
  throw new Error("The skip did not get past the recorded civic stops.");
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
    const {
      world: after,
      receipt,
      shown,
    } = skipAfterShownCivicStops(sought, personId, 30);
    expect(shown).toContain("Posted public meeting");
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
      const { world: after, receipt } = skipAfterShownCivicStops(
        applied.world,
        start.personId,
        60,
        "quiet-stretch",
      );
      const step = latestApplicationStep(after, application.id);
      if (step?.kind !== "offered") continue;
      stopped = true;
      expect(receipt.command.kind).toBe("quiet-stretch");
      expect(after.currentDate).toBe(step.replyBy);
      expect(receipt.outcome).toMatch(/Today is the last day to answer\./);
      expect(
        projectToday(after, start.personId).waiting.some((entry) =>
          entry.key.startsWith("job-offer:"),
        ),
      ).toBe(true);
      const stillWaiting = skip(after, start.personId, 60, "quiet-stretch");
      expect(stillWaiting.world).toBe(after);
      expect(stillWaiting.receipt.status).toBe("refused");
      const accepted = answerJobOffer(after, application.id, true);
      expect(accepted.ok).toBe(true);
      const startOn = expectedStart(accepted.world, application.id)!;
      const saved = deserializeWorld(serializeWorld(accepted.world));
      expect(
        previewTimeCommand(saved, start.personId, { kind: "quiet-stretch" }),
      ).toMatchObject({
        targetDate: startOn,
        cappedBy: { title: "Accepted work start", date: startOn },
      });
      const startStop = skipAfterShownCivicStops(
        saved,
        start.personId,
        60,
        "quiet-stretch",
      );
      expect(startStop.receipt.command.kind).toBe("quiet-stretch");
      expect(startStop.world.currentDate).toBe(startOn);
      expect(latestApplicationStep(startStop.world, application.id)?.kind).toBe(
        "accepted",
      );
      const stillStartable = skip(
        startStop.world,
        start.personId,
        60,
        "quiet-stretch",
      );
      expect(stillStartable.world).toBe(startStop.world);
      expect(stillStartable.receipt.status).toBe("refused");
      expect(startJob(startStop.world, application.id).ok).toBe(true);
    }
    expect(stopped).toBe(true);
  });
});
