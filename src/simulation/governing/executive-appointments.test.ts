import { describe, expect, test } from "vitest";
import { makeIsoDate } from "../dates";
import { createPortabilityFixture } from "../portability-fixture";
import { serializeWorld, deserializeWorld } from "../serialization";
import { recordWorldEvent } from "../world";
import { recordRelationshipInteraction } from "../records";
import { favorRecords } from "../favors";
import {
  createCharacterHistoryContextPeople,
  characterHistoryContextPersonId,
} from "../character-history";
import {
  ensureStateExecutiveIncumbent,
  currentStateExecutiveHolders,
} from "../nationwide-world/state-executives";
import {
  openExecutiveAppointmentMatter,
  governingMatters,
  decideGoverningMatter,
  governingOfficeForPerson,
} from "./state-governing";
import type { World } from "../types";
import { executiveAppointmentPost } from "./executive-appointment-posts";
import {
  executiveAppointmentVacancy,
  latestExecutiveAppointmentSeat,
  recordExecutiveAppointmentVacancy,
} from "./executive-appointments";

const POST = "us-ak-personnel-board";
const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

function term(world: World, endOffset: number) {
  const holder = world.personOrder[1]!;
  const endYear =
    Number(world.currentDate.slice(0, 4)) + (endOffset > 0 ? 1 : 0);
  return recordWorldEvent(world, {
    stableKey: "fixture:personnel-board:term",
    type: "world.office-tenure",
    occurredAt: makeIsoDate(`${endYear - 6}-03-01`),
    recordedAt: world.currentDate,
    jurisdictionId: world.people[holder]!.homeJurisdictionId,
    involvedEntityIds: [holder],
    participants: [
      {
        personId: holder,
        role: "focus:subject",
        detail: "Opening board incumbent",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `office:${POST}:seat:1`,
      `appointment-post:${POST}`,
      "appointment-seat:1",
      `term-end:${endYear}-03-01`,
      "provenance:fixture-authored-opening",
    ],
    summary: "An authored opening incumbent holds a dated board term.",
    context: CONTEXT,
  });
}

describe("named executive appointment vacancy evidence", () => {
  test("a governor's actual choice records nomination lineage without seating or a favor", () => {
    const initial = createPortabilityFixture();
    let world = ensureStateExecutiveIncumbent(
      initial,
      initial.personOrder[0]!,
      "AK",
    );
    const governor = currentStateExecutiveHolders(world).find(
      (holder) => holder.stateUsps === "AK",
    )!;
    const office = governingOfficeForPerson(world, governor.personId)!;
    world = createCharacterHistoryContextPeople(world, [
      {
        stableKey: "fixture:board-candidate",
        givenName: "Alex",
        familyName: "Taylor",
        birthDate: makeIsoDate("1980-05-05"),
        homeJurisdictionId: office.jurisdictionId,
        birthplaceJurisdictionId: office.jurisdictionId,
      },
    ]);
    const candidate = characterHistoryContextPersonId(
      world,
      "fixture:board-candidate",
    );
    world = recordWorldEvent(world, {
      stableKey: "fixture:board-introduction",
      type: "fixture.introduced",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [governor.personId, candidate],
      participants: [
        { personId: governor.personId, role: "focus:actor", detail: null },
        { personId: candidate, role: "focus:subject", detail: null },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: ["fixture:authored-introduction"],
      summary:
        "An authored introduction gives the governor an actual known candidate.",
      context: CONTEXT,
    });
    world = recordRelationshipInteraction(world, {
      stableKey: "fixture:board-introduction:contact",
      personIds: [governor.personId, candidate],
      eventId: world.history.events.at(-1)!.id,
      occurredAt: world.currentDate,
      kind: "contact:met-at-office",
      change: "formed",
      significance: "minor",
      summary: "The authored introduction established an acquaintance.",
      tags: ["fixture:authored-introduction"],
    });
    world = {
      ...world,
      control: { kind: "person", personId: governor.personId },
    };
    const former = world.personOrder[1]!;
    world = recordWorldEvent(world, {
      stableKey: "fixture:governor-board-term",
      type: "world.office-tenure",
      occurredAt: makeIsoDate("2020-03-01"),
      recordedAt: world.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [former],
      participants: [
        {
          personId: former,
          role: "focus:subject",
          detail: "Authored opening incumbent",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        `appointment-post:${POST}`,
        "appointment-seat:1",
        "term-end:2026-03-01",
        "provenance:fixture-authored-opening",
      ],
      summary: "An authored opening incumbent held the six-year board term.",
      context: CONTEXT,
    });
    const incumbent = world.history.events.at(-1)!;
    world = recordExecutiveAppointmentVacancy(world, {
      incumbentTermEventId: incumbent.id,
      cause: "term-expired",
      causeEventId: incumbent.id,
    });
    const vacancy = world.history.events.at(-1)!;
    world = openExecutiveAppointmentMatter(world, vacancy.id);
    const matter = governingMatters(world, office.officeKey).find(
      (entry) => entry.family === "appointment",
    )!;
    expect(matter.deadline).toBeNull();
    expect(matter.options.map((option) => option.personId)).toContain(
      candidate,
    );
    const priorFavors = favorRecords(world).length;
    const result = decideGoverningMatter(
      world,
      matter.id,
      `person:${candidate}`,
    );
    expect(result.ok).toBe(true);
    const nomination = result.world.history.events.find(
      (event) => event.type === "executive.appointment-nominated",
    )!;
    expect(nomination.tags).toContain(`appointment-vacancy:${vacancy.id}`);
    expect(nomination.tags).toContain(`appointment-term:${incumbent.id}`);
    expect(nomination.participants).toContainEqual({
      personId: candidate,
      role: "agency:nominee",
      detail: "Personnel Board member",
    });
    expect(favorRecords(result.world)).toHaveLength(priorFavors);
    expect(latestExecutiveAppointmentSeat(result.world, POST, 1)?.id).toBe(
      vacancy.id,
    );
    const restored = deserializeWorld(serializeWorld(result.world));
    expect(
      restored.history.events.find((event) => event.id === nomination.id),
    ).toEqual(nomination);
    expect(
      decideGoverningMatter(restored, matter.id, `person:${candidate}`).ok,
    ).toBe(false);
  });
  test("the post inventory is not vacancy evidence", () => {
    const world = createPortabilityFixture();
    expect(executiveAppointmentPost(POST)?.confirmation).toBe(
      "joint-legislature",
    );
    expect(latestExecutiveAppointmentSeat(world, POST, 1)).toBeNull();
    expect(
      executiveAppointmentVacancy(world, world.history.events[0]!.id),
    ).toBeNull();
  });

  test("an expired saved term opens one vacancy and retains its source through reload", () => {
    const before = term(createPortabilityFixture(), 0);
    const incumbent = before.history.events.at(-1)!;
    const input = {
      incumbentTermEventId: incumbent.id,
      cause: "term-expired" as const,
      causeEventId: incumbent.id,
    };
    const after = recordExecutiveAppointmentVacancy(before, input);
    const vacancy = after.history.events.at(-1)!;
    expect(vacancy.type).toBe("world.office-vacancy");
    expect(executiveAppointmentVacancy(after, vacancy.id)).toEqual({
      postOfficeKey: POST,
      seatOrdinal: 1,
      vacancyEventId: vacancy.id,
      incumbentTermEventId: incumbent.id,
      formerHolderPersonId: before.personOrder[1],
      endExclusive: null,
    });
    expect(recordExecutiveAppointmentVacancy(after, input)).toBe(after);
    const restored = deserializeWorld(serializeWorld(after));
    expect(executiveAppointmentVacancy(restored, vacancy.id)).toEqual(
      executiveAppointmentVacancy(after, vacancy.id),
    );
  });

  test("a future term, unrelated source, or missing resignation leaves the incumbent seated", () => {
    const before = term(createPortabilityFixture(), 30);
    const incumbent = before.history.events.at(-1)!;
    expect(
      recordExecutiveAppointmentVacancy(before, {
        incumbentTermEventId: incumbent.id,
        cause: "term-expired",
        causeEventId: incumbent.id,
      }),
    ).toBe(before);
    expect(
      recordExecutiveAppointmentVacancy(before, {
        incumbentTermEventId: incumbent.id,
        cause: "resignation",
        causeEventId: incumbent.id,
      }),
    ).toBe(before);
    expect(latestExecutiveAppointmentSeat(before, POST, 1)?.id).toBe(
      incumbent.id,
    );
  });
});
