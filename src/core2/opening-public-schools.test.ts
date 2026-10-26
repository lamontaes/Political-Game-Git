import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import {
  withPublicSchoolDistrict,
  type PublicSchoolDistrictReceipt,
} from "./opening-public-schools";
import { parameter as p } from "./parameters";
import { generatedOpening } from "./tooling/generated-world";
import { daysAfterStart } from "./tooling/test-days";

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
    // Only a town without a police department to pay through has none.
    if (!text) {
      expect(
        input.organizations.some((row) =>
          (row.classification ?? "").startsWith("service:police"),
        ),
      ).toBe(false);
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
    // A town the records show with no school-age children needs no teachers.
    if (!receipt.schoolAgeChildren) {
      expect(receipt.teachers).toBe(0);
      return;
    }
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

  it("hires teachers at the national median teacher pay where no teacher job is recorded, and pays them", () => {
    const opened = generatedOpening(place, { settings: { population: 1500 } });
    const district = opened.organizations.find(
      (row) => row.classification === "service:school",
    );
    // Only a town without a police department to pay through has no district.
    if (!district) {
      expect(
        opened.organizations.some((row) =>
          (row.classification ?? "").startsWith("service:police"),
        ),
      ).toBe(false);
      return;
    }
    // The same town without its district or any recorded teacher job.
    const districtJobs = new Set(
      opened.jobs
        .filter((row) => row.organizationId === district.id)
        .map((row) => row.id),
    );
    const bare = {
      ...opened,
      organizations: opened.organizations.filter((row) => row !== district),
      jobs: opened.jobs
        .filter((row) => !districtJobs.has(row.id))
        .map((row) =>
          row.occupationClassification === "profession:teacher"
            ? { ...row, occupationClassification: "profession:tutor" }
            : row,
        ),
      people: opened.people.map((row) =>
        row.jobId && districtJobs.has(row.jobId)
          ? { ...row, jobId: undefined }
          : row,
      ),
      workCommitments: (opened.workCommitments ?? []).filter(
        (row) => !districtJobs.has(row.jobId),
      ),
      workPayrollCalendars: (opened.workPayrollCalendars ?? []).filter(
        (row) => row.organizationId !== district.id,
      ),
    };
    const { input, receipt } = withPublicSchoolDistrict(bare);
    if (!receipt?.schoolAgeChildren) {
      expect(receipt?.teachers ?? 0).toBe(0);
      return;
    }
    expect(receipt?.teachers).toBeGreaterThan(0);
    const jobs = input.jobs.filter(
      (row) => row.organizationId === receipt!.organizationId,
    );
    const hourly = Math.round(
      (p("openingTeacherAnnualWageUsd") * p("minorPerDollar")) /
        p("annualWorkHours"),
    );
    for (const job of jobs) {
      expect(job.occupationClassification).toBe("profession:teacher");
      expect(job.hourlyMinor).toBe(hourly);
    }
    const core = createLifeCore(input);
    advanceCore(core, daysAfterStart(45));
    const attended = [...core.work.lastAttendanceByJob.keys()].filter((id) =>
      jobs.some((job) => job.id === id),
    );
    expect(attended.length).toBeGreaterThan(0);
  }, 300_000);
});
