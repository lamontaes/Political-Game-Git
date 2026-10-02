import { afterEach, expect, it, vi } from "vitest";
import lawData from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { smallWorld } from "../../../tests/fixtures/small-world";
import { ensureJurisdiction } from "../national-election-geography";
import { createOrganization, createWorkRelationship } from "../life";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import * as minimumWage from "../minimum-wage";
import { createWorkCompensation, money } from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { resolveSavedHourlyPayConsequences } from "./pay";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "./pay-rows";

const regional = Object.entries(
  lawData.questions[STATE_MINIMUM_WAGE_QUESTION_KEY].answers,
).find(
  ([, row]) =>
    "regionalTerms" in row && (row.regionalTerms as unknown[]).length > 1,
)!;
const stateKey = regional[0];
const regions = (
  regional[1] as unknown as {
    regionalTerms: { workplaceKeys: string[]; lawTerms: { value: number }[] }[];
  }
).regionalTerms;
const home = requireLifePlace(regions[0]!.workplaceKeys[0]!);
const workplace = requireLifePlace(regions[1]!.workplaceKeys[0]!);
const provenance = {
  kind: "authored" as const,
  note: "Controlled saved employer and work contract; no employment or legal outcome inferred.",
};
afterEach(() => vi.restoreAllMocks());

it.each(["role", "employer", "unbound"] as const)(
  "PAY forwards the actual %s workplace to the regional reader, including reload",
  (source) => {
    let { world } = smallWorld({
      place: home.key,
      seed: `a39-pay-workplace:${source}`,
      people: 3,
      date: "2026-01-16",
    });
    const location =
      source === "unbound"
        ? stateJurisdictionForKey(stateKey)!
        : workplace.context.jurisdiction;
    world = ensureJurisdiction(world, location);
    const personId = world.personOrder[0]!;
    world = createOrganization(world, {
      stableKey: "fixture:regional-pay:employer",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Controlled test employer",
        classification: "sector:private",
        locationJurisdictionId: location.id,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "fixture:regional-pay:work",
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:staff",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Controlled test worker",
        occupationClassification: "occupation:retail-salesperson",
        locationJurisdictionId: source === "employer" ? null : location.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 1, maximumHours: 1 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: source === "employer" ? null : location.id,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    world = createWorkCompensation(world, {
      stableKey: `job-pay:${work.id}`,
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: money(regions[1]!.lawTerms[0]!.value, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: location.id,
      provenance,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    const reader = vi.spyOn(minimumWage, "stateMinimumSettingAt");
    for (const snapshot of [world, deserializeWorld(serializeWorld(world))]) {
      const before = serializeWorld(snapshot);
      resolveSavedHourlyPayConsequences(snapshot, {
        onDate: snapshot.currentDate,
        activity: "payroll",
        activityId: flow.id,
        subjectIds: [personId],
      });
      const call = reader.mock.calls.at(-1)!;
      expect(call[1]).toBe(stateKey);
      expect(call[4]).toBe(source === "unbound" ? undefined : workplace.key);
      expect(call[4]).not.toBe(home.key);
      const actual = reader.mock.results.at(-1)!.value;
      if (source === "unbound") expect(actual).toBeNull();
      else expect(actual?.hourlyMinor).toBe(regions[1]!.lawTerms[0]!.value);
      expect(serializeWorld(snapshot)).toBe(before);
    }
  },
);
