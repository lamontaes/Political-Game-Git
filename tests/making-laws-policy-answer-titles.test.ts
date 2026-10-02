import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { drawLegislativeStartingProcedures } from "../src/simulation/legislative-starting-procedures";
import { legislativePackForJurisdiction } from "../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../src/simulation/governing/chamber-votes";
import { fileMemberAgendaBills } from "../src/simulation/governing/member-agenda";
import { principledLeaning } from "../src/simulation/governing/officeholder-principles";
import { automaticLawMappingFor } from "../src/simulation/governing/automatic-legislation";
import { mayAnswerQuestion } from "../src/simulation/governing/question-authority";
import {
  lawInForce,
  statuteAnswer,
} from "../src/simulation/governing/law-in-force";
import {
  CATALOG_MEASURE_TITLE,
  renderMeasureTitle,
} from "../src/simulation/measure-title";
import { introduceMeasure } from "../src/simulation/legislation";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  createFormationContext,
  recordPrinciples,
} from "../src/simulation/politics";
import type {
  PolicyPropositionDefinition,
  World,
} from "../src/simulation/types";

const SEED = "making-laws-policy-answer-titles-20261002";
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
  const procedure = procedures[`US-${usps}`]!;
  const year = procedure.sessionYearParity === "odd" ? 2025 : 2026;
  const fixture = smallWorld({
    place: usps,
    seed: SEED,
    date: `${year}-01-05`,
    offices: ["congress", "state-legislature"],
  });
  const pack = legislativePackForJurisdiction(fixture.stateJurisdictionId)!;
  const chamber = pack.chambers.find((body) => body.introductionAllowed)!;
  const members = seatedChamberForPack(
    fixture.world,
    pack.packId,
    chamber.chamberKey,
    chamber.name,
  )!.body.members.filter((member) => member.personId !== null);
  const sponsor = members.find(
    (member) => member.personId !== fixture.personId,
  )!;
  expect(sponsor).toBeDefined();
  return { ...fixture, pack, chamber, members, sponsor };
}

function opposingWorld(
  fixture: ReturnType<typeof opening>,
  question: PolicyPropositionDefinition,
): World {
  const bearings = new Map(
    (question.principles ?? []).map((bearing) => [
      bearing.principleId,
      bearing.bearing,
    ]),
  );
  return recordPrinciples(
    fixture.world,
    fixture.members.flatMap((member) =>
      fixture.world.policyCatalog.principleOrder.map((principleId) => ({
        stableKey: `policy-answer-title:${question.id}:${member.personId}:${principleId}`,
        personId: member.personId!,
        principleId,
        formedAt: fixture.world.currentDate,
        stance:
          bearings.get(principleId) === "consistent-with"
            ? ("rejects" as const)
            : ("endorses" as const),
        strength:
          member.personId === fixture.sponsor.personId &&
          bearings.has(principleId)
            ? 1
            : 0,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Explicit fictional saved convictions oppose this actual catalog question; other seated members have no filing pressure in this fixture.",
        }),
        supersedesPrincipleRecordId:
          fixture.world.history.principles
            .filter(
              (record) =>
                record.personId === member.personId &&
                record.principleId === principleId,
            )
            .at(-1)?.id ?? null,
      })),
    ),
  );
}

