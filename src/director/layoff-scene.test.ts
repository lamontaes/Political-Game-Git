/**
 * A layoff opens a scene at work with the boss who decided it, from the jobs
 * engine's own record: the lost job's event carries who decided and where.
 * A worker with a household is told at home instead, so one cause stages one
 * scene. The fixture world stands in for the jobs engine; a drawn place
 * proves the engine's own record in jobs-layoff-decider.
 */
import { describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "../core2/life";
import { P } from "../core2/parameters";
import type {
  CoreInput,
  CoreModule,
  PersonInput,
  Source,
} from "../core2/types";
import { createDirector } from "./ledger";

const startedAt = "2021-01-01";
const placeId = "place:layoff-fixture";
const employer = "organization:layoff-fixture-store";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled small layoff input, not observed people.",
  estimatedFrom: "Authored fixture identities and jobs.",
};

const person = (
  id: string,
  overrides: Partial<PersonInput> = {},
): PersonInput => ({
  id,
  givenName: id,
  familyName: "Fixture",
  birthDate: "1970-01-01",
  placeId,
  countyId: `${placeId}:county`,
  householdId: `household:${id}`,
  tier: "daily",
  traits: {},
  liquidMinor: P.zero,
  livingCostDailyMinor: P.zero,
  familyIds: [],
  knownIds: [],
  source,
  ...overrides,
});

function town(withSpouse: boolean): CoreInput {
  const worker = person("person:worker", {
    householdId: "household:worker",
    jobId: "job:worker",
    familyIds: withSpouse ? ["person:spouse"] : [],
    knownIds: withSpouse ? ["person:spouse", "person:boss"] : ["person:boss"],
  });
  const spouse = person("person:spouse", {
    householdId: "household:worker",
    familyIds: [worker.id],
    knownIds: [worker.id],
  });
  const boss = person("person:boss", { knownIds: [worker.id] });
  const coworker = person("person:coworker", {
    jobId: "job:coworker",
    knownIds: [worker.id],
  });
  const members = withSpouse ? [worker.id, spouse.id] : [worker.id];
  return {
    seed: "layoff-scene",
    startedAt,
    people: withSpouse
      ? [worker, spouse, boss, coworker]
      : [worker, boss, coworker],
    households: [
      { id: "household:worker", placeId, memberIds: members, source },
      { id: boss.householdId, placeId, memberIds: [boss.id], source },
      { id: coworker.householdId, placeId, memberIds: [coworker.id], source },
    ],
    jobs: ["worker", "coworker"].map((who) => ({
      id: `job:${who}`,
      personId: `person:${who}`,
      organizationId: employer,
      title: "Cashier",
      wageDailyMinor: P.minorPerDollar * P.percent,
      hoursDaily: P.zero,
      source,
    })),
    organizations: [
      {
        id: employer,
        name: "Fixture store",
        kind: "employer",
        placeId,
        liquidMinor: P.zero,
        source,
      },
    ],
    familyLinks: withSpouse
      ? [
          {
            id: "link:partner",
            kind: "partner",
            personIds: [worker.id, spouse.id],
          },
        ]
      : [],
    // The director watches the player's circle, whose events the log keeps.
    focusPersonIds: ["person:worker"],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

/** The jobs engine's layoff, as it records it: the job ends and the event names who decided. */
const layoffWorld: CoreModule = {
  id: "layoff-world",
  onAfterDay(api) {
    if (api.state.date !== "2021-01-10") return;
    const job = api.state.jobs.get("job:worker")!;
    (job as { endsAt?: string }).endsAt = api.state.date;
    delete (api.state.people.get("person:worker") as { jobId?: string }).jobId;
    api.emit({
      id: `event:work.job-lost:${api.state.date}:job:worker`,
      date: api.state.date,
      kind: "work.job-lost",
      personIds: ["person:worker"],
      placeId,
      publicRecord: false,
      topic: employer,
      facts: { decidedBy: "person:boss", organizationId: employer },
      source,
    });
  },
};

function run(withSpouse: boolean) {
  const director = createDirector({ watch: ["person:worker"] });
  const core = createLifeCore(town(withSpouse), {
    scheduledWork: false,
    modules: [layoffWorld, director.module],
  });
  director.start(core);
  advanceCore(core, "2021-01-15");
  const entry = director.ledger.people
    .get("person:worker")!
    .schedule.find((row) => row.momentId.includes("work.job-lost"));
  return { entry };
}

describe("a layoff scene", () => {
  it("opens at work with the boss who decided it, for a worker with no household", () => {
    const { entry } = run(false);
    expect(entry).toBeDefined();
    const layoff = entry!.bindings.find((row) => row.typeKey === "layoff");
    expect(layoff, JSON.stringify(entry)).toBeDefined();
    expect(layoff!.setting).toEqual({ kind: "workplace", recordId: employer });
    expect(layoff!.roles.find((row) => row.role === "boss")!.personIds).toEqual(
      ["person:boss"],
    );
    expect(
      layoff!.roles.find((row) => row.role === "worker")!.personIds,
    ).toEqual(["person:worker"]);
    expect(layoff!.opener).toBe("boss");
  });

  it("gives a worker with a household the one family scene at home", () => {
    const { entry } = run(true);
    expect(entry).toBeDefined();
    const kinds = entry!.bindings.map((row) => row.typeKey);
    expect(kinds).toContain("news-arrives");
    expect(kinds).not.toContain("layoff");
  });
});
