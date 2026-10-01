import { beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { addDays, makeIsoDate } from "../dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { createDemoWorld } from "../demo";
import { createWorld, recordWorldEvent } from "../world";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import {
  regularSessionYearForWorld,
  legislativeRulePackForWorld,
} from "../legislative-procedure-world";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  measurePosition,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  recordExecutiveAction,
  recordEnactment,
} from "../legislation";
import { dispositionsFromCounts } from "../legislation-scenarios";
import { seatedChamberForPack } from "./chamber-votes";
import { committeeRoster } from "./committee-assignment";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stateJurisdictionForKey } from "../life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { ensureLivingWorldOpening } from "../living-world/opening";
import { ensureNationwideStateExecutives } from "../nationwide-world/state-executives";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import { currentMeasureProvisions } from "../legislative-politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import { SeededRng } from "../rng";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { politicalReflectionTransitionHandler } from "../living-world/political-reflection";
import { withOpenedBudgets, PUBLIC_BUDGETS_VERSION } from "../public-budgets";
import { fiscalYearContaining } from "../public-budgets/fiscal";
import { publicBudgetFor } from "../public-budgets/store";
import { chamberByKey } from "../legislature-rules";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  scheduleGoverningSeasons,
  GOVERNING_SEASON,
} from "./governing-calendar";
import { LEGISLATIVE_INSTITUTION_STEP } from "./legislative-clock";
import {
  appropriationFromEnactedMeasure,
  recordAdoptedAppropriation,
} from "./program-governing";
import { recordDraftLineage } from "../legislation-draft-lineage";
import {
  currentGoverningOffices,
  stateGoverningHandlers,
  governingMatters,
  decideGoverningMatter,
  fileRecordedGoverningBudgetRequest,
  governingSeasonHandler,
  type GoverningOffice,
} from "./state-governing";
import {
  adoptedCurrentServicesLines,
  recordCurrentServicesBudgetDraft,
  CURRENT_SERVICES_BUDGET_VERSION,
  budgetProgramProvisionKey,
  currentServicesBudgetAuthority,
  budgetRequestMatchesIntake,
} from "./current-services-budget";
import type { World } from "../types";

