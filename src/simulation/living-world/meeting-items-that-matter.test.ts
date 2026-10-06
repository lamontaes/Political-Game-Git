import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { lifePlaceByKey } from "../life-places";
import { governmentUnitsForState } from "../government-units";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../municipal-government";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { scheduleFutureDueItem } from "../future-transitions";
import { addDays } from "../dates";
import { introduceMeasure } from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { nextMeasureNumbering } from "../measure-numbering";
import {
  LOCAL_COUNCIL_MEETING,
  meetingItemsThatMatter,
} from "./local-council-meetings";

const seed = "b05-p1-random-place-20261006";
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

describe("council meeting items that matter", () => {
  it("records sponsor reasons and leaves an unrelated item quiet deterministically", () => {
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
    const player = world.personOrder[0]!;
    const jurisdictionId = choice.place.context.jurisdiction.id;
    const numbering = nextMeasureNumbering(world, {
      jurisdictionId,
      originChamber: chamberByKey(choice.pack, "council"),
      rulePackId: choice.pack.packId,
    });
    world = introduceMeasure(world, {
      stableKey: `${seed}:sponsored`,
      jurisdictionId,
      rulePackId: choice.pack.packId,
      ...numbering,
      shortTitle: "Recorded sponsor measure",
      summary: "A fixture measure for the selected body's ordinary agenda.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: player,
    });
    const sponsored = world.history.legislativeMeasures!.at(-1)!;
    world = scheduleFutureDueItem(world, {
      stableKey: `${seed}:meeting`,
      dueAt: addDays(world.currentDate, 1),
      transitionKey: LOCAL_COUNCIL_MEETING,
      entityIds: [jurisdictionId, player],
      jurisdictionId,
      provenance: { kind: "authored", note: "Focused agenda reader check." },
    });
    const due = world.history.futureDueItems.at(-1)!;

    const first = meetingItemsThatMatter(world, player, due.id);
    const second = meetingItemsThatMatter(world, player, due.id);
    expect(first).toEqual(second);
    expect(
      first.find((item) => item.measure.id === sponsored.id)?.reasons,
    ).toEqual(["player-sponsored"]);
    expect(meetingItemsThatMatter(world, player, "missing" as never)).toEqual(
      [],
    );
  });
});
