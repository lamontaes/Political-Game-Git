/**
 * The town's public school district as an employer (closes the core side of
 * SG-GOV-REACH-B-public-school-staff). Its teachers come from the generated
 * town: school-age children times the public share, over the pupil-teacher
 * ratio, taken from the workers the opening couldn't place (jobless adults of
 * working age, in seeded order; seeded generation of who exists). Each new job
 * copies a recorded teacher's job, timetable and pay calendar (occupation, OEWS
 * pay and school-day hours), and the district copies the town's police
 * department's record. It then joins the town government's pay group
 * (`withDistrictPayAuthority`), so the treasury pays its teachers.
 * Opening generation only.
 */
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import data from "./data/opening-public-schools.json" with { type: "json" };
import { parameter as p } from "./parameters";
import { openingWorkCommitments } from "./modules/work";
import { withDistrictPayAuthority } from "./opening-department-pay";
import type {
  CoreInput,
  JobInput,
  OrganizationInput,
  WorkCommitmentInput,
} from "./types";
import type { WorkPayrollCalendarInput } from "./work-pay-period";

export interface PublicSchoolDistrictReceipt {
  organizationId: string;
  schoolAgeChildren: number;
  teachers: number;
  unplacedWorkers: number;
}

const has = (row: { classification?: string }, prefix: string) =>
  (row.classification ?? "").startsWith(prefix);

