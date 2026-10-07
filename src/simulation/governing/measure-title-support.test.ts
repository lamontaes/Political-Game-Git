import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { governmentUnitsForState } from "../government-units";
import { lifePlaceByKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { councilRules } from "../living-world/local-council-binding";
import { legislativePackForWorkKey } from "../legislative-institutions";
import { measurePosition } from "../legislation";
import { completeCouncilPassage } from "../municipal-ordinance-procedure";
import { createFormationContext, recordPrinciples } from "../politics";
import { personName } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { PolicyPropositionDefinition, World } from "../types";
import { fileMemberAgendaBills } from "./member-agenda";
import { applyInstitutionStep } from "./legislative-clock";
import { lawInForce } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import { ensureCouncilPrinciples } from "./council-lawmaking";

const seed = "a76-title-support-all56-20261001";
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

function views(
  world: World,
  members: ReturnType<typeof sittingLocalOfficers>,
  question: PolicyPropositionDefinition,
  support: boolean,
): World {
  return recordPrinciples(
    world,
    members.flatMap((member) =>
      question.principles!.map((bearing) => ({
        stableKey: `a76:fixture-view:${world.history.nextSequence}:${support}:${member.personId}:${bearing.principleId}`,
        personId: member.personId,
        principleId: bearing.principleId,
        formedAt: world.currentDate,
        stance:
          (bearing.bearing === "consistent-with") === support
            ? ("endorses" as const)
            : ("rejects" as const),
        strength: 1,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("other:drawn-before-play", {
          note: "Explicit fictional saved member views exercise support and repeal; no opinion is forecast.",
        }),
        supersedesPrincipleRecordId:
          world.history.principles
            .filter(
              (row) =>
                row.personId === member.personId &&
                row.principleId === bearing.principleId,
            )
            .at(-1)?.id ?? null,
      })),
    ),
  );
}

describe("one title policy and the common support/repeal filer", () => {
  it("selects five actual council places from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
  });

  it.each(cases)(
    "files a titled proposal and its actual repeal after Continue in $place.key",
    ({ unit, place, pack }) => {
      const opening = smallWorld({ place: place.key, seed });
      let world = ensureLocalGovernmentSeatsForUnit(
        ensureLocalGovernmentOrganization(opening.world, unit),
        unit,
        opening.jurisdictionId,
        [opening.personId],
      );
      const members = sittingLocalOfficers(world, unit).filter(
        (seat) => !seat.mayor,
      );
      expect(members.length).toBeGreaterThan(0);
      world = ensureCouncilPrinciples(world, members);
      const question = world.policyCatalog.propositionOrder
        .map((id) => world.policyCatalog.propositions[id]!)
        .find(
          (row) =>
            mayAnswerQuestion(world, opening.jurisdictionId, row.id) &&
            lawInForce(world, opening.jurisdictionId, row.id) === null &&
            (row.principles ?? []).reduce(
              (sum, bearing) => sum + (bearing.weight ?? 1),
              0,
            ) >= 1,
        );
      expect(question).toBeDefined();
      if (!question) throw new Error("No answerable council question");
      const file = (at: World, stage: string) =>
        fileMemberAgendaBills(at, {
          jurisdictionId: opening.jurisdictionId,
          intakeKey: `a76:${stage}`,
          chamberKey: "council",
          council: {
            pack,
            members,
            questions: [question.id],
            measures: at.history.legislativeMeasures ?? [],
            playerPersonId: null,
            measureKey: (numbering) =>
              `a76:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
          },
        });
      const context = {
        localCouncil: {
          governmentUnitId: unit.id,
          townJurisdictionId: opening.jurisdictionId,
          playerPersonId: null,
        },
      };
      const enact = (at: World) => {
        const bill = at.history.legislativeMeasures!.at(-1)!;
        let next = at;
        for (
          let step = 0;
          step < 3 &&
          measurePosition(next, bill.id).phase !== "awaiting-enrollment";
          step++
        ) {
          const result = applyInstitutionStep(next, bill.id, (w) => w, context);
          expect(result.kind).toBe("applied");
          if (result.kind !== "applied")
            throw new Error("Council bill did not move");
          next = result.world;
        }
        expect(measurePosition(next, bill.id).phase).toBe(
          "awaiting-enrollment",
        );
        next = completeCouncilPassage(next, bill, null);
        expect(measurePosition(next, bill.id).phase).toBe("enacted");
        return next;
      };

      // Opposition to a question with no law files nothing to repeal.
      world = views(world, members, question, false);
      expect(file(world, "no-law-to-repeal")).toEqual(world);
      world = views(world, members, question, true);
      world = file(world, "support");
      expect(world.history.legislativeMeasures).toHaveLength(1);
      const first = world.history.legislativeMeasures![0]!;
      expect(first.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "yes" },
      ]);
      expect(first.shortTitle).toMatch(/ Ordinance$/);
      expect(first.shortTitle).not.toMatch(/^Repeal:/);
      expect(personName(world.people[first.sponsorPersonId!]!)).not.toBe("");
      world = enact(world);
      expect(
        lawInForce(world, opening.jurisdictionId, question.id)?.answer,
      ).toBe("yes");
      expect(file(world, "already-supported")).toEqual(world);
      world = deserializeWorld(serializeWorld(world));
      world = views(world, members, question, false);
      world = file(world, "repeal");
      expect(world.history.legislativeMeasures).toHaveLength(2);
      const repeal = world.history.legislativeMeasures!.at(-1)!;
      expect(repeal.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "no" },
      ]);
      expect(repeal.shortTitle).toBe(`Repeal: ${first.shortTitle}`);
      expect(repeal.sponsorPersonId).not.toBe(opening.personId);
      world = enact(world);
      expect(
        lawInForce(world, opening.jurisdictionId, question.id)?.answer,
      ).toBe("no");
      const resumed = deserializeWorld(serializeWorld(world));
      expect(resumed).toEqual(world);
      expect(file(resumed, "already-repealed")).toEqual(resumed);
      expect(resumed.control).toEqual(opening.world.control);
      console.info(
        "[a76-title-support-proof]",
        JSON.stringify({
          seed,
          place: place.key,
          unit: unit.id,
          question: question.stableKey,
          bills: resumed.history.legislativeMeasures!.map((row) => ({
            id: row.id,
            title: row.shortTitle,
            designation: row.designation,
            sponsor: personName(resumed.people[row.sponsorPersonId!]!),
            answers: row.propositionAnswers,
          })),
          votes: resumed.history.legislativeVotes,
          enactments: resumed.history.legislativeEnactments,
        }),
      );
    },
  );
});
