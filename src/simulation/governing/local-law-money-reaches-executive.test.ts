import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { governmentUnitsForPlace } from "../government-units";
import type { PrincipleRecordInput } from "../history";
import { measurePosition } from "../legislation";
import { requireLifePlace } from "../life-places";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { municipalSeats } from "../municipal-public-work";
import { createFormationContext, recordPrinciples } from "../politics";
import type { World } from "../types";
import { advanceWorld } from "../world";
import {
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
} from "./member-agenda";

/**
 * Money a city council enacts reaches the city's executive on the ordinary
 * clock, as money a state legislature enacts reaches its governor.
 *
 * Before this, a council's appropriation became spending authority that no
 * office was ever asked to commit: in a 200-day watched world three laws
 * authorized $375.6 million and nothing was committed or paid.
 */
const place = requireLifePlace("0162328");
const city = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;

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
  const principles: PrincipleRecordInput[] = seats.slice(1).flatMap((seat) =>
    supporting.map((principle) => ({
      stableKey: `local-money-fixture:${seat.personId}:${principle.stableKey}`,
      personId: seat.personId,
      principleId: principle.id,
      formedAt: world.currentDate,
      stance: "endorses",
      strength: 1,
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

describe("money a council enacts", () => {
  it("is put before the city's executive and committed on the ordinary clock", () => {
    const world = openedWorld();
    const dueAt = addDays(world.currentDate, 1);
    const queued = scheduleFutureDueItem(world, {
      stableKey: `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(city.id)}:${dueAt}`,
      dueAt,
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      entityIds: [place.context.jurisdiction.id],
      jurisdictionId: place.context.jurisdiction.id,
      provenance: {
        kind: "authored",
        note: "Exercise the ordinary local agenda handler at one game-profile intake.",
      },
    });
    // The full clock registry the game advances with, so the test covers the
    // council handlers as they are actually registered.
    const after = advanceWorld(
      queued,
      60,
      createCampaignElectionTransitionRegistry(),
    );
    const measure = (after.history.legislativeMeasures ?? []).find((entry) =>
      entry.stableKey.startsWith(
        `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(city.id)}:`,
      ),
    );
    expect(measure).toBeDefined();
    if (!measure) return;
    expect(measurePosition(after, measure.id).outcome).toBe("enacted");
    const records = after.history.publicProgramRecords ?? [];
    const appropriation = records.find(
      (record) =>
        record.kind === "appropriation" &&
        record.sourceMeasureId === measure.id,
    );
    expect(appropriation).toBeDefined();
    if (!appropriation) return;
    expect(
      after.history.events.some(
        (event) =>
          event.type === "governing.matter-opened" &&
          event.stableKey.endsWith(
            `:program:appropriation:${appropriation.id}`,
          ),
      ),
    ).toBe(true);
    expect(
      records.some(
        (record) =>
          record.kind === "commitment" &&
          record.appropriationId === appropriation.id,
      ),
    ).toBe(true);
  });
});