export function withPublicSchoolDistrict(input: CoreInput): {
  input: CoreInput;
  receipt?: PublicSchoolDistrictReceipt;
} {
  const start = makeIsoDate(input.startedAt);
  const organizations = new Map(input.organizations.map((o) => [o.id, o]));
  if (input.organizations.some((o) => has(o, data.classification)))
    return { input };
  const police = input.organizations.find((o) =>
    has(o, data.organizationTemplate),
  );
  if (!police) return { input };
  const town = police.placeId;
  const commitmentOf = (jobId?: string) =>
    (input.workCommitments ?? []).find((row) => row.jobId === jobId);
  const calendarOf = (commitmentId?: string) =>
    (input.workPayrollCalendars ?? []).find((row) =>
      row.workCommitmentIds.includes(commitmentId ?? ""),
    );
  let template = input.jobs.find(
    (job) =>
      job.occupationClassification === data.teacherOccupation &&
      has(organizations.get(job.organizationId) ?? {}, data.templateEmployer),
  );
  let commitment = commitmentOf(template?.id);
  let calendar = calendarOf(commitment?.id);
  if (!template || !commitment || !calendar) {
    // No recorded teacher to copy: a teacher's job at the national median
    // teacher pay on a school-day timetable, paid on the police
    // department's calendar (the town's other public payroll).
    const officer = input.jobs.find((job) => job.organizationId === police.id);
    const officerCalendar = calendarOf(commitmentOf(officer?.id)?.id);
    if (!officer || !officerCalendar) return { input };
    const hourly = Math.round(
      (p("openingTeacherAnnualWageUsd") * p("minorPerDollar")) /
        p("annualWorkHours"),
    );
    const hours = p("openingTeacherHoursDaily");
    template = {
      ...officer,
      id: `job:public-schools:template:${town}`,
      title: data.teacherTitle,
      occupationClassification: data.teacherOccupation,
      hourlyMinor: hourly,
      hoursDaily: hours,
      wageDailyMinor: Math.round(hourly * hours),
      source: {
        tag: "ESTIMATED",
        asOf: start,
        citation: data.fallbackCitation,
        estimatedFrom: `No recorded teacher job in town to copy; national median teacher pay $${p("openingTeacherAnnualWageUsd")} a year over ${p("annualWorkHours")} hours, ${hours} hours a day.`,
      },
    };
    commitment = openingWorkCommitments(
      [template],
      [{ ...police, classification: data.classification }],
      start,
    )[0];
    calendar = officerCalendar;
    if (!commitment) return { input };
  }
  const homes = new Map<string, string>();
  for (const home of input.households)
    for (const id of home.memberIds) homes.set(id, home.placeId);
  const age = (birthDate: string) => ageOnDate(makeIsoDate(birthDate), start);
  const townPeople = input.people.filter(
    (person) => (homes.get(person.id) ?? person.placeId) === town,
  );
  const children = townPeople.filter((person) => {
    const years = age(person.birthDate);
    return (
      years >= p("openingSchoolAgeFirst") && years <= p("openingSchoolAgeLast")
    );
  }).length;
  const receiptText = input.placeMetadata?.openingEmploymentReceipt;
  const target = receiptText
    ? Number(
        (JSON.parse(receiptText) as { employmentTarget?: number })
          .employmentTarget,
      )
    : NaN;
  const employed = new Set(input.jobs.map((job) => job.personId)).size;
  const unplaced = Number.isFinite(target) ? Math.max(0, target - employed) : 0;
  const wanted = Math.round(
    (children * p("openingPublicSchoolShare")) / p("openingPupilTeacherRatio"),
  );
  const working = new Set(input.jobs.map((job) => job.personId));
  const candidates = townPeople
    .filter((person) => {
      const years = age(person.birthDate);
      return (
        !working.has(person.id) &&
        !person.jobId &&
        years >= p("openingTeacherMinimumAge") &&
        years <= p("openingWorkingAgeLast")
      );
    })
    .sort((a, b) =>
      stableHash(`${data.version}:${input.seed}:${a.id}`).localeCompare(
        stableHash(`${data.version}:${input.seed}:${b.id}`),
      ),
    );
  const teachers = candidates.slice(0, Math.min(wanted, unplaced));
  const townName = (input.placeMetadata?.placeName ?? "").split(",")[0]!.trim();
  const organizationId = `organization:public-schools:${town}`;
  const {
    publicPayAuthority: _policeAuthority,
    governmentFacts: _policeGovernment,
    outsideFlow: _policeOutside,
    ...policeRecord
  } = police;
  const { publicPayAuthorityId: _commitmentAuthority, ...commitmentRecord } =
    commitment;
  void _policeAuthority;
  void _policeGovernment;
  void _policeOutside;
  void _commitmentAuthority;
  const bareDistrict: OrganizationInput = {
    ...policeRecord,
    id: organizationId,
    name: `${townName} ${data.nameSuffix}`,
    classification: data.classification,
    liquidMinor: 0,
    source: {
      tag: "ESTIMATED",
      asOf: start,
      citation: data.citation,
      estimatedFrom: `${children} generated children aged ${p("openingSchoolAgeFirst")}–${p("openingSchoolAgeLast")} × public share ${p("openingPublicSchoolShare")} / pupil-teacher ratio ${p("openingPupilTeacherRatio")} = ${wanted} teachers, limited to ${Math.round(unplaced)} workers the opening couldn't place. Record shape copied from ${police.id}.`,
    },
  };
  const jobs: JobInput[] = [];
  const bareCommitments: WorkCommitmentInput[] = [];
  for (const person of teachers) {
    const jobId = `job:public-schools:${person.id}`;
    jobs.push({
      ...template,
      id: jobId,
      personId: person.id,
      organizationId,
    });
    bareCommitments.push({
      ...commitmentRecord,
      id: `work-commitment:${jobId}`,
      jobId,
      personId: person.id,
      organizationId,
      payrollCalendarId: `opening-payroll-calendar:${organizationId}`,
    });
  }
  const { district, commitments } = bareCommitments.length
    ? withDistrictPayAuthority(input, bareDistrict, bareCommitments)
    : { district: bareDistrict, commitments: bareCommitments };
  const payroll: WorkPayrollCalendarInput = {
    ...calendar,
    id: `opening-payroll-calendar:${organizationId}`,
    organizationId,
    workCommitmentIds: commitments.map((row) => row.id),
    basisRecordIds: [organizationId],
  };
  const jobByPerson = new Map(jobs.map((job) => [job.personId, job.id]));
  return {
    input: {
      ...input,
      organizations: [...input.organizations, district],
      people: input.people.map((person) =>
        jobByPerson.has(person.id)
          ? { ...person, jobId: jobByPerson.get(person.id)! }
          : person,
      ),
      jobs: [...input.jobs, ...jobs],
      workCommitments: [...(input.workCommitments ?? []), ...commitments],
      workPayrollCalendars: [
        ...(input.workPayrollCalendars ?? []),
        ...(commitments.length ? [payroll] : []),
      ],
    },
    receipt: {
      organizationId,
      schoolAgeChildren: children,
      teachers: teachers.length,
      unplacedWorkers: Math.round(unplaced),
    },
  };
}
