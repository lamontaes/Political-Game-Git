import { afterEach, describe, expect, it } from "vitest";
import {
  moveToTermDate,
  recordedTermFixture,
} from "../../tests/fixtures/recorded-legislative-term";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  addDays,
  bindRuleCapabilityResolver,
  datedTransitionServices,
  makeIsoDate,
  officeTransitionProfile,
  OFFICE_TRANSITION_PROFILES,
  OFFICE_TRANSITION_SERVICE_ATTENDED,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import { fileForStateExecutiveOffice } from "./nationwide-candidacy";
import {
  attendOfficeTransitionService,
  projectOfficeTransition,
  projectSwearingIn,
  takeOathForHeldOffice,
} from "./office-transition";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("every level has a transition that behaves", () => {
  it("resolves a profile for every level, each marked sourced or blanket with what is not coded", () => {
    for (const level of [
      "federal-house",
      "federal-senate",
      "state-legislature",
      "state-executive",
      "local",
    ] as const) {
      const profile = officeTransitionProfile(level);
      expect(profile.level).toBe(level);
      expect(profile.services.length).toBeGreaterThan(0);
      expect(profile.notCoded.length).toBeGreaterThan(0);
    }
    expect(
      OFFICE_TRANSITION_PROFILES.filter((p) => p.coverage === "blanket").map(
        (p) => p.level,
      ),
    ).toEqual(["state-legislature", "state-executive", "local"]);
  });

  it("dates Congress's November orientation before a January 3 start", () => {
    const election = makeIsoDate("2028-11-07");
    const start = makeIsoDate("2029-01-03");
    const house = datedTransitionServices(
      officeTransitionProfile("federal-house"),
      election,
      start,
    );
    const orientation = house.find(
      (s) => s.key === "house-new-member-orientation",
    )!;
    expect(orientation.opensOn).toBe("2028-11-14");
    expect(orientation.closesOn).toBe("2028-11-28");
    expect(house.find((s) => s.key === "house-staff-planning")!.closesOn).toBe(
      "2029-01-02",
    );
  });

  it("offers nothing that would fall inside the term, and nothing at all with no gap", () => {
    const profile = officeTransitionProfile("state-legislature");
    const election = makeIsoDate("2026-11-03");
    // Ten days: committee requests close fourteen days before the start, so
    // they cannot fit; the rest are squeezed into the days there are.
    const short = datedTransitionServices(
      profile,
      election,
      addDays(election, 10),
    );
    expect(short.map((s) => s.key)).toEqual([
      "legislature-new-member-orientation",
      "legislature-caucus-organizing",
    ]);
    for (const service of short) expect(service.opensOn > election).toBe(true);
    for (const service of short)
      expect(service.closesOn < addDays(election, 10)).toBe(true);
    expect(datedTransitionServices(profile, election, election)).toEqual([]);
    expect(
      datedTransitionServices(profile, election, addDays(election, 1)),
    ).toEqual([]);
  });
});

describe("a Kentucky legislator-elect", () => {
  it("is shown as elect with dated services, can attend an open one, and the transition ends when the term begins", () => {
    const { world, personId } = recordedTermFixture("player");
    const view = projectOfficeTransition(world, personId);
    expect(view).not.toBeNull();
    expect(view!.startsAt.endsWith("-01-01")).toBe(true);
    expect(view!.electTitle).toBe(
      "Member-elect of the House of Representatives",
    );
    expect(view!.qualification).toBe("not-required");
    expect(view!.daysUntilStart).toBeGreaterThan(0);
    const caucus = view!.services.find(
      (s) => s.key === "legislature-caucus-organizing",
    )!;

    // A February result does not open a January session's caucus in
    // February: the blanket services sit in the weeks before the term.
    expect(caucus.opensOn).toBe(addDays(view!.startsAt, -56));
    // Decided on election day: before it opens the service refuses.
    expect(world.currentDate < caucus.opensOn).toBe(true);
    expect(caucus.status).toBe("upcoming");
    expect(() =>
      attendOfficeTransitionService(world, personId, caucus.key),
    ).toThrow(/does not open until/);

    const open = moveToTermDate(world, caucus.opensOn);
    expect(
      projectOfficeTransition(open, personId)!.services.find(
        (s) => s.key === caucus.key,
      )!.status,
    ).toBe("open");
    const attended = attendOfficeTransitionService(open, personId, caucus.key);
    expect(
      attended.history.events.filter(
        (e) => e.type === OFFICE_TRANSITION_SERVICE_ATTENDED,
      ),
    ).toHaveLength(1);
    // Attending twice records once.
    expect(attendOfficeTransitionService(attended, personId, caucus.key)).toBe(
      attended,
    );
    expect(
      projectOfficeTransition(attended, personId)!.services.find(
        (s) => s.key === caucus.key,
      )!.status,
    ).toBe("attended");

    // Past its window, an unattended service reads as missed, not forgotten.
    const orientation = view!.services.find(
      (s) => s.key === "legislature-new-member-orientation",
    )!;
    const late = moveToTermDate(attended, addDays(orientation.closesOn, 1));
    const lateView = projectOfficeTransition(late, personId)!;
    expect(
      lateView.services.find((s) => s.key === orientation.key)!.status,
    ).toBe("missed");
    expect(lateView.services.find((s) => s.key === caucus.key)!.status).toBe(
      "attended",
    );

    // On the first day of the term the seat is held and the transition is over.
    expect(
      projectOfficeTransition(moveToTermDate(late, view!.startsAt), personId),
    ).toBeNull();
  }, 240_000);

  it("shows no transition to the candidate who lost", () => {
    const { world, personId } = recordedTermFixture("rival");
    expect(projectOfficeTransition(world, personId)).toBeNull();
  }, 240_000);
});

describe("a governor-elect", () => {
  it("is qualified without a step and carries the executive services until the term begins", () => {
    const { world, personId } = adultLifeIn("NV", "office-transition-NV");
    const decided = runToElection(
      fileForStateExecutiveOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const view = projectOfficeTransition(decided, personId)!;
    expect(view.electTitle).toBe("Governor-elect");
    expect(view.qualification).toBe("done");
    expect(view.services.map((s) => s.key)).toContain(
      "executive-transition-team",
    );
    const inOffice = passUntil(decided, view.startsAt);
    expect(projectOfficeTransition(inOffice, personId)).toBeNull();
    // A governor is sworn in too, at an inauguration rather than in a chamber.
    const swearingIn = projectSwearingIn(inOffice, personId)!;
    expect(swearingIn.officeTitle).toBe("Governor");
    expect(swearingIn.ceremony).toMatch(/inauguration/);
    expect(
      projectSwearingIn(takeOathForHeldOffice(inOffice, personId), personId)!
        .swornInOn,
    ).toBe(inOffice.currentDate);
  }, 240_000);
});
