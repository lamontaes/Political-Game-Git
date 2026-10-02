import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { legislativePackForJurisdiction } from "../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../src/simulation/governing/chamber-votes";
import { fileMemberAgendaBills } from "../src/simulation/governing/member-agenda";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../src/simulation/governing/officeholder-principles";
import { mayAnswerQuestion } from "../src/simulation/governing/question-authority";
import {
  lawInForce,
  statuteAnswer,
} from "../src/simulation/governing/law-in-force";
import { automaticLawMappingFor } from "../src/simulation/governing/automatic-legislation";
import { measureProvisions } from "../src/simulation/legislative-politics";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";

const seed = "making-laws-full-catalog-first-intakes-20261002";
const procedures = drawLegislativeStartingProcedures({ seed });
const cases = CHIEF_EXECUTIVE_JURISDICTIONS.filter(
  (usps) => procedures[`US-${usps}`],
)
  .map((usps) => ({
    usps,
    rank: createHash("sha256").update(`${seed}:${usps}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 10);
const receipts: {
  usps: string;
  lawful: number;
  bearings: number;
  strong: number;
  negativeWithoutYes: number;
  positiveExistingYes: number;
  oldDirectionEligible: number;
  mapped: number;
  filed: string[];
  ordered: string[];
}[] = [];

describe(`Making Laws full state catalog first intakes (seed ${seed})`, () => {
  it("draws ten eligible states from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(10);
  });
  it.each(cases)(
    "$usps files its actual members' priorities beyond a three-question bank",
    ({ usps }) => {
      const fixture = smallWorld({
        place: usps,
        seed,
        date: `${procedures[`US-${usps}`]!.sessionYearParity === "odd" ? 2025 : 2026}-01-05`,
        offices: ["congress", "state-legislature"],
      });
      const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId)!;
      const members = pack.chambers
        .flatMap(
          (chamber) =>
            seatedChamberForPack(
              fixture.world,
              pack.packId,
              chamber.chamberKey,
              chamber.name,
            )?.body.members ?? [],
        )
        .filter(
          (member) => member.personId && member.personId !== fixture.personId,
        );
      const world = ensureOfficeholderPrinciples(
        fixture.world,
        members.map((member) => member.personId!),
      );
      const lawful = world.policyCatalog.propositionOrder.filter((id) =>
        mayAnswerQuestion(world, fixture.stateJurisdictionId, id),
      );
      const strong = new Set<string>();
      const negativeWithoutYes = new Set<string>();
      const positiveExistingYes = new Set<string>();
      const oldDirectionEligible = new Set<string>();
      const mapped = new Set<string>();
      for (const id of lawful) {
        const proposition = world.policyCatalog.propositions[id]!;
        const answer = statuteAnswer(
          lawInForce(world, fixture.stateJurisdictionId, id),
        );
        for (const member of members) {
          const score = principledLeaning(world, member.personId!, id).score;
          if (Math.abs(score) < 3) continue;
          strong.add(proposition.stableKey);
          if (score < 0 && (answer === null || answer === "no"))
            negativeWithoutYes.add(proposition.stableKey);
          if (score > 0 && answer === "yes")
            positiveExistingYes.add(proposition.stableKey);
          if (
            answer !== "closed" &&
            (score > 0 ? answer !== "yes" : answer === "yes")
          )
            oldDirectionEligible.add(proposition.stableKey);
          if (
            automaticLawMappingFor(
              proposition.stableKey,
              score > 0 ? "yes" : "no",
              "state",
            )
          )
            mapped.add(proposition.stableKey);
        }
      }
      const input = {
        jurisdictionId: fixture.stateJurisdictionId,
        intakeKey: `${seed}:${usps}:first`,
      };
      const filed = fileMemberAgendaBills(world, input);
      const bills = (filed.history.legislativeMeasures ?? []).filter(
        (measure) => measure.jurisdictionId === fixture.stateJurisdictionId,
      );
      const keys = bills.flatMap((bill) =>
        (bill.propositionAnswers ?? []).map(
          (answer) =>
            world.policyCatalog.propositions[answer.propositionId]!.stableKey,
        ),
      );
      receipts.push({
        usps,
        lawful: lawful.length,
        bearings: lawful.filter(
          (id) => world.policyCatalog.propositions[id]!.principles?.length,
        ).length,
        strong: strong.size,
        negativeWithoutYes: negativeWithoutYes.size,
        positiveExistingYes: positiveExistingYes.size,
        oldDirectionEligible: oldDirectionEligible.size,
        mapped: mapped.size,
        filed: [...new Set(keys)].sort(),
        ordered: keys,
      });
      console.info("STATE_CATALOG_RECEIPT", JSON.stringify(receipts.at(-1)));
      expect(new Set(keys).size).toBeGreaterThan(3);
      for (const bill of bills) {
        expect(bill.sponsorPersonId).not.toBe(fixture.personId);
        const answer = bill.propositionAnswers![0]!;
        expect(lawful).toContain(answer.propositionId);
        const proposition =
          world.policyCatalog.propositions[answer.propositionId]!;
        const leaning = principledLeaning(
          filed,
          bill.sponsorPersonId!,
          proposition.id,
        );
        expect(Math.abs(leaning.score)).toBeGreaterThanOrEqual(3);
        expect(answer.answer).toBe(leaning.score > 0 ? "yes" : "no");
        const provisions = measureProvisions(filed, bill.id);
        expect(provisions.length).toBeGreaterThan(0);
        expect(
          provisions.some(
            (provision) =>
              provision.answers?.propositionId === proposition.id &&
              provision.answers.answer === answer.answer,
          ),
        ).toBe(true);
        for (const parameter of proposition.parameters) {
          expect(
            provisions.some((provision) =>
              provision.text.includes(parameter.value),
            ),
          ).toBe(true);
        }
      }
      const restored = deserializeWorld(serializeWorld(filed));
      expect(fileMemberAgendaBills(restored, input)).toEqual(restored);
      expect(filed.control).toEqual(world.control);
    },
  );
  it("first intakes collectively cover dozens of questions and reflect different state priorities", () => {
    expect(receipts).toHaveLength(10);
    expect(
      new Set(receipts.flatMap((receipt) => receipt.filed)).size,
    ).toBeGreaterThanOrEqual(24);
    expect(
      new Set(receipts.map((receipt) => receipt.ordered.join("|"))).size,
    ).toBeGreaterThan(1);
  });
  it.todo(
    "observe the actual published first-intake news through the player browser after Audit's JSON repair",
  );
});
