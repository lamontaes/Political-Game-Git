import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { makeIsoDate } from "../dates";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { ensureNationwideStateExecutives } from "../nationwide-world/state-executives";
import { introduceMeasure } from "../legislation";
import { recordDraftLineage } from "../legislation-draft-lineage";
import { recordWorldEvent } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { SeededRng } from "../rng";
import { recordedBudgetProgramFamilies } from "./budget-subjects";
import { recordAdoptedAppropriation } from "./program-governing";
import { scheduleGoverningSeasons } from "./governing-calendar";
import {
  currentGoverningOffices,
  currentPriority,
  stateGoverningHandlers,
  governingMatters,
  governingMatterById,
  governingNpcDecisionHandler,
  GOVERNING_NPC_DECISION,
  GOVERNING_MATTER_DECIDED,
  type GoverningOffice,
} from "./state-governing";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import type { EntityId, World } from "../types";
import { personName } from "../people";

let starting: World;
let offices: readonly GoverningOffice[];
let office: GoverningOffice;
const receipts: unknown[] = [];
beforeAll(() => {
  const demo = createDemoWorld("saved-budget-npc-choice");
  const jurisdictions = new Map(
    demo.jurisdictionOrder.map((id) => [id, demo.jurisdictions[id]!]),
  );
  for (const key of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const jurisdiction = stateJurisdictionForKey(`US-${key}`)!;
    jurisdictions.set(jurisdiction.id, jurisdiction);
  }
  starting = createWorld({
    seed: demo.seed,
    currentDate: makeIsoDate("2026-11-30"),
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
  starting = ensureNationwideStateExecutives(
    starting,
    starting.personOrder[0]!,
  );
  starting = ensureLivingWorldOpening(starting, starting.personOrder[0]!);
  const pool = currentGoverningOffices(starting).filter((row) =>
    legislativePackForJurisdiction(row.jurisdictionId),
  );
  const rng = new SeededRng("saved-budget-npc-choice:places");
  offices = Array.from(
    { length: 5 },
    () => pool.splice(rng.integer(0, pool.length), 1)[0]!,
  );
});

function measure(world: World, key: string): { world: World; id: EntityId } {
  const pack = legislativePackForJurisdiction(office.jurisdictionId)!;
  const next = introduceMeasure(world, {
    stableKey: `budget-subject-fixture:${key}`,
    jurisdictionId: office.jurisdictionId,
    rulePackId: pack.packId,
    designation: `HB ${key}`,
    shortTitle: "Controlled recorded budget authority",
    summary:
      "Fixture of an already recorded spending line, not a simulated passage.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: null,
  });
  return { world: next, id: next.history.legislativeMeasures!.at(-1)!.id };
}

function lineage(
  world: World,
  measureId: EntityId,
  familyKey: string,
  componentKey?: string,
): World {
  return recordDraftLineage(world, {
    stableKey: `budget-lineage:${measureId}:${componentKey ?? "single"}`,
    measureId,
    familyKey,
    familyVersion: "controlled-fixture/v1",
    variantKey: "controlled-fixture",
    compiledAt: world.currentDate,
    parameterValues: {},
    provenanceNote: "Controlled saved lineage; no amount or policy default.",
    ...(componentKey ? { componentKey } : {}),
  });
}

function appropriate(
  world: World,
  sourceMeasureId: EntityId | null,
  edition: string,
): World {
  return recordAdoptedAppropriation(world, {
    familyKey: "appropriations",
    programKey: `transit:${office.stateUsps.toLowerCase()}`,
    jurisdictionId: office.jurisdictionId,
    amountMinorUnits: 1000,
    adoptedOn: world.currentDate,
    edition,
    basisNote:
      "Controlled ten-dollar authority fixture; not cash or researched costs.",
    sourceMeasureId,
  })!.world;
}

function priority(
  world: World,
  value: string,
  holder = office.holderPersonId,
): World {
  return recordWorldEvent(world, {
    stableKey: `saved-budget-npc-choice:priority:${value}:${holder}`,
    type: GOVERNING_MATTER_DECIDED,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: office.jurisdictionId,
    involvedEntityIds: [holder],
    participants: [
      {
        personId: holder,
        role: "agency:decider",
        detail: "controlled saved agenda choice",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office:${office.officeKey}`,
      "matter-family:agenda",
      `choice:priority:${value}`,
    ],
    summary: `Controlled saved agenda choice: ${value}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: value,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function request(index: number, savedPriority?: string, backed = true) {
  office = offices[index]!;
  const filed = measure(starting, `source-${index}`);
  let world = appropriate(
    lineage(filed.world, filed.id, "appropriations"),
    backed ? filed.id : null,
    `backed-${index}`,
  );
  if (savedPriority !== undefined) world = priority(world, savedPriority);
  world = scheduleGoverningSeasons(
    world,
    office.officeKey,
    office.jurisdictionId,
  );
  const season = world.history.futureDueItems.find((row) =>
    row.stableKey.includes(`:${office.officeKey}:budget:`),
  )!;
  world = resolveFutureDueItemsThrough(
    world,
    season.dueAt,
    createFutureTransitionHandlerRegistry(stateGoverningHandlers()),
  );
  const matter = governingMatters(world, office.officeKey).find(
    (row) => row.family === "budget",
  )!;
  const due = world.history.futureDueItems.find(
    (row) =>
      row.transitionKey === GOVERNING_NPC_DECISION &&
      row.entityIds.includes(matter.id),
  )!;
  let before: World | null = null;
  let result: ReturnType<typeof governingNpcDecisionHandler> | null = null;
  const registry = createFutureTransitionHandlerRegistry(
    stateGoverningHandlers().map(([key, handler]) => [
      key,
      key === GOVERNING_NPC_DECISION
        ? (input, item) => {
            if (item.id !== due.id) return handler(input, item);
            before = input;
            result = governingNpcDecisionHandler(input, item);
            return result;
          }
        : handler,
    ]),
  );
  const completed = resolveFutureDueItemsThrough(world, due.dueAt, registry);
  if (!before || !result)
    throw new Error("Actual budget NPC callback was not executed.");
  return {
    world: before as World,
    matter,
    due,
    result: result as ReturnType<typeof governingNpcDecisionHandler>,
    completed,
    sourceMeasureId: filed.id,
  };
}

function pending(index: number, savedPriority?: string) {
  const f = request(index, savedPriority);
  const result = f.result;
  const matter = governingMatterById(result.world, f.matter.id)!;
  expect(matter.status).toBe("open");
  expect(matter.decision).toBeNull();
  expect(serializeWorld(result.world)).toBe(serializeWorld(f.world));
  const restored = deserializeWorld(serializeWorld(result.world));
  expect(
    serializeWorld(governingNpcDecisionHandler(restored, f.due).world),
  ).toBe(serializeWorld(restored));
  receipts.push({
    seed: starting.seed,
    place: office.stateUsps,
    governorName: personName(f.world.people[office.holderPersonId]!),
    savedPriority: savedPriority ?? null,
    matterId: matter.id,
    status: matter.status,
    decisionId: null,
    context: result.context,
    limits:
      "Controlled actual saved request/source authority; missing choice stays pending, not a natural year or approved default.",
  });
}

afterAll(() => {
  if (process.env.TEAM1_BUDGET_NPC_PROOF_PATH)
    writeFileSync(
      process.env.TEAM1_BUDGET_NPC_PROOF_PATH,
      JSON.stringify(receipts, null, 2) + "\n",
    );
});

describe("a budget NPC selects only a backed saved priority", () => {
  it.each([0, 1, 2, 3, 4])(
    "keeps a missing saved choice pending in place %s",
    (index) => pending(index),
  );
  it.each([0, 1, 2, 3, 4])(
    "selects the actual source-backed saved choice in place %s",
    (index) => {
      const f = request(index, "appropriations");
      const result = f.result;
      const matter = governingMatterById(result.world, f.matter.id)!;
      expect(matter.status).toBe("decided");
      expect(matter.decision!.tags).toContain("choice:budget:appropriations");
      expect(matter.decision!.involvedEntityIds).toContain(
        office.holderPersonId,
      );
      expect(result.world.history.publicProgramRecords).toEqual(
        f.world.history.publicProgramRecords,
      );
      expect(result.world.history.resourceTransferOutcomes).toEqual(
        f.world.history.resourceTransferOutcomes,
      );
      const restored = deserializeWorld(serializeWorld(result.world));
      expect(
        serializeWorld(governingNpcDecisionHandler(restored, f.due).world),
      ).toBe(serializeWorld(restored));
      receipts.push({
        seed: starting.seed,
        place: office.stateUsps,
        governorName: personName(f.world.people[office.holderPersonId]!),
        savedPriority: currentPriority(f.world, office),
        sourceMeasureId: f.sourceMeasureId,
        matterId: matter.id,
        decisionId: matter.decision!.id,
        decisionChoice: matter.decision!.context.choice,
        reason: result.context,
        limits:
          "Controlled saved priority/source authority; actual holder decides. No new amount, paid transfer, natural selection or national session proof.",
      });
    },
  );
  it("keeps an explicit priority:none pending", () => pending(0, "none"));
  it("keeps a saved priority without a backed matching option pending", () =>
    pending(0, "bridge-maintenance"));
  it("does not treat a program-tagged unbound appropriation as a backed choice", () => {
    const f = request(0, "appropriations", false);
    expect(
      recordedBudgetProgramFamilies(
        f.world,
        office.jurisdictionId,
        "appropriations",
      ),
    ).toEqual([]);
    expect(
      governingMatterById(f.result.world, f.matter.id)!.decision,
    ).toBeNull();
    expect(serializeWorld(f.result.world)).toBe(serializeWorld(f.world));
  });
  it("does not borrow another holder's saved agenda choice", () => {
    office = offices[0]!;
    const original = starting;
    try {
      starting = priority(starting, "appropriations", starting.personOrder[0]!);
      pending(0);
    } finally {
      starting = original;
    }
  });
});
