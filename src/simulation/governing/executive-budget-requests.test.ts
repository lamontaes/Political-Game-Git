import { describe, expect, it } from "vitest";
import {
  enactedBudgetComparisonPreview,
  recordedGovernorBudgetPreview,
} from "../../../tests/fixtures/session23-executive-budget";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { city } from "../../../tests/fixtures/public-program-fixture";
import { addDays, daysBetween, makeIsoDate } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import { money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { workItemState } from "../time-work";
import type { World } from "../types";
import { advanceWorld } from "../world";
import {
  GOVERNING_SEASON,
  scheduleGoverningSeasons,
} from "./governing-calendar";
import {
  decideGoverningBudgetRequest,
  decideGoverningMatter,
  GOVERNING_DEADLINE,
  governingDeadlineHandler,
  governingMatterById,
  governingMatters,
  governingOfficeForPerson,
  governorOfficeForJurisdiction,
  governingSeasonHandler,
  synchronizeMunicipalGoverningOffices,
} from "./state-governing";
import {
  enactedFamilyAppropriations,
  BUDGET_DOLLARS,
  executiveBudgetIdentity,
  executiveBudgetRequestPeriod,
  executiveBudgetRequests,
  parseExecutiveBudgetDollars,
  recordExecutiveBudgetRequest,
} from "./executive-budget-requests";

function governorBudget() {
  const fixture = smallWorld({
    place: "NE",
    date: "2026-11-30",
    seed: "session23-budget-dollars",
    offices: ["governor"],
  });
  const office = governorOfficeForJurisdiction(fixture.world, "US-NE")!;
  let world: World = {
    ...fixture.world,
    control: { kind: "person", personId: office.holderPersonId },
  };
  world = scheduleGoverningSeasons(
    world,
    office.officeKey,
    office.jurisdictionId,
  );
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === GOVERNING_SEASON &&
      item.stableKey.includes(":budget:"),
  )!;
  world = advanceWorld(
    world,
    daysBetween(world.currentDate, due.dueAt),
    createFutureTransitionHandlerRegistry([
      [GOVERNING_SEASON, governingSeasonHandler],
    ]),
  );
  const matter = governingMatters(world, office.officeKey).find(
    (entry) => entry.family === "budget" && entry.status === "open",
  )!;
  return { world, office, matter };
}

const input = {
  startsOn: makeIsoDate("2027-07-01"),
  endsOn: makeIsoDate("2028-06-30"),
  lines: [{ familyKey: "transit-access", amount: money(75_000_25, "USD") }],
};

