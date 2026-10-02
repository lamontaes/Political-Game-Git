import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  ensureLocalGovernmentOrganization,
  localGovernmentOrganizationKey,
  placeLocalGovernmentUnits,
} from "../nationwide-world/local-governments";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createWorkRelationship,
  type CreateWorkRelationshipInput,
} from "../life";
import { createWorkCompensation, makeCurrencyCode } from "../resources";
import { recordWorldEvent } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  bindRecordedOpeningProsecutor,
  recordedProsecutorPayComparison,
} from "./opening-prosecutor";

const provenance = {
  kind: "authored" as const,
  note: "Controlled appointment and legal pay proof; no ordinary legal authority inferred.",
};
function fixture() {
  const place = drawRandomPlace("gate-2080-2026-10-02");
  const small = smallWorld({ place: place.key, seed: "a104:opening-adapter" });
  const county = placeLocalGovernmentUnits(place).counties[0]!;
  expect(county).toBeDefined();
  let world = ensureLocalGovernmentOrganization(small.world, county);
  const employer = world.history.organizations.find(
    (row) => row.stableKey === localGovernmentOrganizationKey(county),
  )!.id;
  const personId = world.personOrder.find((id) => id !== small.personId)!;
  expect(personId).toBeDefined();
  const work: CreateWorkRelationshipInput = {
    stableKey: "a104:appointed-work",
    personId,
    organizationId: employer,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "paid",
    authority: "self-directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Prosecutor",
      occupationClassification: "profession:prosecutor",
      locationJurisdictionId: small.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 0 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: small.jurisdictionId,
      },
    },
  };
  world = recordWorldEvent(world, {
    stableKey: "a104:appointment",
    type: "governing.appointment",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: small.jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "agency:appointed",
        detail: "Controlled saved appointment",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary: "Controlled prosecutor appointment",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world, work, appointmentEventId: world.history.events.at(-1)!.id };
}
describe("A104 existing appointment to one compensated prosecutor role", () => {
  it("binds exact recorded pay and preserves the single join after reload", () => {
    const f = fixture();
    const input = {
      ...f,
      compensation: {
        stableKey: "a104:exact-pay",
        startsAt: f.world.currentDate,
        amount: { minorUnits: 123400, currency: makeCurrencyCode("USD") },
        cadenceKind: "work:monthly" as const,
        restrictionKind: null,
        jurisdictionId: f.work.initialRole.locationJurisdictionId,
        provenance,
      },
    };
    const bound = bindRecordedOpeningProsecutor(f.world, input);
    expect(bound.history.resourceFlowTerms.at(-1)!.amount.minorUnits).toBe(
      123400,
    );
    expect(bound.history.resourceFlows.at(-1)!.basisReference).toEqual({
      kind: "work",
      workRelationshipId: bound.history.workRelationships.at(-1)!.id,
    });
    const reopened = deserializeWorld(serializeWorld(bound));
    expect(serializeWorld(bindRecordedOpeningProsecutor(reopened, input))).toBe(
      serializeWorld(reopened),
    );
  });
  it("estimates from current comparable legal records with their actual spread", () => {
    const f = fixture();
    let world = f.world;
    for (const [index, amount] of [10000, 30000].entries()) {
      world = createWorkRelationship(world, {
        ...f.work,
        stableKey: `a104:lawyer:${index}`,
        initialRole: {
          ...f.work.initialRole,
          occupationClassification: "profession:lawyer",
        },
      });
      world = createWorkCompensation(world, {
        stableKey: `a104:lawyer-pay:${index}`,
        workRelationshipId: world.history.workRelationships.at(-1)!.id,
        startsAt: world.currentDate,
        amount: { minorUnits: amount, currency: makeCurrencyCode("USD") },
        cadenceKind: "work:monthly",
        restrictionKind: null,
        jurisdictionId: f.work.initialRole.locationJurisdictionId,
        provenance,
      });
    }
    const estimate = recordedProsecutorPayComparison(world)!;
    expect(estimate.amount.minorUnits).toBe(20000);
    expect(estimate.spreadMinor).toBe(10000);
    expect(estimate.comparisons).toHaveLength(2);
    const bound = bindRecordedOpeningProsecutor(world, f);
    const terms = bound.history.resourceFlowTerms.at(-1)!;
    expect(terms.amount).toEqual(estimate.amount);
    expect(terms.provenance).toMatchObject({
      kind: "authored",
      note: expect.stringContaining("ESTIMATED FROM CURRENT GAME"),
    });
    for (const row of estimate.comparisons)
      expect((terms.provenance as { note: string }).note).toContain(
        row.termsId,
      );
  });
  it("reads comparable pay from an ordinary random opening and preserves it on reload", () => {
    const seed = "gate-2080-2026-10-02";
    const place = drawRandomPlace(seed);
    const opening = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    );
    expect(opening.game).not.toBeNull();
    const world = opening.game!.world;
    const comparison = recordedProsecutorPayComparison(world);
    console.info(
      "A104 ordinary pay cohort",
      JSON.stringify({
        seed,
        place: place.displayName,
        legalWorkRoles: world.history.workRoles.filter((row) =>
          [
            "profession:lawyer",
            "profession:attorney",
            "profession:prosecutor",
          ].includes(row.occupationClassification ?? ""),
        ).length,
        comparison,
      }),
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.comparisons.length).toBeGreaterThan(0);
    expect(
      recordedProsecutorPayComparison(deserializeWorld(serializeWorld(world))),
    ).toEqual(comparison);
  });
  it("does not invent an appointment or an empty pay cohort", () => {
    const f = fixture();
    const before = serializeWorld(f.world);
    expect(() =>
      bindRecordedOpeningProsecutor(f.world, {
        ...f,
        appointmentEventId: f.work.personId,
      }),
    ).toThrow("actual dated appointment");
    expect(() => bindRecordedOpeningProsecutor(f.world, f)).toThrow(
      "pay cohort",
    );
    expect(serializeWorld(f.world)).toBe(before);
  });
});
