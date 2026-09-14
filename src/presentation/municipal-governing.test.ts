import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../simulation/demo";
import { requireLifePlace } from "../simulation/life-places";
import {
  municipalGovernmentForLifePlace,
  municipalPublicMeetingSeries,
} from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import { deserializeWorld, serializeWorld } from "../simulation";
import {
  appointProjectedManager,
  attendProjectedPublicMeeting,
  ensureAuthoredPublicMeeting,
  introduceProjectedOrdinance,
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

describe("feature-local municipal governing adapter", () => {
  it("projects attendance, a compiled manager appointment, and named ordinance gaps", () => {
    const { world, government, people } = charlottesvilleWorld();
    const series = municipalPublicMeetingSeries(government)[0]!;
    const prepared = ensureAuthoredPublicMeeting(
      world,
      government.key,
      series.seriesKey,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) throw new Error("expected authored meeting");
    const attended = attendProjectedPublicMeeting(
      prepared.world,
      government.key,
      prepared.activityId,
    );
    expect(attended.ok).toBe(true);
    const citizen = projectMunicipalGoverning(attended.world, government.key);
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
    memberWorld = seatMunicipalMember(memberWorld, {
      governmentKey: government.key,
      personId: people[1]!,
      startedAt: memberWorld.currentDate,
      role: "member",
      seatLabel: "Authored council seat",
    });
    const outsider = appointProjectedManager(
      attended.world,
      government.key,
      people[10]!,
    );
    expect(outsider.ok).toBe(false);

    const appointed = appointProjectedManager(
      memberWorld,
      government.key,
      people[10]!,
    );
    expect(appointed.ok).toBe(true);
    const view = projectMunicipalGoverning(appointed.world, government.key);
    expect(view?.managerAppointment?.type).toBe("municipal.manager-appointed");
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
    );
    expect(duplicate.ok).toBe(false);
    const reloaded = deserializeWorld(serializeWorld(appointed.world));
    expect(
      appointProjectedManager(reloaded, government.key, people[11]!).ok,
    ).toBe(false);
    expect(
      introduceProjectedOrdinance(memberWorld, government.key, "Ord. 1").ok,
    ).toBe(false);
  }, 60000);
});
