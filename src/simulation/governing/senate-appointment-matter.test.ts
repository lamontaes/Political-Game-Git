import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { pickDistinct, SeededRng } from "../rng";
import { senateVacancyLaw } from "../nationwide-world/senate-vacancy-law";
import { projectCongress } from "../living-world/congress";
import { deserializeWorld, serializeWorld } from "../serialization";
import { recordPersonDeath } from "../vitality";
import { advanceWorld } from "../world";
import type { EntityId, World } from "../types";
import {
  applyOfficeContinuityNotices,
  senateAppointmentContext,
  recordGovernorSenateAppointment,
} from "./office-continuity";
import {
  decideGoverningMatter,
  governingMatters,
  governingMatterById,
  currentGoverningOffices,
} from "./state-governing";

const seed = "a120-recorded-governor-appointment";
const places = lifePlaceStateIdentities();
const known = places.filter((place) => {
  const law = senateVacancyLaw(place.jurisdictionKey.replace(/^US-/, ""));
  return (
    law &&
    law.appointmentDeadlineDays !== null &&
    ["governor", "governor-same-party"].includes(law.appointment)
  );
});
const place = pickDistinct(new SeededRng(seed), known, 1)[0]!;

function vacancy(
  kind: "known" | "party-list" = "known",
  player = true,
  selectedPlace?: (typeof places)[number],
) {
  const selected =
    selectedPlace ??
    (kind === "known"
      ? place
      : pickDistinct(
          new SeededRng(seed + ":list"),
          places.filter(
            (row) =>
              senateVacancyLaw(row.jurisdictionKey.replace(/^US-/, ""))
                ?.appointment === "governor-from-party-list",
          ),
          1,
        )[0]!);
  const opened = smallWorld({
    place: selected.jurisdictionKey,
    seed,
    offices: ["congress", "governor"],
  });
  const office = currentGoverningOffices(opened.world).find(
    (row) => row.jurisdictionId === opened.stateJurisdictionId,
  )!;
  expect(office).toBeDefined();
  const controlled: World = {
    ...opened.world,
    control: player
      ? { kind: "person", personId: office.holderPersonId }
      : opened.world.control,
  };
  const seat = projectCongress(controlled)!.senate.seats.find(
    (row) =>
      row.stateUsps === opened.stateUsps && row.occupant.kind === "member",
  )!;
  if (seat.occupant.kind !== "member")
    throw Error("Actual opening senator required");
  const senator = seat.occupant.member;
  let world = recordPersonDeath(controlled, {
    stableKey: `a120:death:${senator.personId}`,
    personId: senator.personId,
    diedAt: controlled.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [controlled.id],
    summary: "Controlled vacancy evidence.",
    provenance: { kind: "authored", note: "A120 actor decision fixture." },
  });
  const death = world.history.personDeaths.at(-1)!;
  world = applyOfficeContinuityNotices(world, [
    {
      noticeKey: `crisis:continuity:${death.id}`,
      sequence: death.sequence,
      originEventId: death.eventId,
      personId: senator.personId,
      kind: "death",
      effectiveDate: death.diedAt,
      recordedDate: world.currentDate,
      visibility: "public",
      sourceRecordId: death.id,
      offices: [
        {
          officeKey: seat.seatKey,
          title: senator.title,
          organizationId: null,
          termEvidenceId: senator.termId as EntityId,
        },
      ],
    },
  ]);
  const matter = governingMatters(world).find(
    (row) =>
      row.family === "appointment" &&
      row.openedEvent.tags.includes(`senate-seat:${seat.seatKey}`),
  )!;
  expect(matter).toBeDefined();
  return { world, matter, office, seat, opened, selected };
}

