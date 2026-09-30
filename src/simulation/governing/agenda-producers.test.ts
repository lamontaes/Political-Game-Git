import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { createFormationContext, recordPrinciples } from "../politics";
import { stateJurisdictionForKey } from "../life-places";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  COSPONSOR_EVENT,
  measureCosponsors,
  seatedCongressChamber,
} from "./congress-chambers";
import { decideChamberVote, seatedChamberForPack } from "./chamber-votes";
import {
  CONGRESS_LAWMAKING_PROFILE,
  fileCongressBill,
} from "./congress-lawmaking";
import { fileMemberAgendaBills } from "./member-agenda";
import { principledLeaning } from "./officeholder-principles";
import { agendaCaucus } from "./majority-agenda";
import type { EntityId, World } from "../types";

// Direct filing producers, with complete canonical chambers and no calendar run.
function fixture() {
  const demo = createDemoWorld("majority-agenda-producer-fixture");
  const world = createWorld({
    seed: "majority-agenda-producer-fixture",
    currentDate: makeIsoDate("2026-02-01"),
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    policyCatalog: createProductionPolicyCatalog(),
  });
  return { world, subject: world.personOrder[0]! };
}
function aligned(
  world: World,
  ids: readonly EntityId[],
  propositionId?: EntityId,
) {
  const bearings = new Map(
    (propositionId
      ? (world.policyCatalog.propositions[propositionId]?.principles ?? [])
      : []
    ).map((b) => [b.principleId, b.bearing]),
  );
  return recordPrinciples(
    world,
    [...new Set(ids)].flatMap((personId) =>
      world.policyCatalog.principleOrder.map((principleId) => ({
        stableKey: `agenda-fixture:${personId}:${principleId}`,
        personId,
        principleId,
        formedAt: world.currentDate,
        stance:
          bearings.get(principleId) === "against"
            ? ("rejects" as const)
            : ("endorses" as const),
        strength: 1,
        conviction: "settled" as const,
        flexibility: "firm" as const,
        qualification: null,
        formation: createFormationContext("experience:life", {
          note: "Explicit shared principles for this filing unit fixture.",
        }),
        supersedesPrincipleRecordId: null,
      })),
    ),
  );
}
function backing(
  world: World,
  measure: NonNullable<World["history"]["legislativeMeasures"]>[number],
  members: readonly { personId: EntityId | null; partyKey?: string | null }[],
) {
  const answer = measure.propositionAnswers![0]!;
  const supports = (member: (typeof members)[number]) => {
    if (!member.personId) return false;
    const score = principledLeaning(
      world,
      member.personId,
      answer.propositionId,
    ).score;
    return (answer.answer === "yes" ? score : -score) > 0;
  };
  const caucus = agendaCaucus(members);
  expect(caucus.filter(supports).length).toBeGreaterThan(caucus.length / 2);
  expect(members.filter(supports).length).toBeGreaterThan(members.length / 2);
}

