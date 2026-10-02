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
import {
  measurePosition,
  enrollMeasure,
  recordEnactment,
} from "../legislation";
import { addDays } from "../dates";
import { operativeDateForEnactment } from "../legislative-effective-date";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import { createFormationContext, recordPrinciples } from "../politics";
import { personName } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import type { PolicyPropositionDefinition, World } from "../types";
import { fileMemberAgendaBills } from "./member-agenda";
import { applyInstitutionStep } from "./legislative-clock";
import { lawInForce } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import { ensureCouncilPrinciples } from "./council-lawmaking";

const seed = "a83-council-saved-profile-pending-all56-20261001";
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
        stableKey: `a83:fixture-view:${world.history.nextSequence}:${support}:${member.personId}:${bearing.principleId}`,
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

const controls = cases.flatMap((entry) =>
  [0, 11].map((days) => ({ ...entry, days })),
);

describe("council filing follows the saved effective-date game profile", () => {
  it("selects five actual councils from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
  });

  it.each(controls)(
    "keeps the saved $days-day profile after a missing date cache and Continue in $place.key",
    ({ unit, place, pack, days }) => {
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
      if (!question) throw new Error("No answerable council question");
      const file = (at: World, stage: string) =>
        fileMemberAgendaBills(at, {
          jurisdictionId: opening.jurisdictionId,
          intakeKey: `a83-profile:${stage}`,
          chamberKey: "council",
          council: {
            pack,
            members,
            questions: [question.id],
            measures: at.history.legislativeMeasures ?? [],
            playerPersonId: null,
            measureKey: (numbering) =>
              `a83-profile:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
          },
        });
      world = file(views(world, members, question, true), "support");
      expect(world.history.legislativeMeasures).toHaveLength(1);
      const measure = world.history.legislativeMeasures![0]!;
      expect(measure.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "yes" },
      ]);
      const context = {
        localCouncil: {
          governmentUnitId: unit.id,
          townJurisdictionId: opening.jurisdictionId,
          playerPersonId: null,
        },
      };
      for (
        let step = 0;
        step < 3 &&
        measurePosition(world, measure.id).phase !== "awaiting-enrollment";
        step++
      ) {
        const result = applyInstitutionStep(
          world,
          measure.id,
          (w) => w,
          context,
        );
        expect(result.kind).toBe("applied");
        if (result.kind !== "applied")
          throw new Error("Council bill did not move");
        world = result.world;
      }
      expect(measurePosition(world, measure.id).phase).toBe(
        "awaiting-enrollment",
      );
      const vote = world.history.legislativeVotes!.find(
        (row) => row.measureId === measure.id,
      )!;
      expect(vote.outcome).toBe("passed");
      expect(vote.dispositions.map((row) => row.personId).sort()).toEqual(
        members.map((row) => row.personId).sort(),
      );
      expect(vote.dispositions.every((row) => Boolean(row.reason))).toBe(true);
      world = enrollMeasure(world, {
        stableKey: `${measure.stableKey}:enrollment`,
        measureId: measure.id,
      });
      world = recordEnactment(world, {
        stableKey: `${measure.stableKey}:enactment`,
        measureId: measure.id,
        effectiveDateGameProfile: { version: pack.packId, days },
      });
      world = applyEnactedLawEffects(world, measure.id);
      const enactment = world.history.legislativeEnactments!.find(
        (row) => row.measureId === measure.id,
      )!;
      const operativeAt = addDays(enactment.resolvedAt, days);
      expect(enactment.effectiveAt).toBe(operativeAt);
      expect(enactment.effectiveDateBasis).toBe("game-default");
      // Integrity refuses a missing cache paired with a saved profile. This
      // negative control must not be presented as an admissible older save.
      const invalidCache = {
        ...world,
        history: {
          ...world.history,
          legislativeEnactments: world.history.legislativeEnactments!.map(
            (row) =>
              row.id === enactment.id ? { ...row, effectiveAt: null } : row,
          ),
        },
      };
      expect(() => serializeWorld(invalidCache)).toThrow(
        /Enactment game effective date does not match its profile/,
      );
      world = deserializeWorld(serializeWorld(world));
      expect(
        operativeDateForEnactment(world.history.legislativeEnactments![0]!),
      ).toEqual({ date: operativeAt, basis: "game-default" });
      world = views(world, members, question, false);
      // These are controlled consumer-date inputs, not a world-clock advance.
      const atDate = (at: World, date: World["currentDate"]): World => ({
        ...at,
        currentDate: date,
        currentMoment: { ...at.currentMoment, date },
      });
      if (days > 0) {
        const before = atDate(world, addDays(operativeAt, -1));
        expect(
          lawInForce(before, opening.jurisdictionId, question.id),
        ).toBeNull();
        expect(file(before, "before-effective")).toEqual(before);
      }
      const onDate = deserializeWorld(
        serializeWorld(atDate(world, operativeAt)),
      );
      expect(
        lawInForce(onDate, opening.jurisdictionId, question.id)?.answer,
      ).toBe("yes");
      const proposed = file(onDate, "on-effective");
      expect(proposed.history.legislativeMeasures).toHaveLength(2);
      const repeal = proposed.history.legislativeMeasures!.at(-1)!;
      expect(repeal.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "no" },
      ]);
      const resumed = deserializeWorld(serializeWorld(proposed));
      expect(resumed).toEqual(proposed);
      expect(file(resumed, "repeat").history.legislativeMeasures).toEqual(
        resumed.history.legislativeMeasures,
      );
      expect(resumed.history.legislativeEnactments).toEqual(
        onDate.history.legislativeEnactments,
      );
      expect(resumed.history.legislativeVotes).toEqual(
        onDate.history.legislativeVotes,
      );
      expect(
        sittingLocalOfficers(resumed, unit).filter((seat) => !seat.mayor),
      ).toEqual(members);
      console.info(
        "[a83-council-profile-pending]",
        JSON.stringify({
          seed,
          place: place.key,
          unit: unit.id,
          measureId: measure.id,
          repealId: repeal.id,
          operativeAt,
          profile: enactment.effectiveDateGameProfile,
          members: vote.dispositions,
        }),
      );
    },
  );

  it.todo(
    "uses an admitted null-date policy for undated source-default enactments",
  );
  it.todo("migrates the general legacy/state-rule pending-law date branch");
});
