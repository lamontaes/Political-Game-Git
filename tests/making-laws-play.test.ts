import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "./fixtures/small-world";
import { governmentUnitsForState } from "../src/simulation/government-units";
import { lifePlaceByKey } from "../src/simulation/life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { ensureLocalGovernmentOrganization } from "../src/simulation/nationwide-world/local-governments";
import {
  ensureLocalGovernmentSeatsForUnit,
  organizationIdFor,
  sittingLocalOfficers,
} from "../src/simulation/living-world/local-government-seats";
import { councilRules } from "../src/simulation/living-world/local-council-binding";
import { legislativePackForWorkKey } from "../src/simulation/legislative-institutions";
import { chamberByKey } from "../src/simulation/legislature-rules";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";
import {
  introduceMeasure,
  measurePosition,
} from "../src/simulation/legislation";
import { personName } from "../src/simulation/people";
import { completeCouncilPassage } from "../src/simulation/municipal-ordinance-procedure";
import {
  serializeWorld,
  deserializeWorld,
} from "../src/simulation/serialization";
import { ensureCouncilPrinciples } from "../src/simulation/governing/council-lawmaking";
import { applyInstitutionStep } from "../src/simulation/governing/legislative-clock";
import { fileMemberAgendaBills } from "../src/simulation/governing/member-agenda";
import { lawInForce } from "../src/simulation/governing/law-in-force";
import { mayAnswerQuestion } from "../src/simulation/governing/question-authority";
import {
  createFormationContext,
  recordPrinciples,
} from "../src/simulation/politics";
import type {
  PolicyPropositionDefinition,
  World,
} from "../src/simulation/types";

// The Making Laws script currently reaches a real town council. The seed
// selects places from all 56 jurisdictions; it never selects a vote outcome.
// Pending steps below name the planned paths this script does not yet prove.
const SEED = "making-laws-play-20261001";
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
    rank: createHash("sha256").update(`${SEED}:${entry.unit.id}`).digest("hex"),
  }))
  .sort((a, b) => a.rank.localeCompare(b.rank))
  .slice(0, 5);

function councilOpening({ unit, place }: (typeof cases)[number]) {
  const opening = smallWorld({ place: place.key, seed: SEED });
  let world = ensureLocalGovernmentSeatsForUnit(
    ensureLocalGovernmentOrganization(opening.world, unit),
    unit,
    opening.jurisdictionId,
    [opening.personId],
  );
  const officers = sittingLocalOfficers(world, unit);
  const members = officers.filter((seat) => !seat.mayor);
  expect(organizationIdFor(world, unit)).not.toBeNull();
  expect(members.length).toBeGreaterThan(0);
  world = ensureCouncilPrinciples(world, officers);
  return {
    world,
    jurisdictionId: opening.jurisdictionId,
    members,
    context: {
      localCouncil: {
        governmentUnitId: unit.id,
        townJurisdictionId: opening.jurisdictionId,
        playerPersonId: null,
      },
    },
  };
}

function fileBill(entry: (typeof cases)[number]) {
  const opening = councilOpening(entry);
  const { pack } = entry;
  let { world } = opening;
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId: opening.jurisdictionId,
    originChamber: chamberByKey(pack, "council"),
    rulePackId: pack.packId,
  });
  world = introduceMeasure(world, {
    stableKey: "making-laws-play:authored-room-policy",
    rulePackId: pack.packId,
    jurisdictionId: opening.jurisdictionId,
    ...numbering,
    shortTitle: "Council meeting room policy",
    summary: "An authored nonfiscal proposal for the recorded council.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: opening.members[0]!.personId,
  });
  return {
    ...opening,
    world,
    bill: world.history.legislativeMeasures!.at(-1)!,
  };
}

function voteOnBill(entry: (typeof cases)[number]) {
  return voteFiledBill(fileBill(entry));
}

