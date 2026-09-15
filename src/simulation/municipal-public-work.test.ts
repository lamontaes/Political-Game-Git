import { addSimulationMinutes } from "./dates";
import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import {
  lawReading,
  municipalCorpusMeta,
  municipalGovernmentByKey,
  municipalGovernmentForLifePlace,
  municipalGovernments,
  municipalRulePackFor,
  municipalRulePackId,
  primaryReading,
  reportedReading,
} from "./municipal-government";
import {
  installMunicipalGovernment,
  attendMunicipalPublicMeeting,
  appointMunicipalManager,
  introduceMunicipalOrdinance,
  municipalActionAuthority,
  municipalGovernmentJurisdictionId,
  municipalMeetings,
  municipalSeats,
  municipalStanding,
  recordMunicipalAttendance,
  scheduleMunicipalMeeting,
  seatMunicipalMember,
} from "./municipal-public-work";
import { deserializeWorld, serializeWorld } from "./serialization";
import { rulePackById } from "./legislature-rule-packs";
import type { EntityId, LegislativeVoteDisposition, World } from "./types";

/**
 * A life in a real city, with the city's real government installed.
 *
 * The place comes out of the accepted national place corpus by GEOID, the
 * government comes out of the municipal corpus by the crosswalk that corpus
 * declared, and nothing in the middle guesses. If either side moved, this
 * helper stops finding a government rather than finding the wrong one.
 */
function cityWorld(placeKey: string): {
  world: World;
  governmentKey: string;
  jurisdictionId: EntityId;
  people: readonly EntityId[];
} {
  const place = requireLifePlace(placeKey);
  // Fargo's geography remains unverified; this one negative fixture explicitly
  // authors its context instead of turning the research's name match into truth.
  const government =
    placeKey === "3825700"
      ? municipalGovernmentByKey("us-nd-fargo")
      : municipalGovernmentForLifePlace(place);
  if (!government) {
    throw new Error(`No municipal government is compiled for ${placeKey}.`);
  }
  let world = createScenarioWorld(`muni-${placeKey}`, place.context, {
    peopleCount: 12,
  });
  world = {
    ...world,
    control: { kind: "person", personId: world.personOrder[0]! },
  };
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  return {
    world,
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    people: world.personOrder,
  };
}

function seatWholeBody(
  world: World,
  governmentKey: string,
  people: readonly EntityId[],
): World {
  const government = municipalGovernmentByKey(governmentKey)!;
  const reading = primaryReading(government);
  const size = reading.bodySize ?? 5;
  let next = world;
  for (let index = 0; index < size; index += 1) {
    next = seatMunicipalMember(next, {
      governmentKey,
      personId: people[index + 1]!,
      startedAt: next.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Presiding member" : `Seat ${index + 1}`,
    });
  }
  return next;
}

function councilRoll(
  members: readonly EntityId[],
  yeas: number,
  nays = 0,
): readonly LegislativeVoteDisposition[] {
  return members.map((personId, index) => ({
    memberKey: `council:${index + 1}`,
    personId,
    disposition: index < yeas ? "yea" : index < yeas + nays ? "nay" : "absent",
  }));
}

