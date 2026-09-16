import { describe, expect, it } from "vitest";

import type { EntityId, IsoDate } from "../simulation";
import {
  ORIENTATION_STEP_ORDER,
  projectOrientationView,
} from "./world-orientation";
import type {
  ChamberView,
  PublicHolderView,
  WorldOrientation,
} from "./world-orientation-contract";

const id = (value: string) => value as EntityId;
const date = (value: string) => value as IsoDate;

function holder(
  personId: string,
  personName: string,
  title: string,
  party: string | null,
  extra: Partial<PublicHolderView> = {},
): PublicHolderView {
  return {
    personId: id(personId),
    personName,
    officeKey: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    stateUsps: null,
    partyOrganizationId: party ? id(party) : null,
    caucusOrganizationId: null,
    termId: id(`term-${personId}`),
    startedAt: null,
    endExclusive: null,
    serviceSince: null,
    birthDate: date("1970-01-01"),
    residenceJurisdictionId: id("jur-home"),
    residenceLabel: null,
    ...extra,
  };
}

function chamber(
  chamberKey: ChamberView["chamberKey"],
  seats: ChamberView["seats"],
): ChamberView {
  const members = seats.filter((seat) => seat.occupant.kind === "member");
  const byParty = new Map<EntityId | null, number>();
  for (const seat of members) {
    if (seat.occupant.kind !== "member") continue;
    const party = seat.occupant.member.partyOrganizationId;
    byParty.set(party, (byParty.get(party) ?? 0) + 1);
  }
  const count = (kind: string) =>
    seats.filter((seat) => seat.occupant.kind === kind).length;
  return {
    chamberKey,
    organizationId: id(`org-${chamberKey}`),
    name:
      chamberKey === "us-senate"
        ? "United States Senate"
        : "United States House of Representatives",
    seats,
    totals: {
      seats: seats.length,
      members: members.length,
      vacancies: count("vacancy"),
      noCurrentRecord: count("no-current-record"),
      byParty: [...byParty].map(([partyOrganizationId, members]) => ({
        partyOrganizationId,
        members,
      })),
      byCaucus: [],
    },
  };
}

function orientation(
  overrides: Partial<WorldOrientation> = {},
): WorldOrientation {
  return {
    version: "alive43-world/v1",
    asOf: date("2026-03-14"),
    worldRevision: 41,
    executive: [
      holder(
        "p-president",
        "Dana Whitfield",
        "President of the United States",
        "party-a",
        {
          officeKey: "us-president",
          startedAt: date("2025-01-20"),
          endExclusive: date("2029-01-20"),
        },
      ),
      holder(
        "p-cj",
        "Morgan Hale",
        "Chief Justice of the United States",
        null,
        {
          officeKey: "us-chief-justice",
        },
      ),
    ],
    congress: {
      asOf: date("2026-03-14"),
      sources: [],
      senate: chamber("us-senate", [
        {
          seatKey: "us-senate:KY:class-2",
          chamberKey: "us-senate",
          stateUsps: "KY",
          district: null,
          senateClass: 2,
          occupant: {
            kind: "member",
            member: holder("p-sen", "Riley Stone", "Senator", "party-b"),
          },
        },
      ]),
      house: chamber("us-house", [
        {
          seatKey: "us-house:KY-06",
          chamberKey: "us-house",
          stateUsps: "KY",
          district: "06",
          senateClass: null,
          occupant: {
            kind: "member",
            member: holder("p-rep", "Avery Cole", "Representative", "party-a"),
          },
        },
        {
          seatKey: "us-house:WY-00",
          chamberKey: "us-house",
          stateUsps: "WY",
          district: "00",
          senateClass: null,
          occupant: {
            kind: "vacancy",
            since: date("2026-02-01"),
            eventId: id("event-vacancy"),
          },
        },
      ]),
    },
    homeState: {
      stateUsps: "KY",
      jurisdictionId: id("jur-ky"),
      governor: holder(
        "p-gov",
        "Jordan Price",
        "Governor of Kentucky",
        "party-b",
      ),
    },
    locality: {
      jurisdictionId: id("jur-lex"),
      name: "Lexington",
      governments: [
        {
          organizationId: id("org-lfucg"),
          name: "the Lexington-Fayette Urban County Government",
          holders: [],
          membershipMissing: [],
        },
      ],
    },
    parties: [
      {
        organizationId: id("party-a"),
        name: "Democratic Party",
        level: "national",
        parentOrganizationId: null,
        jurisdictionId: null,
        partyKey: "democratic",
        affiliatedOfficeholders: 2,
      },
      {
        organizationId: id("party-b"),
        name: "Republican Party",
        level: "national",
        parentOrganizationId: null,
        jurisdictionId: null,
        partyKey: "republican",
        affiliatedOfficeholders: 2,
      },
    ],
    publicMatters: [],
    ...overrides,
  } as WorldOrientation;
}

