import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { addDays } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import {
  townJobRate,
  townMinimumHourlyAt,
  townPayPercentile,
} from "./living-world/town-pay";
import { initializeOfficeSalaryFlows } from "./office-salary";
import { createWorkCompensation, money } from "./resources";
import { localBusinessWageMinor } from "./recorded-employer";
import { resourceFlowTermsAt } from "./resource-queries";
import { serializeWorld, deserializeWorld } from "./serialization";
import { pickDistinct, SeededRng } from "./rng";
import type { EntityId, World, WorkRelationshipKind } from "./types";

const SEED = "a41-recorded-office-staff-all56";
const places = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const provenance = {
  kind: "authored" as const,
  note: "A41 controlled recorded job/occupation/hours; no synthetic wage or inferred office classification.",
};

function fixture(
  place: string,
  kind: WorkRelationshipKind = "employment:civil-service",
  occupation:
    | "occupation:office-clerk"
    | "custom:unmapped-office-staff" = "occupation:office-clerk",
  hours = 40,
) {
  const game = smallWorld({
    place,
    date: "2026-01-20",
    seed: `${SEED}:${place}`,
  });
  let world = createOrganization(game.world, {
    stableKey: "a41:actual-office",
    formedAt: addDays(game.world.currentDate, -1),
    provenance,
    initialProfile: {
      name: "Recorded fixture public office",
      classification: "sector:state-government-office",
      locationJurisdictionId: game.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a41:actual-staff",
    personId: game.personId,
    organizationId,
    startedAt: world.currentDate,
    kind,
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Recorded office staff",
      occupationClassification: occupation,
      locationJurisdictionId: game.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: hours, maximumHours: hours },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: game.jurisdictionId,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  return { ...game, world, work, organizationId, hours, occupation };
}

function agreement(world: World, workId: EntityId) {
  const flow = world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === workId,
  );
  return flow ? resourceFlowTermsAt(world, flow.id) : null;
}

describe("A41 recorded staff pay uses existing occupational data", () => {
  it.each(places)(
    "uses the saved occupation/workplace/hours or refuses unsupported inputs in $jurisdictionKey",
    (place) => {
      const { world, personId, jurisdictionId, work, hours } = fixture(
        place.jurisdictionKey,
      );
      const rate = townJobRate(
        "occupation:office-clerk",
        jurisdictionId,
        townPayPercentile(0),
        townMinimumHourlyAt(world, jurisdictionId, world.currentDate),
      );
      const opened = initializeOfficeSalaryFlows(world, personId);
      if (!rate) {
        expect(opened).toBe(world);
        expect(agreement(opened, work.id)).toBeNull();
        return;
      }
      const terms = agreement(opened, work.id)!;
      expect(terms.amount.minorUnits).toBe(
        Math.round(rate.hourlyMinor * hours),
      );
      expect(terms.provenance.kind).toBe("authored");
      const note =
        terms.provenance.kind === "authored" ? terms.provenance.note : null;
      expect(note).toContain(`SOC ${rate.soc}`);
      expect(note).toContain(`OEWS area ${rate.area}`);
      expect(note).not.toContain("Placeholder");
      expect(terms.cadenceKind).toBe("schedule:weekly");
      expect(opened.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      expect(opened.currentDate).toBe(world.currentDate);
      expect(initializeOfficeSalaryFlows(opened, personId)).toBe(opened);
      const saved = serializeWorld(opened);
      expect(
        serializeWorld(
          initializeOfficeSalaryFlows(deserializeWorld(saved), personId),
        ),
      ).toBe(saved);
    },
  );

  it("records different sourced civil-service pay in two workplaces", () => {
    const salaries = ["NE", "DC"].map((place) => {
      const { world, personId, work } = fixture(place);
      const opened = initializeOfficeSalaryFlows(world, personId);
      const terms = agreement(opened, work.id)!;
      expect(terms).not.toBeNull();
      expect(
        terms.provenance.kind === "authored" ? terms.provenance.note : null,
      ).toContain("OEWS area");
      return terms.amount.minorUnits;
    });
    expect(salaries[0]).not.toBe(salaries[1]);
  });

  it.each([
    "employment:executive-staff",
    "employment:state-agency-director",
  ] as const)("reads the actual recorded occupation for %s", (kind) => {
    const { world, personId, work, jurisdictionId } = fixture("NE", kind);
    const rate = townJobRate(
      "occupation:office-clerk",
      jurisdictionId,
      townPayPercentile(0),
      townMinimumHourlyAt(world, jurisdictionId, world.currentDate),
    )!;
    const opened = initializeOfficeSalaryFlows(world, personId);
    expect(agreement(opened, work.id)!.amount.minorUnits).toBe(
      rate.hourlyMinor * 40,
    );
  });

  it("uses saved part-time hours rather than assuming a full-time salary", () => {
    const full = fixture("NE");
    const half = fixture(
      "NE",
      "employment:civil-service",
      "occupation:office-clerk",
      20,
    );
    const fullAmount = agreement(
      initializeOfficeSalaryFlows(full.world, full.personId),
      full.work.id,
    )!.amount.minorUnits;
    const halfAmount = agreement(
      initializeOfficeSalaryFlows(half.world, half.personId),
      half.work.id,
    )!.amount.minorUnits;
    expect(halfAmount * 2).toBe(fullAmount);
  });

  it("refuses an unmapped actual occupation instead of inventing a salary from its title", () => {
    const { world, personId, work } = fixture(
      "NE",
      "employment:executive-staff",
      "custom:unmapped-office-staff",
    );
    expect(initializeOfficeSalaryFlows(world, personId)).toBe(world);
    expect(agreement(world, work.id)).toBeNull();
  });

  it("uses comparable saved pay for a new office and business worker, normalized to hours", () => {
    const { world, personId, work, jurisdictionId } = fixture("NE");
    let recorded = createWorkCompensation(world, {
      stableKey: "a41:recorded-pay",
      workRelationshipId: work.id,
      startsAt: world.currentDate,
      amount: money(120_000, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId,
      provenance,
    });
    recorded = createWorkRelationship(recorded, {
      stableKey: "a41:new-staff",
      personId,
      organizationId: work.organizationId,
      startedAt: recorded.currentDate,
      kind: work.kind,
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "New part-time staff",
        occupationClassification: "occupation:office-clerk",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 20 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
    const newWork = recorded.history.workRelationships.at(-1)!;
    const opened = initializeOfficeSalaryFlows(recorded, personId);
    expect(agreement(opened, newWork.id)!.amount.minorUnits).toBe(60_000);
    expect(agreement(opened, work.id)!.amount.minorUnits).toBe(120_000);
    expect(
      localBusinessWageMinor(
        { workerOccupation: "occupation:office-clerk" },
        jurisdictionId,
        recorded,
      ).monthlyMinor,
    ).toBe(390_000);
    expect(
      localBusinessWageMinor(
        { workerOccupation: "occupation:office-clerk" },
        jurisdictionId,
        recorded,
        work.id,
      ).monthlyMinor,
    ).toBe(520_000);
    expect(
      localBusinessWageMinor(
        { workerOccupation: "occupation:office-clerk" },
        jurisdictionId,
        recorded,
        newWork.id,
      ).monthlyMinor,
    ).toBe(260_000);
    expect(serializeWorld(deserializeWorld(serializeWorld(opened)))).toBe(
      serializeWorld(opened),
    );
  });

  it.todo(
    "A40: recorded credentials affect the common wage position after approved credential sizing",
  );
  it.todo(
    "A41: replace the public-body job-market placeholder through its actual job profile",
  );
  it.todo(
    "A41: supply actual SOC evidence for unmapped produced office-staff classifications",
  );
  it.todo(
    "Your Money: actual staff payday cash/withholding through the final common payroll composition",
  );
});
