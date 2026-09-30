import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { createProductionPolicyCatalog } from "./production-catalog";
import { createPolicyCatalog } from "./policy";
import { ensureJurisdiction } from "./national-election-geography";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../presentation/observer-world";
import { lifePlaceByKey, stateJurisdictionForKey } from "./life-places";
import { legislatureForState } from "./legislature-game-profile";
import { principledLeaning } from "./governing/officeholder-principles";
import { createWorkRelationship, recordWorkStatus } from "./life";
import { workStatusAt } from "./life-queries";
import {
  residentApplicationBlocked,
  applyForJobAsResident,
} from "./job-market";
import {
  lobbyingBar,
  officeState,
  COOLING_OFF_QUESTION,
} from "./lobbying-cooling-off";
import {
  ensureCapitalLobbyingOpening,
  reviewPostOfficeCareer,
} from "./post-office-careers";
import { resourcePositionAt } from "./resource-queries";
import { money } from "./resources";
import { assertWorldIntegrity } from "./world";

/** Six canonical people and one authored office; no nationwide opening or unrelated careers. */
function boundedOfficeFixture() {
  const place = lifePlaceByKey("1700113")!;
  let world = createDemoWorld("cooling-off-records", {
    context: place.context,
  });
  const production = createProductionPolicyCatalog();
  const existing = world.policyCatalog;
  world = {
    ...world,
    policyCatalog: createPolicyCatalog({
      catalogVersion: "controlled-post-office-law",
      domains: Object.values({ ...existing.domains, ...production.domains }),
      issues: Object.values({ ...existing.issues, ...production.issues }),
      propositions: Object.values({
        ...existing.propositions,
        ...production.propositions,
      }),
      subjects: Object.values({ ...existing.subjects, ...production.subjects }),
      principles: Object.values({
        ...existing.principles,
        ...production.principles,
      }),
    }),
  };
  const state = stateJurisdictionForKey("US-IL")!;
  world = ensureJurisdiction(world, state);
  const personId = world.personOrder[3]!;
  world = createWorkRelationship(world, {
    stableKey: "controlled-former-legislator-office",
    personId,
    organizationId: world.history.organizations[0]!.id,
    startedAt: world.currentDate,
    kind: "employment:legislative-member",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "One fictional public-office relationship for the bounded eligibility/pay regression.",
    },
    initialRole: {
      title: "State legislator",
      occupationClassification: "occupation:legislator",
      locationJurisdictionId: state.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: state.id,
      },
    },
  });
  assertWorldIntegrity(world);
  return { world, anchorPersonId: personId };
}

describe("post-office lobbying uses real vacancies and eligibility", () => {
  it("blocks an actual former member from the lobbying application and leaves a lower-paid next choice", () => {
    const opened = boundedOfficeFixture();
    const question = Object.values(
      opened.world.policyCatalog.propositions,
    ).find((p) => p.stableKey === COOLING_OFF_QUESTION)!;
    const input = {
      jurisdictionId: stateJurisdictionForKey("US-IL")!.id,
      rulePackId: legislatureForState("US-IL")!.packId,
      propositionId: question.id,
      sponsorPersonId: opened.anchorPersonId,
    };
    const noBar = prepareLawPair(opened.world, {
      ...input,
      answer: "no",
    }).treated;
    const office = noBar.history.workRelationships.find(
      (w) =>
        w.kind === "employment:legislative-member" &&
        officeState(noBar, w) === "US-IL" &&
        workStatusAt(noBar, w.id)?.status === "active" &&
        principledLeaning(noBar, w.personId, question.id).score <= 0,
    )!;
    expect(office).toBeDefined();
    const departed = recordWorkStatus(noBar, {
      stableKey: "controlled-office-departure",
      workRelationshipId: office.id,
      effectiveAt: noBar.currentDate,
      status: "ended",
      reason: "Controlled fictional office departure for the matched law test.",
      provenance: {
        kind: "authored",
        note: "Matched actual office relationship ended before either intervention arm.",
      },
      supersedesStatusId: workStatusAt(noBar, office.id)!.id,
    });
    const base = ensureCapitalLobbyingOpening(departed, "US-IL");
    const lobbying = base.history.jobOpenings!.find((o) =>
      o.stableKey.startsWith("capital-lobbying-firm:US-IL"),
    )!;
    const pair = prepareLawPair(base, {
      ...input,
      policyTerms: [
        {
          questionKey: COOLING_OFF_QUESTION,
          values: { coolingMonths: 24 },
          reason: "Controlled two-year cooling-off period.",
          principleRecordIds: [],
        },
      ],
    });
    expect(
      lobbyingBar(pair.control, office.personId, lobbying.organizationId),
    ).toBeNull();
    expect(
      lobbyingBar(pair.treated, office.personId, lobbying.organizationId),
    ).toContain("24-month waiting period");
    expect(
      residentApplicationBlocked(pair.control, office.personId, lobbying.id),
    ).toBeNull();
    expect(
      applyForJobAsResident(pair.treated, office.personId, lobbying.id).ok,
    ).toBe(false);
    const control = reviewPostOfficeCareer(pair.control, office.personId);
    const treated = reviewPostOfficeCareer(pair.treated, office.personId);
    const selected = (w: typeof treated) =>
      w.history.jobApplications!.find((a) => a.personId === office.personId)!;
    const controlOpening = control.history.jobOpenings!.find(
      (o) => o.id === selected(control).openingId,
    )!;
    const treatedOpening = treated.history.jobOpenings!.find(
      (o) => o.id === selected(treated).openingId,
    )!;
    expect(controlOpening.organizationId).toBe(lobbying.organizationId);
    expect(treatedOpening.organizationId).not.toBe(lobbying.organizationId);
    expect(controlOpening.pay.amount.minorUnits).toBeGreaterThan(
      treatedOpening.pay.amount.minorUnits,
    );
    const controlPaid = advanceObservedWorld(control, 24);
    const treatedPaid = advanceObservedWorld(treated, 24);
    const cash = (w: typeof treated) =>
      resourcePositionAt(
        w,
        { kind: "person", personId: office.personId },
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
    console.log(
      JSON.stringify({
        law: COOLING_OFF_QUESTION,
        controlAnnualPayDollars: controlOpening.pay.amount.minorUnits / 100,
        treatedAnnualPayDollars: treatedOpening.pay.amount.minorUnits / 100,
        controlCashDollars: cash(controlPaid) / 100,
        treatedCashDollars: cash(treatedPaid) / 100,
        cashDifferenceDollars: (cash(treatedPaid) - cash(controlPaid)) / 100,
      }),
    );
    expect(cash(controlPaid)).toBeGreaterThan(cash(treatedPaid));
    assertWorldIntegrity(treatedPaid);
  }, 180000);
});
