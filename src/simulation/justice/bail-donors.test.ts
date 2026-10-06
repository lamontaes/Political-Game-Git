import { createOrganization, createWorkRelationship } from "../life";
import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { ensureOpeningJudiciary } from "../judiciary/opening";
import { createResourcePosition, money } from "../resources";
import { ensureTaxPublicAccount } from "../tax-policy";
import { SeededRng } from "../rng";
import { advanceWorld, recordWorldEvent } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import { stateJurisdictionForKey } from "../life-places";
import type { EntityId, World } from "../types";
import { newChargeBailAmount, recordedChargeBailMinorUnits } from "./pretrial";
import { advanceProsecutions, referForProsecution } from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import type { ComparableAmountApplicability } from "../law-consequence-types";
import { censusRegionOf } from "../world-setup/census-regions";

const question = "us-policy-positions:justice-public-safety.end-cash-bail";
const state = new SeededRng("session20-bail-donors").pick(
  Object.entries(startingLaw.questions[question].answers)
    .filter(([, row]) => row.answer === "no")
    .map(([key]) => key)
    .sort(),
);
let base: World;
let person: EntityId;
let courtId: string;
const venueJurisdictionId = stateJurisdictionForKey(state)!.id;
function donor(
  world: World,
  key: string,
  amount: string,
  offense = "crime:robbery",
  court = courtId,
  applicability?: Extract<
    ComparableAmountApplicability,
    { kind: "court-charge-cohort" }
  >,
): World {
  return recordWorldEvent(world, {
    stableKey: `authored-bail-donor:${key}`,
    type: "justice.charged",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: venueJurisdictionId,
    involvedEntityIds: [person],
    participants: [{ personId: person, role: "focus:defendant", detail: null }],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `justice.offense:${offense}`,
      `justice.court:${court}`,
      `justice.cash-bail-amount:${amount}`,
      ...(applicability
        ? [`justice.bail-applicability:${JSON.stringify(applicability)}`]
        : []),
    ],
    summary:
      "Authored controlled charge amount, not measured starting court data.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
const input = () => ({
  venueJurisdictionId,
  offenseKey: "crime:robbery",
  courtId,
});
describe(`current-game bail donors (${state}, session20-bail-donors)`, () => {
  beforeAll(() => {
    const small = smallWorld({
      place: state,
      seed: "session20-bail-donors",
      household: true,
    });
    person = small.personId;
    base = ensureOpeningJudiciary(small.world);
    courtId = Object.values(base.judiciary!.courts).find(
      (court) =>
        court.jurisdictionId === venueJurisdictionId &&
        court.level === "local-general-trial",
    )!.courtId;
  });
  it("reports the empty actual cohort without treating a research median as a donor", () => {
    expect(
      base.history.events.filter((event) => event.type === "justice.charged"),
    ).toHaveLength(0);
    expect(newChargeBailAmount(base, input())).toBeNull();
  });
  it("uses the shared exact cohort only with saved class, region and court evidence", () => {
    const applicability: Extract<
      ComparableAmountApplicability,
      { kind: "court-charge-cohort" }
    > = {
      kind: "court-charge-cohort",
      courtLevelKey: base.judiciary!.courts[courtId]!.level,
      courtKey: courtId,
      offenseKey: "crime:robbery",
      offenseClassKey: "authored-control-class",
      region: censusRegionOf(state.slice(3)),
    };
    const query = { ...input(), applicability };
    const old = donor(base, "no-class-evidence", "12000");
    expect(newChargeBailAmount(old, query)).toBeNull();
    expect(newChargeBailAmount(old, input())!.amount).toBe(12000);
    const saved = donor(
      base,
      "exact-cohort",
      "12000",
      "crime:robbery",
      courtId,
      applicability,
    );
    const result = newChargeBailAmount(saved, query)!;
    expect(result.amount).toBe(12000);
    expect(result.provenanceTags).toContain(
      `justice.bail-applicability:${JSON.stringify(applicability)}`,
    );
    for (const delta of [
      { offenseClassKey: "different-class" },
      { courtKey: null },
      { courtLevelKey: "different-level" },
      { offenseKey: "crime:assault" },
      {
        region:
          applicability.region === "south"
            ? ("west" as const)
            : ("south" as const),
      },
    ])
      expect(
        newChargeBailAmount(saved, {
          ...query,
          applicability: { ...applicability, ...delta },
        }),
      ).toBeNull();
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(newChargeBailAmount(loaded, query)).toEqual(result);
  });
  it("uses bounded observed spread and retains exact donor evidence after reload", () => {
    const world = donor(donor(base, "low", "10000"), "high", "30000");
    const result = newChargeBailAmount(world, input())!;
    expect(result.amount).toBeGreaterThanOrEqual(10000);
    expect(result.amount).toBeLessThanOrEqual(30000);
    expect(result.provenanceTags).toContain("justice.bail-donor-mean:20000");
    expect(
      result.provenanceTags.filter((tag) =>
        tag.startsWith("justice.bail-donor:"),
      ),
    ).toHaveLength(2);
    expect(
      newChargeBailAmount(deserializeWorld(serializeWorld(world)), input()),
    ).toEqual(result);
  });
  it("rejects other offenses, invalid amounts and unavailable courts", () => {
    const world = donor(
      donor(donor(base, "wrong", "90000", "crime:assault"), "invalid", "NaN"),
      "court",
      "10000",
      "crime:robbery",
      "absent-court",
    );
    expect(newChargeBailAmount(world, input())).toBeNull();
  });
  it("rejects later-recorded charges and prefers the actual same-court cohort", () => {
    let world = donor(base, "local", "12000");
    const another = Object.values(base.judiciary!.courts).find(
      (court) =>
        court.level === "local-general-trial" && court.courtId !== courtId,
    )!;
    world = donor(
      world,
      "other-court",
      "90000",
      "crime:robbery",
      another.courtId,
    );
    expect(newChargeBailAmount(world, input())!.amount).toBe(12000);
    const earlier = {
      ...world,
      history: {
        ...world.history,
        nextSequence: world.history.events.find(
          (event) => event.stableKey === "authored-bail-donor:local",
        )!.sequence,
      },
    };
    expect(newChargeBailAmount(earlier, input())).toBeNull();
  });
  it("the existing charge consumer immediately saves the modeled amount without player estimate wording", () => {
    let world = createResourcePosition(
      ensureTaxPublicAccount(base, venueJurisdictionId),
      {
        stableKey: "authored-bail-donor:controlled-wallet",
        owner: { kind: "person", personId: person },
        openedAt: base.currentDate,
        openingBalance: money(12000, "USD"),
        provenance: {
          kind: "authored",
          note: "Controlled cash for donor-path payment proof; not generated wages.",
        },
      },
    );
    for (const court of Object.values(base.judiciary!.courts).filter(
      (court) => court.level === "local-general-trial",
    ))
      world = donor(
        world,
        `consumer:${court.courtId}`,
        "12000",
        "crime:robbery",
        court.courtId,
      );
    const prosecutor = Object.values(world.people).find(
      (candidate) =>
        candidate.id !== person &&
        (world.control.kind !== "person" ||
          candidate.id !== world.control.personId),
    )!;
    expect(prosecutor).toBeDefined();
    const appointment = {
      kind: "authored" as const,
      note: "Controlled recorded prosecutor appointment for bail consumer proof; no opening official or measured court amount inferred.",
    };
    world = createOrganization(world, {
      stableKey: "bail-donor:prosecution-office",
      formedAt: world.currentDate,
      provenance: appointment,
      initialProfile: {
        name: "Controlled prosecution office",
        classification: "sector:government",
        locationJurisdictionId: venueJurisdictionId,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "bail-donor:prosecutor-appointment",
      personId: prosecutor.id,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:executive-office",
      compensation: "unpaid",
      authority: "self-directed",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance: appointment,
      initialRole: {
        title: "Prosecutor",
        occupationClassification: "profession:prosecutor",
        locationJurisdictionId: venueJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 0, maximumHours: 0 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: venueJurisdictionId,
        },
      },
    });
    const referred = referForProsecution(world, {
      stableKey: "authored-bail-donor:new-case",
      subjectPersonId: person,
      jurisdictionId: venueJurisdictionId,
      offenseKey: "crime:robbery",
      evidence: "documentary",
      standingFindings: 0,
      basisEventIds: [],
      referredBy: { kind: "police", label: "police", personId: null },
    });
    world = advanceProsecutions(
      advanceWorld(
        referred.world,
        prosecutionTimingFor(state).chargeDecisionDays,
      ),
    );
    const charged = world.history.events.find(
      (event) =>
        event.type === "justice.charged" &&
        event.tags.includes(`justice.referral:${referred.referralId}`),
    )!;
    expect(charged).toBeDefined();
    expect(recordedChargeBailMinorUnits(world, charged.id)).toBe(12000);
    expect(charged.tags).toContain("justice.bail-basis:similar-charges/v1");
    expect(charged.summary).not.toMatch(/ESTIMATED|donor/i);
    const beforeTrial = world.history.events.find(
      (event) =>
        ["justice.held-before-trial", "justice.released-before-trial"].includes(
          event.type,
        ) && event.tags.includes(`justice.referral:${referred.referralId}`),
    );
    expect(beforeTrial).toBeDefined();
    expect(beforeTrial!.tags).toContain("justice.bail:12000");
    expect(beforeTrial!.summary).not.toMatch(/unresolved|ESTIMATED|donor/i);
    expect(
      world.history.resourceTransferOutcomes.some(
        (outcome) =>
          outcome.status === "completed" &&
          outcome.transferredAmount.minorUnits === 12000,
      ),
    ).toBe(true);
    const loaded = deserializeWorld(serializeWorld(world));
    expect(recordedChargeBailMinorUnits(loaded, charged.id)).toBe(12000);
    expect(
      advanceProsecutions(loaded).history.events.filter(
        (event) => event.id === charged.id,
      ),
    ).toHaveLength(1);
  });
});