describe("executive dollar requests", () => {
  it("keeps an unanswered dollar request optional without a deadline or blocking another controlled role", () => {
    const g = governorBudget();
    expect(g.matter.deadline).toBeNull();
    const work = g.world.history.workItems.find(
      (item) => item.stableKey === `${g.matter.stableKey}:work`,
    )!;
    expect(workItemState(g.world, work.id)).toMatchObject({
      playerRequirement: "none",
      assignedPersonIds: [g.office.holderPersonId],
    });
    expect(
      g.world.history.futureDueItems.some(
        (item) =>
          item.transitionKey === GOVERNING_DEADLINE &&
          item.entityIds.includes(g.matter.id),
      ),
    ).toBe(false);
    const observer: World = { ...g.world, control: { kind: "observer" } };
    // An earlier candidate saved a deadline item for these tagged requests.
    const withOldDeadline = scheduleFutureDueItem(observer, {
      stableKey: `${g.matter.stableKey}:deadline`,
      dueAt: addDays(observer.currentDate, 1),
      transitionKey: GOVERNING_DEADLINE,
      entityIds: [g.matter.id],
      jurisdictionId: g.office.jurisdictionId,
      provenance: { kind: "simulated", sourceEntityIds: [g.matter.id] },
    });
    const later = advanceWorld(
      withOldDeadline,
      1,
      createFutureTransitionHandlerRegistry([
        [GOVERNING_DEADLINE, governingDeadlineHandler],
      ]),
    );
    const saved = deserializeWorld(serializeWorld(later));
    expect(governingMatterById(saved, g.matter.id)).toMatchObject({
      status: "open",
      deadline: null,
    });
    expect(executiveBudgetRequests(saved)).toHaveLength(0);
  });

  it("records the actual governor's amounts, completes its matter and survives reload without funding an account", () => {
    const g = governorBudget();
    expect(g.matter.options.map((entry) => entry.key)).toEqual([
      BUDGET_DOLLARS,
      "budget:hold-flat",
    ]);
    const beforeResources = g.world.history.resourceTransferOutcomes;
    const beforeAppropriations = g.world.history.publicProgramRecords;
    const chosen = decideGoverningBudgetRequest(g.world, g.matter.id, input);
    expect(chosen.ok, chosen.ok ? "" : chosen.reason).toBe(true);
    const saved = deserializeWorld(serializeWorld(chosen.world));
    const request = executiveBudgetRequests(saved)[0]!;
    const decision = governingMatterById(saved, g.matter.id)!.decision!;
    expect(request).toMatchObject({
      matterId: g.matter.id,
      decisionEventId: decision.id,
      personId: g.office.holderPersonId,
      governmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: g.office.jurisdictionId,
      },
      ...input,
    });
    expect(request.event.tags).toContain(`source-event:${decision.id}`);
    expect(saved.history.resourceTransferOutcomes).toEqual(beforeResources);
    expect(saved.history.publicProgramRecords).toEqual(beforeAppropriations);
    expect(governingMatterById(saved, g.matter.id)?.status).toBe("decided");
    expect(
      recordExecutiveBudgetRequest(saved, {
        ...input,
        matterId: g.matter.id,
        decisionEventId: decision.id,
      }),
    ).toBe(saved);
    expect(
      decideGoverningBudgetRequest(saved, g.matter.id, input),
    ).toMatchObject({ ok: false, world: saved });
  });

  it("refuses missing amounts, invalid periods and a different actor without completing or mutating the matter", () => {
    const g = governorBudget();
    for (const invalid of [
      { ...input, lines: [] },
      { ...input, endsOn: makeIsoDate("2026-01-01") },
      {
        ...input,
        lines: [{ familyKey: "not-a-family", amount: money(100, "USD") }],
      },
      {
        ...input,
        lines: [
          {
            familyKey: "transit-access",
            amount: { ...money(0, "USD"), minorUnits: -1 },
          },
        ],
      },
    ]) {
      const refused = decideGoverningBudgetRequest(
        g.world,
        g.matter.id,
        invalid,
      );
      expect(refused.ok).toBe(false);
      expect(refused.world).toBe(g.world);
    }
    expect(
      decideGoverningMatter(g.world, g.matter.id, BUDGET_DOLLARS),
    ).toMatchObject({ ok: false, world: g.world });
    const other = g.world.personOrder.find(
      (id) => id !== g.office.holderPersonId,
    )!;
    const world: World = {
      ...g.world,
      control: { kind: "person", personId: other },
    };
    expect(
      decideGoverningBudgetRequest(world, g.matter.id, input),
    ).toMatchObject({ ok: false, world });
    expect(governingMatterById(g.world, g.matter.id)?.status).toBe("open");
  });

  it("keeps a municipal request on its exact government identity rather than the geographic account scope", () => {
    const g = city("session23-local-budget-request", 1_000_000_00);
    const world = synchronizeMunicipalGoverningOffices({
      ...g.world,
      control: { kind: "person", personId: g.mayor },
    });
    const office = governingOfficeForPerson(world, g.mayor)!;
    const matter = governingMatters(world, office.officeKey).find(
      (entry) => entry.family === "budget",
    )!;
    const chosen = decideGoverningBudgetRequest(world, matter.id, {
      ...input,
      startsOn: world.currentDate,
      endsOn: addDays(world.currentDate, 30),
    });
    expect(chosen.ok, chosen.ok ? "" : chosen.reason).toBe(true);
    const identity = executiveBudgetIdentity(chosen.world, g.mayor)!;
    expect(identity).toEqual({
      kind: "local-government",
      governmentKey: g.governmentKey,
      jurisdictionId: g.jurisdictionId,
    });
    expect(executiveBudgetRequests(chosen.world, identity)).toHaveLength(1);
    expect(
      executiveBudgetRequests(chosen.world, {
        kind: "jurisdiction",
        jurisdictionId: g.jurisdictionId,
      }),
    ).toHaveLength(0);
    expect(chosen.world.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
  });

  it("compares the request with the different amount from an actual enacted, source-linked program bill", () => {
    const fixture = smallWorld({
      place: "NE",
      seed: "session23-budget-comparison",
      offices: ["governor", "state-legislature"],
    });
    const former = governorOfficeForJurisdiction(fixture.world, "US-NE")!;
    const originalPerson = fixture.world.people[fixture.personId]!;
    const opened = recordedGovernorBudgetPreview(
      fixture.world,
      "session23-budget-comparison",
    );
    const office = governingOfficeForPerson(opened, fixture.personId)!;
    expect(office.holderPersonId).toBe(fixture.personId);
    expect(office.termEndsAt).toBe(former.termEndsAt);
    expect(opened.people[fixture.personId]).toEqual(originalPerson);
    expect(opened.history.electionContestResults).toEqual(
      fixture.world.history.electionContestResults,
    );
    const matter = governingMatters(opened, office.officeKey).find(
      (entry) => entry.family === "budget",
    )!;
    const chosen = decideGoverningBudgetRequest(opened, matter.id, {
      startsOn: opened.currentDate,
      endsOn: addDays(opened.currentDate, 366),
      lines: [
        { familyKey: "transit-access", amount: money(4_000_000_25, "USD") },
      ],
    });
    expect(chosen.ok, chosen.ok ? "" : chosen.reason).toBe(true);
    const beforeTransfers = chosen.world.history.resourceTransferOutcomes;
    const enacted = enactedBudgetComparisonPreview(
      chosen.world,
      "session23-budget-comparison",
    );
    const saved = deserializeWorld(serializeWorld(enacted));
    const request = executiveBudgetRequests(saved)[0]!;
    const authorizations = enactedFamilyAppropriations(
      saved,
      request,
      "transit-access",
    );
    expect(authorizations).toHaveLength(1);
    expect(authorizations[0]!.amount).toEqual(money(3_000_000_00, "USD"));
    expect(authorizations[0]!.sourceMeasureId).toBe(
      saved.history.legislativeEnactments!.at(-1)!.measureId,
    );
    expect(request.lines[0]!.amount).toEqual(money(4_000_000_25, "USD"));
    expect(saved.history.resourceTransferOutcomes).toEqual(beforeTransfers);
    expect(
      enactedFamilyAppropriations(saved, request, "health-service-capacity"),
    ).toHaveLength(0);
  }, 120_000);

  it("takes the next period from the existing fiscal source and parses exact cents without rounding", () => {
    const g = governorBudget();
    expect(
      executiveBudgetRequestPeriod(g.world, g.office.holderPersonId),
    ).toMatchObject({ startsOn: "2027-07-01", endsOn: "2028-06-30" });
    expect(parseExecutiveBudgetDollars("75000.25")).toEqual(
      money(75_000_25, "USD"),
    );
    expect(parseExecutiveBudgetDollars("0")).toEqual(money(0, "USD"));
    for (const value of [
      "",
      "-1",
      "1.001",
      "1e6",
      "12,000",
      "90071992547409.92",
    ])
      expect(parseExecutiveBudgetDollars(value)).toBeNull();
  });
});