const STATES: Readonly<Record<string, string>> = {
  KY: "Kentucky",
  WY: "Wyoming",
};
const stateName = (usps: string) => STATES[usps] ?? null;

describe("world orientation reader", () => {
  it("orders the four steps as White House, Congress, state, locality", () => {
    const view = projectOrientationView(orientation(), stateName);
    expect(view.steps.map((step) => step.key)).toEqual([
      ...ORIENTATION_STEP_ORDER,
    ]);
    expect(view.steps.map((step) => step.title)).toEqual([
      "The White House",
      "Congress",
      "Kentucky",
      "Lexington",
    ]);
  });

  it("uses the saved date rather than a fixed January 1", () => {
    const view = projectOrientationView(orientation(), stateName);
    expect(view.dateLabel).not.toMatch(/January 1\b/);
    expect(view.dateLabel).toMatch(/March 14, 2026/);
  });

  it("derives chamber counts from the projection's own totals, vacancies included", () => {
    const congress = projectOrientationView(orientation(), stateName).steps[1]!;
    const house = congress.chambers.find(
      (entry) => entry.chamberKey === "us-house",
    )!;
    expect(house.seats).toBe(2);
    expect(house.members).toBe(1);
    expect(house.vacancies).toBe(1);
    expect(house.parties).toEqual([
      {
        partyOrganizationId: "party-a",
        label: "Democratic Party",
        members: 1,
        slot: 0,
      },
    ]);
    expect(house.roster.map((row) => row.seatLabel)).toEqual([
      "Kentucky, district 6",
      "Wyoming, at large",
    ]);
    expect(house.roster[1]!.person).toBeNull();
    expect(congress.summary).toContain("1 vacant seat");
  });

  it("names the same person the record names, with party from the party record", () => {
    const view = projectOrientationView(orientation(), stateName);
    const president = view.steps[0]!.people[0]!;
    expect(president).toMatchObject({
      personId: "p-president",
      name: "Dana Whitfield",
      party: "Democratic Party",
    });
    expect(president.facts).toContain("Term runs until January 20, 2029");
    expect(view.steps[0]!.people[1]!.party).toBeNull();
    expect(view.steps[2]!.people[0]!.personId).toBe("p-gov");
  });

  it("says less rather than inventing a Congress or a mayor for an old save", () => {
    const view = projectOrientationView(
      orientation({
        congress: null,
        locality: {
          jurisdictionId: id("jur-x"),
          name: "Alamo",
          governments: [],
        },
      }),
      stateName,
    );
    expect(view.steps[1]!.chambers).toEqual([]);
    expect(view.steps[1]!.people).toEqual([]);
    expect(view.steps[3]!.people).toEqual([]);
    expect(view.steps[3]!.summary).not.toMatch(/mayor/i);
  });

  it("is a pure read: projecting twice yields equal views and leaves the input untouched", () => {
    const input = orientation();
    const before = structuredClone(input);
    const first = projectOrientationView(input, stateName);
    const second = projectOrientationView(input, stateName);
    expect(second).toEqual(first);
    expect(input).toEqual(before);
  });

  it("keeps a seat with no recorded holder distinct from a vacancy", () => {
    const base = orientation();
    const senate = chamber("us-senate", [
      {
        seatKey: "us-senate:WY:class-1",
        chamberKey: "us-senate",
        stateUsps: "WY",
        district: null,
        senateClass: 1,
        occupant: {
          kind: "no-current-record",
          lastTermEnded: date("2025-01-03"),
        },
      },
    ]);
    const view = projectOrientationView(
      { ...base, congress: { ...base.congress!, senate } },
      stateName,
    );
    const row = view.steps[1]!.chambers[0]!.roster[0]!;
    expect(row.status).toBe("no-current-record");
    expect(row.person).toBeNull();
    expect(view.steps[1]!.chambers[0]!.vacancies).toBe(0);
    expect(view.steps[1]!.summary).toContain("1 seat with no recorded holder");
  });
});
