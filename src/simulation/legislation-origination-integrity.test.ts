import { describe, expect, it } from "vitest";

import { makeIsoDate } from "./dates";
import { createScenarioWorld } from "./demo";
import { createStableId } from "./ids";
import { introduceMeasure, measureActions, replayMeasure } from "./legislation";
import {
  ILLINOIS_RULE_PACK,
  KENTUCKY_RULE_PACK,
  MINNESOTA_RULE_PACK,
} from "./legislature-rule-packs";
import { assertLegislationIntegrity } from "./legislation-integrity";
import { assertWorldIntegrity } from "./world";
import type { DemoJurisdictionContext } from "./demo-jurisdiction-context";
import type {
  EntityId,
  LegislativeMeasureRecord,
  LegislativeSubjectClass,
  World,
} from "./types";

/**
 * The origination boundary, checked where it has to hold permanently.
 *
 * `introduceMeasure` refuses a Minnesota revenue bill filed in the Senate, but
 * that check only ever speaks for a bill this run filed. A save arrives already
 * written: nobody watched it being made, and a hand-edited one can name any
 * origin it likes. So the same sourced rule has to be re-decided on replay and
 * on integrity, against the record's own `subjectClass` — and it has to keep
 * refusing nothing where the jurisdiction said nothing.
 *
 * These tests build the tampered saves directly and run them through
 * `replayMeasure` and `assertWorldIntegrity`, never through the writer.
 */

function fixtureContext(
  slug: string,
  name: string,
  timeZone: string,
  utcOffsetMinutes: number,
): DemoJurisdictionContext {
  const id = createStableId("jurisdiction", `definition:${slug}`);
  return {
    jurisdiction: {
      id,
      slug,
      name,
      kind: "state-placeholder",
      parentName: "United States",
      provenance: {
        asOf: null,
        source: null,
        jurisdiction: id,
        status: "placeholder",
      },
    },
    initialMoment: {
      date: makeIsoDate("2026-01-05"),
      minuteOfDay: 9 * 60 + 10,
      timeZone,
      utcOffsetMinutes,
    },
    creationSummary: `Seeded world created with a ${name} placeholder for origination tests.`,
    goalScope: `${name} placeholder`,
    householdLocationLabel: `Synthetic ${name} location`,
  };
}

const MINNESOTA_FIXTURE = fixtureContext(
  "us-mn-state-origination-fixture",
  "Minnesota",
  "America/Chicago",
  -360,
);
const ILLINOIS_FIXTURE = fixtureContext(
  "us-il-state-origination-fixture",
  "Illinois",
  "America/Chicago",
  -360,
);
const KENTUCKY_FIXTURE = fixtureContext(
  "us-ky-state-origination-fixture",
  "Kentucky",
  "America/New_York",
  -300,
);

interface FiledMeasure {
  readonly world: World;
  readonly measureId: EntityId;
}

/**
 * Files one measure legally, so the tampering below has a real record to edit
 * rather than a fixture invented to fail.
 */
function fileMeasure(
  context: DemoJurisdictionContext,
  packId: string,
  subjectClass: LegislativeSubjectClass,
  originChamberKey: string,
): FiledMeasure {
  const base = createScenarioWorld(
    `origination-${context.jurisdiction.slug}-${subjectClass}-${originChamberKey}`,
    context,
    { peopleCount: 3 },
  );
  const world = introduceMeasure(base, {
    stableKey: "origination:measure",
    jurisdictionId: context.jurisdiction.id,
    rulePackId: packId,
    designation: "HF 1",
    shortTitle: "Origination fixture",
    summary: "A measure filed so its recorded origin can be tampered with.",
    origin: "member-introduction",
    subjectClass,
    originChamberKey,
  });
  const measure = (world.history.legislativeMeasures ?? []).find(
    (record) => record.stableKey === "origination:measure",
  );
  if (!measure) throw new Error("Fixture failed to file its measure.");
  return { world, measureId: measure.id };
}

/** Rewrites the stored measure record, the way a hand-edited save would. */
function withEditedMeasure(
  world: World,
  measureId: EntityId,
  edit: (measure: LegislativeMeasureRecord) => LegislativeMeasureRecord,
): World {
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: (world.history.legislativeMeasures ?? []).map(
        (record) => (record.id === measureId ? edit(record) : record),
      ),
    },
  };
}

/** Rewrites the recorded introduction, the way a hand-edited save would. */
function withEditedIntroduction(
  world: World,
  measureId: EntityId,
  chamberKey: string | null,
): World {
  return {
    ...world,
    history: {
      ...world.history,
      legislativeActions: (world.history.legislativeActions ?? []).map(
        (action) =>
          action.measureId === measureId && action.kind === "introduced"
            ? { ...action, chamberKey }
            : action,
      ),
    },
  };
}