describe("the municipal corpus reaches the game", () => {
  it("retains fixed authored provenance even when a caller supplies its own note", () => {
    const input = cityWorld("3209700");
    const next = scheduleMunicipalMeeting(input.world, {
      governmentKey: input.governmentKey,
      seriesKey: "regular",
      start: addSimulationMinutes(input.world.currentMoment, 60),
      end: addSimulationMinutes(input.world.currentMoment, 90),
      participantPersonIds: [input.people[0]!],
      responsiblePersonId: input.people[0]!,
      jurisdictionId: input.jurisdictionId,
      occurrenceNote: "Caller-supplied context.",
    });
    const meeting = municipalMeetings(next, input.governmentKey)[0]!;
    expect(meeting.title).toMatch(/^Game-authored session:/);
    expect(meeting.summary).toContain(
      "Game-authored occurrence; no real meeting notice or published agenda is asserted.",
    );
    expect(meeting.summary).toContain("Caller-supplied context.");
    expect(input.world.history.scheduledActivities).toHaveLength(0);
  });

  it("does not grant a reported veto to an authored mayor without enacted authority", () => {
    const input = cityWorld("3209700");
    let world = input.world;
    const jurisdictionId = input.jurisdictionId;
    const governmentKey = "us-ar-fort-smith";
    const personId =
      world.control.kind === "person"
        ? world.control.personId
        : world.personOrder[0]!;
    world = installMunicipalGovernment(world, {
      governmentKey,
      jurisdictionId,
      formedAt: world.currentDate,
    });
    world = seatMunicipalMember(world, {
      governmentKey,
      personId,
      startedAt: world.currentDate,
      role: "mayor",
      seatLabel: "Authored test mayor",
    });
    const before = JSON.stringify(world);
    const result = municipalActionAuthority(world, {
      governmentKey,
      personId,
      residentPlaceGeoid: null,
      action: "act-on-adopted-ordinance",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe("evidence");
    expect(JSON.stringify(world)).toBe(before);
  });

  it("carries every compiled government across many states", () => {
    const governments = municipalGovernments();
    expect(governments.length).toBeGreaterThanOrEqual(44);
    const states = new Set(governments.map((entry) => entry.state));
    expect(states.size).toBeGreaterThanOrEqual(25);
    // Materially different forms, not one shape repeated.
    const forms = new Set(
      governments
        .map((entry) => primaryReading(entry).form)
        .filter((form): form is string => form !== null),
    );
    for (const form of [
      "MAYOR_COUNCIL",
      "COUNCIL_MANAGER",
      "COMMISSION_MANAGER",
      "CITY_COUNTY_CONSOLIDATED",
      "TOWN_MEETING",
    ]) {
      expect(forms).toContain(form);
    }
  }, 60000);

  it("keeps two readings of one government apart", () => {
    const carson = municipalGovernmentByKey("us-nv-carson-city")!;
    const law = lawReading(carson);
    const reported = reportedReading(carson);
    expect(law).not.toBeNull();
    expect(reported).not.toBeNull();
    // The charter fixes the readings an ordinance takes; the research pass
    // never read a charter and says nothing about them.
    expect(law!.procedure.readings).toBe(2);
    expect(reported!.procedure.readings).toBeNull();
    // The research pass names the current board room; the charter does not.
    expect(reported!.meetingSeries[0]?.venue).toContain("Crowell");
    expect(law!.meetingSeries[0]?.venue).toBeNull();
    // And neither is allowed to fill the other's hole.
    expect(law!.evidence).toBe("enacted-text");
    expect(reported!.evidence).toBe("research-transcription");
  }, 60000);

  it("reports what it read rather than how many governments it has", () => {
    const meta = municipalCorpusMeta();
    expect(meta.productionRecords).toBe(4);
    expect(meta.fixtureRecords).toBeGreaterThan(100);
    expect(meta.governmentCount).toBeGreaterThan(100);
  }, 60000);
});

describe("procedure is a capability", () => {
  it("opens Charlottesville's ordinance route only on the City Code it read", () => {
    const government = municipalGovernmentByKey("us-va-charlottesville")!;
    const result = municipalRulePackFor(government);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.missing));
    const council = result.pack.chambers[0]!;
    expect(council.floorStages.map((stage) => stage.stageKey)).toEqual([
      "final-passage",
    ]);
    expect(council.referral.floorWithoutReferral).toMatchObject({
      kind: "known",
      value: true,
      source: { citation: "City Code §§ 2-97, 2-124" },
    });
    expect(result.pack.executive.presentmentRequired).toMatchObject({
      kind: "known",
      value: false,
    });
    expect(result.pack.executive.override.kind).toBe("not-applicable");
    expect(result.pack.enactment.defaultEffectiveRule).toMatchObject({
      kind: "known",
      source: { citation: "City Code § 2-99" },
    });
    const procedure = primaryReading(government).procedure;
    expect(procedure.introductionToPassage).toEqual({
      minimumInterveningDays: 3,
      sameDayException: "a four-fifths (⅘) vote of the city council",
    });
    expect(procedure.mayoralActionState).toBe("NOT_APPLICABLE");
  });

  it.each(["us-va-richmond", "us-nv-carson-city"])(
    "keeps unsupported progression closed for %s without hiding the government",
    (key) => {
      const government = municipalGovernmentByKey(key)!;
      expect(primaryReading(government).bodySize).toBeGreaterThan(0);
      const result = municipalRulePackFor(government);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Unsupported progression was enabled");
      expect(result.missing.length).toBeGreaterThan(0);
      expect(() =>
        rulePackById(municipalRulePackId(primaryReading(government))),
      ).toThrow();
    },
  );
  it("retains Richmond's fixed passage and override counts independently of missing procedure", () => {
    const reading = lawReading(municipalGovernmentByKey("us-va-richmond")!)!;
    expect(
      reading.powers.find((row) => row.power === "ORDINANCE_ADOPTION")
        ?.threshold?.fixedVotesRequired,
    ).toBe(5);
    expect(
      reading.powers.find((row) => row.power === "OVERRIDE")?.threshold
        ?.fixedVotesRequired,
    ).toBe(6);
    expect(reading.procedure.introductionSponsorship).toContain("mayor");
    expect(reading.procedure.publicHearing).toContain("seven days");
  });
});

