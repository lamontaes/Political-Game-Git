import { describe, expect, test } from "vitest";
import { makeIsoDate } from "../dates";
import { createPortabilityFixture } from "../portability-fixture";
import { serializeWorld, deserializeWorld } from "../serialization";
import { recordWorldEvent } from "../world";
import { recordRelationshipInteraction } from "../records";
import { recordPersonDeath } from "../vitality";
import { favorRecords } from "../favors";
import { organizationParticipationStateAt } from "../life-queries";
import { ensureExecutiveAppointmentOpening } from "./executive-appointment-opening";
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
import {
  executiveAppointmentPost,
  executiveAppointmentPostsForOffice,
} from "./executive-appointment-posts";
import { executiveAppointmentEligibility } from "./executive-appointment-eligibility";
import type { GoverningOffice } from "./state-governing";
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
  test("cabinet heads share the post and causal vacancy path without invented term limits or military qualifications", () => {
    const before = createPortabilityFixture();
    const person = before.people[before.personOrder[0]!]!;
    // Controlled opening-producer fixture, not an elected Presidency proof.
    const office: GoverningOffice = {
      officeKey: "us-president",
      stateUsps: "",
      title: "President",
      jurisdictionId: person.homeJurisdictionId,
      organizationId: null,
      holderPersonId: person.id,
      termId: person.id,
      termStartedAt: null,
      termEndsAt: null,
      controlledByPlayer: true,
      calendarBasis: "verified",
      calendarNote: null,
    };
    const posts = executiveAppointmentPostsForOffice(office.officeKey);
    expect(posts).toHaveLength(15);
    expect(
      posts.every(
        (post) =>
          post.authorityOfficeKey === "us-federal-president" &&
          post.confirmation === "senate",
      ),
    ).toBe(true);
    const after = ensureExecutiveAppointmentOpening(before, office);
    const terms = posts.map((post) =>
      latestExecutiveAppointmentSeat(after, post.officeKey, 1)!,
    );
    expect(
      terms.every(
        (term) =>
          term.type === "world.office-tenure" &&
          !term.tags.some((tag) => tag.startsWith("term-end:")),
      ),
    ).toBe(true);
    expect(after.history.futureDueItems).toEqual(before.history.futureDueItems);
    expect(after.history.resourcePositions).toEqual(
      before.history.resourcePositions,
    );
    expect(after.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    expect(ensureExecutiveAppointmentOpening(after, office)).toBe(after);
    expect(
      executiveAppointmentEligibility(
        after,
        "us-cabinet-defense",
        person.id,
        office.jurisdictionId,
      ),
    ).toBe("unverified");
    const restored = deserializeWorld(serializeWorld(after));
    expect(
      latestExecutiveAppointmentSeat(restored, posts[0]!.officeKey, 1),
    ).toEqual(terms[0]);
    const term = terms[0]!;
    const holder = term.participants[0]!.personId;
    const resigned = recordWorldEvent(restored, {
      stableKey: "fixture:cabinet:resigned",
      type: "world.office-resignation",
      occurredAt: restored.currentDate,
      recordedAt: restored.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [holder],
      participants: [
        {
          personId: holder,
          role: "focus:actor",
          detail: "Resigning department head",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`appointment-term:${term.id}`],
      summary: "An actual saved department head resigns.",
      context: CONTEXT,
    });
    const vacant = recordExecutiveAppointmentVacancy(resigned, {
      incumbentTermEventId: term.id,
      cause: "resignation",
      causeEventId: resigned.history.events.at(-1)!.id,
    });
    const vacancy = latestExecutiveAppointmentSeat(
      vacant,
      posts[0]!.officeKey,
      1,
    )!;
    expect(executiveAppointmentVacancy(vacant, vacancy.id)).toMatchObject({
      incumbentTermEventId: term.id,
      formerHolderPersonId: holder,
      endExclusive: null,
    });
    expect(vacant.history.resourcePositions).toEqual(
      before.history.resourcePositions,
    );
  });

  test("the canonical death writer vacates a saved current board seat and opens the governor's matter", () => {
    const initial = createPortabilityFixture();
    const before = ensureStateExecutiveIncumbent(
      initial,
      initial.personOrder[0]!,
      "AK",
    );
    const governor = currentStateExecutiveHolders(before).find(
      (holder) => holder.stateUsps === "AK",
    )!;
    const office = governingOfficeForPerson(before, governor.personId)!;
    const opened = ensureExecutiveAppointmentOpening(before, office);
    const term = latestExecutiveAppointmentSeat(opened, POST, 1)!;
    const personId = term.participants[0]!.personId;
    const after = recordPersonDeath(opened, {
      stableKey: "fixture:appointed-incumbent:death",
      personId,
      diedAt: opened.currentDate,
      causeKey: "mortality:recorded-cause",
      sourceEntityIds: [personId],
      summary: "The saved board incumbent died in this controlled fixture.",
      provenance: {
        kind: "authored",
        note: "Controlled death-hook fixture, not a mortality forecast.",
      },
    });
    const vacancy = latestExecutiveAppointmentSeat(after, POST, 1)!;
    expect(vacancy.type).toBe("world.office-vacancy");
    expect(vacancy.tags).toContain(
      `source-event:${after.history.personDeaths.at(-1)!.eventId}`,
    );
    expect(
      governingMatters(after, office.officeKey).some(
        (matter) =>
          matter.family === "appointment" &&
          matter.openedEvent.tags.includes(`appointment-vacancy:${vacancy.id}`),
      ),
    ).toBe(true);
    expect(latestExecutiveAppointmentSeat(after, POST, 2)).toEqual(
      latestExecutiveAppointmentSeat(opened, POST, 2),
    );
    expect(after.history.resourcePositions).toEqual(
      opened.history.resourcePositions,
    );
    const restored = deserializeWorld(serializeWorld(after));
    expect(latestExecutiveAppointmentSeat(restored, POST, 1)).toEqual(vacancy);
  });

  test("generated opening incumbents have saved terms and due items without a vacancy or new funding", () => {
    const initial = createPortabilityFixture();
    const before = ensureStateExecutiveIncumbent(
      initial,
      initial.personOrder[0]!,
      "AK",
    );
    const governor = currentStateExecutiveHolders(before).find(
      (holder) => holder.stateUsps === "AK",
    )!;
    const office = governingOfficeForPerson(before, governor.personId)!;
    const after = ensureExecutiveAppointmentOpening(before, office);
    const terms = [1, 2, 3].map((seat) =>
      latestExecutiveAppointmentSeat(after, POST, seat)!,
    );
    expect(terms.every((record) => record.type === "world.office-tenure")).toBe(
      true,
    );
    expect(
      terms.every((record) =>
        record.tags.includes("opening-term-years:game-profile"),
      ),
    ).toBe(true);
    expect(
      terms.every((record) =>
        record.tags.some((tag) => /^term-end:\d{4}-03-01$/.test(tag)),
      ),
    ).toBe(true);
    expect(
      terms.every((record) =>
        after.history.futureDueItems.some(
          (due) =>
            due.entityIds.includes(record.id) &&
            due.stableKey === `${record.stableKey}:term-expiry`,
        ),
      ),
    ).toBe(true);
    expect(
      after.history.events.filter(
        (event) => event.type === "world.office-vacancy",
      ),
    ).toEqual(
      before.history.events.filter(
        (event) => event.type === "world.office-vacancy",
      ),
    );
    expect(after.history.resourcePositions).toEqual(
      before.history.resourcePositions,
    );
    expect(after.history.resourceTransferOutcomes).toEqual(
      before.history.resourceTransferOutcomes,
    );
    expect(ensureExecutiveAppointmentOpening(after, office)).toBe(after);
    const restored = deserializeWorld(serializeWorld(after));
    expect(latestExecutiveAppointmentSeat(restored, POST, 1)).toEqual(terms[0]);
    // A real saved resignation, rather than absence of an incumbent, vacates
    // the seat and ends the same canonical membership. It preserves the
    // incumbent's unexpired term end for a replacement.
    const holder = terms[0]!.participants[0]!.personId;
    const resigned = recordWorldEvent(after, {
      stableKey: "fixture:opening-incumbent-resigned",
      type: "world.office-resignation",
      occurredAt: after.currentDate,
      recordedAt: after.currentDate,
      jurisdictionId: office.jurisdictionId,
      involvedEntityIds: [holder],
      participants: [
        {
          personId: holder,
          role: "focus:actor",
          detail: "Resigning incumbent",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`appointment-term:${terms[0]!.id}`],
      summary: "The fixture records the incumbent's actual resignation.",
      context: CONTEXT,
    });
    const vacant = recordExecutiveAppointmentVacancy(resigned, {
      incumbentTermEventId: terms[0]!.id,
      cause: "resignation",
      causeEventId: resigned.history.events.at(-1)!.id,
    });
    const vacancy = latestExecutiveAppointmentSeat(vacant, POST, 1)!;
    expect(executiveAppointmentVacancy(vacant, vacancy.id)?.endExclusive).toBe(
      terms[0]!.tags
        .find((tag) => tag.startsWith("term-end:"))!
        .slice("term-end:".length),
    );
    const participation = vacant.history.organizationParticipations.find(
      (row) => row.stableKey === `${terms[0]!.stableKey}:participation`,
    )!;
    expect(
      organizationParticipationStateAt(vacant, participation.id)?.status,
    ).toBe("ended");
    expect(vacant.history.resourcePositions).toEqual(
      before.history.resourcePositions,
    );
  });
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
