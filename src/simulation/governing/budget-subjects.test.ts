import { beforeAll, describe, expect, it } from "vitest";
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
import { SeededRng } from "../rng";
import { recordedBudgetProgramFamilies } from "./budget-subjects";
import { recordAdoptedAppropriation } from "./program-governing";
import { scheduleGoverningSeasons } from "./governing-calendar";
import {
  currentGoverningOffices,
  currentPriority,
  governingSeasonHandler,
  governingMatters,
  GOVERNING_MATTER_DECIDED,
  type GoverningOffice,
} from "./state-governing";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import type { EntityId, World } from "../types";
import { personName } from "../people";

let starting: World;
let office: GoverningOffice;
beforeAll(() => {
  const demo = createDemoWorld("recorded-budget-subjects");
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
  office = new SeededRng("recorded-budget-subjects:place").pick(
    currentGoverningOffices(starting).filter((row) =>
      legislativePackForJurisdiction(row.jurisdictionId),
    ),
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

describe("budget subjects follow precise recorded appropriations", () => {
  it.each(CHIEF_EXECUTIVE_JURISDICTIONS)(
    "has no subjects without recorded appropriation in %s",
    (key) => {
      const world = {
        ...starting,
        history: { ...starting.history, publicProgramRecords: [] },
      };
      expect(
        recordedBudgetProgramFamilies(
          world,
          stateJurisdictionForKey(`US-${key}`)!.id,
          "appropriations",
        ),
      ).toEqual([]);
    },
  );

  it("uses the saved source lineage rather than the program key or an unsupported priority", () => {
    const filed = measure(starting, "11");
    const world = appropriate(
      lineage(filed.world, filed.id, "appropriations"),
      filed.id,
      "recorded-single",
    );
    expect(
      recordedBudgetProgramFamilies(
        world,
        office.jurisdictionId,
        "bridge-maintenance",
      ),
    ).toEqual(["appropriations"]);
    const unbound = appropriate(starting, null, "unbound");
    expect(
      recordedBudgetProgramFamilies(unbound, office.jurisdictionId, null),
    ).toEqual([]);
    expect(
      recordedBudgetProgramFamilies(filed.world, office.jurisdictionId, null),
    ).toEqual([]);
  });

  it("admits only the funded component of a bundled source and dedupes after Save/Continue", () => {
    const filed = measure(starting, "12");
    let world = lineage(filed.world, filed.id, "appropriations", "funded");
    world = lineage(world, filed.id, "bridge-maintenance", "unfunded");
    world = appropriate(world, filed.id, "measure-hb-12-funded");
    world = appropriate(world, filed.id, "measure-hb-12-funded-again");
    const resumed = deserializeWorld(serializeWorld(world));
    expect(
      recordedBudgetProgramFamilies(
        resumed,
        office.jurisdictionId,
        "bridge-maintenance",
      ),
    ).toEqual(["appropriations"]);
  });

  it("the actual governor season opens only recorded families, with its saved priority first", () => {
    const first = measure(starting, "13");
    let world = appropriate(
      lineage(first.world, first.id, "appropriations"),
      first.id,
      "first",
    );
    const second = measure(world, "14");
    world = appropriate(
      lineage(second.world, second.id, "bridge-maintenance"),
      second.id,
      "second",
    );
    world = recordWorldEvent(world, {
      stableKey: "budget-fixture:saved-governor-priority",
      type: GOVERNING_MATTER_DECIDED,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [office.holderPersonId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `office:${office.officeKey}`,
        "matter-family:agenda",
        "choice:priority:bridge-maintenance",
      ],
      summary:
        "The actual officeholder's controlled saved priority is bridge maintenance.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const scheduled = scheduleGoverningSeasons(
      world,
      office.officeKey,
      office.jurisdictionId,
    );
    const due = scheduled.history.futureDueItems.find((row) =>
      row.stableKey.includes(`:${office.officeKey}:budget:`),
    )!;
    expect(due).toBeDefined();
    const onDate = {
      ...scheduled,
      currentDate: due.dueAt,
      currentMoment: { ...scheduled.currentMoment, date: due.dueAt },
    };
    expect(currentPriority(onDate, office)).toBe("bridge-maintenance");
    expect(
      recordedBudgetProgramFamilies(
        onDate,
        office.jurisdictionId,
        currentPriority(onDate, office),
      ),
    ).toEqual(["bridge-maintenance", "appropriations"]);
    const next = governingSeasonHandler(onDate, due).world;
    const matter = governingMatters(next, office.officeKey).find(
      (row) => row.family === "budget",
    )!;
    expect(
      matter.openedEvent.tags.filter((tag) => tag.startsWith("program:")),
    ).toEqual(["program:appropriations", "program:bridge-maintenance"]);
    expect(matter.openedEvent.involvedEntityIds).toContain(
      office.holderPersonId,
    );
    const resumed = deserializeWorld(serializeWorld(next));
    const repeated = governingSeasonHandler(resumed, due).world;
    expect(
      governingMatters(repeated, office.officeKey).filter(
        (row) => row.family === "budget",
      ),
    ).toHaveLength(1);
    if (process.env.TEAM1_BUDGET_PROOF_PATH) {
      writeFileSync(
        process.env.TEAM1_BUDGET_PROOF_PATH,
        JSON.stringify(
          {
            seed: starting.seed,
            place: starting.jurisdictions[office.jurisdictionId]!.name,
            officeKey: office.officeKey,
            personId: office.holderPersonId,
            personName: personName(starting.people[office.holderPersonId]!),
            date: onDate.currentDate,
            savedPriority: currentPriority(onDate, office),
            selectedFamilies: recordedBudgetProgramFamilies(
              onDate,
              office.jurisdictionId,
              currentPriority(onDate, office),
            ),
            appropriationRecords: next.history.publicProgramRecords?.filter(
              (row) =>
                row.kind === "appropriation" &&
                [first.id, second.id].includes(row.sourceMeasureId!),
            ),
            openedBudgetEvent: matter.openedEvent,
            budgetMattersAfterReloadAndRepeat: governingMatters(
              repeated,
              office.officeKey,
            ).filter((row) => row.family === "budget").length,
            limits:
              "Controlled saved ten-dollar authority records and saved priority; no natural appropriation, cash transfer, passage or year-speed proof.",
          },
          null,
          2,
        ) + "\n",
      );
    }
  });
});
