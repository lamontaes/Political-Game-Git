import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { ensureNationalElectionJurisdiction } from "../national-election-geography";
import { createFormationContext, recordPrinciples } from "../politics";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { seatedCongressChamber, measureCosponsors } from "./congress-chambers";
import { fileMemberAgendaBills } from "./member-agenda";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
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

let world: World;
let observer: EntityId;
beforeAll(() => {
  const initial = fixture();
  observer = initial.subject;
  world = ensureLivingWorldOpening(
    ensureNationalElectionJurisdiction(initial.world),
    observer,
  );
  const members = ["house", "senate"].flatMap((key) =>
    seatedCongressChamber(world, key)!.body.members.flatMap((m) =>
      m.personId ? [m.personId] : [],
    ),
  );
  const question = world.policyCatalog.propositionOrder.find(
    (id) =>
      world.policyCatalog.propositions[id]!.stableKey ===
      "us-federal-positions:tax.raise-top-income-tax-rate",
  )!;
  world = aligned(world, members, question);
});

describe("the shared member filer, Congress parity in every jurisdiction", () => {
  expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "preserves filing records for an observer in %s",
    (place) => {
      const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
      expect(jurisdiction).not.toBeNull();
      const start: World = {
        ...world,
        control: { kind: "person", personId: observer },
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
        jurisdictions: {
          ...world.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: world.jurisdictionOrder.includes(jurisdiction.id)
          ? world.jurisdictionOrder
          : [...world.jurisdictionOrder, jurisdiction.id],
      };
      let next = start;
      for (const chamberKey of ["house", "senate"] as const)
        next = fileMemberAgendaBills(next, {
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          chamberKey,
          intakeKey: "g1-parity",
        });
      const bothHouses = fileMemberAgendaBills(start, {
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        intakeKey: "g1-parity",
      });
      expect(bothHouses.history).toEqual(next.history);
      const bills = next.history.legislativeMeasures ?? [];
      expect(bills.length).toBeGreaterThan(0);
      for (const bill of bills) {
        expect(bill.sponsorPersonId).not.toBeNull();
        expect(bill.sponsorPersonId).not.toBe(observer);
        expect(
          next.history.events.some(
            (e) =>
              e.type === "legislation.sponsor-motive" &&
              e.involvedEntityIds.includes(bill.id),
          ),
        ).toBe(true);
        expect(measureCosponsors(next, bill.id).length).toBeGreaterThan(0);
      }
      const fingerprint = createHash("sha256")
        .update(JSON.stringify(next.history))
        .digest("hex");
      // Full saved-history fingerprint captured on current main ab4ac1b8, before old-filer deletion.
      expect(fingerprint).toBe(
        "76cb37730224a8f15a1be5975eec6a19c41de5e5137c8175087b6118298c1a9a",
      );
      for (const chamberKey of ["house", "senate"] as const)
        expect(
          fileMemberAgendaBills(next, {
            jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
            chamberKey,
            intakeKey: "g1-parity",
          }),
        ).toBe(next);
    },
  );
});
