import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { legislativePackForJurisdiction } from "../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../src/simulation/governing/chamber-votes";
import { agendaCaucus } from "../src/simulation/governing/majority-agenda";
import { fileMemberAgendaBills } from "../src/simulation/governing/member-agenda";
import { principledLeaning } from "../src/simulation/governing/officeholder-principles";
import { mayAnswerQuestion } from "../src/simulation/governing/question-authority";
import {
  lawInForce,
  statuteAnswer,
} from "../src/simulation/governing/law-in-force";
import {
  createFormationContext,
  recordPrinciples,
} from "../src/simulation/politics";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import type { EntityId, World } from "../src/simulation/types";

const SEED = "making-laws-agenda-alternatives-20261002";
const procedures = drawLegislativeStartingProcedures({ seed: SEED });
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter(
  (usps) => procedures[`US-${usps}`],
)
  .map((usps) => ({
    usps,
    rank: createHash("sha256").update(`${SEED}:${usps}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function opening(usps: string) {
  const entry = procedures[`US-${usps}`]!;
  const year = entry.sessionYearParity === "odd" ? 2025 : 2026;
  const fixture = smallWorld({
    place: usps,
    seed: SEED,
    date: `${year}-01-05`,
    offices: ["state-legislature"],
  });
  const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId)!;
  const chamber = pack.chambers.find((body) => body.introductionAllowed)!;
  const members = seatedChamberForPack(
    fixture.world,
    pack.packId,
    chamber.chamberKey,
    chamber.name,
  )!.body.members.filter((member) => member.personId !== null);
  expect(members.length).toBeGreaterThanOrEqual(6);
  return { ...fixture, pack, chamber, members };
}

function convictions(
  world: World,
  members: readonly { personId: EntityId | null }[],
  active: ReadonlySet<EntityId>,
): World {
  return recordPrinciples(
    world,
    members.flatMap((member) =>
      member.personId
        ? world.policyCatalog.principleOrder.map((principleId) => ({
            stableKey: `agenda-alternatives:${world.history.nextSequence}:${member.personId}:${principleId}`,
            personId: member.personId!,
            principleId,
            formedAt: world.currentDate,
            stance: "endorses" as const,
            strength: active.has(member.personId!) ? 1 : 0,
            conviction: "settled" as const,
            flexibility: "firm" as const,
            qualification: null,
            formation: createFormationContext("experience:life", {
              note: "Explicit saved fictional member convictions expose overlapping priorities; no filing or vote result is supplied.",
            }),
            supersedesPrincipleRecordId:
              world.history.principles
                .filter(
                  (record) =>
                    record.personId === member.personId &&
                    record.principleId === principleId,
                )
                .at(-1)?.id ?? null,
          }))
        : [],
    ),
  );
}

function eligibleQuestions(
  world: World,
  jurisdictionId: EntityId,
  memberId: EntityId,
) {
  return world.policyCatalog.propositionOrder
    .filter((id) => {
      if (!mayAnswerQuestion(world, jurisdictionId, id)) return false;
      const score = principledLeaning(world, memberId, id).score;
      const answer = statuteAnswer(lawInForce(world, jurisdictionId, id));
      return (
        Math.abs(score) >= 3 &&
        (score > 0 ? answer !== "yes" : answer === "yes")
      );
    })
    .sort(
      (a, b) =>
        Math.abs(principledLeaning(world, memberId, b).score) -
        Math.abs(principledLeaning(world, memberId, a).score),
    );
}

// Direct production filing on each state's lawful opening date. Calendar
// execution and the reported April 5 save require separate actual evidence.
describe(`Making Laws alternate member priorities (seed ${SEED})`, () => {
  it("selects five eligible states from the complete 56-jurisdiction catalog", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map(({ usps }) => usps)).size).toBe(5);
  });

  describe.each(cases)("$usps actual seated chamber", ({ usps }) => {
    it("keeps lower priorities available when another actual member claims the shared first choice", () => {
      const fixture = opening(usps);
      const activeMembers = fixture.members.slice(0, 6);
      const activeIds = new Set(
        activeMembers.map((member) => member.personId!),
      );
      const world = convictions(fixture.world, fixture.members, activeIds);
      const candidates = activeMembers.map((member) =>
        eligibleQuestions(world, fixture.stateJurisdictionId, member.personId!),
      );
      for (const questions of candidates)
        expect(questions.length).toBeGreaterThanOrEqual(4);
      // The overlap is derived from the actual full catalog and recorded views,
      // rather than a selected bank of preferred law titles.
      expect(new Set(candidates.map((questions) => questions[0])).size).toBe(1);
      const input = {
        jurisdictionId: fixture.stateJurisdictionId,
        chamberKey: fixture.chamber.chamberKey,
        intakeKey: `${SEED}:${usps}:overlap`,
      };
      const filed = fileMemberAgendaBills(world, input);
      const bills = filed.history.legislativeMeasures ?? [];
      expect(bills.length).toBeGreaterThanOrEqual(4);
      expect(bills.length).toBeLessThanOrEqual(activeMembers.length);
      expect(new Set(bills.map((bill) => bill.sponsorPersonId)).size).toBe(
        bills.length,
      );
      const questions = bills.map(
        (bill) => bill.propositionAnswers![0]!.propositionId,
      );
      expect(new Set(questions).size).toBe(bills.length);
      for (const bill of bills) {
        expect(activeIds.has(bill.sponsorPersonId!)).toBe(true);
        expect(bill.sponsorPersonId).not.toBe(fixture.personId);
        expect(bill.rulePackId).toBe(fixture.pack.packId);
        expect(bill.originChamberKey).toBe(fixture.chamber.chamberKey);
        expect(bill.introducedAt).toBe(world.currentDate);
        expect(bill.designation).toBeTruthy();
        expect(bill.shortTitle).toBeTruthy();
        const answer = bill.propositionAnswers![0]!;
        expect(
          mayAnswerQuestion(
            world,
            fixture.stateJurisdictionId,
            answer.propositionId,
          ),
        ).toBe(true);
        expect(candidates[0]).toContain(answer.propositionId);
        const score = principledLeaning(
          world,
          bill.sponsorPersonId!,
          answer.propositionId,
        ).score;
        expect(Math.abs(score)).toBeGreaterThanOrEqual(3);
        expect(answer.answer).toBe(score > 0 ? "yes" : "no");
      }
      expect(filed.control).toEqual(world.control);
      expect(filed.history.legislativeEnactments ?? []).toHaveLength(0);
      const resumed = deserializeWorld(serializeWorld(filed));
      expect(fileMemberAgendaBills(resumed, input)).toEqual(resumed);
      const later = fileMemberAgendaBills(resumed, {
        ...input,
        intakeKey: `${input.intakeKey}:later`,
      });
      for (const propositionId of questions) {
        expect(
          (later.history.legislativeMeasures ?? []).filter((bill) =>
            bill.propositionIds?.includes(propositionId),
          ),
        ).toEqual(
          bills.filter((bill) => bill.propositionIds?.includes(propositionId)),
        );
      }
      expect(later.history.legislativeEnactments ?? []).toHaveLength(0);
    });

    it("retains minority filing and leaves a controlled member's agenda to the player", () => {
      const fixture = opening(usps);
      const majorityIds = new Set(
        agendaCaucus(fixture.members).map((member) => member.personId),
      );
      const minority = fixture.members.find(
        (member) => member.partyKey && !majorityIds.has(member.personId),
      );
      expect(minority).toBeDefined();
      if (!minority?.personId)
        throw new Error(`No actual minority member in ${usps}`);
      const world = convictions(
        fixture.world,
        fixture.members,
        new Set([minority.personId]),
      );
      const input = {
        jurisdictionId: fixture.stateJurisdictionId,
        chamberKey: fixture.chamber.chamberKey,
        intakeKey: `${SEED}:${usps}:minority`,
      };
      const filed = fileMemberAgendaBills(world, input);
      expect(filed.history.legislativeMeasures).toHaveLength(1);
      expect(filed.history.legislativeMeasures![0]!.sponsorPersonId).toBe(
        minority.personId,
      );
      const controlled: World = {
        ...world,
        control: { kind: "person", personId: minority.personId },
      };
      expect(
        fileMemberAgendaBills(controlled, {
          ...input,
          intakeKey: `${input.intakeKey}:player`,
        }).history.legislativeMeasures ?? [],
      ).toHaveLength(0);
      expect(filed.control).toEqual(world.control);
    });
  });
  it.todo(
    "reproduce the reported April 5 save and identify its actual calendar producer",
  );
  it.todo(
    "observe distinct member alternatives through actual normal-clock and player UI execution",
  );
});
