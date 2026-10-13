import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { addDays, makeIsoDate } from "../simulation/dates";
import { workgroupOf } from "./encounters";
import { advanceCore, createLifeCore } from "./life";
import { encountersModule } from "./modules/encounters";
import { applyCoreEvent, coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import encounters from "./data/encounters.json" with { type: "json" };

// SG-P15-encounters, new coworkers: a person who starts a job meets the
// workgroup at their employer, people with the same title first. The town and
// its employers are generated; the start is this test's event, because the
// jobs engine does not yet announce a full person's hire (asked of
// OPUS-WORLD; a 1,508-person town recorded no hire in three months).
const drawn = drawPlace("encounters-work-default", "P15-encounters-work");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { settings: { population: 1500 } },
);
const core = createLifeCore(input, { modules: [encountersModule] });
advanceCore(core, addDays(makeIsoDate(core.date), 1));
const api = coreAPI(core);
const groupSize = core.data.parameters.openingCoworkerGroupSize!.value;

// Employed residents at employers larger than a workgroup, each as if they
// had just started there: the event names their own recorded job.
const starters = [...core.people.values()]
  .filter((person) => {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    return (
      person.alive &&
      person.tier !== "husk" &&
      job &&
      (core.finance.jobsByOrganization.get(job.organizationId)?.size ?? 0) >
        groupSize + 1
    );
  })
  .sort((a, b) => a.id.localeCompare(b.id))
  .slice(0, 12);
const results = starters.map((person) => {
  const jobId = person.jobId!;
  const group = workgroupOf(api, person.id, jobId);
  const knownBefore = new Set(person.knownIds);
  const eventId = `event:${encounters.jobStartedEvent}:${core.date}:${jobId}`;
  applyCoreEvent(core, {
    id: eventId,
    date: core.date,
    kind: encounters.jobStartedEvent,
    personIds: [person.id],
    placeId: person.placeId,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: "The generated town's own job record.",
      estimatedFrom: "Test event standing in for the jobs engine's hire.",
    },
    publicRecord: false,
    topic: core.jobs.get(jobId)!.organizationId,
  });
  return { person, jobId, group, knownBefore, eventId };
});

describe(`new coworkers in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("meets the whole workgroup at the employer, and no one else", () => {
    expect(results.length).toBeGreaterThan(0);
    let met = 0;
    for (const { person, jobId, group, knownBefore } of results) {
      const job = core.jobs.get(jobId)!;
      expect(group.length).toBe(groupSize - 1);
      expect(group).not.toContain(person.id);
      for (const id of group) {
        const other = core.jobs.get(core.people.get(id)!.jobId!)!;
        expect(other.organizationId).toBe(job.organizationId);
        expect(person.knownIds.has(id)).toBe(true);
        if (!knownBefore.has(id)) met += 1;
      }
      const newlyKnown = [...person.knownIds].filter(
        (id) => !knownBefore.has(id),
      );
      for (const id of newlyKnown) expect(group).toContain(id);
    }
    expect(met).toBeGreaterThan(0);
  });

  it("puts coworkers with the same title first", () => {
    for (const { jobId, group } of results) {
      const job = core.jobs.get(jobId)!;
      const titles = group.map(
        (id) => core.jobs.get(core.people.get(id)!.jobId!)!.title,
      );
      const firstOther = titles.findIndex((title) => title !== job.title);
      if (firstOther < 0) continue;
      expect(titles.slice(firstOther)).not.toContain(job.title);
      const sameTitle = [
        ...core.finance.jobsByOrganization.get(job.organizationId)!,
      ]
        .map((id) => core.jobs.get(id)!)
        .filter(
          (other) =>
            other.id !== jobId &&
            other.endsAt === undefined &&
            other.title === job.title &&
            core.people.get(other.personId)?.tier !== "husk",
        );
      for (const other of sameTitle) expect(group).toContain(other.personId);
    }
  });
});
