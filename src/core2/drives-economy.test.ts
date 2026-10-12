import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  createDrivesModule,
  DEFAULT_DRIVES_DATA,
  drivesReport,
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
