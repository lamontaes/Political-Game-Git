import { describe, expect, it } from "vitest";
import { advanceWorld } from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { localGoverningBodiesForJurisdiction } from "../candidacy";
import { recordOrganizationParticipationState } from "../life";
import { organizationParticipationStateAt } from "../life-queries";
import {
  installMunicipalGovernment,
  municipalSeats,
  seatMunicipalMember,
} from "../municipal-public-work";
import { deserializeWorld, serializeWorld } from "../serialization";
import { projectGoverningBriefing } from "../../presentation/governing-briefing";
import {
  currentGoverningOffices,
  decideGoverningMatter,
  governingMatters,
  governingOfficeForPerson,
  synchronizeMunicipalGoverningOffices,
  stateGoverningHandlers,
} from "./state-governing";

const seed = "session23-part1-ordinary-mayor-2026-10-06";
const place = drawRandomPlace(
  seed,
  (candidate) =>
    candidate.stateJurisdictionKey !== "US-DC" &&
    localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
      (office) =>
        office.seat === "chief-executive" &&
        office.unit.unitType === "municipality",
    ),
);
const local = localGoverningBodiesForJurisdiction(
  place.context.jurisdiction.id,
).find(
  (office) =>
    office.seat === "chief-executive" &&
    office.unit.unitType === "municipality",
)!;

function mayorFixture() {
  const fixture = smallWorld({ place: place.key, seed, people: 4 });
  let world = installMunicipalGovernment(fixture.world, {
    governmentKey: local.unit.id,
    jurisdictionId: fixture.jurisdictionId,
    formedAt: fixture.world.currentDate,
  });
  world = seatMunicipalMember(world, {
    governmentKey: local.unit.id,
    personId: fixture.personId,
    startedAt: world.currentDate,
    role: "mayor",
    seatLabel: local.officeTitle,
    provenance: {
      kind: "authored",
      note: "Controlled downstream mayor desk fixture, not an election result.",
    },
  });
  return { ...fixture, world };
}

