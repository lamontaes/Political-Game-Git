import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  createDrivesModule,
  DEFAULT_DRIVES_DATA,
  drivesReport,
  responsibleId,
  withDrives,
} from "./modules/drives";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// M1-11: losses from the economy form drives at the researched rate, and a
// drive's target is the person or institution the event names. Every employer
// in a drawn town closes on one day, recorded as the finance writer records a
// closure; the research is in data/research/drives/economic-losses.json.
const seed = process.env.GOLDEN_PATH_SEED ?? "drives-economy";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 800,
    openingEmployment: true,
  }),
);
const core = createLifeCore(input, {
  data: withDrives(DEFAULT_DATA, DEFAULT_DRIVES_DATA),
  modules: [createDrivesModule(DEFAULT_DRIVES_DATA)],
});
const api = coreAPI(core);
const workersByOrg = new Map<string, string[]>();
for (const job of core.jobs.values())
  if (!job.endsAt && core.people.get(job.personId)?.alive)
    workersByOrg.set(job.organizationId, [
      ...(workersByOrg.get(job.organizationId) ?? []),
      job.personId,
    ]);
for (const [org, workers] of workersByOrg)
  api.emit({
    id: `organization.closed:${org}:${core.date}`,
    date: core.date,
    kind: "organization.closed",
    personIds: workers,
    placeId: core.organizations.get(org)!.placeId,
    publicRecord: true,
    source: { tag: "SOURCED", citation: "Fixture closure.", asOf: core.date },
    facts: { [`organization:${org}:status`]: "closed" },
  });
const report = drivesReport(core);
const decisions = report.decisions.filter((row) =>
  row.eventId.startsWith("organization.closed"),
);

describe(`drives answer closures in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("forms ambitions at the displaced-worker rate, with most people carrying on", () => {
    const workers = [...workersByOrg.values()].flat().length;
    expect(decisions.length).toBe(workers);
    const share = (id: string) =>
      decisions.filter((row) => row.chosen.responseId === id).length /
      decisions.length;
    // Retraining 10-16% plus a few points of new businesses; a wide band for
    // one town's sample.
    expect(share("prove-oneself")).toBeGreaterThan(0.06);
    expect(share("prove-oneself")).toBeLessThan(0.25);
    expect(share("carry-on")).toBeGreaterThan(0.6);
  });

  it("aims every grudge at the business that closed, never a random person", () => {
    for (const drive of report.drives.filter((row) =>
      row.sourceEventId.startsWith("organization.closed"),
    )) {
      if (drive.kind !== "grudge") continue;
      const org = drive.sourceEventId.split(":").slice(1, -1).join(":");
      expect(drive.targetId).toBe(org);
    }
  });

  it("forms no drive from a closure in anyone it did not name", () => {
    const named = new Set([...workersByOrg.values()].flat());
    for (const row of decisions) expect(named.has(row.personId)).toBe(true);
  });
});

// WORLD's job and housing writers name the employer or landlord in the event's
// topic and carry no impulse of their own; the drives data gives each kind its
// sourced impact and reads the responsible party from the topic.
describe(`drives answer WORLD's job losses and evictions (seed ${seed})`, () => {
  const world = createLifeCore(input, {
    data: withDrives(DEFAULT_DATA, DEFAULT_DRIVES_DATA),
    modules: [createDrivesModule(DEFAULT_DRIVES_DATA)],
  });
  const worldApi = coreAPI(world);
  const jobs = [...world.jobs.values()].filter(
    (job) => !job.endsAt && world.people.get(job.personId)?.alive,
  );
  // A real business in the town stands as the landlord.
  const landlord = [...world.organizations.keys()].sort()[0]!;
  // Half the workers are laid off and the other half evicted, so each event
  // forms its own drives rather than strengthening the other's.
  for (const [index, job] of jobs.entries()) {
    const person = world.people.get(job.personId)!;
    if (index % 2 === 0)
      worldApi.emit({
        id: `work.job-lost:${job.id}:${world.date}`,
        date: world.date,
        kind: "work.job-lost",
        topic: job.organizationId,
        personIds: [job.personId],
        placeId: person.placeId,
        publicRecord: false,
        source: {
          tag: "SOURCED",
          citation: "Fixture layoff.",
          asOf: world.date,
        },
      });
    else
      worldApi.emit({
        id: `housing.eviction:${job.personId}:${world.date}`,
        date: world.date,
        kind: "housing.eviction",
        topic: landlord,
        personIds: [job.personId],
        placeId: person.placeId,
        publicRecord: true,
        source: {
          tag: "SOURCED",
          citation: "Fixture filing.",
          asOf: world.date,
        },
      });
  }
  const worldReport = drivesReport(world);
  const orgOf = new Map(jobs.map((job) => [job.personId, job.organizationId]));

  it("forms drives from both, and aims each grudge at the employer or landlord", () => {
    const fromJobs = worldReport.drives.filter((row) =>
      row.sourceEventId.startsWith("work.job-lost"),
    );
    const fromEvictions = worldReport.drives.filter((row) =>
      row.sourceEventId.startsWith("housing.eviction"),
    );
    expect(fromJobs.length).toBeGreaterThan(0);
    expect(fromEvictions.length).toBeGreaterThan(0);
    for (const drive of fromJobs)
      if (drive.kind === "grudge")
        expect(drive.targetId).toBe(orgOf.get(drive.personId));
    for (const drive of fromEvictions)
      if (drive.kind === "grudge") expect(drive.targetId).toBe(landlord);
  });
});

// A layoff's record names who decided it (the owner or manager); when that is
// a living full person, the grudge is held against them, so a confrontation
// can sour a tie between two people. A decider the town has no full person
// for leaves the grudge on the employer the layoff names.
describe(`a layoff holds its decider responsible (seed ${seed})`, () => {
  const job = [...core.jobs.values()]
    .filter((row) => !row.endsAt && core.people.get(row.personId)?.alive)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const decider = [...core.people.values()]
    .filter((p) => p.alive && p.id !== job.personId)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const layoff = (decidedBy: string) => ({
    id: `work.job-lost:${job.id}:${core.date}`,
    date: core.date,
    kind: "work.job-lost",
    topic: job.organizationId,
    personIds: [job.personId],
    placeId: core.people.get(job.personId)!.placeId,
    publicRecord: false,
    facts: { decidedBy },
    source: {
      tag: "SOURCED" as const,
      citation: "Fixture layoff.",
      asOf: core.date,
    },
  });

  it("names the person who decided it when the town has them, else the employer", () => {
    expect(
      responsibleId(DEFAULT_DRIVES_DATA, layoff(decider.id), core.people),
    ).toBe(decider.id);
    expect(
      responsibleId(
        DEFAULT_DRIVES_DATA,
        layoff("person:not-in-town"),
        core.people,
      ),
    ).toBe(job.organizationId);
  });
});
