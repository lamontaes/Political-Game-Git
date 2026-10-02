import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../simulation/life";
import { makeIsoDate } from "../simulation/dates";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { pickDistinct, SeededRng } from "../simulation/rng";
import type { World, EntityId } from "../simulation/types";
import { createStartingPerson } from "../simulation/people";
import { createWorld } from "../simulation/world";
import { projectLifeSoFarEnglish } from "./life-so-far-english";

const SEED = "opening-journal-recorded-work";
const [place] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const provenance = {
  kind: "authored" as const,
  note: "Recorded journal fixture",
};
function fixture() {
  const small = smallWorld({ place: place!.jurisdictionKey, seed: SEED });
  const person = createStartingPerson({
    worldId: small.world.id,
    worldSeed: SEED,
    currentDate: small.world.currentDate,
    homeJurisdictionId: small.jurisdictionId,
    age: 51,
  });
  const world = createWorld({
    seed: SEED,
    currentDate: small.world.currentDate,
    people: [person],
    jurisdictions: small.world.jurisdictionOrder.map(
      (id) => small.world.jurisdictions[id]!,
    ),
    policyCatalog: small.world.policyCatalog,
  });
  return { world, personId: person.id };
}
function job(world: World, personId: EntityId, name: string, date: string) {
  let next = createOrganization(world, {
    stableKey: name,
    formedAt: makeIsoDate(date),
    provenance,
    initialProfile: {
      name,
      classification: "enterprise:retail",
      locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
    },
  });
  next = createWorkRelationship(next, {
    stableKey: `${name}:work`,
    personId,
    organizationId: next.history.organizations.at(-1)!.id,
    startedAt: makeIsoDate(date),
    kind: "employment:local-business",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Clerk",
      occupationClassification: "occupation:office-clerk",
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
  return { world: next, workId: next.history.workRelationships.at(-1)!.id };
}
function state(
  world: World,
  workId: EntityId,
  status: "ended" | "temporarily-inactive" | "active",
  date: string,
) {
  return recordWorkStatus(world, {
    stableKey: `${workId}:${status}:${date}`,
    workRelationshipId: workId,
    effectiveAt: makeIsoDate(date),
    status,
    reason: "engine context, not a diary motive",
    provenance,
    supersedesStatusId: world.history.workStatuses
      .filter((row) => row.workRelationshipId === workId)
      .at(-1)!.id,
  });
}

describe(`opening journal saved employment (${place!.name}, seed ${SEED})`, () => {
  it("orders starts and saved endings by time and preserves the exact source IDs", () => {
    const small = fixture();
    const later = job(
      small.world,
      small.personId,
      "Later employer",
      "2024-01-01",
    );
    const earlier = job(
      later.world,
      small.personId,
      "Earlier employer",
      "2000-01-01",
    );
    const world = state(earlier.world, earlier.workId, "ended", "2004-01-01");
    const before = JSON.stringify(world);
    const journal = projectLifeSoFarEnglish(world, small.personId);
    const text = journal.sentences.join(" ");
    expect(
      text.indexOf("I started work at Earlier employer in 2000."),
    ).toBeLessThan(text.indexOf("My work at Earlier employer ended in 2004."));
    expect(
      text.indexOf("My work at Earlier employer ended in 2004."),
    ).toBeLessThan(text.indexOf("I started work at Later employer in 2024."));
    expect(text).toContain("I still work at Later employer.");
    expect(text).not.toMatch(/unemployed|gap|engine context|because|[Yy]ou\b/);
    expect(journal.sourceRecordIds).toContain(
      world.history.workStatuses.at(-1)!.id,
    );
    expect(JSON.stringify(world)).toBe(before);
    expect(
      projectLifeSoFarEnglish(JSON.parse(before) as World, small.personId),
    ).toEqual(journal);
  });
  it("describes a saved pause and resumption without asserting an across-job gap", () => {
    const small = fixture();
    const hired = job(
      small.world,
      small.personId,
      "Recorded employer",
      "2010-01-01",
    );
    const paused = state(
      hired.world,
      hired.workId,
      "temporarily-inactive",
      "2011-01-01",
    );
    const resumed = state(paused, hired.workId, "active", "2012-01-01");
    const text = projectLifeSoFarEnglish(
      resumed,
      small.personId,
    ).sentences.join(" ");
    expect(text).toContain("My work at Recorded employer was on hold in 2011.");
    expect(text).toContain("My work at Recorded employer resumed in 2012.");
    expect(text).not.toMatch(/unemployed|engine context|because/);
  });
});
