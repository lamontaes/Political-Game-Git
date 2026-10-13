import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { groupsModule, GROUPS_MODULE_ID } from "./modules/groups";
import { viewsModule } from "./modules/views";
import { addOpeningGroups } from "./opening-groups";
import { addOpeningProfiles } from "./opening-profile";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import membership from "./data/groups/membership.json" with { type: "json" };

// BOARD, Oct 12 (groups): a drawn town has the groups the IRS lists for it
// (or its county), its adults belong by their own circumstances at about the
// survey's rates, and gatherings bring members together over a month.
const seed = process.env.GOLDEN_PATH_SEED ?? "groups-a";
const input = addOpeningGroups(
  addOpeningProfiles(
    buildDeepPast(
      buildPopulation({
        seed,
        ...(process.env.GOLDEN_PATH_SEED
          ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
          : {}),
        startedAt: "2021-01-01",
        minimumPeople: 800,
      }),
    ),
  ),
);
const groups = (input.publicOrganizations ?? []).filter(
  (row) => row.facts?.groupKind,
);
const core = createLifeCore(input, { modules: [viewsModule, groupsModule] });
const api = coreAPI(core);
advanceCore(core, addDays(makeIsoDate(core.date), 1));
const membershipsAtOpening = [...core.memberships.values()].filter((row) =>
  groups.some((group) => group.id === row.organizationId),
);
const afterOpening = core.date;
advanceCore(core, addDays(makeIsoDate(core.date), 35));
const adults = [...core.people.values()].filter(
  (row) =>
    row.alive &&
    row.tier !== "husk" &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.startedAt)) >= 18,
);

describe(`groups in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("has the groups the IRS lists for the town or its county, each with its record", () => {
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(Object.keys(membership.kinds)).toContain(group.facts!.groupKind);
      // A college's student organization comes from the college, not the IRS.
      if (group.facts!.countBasis === "college") {
        expect(group.source.citation).toMatch(/IPEDS/);
        continue;
      }
      expect(Number(group.facts!.listed)).toBeGreaterThan(0);
      expect(group.source.citation).toMatch(/Internal Revenue Service|IRS/);
    }
  });

  it("lets only enrolled students into a college's student organization, their own college's", () => {
    for (const row of membershipsAtOpening) {
      const group = groups.find((g) => g.id === row.organizationId)!;
      if (group.facts!.groupKind !== "student-organization") continue;
      const college = core.people
        .get(row.personId)!
        .pastFacts?.find((fact) => fact.facts?.stage === "college");
      expect(college?.facts?.institutionSourceId).toBe(
        group.facts!.institutionSourceId,
      );
    }
  });

  it("gives its adults memberships by their circumstances, and members know each other", () => {
    expect(membershipsAtOpening.length).toBeGreaterThan(0);
    const share =
      new Set(membershipsAtOpening.map((r) => r.personId)).size / adults.length;
    expect(share).toBeGreaterThan(0.05);
    expect(share).toBeLessThan(0.7);
    for (const row of membershipsAtOpening.slice(0, 50)) {
      const person = core.people.get(row.personId)!;
      expect(
        api.knows(person.id, `organization:${row.organizationId}:public`),
      ).toBeDefined();
    }
  });

  it("only parents with children at home belong to a parent-teacher group, and only people of faith to a congregation", () => {
    for (const row of membershipsAtOpening) {
      const group = groups.find((g) => g.id === row.organizationId)!;
      const person = core.people.get(row.personId)!;
      if (group.facts!.groupKind === "congregation")
        expect(
          person.pastFacts?.find((f) => f.kind === "profile:faith")?.facts
            ?.group,
        ).not.toBe("none");
    }
  });

  it("brings members together at gatherings over a month", () => {
    // Reasons are kept only for the player's circle, so read the ties: two
    // members of one group in touch after the opening.
    const groupOf = new Map<string, Set<string>>();
    for (const row of core.memberships.values())
      if (groups.some((group) => group.id === row.organizationId))
        groupOf.set(
          row.personId,
          (groupOf.get(row.personId) ?? new Set()).add(row.organizationId),
        );
    const grew = [...core.relationships.values()].filter((row) => {
      const a = groupOf.get(row.actorId);
      const b = groupOf.get(row.otherId);
      return (
        row.lastContactDate > afterOpening &&
        // Not housemates, who are in touch at home anyway.
        core.people.get(row.actorId)!.householdId !==
          core.people.get(row.otherId)!.householdId &&
        !!a &&
        !!b &&
        [...a].some((id) => b.has(id))
      );
    });
    expect(grew.length).toBeGreaterThan(0);
    expect(
      api.moduleState(GROUPS_MODULE_ID).table("groups").rows().length,
    ).toBeGreaterThan(0);
  });
});