let starting: World;
let offices: readonly GoverningOffice[];
let biennialOffice: GoverningOffice;
let departingOffice: GoverningOffice;
const proof: unknown[] = [];
const seed = "team1-current-services-budget-20261001";
const date = (world: World, on: string): World => ({
  ...world,
  currentDate: makeIsoDate(on),
  currentMoment: { ...world.currentMoment, date: makeIsoDate(on) },
});
beforeAll(() => {
  const demo = createDemoWorld(seed);
  const jurisdictions = new Map(
    demo.jurisdictionOrder.map((id) => [id, demo.jurisdictions[id]!]),
  );
  for (const place of CHIEF_EXECUTIVE_JURISDICTIONS) {
    const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
    jurisdictions.set(jurisdiction.id, jurisdiction);
  }
  starting = createWorld({
    seed,
    currentDate: makeIsoDate("2026-11-30"),
    people: demo.personOrder.map((id) => demo.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
  starting = ensureWorldStartingConditions(starting, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  starting = ensureNationwideStateExecutives(
    starting,
    starting.personOrder[0]!,
  );
  starting = ensureLivingWorldOpening(starting, starting.personOrder[0]!);
  starting = {
    ...starting,
    publicBudgets: withOpenedBudgets(
      starting,
      {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [],
        adjustments: [],
        unknown: [],
      },
      starting.currentDate,
    ),
  };
  const active = currentGoverningOffices(starting).filter(
    (office) =>
      legislativePackForJurisdiction(office.jurisdictionId) &&
      regularSessionYearForWorld(starting, office.jurisdictionId, 2027),
  );
  departingOffice = active.find(
    (office) =>
      office.termEndsAt !== null &&
      office.termEndsAt <= makeIsoDate("2027-02-15"),
  )!;
  const pool = active.filter(
    (office) =>
      // A request from a departing governor is not this holder's request.
      office.termEndsAt === null ||
      office.termEndsAt > makeIsoDate("2027-02-15"),
  );
  biennialOffice = pool.find(
    (office) =>
      publicBudgetFor(starting, office.jurisdictionId)?.budgetCycle ===
      "biennial",
  )!;
  const annualPool = pool.filter(
    (office) =>
      publicBudgetFor(starting, office.jurisdictionId)?.budgetCycle ===
      "annual",
  );
  const rng = new SeededRng(`${seed}:places`);
  offices = Array.from(
    { length: 5 },
    () => annualPool.splice(rng.integer(0, annualPool.length), 1)[0]!,
  );
});

function previousSeasonRequest(office: GoverningOffice) {
  let world: World = {
    ...starting,
    control: { kind: "person", personId: office.holderPersonId },
  };
  world = scheduleGoverningSeasons(
    world,
    office.officeKey,
    office.jurisdictionId,
  );
  const due = world.history.futureDueItems.find((row) =>
    row.stableKey.includes(`:${office.officeKey}:budget:`),
  )!;
  const registry = createFutureTransitionHandlerRegistry(
    stateGoverningHandlers(),
  );
  world = resolveFutureDueItemsThrough(world, due.dueAt, registry);
  const matter = governingMatters(world, office.officeKey).find(
    (row) => row.family === "budget",
  )!;
  const decided = decideGoverningMatter(world, matter.id, "budget:hold-flat");
  if (!decided.ok) throw new Error(decided.reason);
  world = date(
    resolveFutureDueItemsThrough(
      decided.world,
      makeIsoDate("2027-02-14"),
      registry,
    ),
    "2027-02-15",
  );
  world = ensureStateLegislatureOpening(
    world,
    world.personOrder[0]!,
    office.stateUsps,
  );
  const source = adoptedCurrentServicesLines(world, office.jurisdictionId);
  if (!source) throw new Error(`No adopted source for ${office.stateUsps}`);
  const fiscalWindow = {
    fiscalYear: source.adopted.fiscalYear,
    startsOn: source.adopted.startsOn,
    endsOn: source.adopted.endsOn,
  };
  return {
    world,
    intakeKey: `${office.officeKey}:2027-02-15`,
    matter: governingMatters(world, office.officeKey).find(
      (row) => row.id === matter.id,
    )!,
    source,
    fiscalWindow,
  };
}

function sessionPending(
  office: GoverningOffice,
  prepare?: (world: World) => World,
) {
  const previous = previousSeasonRequest(office);
  const world = resolveFutureDueItemsThrough(
    prepare ? prepare(previous.world) : previous.world,
    previous.world.currentDate,
    createFutureTransitionHandlerRegistry(stateGoverningHandlers()),
  );
  const pending = governingMatters(world, office.officeKey).find((row) =>
    row.stableKey.endsWith(`:session-budget:${previous.intakeKey}`),
  )!;
  return { ...previous, world, matter: pending };
}

function requested(office: GoverningOffice, prepare?: (world: World) => World) {
  const pending = sessionPending(office, prepare);
  const decided = decideGoverningMatter(
    pending.world,
    pending.matter.id,
    "budget:hold-flat",
  );
  if (!decided.ok) throw new Error(decided.reason);
  return {
    ...pending,
    world: decided.world,
    matter: governingMatters(decided.world, office.officeKey).find(
      (row) => row.id === pending.matter.id,
    )!,
  };
}

describe("an actual governor request carries adopted current-services lines", () => {
  it.each([0, 1, 2, 3, 4])(
    "copies and schedules the actual budget in sampled place %s",
    (index) => {
      const office = offices[index]!;
      const f = requested(office);
      const result = {
        world: resolveFutureDueItemsThrough(
          f.world,
          f.world.currentDate,
          createFutureTransitionHandlerRegistry(stateGoverningHandlers()),
        ),
      };
      const measure = result.world.history.legislativeMeasures!.find((row) =>
        row.stableKey.startsWith(`${CURRENT_SERVICES_BUDGET_VERSION}:`),
      )!;
      expect(measure.origin).toBe("executive-request");
      expect(measure.sponsorPersonId).toBe(office.holderPersonId);
      expect(measure.sourceDocumentKey).toBe(
        governingMatters(f.world, office.officeKey).find(
          (row) => row.id === f.matter.id,
        )!.decision!.id,
      );
      expect(measure.introducedAt).toBe(makeIsoDate("2027-02-15"));
      expect(f.matter.decision!.recordedAt).toBe(makeIsoDate("2027-02-15"));
      const provisions = currentMeasureProvisions(result.world, measure.id);
      for (const line of f.source.lines)
        expect(
          provisions.find(
            (row) =>
              row.provisionKey ===
              budgetProgramProvisionKey(
                line.program,
                f.fiscalWindow.fiscalYear,
              ),
          )?.fiscalExposureMinorUnits,
        ).toBe(line.annualMinorUnits);
      const steps = result.world.history.futureDueItems.filter(
        (row) =>
          row.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
          row.entityIds.includes(measure.id),
      );
      expect(steps).toHaveLength(1);
      expect(appropriationFromEnactedMeasure(result.world, measure.id)).toBe(
        result.world,
      );
      const reloaded = deserializeWorld(serializeWorld(result.world));
      const repeated = fileRecordedGoverningBudgetRequest(reloaded, {
        matterId: f.matter.id,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      });
      expect(repeated.ok).toBe(true);
      expect(serializeWorld(repeated.world)).toBe(serializeWorld(reloaded));
      proof.push({
        seed,
        place: office.stateUsps,
        governorName: personName(result.world.people[office.holderPersonId]!),
        governorPersonId: office.holderPersonId,
        measureId: measure.id,
        designation: measure.designation,
        requestEventId: measure.sourceDocumentKey,
        sourceFiscalYear: f.source.adopted.fiscalYear,
        fiscalWindow: f.fiscalWindow,
        adoptedAnnualProgramLines: f.source.lines,
        scheduledStepId: steps[0]!.id,
        limits:
          "Controlled actual session request; real February season handler and recorded choice file through canonical driver. Five eligible annual places; saved first-year dates. No natural year, passage, cash or final-main proof.",
      });
      if (process.env.TEAM1_SESSION_BUDGET_PROOF_PATH)
        writeFileSync(
          process.env.TEAM1_SESSION_BUDGET_PROOF_PATH,
          JSON.stringify(proof, null, 2) + "\n",
        );
    },
  );

  it("refuses a saved request with a nonempty missing matter reference", () => {
    const office = offices[0]!;
    const f = requested(office);
    const missingMatterId = "event_missing-budget-fixture-reference";
    expect(
      f.world.history.events.some((event) => event.id === missingMatterId),
    ).toBe(false);
    const request = f.matter.decision!;
    // Append a malformed-reference fixture; preserve every original record and integrity guard.
    const world = recordWorldEvent(f.world, {
      stableKey: "budget-guard:missing-matter-reference",
      type: request.type,
      occurredAt: f.world.currentDate,
      recordedAt: f.world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [office.holderPersonId],
      participants: request.participants,
      personFactConstraints: [],
      visibility: request.visibility,
      tags: request.tags.map((tag) =>
        tag.startsWith("matter:") ? `matter:${missingMatterId}` : tag,
      ),
      summary: "Controlled saved request with a dangling matter reference.",
      context: request.context,
    });
    const before = serializeWorld(world);
    expect(
      recordCurrentServicesBudgetDraft(world, {
        jurisdictionId: office.jurisdictionId,
        governorPersonId: office.holderPersonId,
        requestEventId: world.history.events.at(-1)!.id,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    expect(serializeWorld(world)).toBe(before);
  });

  it("does not invent a request or use monthly outturn as an adopted amount", () => {
    const office = offices[0]!;
    const f = requested(office);
    expect(
      recordCurrentServicesBudgetDraft(f.world, {
        jurisdictionId: office.jurisdictionId,
        governorPersonId: office.holderPersonId,
        requestEventId: office.termId,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    expect(
      adoptedCurrentServicesLines(
        { ...f.world, publicBudgets: undefined },
        office.jurisdictionId,
      ),
    ).toBeNull();
    const withoutAdopted = {
      ...f.world,
      publicBudgets: {
        ...f.world.publicBudgets!,
        governments: f.world.publicBudgets!.governments.map((government) => ({
          ...government,
          years: [],
        })),
      },
    };
    expect(
      adoptedCurrentServicesLines(withoutAdopted, office.jurisdictionId),
    ).toBeNull();
  });

  it.each([0, 1, 2, 3, 4])(
    "opens a missing session request and files only the actual governor's decision in place %s",
    (index) => {
      const office = offices[index]!;
      let world: World = {
        ...starting,
        control: { kind: "person", personId: office.holderPersonId },
      };
      world = scheduleGoverningSeasons(
        world,
        office.officeKey,
        office.jurisdictionId,
      );
      const registry = createFutureTransitionHandlerRegistry(
        stateGoverningHandlers(),
      );
      world = resolveFutureDueItemsThrough(
        world,
        makeIsoDate("2027-02-15"),
        registry,
      );
      const pending = governingMatters(world, office.officeKey).find(
        (matter) =>
          matter.family === "budget" &&
          matter.status === "open" &&
          matter.stableKey.includes("session-budget:"),
      )!;
      expect(pending).toBeDefined();
      expect(pending.decision).toBeNull();
      expect(
        (world.history.legislativeMeasures ?? []).filter((row) =>
          row.stableKey.startsWith(CURRENT_SERVICES_BUDGET_VERSION),
        ),
      ).toHaveLength(0);
      const lapsed = governingMatters(world, office.officeKey).find(
        (matter) => matter.family === "budget" && matter.status === "lapsed",
      )!;
      expect(lapsed).toBeDefined();
      const fiscalWindow = {
        startsOn: publicBudgetFor(world, office.jurisdictionId)!.years[0]!
          .startsOn,
        endsOn: publicBudgetFor(world, office.jurisdictionId)!.years[0]!.endsOn,
      };
      expect(
        fileRecordedGoverningBudgetRequest(world, {
          matterId: lapsed.id,
          intakeKey: `${office.officeKey}:2027-02-15`,
          fiscalWindow,
        }).ok,
      ).toBe(false);
      const decided = decideGoverningMatter(
        world,
        pending.id,
        "budget:hold-flat",
      );
      if (!decided.ok) throw new Error(decided.reason);
      const bill = decided.world.history.legislativeMeasures!.find((row) =>
        row.stableKey.startsWith(CURRENT_SERVICES_BUDGET_VERSION),
      )!;
      expect(bill).toBeDefined();
      expect(bill.sponsorPersonId).toBe(office.holderPersonId);
      const recorded = governingMatters(decided.world, office.officeKey).find(
        (row) => row.id === pending.id,
      )!;
      expect(bill.sourceDocumentKey).toBe(recorded.decision!.id);
      expect(
        decided.world.history.futureDueItems.some(
          (due) =>
            due.transitionKey === LEGISLATIVE_INSTITUTION_STEP &&
            due.entityIds.includes(bill.id),
        ),
      ).toBe(true);
      const restored = deserializeWorld(serializeWorld(decided.world));
      const season = restored.history.futureDueItems.find((due) =>
        due.stableKey.includes(`:${office.officeKey}:bill:2027-02-15`),
      )!;
      const repeated = governingSeasonHandler(restored, season).world;
      expect(
        repeated.history.legislativeMeasures!.filter((row) =>
          row.stableKey.startsWith(CURRENT_SERVICES_BUDGET_VERSION),
        ),
      ).toHaveLength(1);
      expect(
        governingMatters(repeated, office.officeKey).filter((row) =>
          row.stableKey.includes("session-budget:"),
        ),
      ).toHaveLength(1);
      proof.push({
        seed,
        place: office.stateUsps,
        governorName: personName(repeated.people[office.holderPersonId]!),
        governorPersonId: office.holderPersonId,
        pendingRequestId: pending.id,
        decisionId: recorded.decision!.id,
        filedMeasureId: bill.id,
        introducedAt: bill.introducedAt,
        lapsedRequestId: lapsed.id,
        limits:
          "Production intake and actual recorded player decision; no NPC choice, natural year, passage, cash or delivered service claim.",
      });
    },
  );

  it("refuses a changed-amount choice instead of filing unchanged current services", () => {
    const office = offices[0]!;
    const f = sessionPending(office, (world) => {
      const pack = legislativePackForJurisdiction(office.jurisdictionId)!;
      let next = introduceMeasure(world, {
        stableKey: "budget-guard:source",
        jurisdictionId: office.jurisdictionId,
        rulePackId: pack.packId,
        designation: "HB guard-source",
        shortTitle: "Controlled recorded spending authority",
        summary: "Ten-dollar saved authority fixture, not a simulated passage.",
        origin: "member-introduction",
        subjectClass: "appropriation",
        sponsorPersonId: office.holderPersonId,
      });
      const measureId = next.history.legislativeMeasures!.at(-1)!.id;
      next = recordDraftLineage(next, {
        stableKey: "budget-guard:lineage",
        measureId,
        familyKey: "appropriations",
        familyVersion: "controlled-fixture/v1",
        variantKey: "controlled-fixture",
        compiledAt: next.currentDate,
        parameterValues: {},
        provenanceNote: "Controlled saved lineage, no policy default.",
      });
      return recordAdoptedAppropriation(next, {
        familyKey: "appropriations",
        programKey: `transit:${office.stateUsps.toLowerCase()}`,
        jurisdictionId: office.jurisdictionId,
        amountMinorUnits: 1000,
        adoptedOn: next.currentDate,
        edition: "budget-guard",
        basisNote:
          "Controlled ten-dollar authority, not cash or a researched estimate.",
        sourceMeasureId: measureId,
      })!.world;
    });
    expect(
      f.matter.options.some((option) => option.key === "budget:appropriations"),
    ).toBe(true);
    const decision = decideGoverningMatter(
      f.world,
      f.matter.id,
      "budget:appropriations",
    );
    if (!decision.ok) throw new Error(decision.reason);
    const matter = governingMatters(decision.world, office.officeKey).find(
      (row) => row.id === f.matter.id,
    )!;
    expect(matter.decision!.tags).toContain("choice:budget:appropriations");
    expect(decision.world.history.legislativeMeasures).toEqual(
      f.world.history.legislativeMeasures,
    );
    expect(decision.world.history.publicProgramRecords).toEqual(
      f.world.history.publicProgramRecords,
    );
    expect(
      recordCurrentServicesBudgetDraft(decision.world, {
        jurisdictionId: office.jurisdictionId,
        governorPersonId: office.holderPersonId,
        requestEventId: matter.decision!.id,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    const result = fileRecordedGoverningBudgetRequest(decision.world, {
      matterId: matter.id,
      intakeKey: f.intakeKey,
      fiscalWindow: f.fiscalWindow,
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("changed amounts");
    expect(result.world).toBe(decision.world);
    expect(
      decision.world.history.events.some(
        (event) =>
          event.tags.includes("budget:unfiled") &&
          event.tags.includes(`source-event:${matter.decision!.id}`) &&
          event.context.choice?.includes("changed amounts"),
      ),
    ).toBe(true);
    proof.push({
      seed,
      place: office.stateUsps,
      governorPersonId: office.holderPersonId,
      intakeKey: f.intakeKey,
      matterId: matter.id,
      decisionId: matter.decision!.id,
      choice: "budget:appropriations",
      result:
        "Unsupported changed amounts refused; existing authority unchanged.",
    });
  });

  it("keeps another intake's pending matter separate for the same governor", () => {
    const office = offices[0]!;
    const f = sessionPending(office);
    const world = resolveFutureDueItemsThrough(
      f.world,
      makeIsoDate("2027-03-15"),
      createFutureTransitionHandlerRegistry([
        ...stateGoverningHandlers(),
        ["people:political-reflection", politicalReflectionTransitionHandler],
      ]),
    );
    const marchKey = `${office.officeKey}:2027-03-15`;
    const matters = governingMatters(world, office.officeKey).filter(
      (row) =>
        row.status === "open" &&
        row.family === "budget" &&
        row.stableKey.includes("session-budget:"),
    );
    expect(matters).toHaveLength(2);
    expect(matters.map((row) => row.holderPersonId)).toEqual([
      office.holderPersonId,
      office.holderPersonId,
    ]);
    const march = matters.find((row) =>
      row.stableKey.endsWith(`:session-budget:${marchKey}`),
    )!;
    expect(march.id).not.toBe(f.matter.id);
    expect(
      budgetRequestMatchesIntake(world, {
        matterId: f.matter.id,
        officeKey: office.officeKey,
        termId: office.termId,
        intakeKey: marchKey,
      }),
    ).toBe(false);
    expect(
      budgetRequestMatchesIntake(world, {
        matterId: march.id,
        officeKey: office.officeKey,
        termId: office.termId,
        intakeKey: marchKey,
      }),
    ).toBe(true);
    const restored = deserializeWorld(serializeWorld(world));
    const due = restored.history.futureDueItems.find((row) =>
      row.stableKey.includes(`:${office.officeKey}:bill:2027-03-15`),
    )!;
    expect(serializeWorld(governingSeasonHandler(restored, due).world)).toBe(
      serializeWorld(restored),
    );
    proof.push({
      seed,
      place: office.stateUsps,
      governorPersonId: office.holderPersonId,
      februaryMatterId: f.matter.id,
      marchMatterId: march.id,
      result: "Separate pending matters; repeat/reload unchanged.",
    });
  });

  it("does not reuse an earlier intake's choice or its draft for a new request", () => {
    const office = offices[0]!;
    const f = requested(office);
    const original = f.world.history.legislativeMeasures!.find((row) =>
      row.stableKey.startsWith(CURRENT_SERVICES_BUDGET_VERSION),
    )!;
    const world = resolveFutureDueItemsThrough(
      f.world,
      makeIsoDate("2027-03-15"),
      createFutureTransitionHandlerRegistry([
        ...stateGoverningHandlers(),
        ["people:political-reflection", politicalReflectionTransitionHandler],
      ]),
    );
    const intakeKey = `${office.officeKey}:2027-03-15`;
    const pending = governingMatters(world, office.officeKey).find((row) =>
      row.stableKey.endsWith(`:session-budget:${intakeKey}`),
    )!;
    expect(pending.status).toBe("open");
    expect(pending.decision).toBeNull();
    const wrongIntake = fileRecordedGoverningBudgetRequest(world, {
      matterId: f.matter.id,
      intakeKey,
      fiscalWindow: f.fiscalWindow,
    });
    expect(wrongIntake.ok).toBe(false);
    expect(!wrongIntake.ok && wrongIntake.reason).toContain("not bound");
    expect(wrongIntake.world).toBe(world);
    const decision = decideGoverningMatter(
      world,
      pending.id,
      "budget:hold-flat",
    );
    if (!decision.ok) throw new Error(decision.reason);
    const march = governingMatters(decision.world, office.officeKey).find(
      (row) => row.id === pending.id,
    )!;
    expect(march.decision!.id).not.toBe(original.sourceDocumentKey);
    expect(decision.world.history.legislativeMeasures).toEqual(
      world.history.legislativeMeasures,
    );
    expect(currentMeasureProvisions(decision.world, original.id)).toEqual(
      currentMeasureProvisions(f.world, original.id),
    );
    expect(
      recordCurrentServicesBudgetDraft(decision.world, {
        jurisdictionId: office.jurisdictionId,
        governorPersonId: office.holderPersonId,
        requestEventId: march.decision!.id,
        intakeKey,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    const restored = deserializeWorld(serializeWorld(decision.world));
    const result = fileRecordedGoverningBudgetRequest(restored, {
      matterId: march.id,
      intakeKey,
      fiscalWindow: f.fiscalWindow,
    });
    expect(result.ok).toBe(false);
    expect(result.world).toBe(restored);
    expect(!result.ok && result.reason).toContain("another request");
    proof.push({
      seed,
      place: office.stateUsps,
      governorPersonId: office.holderPersonId,
      originalMeasureId: original.id,
      originalSourceEventId: original.sourceDocumentKey,
      marchRequestEventId: march.decision!.id,
      result:
        "Source-mismatched reuse refused; original draft and provisions unchanged.",
    });
    if (process.env.TEAM1_SESSION_BUDGET_PROOF_PATH)
      writeFileSync(
        process.env.TEAM1_SESSION_BUDGET_PROOF_PATH,
        JSON.stringify(proof, null, 2) + "\n",
      );
  });

  it("copies both distinct adopted biennial years without multiplying the first", () => {
    let secondAmounts: readonly number[] = [];
    const f = requested(biennialOffice, (world) => {
      const source = adoptedCurrentServicesLines(
        world,
        biennialOffice.jurisdictionId,
      )!;
      const second = fiscalYearContaining(
        addDays(source.adopted.endsOn, 1),
        source.government.fiscalYearStart,
      );
      // Controlled adoption written before the actual decision files its immutable draft.
      secondAmounts = source.adopted.appropriations.map(
        (amount, index) => amount + index + 1,
      );
      return {
        ...world,
        publicBudgets: {
          ...world.publicBudgets!,
          governments: world.publicBudgets!.governments.map((government) =>
            government.jurisdictionId === biennialOffice.jurisdictionId
              ? {
                  ...government,
                  years: [
                    ...government.years,
                    {
                      ...source.adopted,
                      ...second,
                      adoptedOn: world.currentDate,
                      basis: "automatic" as const,
                      appropriations: secondAmounts,
                    },
                  ],
                }
              : government,
          ),
        },
      };
    });
    const world = f.world;
    const second = fiscalYearContaining(
      addDays(f.fiscalWindow.endsOn, 1),
      f.source.government.fiscalYearStart,
    );
    const filed = recordCurrentServicesBudgetDraft(world, {
      jurisdictionId: biennialOffice.jurisdictionId,
      governorPersonId: biennialOffice.holderPersonId,
      requestEventId: f.matter.decision!.id,
      intakeKey: f.intakeKey,
      fiscalWindow: {
        startsOn: f.fiscalWindow.startsOn,
        endsOn: second.endsOn,
      },
    })!;
    expect(filed).not.toBeNull();
    const provisions = currentMeasureProvisions(filed.world, filed.measureId);
    f.source.lines.forEach((line, index) => {
      expect(
        provisions.find(
          (row) =>
            row.provisionKey ===
            budgetProgramProvisionKey(line.program, f.fiscalWindow.fiscalYear),
        )!.fiscalExposureMinorUnits,
      ).toBe(line.annualMinorUnits);
      const ownSecond = provisions.find(
        (row) =>
          row.provisionKey ===
          budgetProgramProvisionKey(line.program, second.fiscalYear),
      )!;
      expect(ownSecond.fiscalExposureMinorUnits).toBe(
        secondAmounts[index]! * 100,
      );
      expect(ownSecond.text).toContain("this fiscal year's own adopted amount");
      expect(ownSecond.text).not.toContain("flat current services");
    });
    expect(
      currentServicesBudgetAuthority(filed.world, filed.measureId)!.periods,
    ).toHaveLength(2);
    const restored = deserializeWorld(serializeWorld(filed.world));
    expect(currentServicesBudgetAuthority(restored, filed.measureId)).toEqual(
      currentServicesBudgetAuthority(filed.world, filed.measureId),
    );
    proof.push({
      seed,
      place: biennialOffice.stateUsps,
      governorName: personName(world.people[biennialOffice.holderPersonId]!),
      filedMeasureId: filed.measureId,
      first: f.source.adopted,
      second: publicBudgetFor(world, biennialOffice.jurisdictionId)!.years.at(
        -1,
      ),
      limits:
        "Controlled distinct second-year adoption; both actual saved arrays copied independently. No enacted authority or natural year claimed.",
    });
  });

  it("labels absent second-year lines as unchanged flat current services", () => {
    const f = requested(biennialOffice);
    const input = {
      jurisdictionId: biennialOffice.jurisdictionId,
      governorPersonId: biennialOffice.holderPersonId,
      requestEventId: f.matter.decision!.id,
      intakeKey: f.intakeKey,
      fiscalWindow: f.fiscalWindow,
    };
    expect(recordCurrentServicesBudgetDraft(f.world, input)).toBeNull();
    const second = fiscalYearContaining(
      addDays(f.fiscalWindow.endsOn, 1),
      f.source.government.fiscalYearStart,
    );
    const filed = recordCurrentServicesBudgetDraft(f.world, {
      ...input,
      fiscalWindow: {
        startsOn: f.fiscalWindow.startsOn,
        endsOn: second.endsOn,
      },
    })!;
    expect(filed).not.toBeNull();
    const provisions = currentMeasureProvisions(filed.world, filed.measureId);
    for (const line of f.source.lines) {
      const first = provisions.find(
        (row) =>
          row.provisionKey ===
          budgetProgramProvisionKey(line.program, f.fiscalWindow.fiscalYear),
      )!;
      const carried = provisions.find(
        (row) =>
          row.provisionKey ===
          budgetProgramProvisionKey(line.program, second.fiscalYear),
      )!;
      expect(first.fiscalExposureMinorUnits).toBe(line.annualMinorUnits);
      expect(first.text).toContain("this fiscal year's own adopted amount");
      expect(carried.fiscalExposureMinorUnits).toBe(line.annualMinorUnits);
      expect(carried.text).toContain("flat current services");
      expect(carried.text).toContain(f.source.adopted.adoptedOn);
    }
    expect(
      currentServicesBudgetAuthority(filed.world, filed.measureId)!.periods,
    ).toHaveLength(2);
    expect(f.source.government.years).toHaveLength(1);
  });

  it("saves the departed governor's lapse reason without reusing their request", () => {
    const f = previousSeasonRequest(departingOffice);
    expect(
      recordCurrentServicesBudgetDraft(f.world, {
        jurisdictionId: departingOffice.jurisdictionId,
        governorPersonId: departingOffice.holderPersonId,
        requestEventId: f.matter.decision!.id,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    const filed = fileRecordedGoverningBudgetRequest(f.world, {
      matterId: f.matter.id,
      intakeKey: f.intakeKey,
      fiscalWindow: f.fiscalWindow,
    });
    expect(filed.ok).toBe(false);
    const lapse = filed.world.history.events.find(
      (row) =>
        row.tags.includes("budget:request-lapsed") &&
        row.tags.includes(`matter:${f.matter.id}`),
    )!;
    expect(lapse.context.choice).toContain("no longer holds the office");
    expect(lapse.involvedEntityIds).toContain(departingOffice.holderPersonId);
    expect(filed.world.history.legislativeMeasures).toEqual(
      f.world.history.legislativeMeasures,
    );
    const restored = deserializeWorld(serializeWorld(filed.world));
    expect(
      fileRecordedGoverningBudgetRequest(restored, {
        matterId: f.matter.id,
        intakeKey: f.intakeKey,
        fiscalWindow: f.fiscalWindow,
      }).world,
    ).toBe(restored);
  });

  it("writes only final enacted yearly authority and preserves it through save/continue", () => {
    const office = offices[0]!;
    const f = requested(office);
    const filed = recordCurrentServicesBudgetDraft(f.world, {
      jurisdictionId: office.jurisdictionId,
      governorPersonId: office.holderPersonId,
      requestEventId: f.matter.decision!.id,
      intakeKey: f.intakeKey,
      fiscalWindow: f.fiscalWindow,
    })!;
    const measureId = filed.measureId;
    let world = filed.world;
    // Isolate the controlled consumer votes from the separate production intake test.
    for (const due of world.history.futureDueItems.filter(
      (row) =>
        row.transitionKey === GOVERNING_SEASON &&
        row.stableKey.includes(":bill:") &&
        futureDueItemStateAt(world, row.id, currentHistoricalCutoff(world))
          ?.status === "scheduled",
    ))
      world = cancelFutureDueItem(world, {
        stableKey: `consumer-fixture:${due.id}:cancel`,
        dueItemId: due.id,
        effectiveAt: world.currentDate,
        reasonKey: "test:controlled-consumer",
        context:
          "Production intake has its own proof; these votes are explicitly authored.",
      });
    const pack = legislativeRulePackForWorld(
      world,
      legislativePackForJurisdiction(office.jurisdictionId)!.packId,
    );
    const registry = createFutureTransitionHandlerRegistry(
      stateGoverningHandlers(),
    );
    const on = (next: World, when: World["currentDate"]) =>
      date(resolveFutureDueItemsThrough(next, when, registry), when);
    const provenance = {
      method: "authored-fixture" as const,
      note: "Controlled consumer fixture votes; not natural member decisions.",
      sourceEntityIds: [],
    };
    for (const chamberKey of pack.chamberOrder) {
      const chamber = chamberByKey(pack, chamberKey);
      const body = seatedChamberForPack(
        world,
        pack.packId,
        chamberKey,
        chamber.name,
      )!.body;
      const committee = chamber.committees[0]!;
      world = referMeasure(world, {
        stableKey: `budget-proof:${chamberKey}:refer`,
        measureId,
        committeeKey: committee.committeeKey,
      });
      if (
        chamber.referral.everyMeasureMustBeHeard.kind === "known" &&
        chamber.referral.everyMeasureMustBeHeard.value
      ) {
        const hearingDate = addDays(world.currentDate, 1);
        world = scheduleCommitteeHearing(world, {
          stableKey: `budget-proof:${chamberKey}:hearing`,
          measureId,
          hearingDate,
        });
        world = on(world, hearingDate);
      }
      const members = committeeRoster(
        body,
        chamber.committees,
        committee.committeeKey,
        `${pack.packId}:${chamberKey}`,
      );
      world = recordCommitteeDisposition(world, {
        stableKey: `budget-proof:${chamberKey}:report`,
        measureId,
        recommendation: "favorable",
        dispositions: dispositionsFromCounts(members, {
          yea: members.length,
          nay: 0,
        }),
        rationale:
          "Controlled consumer fixture approves the saved current-services amounts.",
        provenance,
      });
      world = placeMeasureOnCalendar(world, {
        stableKey: `budget-proof:${chamberKey}:calendar`,
        measureId,
      });
      for (const stage of chamber.floorStages) {
        const interval = stage.minimumDaysFromIntroduction;
        const fromIntroduction =
          interval?.kind === "known"
            ? addDays(filed.world.currentDate, interval.value)
            : world.currentDate;
        const earliest =
          measurePosition(world, measureId).earliestNextFloorDate ??
          world.currentDate;
        const when = [world.currentDate, earliest, fromIntroduction]
          .sort()
          .at(-1)!;
        world = on(world, when);
        world = takeFloorVote(world, {
          stableKey: `budget-proof:${chamberKey}:${stage.stageKey}`,
          measureId,
          dispositions: dispositionsFromCounts(body.members, {
            yea: body.members.length,
            nay: 0,
          }),
          presentMembers: body.members.length,
          electedMembers: body.members.length,
          provenance,
        });
      }
      if (measurePosition(world, measureId).phase === "awaiting-transmittal")
        world = transmitMeasure(world, {
          stableKey: `budget-proof:${chamberKey}:transmit`,
          measureId,
        });
    }
    world = enrollMeasure(world, {
      stableKey: "budget-proof:enroll",
      measureId,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: "budget-proof:present",
      measureId,
    });
    world = recordExecutiveAction(world, {
      stableKey: "budget-proof:sign",
      measureId,
      action: "signed",
      actorPersonId: office.holderPersonId,
      rationale:
        "Controlled fixture signature tests the enacted authority consumer.",
    });
    world = recordEnactment(world, {
      stableKey: "budget-proof:enact",
      measureId,
    });
    const authority = currentServicesBudgetAuthority(world, measureId)!;
    expect(authority).not.toBeNull();
    expect(authority.lines.length).toBeGreaterThan(0);
    const enacted = appropriationFromEnactedMeasure(world, measureId);
    const records = enacted.history.publicProgramRecords!.flatMap((row) =>
      row.kind === "appropriation" && row.sourceMeasureId === measureId
        ? [row]
        : [],
    );
    expect(records).toHaveLength(authority.lines.length);
    expect(records.map((row) => row.amount.minorUnits)).toEqual(
      authority.lines.map((row) => row.amountMinorUnits),
    );
    expect(records.map((row) => row.availableThrough)).toEqual(
      authority.lines.map((row) => row.endsOn),
    );
    expect(enacted.history.resourceTransferOutcomes).toEqual(
      world.history.resourceTransferOutcomes,
    );
    const reloaded = deserializeWorld(serializeWorld(enacted));
    expect(
      serializeWorld(appropriationFromEnactedMeasure(reloaded, measureId)),
    ).toBe(serializeWorld(reloaded));
    proof.push({
      seed,
      place: office.stateUsps,
      governorName: personName(enacted.people[office.holderPersonId]!),
      governorPersonId: office.holderPersonId,
      measureId,
      enactmentId: enacted.history.legislativeEnactments!.find(
        (row) => row.measureId === measureId,
      )!.id,
      finalAuthorityLines: authority.lines,
      appropriationRecords: records.map((row) => ({
        id: row.id,
        programKey: row.programKey,
        amountMinorUnits: row.amount.minorUnits,
        availableFrom: row.availableFrom,
        availableThrough: row.availableThrough,
        sourceMeasureId: row.sourceMeasureId,
      })),
      limits:
        "Controlled committee/floor votes and executive signature through canonical writers; actual named governor and seated rosters. Authority only; no cash, natural passage, two-year or national budget proof.",
    });
    if (process.env.TEAM1_SESSION_BUDGET_PROOF_PATH)
      writeFileSync(
        process.env.TEAM1_SESSION_BUDGET_PROOF_PATH,
        JSON.stringify(proof, null, 2) + "\n",
      );
  });
});
