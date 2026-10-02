import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { advanceWorld, createWorld } from "./world";
import { createProductionPolicyCatalog } from "./production-catalog";
import { requireLifePlace } from "./life-places";
import { dcCouncilSittingHandler } from "./dc-council-sittings";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordExecutiveAction,
} from "./legislation";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "./municipal-government";
import {
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
  municipalSeats,
} from "./municipal-public-work";
import { recordCouncilReadingVote } from "./municipal-ordinance-procedure";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "./nationwide-world/district-of-columbia-council-opening";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

function returnedAct() {
  // Explicit supplied bill, unanimous readings and executive return. The
  // replacement must obtain the reenactment ballots from the existing members.
  const place = requireLifePlace("1150000");
  const base = createScenarioWorld("a82-supplied-returned-act", place.context, {
    peopleCount: 16,
  });
  let world = ensureDistrictOfColumbiaCouncilOpening(
    createWorld({
      seed: base.seed,
      currentDate: base.currentDate,
      currentMoment: base.currentMoment,
      jurisdictions: base.jurisdictionOrder.map(
        (id) => base.jurisdictions[id]!,
      ),
      people: base.personOrder.map((id) => base.people[id]!),
      policyCatalog: createProductionPolicyCatalog(),
    }),
  );
  const seats = municipalSeats(world, DC_GOVERNMENT_KEY);
  const outsider = world.personOrder.find(
    (id) => !seats.some((seat) => seat.personId === id),
  )!;
  expect(outsider).toBeDefined();
  world = { ...world, control: { kind: "person", personId: outsider } };
  const rules = municipalRulePackFor(
    municipalGovernmentByKey(DC_GOVERNMENT_KEY)!,
  );
  if (!rules.ok) throw new Error("Missing sourced municipal pack.");
  world = introduceMeasure(world, {
    stableKey: municipalMeasureKey(DC_GOVERNMENT_KEY, "B26-0901"),
    jurisdictionId: municipalGovernmentJurisdictionId(
      world,
      DC_GOVERNMENT_KEY,
    )!,
    rulePackId: rules.pack.packId,
    designation: "B26-0901",
    shortTitle: "Supplied returned act",
    summary: "Explicit returned-act fixture; no authored reenactment ballots.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: seats[0]!.personId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  world = placeMeasureOnCalendar(world, {
    stableKey: `${measure.stableKey}:agenda`,
    measureId: measure.id,
    rationale: "Supplied reading agenda.",
  });
  const read = (at: World) =>
    recordCouncilReadingVote(at, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions: seats.map((seat, index) => ({
        memberKey: `council:${index + 1}`,
        personId: seat.personId,
        disposition: "yea" as const,
      })),
      provenance: {
        method: "authored-fixture",
        note: "Supplied passage only, not an NPC choice.",
        sourceEntityIds: [measure.id],
      },
    });
  const first = read(world);
  if (!first.ok) throw new Error(first.reason);
  world = advanceWorld(first.world, 14);
  const final = read(world);
  if (!final.ok) throw new Error(final.reason);
  expect(measurePosition(final.world, measure.id).phase).toBe(
    "awaiting-executive",
  );
  world = recordExecutiveAction(final.world, {
    stableKey: `${measure.stableKey}:return`,
    measureId: measure.id,
    action: "vetoed",
    rationale: "Explicit supplied executive return.",
  });
  return { world, measure, outsider, seats };
}

describe("A82 NPC council veto reenactment through the sitting", () => {
  it("takes the returned act's vote without a controlled council member and retains the outcome on replay", () => {
    const { world, measure, outsider, seats } = returnedAct();
    expect(measurePosition(world, measure.id).phase).toBe("awaiting-override");
    const next = dcCouncilSittingHandler(world).world;
    const vote = next.history
      .legislativeVotes!.filter((row) => row.measureId === measure.id)
      .at(-1)!;
    expect(vote.provenance.method).toBe("member-decisions");
    expect(vote.dispositions.map((row) => row.personId)).toEqual(
      seats.map((seat) => seat.personId),
    );
    expect(vote.dispositions.some((row) => row.personId === outsider)).toBe(
      false,
    );
    expect(vote.tally.yea * 3).toBeGreaterThanOrEqual(
      (vote.tally.yea + vote.tally.nay) * 2,
    );
    expect(measurePosition(next, measure.id).phase).toBe("enacted");
    const loaded = deserializeWorld(serializeWorld(next));
    const repeated = dcCouncilSittingHandler(loaded).world;
    expect(
      repeated.history.legislativeVotes!.filter(
        (row) => row.measureId === measure.id,
      ),
    ).toEqual(
      next.history.legislativeVotes!.filter(
        (row) => row.measureId === measure.id,
      ),
    );
    expect(measurePosition(repeated, measure.id)).toEqual(
      measurePosition(next, measure.id),
    );
  });
});
