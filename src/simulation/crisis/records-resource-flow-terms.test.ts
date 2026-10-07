import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import {
  createResourceFlow,
  makeCurrencyCode,
  money,
  recordResourceFlowTerms,
} from "../resources";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import { assertWorldIntegrity, createWorld, createWorldId } from "../world";
import {
  appendCrisisRecord,
  assertCrisisIntegrity,
  crisisRecords,
} from "./records";

const seed = "team8-crisis-resource-flow-terms-all56";
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);
function fixture(usps: string) {
  const date = makeIsoDate("2026-01-05");
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const worldSeed = `${seed}:${usps}`;
  const people = [0, 1].map((index) =>
    createLightweightPerson({
      worldId: createWorldId(worldSeed),
      worldSeed,
      index,
      currentDate: date,
      homeJurisdictionId: state.id,
    }),
  );
  let world = createWorld({
    seed: worldSeed,
    currentDate: date,
    jurisdictions: [state],
    people,
  });
  const currency = makeCurrencyCode("USD");
  world = createResourceFlow(world, {
    stableKey: "fixture:recorded-rent",
    source: { kind: "person", personId: people[0]!.id },
    recipient: { kind: "person", personId: people[1]!.id },
    startsAt: date,
    amount: money(10000, currency),
    cadenceKind: "schedule:monthly",
    basisKind: "custom:recorded-rent",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: state.id,
    provenance: {
      kind: "authored",
      note: "Controlled existing rent record, not a researched amount.",
    },
  });
  const initial = world.history.resourceFlowTerms.at(-1)!;
  world = recordResourceFlowTerms(world, {
    stableKey: "fixture:recorded-renewal",
    resourceFlowId: initial.resourceFlowId,
    effectiveAt: date,
    status: "active",
    amount: initial.amount,
    cadenceKind: initial.cadenceKind,
    reason: "Controlled saved renewal",
    provenance: initial.provenance,
    supersedesTermsId: initial.id,
  });
  const terms = world.history.resourceFlowTerms.at(-1)!;
  world = appendCrisisRecord(world, {
    kind: "health-coverage",
    stableKey: `fixture:coverage:${usps}`,
    effectiveAt: date,
    causalParentIds: [terms.id],
    visibility: "private",
    eventId: null,
    personId: people[0]!.id,
    program: "medicaid-expansion",
    covered: true,
    reasonKey: "covered",
    stateKey: `US-${usps}`,
    householdSize: 1,
    monthlyIncomeMinor: 10000,
    monthlyWorkHours: null,
    hazardMultiplierMicros: 1000000,
    hazardFrom: date,
    hazardBasis: "Controlled coverage record; no hazard change.",
    basis: "Controlled coverage with saved renewal cause.",
  });
  return { world, terms };
}
describe("crisis causal parents include saved resource-flow terms", () => {
  it.each(places)(
    "keeps an earlier saved terms parent through canonical reload in %s",
    (usps) => {
      const { world, terms } = fixture(usps);
      const coverage = crisisRecords(world)[0]!;
      expect(coverage.causalParentIds).toEqual([terms.id]);
      expect(terms.sequence).toBeLessThan(coverage.sequence);
      assertWorldIntegrity(world);
      const saved = serializeWorld(world);
      const loaded = deserializeWorld(saved);
      expect(serializeWorld(loaded)).toBe(saved);
      expect(loaded.history.resourceFlowTerms).toEqual(
        world.history.resourceFlowTerms,
      );
      expect(crisisRecords(loaded)).toEqual(crisisRecords(world));
    },
  );
  it("rejects a missing saved terms parent", () => {
    const { world, terms } = fixture(places[0]!);
    const missing = {
      ...world,
      history: {
        ...world.history,
        resourceFlowTerms: world.history.resourceFlowTerms.filter(
          (row) => row.id !== terms.id,
        ),
      },
    };
    expect(() => assertCrisisIntegrity(missing)).toThrow(
      /causal parent is missing or later/,
    );
  });
  it.each([0, 1])(
    "rejects saved terms at or after the child sequence (offset %s)",
    (offset) => {
      const { world, terms } = fixture(places[0]!);
      const corrupt = {
        ...world,
        history: {
          ...world.history,
          crisisRecords: crisisRecords(world).map((row) => ({
            ...row,
            sequence: terms.sequence - offset,
          })),
        },
      };
      expect(() => assertCrisisIntegrity(corrupt)).toThrow(
        /causal parent is missing or later/,
      );
    },
  );
});
