import { describe, expect, it } from "vitest";
import type { ResolvedLawConsequence } from "../../../law-consequence-types";
import type { EntityId, World } from "../../../types";
import { CURRICULUM_STANDARDS_ROW } from "./data";
import {
  appendLawCurriculumApplication,
  curriculumCategoryCoversProgram,
  lawCurriculumApplications,
} from "./index";

const entity = (value: string) => value as EntityId;

describe("LW-08 curriculum application", () => {
  it("requires an exact saved curriculum category for a school program", () => {
    expect(
      curriculumCategoryCoversProgram(["elementary"], "schooling:elementary"),
    ).toBe(true);
    expect(
      curriculumCategoryCoversProgram(["schooling:middle"], "schooling:middle"),
    ).toBe(true);
    expect(
      curriculumCategoryCoversProgram(["K-12"], "schooling:elementary"),
    ).toBe(false);
    expect(
      curriculumCategoryCoversProgram(
        ["elementary"],
        "postsecondary:bachelors",
      ),
    ).toBe(false);
  });

  it("appends an attributed named-pupil application once without inventing an outcome", () => {
    const world = {
      currentDate: "2026-09-01",
      history: { nextSequence: 7, lawCurriculumApplications: [] },
    } as unknown as World;
    const law = {
      measureId: entity("measure:curriculum"),
      origin: "enacted",
      operativeAt: "2026-09-01",
    } as ResolvedLawConsequence["law"];
    const resolved = {
      row: CURRICULUM_STANDARDS_ROW,
      law,
      questionKey: "us-policy-positions:education.state-curriculum-standards",
      jurisdictionId: entity("jurisdiction:US-KY"),
      subject: { kind: "person", id: entity("person:pupil-1") },
      activityId: entity("event:effective"),
      effectiveAt: "2026-09-01",
      sourceRecordIds: [
        entity("measure:curriculum"),
        entity("enrollment:1"),
        entity("organization:school-1"),
        entity("provision:coverage"),
      ],
      value: {
        type: "decision",
        value: JSON.stringify({
          enrollmentId: "enrollment:1",
          schoolOrganizationId: "organization:school-1",
          coverageCategories: ["elementary"],
        }),
      },
    } as ResolvedLawConsequence;
    const detail = {
      enrollmentId: entity("enrollment:1"),
      schoolOrganizationId: entity("organization:school-1"),
      coverageCategories: ["elementary"],
    };

    const applied = appendLawCurriculumApplication(world, resolved, detail);
    const repeated = appendLawCurriculumApplication(applied, resolved, detail);

    expect(lawCurriculumApplications(applied)).toHaveLength(1);
    expect(lawCurriculumApplications(applied)[0]).toMatchObject({
      personId: "person:pupil-1",
      enrollmentId: "enrollment:1",
      schoolOrganizationId: "organization:school-1",
      measureId: "measure:curriculum",
      coverageCategories: ["elementary"],
      sequence: 7,
    });
    expect(
      lawCurriculumApplications(applied)[0]?.lawEffectStamp.sourceRecordIds,
    ).toEqual(resolved.sourceRecordIds);
    expect(repeated).toBe(applied);
    expect(lawCurriculumApplications(repeated)).toHaveLength(1);
  });

  it("states its source limit in the row rather than claiming math gains", () => {
    expect(CURRICULUM_STANDARDS_ROW.evidence.uncertainty).toContain(
      "about-zero",
    );
    expect(CURRICULUM_STANDARDS_ROW.evidence.why).not.toContain(
      "learning gain",
    );
    expect(CURRICULUM_STANDARDS_ROW.amount).toBeUndefined();
  });
});
