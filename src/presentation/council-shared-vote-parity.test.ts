import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { simulationMomentOnLocalDate } from "../simulation/dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
} from "../simulation/future-transitions";
import { decideChamberVote, publicPartyOf } from "../simulation/governing/chamber-votes";
import { decideCouncilVote } from "../simulation/governing/council-lawmaking";
import { lawInForce } from "../simulation/governing/law-in-force";
import { principledLeaning } from "../simulation/governing/officeholder-principles";
import { questionAuthority } from "../simulation/governing/question-authority";
import { lifePlaceStateIdentities, requireLifePlace } from "../simulation/life-places";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
} from "../simulation/legislation";
import { municipalGovernmentByKey, municipalRulePackFor } from "../simulation/municipal-government";
import {
  actOnCouncilMeasure,
  municipalExecutiveHolder,
  municipalOrdinanceStatus,
  recordCouncilReadingVote,
} from "../simulation/municipal-ordinance-procedure";
import { installMunicipalGovernment, municipalSeats } from "../simulation/municipal-public-work";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "../simulation/nationwide-world/district-of-columbia-council-opening";
import { ensureStateExecutiveIncumbent } from "../simulation/nationwide-world/state-executives";
import { personName } from "../simulation/people";
import { createFormationContext, recordPrinciples } from "../simulation/politics";
import { SeededRng } from "../simulation/rng";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { writeWithWorldIntegrityOnce } from "../simulation/world";

const seed = "A79 shared institutional council vote parity";
const identities = lifePlaceStateIdentities();
const remaining = [...identities];
const rng = new SeededRng(seed);
const samples = Array.from(
  { length: 5 },
  () => remaining.splice(rng.integer(0, remaining.length), 1)[0]!,
);

function fixture(startingKey: string) {
  const opened = smallWorld({ place: startingKey, seed: `${seed}:${startingKey}` });
  // Five starting worlds, each with the same actual D.C. institution;
  // not five different municipal laws or generated player journeys.
  let world = ensureStateExecutiveIncumbent(opened.world, opened.personId, "DC");
  world = writeWithWorldIntegrityOnce(world, () =>
    ensureDistrictOfColumbiaCouncilOpening(world),
  );
  const jurisdictionId = requireLifePlace("1150000").context.jurisdiction.id;
  world = installMunicipalGovernment(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    jurisdictionId,
    formedAt: world.currentDate,
  });
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const packed = municipalRulePackFor(government);
  if (!packed.ok) throw Error(JSON.stringify(packed.missing));
  const members = municipalSeats(world, DC_GOVERNMENT_KEY)
    .filter((seat) => seat.role === "member" || seat.role === "presiding-member")
    .map((seat) => ({ personId: seat.personId }));
  expect(members.length).toBeGreaterThan(1);
  expect(members.every((member) => world.people[member.personId])).toBe(true);
  return { world, members, jurisdictionId, pack: packed.pack };
}

function fileMeasure(
  opened: ReturnType<typeof fixture>,
  stableKey: string,
  propositionId?: EntityId,
  answer: "yes" | "no" = "yes",
) {
  const world = introduceMeasure(opened.world, {
    stableKey,
    jurisdictionId: opened.jurisdictionId,
    rulePackId: opened.pack.packId,
    originChamberKey: opened.pack.chamberOrder[0]!,
    designation: "Supplied council parity measure",
    shortTitle: "Shared institutional ballot fixture",
    summary: propositionId
      ? "Supplied catalog-policy input; member ballots remain unsupplied."
      : "Supplied procedural input without a sponsor or policy answers.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    ...(propositionId
      ? { propositionIds: [propositionId], propositionAnswers: [{ propositionId, answer }] }
      : {}),
  });
  return { world, measureId: world.history.legislativeMeasures!.at(-1)!.id };
}

function councilInput(
  opened: ReturnType<typeof fixture>,
  measureId: EntityId,
  stableKey: string,
) {
  return {
    stableKey,
    measureId,
    jurisdictionId: opened.jurisdictionId,
    members: opened.members,
    playerPersonId: null as EntityId | null,
    questionLabel: "Supplied council parity question",
    executivePersonId: null,
    nonpartisan: true,
  };
}

