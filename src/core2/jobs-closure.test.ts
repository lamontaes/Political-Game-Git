/** A closed employer's counted workers look for work (sim stories, Oct 12, item 14). */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { openLaws } from "./modules/laws";
import { unemploymentTerms } from "./jobs-benefits";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { advanceCore, createLifeCore } from "./life";
import { closeBusinessByChoice } from "./finance-state";
import { JOBS_MODULE } from "./modules/jobs";
import { macroCoreData } from "./modules/macro";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, PersonInput, Source } from "./types";

// A random place from all 56 (the golden-path seed when the suite runs it).
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`jobs-benefits:${Date.now()}`).digest("hex");
function drawPlace(): { key: string; state: string } {
  const states = [...corePlaceStateIdentities()]
    .map((s) => s.jurisdictionKey)
    .sort();
  const hash = createHash("sha256").update(`${seed}:benefits`).digest("hex");
  const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
  const places = [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key));
  const place = places[parseInt(hash.slice(8, 16), 16) % places.length]!;
  return { key: place.key, state };
}

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

function input(placeKey: string): CoreInput {
  return {
    placeMetadata: { placeKey },
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
    const drawn = drawPlace();
    const core = createLifeCore(input(drawn.key), {
        data,
        modules: [JOBS_MODULE],
      }),
      api = coreAPI(core);
    openLaws(core);
    const book = {
      organizationId: employer,
      kindId: "manufacturing",
      annualDemandMinor: 0,
      capacityMinor: 1,
    } as unknown as BusinessBooksState;
    core.finance.businesses.set(employer, book);
    advanceCore(core, "2021-02-10");
    // The plant closes today, between paydays, the way an owner closes it
    // (the closure record and its event are the finance engine's).
    closeBusinessByChoice(core, api, {
      organizationId: employer,
      ownerAccountId: api.accounts().main(residentsId),
      reasonKey: "retiring",
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
    // The state's law decides who qualifies: none where it records no
    // program, and every claim cites the law row it was fixed under.
    const terms = unemploymentTerms(api);
    // A worker qualifies when their pay since they were hired (the opening,
    // for a counted worker) meets the state's base-period minimum.
    const weeks = (Date.parse("2021-02-10") - Date.parse(start)) / 6.048e8;
    const qualifies =
      jobs[0]!.wageDailyMinor * 7 * weeks >= terms.minimumBasePeriodMinor;
    if (!terms.hasProgram || !qualifies) expect(claims).toEqual([]);
    else {
      expect(claims.length).toBe(workers.length);
      for (const row of claims) {
        expect(["c1", "c2", "c3"]).toContain(row.personId);
        expect(row.lawId).toBe(terms.lawId);
      }
    }
  });
});
