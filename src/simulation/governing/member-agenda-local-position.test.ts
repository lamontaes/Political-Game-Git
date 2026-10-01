import { beforeAll, describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { governmentUnitsForPlace } from "../government-units";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import { ensureMunicipalCouncilOpening } from "../municipal-council-opening";
import { municipalSeats } from "../municipal-public-work";
import { createFormationContext, recordPrinciples } from "../politics";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { automaticLawMappingFor } from "./automatic-legislation";
import { mayAnswerQuestion } from "./question-authority";
import {
  fileLocalMemberAgendaBill,
  fileMemberAgendaBills,
} from "./member-agenda";
import { principledLeaning } from "./officeholder-principles";
import type { EntityId, World } from "../types";

const place = requireLifePlace("0162328");
const government = governmentUnitsForPlace(place.sourceGeoid!).find(
  (unit) => unit.unitType === "municipality" && unit.functionalActive,
)!;
let world: World;
let observer: EntityId;
let stronger: EntityId;
let weaker: EntityId;
beforeAll(() => {
  const base = createScenarioWorld("g1-local-position-parity", place.context, {
    peopleCount: 8,
  });
  world = createWorld({
    seed: base.seed,
    currentDate: base.currentDate,
    currentMoment: base.currentMoment,
    jurisdictions: base.jurisdictionOrder.map((id) => base.jurisdictions[id]!),
    people: base.personOrder.map((id) => base.people[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  observer = world.personOrder[0]!;
  world = ensureMunicipalCouncilOpening(world, government.id);
  const seats = municipalSeats(world, government.id).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(seats.length).toBeGreaterThanOrEqual(2);
  weaker = seats[0]!.personId;
  stronger = seats[1]!.personId;
  const proposition = world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find(
      (q) =>
        mayAnswerQuestion(world, place.context.jurisdiction.id, q.id) &&
        ["yes", "no"].every((answer) =>
          ["municipality", "county"].every(
            (level) =>
              !automaticLawMappingFor(
                q.stableKey,
                answer as "yes" | "no",
                level as "municipality" | "county",
              ),
          ),
        ) &&
        (q.principles ?? []).reduce((sum, b) => sum + (b.weight ?? 1), 0) >= 1,
    );
  expect(proposition).toBeDefined();
  const bearings = new Map(
    proposition!.principles!.map((b) => [b.principleId, b.bearing]),
  );
  world = recordPrinciples(
    world,
    seats.flatMap((seat) =>
      world.policyCatalog.principleOrder.map((principleId) => ({
        stableKey: `g1-local-proof:${seat.personId}:${principleId}`,
        personId: seat.personId,
        principleId,
        formedAt: world.currentDate,
        stance:
          bearings.has(principleId) &&
          (seat.personId === stronger || seat.personId === weaker)
            ? bearings.get(principleId) === "against"
              ? "rejects"
              : "endorses"
            : "conflicted",
        strength: seat.personId === stronger ? 1 : 0.75,
        conviction: "settled",
        flexibility: "firm",
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Explicit saved strengths in a controlled sponsor-choice fixture.",
        }),
        supersedesPrincipleRecordId: null,
      })),
    ),
  );
});

describe("local position filing reads member stakes in all observer jurisdictions", () => {
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "files an actual local member's recorded choice for observer in %s",
    (code) => {
      const jurisdiction = stateJurisdictionForKey(`US-${code}`)!;
      const start: World = {
        ...world,
        control: { kind: "person", personId: observer },
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction.id],
        people: {
          ...world.people,
          [observer]: {
            ...world.people[observer]!,
            homeJurisdictionId: jurisdiction.id,
            establishedFacts: world.people[observer]!.establishedFacts.map(
              (f) =>
                f.kind === "residence" && f.endedAt === null
                  ? { ...f, jurisdictionId: jurisdiction.id }
                  : f,
            ),
          },
        },
      };
      const next = fileLocalMemberAgendaBill(start, {
        governmentKey: government.id,
        intakeKey: "g1-local-parity",
      });
      const bills = next.history.legislativeMeasures ?? [];
      expect(bills).toHaveLength(1);
      const bill = bills[0]!;
      expect([weaker, stronger]).toContain(bill.sponsorPersonId);
      const answer = bill.propositionAnswers![0]!;
      const leaning = principledLeaning(
        start,
        bill.sponsorPersonId!,
        answer.propositionId,
      );
      expect(leaning.recordIds.length).toBeGreaterThan(0);
      expect(Math.abs(leaning.score)).toBeGreaterThanOrEqual(3);
      expect(bill.sponsorPersonId).toBe(stronger);
      const motive = next.history.events.find(
        (event) => event.stableKey === `${bill.stableKey}:motive`,
      );
      expect(motive?.type).toBe("legislation.sponsor-motive");
      expect(motive?.tags).toContain(`principle-score:${leaning.score}`);
      for (const id of leaning.recordIds)
        expect(motive?.tags).toContain(`reason:principle-record:${id}`);
      expect(next.history.legislativeDraftLineages ?? []).toHaveLength(0);
      expect(next.control).toEqual(start.control);
      expect(
        fileLocalMemberAgendaBill(next, {
          governmentKey: government.id,
          intakeKey: "g1-local-parity",
        }),
      ).toBe(next);
    },
  );

  it("leaves the strongest member's filing to the player who controls them", () => {
    const start: World = {
      ...world,
      control: { kind: "person", personId: stronger },
    };
    const next = fileLocalMemberAgendaBill(start, {
      governmentKey: government.id,
      intakeKey: "g1-player-member",
    });
    expect(next.history.legislativeMeasures).toHaveLength(1);
    expect(next.history.legislativeMeasures![0]!.sponsorPersonId).toBe(weaker);
    expect(next.control).toEqual(start.control);
  });

  it("does not file for a government under a different jurisdiction", () => {
    const other = stateJurisdictionForKey("US-AL")!;
    expect(
      fileMemberAgendaBills(world, {
        jurisdictionId: other.id,
        localGovernmentKey: government.id,
        intakeKey: "g1-wrong-local-body",
      }),
    ).toBe(world);
  });
});
