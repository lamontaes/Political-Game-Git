import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { governmentUnitsForState } from "../government-units";
import { lifePlaceByKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  organizationIdFor,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { councilRules } from "../living-world/local-council-binding";
import { legislativePackForWorkKey } from "../legislative-institutions";
import { chamberByKey } from "../legislature-rules";
import { nextMeasureNumbering } from "../measure-numbering";
import { introduceMeasure, measurePosition } from "../legislation";
import { personName } from "../people";
import { completeCouncilPassage } from "../municipal-ordinance-procedure";
import { serializeWorld, deserializeWorld } from "../serialization";
import { ensureCouncilPrinciples } from "./council-lawmaking";
import { applyInstitutionStep } from "./legislative-clock";

const seed = "a77-town-profile-roll-call-20261001";
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap(governmentUnitsForState)
  .flatMap((unit) => {
    const rules = councilRules(unit);
    const place = unit.placeGeoid ? lifePlaceByKey(unit.placeGeoid) : null;
    const pack = rules
      ? legislativePackForWorkKey(`institution:${rules.packId}`)
      : null;
    return unit.unitType === "municipality" &&
      unit.functionalActive &&
      rules?.governmentKey === null &&
      place &&
      pack
      ? [{ unit, place, pack }]
      : [];
  })
  .map((entry) => ({
    ...entry,
    rank: createHash("sha256").update(`${seed}:${entry.unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

describe("the admitted town profile uses the saved council", () => {
  it("samples five actual profile governments from all 56 jurisdictions", () => {
    expect(cases).toHaveLength(5);
  });
  it.each(cases)(
    "keeps the actual roll call and law after Continue in $place.key",
    ({ unit, place, pack }) => {
      const opening = smallWorld({ place: place.key, seed });
      let world = ensureLocalGovernmentSeatsForUnit(
        ensureLocalGovernmentOrganization(opening.world, unit),
        unit,
        opening.jurisdictionId,
        [opening.personId],
      );
      const organizationId = organizationIdFor(world, unit);
      const officers = sittingLocalOfficers(world, unit);
      const members = officers.filter((seat) => !seat.mayor);
      expect(organizationId).not.toBeNull();
      expect(members.length).toBeGreaterThan(0);
      world = ensureCouncilPrinciples(world, officers);
      const chamber = chamberByKey(pack, "council");
      expect(chamber.floorStages).toHaveLength(1);
      expect(chamber.floorStages[0]!.readingIntervalDays).toMatchObject({
        kind: "known",
        value: 0,
        source: chamber.floorStages[0]!.source,
      });
      const numbering = nextMeasureNumbering(world, {
        jurisdictionId: opening.jurisdictionId,
        originChamber: chamberByKey(pack, "council"),
        rulePackId: pack.packId,
      });
      world = introduceMeasure(world, {
        stableKey: "a77-town-profile-controlled-proposal",
        rulePackId: pack.packId,
        jurisdictionId: opening.jurisdictionId,
        designation: numbering.designation,
        numberingSession: numbering.numberingSession,
        shortTitle: "Council meeting room policy",
        summary: "An authored nonfiscal proposal for the recorded council.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "council",
        sponsorPersonId: members[0]!.personId,
      });
      const bill = world.history.legislativeMeasures!.at(-1)!;
      const context = {
        localCouncil: {
          governmentUnitId: unit.id,
          townJurisdictionId: opening.jurisdictionId,
          playerPersonId: null,
        },
      };
      if (measurePosition(world, bill.id).phase === "awaiting-referral") {
        const placed = applyInstitutionStep(world, bill.id, (w) => w, context);
        expect(placed).toMatchObject({
          kind: "applied",
          step: "request-calendar-placement",
        });
        if (placed.kind !== "applied") return;
        world = placed.world;
      }
      const result = applyInstitutionStep(world, bill.id, (w) => w, context);
      expect(result).toMatchObject({
        kind: "applied",
        step: "move-floor-vote",
      });
      if (result.kind !== "applied") return;
      const vote = result.world.history
        .legislativeVotes!.filter((row) => row.measureId === bill.id)
        .at(-1)!;
      expect(vote).toBeDefined();
      expect(vote.dispositions.map((row) => row.personId).sort()).toEqual(
        members.map((row) => row.personId).sort(),
      );
      expect(vote.dispositions.every((row) => Boolean(row.reason))).toBe(true);
      world = completeCouncilPassage(result.world, bill, null);
      const enactments = (world.history.legislativeEnactments ?? []).filter(
        (row) => row.measureId === bill.id,
      );
      expect(vote.outcome).toBe("passed");
      expect(enactments).toHaveLength(1);
      expect(enactments[0]!.outcome).toBe("enacted");
      console.info(
        "[a77-town-profile-proof]",
        JSON.stringify({
          seed,
          place: place.key,
          unit: unit.id,
          organizationId,
          measureId: bill.id,
          pack: pack.packId,
          vote: {
            outcome: vote.outcome,
            tally: vote.tally,
            members: vote.dispositions.map((row) => ({
              personId: row.personId,
              name: row.personId
                ? personName(world.people[row.personId]!)
                : null,
              disposition: row.disposition,
              reason: row.reason,
            })),
          },
          enactments,
        }),
      );
      const resumed = deserializeWorld(serializeWorld(world));
      expect(resumed).toEqual(world);
      expect(sittingLocalOfficers(resumed, unit)).toEqual(officers);
      expect(organizationIdFor(resumed, unit)).toBe(organizationId);
      const repeated = applyInstitutionStep(
        resumed,
        bill.id,
        (w) => w,
        context,
      );
      const after = repeated.kind === "applied" ? repeated.world : resumed;
      expect(after.history.legislativeVotes).toEqual(
        resumed.history.legislativeVotes,
      );
      expect(after.history.legislativeEnactments).toEqual(
        resumed.history.legislativeEnactments,
      );
    },
  );
});
