import { beforeAll, describe, expect, it } from "vitest";
import {
  beginHealthEpisode,
  createDemoWorld,
  createWorld,
  crisisRecords,
  declareHazardEpisode,
  discloseHealthEpisode,
  homeStateUsps,
  type EntityId,
  type Person,
  type World,
} from "../simulation";
import {
  authorityDecisions,
  crisisStopAfter,
  crisisStopBaseline,
  knownHealthNotices,
  ownHealthNotices,
  publicCrisisEvents,
} from "./crisis-shell";

/**
 * The shell's CRISIS reads, over the writers CRISIS actually ships. Nothing
 * here hand-builds a record: an episode exists because the episode writer
 * wrote it, and a disclosure is known because the disclosure writer taught it.
 */

let patient: EntityId;
let confidant: EntityId;
let stranger: EntityId;
let world: World;

beforeAll(() => {
  const demo = createDemoWorld("crisis-shell-reads");
  patient = demo.personOrder[0]!;
  confidant = demo.personOrder[1]!;
  stranger = demo.personOrder[2]!;
  world = createWorld({
    seed: "crisis-shell-reads",
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
    control: { kind: "person", personId: patient },
  });
});

function episodeIdOf(current: World): EntityId {
  return crisisRecords(current).find(
    (record) => record.kind === "health-episode",
  )!.id;
}

function withEpisode(): World {
  return beginHealthEpisode(world, {
    stableKey: "shell-read-episode",
    personId: patient,
    severity: "serious",
    initialLimitation: "limited",
    origin: { kind: "authored", note: "Test episode." },
    causalParentIds: [],
  });
}

describe("own health notices", () => {
  it("says plainly that there is no record, rather than saying you are well", () => {
    expect(ownHealthNotices(world, patient)).toEqual([]);
  });

  it("reads the stored episode and the disclosures still open", () => {
    const ill = withEpisode();
    const [notice] = ownHealthNotices(ill, patient);
    expect(notice?.headline).toBe("A serious illness or injury");
    expect(notice?.accessLabel).toBe("Nobody else has been told.");
    expect(notice?.disclosures.map((entry) => entry.access)).toEqual([
      "specific-people",
      "official",
      "public",
    ]);
  });

  it("stops offering a disclosure once it has been made", () => {
    const ill = withEpisode();
    const told = discloseHealthEpisode(ill, {
      stableKey: "player:official",
      episodeId: episodeIdOf(ill),
      access: "official",
      recipientIds: [],
      decidedByPersonId: patient,
    });
    const [notice] = ownHealthNotices(told, patient);
    expect(notice?.accessLabel).toBe("The people responsible know.");
    expect(notice?.disclosures.map((entry) => entry.access)).toEqual([
      "public",
    ]);
  });
});

describe("somebody else's health", () => {
  it("is invisible while it is private", () => {
    const ill = withEpisode();
    expect(knownHealthNotices(ill, confidant)).toEqual([]);
  });

  it("reaches only the person actually told", () => {
    const ill = withEpisode();
    const told = discloseHealthEpisode(ill, {
      stableKey: "player:specific-people",
      episodeId: episodeIdOf(ill),
      access: "specific-people",
      recipientIds: [confidant],
      decidedByPersonId: patient,
    });
    expect(
      knownHealthNotices(told, confidant).map((entry) => entry.personId),
    ).toEqual([patient]);
    expect(knownHealthNotices(told, stranger)).toEqual([]);
    // The subject does not learn about themselves from a disclosure.
    expect(knownHealthNotices(told, patient)).toEqual([]);
  });

  it("is public to anyone once it is made public", () => {
    const ill = withEpisode();
    const told = discloseHealthEpisode(ill, {
      stableKey: "player:public",
      episodeId: episodeIdOf(ill),
      access: "public",
      recipientIds: [],
      decidedByPersonId: patient,
    });
    expect(knownHealthNotices(told, stranger)).toHaveLength(1);
  });
});

describe("public events", () => {
  it("carries nothing while nothing public has happened", () => {
    expect(publicCrisisEvents(withEpisode())).toEqual([]);
  });

  it("does not relabel a public health disclosure as an emergency", () => {
    const ill = withEpisode();
    const told = discloseHealthEpisode(ill, {
      stableKey: "player:public",
      episodeId: episodeIdOf(ill),
      access: "public",
      recipientIds: [],
      decidedByPersonId: patient,
    });
    expect(publicCrisisEvents(told)).toEqual([]);
  });

  it("reads the declared hazard in the event's own words", () => {
    const struck = declareHazardEpisode(world, {
      stableKey: "shell-read-flood",
      family: "flood",
      magnitude: "major",
      stateUsps: homeStateUsps(world, patient)!,
      jurisdictionIds: [world.people[patient]!.homeJurisdictionId],
      durationDays: 3,
      basis: "Test hazard.",
      sourceReference: null,
    });
    const events = publicCrisisEvents(struck);
    expect(events.map((entry) => entry.summary)).toContain(
      "Flooding struck the area (major).",
    );
    // Prose, never an ISO date.
    expect(events[0]!.dateLabel).not.toMatch(/^\d{4}-/);
  });
});

describe("protected decisions after time passed", () => {
  it("is silent when nothing was raised", () => {
    expect(crisisStopAfter(world, crisisStopBaseline(world))).toBeNull();
  });

  it("names the decision and where it lives", () => {
    const since = crisisStopBaseline(world);
    const stop = crisisStopAfter(withEpisode(), since);
    expect(stop?.target).toBe("health");
    expect(stop?.sentence).toContain("a health matter only you can disclose");
  });

  it("offers no decision to a character who holds no such office", () => {
    expect(authorityDecisions(withEpisode())).toEqual([]);
  });
});
