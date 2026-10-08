import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addDays } from "../simulation/dates";
import { createScenarioWorld } from "../simulation/demo";
import { scheduleFutureDueItem } from "../simulation/future-transitions";
import { governmentUnitsForState } from "../simulation/government-units";
import { lifePlaceByKey } from "../simulation/life-places";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../simulation/municipal-government";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../simulation/nationwide-world/state-executive-candidacy-packs";
import { nextMeasureNumbering } from "../simulation/measure-numbering";
import { introduceMeasure } from "../simulation/legislation";
import { chamberByKey } from "../simulation/legislature-rules";
import { ensureMunicipalCouncilOpening } from "../simulation/municipal-council-opening";
import { createProductionPolicyCatalog } from "../simulation/production-catalog";
import { recordOfficeWorkflowPreference } from "../simulation/office-workflow";
import { LOCAL_COUNCIL_MEETING } from "../simulation/living-world/local-council-meetings";
import { sittingLocalOfficers } from "../simulation/living-world/local-government-seats";
import { createWorld } from "../simulation/world";
import type { EntityId } from "../simulation/types";
import { projectUpcomingCouncilMeetingAgenda } from "./council-meeting-agenda";

const seed = "b05-p2-meeting-agenda-depth";
const choice = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((state) =>
  governmentUnitsForState(state),
)
  .filter((unit) => unit.unitType === "municipality" && unit.placeGeoid)
  .map((unit) => ({
    unit,
    rank: createHash("sha256").update(`${seed}:${unit.id}`).digest("hex"),
  }))
  .sort((left, right) => left.rank.localeCompare(right.rank))
  .flatMap(({ unit }) => {
    const place = lifePlaceByKey(unit.placeGeoid!);
    const government = municipalGovernmentByKey(unit.id);
    const pack = government && municipalRulePackFor(government);
    return place && pack?.ok ? [{ unit, place, pack: pack.pack }] : [];
  })[0]!;

describe("upcoming council meeting agenda projection", () => {
  it("marks record-relevant items by default and every item at the saved depth", () => {
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
    const member = sittingLocalOfficers(world, choice.unit).find(
      (seat) => !seat.mayor,
    )!;
    const playerId = member.personId;
    world = { ...world, control: { kind: "person", personId: playerId } };
    const jurisdictionId = choice.place.context.jurisdiction.id;
    const introduced = (stableKey: string, sponsorPersonId: EntityId) => {
      const numbering = nextMeasureNumbering(world, {
        jurisdictionId,
        originChamber: chamberByKey(choice.pack, "council"),
        rulePackId: choice.pack.packId,
      });
      world = introduceMeasure(world, {
        stableKey,
        jurisdictionId,
        rulePackId: choice.pack.packId,
        ...numbering,
        shortTitle: stableKey,
        summary: "A recorded council agenda measure.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "council",
        sponsorPersonId,
      });
      return world.history.legislativeMeasures!.at(-1)!;
    };
    const relevant = introduced(`${seed}:relevant`, playerId);
    const quiet = introduced(
      `${seed}:quiet`,
      member.personId === world.personOrder[0]
        ? world.personOrder[1]!
        : world.personOrder[0]!,
    );
    world = scheduleFutureDueItem(world, {
      stableKey: `${seed}:meeting`,
      dueAt: addDays(world.currentDate, 1),
      transitionKey: LOCAL_COUNCIL_MEETING,
      entityIds: [jurisdictionId, playerId],
      jurisdictionId,
      provenance: {
        kind: "authored",
        note: "Controlled agenda projection fixture.",
      },
    });

    const preview = projectUpcomingCouncilMeetingAgenda(world, playerId)!;
    expect(preview.depth).toBe("what-matters");
    expect(
      preview.items.find((item) => item.measure.id === relevant.id)?.marked,
    ).toBe(true);
    expect(
      preview.items.find((item) => item.measure.id === quiet.id)?.marked,
    ).toBe(false);

    const preference = recordOfficeWorkflowPreference(world, {
      personId: playerId,
      officeRelationshipId: member.participationId,
      votingMode: "review-batch",
      caseworkMode: "player-handles-all",
      meetingDepth: "everything",
    });
    expect(preference.kind).toBe("recorded");
    if (preference.kind !== "recorded") throw new Error(preference.reason);
    const everything = projectUpcomingCouncilMeetingAgenda(
      preference.world,
      playerId,
    )!;
    expect(everything.depth).toBe("everything");
    expect(everything.items.every((item) => item.marked)).toBe(true);
  });
});