// Fictional pending-measure controls isolate the target while leaving the
// full catalog intact. These record-only introductions are not a normal first
// intake; the active sponsor's actual filing cap remains unused.
function selectedOpposition(
  fixture: ReturnType<typeof opening>,
  repeal: boolean,
) {
  const question = fixture.world.policyCatalog.propositionOrder
    .map((id) => fixture.world.policyCatalog.propositions[id]!)
    .find((candidate) => {
      const answer = statuteAnswer(
        lawInForce(fixture.world, fixture.stateJurisdictionId, candidate.id),
      );
      return (
        mayAnswerQuestion(
          fixture.world,
          fixture.stateJurisdictionId,
          candidate.id,
        ) &&
        (repeal ? answer === "yes" : answer !== "yes" && answer !== "closed") &&
        !automaticLawMappingFor(candidate.stableKey, "no", "state") &&
        (candidate.principles ?? []).some(
          (bearing) => (bearing.weight ?? 1) !== 0,
        )
      );
    });
  if (!question)
    throw new Error(
      `${fixture.stateUsps}: no lawful unmapped ${repeal ? "repeal" : "negative policy"} question (seed ${SEED}).`,
    );
  let world = opposingWorld(fixture, question);
  const otherMembers = fixture.members.filter(
    (member) =>
      member.personId !== fixture.sponsor.personId &&
      member.personId !== fixture.personId,
  );
  expect(otherMembers.length).toBeGreaterThan(0);
  let index = 0;
  for (const propositionId of world.policyCatalog.propositionOrder) {
    if (
      propositionId === question.id ||
      !mayAnswerQuestion(world, fixture.stateJurisdictionId, propositionId)
    )
      continue;
    const candidate = world.policyCatalog.propositions[propositionId]!;
    world = introduceMeasure(world, {
      stableKey: `policy-answer-title:pending:${question.id}:${propositionId}`,
      jurisdictionId: fixture.stateJurisdictionId,
      rulePackId: fixture.pack.packId,
      ...nextMeasureNumbering(world, {
        jurisdictionId: fixture.stateJurisdictionId,
        rulePackId: fixture.pack.packId,
        originChamber: fixture.chamber,
      }),
      shortTitle: candidate.name,
      summary:
        "Explicit fictional pending proposal isolates the title regression; this is a record-only fixture, not an ordinary intake.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: fixture.chamber.chamberKey,
      sponsorPersonId: otherMembers[index++ % otherMembers.length]!.personId!,
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer: "yes" }],
    });
  }
  const before = world.history.legislativeMeasures ?? [];
  expect(
    before.every(
      (measure) => measure.sponsorPersonId !== fixture.sponsor.personId,
    ),
  ).toBe(true);
  const input = {
    jurisdictionId: fixture.stateJurisdictionId,
    chamberKey: fixture.chamber.chamberKey,
    intakeKey: `${SEED}:${question.id}`,
  };
  const filed = fileMemberAgendaBills(world, input);
  const bills = (filed.history.legislativeMeasures ?? []).slice(before.length);
  expect(bills).toHaveLength(1);
  const bill = bills[0]!;
  return { world, filed, bill, bills, before, question, input };
}

describe(`Making Laws negative policy titles (seed ${SEED})`, () => {
  it("draws five eligible states from all 56 jurisdictions", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map(({ usps }) => usps)).size).toBe(5);
  });
  describe.each(cases)("$usps actual state chamber", ({ usps }) => {
    it.each([false, true])(
      "uses existing-law repeal status, not a no answer, for its title (repeal=%s)",
      (repeal) => {
        const fixture = opening(usps);
        const selected = selectedOpposition(fixture, repeal);
        const { world, filed, bill, bills, before, question, input } = selected;
        expect(
          (filed.history.legislativeMeasures ?? []).slice(0, before.length),
        ).toEqual(before);
        expect(bills).toHaveLength(1);
        expect(bill.sponsorPersonId).toBe(fixture.sponsor.personId);
        expect(bill.propositionAnswers).toEqual([
          { propositionId: question.id, answer: "no" },
        ]);
        expect(
          principledLeaning(world, fixture.sponsor.personId!, question.id)
            .score,
        ).toBeLessThan(0);
        const actualLaw = statuteAnswer(
          lawInForce(world, fixture.stateJurisdictionId, question.id),
        );
        expect(actualLaw === "yes").toBe(repeal);
        expect(bill.shortTitle).toBe(
          renderMeasureTitle(
            fixture.pack.titleTemplate ?? CATALOG_MEASURE_TITLE,
            question.name,
            world.currentDate.slice(0, 4),
            actualLaw === "yes",
          ),
        );
        expect(filed.control).toEqual(world.control);
        expect(filed.history.legislativeEnactments ?? []).toHaveLength(0);
        const controlled: World = {
          ...world,
          control: { kind: "person", personId: fixture.sponsor.personId! },
        };
        expect(
          fileMemberAgendaBills(controlled, {
            ...input,
            intakeKey: `${input.intakeKey}:player`,
          }).history.legislativeMeasures ?? [],
        ).toEqual(before);
      },
    );
  });
});
