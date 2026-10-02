import { beforeAll, expect, it } from "vitest";
import startingLaw from "../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { enactThroughDesk } from "../../tests/fixtures/enact-through-desk";
import { createLegislativeScenario } from "./legislation-scenarios";
import { createProductionPolicyCatalog } from "./production-catalog";
import { createWorld } from "./world";
import { searchLifePlaces, stateJurisdictionForKey } from "./life-places";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { ensureStateExecutiveIncumbent } from "./nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "./governing/state-governing";
import { ensureStateLegislatureOpening } from "./nationwide-world/state-legislature-opening";
import { ensureWorldStartingConditions } from "./world-setup/conditions";
import { generatePoliticalStartingConditions } from "./world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./world-setup/types";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { seatedChamberForPack } from "./governing/chamber-votes";
import { fileMemberAgendaBills } from "./governing/member-agenda";
import { createFormationContext, recordPrinciples } from "./politics";
import { stateMedianAnnualWage } from "./living-world/town-pay";
import {
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
} from "./teacher-salary-floor";
import { schoolYearStartOnOrAfter } from "./teacher-salary-floor";
import { simulationMomentOnLocalDate } from "./dates";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, World } from "./types";

const scenario = createLegislativeScenario("kentucky");
const state = stateJurisdictionForKey("US-KY")!;
const referenceState = stateJurisdictionForKey("US-AR")!;
const catalog = createProductionPolicyCatalog();
const question = Object.values(catalog.propositions).find(
  (q) => q.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
)!;
const baselineTerm =
  startingLaw.questions[TEACHER_SALARY_FLOOR_QUESTION].answers["US-AR"]
    .lawTerms[0]!;
const referencePlace = searchLifePlaces("", 1, {
  stateJurisdictionKey: "US-KY",
  scope: "locality",
})[0]!;
const referenceWage = stateMedianAnnualWage(
  "profession:teacher",
  referencePlace.context.jurisdiction.id,
);
const referenceMinor =
  referenceWage === null ? null : Math.round(referenceWage * 100);
let baseline: World;

function enact(world: World, measureId: EntityId) {
  const office = governorOfficeForJurisdiction(world, "US-KY")!;
  return enactThroughDesk(
    { ...world, control: { kind: "person", personId: office.holderPersonId } },
    measureId,
    { context: scenario },
  );
}

