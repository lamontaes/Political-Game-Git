import { describe, expect, it } from "vitest";
import {
  LIVING_WORLD_SCENARIO_PROFILE,
  MINIMUM_AGE,
  ageOnDate,
  deserializeWorld,
  ensureLivingWorldOpening,
  projectCongress,
  publicPartyAffiliation,
  serializeWorld,
  stateJurisdictionForKey,
} from "../simulation";
import type { ChamberView, SeatView, World } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP, createNewGameWorld } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { establishOpeningOfficeholders } from "./opening-officeholders";
import { projectWorldOrientation } from "./living-world-orientation";
import { projectWorld39News } from "./world39-news";

function openLife(seed: string) {
  const started = performance.now();
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed }),
  ).game!;
  return { ...game, openingMs: performance.now() - started };
}

const members = (chamber: ChamberView) =>
  chamber.seats.flatMap((seat) =>
    seat.occupant.kind === "member" ? [seat.occupant.member] : [],
  );

const firstPartyMembers = (
  world: World,
  playerPersonId: string,
  chamber: ChamberView,
) => {
  const first = projectWorldOrientation(world, playerPersonId).parties.find(
    (party) => party.partyKey === "democratic",
  )!;
  return members(chamber).filter(
    (member) => member.partyOrganizationId === first.organizationId,
  ).length;
};

