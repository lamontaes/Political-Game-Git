import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { governmentUnitsForState } from "../government-units";
import { lifePlaceByKey, requireLifePlace } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "../living-world/local-government-seats";
import { councilRules } from "../living-world/local-council-binding";
import { legislativePackForWorkKey } from "../legislative-institutions";
import {
  introduceMeasure,
  measurePosition,
  enrollMeasure,
  recordEnactment,
  placeMeasureOnCalendar,
  takeFloorVote,
} from "../legislation";
import { advanceWorld } from "../world";
import { applyEnactedLawEffects } from "../enacted-law-effects";
import { createFormationContext, recordPrinciples } from "../politics";
import { serializeWorld, deserializeWorld } from "../serialization";
import type {
  LegislativeMeasureRecord,
  PolicyPropositionDefinition,
  World,
} from "../types";
import { fileMemberAgendaBills } from "./member-agenda";
import { applyInstitutionStep } from "./legislative-clock";
import { lawInForce } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import { ensureCouncilPrinciples } from "./council-lawmaking";
import {
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
} from "../municipal-government";
import {
  installMunicipalGovernment,
  municipalGovernmentJurisdictionId,
  municipalMeasures,
} from "../municipal-public-work";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "../nationwide-world/district-of-columbia-council-opening";
import { ensureJurisdiction } from "../national-election-geography";