describe("a mayor joins the shared governing desk", () => {
  it("keeps the first drawn consolidated District executive on one office", () => {
    // Explicit scenario from the first 56-place draw, not a normal-start default.
    const fixture = smallWorld({
      place: "1150000",
      seed: "session23-part1-2026-10-06",
      offices: ["governor"],
    });
    const office = currentGoverningOffices(fixture.world).find(
      (candidate) => candidate.stateUsps === "DC",
    )!;
    expect(office).toBeDefined();
    expect(
      currentGoverningOffices(fixture.world).filter(
        (candidate) => candidate.holderPersonId === office.holderPersonId,
      ),
    ).toHaveLength(1);
  });

  it("opens the same agenda and budget matters once and records the player's priority", () => {
    const fixture = mayorFixture();
    const office = governingOfficeForPerson(fixture.world, fixture.personId)!;
    expect(office).toMatchObject({
      holderPersonId: fixture.personId,
      controlledByPlayer: true,
      programOffice: { kind: "municipal" },
    });
    expect(
      currentGoverningOffices(fixture.world).filter(
        (item) => item.holderPersonId === fixture.personId,
      ),
    ).toHaveLength(1);
    const world = synchronizeMunicipalGoverningOffices(fixture.world);
    const matters = governingMatters(world, office.officeKey);
    expect(matters.map((matter) => matter.family)).toEqual(
      expect.arrayContaining(["agenda", "budget"]),
    );
    expect(
      matters.every(
        (matter) =>
          matter.holderPersonId === fixture.personId &&
          matter.workItemId !== null,
      ),
    ).toBe(true);
    const briefing = projectGoverningBriefing(world, fixture.personId)!;
    expect(
      [...briefing.significant, ...briefing.more].map((matter) => matter.title),
    ).toEqual(expect.arrayContaining(["Set the budget request"]));
    expect(briefing.calendarNote).toBeNull();
    expect(
      world.history.futureDueItems
        .filter((due) => due.stableKey.includes(`:season:${office.officeKey}:`))
        .map((due) => due.stableKey),
    ).toEqual([expect.stringContaining(":budget:")]);
    const saved = deserializeWorld(serializeWorld(world));
    expect(synchronizeMunicipalGoverningOffices(saved)).toBe(saved);
    const agenda = matters.find((matter) => matter.family === "agenda")!;
    const option = agenda.options.find(
      (candidate) => candidate.key !== "priority:none",
    )!;
    const decision = decideGoverningMatter(saved, agenda.id, option.key);
    expect(decision.ok).toBe(true);
    expect(
      governingMatters(decision.world, office.officeKey).find(
        (matter) => matter.id === agenda.id,
      )?.status,
    ).toBe("decided");
    expect(
      governingMatters(decision.world, office.officeKey).some(
        (matter) => matter.family === "implementation",
      ),
    ).toBe(true);
    console.log(
      JSON.stringify({
        seed,
        place: place.displayName,
        officeKey: office.officeKey,
        records: decision.world.history.events
          .filter((event) => event.tags.includes(`office:${office.officeKey}`))
          .map((event) => ({
            id: event.id,
            type: event.type,
            date: event.occurredAt,
            summary: event.summary,
          })),
      }),
    );
  });

  it("opens municipal matters on the canonical date boundary for an observer", () => {
    const fixture = mayorFixture();
    const observer = {
      ...fixture.world,
      control: { kind: "observer" as const },
    };
    const office = governingOfficeForPerson(observer, fixture.personId)!;
    expect(governingMatters(observer, office.officeKey)).toHaveLength(0);
    const moved = advanceWorld(
      observer,
      1,
      createFutureTransitionHandlerRegistry(stateGoverningHandlers()),
    );
    expect(moved.currentDate).not.toBe(observer.currentDate);
    expect(
      governingMatters(moved, office.officeKey).map((m) => m.family),
    ).toEqual(expect.arrayContaining(["agenda", "budget"]));
    expect(
      governingMatters(moved, office.officeKey).every(
        (m) => m.workItemId === null,
      ),
    ).toBe(true);
  });

  it("uses the NPC path and removes authority when the canonical mayor seat ends", () => {
    const fixture = mayorFixture();
    const observer = {
      ...fixture.world,
      control: { kind: "observer" as const },
    };
    const office = governingOfficeForPerson(observer, fixture.personId)!;
    const opened = synchronizeMunicipalGoverningOffices(observer);
    expect(
      governingMatters(opened, office.officeKey).every(
        (matter) => matter.workItemId === null,
      ),
    ).toBe(true);
    expect(
      opened.history.futureDueItems.some(
        (due) => due.transitionKey === "governing:npc-decision",
      ),
    ).toBe(true);
    const seat = municipalSeats(opened, local.unit.id).find(
      (candidate) => candidate.personId === fixture.personId,
    )!;
    const previous = organizationParticipationStateAt(
      opened,
      seat.participationId,
    )!;
    const ended = recordOrganizationParticipationState(opened, {
      stableKey: `${seed}:mayor-ended`,
      participationId: seat.participationId,
      effectiveAt: opened.currentDate,
      status: "ended",
      roleKind: previous.roleKind,
      context: "The test fixture mayor left office.",
      provenance: {
        kind: "authored",
        note: "Controlled downstream departure fixture.",
      },
      supersedesStateId: previous.id,
    });
    expect(governingOfficeForPerson(ended, fixture.personId)).toBeNull();
    const agenda = governingMatters(ended, office.officeKey).find(
      (matter) => matter.family === "agenda",
    )!;
    const result = decideGoverningMatter(
      {
        ...ended,
        control: { kind: "person" as const, personId: fixture.personId },
      },
      agenda.id,
      "priority:none",
    );
    expect(result.ok).toBe(false);
    expect(ended.history.events.length).toBeGreaterThan(
      fixture.world.history.events.length,
    );
  });
});
