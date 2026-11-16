/**
 * A school's rooms are a meeting place only under its district's joint use
 * agreement, a fact generated with the world for each district at the share of
 * districts that had one in its Census region (CDC SHPPS 2012). Colleges are never
 * offered as meeting places: no record says a room of theirs is open. An
 * association's hall, its building on record, is one for its own members (SG-P8-civic-inputs, removed).
 *
 * Pinned: seed joint-use-1. Alexander City, Alabama (0101132), whose one high
 * school's district has an agreement in that seed, and Adamsville, Alabama
 * (0100460), whose district has none. Edgar, Wisconsin (5522550), seed
 * edgar-petition-1, whose association hall is staged on the opening day.
 */
import { describe, expect, it } from "vitest";
import directoryJson from "../../data/research/places/local-institutions.json" with { type: "json" };
import jointUse from "../../data/research/core/shpps-2012-joint-use.json" with { type: "json" };
import {
  DEFAULT_CIVIC_INPUTS_DATA,
  districtHasJointUse,
  enrichCivicInputs,
} from "./civic-inputs";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { LIFE_MODULE } from "./modules/life";
import { coreAPI } from "./state";
import { parameter as p } from "./parameters";
import { realLocalities } from "./places";
import { buildPopulation } from "./population";
import { censusRegionOf, censusRegionStates } from "./reference/census-regions";

const seed = "joint-use-1";
const directory = directoryJson as unknown as {
  places: Record<string, { highSchools: { sourceId: string }[] } | undefined>;
};

function openedIn(placeKey: string) {
  const opening = buildPopulation({
    seed,
    startedAt: gameStartDate(),
    placeKey,
    minimumPeople: p("populationTestMinimum"),
  });
  return enrichCivicInputs(opening).publicOrganizations ?? [];
}

describe(`school meeting rooms follow the district's joint use agreement, seed ${seed}`, () => {
  it("the share of districts with an agreement lands in the survey's band, nationally and by region", () => {
    const states = new Set(censusRegionStates());
    const byRegion = new Map<string, boolean[]>();
    const all = new Map<string, boolean>();
    for (const place of realLocalities()) {
      const usps = place.stateJurisdictionKey?.slice(3);
      const group = place.sourceGeoid
        ? directory.places[place.sourceGeoid]
        : undefined;
      if (!group || !usps || !states.has(usps)) continue;
      for (const school of group.highSchools) {
        const district = school.sourceId.slice(
          0,
          DEFAULT_CIVIC_INPUTS_DATA.districtJointUse.districtIdLength,
        );
        if (all.has(district)) continue;
        const open = districtHasJointUse(seed, district, usps);
        all.set(district, open);
        const region = censusRegionOf(usps);
        byRegion.set(region, [...(byRegion.get(region) ?? []), open]);
      }
    }
    const share = (rows: readonly boolean[]) =>
      rows.filter(Boolean).length / rows.length;
    const national = share([...all.values()]);
    process.stdout.write(
      `JOINT USE seed ${seed}: ${all.size} districts, ${(national * 100).toFixed(1)}% with an agreement\n`,
    );
    expect(national).toBeGreaterThanOrEqual(jointUse.overall.low);
    expect(national).toBeLessThanOrEqual(jointUse.overall.high);
    for (const [region, rows] of byRegion) {
      const band = jointUse.byRegion[region as keyof typeof jointUse.byRegion];
      expect(share(rows), region).toBeGreaterThanOrEqual(band.low);
      expect(share(rows), region).toBeLessThanOrEqual(band.high);
    }
  });

  it("Alexander City, Alabama: the high school of a district with an agreement is a meeting place", () => {
    const rows = openedIn("0101132");
    const school = rows.find(
      (row) => row.name === "Benjamin Russell High School",
    );
    expect(school, "the town's high school").toBeDefined();
    expect(school!.affordances).toContain("public-meeting-place");
    expect(school!.facts!.meetingAccess).toBe("district-joint-use-agreement");
  }, 120_000);

  it("Adamsville, Alabama: the high school of a district without one is not, and no college is anywhere; an association hall is for its members", () => {
    const rows = openedIn("0100460");
    const school = rows.find((row) => row.name === "Minor High School");
    expect(school, "the town's high school").toBeDefined();
    expect(school!.affordances ?? []).not.toContain("public-meeting-place");
    expect(school!.facts!.meetingAccess).toBe(
      "no-district-joint-use-agreement",
    );
    for (const row of [...rows, ...openedIn("0101132")])
      if (row.affordances?.includes("public-meeting-place"))
        expect(
          row.facts!.sourceKind === "high-school"
            ? "district-joint-use-agreement"
            : "members",
          row.name,
        ).toBe(row.facts!.meetingAccess);
  }, 240_000);

  it("Edgar, Wisconsin: a group's hall is offered to a member who knows it, never to someone outside it who knows it too", () => {
    // Staged through the game's own acts on the opening day, not waited for
    // in a played year: who joins and who looks the hall up in a year is
    // whatever the year's choices make it (the test once waited a year for an
    // outsider who had looked it up; the year stopped making one).
    const { core } = buildBenchWorld("edgar-petition-1", gameStartDate(), {
      twoLevel: true,
      placeKey: "5522550",
    });
    const api = coreAPI(core);
    const action = core.data.actions.find(
      (row) => row.targetKind === "public-meeting-place",
    )!;
    const provide = LIFE_MODULE.offerProviders!["public-meeting-place"]!;
    const hall = [...core.publicOrganizations.values()].find(
      (row) => row.facts?.meetingAccess === "members",
    )!;
    expect(hall, "a group's hall").toBeDefined();
    const offeredTo = (personId: string) =>
      provide(api, core.people.get(personId as never)!, action).some(
        (row) => row.targetId === hall.id,
      );
    // Two grown residents of the town, neither on the hall's staff: one
    // joins the group (the join act), and both look it up (the public-lookup act).
    const [member, outsider] = [...core.people.values()]
      .filter(
        (person) =>
          person.alive &&
          person.placeId === hall.placeId &&
          person.tier !== "husk" &&
          person.birthDate <= addDays(makeIsoDate(core.date), -365 * 25) &&
          !core.memberships.has(`${person.id}:${hall.id}`) &&
          !hall.staff?.some((row) => row.personId === person.id),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(outsider, "two grown residents").toBeDefined();
    api.join(member!.id, hall.id);
    for (const person of [member!, outsider!])
      api.lookupPublicOrganization(person.id, hall.id);
    expect(
      api.knows(outsider!.id, `organization:${hall.id}:public`),
    ).toBeTruthy();
    expect(core.memberships.has(`${member!.id}:${hall.id}`)).toBe(true);
    expect(offeredTo(member!.id), `${member!.id} at ${hall.name}`).toBe(true);
    expect(offeredTo(outsider!.id), `${outsider!.id} at ${hall.name}`).toBe(
      false,
    );
    // Its staff are offered it too.
    const staff = hall.staff?.[0]?.personId;
    if (staff && core.people.get(staff as never)?.placeId === hall.placeId) {
      api.lookupPublicOrganization(staff as never, hall.id);
      expect(offeredTo(staff), `${staff}, staff of ${hall.name}`).toBe(true);
    }
  }, 60_000);
});