function voteFiledBill(filed: ReturnType<typeof fileBill>) {
  let world = filed.world;
  if (measurePosition(world, filed.bill.id).phase === "awaiting-referral") {
    const placed = applyInstitutionStep(
      world,
      filed.bill.id,
      (w) => w,
      filed.context,
    );
    expect(placed.kind).toBe("applied");
    if (placed.kind !== "applied") throw new Error("Council placement failed");
    world = placed.world;
  }
  const result = applyInstitutionStep(
    world,
    filed.bill.id,
    (w) => w,
    filed.context,
  );
  expect(result.kind).toBe("applied");
  if (result.kind !== "applied") throw new Error("Council vote failed");
  const votes = result.world.history.legislativeVotes!.filter(
    (row) => row.measureId === filed.bill.id,
  );
  expect(votes).toHaveLength(1);
  return { ...filed, world: result.world, vote: votes[0]! };
}

function recordedViews(
  world: World,
  members: ReturnType<typeof sittingLocalOfficers>,
  question: PolicyPropositionDefinition,
  support: boolean,
): World {
  return recordPrinciples(
    world,
    members.flatMap((member) =>
      question.principles!.map((bearing) => ({
        stableKey: `making-laws-play:view:${world.history.nextSequence}:${support}:${member.personId}:${bearing.principleId}`,
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
          note: "Explicit fictional saved council views exercise the common agenda journey; no member decision is forecast.",
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

describe(`Making Laws play script (seed ${SEED})`, () => {
  it("draws five actual council places from the all-56 jurisdiction catalog", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map(({ unit }) => unit.id)).size).toBe(5);
  });

  describe.each(cases)("town council in $place.key", (entry) => {
    it("step 1: a sitting member files a numbered proposal in their own council", () => {
      const { world, bill, members } = fileBill(entry);
      expect(bill.rulePackId).toBe(entry.pack.packId);
      expect(bill.sponsorPersonId).toBe(members[0]!.personId);
      expect(personName(world.people[bill.sponsorPersonId!]!)).not.toBe("");
      expect(bill.designation).not.toBe("");
      expect(world.history.legislativeMeasures).toHaveLength(1);
    });

    it("step 2: the shared driver records each actual member's vote and reason", () => {
      const { world, vote, members } = voteOnBill(entry);
      expect(vote.dispositions.map((row) => row.personId).sort()).toEqual(
        members.map((row) => row.personId).sort(),
      );
      for (const row of vote.dispositions) {
        expect(row.reason).toBeTruthy();
        expect(personName(world.people[row.personId!]!)).not.toBe("");
      }
      expect(vote.outcome).toBe("passed");
    });

    it("step 3: the passed proposal receives exactly one saved enactment", () => {
      const { world, bill } = voteOnBill(entry);
      const enacted = completeCouncilPassage(world, bill, null);
      const acts = enacted.history.legislativeEnactments!.filter(
        (row) => row.measureId === bill.id,
      );
      expect(acts).toHaveLength(1);
      expect(acts[0]!.outcome).toBe("enacted");
      expect(acts[0]!.effectiveAt).toBe(acts[0]!.resolvedAt);
      expect(acts[0]!.effectiveDateGameProfile).toEqual({
        version: entry.pack.packId,
        days: 0,
      });
    });

    it("step 5: common filing, saved effective date, Continue and actual repeal form one journey", () => {
      const opening = councilOpening(entry);
      let { world } = opening;
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
      if (!question) throw new Error("No answerable saved council question");
      const file = (at: World, stage: string) =>
        fileMemberAgendaBills(at, {
          jurisdictionId: opening.jurisdictionId,
          intakeKey: `making-laws-play:${stage}`,
          chamberKey: "council",
          council: {
            pack: entry.pack,
            members: opening.members,
            questions: [question.id],
            measures: at.history.legislativeMeasures ?? [],
            playerPersonId: null,
            measureKey: (numbering) =>
              `making-laws-play:${entry.unit.id}:${numbering.numberingSession.key}:${numbering.designation}`,
          },
        });
      const enact = (at: World) => {
        const bill = at.history.legislativeMeasures!.at(-1)!;
        const voted = voteFiledBill({ ...opening, world: at, bill });
        const next = completeCouncilPassage(voted.world, bill, null);
        const acts = next.history.legislativeEnactments!.filter(
          (row) => row.measureId === bill.id,
        );
        expect(acts).toHaveLength(1);
        expect(acts[0]!.effectiveAt).toBe(acts[0]!.resolvedAt);
        expect(acts[0]!.effectiveDateGameProfile).toEqual({
          version: entry.pack.packId,
          days: 0,
        });
        expect(voted.vote.provenance.method).toBe("member-decisions");
        expect(
          voted.vote.dispositions.every((row) =>
            row.reason?.startsWith("member:"),
          ),
        ).toBe(true);
        return next;
      };
      world = recordedViews(world, opening.members, question, false);
      expect(file(world, "no-law-to-repeal")).toEqual(world);
      world = recordedViews(world, opening.members, question, true);
      world = file(world, "support");
      expect(world.history.legislativeMeasures).toHaveLength(1);
      const first = world.history.legislativeMeasures![0]!;
      expect(first.shortTitle).toMatch(/ Ordinance$/);
      expect(first.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "yes" },
      ]);
      expect(opening.members.map((row) => row.personId)).toContain(
        first.sponsorPersonId,
      );
      world = enact(world);
      expect(
        lawInForce(world, opening.jurisdictionId, question.id)?.answer,
      ).toBe("yes");
      expect(file(world, "already-supported")).toEqual(world);
      const continued = deserializeWorld(serializeWorld(world));
      expect(continued).toEqual(world);
      expect(
        lawInForce(continued, opening.jurisdictionId, question.id)?.answer,
      ).toBe("yes");
      world = file(
        recordedViews(continued, opening.members, question, false),
        "repeal",
      );
      expect(world.history.legislativeMeasures).toHaveLength(2);
      const repeal = world.history.legislativeMeasures!.at(-1)!;
      expect(repeal.shortTitle).toBe(`Repeal: ${first.shortTitle}`);
      expect(repeal.propositionAnswers).toEqual([
        { propositionId: question.id, answer: "no" },
      ]);
      world = enact(world);
      expect(
        lawInForce(world, opening.jurisdictionId, question.id)?.answer,
      ).toBe("no");
      const resumed = deserializeWorld(serializeWorld(world));
      expect(resumed).toEqual(world);
      expect(file(resumed, "already-repealed")).toEqual(resumed);
      expect(resumed.control).toEqual(opening.world.control);
      expect(sittingLocalOfficers(resumed, entry.unit)).toEqual(
        sittingLocalOfficers(opening.world, entry.unit),
      );
      console.info(
        "[making-laws-saved-law]",
        JSON.stringify({
          seed: SEED,
          place: entry.place.key,
          question: question.stableKey,
          sponsor: personName(resumed.people[first.sponsorPersonId!]!),
          bills: resumed.history.legislativeMeasures!.map((row) => ({
            id: row.id,
            title: row.shortTitle,
            answers: row.propositionAnswers,
          })),
          votes: resumed.history.legislativeVotes,
          acts: resumed.history.legislativeEnactments,
        }),
      );
    });

    it("step 4: Continue preserves the bill, members, votes and enactment", () => {
      const { world, bill, context } = voteOnBill(entry);
      const enacted = completeCouncilPassage(world, bill, null);
      const resumed = deserializeWorld(serializeWorld(enacted));
      expect(resumed).toEqual(enacted);
      const repeated = applyInstitutionStep(
        resumed,
        bill.id,
        (w) => w,
        context,
      );
      const after = repeated.kind === "applied" ? repeated.world : resumed;
      expect(after.history.legislativeMeasures).toEqual(
        enacted.history.legislativeMeasures,
      );
      expect(after.history.legislativeVotes).toEqual(
        enacted.history.legislativeVotes,
      );
      expect(after.history.legislativeEnactments).toEqual(
        enacted.history.legislativeEnactments,
      );
      expect(sittingLocalOfficers(after, entry.unit)).toEqual(
        sittingLocalOfficers(enacted, entry.unit),
      );
    });
  });

  it.todo(
    "step 1b / A72: the same agenda filer introduces bills for councils, Congress and states",
  );
  it.todo(
    "step 2b / A77 and A78: the player's session, compiled councils, DC, Congress and states use the same bill driver",
  );
  it.todo(
    "step 3b / A83: one saved effective date governs every law reader, including an on-adoption town law",
  );
  it.todo(
    "step 3c / A76: every body's title, support and repeal use the same rules",
  );
});