function sharedInput(
  world: World,
  input: Parameters<typeof decideCouncilVote>[1],
): Parameters<typeof decideChamberVote>[1] {
  return {
    stableKey: input.stableKey,
    question: {
      question: {
        measureId: input.measureId,
        purpose: "floor-stage",
        forumKey: "council",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: input.questionLabel,
    },
    members: input.members.map((member, index) => ({
      memberKey: `council:${index + 1}`,
      name: personName(world.people[member.personId]!),
      personId: member.personId,
      caucusLabel: publicPartyOf(world, member.personId) ?? "No party",
    })),
    playerPersonId: input.playerPersonId,
    playerBallot: null,
    constituencyId: input.jurisdictionId,
    executivePersonId: input.executivePersonId,
    nonpartisan: input.nonpartisan,
  };
}

function parity(world: World, input: Parameters<typeof decideCouncilVote>[1]) {
  const before = serializeWorld(world);
  const expected = decideChamberVote(world, sharedInput(world, input));
  expect(decideCouncilVote(world, input)).toEqual(expected);
  expect(decideCouncilVote(world, input)).toEqual(expected);
  const loaded = deserializeWorld(before);
  expect(decideChamberVote(loaded, sharedInput(loaded, input))).toEqual(expected);
  expect(decideCouncilVote(loaded, input)).toEqual(expected);
  expect(serializeWorld(world)).toBe(before);
  return expected;
}

function netBearings(world: World, propositionId: EntityId) {
  const net = new Map<EntityId, number>();
  for (const bearing of world.policyCatalog.propositions[propositionId]!.principles ?? [])
    net.set(bearing.principleId, (net.get(bearing.principleId) ?? 0) +
      (bearing.bearing === "consistent-with" ? 1 : -1) * (bearing.weight ?? 1));
  return [...net].filter(([, weight]) => weight !== 0);
}

function isolateAt(world: World, date: IsoDate): World {
  let next = world;
  for (const due of world.history.futureDueItems) {
    if (due.dueAt > date ||
      futureDueItemStateAt(next, due.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      })?.status !== "scheduled") continue;
    next = cancelFutureDueItem(next, {
      stableKey: `${seed}:isolate:${due.id}`,
      dueItemId: due.id,
      effectiveAt: next.currentDate,
      reasonKey: "civic:fixture-isolation",
      context: "Scoped council parity fixture; other scheduled due families cancelled.",
    });
  }
  return {
    ...next,
    currentDate: date,
    currentMoment: simulationMomentOnLocalDate(next.currentMoment, date),
  };
}

