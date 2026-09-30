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
import { seatedCongressChamber } from "./congress-chambers";
import { seatedChamberForPack } from "./chamber-votes";
import { fileCongressBill } from "./congress-lawmaking";
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
      ? world.policyCatalog.propositions[propositionId]?.principles ?? []
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