describe("majority-backed filing producers", () => {
  it("files an actual Congressional measure backed by both majorities", () => {
    const initial = fixture();
    let world = ensureLivingWorldOpening(
      ensureNationalElectionJurisdiction(initial.world),
      initial.subject,
    );
    const members = seatedCongressChamber(world, "house")!.body.members.filter(
      (m) => m.personId,
    );
    const propositionId = world.policyCatalog.propositionOrder.find(
      (id) =>
        world.policyCatalog.propositions[id]!.stableKey ===
        "us-federal-positions:tax.raise-top-income-tax-rate",
    )!;
    expect(propositionId).toBeDefined();
    world = aligned(
      world,
      members.map((m) => m.personId!),
      propositionId,
    );
    const next = fileCongressBill(world, {
      chamberKey: "house",
      intakeKey: "direct-unit-intake",
    });
    const measure = next.history.legislativeMeasures!.at(-1)!;
    expect(measure).toBeDefined();
    expect(measure.sponsorPersonId).not.toBeNull();
    backing(next, measure, members);
    const answer = measure.propositionAnswers![0]!;
    const expected = members.filter((member) => {
      if (member.personId === measure.sponsorPersonId) return false;
      const score = principledLeaning(
        next,
        member.personId!,
        answer.propositionId,
      ).score;
      return (
        (answer.answer === "yes" ? score : -score) >=
        CONGRESS_LAWMAKING_PROFILE.filingThreshold
      );
    });
    const sponsor = members.find(
      (member) => member.personId === measure.sponsorPersonId,
    )!;
    expect(
      expected.filter((member) => member.partyKey !== sponsor.partyKey).length,
    ).toBeGreaterThan(0);
    expect([...measureCosponsors(next, measure.id)].sort()).toEqual(
      expected.map((member) => member.personId!).sort(),
    );

    // A neutral unit fixture isolates the cue heard by an unsigned peer.
    // The real filing above is preserved; this is not a watched-world claim.
    const opposition = members
      .filter((member) => member.partyKey !== sponsor.partyKey)
      .slice(0, 2);
    const signer = opposition[0]!;
    const unsigned = opposition[1]!;
    const signed = next.history.events.find(
      (event) =>
        event.type === COSPONSOR_EVENT &&
        event.involvedEntityIds.includes(measure.id),
    )!;
    const cueWorld: World = {
      ...next,
      history: {
        ...initial.world.history,
        legislativeMeasures: [
          { ...measure, propositionIds: [], propositionAnswers: [] },
        ],
        events: [
          {
            ...signed,
            involvedEntityIds: [measure.id, signer.personId!],
            participants: [
              {
                personId: signer.personId!,
                role: "agency:cosponsor",
                detail: "Explicit cross-party signer in the cue fixture.",
              },
            ],
          },
        ],
      },
    };
    const ballots = decideChamberVote(cueWorld, {
      stableKey: "cross-party-signature-cue",
      question: {
        question: {
          measureId: measure.id,
          purpose: "floor-stage",
          forumKey: "house",
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Pass this measure?",
      },
      members: [sponsor, signer, unsigned],
      contested: true,
    });
    expect(
      ballots.find((ballot) => ballot.personId === signer.personId),
    ).toMatchObject({ disposition: "yea", reason: "member:cosponsor" });
    expect(
      ballots.find((ballot) => ballot.personId === unsigned.personId),
    ).toMatchObject({ disposition: "nay", reason: "member:party-cue:other" });
    expect(
      fileCongressBill(next, {
        chamberKey: "house",
        intakeKey: "direct-unit-intake",
      }),
    ).toBe(next);
  });
  it("files actual state measures backed by their seated chambers", () => {
    const initial = fixture();
    let world = ensureWorldStartingConditions(initial.world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    });
    world = ensureStateLegislatureOpening(world, initial.subject, "CO");
    const jurisdictionId = stateJurisdictionForKey("US-CO")!.id;
    const pack = legislativePackForJurisdiction(jurisdictionId)!;
    const chambers = pack.chambers.map((chamber) => ({
      chamber,
      members: seatedChamberForPack(
        world,
        pack.packId,
        chamber.chamberKey,
        chamber.name,
      )!.body.members.filter((m) => m.personId),
    }));
    world = aligned(
      world,
      chambers.flatMap(({ members }) => members.map((m) => m.personId!)),
    );
    const next = fileMemberAgendaBills(world, {
      jurisdictionId,
      intakeKey: "direct-state-unit-intake",
    });
    const measures = next.history.legislativeMeasures ?? [];
    expect(measures.length).toBeGreaterThan(0);
    for (const measure of measures) {
      const chamber = chambers.find(
        (c) => c.chamber.chamberKey === measure.originChamberKey,
      )!;
      expect(chamber).toBeDefined();
      backing(next, measure, chamber.members);
    }
  });
});
