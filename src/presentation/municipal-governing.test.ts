import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  municipalGovernmentForLifePlace,
  municipalPublicMeetingSeries,
} from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  municipalMeetings,
  municipalSeats,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import { deserializeWorld, serializeWorld } from "../simulation";
import type { LegislativeVoteDisposition } from "../simulation/types";
import {
  appointProjectedManager,
  discoverMunicipalPublicMeetings,
  ensureAuthoredPublicMeeting,
  introduceProjectedOrdinance,
  mountOrdinaryMunicipalRoute,
  projectMunicipalGoverning,
} from "./municipal-governing";

function charlottesvilleWorld() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld("muni-governing-cville", place.context, {
    peopleCount: 12,
  });
  const personId = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId } };
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  return { world, government, place, people: world.personOrder };
}

function seatCouncil(
  world: ReturnType<typeof charlottesvilleWorld>["world"],
  governmentKey: string,
  people: readonly string[],
) {
  let next = world;
  for (let index = 0; index < 5; index += 1) {
    next = seatMunicipalMember(next, {
      governmentKey,
      personId: people[index + 1]!,
      startedAt: next.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Mayor" : `Seat ${index + 1}`,
    });
  }
  return next;
}

function councilRoll(
  members: readonly string[],
  yeas: number,
): readonly LegislativeVoteDisposition[] {
  return members.map((personId, index) => ({
    memberKey: `council:${index + 1}`,
    personId,
    disposition: index < yeas ? "yea" : "absent",
  }));
}

describe("feature-local municipal governing adapter", () => {
  it("inspects without creating a sitting, keeps authored timing distinct from discovery, and requires a quorate council election", () => {
    const { world, government, people, place } = charlottesvilleWorld();
    const route = mountOrdinaryMunicipalRoute();
    const inspected = route.inspect(world, government.key);
    expect(inspected?.standing.roles).toEqual(["resident"]);
    expect(inspected?.jurisdictionId).toBe(place.context.jurisdiction.id);
    expect(route.discoverPublicMeetings(world, government.key)).toEqual([]);
    expect(municipalMeetings(world, government.key)).toHaveLength(0);

    const series = municipalPublicMeetingSeries(government)[0]!;
    const prepared = route.authorPublicMeetingForReview(
      world,
      government.key,
      series.seriesKey,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected authored meeting");
    expect(municipalMeetings(prepared.world, government.key)).toHaveLength(1);
    expect(
      municipalMeetings(prepared.world, government.key)[0]!.summary,
    ).toMatch(/authored/);
    const attended = route.attendPublicMeeting(
      prepared.world,
      government.key,
      prepared.activityId,
    );
    expect(attended.ok).toBe(true);
    const citizen = route.inspect(attended.world, government.key);
    expect(citizen?.standing.roles).toEqual(["resident"]);
    expect(citizen?.procedureGaps.map((gap) => gap.field)).toEqual(
      expect.arrayContaining([
        "introduction",
        "readings",
        "what happens after adoption",
      ]),
    );
    expect(
      citizen?.procedureGaps.some((gap) => gap.field === "passage threshold"),
    ).toBe(false);

    let memberWorld = {
      ...attended.world,
      control: { kind: "person" as const, personId: people[1]! },
    };
    memberWorld = seatCouncil(memberWorld, government.key, people);
    const members = municipalSeats(memberWorld, government.key).map(
      (seat) => seat.personId,
    );
    const outsider = route.appointManager(
      attended.world,
      government.key,
      people[10]!,
      councilRoll(members, 3),
    );
    expect(outsider.ok).toBe(false);

    expect(
      route.appointManager(
        memberWorld,
        government.key,
        people[10]!,
        councilRoll(members, 1),
      ).ok,
    ).toBe(false);

    const appointed = route.appointManager(
      memberWorld,
      government.key,
      people[10]!,
      councilRoll(members, 3),
    );
    expect(appointed.ok).toBe(true);
    const view = projectMunicipalGoverning(appointed.world, government.key);
    expect(view?.managerAppointment?.type).toBe("municipal.manager-appointed");
    expect(view?.managerAppointment?.jurisdictionId).toBe(
      place.context.jurisdiction.id,
    );
    expect(
      view?.seats.some(
        (seat) =>
          seat.role === "professional-manager" && seat.personId === people[10],
      ),
    ).toBe(true);

    const duplicate = appointProjectedManager(
      appointed.world,
      government.key,
      people[11]!,
      councilRoll(members, 3),
    );
    expect(duplicate.ok).toBe(false);
    const reloaded = deserializeWorld(serializeWorld(appointed.world));
    expect(
      appointProjectedManager(
        reloaded,
        government.key,
        people[11]!,
        councilRoll(members, 3),
      ).ok,
    ).toBe(false);
    expect(
      introduceProjectedOrdinance(memberWorld, government.key, "Ord. 1").ok,
    ).toBe(false);
    expect(discoverMunicipalPublicMeetings(world, government.key)).toEqual([]);
    expect(
      ensureAuthoredPublicMeeting(world, government.key, series.seriesKey).ok,
    ).toBe(true);
  }, 60000);
});