describe("a resident and a councilmember are not the same person", () => {
  it("lets a resident attend and refuses them a vote, for different reasons", () => {
    const { world, governmentKey, people } = cityWorld("5114968");
    const seated = seatWholeBody(world, governmentKey, people);
    const resident = people[0]!;
    const government = municipalGovernmentByKey(governmentKey)!;

    const standing = municipalStanding(seated, {
      governmentKey,
      personId: resident,
      residentPlaceGeoid: government.placeGeoid,
    });
    expect(standing.roles).toEqual(["resident"]);

    const attend = municipalActionAuthority(seated, {
      governmentKey,
      personId: resident,
      residentPlaceGeoid: government.placeGeoid,
      action: "attend-public-meeting",
    });
    expect(attend.ok).toBe(true);

    const vote = municipalActionAuthority(seated, {
      governmentKey,
      personId: resident,
      residentPlaceGeoid: government.placeGeoid,
      action: "vote-on-ordinance",
    });
    expect(vote.ok).toBe(false);
    if (vote.ok) throw new Error("unreachable");
    expect(vote.kind).toBe("standing");
    expect(vote.reason).toMatch(/does not put you on it/);

    // A seat, not attendance, is what carries the vote the City Code sets out.
    const member = people[1]!;
    const memberVote = municipalActionAuthority(seated, {
      governmentKey,
      personId: member,
      residentPlaceGeoid: government.placeGeoid,
      action: "vote-on-ordinance",
    });
    expect(memberVote.ok).toBe(true);
  }, 60000);

  it("says the room is open and still refuses to invent a right to speak", () => {
    const { world, governmentKey, people } = cityWorld("5114968");
    const government = municipalGovernmentByKey(governmentKey)!;
    const speak = municipalActionAuthority(world, {
      governmentKey,
      personId: people[0]!,
      residentPlaceGeoid: government.placeGeoid,
      action: "address-the-body",
    });
    expect(speak.ok).toBe(false);
    if (speak.ok) throw new Error("unreachable");
    expect(speak.kind).toBe("evidence");
    expect(speak.reason).toMatch(/The room is open; a right to address it/);
  }, 60000);

  it("refuses a vote on evidence, not standing, where a member has no procedure", () => {
    const { world, governmentKey, people } = cityWorld("3209700");
    const government = municipalGovernmentByKey(governmentKey)!;
    const seated = seatWholeBody(world, governmentKey, people);
    const refusal = municipalActionAuthority(seated, {
      governmentKey,
      personId: people[1]!,
      residentPlaceGeoid: government.placeGeoid,
      action: "vote-on-ordinance",
    });
    expect(refusal.ok).toBe(false);
    if (refusal.ok) throw new Error("unreachable");
    expect(refusal.kind).toBe("evidence");
    // The admitted §2.100 now establishes passage; unresolved introduction still refuses.
    expect(refusal.reason).toMatch(/introduction/);
    expect(refusal.reason).not.toMatch(/passage threshold/);
  }, 60000);
});

