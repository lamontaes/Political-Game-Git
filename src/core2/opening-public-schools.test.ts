import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import type { PublicSchoolDistrictReceipt } from "./opening-public-schools";
import { parameter as p } from "./parameters";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-public-schools");

describe(`the public school district in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("employs teachers for the town's children from workers not yet placed", () => {
    const input = generatedOpening(place, {
      settings: { population: 1500 },
    });
    const text = input.placeMetadata?.openingPublicSchools;
    const district = input.organizations.find(
      (row) => row.classification === "service:school",
    );
    // A town with no recorded teacher to copy has no district yet (stopgap).
    if (!text) {
      expect(district).toBeUndefined();
      return;
    }
    const receipt = JSON.parse(text) as PublicSchoolDistrictReceipt;
    expect(district?.id).toBe(receipt.organizationId);
    const jobs = input.jobs.filter(
      (row) => row.organizationId === receipt.organizationId,
    );
    expect(jobs.length).toBe(receipt.teachers);
    const wanted = Math.round(
      (receipt.schoolAgeChildren * p("openingPublicSchoolShare")) /
        p("openingPupilTeacherRatio"),
    );
    expect(receipt.teachers).toBe(Math.min(wanted, receipt.unplacedWorkers));
    expect(receipt.teachers).toBeGreaterThan(0);
    // Each teacher holds one job, with a timetable on the district's payday calendar.
    const people = new Map(input.people.map((row) => [row.id, row]));
    const calendar = input.workPayrollCalendars!.find(
      (row) => row.organizationId === receipt.organizationId,
    )!;
    for (const job of jobs) {
      expect(input.jobs.filter((row) => row.personId === job.personId)).toEqual(
        [job],
      );
      expect(people.get(job.personId)!.jobId).toBe(job.id);
      expect(job.occupationClassification).toBe("profession:teacher");
      const commitment = input.workCommitments!.find(
        (row) => row.jobId === job.id,
      )!;
      expect(calendar.workCommitmentIds).toContain(commitment.id);
    }
  }, 300_000);
});
