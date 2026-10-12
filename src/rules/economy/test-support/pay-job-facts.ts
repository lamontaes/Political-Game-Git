/** Raw dated life, compiled legal floors, account ownership and original legacy numeric producer receipts. No payroll rates, phases or chosen cadences are borrowed. */
import { SeededRng } from "../../../simulation/rng";
import { addDays } from "../../../simulation/dates";
import * as life from "../../../simulation/life-queries";
import { minimumHourlyAt } from "../../../simulation/minimum-wage";
import {
  teacherSalaryFloorAt,
  TEACHER_SALARY_FLOOR_QUESTION,
} from "../../../simulation/teacher-salary-floor";
import { publicTaxAccountForIdentity } from "../../../simulation/tax-policy";
import { TOWN_PAY_PERIOD_SHARES } from "../../../simulation/living-world/town-pay.generated";
import { lawFacts } from "../../laws/test-support/law-facts";
import { credentialPayFacts } from "./credential-facts";
import { jobListingFacts } from "./job-listing-facts";
import {
  payDateReceiptKey,
  type PayJobFacts,
  TOWN_PAY_VERSION,
} from "../pay-jobs";
import type { World, IsoDate } from "../../../simulation/types";
export function payJobFacts(world: World, since: IsoDate): PayJobFacts {
  const from = [addDays(world.currentDate, -401), addDays(since, -31)].reduce(
    (a, b) => (a > b ? a : b),
  );
  const dates = [
    world.currentDate,
    since,
    addDays(since, -31),
    ...world.history.workRelationships.map((row) => row.startedAt),
    ...world.history.organizations.map((row) => row.formedAt),
  ];
  for (let date = from; date <= world.currentDate; date = addDays(date, 1))
    dates.push(date);
  const allDates = [...new Set(dates)];
  const ids = [
    ...new Set([
      ...world.jurisdictionOrder,
      ...world.history.workRoles.map((row) => row.locationJurisdictionId),
      null,
    ]),
  ];
  const profiles = new Map(
    world.history.organizations.map((row) => [
      row.id,
      life.organizationProfileAt(world, row.id),
    ]),
  );
  const statuses = new Map<string, ReturnType<typeof life.workStatusAt>>(),
    minimums = new Map<string, number | null>(),
    teacherFloors = new Map<string, ReturnType<typeof teacherSalaryFloorAt>>();
  for (const date of allDates) {
    for (const work of world.history.workRelationships)
      statuses.set(
        payDateReceiptKey(work.id, date),
        life.workStatusAt(world, work.id, {
          asOfDate: date,
          historySequenceExclusive: world.history.nextSequence,
        }),
      );
    for (const id of ids) {
      minimums.set(
        payDateReceiptKey(id, date),
        minimumHourlyAt(world, id, date),
      );
      teacherFloors.set(
        payDateReceiptKey(id, date),
        teacherSalaryFloorAt(world, id, date, null),
      );
    }
  }
  const floorDates = [...teacherFloors.values()].flatMap((row) =>
    row ? [row.from] : [],
  );
  const questions = Object.values(world.policyCatalog.propositions)
    .filter((row) => row.stableKey === TEACHER_SALARY_FLOOR_QUESTION)
    .map((row) => row.id);
  const raw = jobListingFacts(world);
  return {
    id: world.id,
    currentDate: world.currentDate,
    records: world.history,
    people: world.people,
    policyCatalog: world.policyCatalog,
    wage: raw.wage,
    period: {
      shares: TOWN_PAY_PERIOD_SHARES,
      profiles,
      nativePositions: new Map(
        world.history.organizations.map((row) => [
          row.id,
          new SeededRng(world.seed)
            .fork(`${TOWN_PAY_VERSION}:period:${row.id}`)
            .next(),
        ]),
      ),
    },
    phases: new Map(
      world.history.organizations.map((row) => [
        row.id,
        new SeededRng(world.seed)
          .fork(`${TOWN_PAY_VERSION}:phase:${row.id}`)
          .next(),
      ]),
    ),
    credential: credentialPayFacts(world, allDates),
    laws: lawFacts(
      world,
      questions,
      [...new Set([...allDates, ...floorDates])],
      [undefined],
    ),
    profiles,
    statuses,
    minimums,
    teacherFloors,
    accounts: new Map(
      [...profiles.values()].flatMap((profile) =>
        profile?.publicGovernmentIdentity
          ? [
              [
                JSON.stringify(profile.publicGovernmentIdentity),
                publicTaxAccountForIdentity(
                  world,
                  profile.publicGovernmentIdentity,
                ),
              ] as const,
            ]
          : [],
      ),
    ),
  };
}
