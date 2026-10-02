import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOnDate,
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../dates";
import { createStableId } from "../ids";
import { createOrganization, createWorkRelationship } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson, personName } from "../people";
import {
  createResourceFlow,
  createResourcePosition,
  makeCurrencyCode,
  money,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  createWorldId,
} from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { createPressTransitionRegistry } from "./transitions";
import { DEFAULT_MEDIA_OWNERSHIP_PACK } from "./ownership-pack-default";
import { reporterIsCurrent, reporterRoles } from "./outlets";
import {
  ensureMediaOwnership,
  mediaOwners,
  ownerDirectives,
  pressOwnerReviewHandler,
  PRESS_OWNER_REVIEW_TRANSITION_KEY,
} from "./ownership";
import { loadOwnershipPacks, type OwnershipRegistry } from "./ownership-packs";
import { PRESS_POLICY_VERSION } from "./records";
import { appendPressRecord } from "./store";

const seed = "team8-a145-recorded-payroll-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
const USD = makeCurrencyCode("USD");
const registry = loadOwnershipPacks([
  {
    id: "fixture.books",
    provenance: {
      kind: "authored-fiction",
      note: "Controlled owner, not a real company.",
    },
    practices: [
      {
        key: "fixture.cut",
        effect: "reduce-newsroom-staff",
        likelihoodPerReview: 1,
        description: "Review actual payroll capacity",
        parameters: { shareOfPositions: 0.5, minimumPositionsKept: 1 },
      },
    ],
    owners: [
      {
        key: "fixture.owner",
        ownerKind: "independent",
        names: ["Recorded fixture owner"],
        holds: {},
        foundingWeight: 1,
        reviewEveryDays: 30,
        sellsOutlets: false,
        practices: ["fixture.cut"],
      },
    ],
  },
]);
function fixture(
  usps: string,
  cash: number | null = 20000,
  missingPayroll = false,
  ownershipRegistry: OwnershipRegistry = registry,
  seedSuffix = "",
) {
  const date = makeIsoDate("2026-01-31"),
    worldSeed = `${seed}:${usps}${seedSuffix}`,
    state = stateJurisdictionForKey(`US-${usps}`)!;
  const people = Array.from({ length: 100 }, (_, index) =>
    createLightweightPerson({
      worldId: createWorldId(worldSeed),
      worldSeed,
      index,
      currentDate: date,
      homeJurisdictionId: state.id,
    }),
  )
    .filter((p) => ageOnDate(p.birthDate, date) >= 25)
    .slice(0, 3);
  expect(registry.report.rejections).toEqual([]);
  expect(people).toHaveLength(3);
  let world = createWorld({
    seed: worldSeed,
    currentDate: date,
    jurisdictions: [state],
    people,
  });
  world = createOrganization(world, {
    stableKey: "fixture:outlet",
    formedAt: addDays(date, -30),
    provenance: { kind: "authored", note: "Controlled recorded outlet" },
    initialProfile: {
      name: "Recorded fixture newsroom",
      classification: "enterprise:news-publishing",
      locationJurisdictionId: state.id,
    },
  });
  const organization = world.history.organizations.at(-1)!;
  const outlet = appendPressRecord(world, "media-outlet", {
    stableKey: "fixture:outlet",
    organizationId: organization.id,
    name: "Recorded fixture newsroom",
    product: "general-newspaper",
    scope: "state",
    primaryJurisdictionIds: [state.id],
    mediums: ["text"],
    beats: ["general-assignment"],
    resourceTier: "standard",
    cadence: "daily",
    acceptsDeepBackground: false,
    establishedAt: addDays(date, -30),
    policyVersion: PRESS_POLICY_VERSION,
    provenanceNote: "Explicit fixture, not a sourced newsroom",
  });
  world = outlet.world;
  for (let index = 0; index < people.length; index++) {
    const person = people[index]!;
    const startedAt = addDays(date, -20 + index);
    world = createWorkRelationship(world, {
      stableKey: `fixture:work:${index}`,
      personId: person.id,
      organizationId: organization.id,
      startedAt,
      kind: "employment:news-reporting",
      compensation: "paid",
      authority: "self-directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Explicit recorded reporter job" },
      initialRole: {
        title: "Reporter",
        occupationClassification: "profession:journalism",
        locationJurisdictionId: state.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: state.id,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!,
      role = world.history.workRoles.at(-1)!;
    world = appendPressRecord(world, "reporter-role", {
      stableKey: `fixture:reporter:${index}`,
      outletId: outlet.record.id,
      personId: person.id,
      workRelationshipId: work.id,
      workRoleId: role.id,
      title: "Reporter",
      beats: ["general-assignment"],
      geographyJurisdictionIds: [state.id],
      startedAt,
    }).world;
    if (!missingPayroll || index !== 2)
      world = createResourceFlow(world, {
        stableKey: `fixture:pay:${index}`,
        source: { kind: "organization", organizationId: organization.id },
        recipient: { kind: "person", personId: person.id },
        startsAt: startedAt,
        amount: money(10000, USD),
        cadenceKind: "schedule:town-monthly",
        basisKind: "compensation:work",
        basisReference: { kind: "work", workRelationshipId: work.id },
        restrictionKind: null,
        jurisdictionId: state.id,
        provenance: {
          kind: "authored",
          note: "Explicit fixture payroll, not a guessed salary",
        },
      });
  }
  if (cash !== null)
    world = createResourcePosition(world, {
      stableKey: "fixture:cash",
      owner: { kind: "organization", organizationId: organization.id },
      openedAt: date,
      openingBalance: money(cash, USD),
      provenance: {
        kind: "authored",
        note: "Explicit fixture cash, not an inferred book",
      },
    });
  // Saved business books are explicit fixture inputs, not inferred from cash.
  world = {
    ...world,
    townFinances: {
      version: "town-finances-v1",
      banks: {},
      markets: {},
      businesses: {
        [organization.id]: {
          organizationId: organization.id,
          openedAt: date,
          cash: cash === null ? 200 : cash / 100,
          debt: 0,
          annualRevenue: 1200,
          kind: "information",
          capacity: 1200,
          annualOtherCosts: 1200,
          margin: 0,
          ownDemandLog: 0,
          openingShare: 1,
          openingMarketSales: 1200,
          bankId: null,
          lineLimit: 0,
          lastQuarterNet: -300,
          lastQuarterPay: 300,
          lastRound: "2026-Q1",
        },
      },
    },
  };
  world = ensureMediaOwnership(world, ownershipRegistry);
  const owner = mediaOwners(world)[0]!;
  const due = world.history.futureDueItems.find(
    (d) =>
      d.transitionKey === PRESS_OWNER_REVIEW_TRANSITION_KEY &&
      d.stableKey.startsWith(`${owner.stableKey}:review:`),
  )!;
  world = {
    ...world,
    currentDate: due.dueAt,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, due.dueAt),
  };
  assertWorldIntegrity(world);
  return { world, owner, due };
}
describe("A145 newsroom cuts read recorded cash and payroll", () => {
  it.each(places)(
    "keeps the same recorded layoff result across world seeds in %s",
    (usps) => {
      const outcomes = [":a145-seed-a", ":a145-seed-b"].map((seedSuffix) => {
        const f = fixture(usps, 20000, false, registry, seedSuffix);
        const roles = reporterRoles(f.world);
        const after = pressOwnerReviewHandler(f.world, f.due, registry).world;
        assertWorldIntegrity(after);
        const directive = ownerDirectives(after, f.owner.id)[0]!;
        return {
          // Independent worlds retain their own valid identities. Compare
          // tenure rank and financial cause, never rewrite seed identity.
          ended: directive.endedWorkRelationshipIds.map((id) =>
            roles.findIndex((role) => role.workRelationshipId === id),
          ),
          current: roles.map((role) => reporterIsCurrent(after, role)),
          reason: after.history.events.find(
            (event) => event.id === directive.eventId,
          )!.context.motivation,
        };
      });
      expect(outcomes[0]).toEqual(outcomes[1]);
      expect(outcomes[0]!.ended).toEqual([2]);
    },
  );
  it("runs recorded payroll through the production press registry and clock", () => {
    // Controlled opening restricts eligible owners to an unchanged shipped row;
    // the clock uses the real default registry, not a private handler override.
    const opening = loadOwnershipPacks([
      {
        ...DEFAULT_MEDIA_OWNERSHIP_PACK,
        owners: (DEFAULT_MEDIA_OWNERSHIP_PACK.owners ?? []).filter(
          (row) => row.key === "owner.private-equity-chain",
        ),
      },
    ]);
    const f = fixture(places[0]!, 20000, false, opening);
    const previousDate = addDays(f.due.dueAt, -1);
    const before = {
      ...f.world,
      currentDate: previousDate,
      currentMoment: simulationMomentOnLocalDate(
        f.world.currentMoment,
        previousDate,
      ),
    };
    const handlers = createPressTransitionRegistry();
    const after = advanceWorld(before, 1, handlers);
    const directive = ownerDirectives(after, f.owner.id).find(
      (row) => row.effect === "reduce-newsroom-staff",
    )!;
    expect(directive.endedWorkRelationshipIds).toEqual([
      reporterRoles(before)[2]!.workRelationshipId,
    ]);
    expect(reporterIsCurrent(after, reporterRoles(before)[2]!)).toBe(false);
    expect(
      after.history.futureDueItems.some((row) =>
        row.stableKey.endsWith(":review:1"),
      ),
    ).toBe(true);
    assertWorldIntegrity(after);
    const loaded = deserializeWorld(serializeWorld(after));
    const continued = advanceWorld(loaded, 1, handlers);
    expect(
      ownerDirectives(continued, f.owner.id).filter(
        (row) => row.effect === "reduce-newsroom-staff",
      ),
    ).toHaveLength(1);
    expect(
      continued.history.workStatuses.filter(
        (row) =>
          row.workRelationshipId ===
            reporterRoles(before)[2]!.workRelationshipId &&
          row.status === "ended",
      ),
    ).toHaveLength(1);
  });
  it.each(places)(
    "ends only the least-senior position needed by actual payroll in %s",
    (usps) => {
      const f = fixture(usps),
        before = reporterRoles(f.world),
        after = pressOwnerReviewHandler(f.world, f.due, registry).world;
      const current = reporterRoles(after).filter((role) =>
        reporterIsCurrent(after, role),
      );
      expect(current.map((role) => role.id)).toEqual(
        before.slice(0, 2).map((role) => role.id),
      );
      const directive = ownerDirectives(after, f.owner.id)[0]!;
      expect(directive.endedWorkRelationshipIds).toEqual([
        before[2]!.workRelationshipId,
      ]);
      expect(after.history.resourcePositions).toBe(
        f.world.history.resourcePositions,
      );
      expect(after.history.resourceFlows).toBe(f.world.history.resourceFlows);
      expect(after.history.resourceTransferOutcomes).toBe(
        f.world.history.resourceTransferOutcomes,
      );
      const event = after.history.events.find(
        (event) => event.id === directive.eventId,
      )!;
      const reason = event.context.motivation;
      for (const terms of f.world.history.resourceFlowTerms) {
        expect(event.tags).toContain(`press.payroll-source:${terms.id}`);
        expect(event.involvedEntityIds).not.toContain(terms.id);
      }
      expect(reason).toContain("$200.00");
      expect(reason).toContain("$300.00");
      assertWorldIntegrity(after);
      const affectedPerson = after.people[before[2]!.personId]!;
      process.stdout.write(
        "A145 named payroll receipt " +
          JSON.stringify({
            jurisdiction: usps,
            personId: affectedPerson.id,
            name: personName(affectedPerson),
            workId: before[2]!.workRelationshipId,
            eventId: event.id,
            reason,
            sourceTags: event.tags.filter((tag) =>
              tag.startsWith("press.payroll-source:"),
            ),
          }) +
          "\n",
      );
      const payload = serializeWorld(after),
        loaded = deserializeWorld(payload);
      expect(serializeWorld(loaded)).toBe(payload);
      expect(pressOwnerReviewHandler(loaded, f.due, registry).world).toBe(
        loaded,
      );
    },
  );
  it.each(["missing-cash", "missing-payroll", "sufficient-cash"] as const)(
    "does not infer a cut from %s",
    (scenario) => {
      const f = fixture(
        places[0]!,
        scenario === "missing-cash"
          ? null
          : scenario === "sufficient-cash"
            ? 30000
            : 20000,
        scenario === "missing-payroll",
      );
      const after = pressOwnerReviewHandler(f.world, f.due, registry).world;
      expect(ownerDirectives(after, f.owner.id)).toEqual([]);
      expect(
        reporterRoles(after).filter((role) => reporterIsCurrent(after, role)),
      ).toEqual(reporterRoles(f.world));
      expect(after.history.workStatuses).toBe(f.world.history.workStatuses);
      assertWorldIntegrity(after);
    },
  );
  it("does not cut again for the same saved loss period on the next review", () => {
    const f = fixture(places[0]!);
    const handlers = createFutureTransitionHandlerRegistry([
      [
        PRESS_OWNER_REVIEW_TRANSITION_KEY,
        (world, due) => pressOwnerReviewHandler(world, due, registry),
      ],
    ]);
    const before = {
      ...f.world,
      currentDate: addDays(f.due.dueAt, -1),
      currentMoment: simulationMomentOnLocalDate(
        f.world.currentMoment,
        addDays(f.due.dueAt, -1),
      ),
    };
    const first = advanceWorld(before, 1, handlers);
    const after = advanceWorld(first, 30, handlers);
    expect(after.history.workStatuses).toBe(first.history.workStatuses);
    expect(ownerDirectives(after, f.owner.id)).toHaveLength(1);
  });

  it.each(["no-books", "no-loss", "reserves-cover-loss"] as const)(
    "does not infer layoffs from low cash with %s",
    (scenario) => {
      const f = fixture(places[0]!, 0);
      const store = f.world.townFinances!;
      const [organizationId, old] = Object.entries(store.businesses)[0]!;
      const world = {
        ...f.world,
        townFinances: {
          ...store,
          businesses:
            scenario === "no-books"
              ? {}
              : {
                  [organizationId]: {
                    ...old,
                    lastQuarterNet: scenario === "no-loss" ? 0 : -300,
                    cash: scenario === "reserves-cover-loss" ? 300 : 0,
                  },
                },
        },
      };
      const after = pressOwnerReviewHandler(world, f.due, registry).world;
      expect(ownerDirectives(after, f.owner.id)).toEqual([]);
      expect(after.history.workStatuses).toBe(world.history.workStatuses);
    },
  );

  it("uses actual payroll even when pack odds are zero and its kept minimum is unrelated", () => {
    const f = fixture(places[0]!);
    const noOdds = {
      ...registry,
      practices: new Map(
        [...registry.practices].map(([key, practice]) => [
          key,
          {
            ...practice,
            likelihoodPerReview: 0,
            parameters: { shareOfPositions: 0.5, minimumPositionsKept: 100 },
          },
        ]),
      ),
    };
    const after = pressOwnerReviewHandler(f.world, f.due, noOdds).world;
    expect(
      ownerDirectives(after, f.owner.id)[0]!.endedWorkRelationshipIds,
    ).toEqual([reporterRoles(f.world)[2]!.workRelationshipId]);
    assertWorldIntegrity(after);
  });
});
