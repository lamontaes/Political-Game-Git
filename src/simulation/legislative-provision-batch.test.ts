import { describe, expect, it } from "vitest";
import {
  assertWorldIntegrity,
  bodyForChamber,
  currentMeasureProvisions,
  deserializeWorld,
  dispositionsFromCounts,
  measureAmendments,
  offerFloorAmendment,
  serializeWorld,
  type EntityId,
  type World,
} from "./index";
import {
  adoptProvisionRevision,
  adoptProvisionRevisions,
  type AdoptProvisionRevisionInput,
} from "./legislative-politics";
import { assertLegislativePoliticsIntegrity } from "./legislative-politics-integrity";
import { createLegislativeBargainingFixture } from "../presentation/legislative-bargaining-fixture";

function setup(adopted = true) {
  const fixture = createLegislativeBargainingFixture();
  const body = bodyForChamber(fixture.scenario, "house");
  const world = offerFloorAmendment(fixture.world, {
    stableKey: "batch-test:amendment",
    measureId: fixture.measureId,
    description: "Revise the operative sections together.",
    offeredByPersonId: fixture.playerPersonId,
    offeredByLabel: "Test member",
    dispositions: dispositionsFromCounts(body.members, {
      yea: adopted ? body.members.length : 0,
      nay: adopted ? 0 : body.members.length,
    }),
    electedMembers: body.members.length,
    presentMembers: body.members.length,
    provenance: {
      method: "authored-fixture",
      sourceEntityIds: [],
      note: "Synthetic batch writer test vote.",
    },
  });
  const amendment = measureAmendments(world, fixture.measureId).at(-1)!;
  const current = currentMeasureProvisions(world, fixture.measureId);
  const inputs: AdoptProvisionRevisionInput[] = current
    .slice(0, 2)
    .map((section, index) => ({
      stableKey: `batch-test:section-${index}`,
      measureId: fixture.measureId,
      amendmentId: amendment.id,
      supersedesProvisionId: section.id,
      provisionKey: section.provisionKey,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      text: `${section.text} The administering body shall retain the supporting record.`,
      beneficiary: section.beneficiary,
      applicationScope: section.applicationScope,
      fiscalExposureLabel: section.fiscalExposureLabel,
      fiscalExposureMinorUnits: section.fiscalExposureMinorUnits,
      ...(section.fiscalPeriod === undefined
        ? {}
        : { fiscalPeriod: section.fiscalPeriod }),
    }));
  return { fixture, world, amendment, current, inputs };
}

function expectAtomicRefusal(
  world: World,
  inputs: readonly AdoptProvisionRevisionInput[],
  pattern: RegExp,
) {
  const before = serializeWorld(world);
  expect(() => adoptProvisionRevisions(world, inputs)).toThrow(pattern);
  expect(serializeWorld(world)).toBe(before);
}