describe("a public meeting is a real appointment", () => {
  it("puts an open sitting on the calendar with public access", () => {
    const { world, governmentKey, jurisdictionId, people } =
      cityWorld("5114968");
    const start = { ...world.currentMoment, minuteOfDay: 19 * 60 };
    const scheduled = scheduleMunicipalMeeting(world, {
      governmentKey,
      seriesKey: "stated-meeting",
      start,
      end: { ...start, minuteOfDay: 21 * 60 },
      participantPersonIds: [people[0]!, people[1]!],
      responsiblePersonId: people[0]!,
      jurisdictionId,
    });
    const meetings = municipalMeetings(scheduled, governmentKey);
    expect(meetings).toHaveLength(1);
    expect(meetings[0]!.access.kind).toBe("office");
    expect(meetings[0]!.summary).toMatch(/Nothing read names where it sits/);
  }, 60000);

  it("closes a sitting the record says is closed", () => {
    const { world, governmentKey, jurisdictionId, people } =
      cityWorld("3825700");
    const start = { ...world.currentMoment, minuteOfDay: 17 * 60 };
    const closed = scheduleMunicipalMeeting(world, {
      governmentKey,
      seriesKey: "executive-session",
      start,
      end: { ...start, minuteOfDay: 18 * 60 },
      participantPersonIds: [people[1]!],
      responsiblePersonId: people[1]!,
      jurisdictionId,
    });
    const meeting = municipalMeetings(closed, governmentKey)[0]!;
    expect(meeting.access.kind).toBe("private");
  }, 60000);

  it("records attendance without granting anybody an office", () => {
    const { world, governmentKey, jurisdictionId, people } =
      cityWorld("5114968");
    const government = municipalGovernmentByKey(governmentKey)!;
    const start = { ...world.currentMoment, minuteOfDay: 19 * 60 };
    let next = scheduleMunicipalMeeting(world, {
      governmentKey,
      seriesKey: "stated-meeting",
      start,
      end: { ...start, minuteOfDay: 21 * 60 },
      participantPersonIds: [people[0]!],
      responsiblePersonId: people[0]!,
      jurisdictionId,
    });
    const meeting = municipalMeetings(next, governmentKey)[0]!;
    expect(() =>
      recordMunicipalAttendance(next, {
        governmentKey,
        personId: people[0]!,
        activityId: meeting.id,
        jurisdictionId,
        note: "Premature attendance",
      }),
    ).toThrow(/completed canonical/);
    const attended = attendMunicipalPublicMeeting(
      next,
      governmentKey,
      meeting.id,
    );
    expect(attended.ok).toBe(true);
    next = attended.world;
    expect(
      next.history.events.some(
        (event) => event.type === "municipal.public-meeting-attended",
      ),
    ).toBe(true);
    expect(
      municipalStanding(next, {
        governmentKey,
        personId: people[0]!,
        residentPlaceGeoid: government.placeGeoid,
      }).roles,
    ).toEqual(["resident"]);
    expect(municipalSeats(next, governmentKey)).toHaveLength(0);
  }, 60000);
});

