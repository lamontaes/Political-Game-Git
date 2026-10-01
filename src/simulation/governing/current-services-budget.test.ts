import { beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { addDays, makeIsoDate } from "../dates";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { createDemoWorld } from "../demo";
import { createWorld } from "../world";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import {
  regularSessionYearForWorld,
  legislativeRulePackForWorld,
} from "../legislative-procedure-world";
import {
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
import { appropriationFromEnactedMeasure } from "./program-governing";
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

function requested(office: GoverningOffice) {
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
    matter: governingMatters(world, office.officeKey).find(
      (row) => row.id === matter.id,
    )!,
    source,
    fiscalWindow,
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
      expect(f.matter.decision!.recordedAt).toBe(makeIsoDate("2026-12-01"));
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
          "Controlled actual December request; real February season handler files through canonical driver. Five eligible annual places; saved first-year dates. No natural year, passage, cash or final-main proof.",
      });
      if (process.env.TEAM1_SESSION_BUDGET_PROOF_PATH)
        writeFileSync(
          process.env.TEAM1_SESSION_BUDGET_PROOF_PATH,
          JSON.stringify(proof, null, 2) + "\n",
        );
    },
  );

  it("does not invent a request or use monthly outturn as an adopted amount", () => {
    const office = offices[0]!;
    const f = requested(office);
    expect(
      recordCurrentServicesBudgetDraft(f.world, {
        jurisdictionId: office.jurisdictionId,
        governorPersonId: office.holderPersonId,
        requestEventId: office.termId,
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

  it("copies both distinct adopted biennial years without multiplying the first", () => {
    const f = requested(biennialOffice);
    const second = fiscalYearContaining(
      addDays(f.fiscalWindow.endsOn, 1),
      f.source.government.fiscalYearStart,
    );
    // Explicit controlled second-year adoption, not a researched increase or a production rate.
    const secondAmounts = f.source.adopted.appropriations.map(
      (amount, index) => amount + index + 1,
    );
    const world: World = {
      ...f.world,
      publicBudgets: {
        ...f.world.publicBudgets!,
        governments: f.world.publicBudgets!.governments.map((government) =>
          government.jurisdictionId === biennialOffice.jurisdictionId
            ? {
                ...government,
                years: [
                  ...government.years,
                  {
                    ...f.source.adopted,
                    ...second,
                    adoptedOn: f.world.currentDate,
                    basis: "automatic" as const,
                    appropriations: secondAmounts,
                  },
                ],
              }
            : government,
        ),
      },
    };
    const filed = recordCurrentServicesBudgetDraft(world, {
      jurisdictionId: biennialOffice.jurisdictionId,
      governorPersonId: biennialOffice.holderPersonId,
      requestEventId: f.matter.decision!.id,
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
    const f = requested(departingOffice);
    expect(
      recordCurrentServicesBudgetDraft(f.world, {
        jurisdictionId: departingOffice.jurisdictionId,
        governorPersonId: departingOffice.holderPersonId,
        requestEventId: f.matter.decision!.id,
        fiscalWindow: f.fiscalWindow,
      }),
    ).toBeNull();
    const filed = fileRecordedGoverningBudgetRequest(f.world, {
      matterId: f.matter.id,
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
      fiscalWindow: f.fiscalWindow,
    })!;
    const measureId = filed.measureId;
    let world = filed.world;
    // Isolate the controlled consumer votes from the separate production intake test.
    for (const due of world.history.futureDueItems.filter(
      (row) =>
        row.transitionKey === GOVERNING_SEASON &&
        row.stableKey.includes(":bill:"),
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
