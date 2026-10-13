import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { availableActs, createLifeCore } from "./life";
import { createLifeActs, LIFE_ACTS } from "./drives-life";
import { createDrivesModule, withDrives } from "./modules/drives";
import { parameter as p } from "./parameters";
import { scoreOffers } from "./choice";
import { coreAPI } from "./state";
import type {
  CoreInput,
  PersonInput,
  PublicOrganization,
  Source,
} from "./types";

// Edge fixture for the offers' contract only; the played-world run (PW-1's
// check K) proves the acts in generated towns.
const startedAt = "2026-10-12";
const home = "place:life-fixture-home";
const office = "organization:life-fixture-office";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled small life-acts input, not observed people.",
  estimatedFrom: "Authored identities and ties.",
};
const newcomer = "person:newcomer";
const friend = "person:friend";
const friendOfFriend = "person:friend-of-friend";
const clerk = "person:clerk";

function person(id: string, overrides: Partial<PersonInput> = {}): PersonInput {
  return {
    id,
    givenName: id,
    familyName: "Fixture",
    birthDate: "1990-01-01",
    placeId: home,
    householdId: `household:${id}`,
    tier: "daily",
    traits: {},
    liquidMinor: p("minorPerDollar") * p("percent"),
    livingCostDailyMinor: p("minorPerDollar"),
    familyIds: [],
    knownIds: [],
    source,
    ...overrides,
  };
}

function input(): CoreInput {
  const people = [
    // Turns 18 the day after the opening.
    person(newcomer, { birthDate: "2008-10-13", knownIds: [friend] }),
    person(friend, {
      birthDate: "2008-03-01",
      knownIds: [newcomer, friendOfFriend],
    }),
    person(friendOfFriend, { birthDate: "2007-06-01", knownIds: [friend] }),
    person(clerk, { tier: "husk", jobId: "job:clerk" }),
  ];
  const record: PublicOrganization = {
    id: office,
    placeId: home,
    name: "Recorded fixture clerk's office",
    kind: "fixture-public-office",
    source,
    affordances: ["known-office"],
    staff: [{ personId: clerk, jobId: "job:clerk", title: "Clerk", source }],
  };
  return {
    seed: "pw6-life-acts",
    startedAt,
    playerId: newcomer,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [
      {
        id: "job:clerk",
        personId: clerk,
        organizationId: office,
        title: "Clerk",
        wageDailyMinor: p("minorPerDollar"),
        hoursDaily: p("workHours"),
        source,
      },
    ],
    organizations: [
      {
        id: office,
        placeId: home,
        name: record.name,
        kind: record.kind,
        liquidMinor: p("minorPerDollar"),
        source,
      },
    ],
    publicOrganizations: [record],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

function lifeCore() {
  const core = createLifeCore(input(), {
    data: withDrives(DEFAULT_DATA),
    modules: [createDrivesModule()],
  });
  const api = coreAPI(core);
  // A tie with the friend, as an opening home or visit would leave one.
  api.relationship(newcomer, friend, "contact", p("socialHours"));
  return { core, api };
}

describe("an idle young adult's offers (PW-6)", () => {
  it("offers meeting a friend's friend and learning the town's offices, each with a reason", () => {
    const { core } = lifeCore();
    const offers = availableActs(core, newcomer);
    const kinds = new Set(offers.map((row) => row.definition.id));
    expect(kinds).toContain("meet-someone-new");
    expect(kinds).toContain("learn-local-places");
    expect(
      offers.find((row) => row.definition.id === "meet-someone-new")?.targetId,
    ).toBe(friendOfFriend);
    expect(
      offers.find((row) => row.definition.id === "learn-local-places")
        ?.targetId,
    ).toBe(office);
    // No jobs module here, so no job market to look in.
    expect(kinds).not.toContain("look-for-work");
    const scored = scoreOffers(core, newcomer, offers);
    const reasonIds = (actionId: string) =>
      scored
        .find((row) => row.offer.definition.id === actionId)!
        .reasonTerms?.map((term) => term.id);
    expect(reasonIds("meet-someone-new")).toContain("small-circle");
    expect(reasonIds("learn-local-places")).toContain("coming-of-age");
  });

  it("a meeting writes the acquaintance on both sides with its cause", () => {
    const { core, api } = lifeCore();
    const chosen = availableActs(core, newcomer).find(
      (row) => row.definition.id === "meet-someone-new",
    )!;
    createLifeActs().effectHandlers!["meet-new-person"]!(
      api,
      newcomer,
      chosen,
      core.date,
      p("one"),
      { actorId: newcomer, date: core.date, reasonKey: "fixture" },
    );
    expect(core.people.get(newcomer)!.knownIds.has(friendOfFriend)).toBe(true);
    expect(core.people.get(friendOfFriend)!.knownIds.has(newcomer)).toBe(true);
    const tie = core.relationships.get(
      [newcomer, friendOfFriend].sort().join(":"),
    );
    expect(tie).toBeDefined();
    expect(JSON.stringify(tie)).toContain(LIFE_ACTS.causes.throughFriend);
    // Once met, they are no longer someone new.
    expect(
      availableActs(core, newcomer).some(
        (row) =>
          row.definition.id === "meet-someone-new" &&
          row.targetId === friendOfFriend,
      ),
    ).toBe(false);
  });
});