describe("ALIVE43 W1 opening world: Congress and parties", () => {
  const a = openLife("alive43-w1-a");
  const b = openLife("alive43-w1-b");

  it.each([
    ["seed a", a],
    ["seed b", b],
  ])(
    "%s: every voting seat has a persistent member or a vacancy",
    (_, life) => {
      const congress = projectCongress(life.world)!;
      expect(congress).not.toBeNull();
      for (const [chamber, seats] of [
        [congress.house, 435],
        [congress.senate, 100],
      ] as const) {
        const { totals } = chamber;
        expect(totals.seats).toBe(seats);
        expect(new Set(chamber.seats.map((seat) => seat.seatKey)).size).toBe(
          seats,
        );
        expect(totals.noCurrentRecord).toBe(0);
        expect(totals.members + totals.vacancies).toBe(seats);
        expect(totals.byParty.reduce((sum, row) => sum + row.members, 0)).toBe(
          totals.members,
        );
        expect(totals.byCaucus.reduce((sum, row) => sum + row.members, 0)).toBe(
          totals.members,
        );
        const [vMin, vMax] =
          LIVING_WORLD_SCENARIO_PROFILE.vacancies[chamber.chamberKey];
        expect(totals.vacancies).toBeGreaterThanOrEqual(vMin);
        expect(totals.vacancies).toBeLessThanOrEqual(vMax);
        const roster = members(chamber);
        expect(new Set(roster.map((m) => m.personId)).size).toBe(roster.length);
        for (const member of roster) {
          const person = life.world.people[member.personId];
          expect(person, member.title).toBeDefined();
          // Residence is the seat's own state, never borrowed from the player.
          expect(member.residenceLabel).toBeTruthy();
          expect(member.residenceJurisdictionId).toBe(
            stateJurisdictionForKey(`US-${member.stateUsps}`)!.id,
          );
          expect(member.caucusOrganizationId).not.toBeNull();
          expect(
            ageOnDate(member.birthDate, member.serviceSince!),
          ).toBeGreaterThanOrEqual(MINIMUM_AGE[chamber.chamberKey]);
          expect(member.serviceSince! <= member.startedAt!).toBe(true);
          expect(member.startedAt! <= life.world.currentDate).toBe(true);
          expect(life.world.currentDate < member.endExclusive!).toBe(true);
        }
      }
      // Every state has two senators' seats and at least one House seat.
      const states = new Set(
        congress.senate.seats.map((seat) => seat.stateUsps),
      );
      expect(states.size).toBe(50);
      expect(
        new Set(congress.house.seats.map((seat) => seat.stateUsps)).size,
      ).toBe(50);
    },
  );

  it("replays byte-identically and does not fix one majority for every seed", () => {
    expect(serializeWorld(openLife("alive43-w1-a").world)).toBe(
      serializeWorld(a.world),
    );
    const houseFirst = [
      a,
      b,
      ...["c", "d", "e", "f"].map((s) => openLife(`alive43-w1-${s}`)),
    ].map((life) =>
      firstPartyMembers(
        life.world,
        life.playerPersonId,
        projectCongress(life.world)!.house,
      ),
    );
    expect(new Set(houseFirst).size).toBeGreaterThan(1);
    expect(
      members(projectCongress(a.world)!.senate).map((m) => m.personName),
    ).not.toEqual(
      members(projectCongress(b.world)!.senate).map((m) => m.personName),
    );
  }, 120_000);

  it("reads write nothing and repeated openings reroll nothing", () => {
    const before = serializeWorld(a.world);
    const orientation = projectWorldOrientation(a.world, a.playerPersonId);
    projectCongress(a.world);
    expect(serializeWorld(a.world)).toBe(before);
    expect(establishOpeningOfficeholders(a.world, a.playerPersonId)).toBe(
      a.world,
    );
    expect(ensureLivingWorldOpening(a.world, a.playerPersonId)).toBe(a.world);
    const restored = deserializeWorld(before);
    expect(projectWorldOrientation(restored, a.playerPersonId)).toEqual(
      orientation,
    );
  });

  it("gives executives a public affiliation but not the chief justice, and derives party counts", () => {
    const orientation = projectWorldOrientation(a.world, a.playerPersonId);
    const president = orientation.executive.find(
      (holder) => holder.officeKey === "us-president",
    )!;
    const chiefJustice = orientation.executive.find(
      (holder) => holder.officeKey === "us-chief-justice",
    )!;
    expect(president.partyOrganizationId).not.toBeNull();
    expect(chiefJustice.partyOrganizationId).toBeNull();
    expect(orientation.homeState?.governor?.partyOrganizationId).not.toBeNull();
    expect(orientation.parties.map((party) => party.name).sort()).toEqual([
      "Democratic Party",
      "Republican Party",
    ]);
    const congress = orientation.congress!;
    const affiliatedMembers = [
      ...members(congress.house),
      ...members(congress.senate),
    ].filter((member) => member.partyOrganizationId !== null).length;
    const executivesAffiliated = [
      ...orientation.executive,
      ...(orientation.homeState?.governor
        ? [orientation.homeState.governor]
        : []),
    ].filter((holder) => holder.partyOrganizationId !== null).length;
    expect(
      orientation.parties.reduce(
        (sum, p) => sum + p.affiliatedOfficeholders,
        0,
      ),
    ).toBe(affiliatedMembers + executivesAffiliated);
    // The locality lists actual governments and never invents their holders.
    for (const government of orientation.locality?.governments ?? [])
      expect(government.holders).toEqual([]);
  });

  it("keeps party affiliation separate from belief, positions and caucus", () => {
    const roster = members(projectCongress(a.world)!.house);
    const ids = new Set(roster.map((member) => member.personId));
    for (const [key, records] of Object.entries(a.world.history)) {
      if (
        !/belief|position|commitment|vote/i.test(key) ||
        !Array.isArray(records)
      )
        continue;
      for (const record of records as readonly Record<string, unknown>[])
        expect(ids.has(record.personId as string), key).toBe(false);
    }
    const independents = roster.filter((m) => m.partyOrganizationId === null);
    for (const member of independents) {
      expect(publicPartyAffiliation(a.world, member.personId)).toBeNull();
      expect(member.caucusOrganizationId).not.toBeNull();
    }
  });

  it("does not present the federal chambers as local institutions in News", () => {
    const congress = projectCongress(a.world)!;
    const standing = projectWorld39News(a.world, a.playerPersonId).standing;
    const listed = new Set(standing.map((item) => item.recordId));
    expect(listed.has(congress.house.organizationId)).toBe(false);
    expect(listed.has(congress.senate.organizationId)).toBe(false);
  });

  it("old-save control: a pre-W1 opening save shows no Congress and gains nothing on read", () => {
    // Exactly what an opening wrote before W1: the new life plus its federal,
    // state and local officeholders, with no living-world snapshot.
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alive43-w1-old",
    });
    const old = deserializeWorld(
      serializeWorld(
        establishOpeningOfficeholders(created.world, created.playerPersonId),
      ),
    );
    const before = serializeWorld(old);
    const orientation = projectWorldOrientation(old, created.playerPersonId);
    expect(orientation.congress).toBeNull();
    expect(orientation.parties).toEqual([]);
    expect(orientation.executive.length).toBeGreaterThan(0);
    for (const holder of orientation.executive)
      expect(holder.partyOrganizationId).toBeNull();
    expect(projectCongress(old)).toBeNull();
    // Reading neither creates members nor rewrites the existing holders.
    expect(serializeWorld(old)).toBe(before);
    expect(Object.keys(old.people).length).toBe(
      Object.keys(created.world.people).length +
        orientation.executive.length +
        (orientation.homeState?.governor ? 1 : 0),
    );
  });

  it("negative control: a seat whose recorded term ended is not shown as a member", () => {
    const seatAfterTerm = (seat: SeatView) => seat.occupant.kind;
    const later: World = {
      ...a.world,
      currentDate: "2033-01-04" as World["currentDate"],
    };
    const congress = projectCongress(later)!;
    expect(
      congress.house.seats.every(
        (s) => seatAfterTerm(s) === "no-current-record",
      ),
    ).toBe(true);
    expect(congress.house.totals.members).toBe(0);
    expect(congress.house.totals.noCurrentRecord).toBe(435);
  });

  it("keeps the Congress snapshot within its own save budget", () => {
    const created = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "alive43-w1-a",
    });
    const staffed = establishOpeningOfficeholders(
      created.world,
      created.playerPersonId,
    );
    const added =
      serializeWorld(a.world).length - serializeWorld(staffed).length;
    console.info(
      `[alive43-w1] opening ${a.openingMs.toFixed(0)}ms / ${b.openingMs.toFixed(0)}ms; Congress snapshot adds ${added} bytes`,
    );
    // The budget only means something for a save that has the snapshot.
    expect(projectCongress(a.world)).not.toBeNull();
    expect(projectCongress(staffed)).toBeNull();
    expect(added).toBeGreaterThan(0);
    // 535 persistent members are about 1.4 KB each. A per-member
    // participation and state record would add another ~0.8 MB.
    expect(added).toBeLessThan(1_500_000);
    expect(a.world.history.organizationParticipations.length).toBeLessThan(10);
  });
});
