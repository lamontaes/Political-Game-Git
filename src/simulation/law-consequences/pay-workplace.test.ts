import { afterEach, expect, it, vi } from "vitest";
import lawData from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { smallWorld } from "../../../tests/fixtures/small-world";
import { ensureJurisdiction } from "../national-election-geography";
import { createOrganization, createWorkRelationship } from "../life";
import { requireLifePlace, stateJurisdictionForKey } from "../life-places";
import * as minimumWage from "../minimum-wage";
import {
  createResourceFlow,
  createWorkCompensation,
  money,
} from "../resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForIdentity,
} from "../tax-policy";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  resolvePayConsequences,
  resolveSavedHourlyPayConsequences,
} from "./pay";
import { STATE_MINIMUM_WAGE_QUESTION_KEY } from "./pay-rows";
import { MissingLawConsequenceTerm } from "../law-consequence-integrity-gap";
import type { LawConsequenceContext } from "../law-consequence-types";

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

it("PAY retains the first duplicate row binding before checking the question context", () => {
  const { world } = smallWorld({
    place: home.key,
    seed: "pay-first-canonical-row",
    people: 3,
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = proposition.consequences!.find(
    (candidate) => candidate.kind === "pay",
  )!;
  const altered = {
    ...row,
    evidence: { ...row.evidence, why: "Noncanonical duplicate" },
  };
  const duplicate = {
    ...proposition,
    stableKey: `${proposition.stableKey}:duplicate`,
    consequences: [altered],
  };
  const snapshot = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: { first: proposition, second: duplicate },
    },
  };
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "payroll",
    activityId: world.personOrder[0]!,
    subjectIds: [],
    questionKey: duplicate.stableKey,
  };
  expect(resolvePayConsequences(snapshot, altered, context)).toEqual([]);
  expect(() =>
    resolvePayConsequences(snapshot, altered, {
      ...context,
      questionKey: proposition.stableKey,
    }),
  ).toThrow("Pay row differs from its canonical catalog input");
  expect(() =>
    resolvePayConsequences(snapshot, row, {
      ...context,
      questionKey: proposition.stableKey,
    }),
  ).toThrow("Missing pay saved-flow/work activity capability");
});

it("PAY rejects altered or missing canonical rows after catalog replacement", () => {
  const { world } = smallWorld({
    place: home.key,
    seed: "pay-replaced-canonical-row",
    people: 3,
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = proposition.consequences!.find(
    (candidate) => candidate.kind === "pay",
  )!;
  const context: LawConsequenceContext = {
    onDate: world.currentDate,
    activity: "payroll",
    activityId: world.personOrder[0]!,
    subjectIds: [],
    questionKey: proposition.stableKey,
  };
  expect(() => resolvePayConsequences(world, row, context)).toThrow(
    "Missing pay saved-flow/work activity capability",
  );
  const altered = {
    ...row,
    evidence: { ...row.evidence, why: "Replacement canonical row" },
  };
  const replaced = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [proposition.id]: { ...proposition, consequences: [altered] },
      },
    },
  };
  expect(() => resolvePayConsequences(replaced, row, context)).toThrow(
    "Pay row differs from its canonical catalog input",
  );
  expect(() => resolvePayConsequences(replaced, altered, context)).toThrow(
    "Missing pay saved-flow/work activity capability",
  );
  const removed = {
    ...world,
    policyCatalog: {
      ...world.policyCatalog,
      propositions: {
        ...world.policyCatalog.propositions,
        [proposition.id]: { ...proposition, consequences: [] },
      },
    },
  };
  expect(() => resolvePayConsequences(removed, row, context)).toThrow(
    `Missing canonical pay row '${row.id}'`,
  );
  expect(() => resolvePayConsequences(world, row, context)).toThrow(
    "Missing pay saved-flow/work activity capability",
  );
});

it.each(["role", "employer", "unbound", "public-employer"] as const)(
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
    const government = stateJurisdictionForKey(stateKey)!;
    world = ensureJurisdiction(world, government);
    const identity = {
      kind: "jurisdiction" as const,
      jurisdictionId: government.id,
    };
    if (source === "public-employer")
      world = ensureTaxPublicAccount(world, government.id);
    const personId = world.personOrder[0]!;
    world = createOrganization(world, {
      stableKey: "fixture:regional-pay:employer",
      formedAt: world.currentDate,
      provenance:
        source === "public-employer"
          ? {
              kind: "source-record",
              reference: "fixture:recorded-government-payer",
              asOf: world.currentDate,
            }
          : provenance,
      initialProfile: {
        name: "Controlled test employer",
        classification:
          source === "public-employer" ? "sector:government" : "sector:private",
        locationJurisdictionId: location.id,
        ...(source === "public-employer"
          ? { publicGovernmentIdentity: identity }
          : {}),
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
    const contract = {
      stableKey: `job-pay:${work.id}`,
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: money(regions[1]!.lawTerms[0]!.value, "USD"),
      cadenceKind: "schedule:weekly" as const,
      restrictionKind: null,
      jurisdictionId: location.id,
      provenance,
    };
    world =
      source === "public-employer"
        ? createResourceFlow(world, {
            ...contract,
            source: {
              kind: "organization",
              organizationId: publicTaxAccountForIdentity(world, identity)!
                .organizationId,
            },
            recipient: { kind: "person", personId },
            basisKind: "compensation:work",
            basisReference: { kind: "work", workRelationshipId: work.id },
          })
        : createWorkCompensation(world, contract);
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
      const proposition = Object.values(
        snapshot.policyCatalog.propositions,
      ).find((row) => row.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY)!;
      const row = proposition.consequences!.find(
        (candidate) => candidate.kind === "pay",
      )!;
      const questionPay = () =>
        resolvePayConsequences(snapshot, row, {
          onDate: snapshot.currentDate,
          activity: "payroll",
          activityId: flow.id,
          subjectIds: [personId],
        });
      if (source === "unbound")
        expect(questionPay).toThrow(MissingLawConsequenceTerm);
      else {
        const resolved = questionPay();
        expect(resolved).toHaveLength(1);
        expect(resolved[0]!.value.value).toBe(regions[1]!.lawTerms[0]!.value);
      }
      expect(serializeWorld(snapshot)).toBe(before);
      if (source === "public-employer") {
        expect(flow.source).not.toEqual({
          kind: "organization",
          organizationId,
        });
        const wrongPayer = {
          ...snapshot,
          history: {
            ...snapshot.history,
            resourceFlows: snapshot.history.resourceFlows.map((row) =>
              row.id === flow.id
                ? {
                    ...row,
                    source: { kind: "organization" as const, organizationId },
                  }
                : row,
            ),
          },
        };
        expect(() =>
          resolveSavedHourlyPayConsequences(wrongPayer, {
            onDate: wrongPayer.currentDate,
            activity: "payroll",
            activityId: flow.id,
            subjectIds: [personId],
          }),
        ).toThrow("Hourly rule must bind its actual worker and employer");
      }
    }
  },
);
