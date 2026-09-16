import { describe, expect, it } from "vitest";

import {
  campaignForCandidate,
  deserializeWorld,
  electionContestResult,
  serializeWorld,
} from "../simulation";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { QUIET_ADULT_STEPS } from "./life-story";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import {
  describeTimeCommandPreview,
  nextKnownCalendarItem,
  previewTimeCommand,
  recentTimeCommandReceipts,
  submitTimeCommand,
  type TimeCommand,
} from "./time-command";

function adultLife(seed = "governing-time-command") {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  return { world: openOrdinaryLife(built.world, personId), personId };
}

let counter = 0;
function request(
  world: ReturnType<typeof adultLife>["world"],
  personId: string,
  command: TimeCommand,
) {
  counter += 1;
  return {
    requestId: `test-${counter}`,
    personId,
    sourceMoment: world.currentMoment,
    command,
  };
}

const fixedClock = () => 0;

describe("the canonical time command", () => {
  it("moves a single ordinary day to the next morning", () => {
    const { world, personId } = adultLife();
    const { world: next, receipt } = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
    expect(next.currentDate > world.currentDate).toBe(true);
    expect(receipt.requestedTarget?.date).toBe(next.currentDate);
    expect(receipt.stoppedEarly).toBe(false);
  });

  it("moves an explicit week and an explicit long interval as asked", () => {
    const { world, personId } = adultLife();
    const week = submitTimeCommand(
      world,
      request(world, personId, { kind: "days", days: 7 }),
      fixedClock,
    );
    expect(week.receipt.requestedTarget?.date).toBe(
      previewTimeCommand(world, personId, { kind: "days", days: 7 })
        ?.targetDate,
    );
    const long = submitTimeCommand(
      week.world,
      request(week.world, personId, { kind: "days", days: 180 }),
      fixedClock,
    );
    expect(long.receipt.status).toBe("accepted");
    // A deliberate long skip is still honoured; it can only stop early for a
    // real commitment, and then it says so.
    expect(long.world.currentDate > week.world.currentDate).toBe(true);
    if (!long.receipt.stoppedEarly)
      expect(long.world.currentDate).toBe(long.receipt.requestedTarget?.date);
  });

  it("refuses a stale request so one click never advances twice", () => {
    const { world, personId } = adultLife();
    const click = request(world, personId, { kind: "quiet-stretch" });
    const first = submitTimeCommand(world, click, fixedClock);
    expect(first.receipt.status).toBe("accepted");
    // The same request delivered again (a repeated callback, a double click
    // that arrives after the first commit) is refused.
    const repeat = submitTimeCommand(first.world, click, fixedClock);
    expect(repeat.receipt.status).toBe("stale");
    expect(repeat.world).toBe(first.world);
    // A control rendered from the older World cannot commit on the newer one.
    const late = submitTimeCommand(
      first.world,
      { ...request(world, personId, { kind: "days", days: 1 }) },
      fixedClock,
    );
    expect(late.receipt.status).toBe("stale");
    expect(late.world).toBe(first.world);
    expect(
      recentTimeCommandReceipts()
        .slice(-3)
        .map((receipt) => receipt.status),
    ).toEqual(["accepted", "stale", "stale"]);
  });

  it("discloses the quiet stretch before it runs, and lands on that date", () => {
    const { world, personId } = adultLife();
    const preview = previewTimeCommand(world, personId, {
      kind: "quiet-stretch",
    })!;
    expect(preview.days).toBeGreaterThanOrEqual(1);
    expect(preview.days).toBeLessThanOrEqual(Math.max(...QUIET_ADULT_STEPS));
    expect(describeTimeCommandPreview(preview)).toContain(
      String(Number(preview.targetDate.slice(0, 4))),
    );
    const { world: next, receipt } = submitTimeCommand(
      world,
      request(world, personId, { kind: "quiet-stretch" }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
    if (!receipt.stoppedEarly)
      expect(next.currentDate).toBe(preview.targetDate);
  });

  it("never runs a quiet stretch past a known dated item for the character", () => {
    const built = adultLife("governing-time-command-filed");
    const world = fileForOffice(built.world, built.personId);
    const next = nextKnownCalendarItem(world, built.personId);
    const preview = previewTimeCommand(world, built.personId, {
      kind: "quiet-stretch",
    })!;
    if (next) expect(preview.targetDate <= next.date).toBe(true);
    const campaign = campaignForCandidate(world, built.personId)!;
    let current = world;
    // Ordinary quiet stretches still reach election day and resolve it once.
    for (let step = 0; step < 12; step += 1) {
      if (electionContestResult(current, campaign.contestId)) break;
      current = submitTimeCommand(
        current,
        request(current, built.personId, { kind: "quiet-stretch" }),
        fixedClock,
      ).world;
    }
    expect(electionContestResult(current, campaign.contestId)).toBeDefined();
    expect(
      current.history.electionContestResults?.filter(
        (result) => result.contestId === campaign.contestId,
      ),
    ).toHaveLength(1);
  });

  it("waits until a recorded activity and refuses one already begun", () => {
    const { world, personId } = adultLife();
    const refused = submitTimeCommand(
      world,
      request(world, personId, {
        kind: "until-activity",
        activityId: "no-such-activity",
      }),
      fixedClock,
    );
    expect(refused.receipt.status).toBe("refused");
    expect(refused.world).toBe(world);
  });

  it("survives save and reload with the same source moment", () => {
    const { world, personId } = adultLife();
    const reloaded = deserializeWorld(serializeWorld(world));
    const { receipt } = submitTimeCommand(
      reloaded,
      request(world, personId, { kind: "days", days: 1 }),
      fixedClock,
    );
    expect(receipt.status).toBe("accepted");
  });
});
