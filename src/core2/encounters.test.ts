import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../simulation/dates";
import { enrichCivicInputs } from "./civic-inputs";
import { CLOSENESS, levelFromHours } from "./closeness";
import { buildDeepPast } from "./deep-past";
import { ENCOUNTERS, meetAtGathering, meetGroup } from "./encounters";
import { advanceCore, createLifeCore } from "./life";
import { parameter } from "./parameters";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import type { CoreState, PastFact } from "./types";

// P15 part 5 (owner ruling on #3956): people meet during play through a real
// shared moment, and every closeness change saves its reason (#3940).
const seed = "p15-encounters";
const input = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({ seed, startedAt: "2021-01-01", minimumPeople: 400 }),
  ),
);
const place = input.placeMetadata?.placeName;

const metFacts = (core: CoreState, kind: string) =>
  [...core.people.values()].flatMap((person) =>
    (person.pastFacts ?? [])
      .filter((fact) => fact.kind === `${ENCOUNTERS.factKindPrefix}${kind}`)
      .map((fact) => ({ person, fact })),
  );

describe(`meeting people during play (${place}, seed ${seed})`, () => {
  const core = createLifeCore(input);
  const opened = new Map(
    [...core.people.values()].map((person) => [
      person.id,
      new Set(person.knownIds),
    ]),
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 28));
  const reasons = new Set(Object.values(CLOSENESS.reasonKeys));

  it("saves a reason and its records with every closeness change", () => {
    expect(core.relationships.size).toBeGreaterThan(0);
    for (const row of core.relationships.values()) {
      expect(reasons.has(row.reasonKey)).toBe(true);
      expect(row.basisRecordIds.length).toBeGreaterThan(0);
      expect(row.levelBefore).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(row.changeHours)).toBe(true);
    }
    // Weekly time at home names the household it was spent in.
    const home = [...core.relationships.values()].filter(
      (row) => row.reasonKey === CLOSENESS.reasonKeys.sharedHome,
    );
    expect(home.length).toBeGreaterThan(0);
    for (const row of home)
      expect(core.households.has(row.basisRecordIds[0]!)).toBe(true);
  });

  it("names the visit's act as the reason a contact changed closeness", () => {
    const contact = [...core.relationships.values()].filter(
      (row) => row.reasonKey === CLOSENESS.reasonKeys.contact,
    );
    expect(contact.length).toBeGreaterThan(0);
    for (const row of contact) {
      const actId = row.basisRecordIds[0]!;
      const log = core.durableLog.get(actId);
      // Acts are kept in the log for the player's circle (and observers).
      if (log) {
        expect(log.kind).toBe("person.acted");
        expect([row.actorId, row.otherId]).toContain(log.actorId);
      }
    }
  });

  it("meets the people a visited host lives with, with a dated fact and a first tie", () => {
    const met = metFacts(core, ENCOUNTERS.visit.kind);
    expect(met.length).toBeGreaterThan(0);
    for (const { person, fact } of met) {
      const otherId = fact.facts!.otherPersonId!;
      const other = core.people.get(otherId)!;
      expect(other).toBeDefined();
      expect(core.households.has(fact.facts!.setting!)).toBe(true);
      expect(fact.facts!.placeId).toBe(
        core.households.get(fact.facts!.setting!)!.placeId,
      );
      expect(fact.summary).toContain(other.givenName);
      expect(person.knownIds.has(otherId)).toBe(true);
      // Someone they did not know before learns the name from this fact.
      if (!opened.get(person.id)!.has(otherId))
        expect(person.knownIdSources?.[otherId]?.sourceFactId).toBe(fact.id);
      const tie = core.relationships.get(
        [person.id, otherId].sort().join(":"),
      )!;
      expect(tie).toBeDefined();
      // Either side met the other on this date; later contact may add to it.
      if (tie.reasonKey === CLOSENESS.reasonKeys.metVisiting) {
        expect(tie.lastContactDate).toBe(fact.date);
        expect(tie.level).toBeCloseTo(
          levelFromHours(
            (key) => parameter(key, core.data.parameters),
            Number(fact.facts!.hours),
          ),
        );
      }
    }
    // The visitor and the housemate each record the meeting.
    const ids = new Set(met.map(({ fact }) => fact.id));
    for (const { person, fact } of met) {
      const mirror = `${fact.facts!.otherPersonId}:${ENCOUNTERS.version}:${ENCOUNTERS.visit.kind}:${fact.date}:${person.id}`;
      expect(ids.has(mirror)).toBe(true);
    }
  });

  it("meets a group's members on joining and the others at a meeting", () => {
    const fresh = createLifeCore(input);
    const api = coreAPI(fresh);
    const group = [...fresh.publicOrganizations.values()].find((row) =>
      row.affordances?.includes("known-group"),
    );
    // Three residents with no ties to each other yet, from different homes.
    const untied = [...fresh.people.values()].filter(
      (person) => person.tier !== "husk" && person.alive,
    );
    const pick = [untied[0]!];
    for (const person of untied)
      if (
        pick.length < 3 &&
        pick.every(
          (other) =>
            other.householdId !== person.householdId &&
            !fresh.relationships.has([person.id, other.id].sort().join(":")),
        )
      )
        pick.push(person);
    const [a, b, c] = pick;
    expect(group).toBeDefined();
    expect(c).toBeDefined();
    if (!group || !a || !b || !c) return;
    api.join(a.id, group.id);
    meetGroup(api, b.id, group.id, 2, "act:test-join");
    const tie = fresh.relationships.get([a.id, b.id].sort().join(":"))!;
    expect(tie.reasonKey).toBe(CLOSENESS.reasonKeys.metJoining);
    expect(tie.basisRecordIds).toEqual(["act:test-join", group.id]);
    expect(b.knownIds.has(a.id)).toBe(true);
    const joined = (b.pastFacts ?? []).find(
      (fact: PastFact) => fact.facts?.otherPersonId === a.id,
    )!;
    expect(joined.summary).toContain(group.name);

    // A meeting: c shares the organizer's cause and knows them.
    api.emit({
      id: "event:test",
      date: fresh.date,
      kind: "test.shared-concern",
      personIds: [b.id, c.id],
      placeId: b.placeId,
      source: { tag: "SOURCED", asOf: fresh.date, citation: "Test event." },
    });
    for (const person of [b, c]) {
      api.updateDrive(person.id, {
        id: `test:${person.id}`,
        sourceEventId: "event:test",
        topic: "topic:test",
        desiredChange: "change:test",
        strength: 1,
      });
    }
    b.knownIds.add(c.id);
    const met = meetAtGathering(
      api,
      b.id,
      group.id,
      "topic:test",
      2,
      "event:test-meeting",
    );
    expect(met).toBeGreaterThan(0);
    const atMeeting = fresh.relationships.get([b.id, c.id].sort().join(":"))!;
    expect(atMeeting.reasonKey).toBe(CLOSENESS.reasonKeys.metAtMeeting);
    // a (a member of the hosting group) meets c there too.
    expect(fresh.relationships.has([a.id, c.id].sort().join(":"))).toBe(true);
    // Meeting again adds no second first-meeting.
    expect(
      meetAtGathering(api, b.id, group.id, "topic:test", 2, "event:again"),
    ).toBe(0);
  });
});
