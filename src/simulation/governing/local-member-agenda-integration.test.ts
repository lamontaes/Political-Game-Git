import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { addDays, daysBetween } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import { governmentUnitsForPlace } from "../government-units";
import type { PrincipleRecordInput } from "../history";
import { measurePosition } from "../legislation";
import { currentMeasureProvisions } from "../legislative-politics";
import { requireLifePlace } from "../life-places";
import { LOCAL_ORDINANCE_GAME_PROFILE_VERSION } from "../local-ordinance-game-profile";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { municipalSeats } from "../municipal-public-work";
import {
  COUNCIL_ACT_HANDLERS,
  COUNCIL_READING_DUE,
} from "../municipal-ordinance-procedure";
import { createFormationContext, recordPrinciples } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld } from "../world";
import {
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
  LOCAL_MEMBER_AGENDA_HANDLERS,
  scheduleLocalMemberAgendaIntakes,
} from "./member-agenda";

const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;
const localPackId = `${city.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
const intakeKeyFor = (dueAt: string) =>
  `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:${dueAt}`;
const handlers = createFutureTransitionHandlerRegistry([
  ...LOCAL_MEMBER_AGENDA_HANDLERS,
  ...COUNCIL_ACT_HANDLERS,
]);

/** The same GEOID and opened five-seat council as local-fiscal-authority.test. */
function openedWorld(): World {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "local-member-agenda-0162328",
    placeKey: place.key,
    startAge: 34,
    questionnaire: "skipped",
  });
  let world: World = ensureMunicipalCouncilOpening(game.world, city.id);
  const seats = municipalSeats(world, city.id).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(seats).toHaveLength(5);
  // As in the existing local authority fixture, control one councilor and
  // leave the other seated people to file and vote for themselves.
  world = {
    ...world,
    control: { kind: "person", personId: seats[0]!.personId },
  };
  const supporting = ["fiscal-restraint", "environmental-stewardship"].map(
    (key) =>
      Object.values(world.policyCatalog.principles).find(
        (principle) => principle.stableKey === `us-policy-positions:${key}`,
      )!,
  );
  expect(supporting.every(Boolean)).toBe(true);
  const principles: PrincipleRecordInput[] = seats.slice(1).flatMap((seat) =>
    supporting.map((principle) => ({
      stableKey: `local-agenda-fixture:${seat.personId}:${principle.stableKey}`,
      personId: seat.personId,
      principleId: principle.id,
      formedAt: world.currentDate,
      stance: "endorses",
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("other:drawn-before-play", {
        note: "Saved fixture convictions make the local maintenance proposal available to seated NPCs.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  return recordPrinciples(world, principles);
}

describe("ordinary local member fiscal agenda", () => {
  it("schedules the admitted city's own quarterly intake", () => {
    const world = openedWorld();
    const scheduled = scheduleLocalMemberAgendaIntakes(world);
    const intake = scheduled.history.futureDueItems.find(
      (item) =>
        item.transitionKey === LOCAL_MEMBER_AGENDA_INTAKE &&
        item.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:`,
        ),
    );
    expect(intake).toMatchObject({
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      jurisdictionId: place.context.jurisdiction.id,
    });
  });

  it("turns a due intake into a typed bill and a saved member-decided council disposition", () => {
    const world = openedWorld();
    const dueAt = addDays(world.currentDate, 1);
    const queued = scheduleFutureDueItem(world, {
      stableKey: intakeKeyFor(dueAt),
      dueAt,
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      entityIds: [place.context.jurisdiction.id],
      jurisdictionId: place.context.jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Exercise the ordinary local agenda handler at one game-profile intake.",
      },
    });
    let afterIntake = advanceWorld(queued, 1, handlers);
    const intake = afterIntake.history.futureDueItems.find(
      (item) => item.stableKey === intakeKeyFor(dueAt),
    )!;
    expect(
      afterIntake.history.futureDueItemStates
        .filter((state) => state.dueItemId === intake.id)
        .at(-1),
    ).toMatchObject({
      status: "resolved",
      context:
        "The local council reached its quarterly game-profile agenda date.",
    });

    const measure = (afterIntake.history.legislativeMeasures ?? []).find(
      (entry) =>
        entry.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:`,
        ) && entry.rulePackId === localPackId,
    );
    expect(measure).toMatchObject({
      origin: "member-introduction",
      subjectClass: "appropriation",
      rulePackId: localPackId,
    });
    if (!measure) return;
    const amount = currentMeasureProvisions(afterIntake, measure.id).find(
      (provision) => provision.provisionKey === "amount-provided",
    );
    expect(amount?.operativeEffect).toEqual({
      kind: "public-program-appropriation",
    });
    expect(amount?.fiscalExposureMinorUnits).toBeGreaterThan(0);
    expect(
      afterIntake.history.legislativeDraftLineages?.find(
        (lineage) => lineage.measureId === measure.id,
      )?.variantKey,
    ).toBe("local-fix-it-first-v1");

    const reading = afterIntake.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measure.id),
    );
    expect(reading).toBeDefined();
    if (!reading) return;
    afterIntake = advanceWorld(
      afterIntake,
      daysBetween(afterIntake.currentDate, reading.dueAt),
      handlers,
    );
    const vote = (afterIntake.history.legislativeVotes ?? []).find(
      (entry) =>
        entry.measureId === measure.id && entry.purpose === "floor-stage",
    );
    expect(vote?.provenance.method).toBe("member-decisions");
    expect(
      vote?.dispositions.some(
        (disposition) =>
          disposition.personId === measure.sponsorPersonId &&
          disposition.disposition === "yea" &&
          disposition.reason?.startsWith("member:") === true,
      ),
    ).toBe(true);
    expect(measurePosition(afterIntake, measure.id).outcome).toBe(
      vote?.outcome === "passed" ? "enacted" : "failed",
    );
    const reloaded = deserializeWorld(serializeWorld(afterIntake));
    expect(reloaded.history.legislativeVotes).toEqual(
      afterIntake.history.legislativeVotes,
    );
    expect(currentMeasureProvisions(reloaded, measure.id)).toEqual(
      currentMeasureProvisions(afterIntake, measure.id),
    );
    expect(measurePosition(reloaded, measure.id)).toEqual(
      measurePosition(afterIntake, measure.id),
    );
  });
});