const seed = "team1-dc-council-history-lookups-all56-20261002";
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
) {
  return recordPrinciples(
    world,
    members.flatMap((member) =>
      question.principles!.map((bearing) => ({
        stableKey: `${seed}:views:${world.history.nextSequence}:${member.personId}:${bearing.principleId}`,
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
          note: "Explicit fictional member views for an indexed-history regression.",
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

it("samples five actual councils from the complete 56-place population", () => {
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  expect(cases).toHaveLength(5);
  expect(new Set(cases.map((entry) => entry.unit.id)).size).toBe(5);
});

describe.each(cases)(
  "indexed council closure in $place.key",
  ({ unit, place, pack }) => {
    it("preserves the supplied snapshot, pending operative date and old-world reads through Continue", () => {
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
      if (!question)
        throw new Error("No existing council question for the regression.");
      const file = (
        at: World,
        stage: string,
        snapshot: readonly LegislativeMeasureRecord[] = at.history
          .legislativeMeasures ?? [],
      ) =>
        fileMemberAgendaBills(at, {
          jurisdictionId: opening.jurisdictionId,
          intakeKey: `${seed}:${unit.id}:${stage}`,
          chamberKey: "council",
          council: {
            pack,
            members,
            questions: [question.id],
            measures: snapshot,
            playerPersonId: null,
            measureKey: (numbering) =>
              `${seed}:${unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
          },
        });
      world = file(views(world, members, question, true), "initial");
      const measure = world.history.legislativeMeasures!.at(-1)!;
      expect(measure.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "yes" },
      ]);
      const defeated = takeFloorVote(
        placeMeasureOnCalendar(world, {
          stableKey: `${measure.stableKey}:defeat-calendar`,
          measureId: measure.id,
          rationale: "Explicit alternate rejection fixture.",
        }),
        {
          stableKey: `${measure.stableKey}:defeat-vote`,
          measureId: measure.id,
          electedMembers: members.length,
          dispositions: members.map((member) => ({
            memberKey: member.personId,
            personId: member.personId,
            disposition: "nay" as const,
          })),
          provenance: {
            method: "authored-fixture",
            note: "An explicit saved rejection exercises the unchanged cooldown.",
            sourceEntityIds: members.map((member) => member.personId),
          },
        },
      );
      expect(measurePosition(defeated, measure.id).phase).toBe("failed");
      expect(file(defeated, "rejected-cooldown")).toEqual(defeated);
      const continuedDefeat = deserializeWorld(serializeWorld(defeated));
      expect(file(continuedDefeat, "continued-cooldown")).toEqual(
        continuedDefeat,
      );
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
          (at) => at,
          context,
        );
        if (result.kind !== "applied")
          throw new Error("Actual council measure did not advance.");
        world = result.world;
      }
      expect(measurePosition(world, measure.id).phase).toBe(
        "awaiting-enrollment",
      );
      world = enrollMeasure(world, {
        stableKey: `${measure.stableKey}:enrolled`,
        measureId: measure.id,
      });
      world = recordEnactment(world, {
        stableKey: `${measure.stableKey}:enacted`,
        measureId: measure.id,
        effectiveDateGameProfile: { version: pack.packId, days: 11 },
      });
      world = applyEnactedLawEffects(world, measure.id);
      const otherQuestion = world.policyCatalog.propositionOrder.find(
        (id) =>
          id !== question.id &&
          mayAnswerQuestion(world, opening.jurisdictionId, id),
      )!;
      world = introduceMeasure(world, {
        stableKey: `${seed}:${unit.id}:unrelated`,
        jurisdictionId: opening.jurisdictionId,
        rulePackId: pack.packId,
        designation: "Unrelated fixture ordinance",
        shortTitle: "Unrelated existing question",
        summary:
          "An actual unrelated pending measure must not close the watched question.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: pack.chamberOrder[0]!,
        propositionIds: [otherQuestion],
      });
      world = views(world, members, question, false);
      const before = serializeWorld(world);
      expect(file(world, "pending")).toEqual(world);
      // The public caller's explicit snapshot remains authoritative. It does not
      // silently grow to every measure stored in the world.
      const excluded = file(
        views(world, members, question, true),
        "excluded",
        world.history.legislativeMeasures!.filter(
          (row) => row.id !== measure.id,
        ),
      );
      expect(excluded.history.legislativeMeasures!.length).toBe(
        world.history.legislativeMeasures!.length + 1,
      );
      expect(serializeWorld(world)).toBe(before);
      const atDate = deserializeWorld(serializeWorld(advanceWorld(world, 11)));
      expect(
        lawInForce(atDate, opening.jurisdictionId, question.id)?.answer,
      ).toBe("yes");
      const proposed = file(atDate, "operative");
      expect(
        proposed.history.legislativeMeasures!.at(-1)!.propositionAnswers,
      ).toEqual([{ propositionId: question.id, answer: "no" }]);
      expect(proposed.history.legislativeMeasures!.length).toBe(
        world.history.legislativeMeasures!.length + 1,
      );
      const loaded = deserializeWorld(serializeWorld(proposed));
      expect(file(loaded, "repeat")).toEqual(loaded);
      expect(
        loaded.history.legislativeMeasures!.slice(
          0,
          world.history.legislativeMeasures!.length,
        ),
      ).toEqual(world.history.legislativeMeasures);
      expect(serializeWorld(world)).toBe(before);
    });
  },
);

it("keeps interleaved municipalities in record order without changing prior snapshots", () => {
  const opening = smallWorld({ place: "US-DC", seed });
  let world = ensureDistrictOfColumbiaCouncilOpening(opening.world);
  const secondPlace = requireLifePlace("5114968");
  const second = municipalGovernmentForLifePlace(secondPlace)!;
  world = installMunicipalGovernment(
    ensureJurisdiction(world, secondPlace.context.jurisdiction),
    {
      governmentKey: second.key,
      jurisdictionId: secondPlace.context.jurisdiction.id,
      formedAt: world.currentDate,
    },
  );
  const first = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const append = (at: World, government: typeof first, label: string) => {
    const rules = municipalRulePackFor(government);
    if (!rules.ok)
      throw new Error("The actual municipality needs its existing pack.");
    return introduceMeasure(at, {
      stableKey: `${seed}:${label}`,
      jurisdictionId: municipalGovernmentJurisdictionId(at, government.key)!,
      rulePackId: rules.pack.packId,
      designation: label,
      shortTitle: label,
      summary: "Canonical interleaved history fixture.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: rules.pack.chamberOrder[0]!,
    });
  };
  world = append(world, first, "first-one");
  world = append(world, second, "second-one");
  const old = world;
  const oldBytes = serializeWorld(old);
  const oldFirst = municipalMeasures(old, first.key);
  const oldSecond = municipalMeasures(old, second.key);
  world = append(world, first, "first-two");
  world = append(world, second, "second-two");
  expect(
    municipalMeasures(world, first.key).map((row) => row.designation),
  ).toEqual(["first-one", "first-two"]);
  expect(
    municipalMeasures(world, second.key).map((row) => row.designation),
  ).toEqual(["second-one", "second-two"]);
  expect(municipalMeasures(old, first.key)).toEqual(oldFirst);
  expect(municipalMeasures(old, second.key)).toEqual(oldSecond);
  expect(serializeWorld(old)).toBe(oldBytes);
  const loaded = deserializeWorld(serializeWorld(world));
  expect(municipalMeasures(loaded, first.key)).toEqual(
    municipalMeasures(world, first.key),
  );
  expect(municipalMeasures(loaded, second.key)).toEqual(
    municipalMeasures(world, second.key),
  );
  expect(municipalMeasures(world, "unregistered-government")).toEqual([]);
});
