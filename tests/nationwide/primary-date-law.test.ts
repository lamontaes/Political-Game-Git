import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";
import { addDays, daysBetween } from "../../src/simulation/dates";
import {
  electionLawOfficeKey,
  fileRuleChangeProvision,
} from "../../src/simulation/enacted-rule-changes";
import {
  enrollMeasure,
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  recordEnactment,
  recordExecutiveAction,
  referMeasure,
  takeFloorVote,
} from "../../src/simulation/legislation";
import {
  bodyForChamber,
  committeeMembers,
  createLegislativeScenario,
  dispositionsFromCounts,
} from "../../src/simulation/legislation-scenarios";
import { chamberByKey } from "../../src/simulation/legislature-rules";
import { NOMINATION_EVENT } from "../../src/simulation/nominations/party-nominations";
import type { EntityId, HistoricalEvent, World } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this fixture.",
  sourceEntityIds: [] as readonly EntityId[],
};

const SEED = "careers-primary-date";
/** The life's home, drawn at random; Nebraska's law reaches every state's record. */
const PLACE = drawRandomPlace(SEED);

/**
 * A life in which Nebraska's Legislature moves the state's primary to the
 * first Tuesday in April and the Governor signs it, 45 days after the game
 * opens. The Legislature's seats are the Nebraska scenario's, voting by seat
 * without a person in this world behind each one.
 */
function lifeWithNebraskaMovingItsPrimary(): World {
  const scenario = createLegislativeScenario("nebraska");
  const template = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: PLACE.key,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  const opened = world.currentDate;
  const chamber = chamberByKey(scenario.pack, "legislature");
  const committee = chamber.committees[0]!;
  const seated = bodyForChamber(scenario, "legislature");
  const body = {
    ...seated,
    members: seated.members.map((member) => ({ ...member, personId: null })),
  };
  const key = "primary-date:lb-910";
  world = introduceMeasure(world, {
    stableKey: `${key}:measure`,
    jurisdictionId: template.jurisdictionId,
    rulePackId: template.rulePackId,
    designation: "LB 910",
    shortTitle: "Primary election date",
    summary: "Moves the statewide primary to the first Tuesday in April.",
    origin: "member-introduction",
    subjectClass: template.subjectClass,
    sponsorPersonId: game.playerPersonId,
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === `${key}:measure`,
  )!.id;
  world = fileRuleChangeProvision(world, {
    stableKey: `${key}:date`,
    measureId,
    officeKey: electionLawOfficeKey("NE"),
    field: "nomination.primary.dateRule",
    value: { kind: "nth-weekday", month: 4, weekday: 2, nth: 1 },
  });
  world = referMeasure(world, {
    stableKey: `${key}:referral`,
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: `${key}:committee`,
    measureId,
    recommendation: "favorable",
    dispositions: dispositionsFromCounts(
      committeeMembers(body, committee.appointedMembers),
      { yea: committee.appointedMembers, nay: 0 },
    ),
    rationale: "The committee backed the bill.",
    provenance: AUTHORED,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: `${key}:calendar`,
    measureId,
  });
  for (const stage of chamber.floorStages) {
    const until = measurePosition(world, measureId).earliestNextFloorDate;
    if (until && world.currentDate < until)
      world = passOrdinaryDays(world, daysBetween(world.currentDate, until));
    world = takeFloorVote(world, {
      stableKey: `${key}:${stage.stageKey}`,
      measureId,
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      presentMembers: body.members.length,
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  }
  world = enrollMeasure(world, { stableKey: `${key}:enroll`, measureId });
  world = presentMeasureToExecutive(world, {
    stableKey: `${key}:present`,
    measureId,
  });
  world = recordExecutiveAction(world, {
    stableKey: `${key}:governor`,
    measureId,
    action: "signed",
    rationale: "The Governor signed it.",
  });
  return recordEnactment(world, {
    stableKey: `${key}:enactment`,
    measureId,
    actDesignation: "LB 910, 2026",
    effectiveAt: addDays(opened, 45),
  });
}

function monthsUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 120 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(next, 30);
  return next;
}

const seatOf = (event: HistoricalEvent) =>
  event.tags.find((tag) => tag.startsWith("seat:"))!.slice("seat:".length);

describe(
  `a state law that moves its primary moves the next nominations (home: ${PLACE.displayName}, seed ${SEED})`,
  { timeout: 1_500_000 },
  () => {
    it("holds Nebraska's congressional primaries on the new date from the next cycle on", () => {
      const world = monthsUntil(
        lifeWithNebraskaMovingItsPrimary(),
        "2028-04-10",
      );
      const primaries = world.history.events.filter(
        (event) => event.type === NOMINATION_EVENT,
      );
      const nebraska = (year: string) =>
        primaries.filter(
          (event) =>
            /^us-(house|senate):NE/.test(seatOf(event)) &&
            event.occurredAt.startsWith(year),
        );
      // 2026: filing opened on January 6, before the law took effect in
      // February, so the old date governs the whole cycle: May 12, 2026.
      expect(nebraska("2026").length).toBeGreaterThan(0);
      expect(
        nebraska("2026").every(
          (event) =>
            event.occurredAt === "2026-05-12" &&
            event.tags.includes("date-basis:set-for-2026"),
        ),
      ).toBe(true);
      // 2028: the law governs. The first Tuesday in April 2028 is April 4;
      // the old rule would have given May 9.
      expect(nebraska("2028").length).toBeGreaterThan(0);
      expect(
        nebraska("2028").every(
          (event) =>
            event.occurredAt === "2028-04-04" &&
            event.tags.includes("date-basis:enacted-law"),
        ),
      ).toBe(true);
      // Texas's law did not change: its 2028 primary is on its own rule's
      // day, the first Tuesday in March.
      const texas = primaries.filter(
        (event) =>
          /^us-(house|senate):TX/.test(seatOf(event)) &&
          event.occurredAt.startsWith("2028"),
      );
      expect(texas.length).toBeGreaterThan(0);
      expect(
        texas.every(
          (event) =>
            event.occurredAt === "2028-03-07" &&
            event.tags.includes("date-basis:standing-rule"),
        ),
      ).toBe(true);
    });
  },
);