function file(
  world: World,
  key: string,
  jurisdictionId: EntityId,
  amount: number,
) {
  let next = introduceMeasure(world, {
    stableKey: key,
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: `HB ${1 + (world.history.legislativeMeasures?.length ?? 0)}`,
    shortTitle: question.name,
    summary: "Controlled teacher salary term from existing sourced data.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: "house",
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = recordFiledProvision(next, {
    stableKey: `${key}:floor`,
    measureId,
    provisionKey: "teacher-salary-floor",
    sectionNumber: 1,
    heading: question.name,
    text: `The minimum annual salary is $${amount / 100}.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Public school teachers",
    },
    applicationScope: { jurisdictionId, segmentKey: null },
    lawTerms: [{ ...baselineTerm, value: amount }],
  });
  return { world: next, measureId };
}

beforeAll(() => {
  let world = createWorld({
    seed: scenario.world.seed,
    currentDate: scenario.world.currentDate,
    currentMoment: scenario.world.currentMoment,
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: [
      ...scenario.world.jurisdictionOrder.map(
        (id) => scenario.world.jurisdictions[id]!,
      ),
      state,
      referenceState,
    ].filter(
      (row, index, all) =>
        all.findIndex((other) => other.id === row.id) === index,
    ),
    policyCatalog: {
      ...catalog,
      propositionOrder: [question.id],
      propositions: { [question.id]: question },
    },
  });
  world = {
    ...world,
    control: { kind: "person", personId: scenario.playerPersonId },
  };
  world = ensureStateExecutiveIncumbent(world, scenario.playerPersonId, "KY");
  world = ensureWorldStartingConditions(world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  const recorded = file(
    world,
    "teacher-sponsor:baseline",
    state.id,
    baselineTerm.value,
  );
  world = enact(recorded.world, recorded.measureId);
  world = ensureStateLegislatureOpening(world, scenario.playerPersonId, "KY");
  const pack = legislativePackForJurisdiction(state.id)!;
  const members = pack.chambers.flatMap((chamber) =>
    seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!.body.members.flatMap((member) =>
      member.personId ? [member.personId] : [],
    ),
  );
  const sponsor = members.find((id) => id !== scenario.playerPersonId)!;
  world = recordPrinciples(
    world,
    members.flatMap((personId) =>
      catalog.principleOrder.map((principleId) => {
        const bearing = question.principles!.find(
          (row) => row.principleId === principleId,
        );
        return {
          stableKey: `teacher-sponsor:${personId}:${principleId}`,
          personId,
          principleId,
          formedAt: world.currentDate,
          stance:
            bearing?.bearing === "consistent-with"
              ? ("endorses" as const)
              : ("rejects" as const),
          strength: personId === sponsor && bearing ? 1 : 0,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("experience:life", {
            note: "Controlled recorded principles supporting this question.",
          }),
          supersedesPrincipleRecordId: null,
        };
      }),
    ),
  );
  baseline = world;
}, 60_000);

it("does not create a sponsor amount or a repeat yes bill without a recorded numeric reference", () => {
  const next = fileMemberAgendaBills(baseline, {
    jurisdictionId: state.id,
    intakeKey: "teacher-sponsor:missing-reference",
  });
  expect(next.history.legislativeMeasures).toEqual(
    baseline.history.legislativeMeasures,
  );
  expect(next.history.legislativeProvisions).toEqual(
    baseline.history.legislativeProvisions,
  );
});

it("files the sponsor's recorded reference floor and reads the amount actually adopted after the school-year boundary", () => {
  expect(referenceMinor).not.toBeNull();
  expect(referenceMinor!).toBeGreaterThan(baselineTerm.value);
  const reference = file(
    baseline,
    "teacher-sponsor:reference",
    referenceState.id,
    referenceMinor!,
  );
  const input = {
    jurisdictionId: state.id,
    intakeKey: "teacher-sponsor:positive",
  };
  const next = fileMemberAgendaBills(reference.world, input);
  const bill = next.history.legislativeMeasures!.find(
    (row) =>
      !reference.world.history.legislativeMeasures!.some(
        (prior) => prior.id === row.id,
      ),
  )!;
  expect(bill).toBeDefined();
  const provision = next.history.legislativeProvisions!.find(
    (row) => row.measureId === bill.id,
  )!;
  expect(provision.lawTerms).toEqual([
    { ...baselineTerm, value: referenceMinor },
  ]);
  const reason = next.history.events.find(
    (event) =>
      event.stableKey === `${provision.stableKey}:requested-term-reason`,
  )!;
  expect(reason.tags).toContain(`source-record:${reference.measureId}`);
  expect(reason.tags.some((tag) => tag.startsWith("principle-score:"))).toBe(
    true,
  );
  const reopened = deserializeWorld(serializeWorld(next));
  expect(
    fileMemberAgendaBills(reopened, input).history.legislativeProvisions,
  ).toEqual(reopened.history.legislativeProvisions);
  const enacted = enact(next, bill.id);
  const onDate = schoolYearStartOnOrAfter(enacted.currentDate);
  const operative = {
    ...enacted,
    currentDate: onDate,
    currentMoment: simulationMomentOnLocalDate(enacted.currentMoment, onDate),
  };
  expect(teacherSalaryFloorAt(operative, state.id, onDate, null)?.annual).toBe(
    referenceMinor! / 100,
  );
  expect(
    teacherSalaryFloorAt(operative, state.id, onDate, null)?.measureId,
  ).toBe(bill.id);
}, 60_000);
