/** A closed employer's counted workers look for work (sim stories, Oct 12, item 14). */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import { JOBS_MODULE } from "./modules/jobs";
import { macroCoreData } from "./modules/macro";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, PersonInput, Source } from "./types";

const data = macroCoreData();
const start = "2021-01-01",
  employer = "organization:plant",
  place = "place:closure-fixture",
  residentsId = "residents:closure-fixture";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Jobs closure fixture only.",
};
const counted = (id: string): PersonInput => ({
  id,
  givenName: id,
  familyName: "Fixture",
  birthDate: "1990-01-01",
  placeId: place,
  householdId: `household:${id}`,
  tier: "monthly",
  traits: {},
  liquidMinor: 0,
  livingCostDailyMinor: 1_000,
  source: src,
  familyIds: [],
  knownIds: [],
});
const workers = ["c1", "c2", "c3"].map(counted);
const jobs = workers.map((row) => ({
  id: `job:${row.id}`,
  personId: row.id,
  organizationId: employer,
  title: "Production worker",
  occupationClassification: "trade:production",
  hourlyMinor: 1_800,
  hoursDaily: 8,
  wageDailyMinor: 14_400,
  source: src,
}));

function input(): CoreInput {
  return {
    seed: "closure-fixture",
    startedAt: start,
    people: [],
    households: [],
    jobs: [],
    organizations: [
      {
        id: employer,
        placeId: place,
        name: "Plant",
        kind: "employer",
        liquidMinor: 10_000_000,
        source: src,
      },
      {
        id: residentsId,
        placeId: place,
        name: "Residents",
        kind: "residents",
        liquidMinor: 0,
        source: src,
      },
    ],
    residents: {
      version: "core2-residents-v1",
      accounts: [{ placeId: place, accountId: residentsId }],
      households: workers.map((row, i) => ({
        household: {
          id: row.householdId,
          placeId: place,
          memberIds: [row.id],
          source: src,
        },
        people: [row],
        jobs: [jobs[i]!],
        workCommitments: [],
        contracts: [],
      })),
      flows: [
        {
          id: `wages:${employer}`,
          kind: "wages",
          financeKind: "wages",
          payerId: employer,
          payeeId: residentsId,
          residentsId,
          placeId: place,
          organizationId: employer,
          jobIds: jobs.map((row) => row.id),
          perDayMinorByJob: Object.fromEntries(
            jobs.map((row) => [row.id, row.wageDailyMinor]),
          ),
          periodFactor: 14,
          amountMinor: 3 * 14_400 * 14,
          firstAt: "2021-01-15",
          cadence: { kind: "days", every: 14 },
          salesReceipt: false,
          marketAdjusted: false,
          source: src,
        },
      ],
      source: src,
    },
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("a closed employer's counted workers", () => {
  it("end their jobs, file claims and join the job seekers the day it closes", () => {
    const core = createLifeCore(input(), { data, modules: [JOBS_MODULE] }),
      api = coreAPI(core);
    const book = {
      organizationId: employer,
      kindId: "manufacturing",
      annualDemandMinor: 0,
      capacityMinor: 1,
    } as unknown as BusinessBooksState;
    core.finance.businesses.set(employer, book);
    advanceCore(core, "2021-02-10");
    // The plant closes today, between paydays.
    book.closedAt = "2021-02-10";
    api.emit({
      id: `event:organization.closed:${employer}`,
      date: core.date,
      kind: "organization.closed",
      placeId: place,
      personIds: [],
      publicRecord: true,
      source: src,
    });
    const seekers = api.moduleState("jobs").table("countedSeekers");
    for (const row of workers) {
      expect(seekers.get(row.id)).toMatchObject({
        placeId: place,
        reasonKey: "employer-closed",
        since: "2021-02-10",
      });
      expect(residentsRuntime(core)!.jobs.get(`job:${row.id}`)!.endsAt).toBe(
        "2021-02-10",
      );
    }
    const claims = api.moduleState("jobs").table("claims").rows();
    expect(claims.map((row) => row.personId).sort()).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
  });
});