describe("actual councils preserve shared institutional ballots", () => {
  for (const identity of samples)
    it(`preserves neutral shared rows and Continue from ${identity.jurisdictionKey}`, () => {
      expect(identities).toHaveLength(56);
      expect(new Set(samples.map((row) => row.jurisdictionKey)).size).toBe(5);
      const opened = fixture(identity.jurisdictionKey);
      const supplied = fileMeasure(opened, `${seed}:${identity.jurisdictionKey}:neutral`);
      const input = councilInput(opened, supplied.measureId,
        `${seed}:${identity.jurisdictionKey}:neutral-vote`);
      // No own policy view supplied; the shared decider weighs the institution.
      const rows = parity(supplied.world, input);
      expect(rows).toHaveLength(opened.members.length);
      for (const row of rows)
        expect(row).toMatchObject({
          disposition: "yea",
          reason: "member:institutional-deference",
        });
      const playerPersonId = opened.members[0]!.personId;
      const controlled = {
        ...supplied.world,
        control: { kind: "person" as const, personId: playerPersonId },
      };
      expect(parity(controlled, { ...input, playerPersonId })
        .find((row) => row.personId === playerPersonId)).toMatchObject({
          disposition: "absent",
          reason: "member:player-not-present",
        });
    });

  it("keeps actual members' own opposing principles ahead of institutional cues", () => {
    const opened = fixture(samples[0]!.jurisdictionKey);
    const propositionId = opened.world.policyCatalog.propositionOrder.find((id) =>
      questionAuthority(opened.world, opened.jurisdictionId, id).may === "yes" &&
      netBearings(opened.world, id).length > 0);
    if (!propositionId) throw Error("A real authorized catalog question is required.");
    const held = recordPrinciples(opened.world,
      opened.members.slice(0, 2).flatMap((member, index) =>
        netBearings(opened.world, propositionId).map(([principleId, weight]) => ({
          stableKey: `${seed}:own-view:${index}:${principleId}`,
          personId: member.personId,
          principleId,
          formedAt: opened.world.currentDate,
          stance: (weight > 0) === (index === 0) ? ("endorses" as const) : ("rejects" as const),
          strength: 1,
          conviction: "settled" as const,
          flexibility: "firm" as const,
          qualification: null,
          formation: createFormationContext("reflection:test", {
            note: "Explicit opposing held principles on actual saved members, shared by both callers.",
          }),
          supersedesPrincipleRecordId: null,
        }))));
    const forMember = opened.members[0]!.personId;
    const againstMember = opened.members[1]!.personId;
    expect(principledLeaning(held, forMember, propositionId).score).toBeGreaterThan(0);
    expect(principledLeaning(held, againstMember, propositionId).score).toBeLessThan(0);
    const supplied = fileMeasure({ ...opened, world: held }, `${seed}:own-view:measure`, propositionId);
    const input = {
      ...councilInput(opened, supplied.measureId, `${seed}:own-view:vote`),
      questionLabel: supplied.world.policyCatalog.propositions[propositionId]!.question,
    };
    const rows = parity(supplied.world, input);
    expect(rows.find((row) => row.personId === forMember)).toMatchObject({
      disposition: "yea", reason: "member:principle:for",
    });
    expect(rows.find((row) => row.personId === againstMember)).toMatchObject({
      disposition: "nay", reason: "member:principle:against",
    });
  });

  it("keeps the body's operative standing law through shared precedent", () => {
    const opened = fixture(samples[0]!.jurisdictionKey);
    const propositionId = opened.world.policyCatalog.propositionOrder.find((id) =>
      questionAuthority(opened.world, opened.jurisdictionId, id).may === "yes" &&
      lawInForce(opened.world, opened.jurisdictionId, id) === null);
    if (!propositionId) throw Error("An authorized question without a governing law is required.");
    const supplied = fileMeasure(opened, `${seed}:standing-law:original`, propositionId);
    let world = placeMeasureOnCalendar(supplied.world, {
      stableKey: `${seed}:standing-law:calendar`,
      measureId: supplied.measureId,
    });
    for (let index = 0; index < opened.pack.chambers[0]!.floorStages.length; index++) {
      const status = municipalOrdinanceStatus(world, DC_GOVERNMENT_KEY, supplied.measureId);
      if (!status) throw Error("Actual council measure status required.");
      if (status.earliestPassageOn && world.currentDate < status.earliestPassageOn)
        world = isolateAt(world, status.earliestPassageOn);
      const taken = recordCouncilReadingVote(world, {
        governmentKey: DC_GOVERNMENT_KEY,
        measureId: supplied.measureId,
        dispositions: parity(world, councilInput(opened, supplied.measureId,
          `${seed}:standing-law:reading:${index}`)),
        provenance: {
          method: "member-decisions",
          note: "Actual council members use the shared caller; standing-law fixture.",
          sourceEntityIds: opened.members.map((member) => member.personId),
        },
      });
      if (!taken.ok) throw Error(taken.reason);
      world = taken.world;
    }
    expect(measurePosition(world, supplied.measureId).phase).toBe("awaiting-executive");
    const mayor = municipalExecutiveHolder(world, DC_GOVERNMENT_KEY);
    if (!mayor) throw Error("An actual saved mayor is required.");
    const signed = actOnCouncilMeasure({
      ...world, control: { kind: "person", personId: mayor },
    }, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: supplied.measureId,
      decision: "sign",
      reasons: "Supplied controlled signature establishes the standing-law fixture.",
    });
    if (!signed.ok) throw Error(signed.reason);
    world = signed.world;
    expect(measurePosition(world, supplied.measureId).phase).toBe("enacted");
    const enactments = world.history.legislativeEnactments!.filter((row) =>
      row.measureId === supplied.measureId);
    expect(enactments).toHaveLength(1);
    const effectiveAt = enactments[0]!.effectiveAt;
    if (!effectiveAt) throw Error("Canonical municipal effective date required.");
    world = isolateAt(world, effectiveAt);
    const standing = lawInForce(world, opened.jurisdictionId, propositionId);
    expect(standing).toMatchObject({
      origin: "enacted", measureId: supplied.measureId, answer: "yes", operativeAt: effectiveAt,
    });
    const reversal = fileMeasure({ ...opened, world },
      `${seed}:standing-law:reversal`, propositionId, "no");
    const rows = parity(reversal.world, {
      ...councilInput(opened, reversal.measureId, `${seed}:standing-law:reversal-vote`),
      questionLabel: reversal.world.policyCatalog.propositions[propositionId]!.question,
    });
    const precedentRows = rows.filter((row) => row.reason === "member:institutional-precedent");
    expect(precedentRows.length).toBeGreaterThan(0);
    for (const row of precedentRows) expect(row.disposition).toBe("nay");
    expect(lawInForce(reversal.world, opened.jurisdictionId, propositionId)).toEqual(standing);
  });
});