describe("adopted amendment section packages", () => {
  it("revises multiple sections under one vote, retains old versions, and round-trips", () => {
    const { world, fixture, amendment, current, inputs } = setup();
    const before = serializeWorld(world);
    const next = adoptProvisionRevisions(world, inputs);
    const revised = currentMeasureProvisions(next, fixture.measureId);
    expect(serializeWorld(world)).toBe(before);
    expect(revised).toHaveLength(current.length);
    expect(
      revised.slice(0, 2).map((section) => section.originAmendmentId),
    ).toEqual([amendment.id, amendment.id]);
    expect(
      revised.slice(0, 2).map((section) => section.supersedesProvisionId),
    ).toEqual(current.slice(0, 2).map((section) => section.id));
    expect(revised[2]).toEqual(current[2]);
    expect(next.history.legislativeProvisions).toHaveLength(current.length + 2);
    assertWorldIntegrity(next);
    expect(serializeWorld(deserializeWorld(serializeWorld(next)))).toBe(
      serializeWorld(next),
    );
  });

  it("adds a new section alongside a revision and preserves annual metadata exactly", () => {
    const { world, fixture, inputs, current } = setup();
    const addition: AdoptProvisionRevisionInput = {
      ...inputs[1]!,
      provisionKey: "batch-test:annual-salary",
      sectionNumber:
        Math.max(...current.map((section) => section.sectionNumber)) + 1,
      supersedesProvisionId: null,
      text: "The annual salary ceiling is $10.",
      fiscalExposureLabel: "$10 per year",
      fiscalExposureMinorUnits: 1000,
      fiscalPeriod: "annual",
    };
    const next = adoptProvisionRevisions(world, [inputs[0]!, addition]);
    const section = currentMeasureProvisions(next, fixture.measureId).find(
      (candidate) => candidate.provisionKey === addition.provisionKey,
    )!;
    expect(section.fiscalPeriod).toBe("annual");
    expect(section.fiscalExposureMinorUnits).toBe(1000);
    expect(section.fiscalExposureLabel).toBe("$10 per year");
    assertWorldIntegrity(next);
  });

  it("rejects an invalid later section without returning an earlier revision", () => {
    const { world, inputs } = setup();
    expectAtomicRefusal(
      world,
      [inputs[0]!, { ...inputs[1]!, text: "" }],
      /operative text/,
    );
    expectAtomicRefusal(
      world,
      [
        inputs[0]!,
        {
          ...inputs[1]!,
          fiscalPeriod: "annual",
          fiscalExposureMinorUnits: null,
          fiscalExposureLabel: null,
        },
      ],
      /annual fiscal period/,
    );
    expectAtomicRefusal(
      world,
      [
        inputs[0]!,
        {
          ...inputs[1]!,
          fiscalExposureMinorUnits: 200,
          fiscalExposureLabel: null,
        },
      ],
      /both in words/,
    );
  });

  it("rejects rejected, mixed-measure, mixed-amendment and empty packages", () => {
    const rejected = setup(false);
    expectAtomicRefusal(rejected.world, rejected.inputs, /rejected amendment/);
    const { world, inputs } = setup();
    expectAtomicRefusal(world, [], /at least one/);
    expectAtomicRefusal(
      world,
      [
        inputs[0]!,
        { ...inputs[1]!, measureId: "legislative-measure_other" as EntityId },
      ],
      /one measure/,
    );
    expectAtomicRefusal(
      world,
      [
        inputs[0]!,
        {
          ...inputs[1]!,
          amendmentId: "legislative-amendment_other" as EntityId,
        },
      ],
      /one adopted amendment/,
    );
  });

  it("rejects duplicate identities, renamed supersessions and collisions with unchanged text", () => {
    const { world, inputs, current } = setup();
    expectAtomicRefusal(
      world,
      [inputs[0]!, { ...inputs[1]!, stableKey: inputs[0]!.stableKey }],
      /stable key twice/,
    );
    expectAtomicRefusal(
      world,
      [inputs[0]!, { ...inputs[1]!, provisionKey: inputs[0]!.provisionKey }],
      /section or stable key twice/,
    );
    expectAtomicRefusal(
      world,
      [{ ...inputs[0]!, provisionKey: "renamed" }],
      /keep the provision key/,
    );
    expectAtomicRefusal(
      world,
      [{ ...inputs[0]!, supersedesProvisionId: null }],
      /naming the current provision/,
    );
    expectAtomicRefusal(
      world,
      [{ ...inputs[0]!, sectionNumber: current[2]!.sectionNumber }],
      /unchanged section/,
    );
  });

  it("preserves the single-section wrapper and refuses reopening an already-carried amendment", () => {
    const { world, inputs } = setup();
    const next = adoptProvisionRevision(world, inputs[0]!);
    assertWorldIntegrity(next);
    expectAtomicRefusal(next, [inputs[1]!], /already been carried/);
    expectAtomicRefusal(next, inputs, /already been carried/);
  });

  it("rejects a stale provision frontier even when a different adopted amendment is supplied", () => {
    const { world, inputs, fixture } = setup();
    const revised = adoptProvisionRevisions(world, inputs);
    const body = bodyForChamber(fixture.scenario, "house");
    const next = offerFloorAmendment(revised, {
      stableKey: "batch-test:later-amendment",
      measureId: fixture.measureId,
      description: "Later revision",
      offeredByLabel: "Test member",
      dispositions: dispositionsFromCounts(body.members, {
        yea: body.members.length,
        nay: 0,
      }),
      electedMembers: body.members.length,
      presentMembers: body.members.length,
      provenance: {
        method: "authored-fixture",
        sourceEntityIds: [],
        note: "Synthetic later vote.",
      },
    });
    const amendmentId = measureAmendments(next, fixture.measureId).at(-1)!.id;
    expectAtomicRefusal(
      next,
      [{ ...inputs[0]!, stableKey: "batch-test:stale", amendmentId }],
      /current section/,
    );
  });

  it("rejects forged save history where one amendment carries the same key twice", () => {
    const { world, inputs, fixture, current } = setup();
    const next = adoptProvisionRevisions(world, inputs);
    const revisions = currentMeasureProvisions(next, fixture.measureId).slice(
      0,
      2,
    );
    // Make the second row a chained duplicate of the first, so the generic
    // double-supersession guard does not mask the amendment+key constraint.
    const corrupted: World = {
      ...next,
      history: {
        ...next.history,
        legislativeProvisions: next.history.legislativeProvisions!.map((row) =>
          row.id === revisions[1]!.id
            ? {
                ...row,
                provisionKey: revisions[0]!.provisionKey,
                supersedesProvisionId: revisions[0]!.id,
              }
            : row,
        ),
      },
    };
    expect(() =>
      assertLegislativePoliticsIntegrity(corrupted, new Set()),
    ).toThrow(/same section more than once/);
    expect(current).toHaveLength(3);
  });
});