describe("A120 an appointment follows the governor's recorded decision", () => {
  it("opens a random admitted place, carries its actual statutory deadline, and records different player decision dates", () => {
    const { world, matter, seat, opened } = vacancy();
    const law = senateVacancyLaw(opened.stateUsps)!;
    expect(matter.deadline).toBe(
      addDays(world.currentDate, law.appointmentDeadlineDays!),
    );
    expect(matter.options.length).toBeGreaterThan(0);
    expect(
      projectCongress(world)!.senate.seats.find(
        (row) => row.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("vacancy");
    const dates = [];
    for (const waited of [1, 3]) {
      const pending = advanceWorld(
        deserializeWorld(serializeWorld(world)),
        waited,
      );
      expect(governingMatterById(pending, matter.id)!.status).toBe("open");
      expect(
        projectCongress(pending)!.senate.seats.find(
          (row) => row.seatKey === seat.seatKey,
        )!.occupant.kind,
      ).toBe("vacancy");
      const choice = decideGoverningMatter(
        pending,
        matter.id,
        matter.options[0]!.key,
      );
      expect(choice.ok).toBe(true);
      const filled = projectCongress(choice.world)!.senate.seats.find(
        (row) => row.seatKey === seat.seatKey,
      )!;
      expect(filled.occupant.kind).toBe("member");
      if (filled.occupant.kind !== "member")
        throw Error("Recorded governor appointment did not seat nominee");
      const member = filled.occupant.member;
      const decision = governingMatterById(choice.world, matter.id)!.decision!;
      const term = choice.world.history.events.find(
        (row) => row.id === member.termId,
      )!;
      expect(term.occurredAt).toBe(pending.currentDate);
      expect(term.tags).toContain(`appointment-decision:${decision.id}`);
      expect(term.occurredAt <= matter.deadline!).toBe(true);
      expect(filled.occupant.member.personId).toBe(matter.options[0]!.personId);
      expect(
        projectCongress(deserializeWorld(serializeWorld(choice.world))),
      ).toEqual(projectCongress(choice.world));
      expect(
        decideGoverningMatter(choice.world, matter.id, matter.options[0]!.key)
          .ok,
      ).toBe(false);
      dates.push({
        waited,
        date: term.occurredAt,
        nominee: filled.occupant.member.personName,
        personId: filled.occupant.member.personId,
        termId: term.id,
        decisionId: decision.id,
      });
    }
    expect(dates[0]!.date).not.toBe(dates[1]!.date);
    writeFileSync(
      "/tmp/team2-a120-opening-evidence.json",
      JSON.stringify(
        {
          seed,
          place: place.jurisdictionKey,
          citation: law.citation,
          deadline: matter.deadline,
          matterId: matter.id,
          dates,
        },
        null,
        2,
      ),
    );
  });

  it("lets the ordinary NPC desk consider actual candidates without an elapsed-time or stranger fallback", () => {
    const { world, matter, seat } = vacancy("known", false);
    const candidates = new Set(
      matter.openedEvent.participants
        .filter((row) => row.role === "focus:candidate")
        .map((row) => row.personId),
    );
    const considered = advanceWorld(world, 1);
    const current = governingMatterById(considered, matter.id)!;
    const holder = projectCongress(considered)!.senate.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )!;
    if (current.decision && current.status === "decided") {
      expect(holder.occupant.kind).toBe("member");
      if (holder.occupant.kind !== "member")
        throw Error("A saved appointment did not seat its actual candidate");
      expect(candidates.has(holder.occupant.member.personId)).toBe(true);
      expect(
        considered.history.decisionTraces.some(
          (row) =>
            row.context.actorPersonId === matter.holderPersonId &&
            row.context.decisionType === "appointment.choose-appointee",
        ),
      ).toBe(true);
      const startedAt = holder.occupant.member.startedAt;
      expect(startedAt).not.toBeNull();
      if (!startedAt) throw Error("Saved NPC seat has no actual start date");
      expect(startedAt <= matter.deadline!).toBe(true);
    } else {
      expect(current.status).toBe("open");
      expect(holder.occupant.kind).toBe("vacancy");
    }
    writeFileSync(
      "/tmp/team2-a120-npc-evidence.json",
      JSON.stringify(
        {
          place: place.jurisdictionKey,
          seed,
          status: current.status,
          decision: current.decision,
          occupant: holder.occupant,
        },
        null,
        2,
      ),
    );
  });

  it("refuses a late player choice and an unrelated decision as appointment evidence", () => {
    const { world, matter, seat } = vacancy();
    expect(
      recordGovernorSenateAppointment(world, {
        seatKey: seat.seatKey,
        vacancyDate: world.currentDate,
        appointeeId: matter.options[0]!.personId!,
        decisionEventId: matter.openedEvent.id,
      }),
    ).toBe(world);
    const after = advanceWorld(
      world,
      senateVacancyLaw(seat.stateUsps)!.appointmentDeadlineDays! + 1,
    );
    expect(
      decideGoverningMatter(after, matter.id, matter.options[0]!.key).ok,
    ).toBe(false);
    expect(
      projectCongress(after)!.senate.seats.find(
        (row) => row.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("vacancy");
  });

  it("keeps absent party-list and deadline evidence explicit without inventing nominees or a wait", () => {
    const listPlaces = places.filter(
      (row) =>
        senateVacancyLaw(row.jurisdictionKey.replace(/^US-/, ""))
          ?.appointment === "governor-from-party-list",
    );
    expect(listPlaces.length).toBeGreaterThan(0);
    for (const selected of listPlaces) {
      const { world, matter, seat } = vacancy("party-list", true, selected);
      const context = senateAppointmentContext(
        world,
        seat.seatKey,
        world.currentDate,
      )!;
      expect(context.partyListMissing).toBe(true);
      expect(matter.options).toEqual([]);
      expect(matter.openedEvent.tags).toContain(
        "appointment-input:missing-submitted-party-list",
      );
      expect(matter.openedEvent.tags).toContain(
        "deadline-basis:missing-submitted-list-receipt",
      );
      expect(context.deadline).toBeNull();
      expect(matter.deadline).toBeNull();
      expect(
        world.history.futureDueItems.some(
          (row) =>
            row.entityIds.includes(matter.id) &&
            row.transitionKey === "governing:matter-deadline",
        ),
      ).toBe(false);
      expect(
        projectCongress(world)!.senate.seats.find(
          (row) => row.seatKey === seat.seatKey,
        )!.occupant.kind,
      ).toBe("vacancy");
    }
  });
});