describe("origination survives the writer that first enforced it", () => {
  it("refuses a Minnesota revenue bill whose whole record claims the Senate", () => {
    // The attack the writer cannot see: measure and action agree with each
    // other, the Senate does allow introduction, and every earlier check
    // passes. Only the sourced rule refuses it.
    const filed = fileMeasure(
      MINNESOTA_FIXTURE,
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );
    const tampered = withEditedIntroduction(
      withEditedMeasure(filed.world, filed.measureId, (measure) => ({
        ...measure,
        originChamberKey: "senate",
      })),
      filed.measureId,
      "senate",
    );

    const introduction = measureActions(tampered, filed.measureId).find(
      (action) => action.kind === "introduced",
    )!;
    expect(introduction.chamberKey).toBe("senate");

    const replay = replayMeasure(tampered, filed.measureId);
    expect(replay.violations).toHaveLength(1);
    expect(replay.violations[0]).toMatch(
      /revenue measure cannot originate in the Senate/,
    );
    expect(replay.violations[0]).toMatch(/Minn\. Const\. art\. IV, § 18/);
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /cannot originate in the Senate/,
    );
  });

  it("refuses an introduction recorded in a chamber the measure did not begin in", () => {
    // Measure says House, the action says Senate. One of the two is a lie and
    // replay cannot tell which, so it refuses the pair.
    const filed = fileMeasure(
      MINNESOTA_FIXTURE,
      MINNESOTA_RULE_PACK.packId,
      "general-policy",
      "house",
    );
    const tampered = withEditedIntroduction(
      filed.world,
      filed.measureId,
      "senate",
    );

    const replay = replayMeasure(tampered, filed.measureId);
    expect(replay.violations).toHaveLength(1);
    expect(replay.violations[0]).toMatch(
      /the introduction names the senate while the measure began in the house/,
    );
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /the introduction names the senate while the measure began in the house/,
    );
  });

  it("accepts a Minnesota revenue bill that really did begin in the House", () => {
    const filed = fileMeasure(
      MINNESOTA_FIXTURE,
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );
    expect(
      replayMeasure(filed.world, filed.measureId).violations,
    ).toStrictEqual([]);
    expect(replayMeasure(filed.world, filed.measureId).position.phase).toBe(
      "awaiting-referral",
    );
    expect(() => assertWorldIntegrity(filed.world)).not.toThrow();
  });

  it("keeps an ordinary Minnesota bill legal in the Senate, because silence is not a prohibition", () => {
    // Minnesota's general origination rule is unresolved. An unresolved rule
    // refuses nothing, so `introductionAllowed` stays the only gate — replay
    // must not invent the refusal the revenue rule states.
    expect(MINNESOTA_RULE_PACK.origination.generalOrigination.kind).toBe(
      "unknown",
    );
    const filed = fileMeasure(
      MINNESOTA_FIXTURE,
      MINNESOTA_RULE_PACK.packId,
      "general-policy",
      "senate",
    );
    const replay = replayMeasure(filed.world, filed.measureId);
    expect(replay.violations).toStrictEqual([]);
    expect(replay.position.chamberKey).toBe("senate");
    expect(() => assertWorldIntegrity(filed.world)).not.toThrow();
  });

  it("keeps Illinois legal in either house, because Illinois says so outright", () => {
    for (const chamberKey of ["house", "senate"] as const) {
      const filed = fileMeasure(
        ILLINOIS_FIXTURE,
        ILLINOIS_RULE_PACK.packId,
        "general-policy",
        chamberKey,
      );
      const replay = replayMeasure(filed.world, filed.measureId);
      expect(replay.violations).toStrictEqual([]);
      expect(replay.position.chamberKey).toBe(chamberKey);
      expect(() => assertWorldIntegrity(filed.world)).not.toThrow();
    }
  });

  it("gives Kentucky's own revenue confinement the same permanent protection", () => {
    // Kentucky's rule is its own instrument, and it has to hold on replay for
    // the same reason Minnesota's does.
    const filed = fileMeasure(
      KENTUCKY_FIXTURE,
      KENTUCKY_RULE_PACK.packId,
      "revenue",
      "house",
    );
    const tampered = withEditedIntroduction(
      withEditedMeasure(filed.world, filed.measureId, (measure) => ({
        ...measure,
        originChamberKey: "senate",
      })),
      filed.measureId,
      "senate",
    );

    const replay = replayMeasure(tampered, filed.measureId);
    expect(replay.violations).toHaveLength(1);
    expect(replay.violations[0]).toMatch(
      /revenue measure cannot originate in the Senate/,
    );
    expect(replay.violations[0]).toMatch(/Ky\. Const\. Sec\. 47/);
    expect(() => assertWorldIntegrity(tampered)).toThrow(
      /cannot originate in the Senate/,
    );
  });

  it("refuses a tampered origin even when the introduction action is gone", () => {
    // Removing the action the replay check hangs off must not remove the
    // check: the measure's own claimed origin is checked in its own right, so
    // deleting the introduction buys nothing.
    const filed = fileMeasure(
      MINNESOTA_FIXTURE,
      MINNESOTA_RULE_PACK.packId,
      "revenue",
      "house",
    );
    const moved = withEditedMeasure(
      filed.world,
      filed.measureId,
      (measure) => ({ ...measure, originChamberKey: "senate" }),
    );
    const stripped: World = {
      ...moved,
      history: {
        ...moved.history,
        legislativeActions: (moved.history.legislativeActions ?? []).filter(
          (action) =>
            !(
              action.measureId === filed.measureId &&
              action.kind === "introduced"
            ),
        ),
      },
    };
    // Checked against the legislative family directly: dropping a record also
    // breaks the world-level sequence rule, and that is a different refusal
    // than the one under test here.
    expect(() =>
      assertLegislationIntegrity(stripped, new Set<EntityId>()),
    ).toThrow(/cannot originate in the Senate/);
  });
});
