import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { addDays } from "../simulation/dates";
import { createScenarioWorld } from "../simulation/demo";
import { governmentUnitsForState } from "../simulation/government-units";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../simulation/municipal-government";
import { ensureMunicipalCouncilOpening } from "../simulation/municipal-council-opening";
import { createProductionPolicyCatalog } from "../simulation/production-catalog";
import { introduceMeasure } from "../simulation/legislation";
import { chamberByKey } from "../simulation/legislature-rules";
import { nextMeasureNumbering } from "../simulation/measure-numbering";
import { createWorld } from "../simulation/world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { lifePlaceByKey } from "../simulation/life-places";
import { scheduleFutureDueItem } from "../simulation/future-transitions";
import { LOCAL_COUNCIL_MEETING } from "../simulation/living-world/local-council-meetings";
import type { EntityId, World } from "../simulation";
import { projectCouncilMeetingAgendaNotice } from "./council-meeting-agenda";

const seed = "b05-p2-agenda-notice-20261007";
const choice = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((state) =>
  governmentUnitsForState(state),
)
  .filter((unit) => unit.unitType === "municipality" && unit.placeGeoid)
  .map((unit) => ({
    unit,
    rank: createHash("sha256").update(`${seed}:${unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .flatMap(({ unit }) => {
    const place = lifePlaceByKey(unit.placeGeoid!);
    const government = municipalGovernmentByKey(unit.id);
    const pack = government && municipalRulePackFor(government);
    return place && pack?.ok ? [{ unit, place, pack: pack.pack }] : [];
  })[0]!;

function agendaFixture(): {
  readonly world: World;
  readonly playerId: EntityId;
  readonly officeRelationshipId: EntityId;
  readonly dueItemId: EntityId;
  readonly sponsoredMeasureId: EntityId;
  readonly quietMeasureId: EntityId;
} {
  const base = createScenarioWorld(seed, choice.place.context, {
    peopleCount: 8,
  });
  let world = ensureMunicipalCouncilOpening(
    createWorld({
      seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    }),
    choice.unit.id,
  );
  const playerId = world.personOrder[0]!;
  const jurisdictionId = choice.place.context.jurisdiction.id;
  const sponsors = [playerId, world.personOrder[1]!];
  const measureIds: EntityId[] = [];
  for (const [index, sponsorPersonId] of sponsors.entries()) {
    const numbering = nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamberByKey(choice.pack, "council"),
      rulePackId: choice.pack.packId,
    });
    world = introduceMeasure(world, {
      stableKey: `${seed}:measure:${index}`,
      jurisdictionId,
      rulePackId: choice.pack.packId,
      ...numbering,
      shortTitle: `Recorded measure ${index}`,
      summary: `Recorded measure fixture ${index}.`,
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId,
    });
    measureIds.push(world.history.legislativeMeasures!.at(-1)!.id);
  }
  world = scheduleFutureDueItem(world, {
    stableKey: `${seed}:meeting`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: LOCAL_COUNCIL_MEETING,
    entityIds: [jurisdictionId, playerId],
    jurisdictionId,
    provenance: { kind: "authored", note: "Focused agenda projection test." },
  });
  return {
    world,
    playerId,
    officeRelationshipId: "agenda-test-office" as EntityId,
    dueItemId: world.history.futureDueItems.at(-1)!.id,
    sponsoredMeasureId: measureIds[0]!,
    quietMeasureId: measureIds[1]!,
  };
}

describe("council meeting agenda notice projection", () => {
  it("marks record-grounded matters without adding text or writing state", () => {
    const fixture = agendaFixture();
    const before = fixture.world;
    const historyBefore = JSON.stringify(before.history);
    const notice = projectCouncilMeetingAgendaNotice(
      before,
      fixture.playerId,
      fixture.officeRelationshipId,
      fixture.dueItemId,
    );

    expect(notice).not.toBeNull();
    expect(notice?.selectedDepth).toBe("what-matters");
    expect(notice?.items).toEqual([
      expect.objectContaining({
        measureId: fixture.sponsoredMeasureId,
        reasons: ["player-sponsored"],
        plays: true,
      }),
      expect.objectContaining({
        measureId: fixture.quietMeasureId,
        reasons: [],
        plays: false,
      }),
    ]);
    expect(before.history.officeWorkflowPreferences ?? []).toEqual([]);
    expect(JSON.stringify(before.history)).toBe(historyBefore);
  });

  it("accepts a per-meeting everything override without saving it", () => {
    const fixture = agendaFixture();
    const notice = projectCouncilMeetingAgendaNotice(
      fixture.world,
      fixture.playerId,
      fixture.officeRelationshipId,
      fixture.dueItemId,
      "everything",
    );

    expect(notice?.selectedDepth).toBe("everything");
    expect(notice?.items.every((item) => item.plays)).toBe(true);
    expect(fixture.world.history.officeWorkflowPreferences ?? []).toEqual([]);
  });

  it("refuses a missing or non-council due item", () => {
    const fixture = agendaFixture();
    expect(
      projectCouncilMeetingAgendaNotice(
        fixture.world,
        fixture.playerId,
        fixture.officeRelationshipId,
        "missing" as EntityId,
      ),
    ).toBeNull();
  });
});
