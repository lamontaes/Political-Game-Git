import { describe, expect, it } from "vitest";

import { offerDirectPlayerAmendment } from "./legislation-session";
import { billOnTheFloor } from "../simulation/vote-bundle.fixture";
import type { CompiledClause } from "../simulation/legislation-drafting";

const clause: CompiledClause = {
  provisionKey: "direct-rider",
  sectionNumber: 1,
  dimension: "eligibility-scope",
  heading: "Rural transit extension",
  text: "Eligible rural transit providers may receive the stated assistance.",
  beneficiary: {
    kind: "general-application",
    appliesToLabel: "eligible rural transit providers",
  },
  fiscalExposureLabel: null,
  fiscalExposureMinorUnits: null,
  parameterKey: null,
};

describe("direct player floor amendments", () => {
  it("routes an admissible compiled clause through the chamber vote", () => {
    const setup = billOnTheFloor();
    const scenario = { ...setup.scenario, measureId: setup.measureId };
    const result = offerDirectPlayerAmendment(scenario, setup.world, {
      measureId: setup.measureId,
      playerPersonId: setup.memberId,
      clause,
      answer: { propositionId: setup.transitId, answer: "yes" },
    });
    expect(result.world.history.legislativeAmendments?.at(-1)).toMatchObject({
      status: "adopted",
      proposedSections: [
        { provisionKey: "direct-rider", heading: "Rural transit extension" },
      ],
    });
    expect(result.world.history.legislativeProvisions?.at(-1)?.text).toBe(
      clause.text,
    );
  });

  it("prints the chamber's single-subject refusal without writing an amendment", () => {
    const setup = billOnTheFloor();
    const scenario = { ...setup.scenario, measureId: setup.measureId };
    const result = offerDirectPlayerAmendment(scenario, setup.world, {
      measureId: setup.measureId,
      playerPersonId: setup.memberId,
      clause,
      answer: { propositionId: setup.offSubjectId, answer: "yes" },
    });
    expect(result.world).toBe(setup.world);
    expect(result.message).toMatch(/one subject/i);
    expect(result.message).toContain("Neb. Const. art. III, sec. 14");
    expect(result.world.history.legislativeAmendments ?? []).toHaveLength(0);
  });
});
