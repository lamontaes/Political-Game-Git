import { beforeAll, expect, it } from "vitest";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { addDays, daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "./legislation";
import {
  createLegislativeScenario,
  legislativeBlueprint,
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type AuthoredVoteCounts,
} from "./legislation-scenarios";
import { congressSeats } from "./living-world/congress-seats";
import { recordFiledProvision } from "./legislative-politics";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_HOURLY_MINOR,
  federalMinimumHourlyMinorAt,
  federalMinimumSchedule,
} from "./minimum-wage";
import { createProductionPolicyCatalog } from "./production-catalog";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createWorld, advanceWorld } from "./world";
import type { EntityId, IsoDate, World } from "./types";

const pack = legislativeBlueprint("institution:us-congress-v1").pack;
const seatCount = (key: string) =>
  congressSeats().filter((seat) => seat.chamberKey === `us-${key}`).length;
const bodies = pack.chambers.map((chamber) =>
  seatBodyForPack(
    chamber.chamberKey,
    chamber.name,
    seatCount(chamber.chamberKey),
    [],
    false,
  ),
);
const votePlan: Record<string, AuthoredVoteCounts> = {};
for (const chamber of pack.chambers) {
  for (const committee of chamber.committees)
    votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
      yea: committee.appointedMembers,
    };
  for (const stage of chamber.floorStages)
    votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
      yea: seatCount(chamber.chamberKey),
    };
}
// These votes and dollar amounts are explicit fictional fixture inputs.
// No naturally filed bill, officeholder decision or paycheck is claimed.
let base: World;
let questionId: EntityId;

beforeAll(() => {
  const identities = createLegislativeScenario("nebraska").world;
  const jurisdictions = new Map(
    identities.jurisdictionOrder.map((id) => [
      id,
      identities.jurisdictions[id]!,
    ]),
  );
  jurisdictions.set(
    NATIONAL_ELECTION_JURISDICTION.id,
    NATIONAL_ELECTION_JURISDICTION,
  );
  base = createWorld({
    seed: identities.seed,
    currentDate: identities.currentDate,
    currentMoment: identities.currentMoment,
    people: identities.personOrder.map((id) => identities.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
  questionId = base.policyCatalog.propositionOrder.find(
    (id) =>
      base.policyCatalog.propositions[id]!.stableKey ===
      FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  expect(questionId).toBeDefined();
});

function enactFloor(
  start: World,
  key: string,
  value?: number,
  effectiveDays = 0,
  answer: "yes" | "no" = "yes",
  unit: "minor/hour" | "minor" = "minor/hour",
) {
  let world = introduceMeasure(start, {
    stableKey: key,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: pack.packId,
    designation: "H.R. 990",
    shortTitle: "Controlled federal wage text",
    summary:
      "Fictional wage clause and explicitly authored procedure decisions.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: start.personOrder[0]!,
    originChamberKey: pack.chamberOrder[0]!,
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  if (value !== undefined)
    world = recordFiledProvision(world, {
      stableKey: `${key}:floor`,
      measureId,
      provisionKey: "hourly-floor",
      sectionNumber: 1,
      heading: "Fictional hourly floor",
      text: `The fictional floor is ${value} in the declared unit.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "covered work",
      },
      applicationScope: {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        segmentKey: null,
      },
      lawTerms: [
        {
          questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
          key: "floor",
          value,
          unit,
        },
      ],
    });
  const context = {
    pack,
    bodies,
    measureId,
    committeeMemberCount: pack.chambers[0]!.committees[0]!.appointedMembers,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "Explicit authored fixture executive signature.",
  };
  for (let guard = 0; guard < 50; guard += 1) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment") {
      const effectiveAt = addDays(world.currentDate, effectiveDays);
      world = recordEnactment(world, {
        stableKey: `${key}:enacted`,
        measureId,
        effectiveAt,
      });
      return { world, measureId, effectiveAt };
    }
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) throw new Error(`No canonical next step for ${measureId}`);
    world = applyLegislativeStep(context, world, step).world;
  }
  throw new Error("Controlled federal wage bill did not reach enactment.");
}

function later(world: World, date: IsoDate): World {
  return advanceWorld(
    world,
    daysBetween(world.currentDate, date),
    createFutureTransitionHandlerRegistry([]),
  );
}

it("A39 reads the actual adopted federal floor, without a $15 fallback", () => {
  const f = enactFloor(base, "federal-floor:exact", 1375);
  expect(federalMinimumHourlyMinorAt(f.world, f.effectiveAt)).toBe(1375);
  expect(federalMinimumSchedule(f.world)).toEqual([
    expect.objectContaining({
      hourlyMinor: 1375,
      from: f.effectiveAt,
      measureId: f.measureId,
    }),
  ]);
  expect(
    federalMinimumSchedule(deserializeWorld(serializeWorld(f.world))),
  ).toEqual(federalMinimumSchedule(f.world));
});

it("A39 leaves the sourced federal floor when a yes bill carries no amount", () => {
  const f = enactFloor(base, "federal-floor:missing");
  expect(federalMinimumSchedule(f.world)).toEqual([]);
  expect(federalMinimumHourlyMinorAt(f.world, f.effectiveAt)).toBe(
    FEDERAL_MINIMUM_HOURLY_MINOR,
  );
});

it("A39 does not replace the last valid federal amount with an amountless yes", () => {
  const first = enactFloor(base, "federal-floor:prior", 1425);
  const next = enactFloor(
    later(first.world, addDays(first.world.currentDate, 1)),
    "federal-floor:amountless",
  );
  expect(federalMinimumHourlyMinorAt(next.world, next.world.currentDate)).toBe(
    1425,
  );
});

it("A39 refuses the wrong federal unit", () => {
  const f = enactFloor(base, "federal-floor:unit", 1375, 0, "yes", "minor");
  expect(federalMinimumSchedule(f.world)).toEqual([]);
});

it("A39 revisits the federal schedule at its actual future effective date", () => {
  const f = enactFloor(base, "federal-floor:future", 1625, 30);
  expect(federalMinimumSchedule(f.world)).toEqual([]);
  const before = later(f.world, addDays(f.effectiveAt, -1));
  expect(federalMinimumSchedule(before)).toEqual([]);
  const arrived = later(before, f.effectiveAt);
  expect(federalMinimumHourlyMinorAt(arrived, f.effectiveAt)).toBe(1625);
  expect(federalMinimumHourlyMinorAt(arrived, addDays(f.effectiveAt, -1))).toBe(
    FEDERAL_MINIMUM_HOURLY_MINOR,
  );
});

it("A39 prospective repeal ends the raised legal floor", () => {
  const first = enactFloor(base, "federal-floor:repeal-baseline", 1375);
  const repeal = enactFloor(
    later(first.world, addDays(first.world.currentDate, 1)),
    "federal-floor:repealed",
    undefined,
    0,
    "no",
  );
  expect(federalMinimumHourlyMinorAt(repeal.world, first.effectiveAt)).toBe(
    1375,
  );
  expect(federalMinimumHourlyMinorAt(repeal.world, repeal.effectiveAt)).toBe(
    FEDERAL_MINIMUM_HOURLY_MINOR,
  );
  // This reader does not cut anybody's saved contract or claim a payment.
});