describe("the strongest compiled local governing route", () => {
  it("lets a citizen attend and a member record a quorate council election of the manager, then refuses lone-member, no-quorum, wrong-government, duplicate, and reload repeats", () => {
    const { world, governmentKey, jurisdictionId, people } =
      cityWorld("5114968");
    const government = municipalGovernmentByKey(governmentKey)!;
    const resident = people[0]!;
    const member = people[1]!;
    const appointee = people[10]!;
    const seated = seatWholeBody(world, governmentKey, people);
    const council = municipalSeats(seated, governmentKey)
      .filter((seat) => seat.role !== "professional-manager")
      .map((seat) => seat.personId);
    expect(council).toHaveLength(5);
    const election = councilRoll(council, 3);
    const start = { ...world.currentMoment, minuteOfDay: 19 * 60 };
    const scheduled = scheduleMunicipalMeeting(seated, {
      governmentKey,
      seriesKey: "stated-meeting",
      start,
      end: { ...start, minuteOfDay: 21 * 60 },
      participantPersonIds: [resident],
      responsiblePersonId: resident,
      jurisdictionId,
    });
    const meeting = municipalMeetings(scheduled, governmentKey)[0]!;
    const attended = attendMunicipalPublicMeeting(
      scheduled,
      governmentKey,
      meeting.id,
    );
    expect(attended.ok).toBe(true);
    expect(
      attended.world.history.events.some(
        (event) => event.type === "municipal.public-meeting-attended",
      ),
    ).toBe(true);
    expect(
      municipalStanding(attended.world, {
        governmentKey,
        personId: resident,
        residentPlaceGeoid: government.placeGeoid,
      }).roles,
    ).toEqual(["resident"]);

    const memberWorld = {
      ...attended.world,
      control: { kind: "person" as const, personId: member },
    };
    const outsider = appointMunicipalManager(attended.world, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: election,
    });
    expect(outsider.ok).toBe(false);
    if (!outsider.ok) {
      expect(outsider.reason).toMatch(/does not put you on it|Only members/);
      expect(outsider.world).toBe(attended.world);
    }

    const loneMember = appointMunicipalManager(memberWorld, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: [],
    });
    expect(loneMember.ok).toBe(false);
    if (!loneMember.ok) {
      expect(loneMember.reason).toMatch(
        /collective decision|not that election/,
      );
      expect(loneMember.world).toBe(memberWorld);
    }

    const oneVote = appointMunicipalManager(memberWorld, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: councilRoll(council, 1),
    });
    expect(oneVote.ok).toBe(false);
    if (!oneVote.ok) {
      expect(oneVote.reason).toMatch(/quorum|present/);
      expect(oneVote.world).toBe(memberWorld);
    }

    const noQuorum = appointMunicipalManager(memberWorld, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: councilRoll(council, 2),
    });
    expect(noQuorum.ok).toBe(false);
    if (!noQuorum.ok) {
      expect(noQuorum.reason).toMatch(/quorum/);
      expect(noQuorum.world).toBe(memberWorld);
    }

    const carson = municipalGovernmentByKey("us-nv-carson-city")!;
    let foreign = installMunicipalGovernment(memberWorld, {
      governmentKey: carson.key,
      jurisdictionId,
      formedAt: memberWorld.currentDate,
    });
    foreign = seatMunicipalMember(foreign, {
      governmentKey: carson.key,
      personId: people[6]!,
      startedAt: foreign.currentDate,
      role: "member",
      seatLabel: "Foreign seat",
    });
    const wrongGovernment = appointMunicipalManager(foreign, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: [
        {
          memberKey: "foreign-1",
          personId: people[6]!,
          disposition: "yea",
        },
      ],
    });
    expect(wrongGovernment.ok).toBe(false);
    if (!wrongGovernment.ok) {
      expect(wrongGovernment.reason).toMatch(/not a vote of/);
      expect(wrongGovernment.world).toBe(foreign);
    }

    const appointed = appointMunicipalManager(memberWorld, {
      governmentKey,
      appointeePersonId: appointee,
      dispositions: election,
    });
    expect(appointed.ok).toBe(true);
    const managerSeat = municipalSeats(appointed.world, governmentKey).find(
      (seat) => seat.role === "professional-manager",
    );
    expect(managerSeat?.personId).toBe(appointee);
    expect(
      appointed.world.history.events.some(
        (event) => event.type === "municipal.manager-appointed",
      ),
    ).toBe(true);
    expect(
      appointed.world.history.events.find(
        (event) => event.type === "municipal.manager-appointed",
      )?.jurisdictionId,
    ).toBe(jurisdictionId);
    expect(
      municipalGovernmentJurisdictionId(appointed.world, governmentKey),
    ).toBe(jurisdictionId);

    const duplicate = appointMunicipalManager(appointed.world, {
      governmentKey,
      appointeePersonId: people[11]!,
      dispositions: election,
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.reason).toMatch(
        /already has a recorded professional manager/,
      );
      expect(duplicate.world).toBe(appointed.world);
    }

    const reloaded = deserializeWorld(serializeWorld(appointed.world));
    const afterReload = appointMunicipalManager(reloaded, {
      governmentKey,
      appointeePersonId: people[11]!,
      dispositions: election,
    });
    expect(afterReload.ok).toBe(false);
    if (!afterReload.ok) expect(afterReload.world).toBe(reloaded);

    const residentOrdinance = introduceMunicipalOrdinance(attended.world, {
      governmentKey,
      designation: "Ord. 1",
      shortTitle: "Resident ordinance",
      summary: "A resident is not a councilor.",
    });
    expect(residentOrdinance.ok).toBe(false);

    const ordinance = introduceMunicipalOrdinance(memberWorld, {
      governmentKey,
      designation: "Ord. 1",
      shortTitle: "Authored test ordinance",
      summary: "Introduced under City Code §§ 2-97 and 2-124.",
    });
    expect(ordinance.ok).toBe(true);
    if (!ordinance.ok) throw new Error(ordinance.reason);
    const measure = (ordinance.world.history.legislativeMeasures ?? []).at(-1)!;
    expect(measure.rulePackId).toBe("us-va-charlottesville-council-v1");
    expect(measure.sponsorPersonId).toBe(member);
  }, 60000);
});
