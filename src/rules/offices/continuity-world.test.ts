import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { nextCongressionalElectionAfter } from "./continuity";
import {
  senateVacancyLaw,
  senateAppointmentTiming,
  SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS,
} from "../../simulation/nationwide-world/senate-vacancy-law";
import { congressionalElectionDay } from "../../simulation/living-world/congress-turnover";
import { seatTermWindow } from "../../simulation/living-world/congress-seats";
import { addDays } from "../../simulation/dates";
import { SeededRng } from "../../simulation/rng";
import { makeIsoDate } from "../../simulation/dates";
import { expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { currentFederalTenure } from "../../simulation/federal-tenures";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { recordPersonDeath } from "../../simulation/vitality";
import { projectCongress } from "../../simulation/living-world/congress";
import { congressSeats } from "../../simulation/living-world/congress-seats";
import { electPresidingOfficer } from "../../simulation/governing/presiding-officers";
import {
  applyOfficeContinuityNotices,
  OFFICE_CONTINUITY_VERSION,
} from "../../simulation/governing/office-continuity";
import {
  statutoryPresidentialSuccessor,
  presidentialSuccessionMembers,
} from "./office-plans";
import { congressSeatHeldBy } from "./continuity";

const watchedPlace = new SeededRng("rules2-sendback-offices-watch").pick(
  Object.keys(STATES),
);
it.each(Object.keys(STATES))(
  "statutory presidential succession through generated officeholders in %s",
  (place) => {
    const base = smallWorld({
      place,
      offices: ["congress"],
      seed: "rules2-sendback-continuity:" + place,
    });
    let world = base.world;
    const president = currentFederalTenure(world, "us-president")!;
    const vice = currentFederalTenure(world, "us-vice-president")!;
    for (const personId of [vice.personId, president.personId])
      world = recordPersonDeath(world, {
        stableKey: "rules2:death:" + personId,
        personId,
        diedAt: world.currentDate,
        causeKey: "cause:external-fixture",
        sourceEntityIds: [world.id],
        summary: "Continuity control death.",
        provenance: {
          kind: "authored",
          note: "Public continuity producer control.",
        },
      });
    const death = world.history.personDeaths.at(-1)!;
    const stableKey = `${OFFICE_CONTINUITY_VERSION}:acting-president:${death.id}`;
    const congress = projectCongress(world)!;
    const chambers = [
      {
        key: "house",
        view: congress.house,
        office: "Speaker of the House",
        basis: "3-usc-19-a-1",
      },
      {
        key: "senate",
        view: congress.senate,
        office: "President pro tempore of the Senate",
        basis: "3-usc-19-b",
      },
    ].map((chamber) => {
      const members = presidentialSuccessionMembers(chamber.view.seats);
      const election = electPresidingOfficer(world, {
        stableKey: `${stableKey}:${chamber.key}:presiding-officer`,
        officeTitle: chamber.office,
        members: members.map((row) => ({
          ...row,
          personId: world.people[row.personId]!.id,
          serviceSince:
            row.serviceSince === null ? null : makeIsoDate(row.serviceSince),
        })),
      }).election;
      return { ...chamber, members, winnerPersonId: election.winnerPersonId };
    });
    const planned = statutoryPresidentialSuccessor({
      chambers,
      catalog: congressSeats(),
    });
    const next = applyOfficeContinuityNotices(world, [
      {
        noticeKey: "rules2:continuity:" + death.id,
        sequence: death.sequence,
        originEventId: death.eventId,
        personId: president.personId,
        kind: "death",
        effectiveDate: death.diedAt,
        recordedDate: world.currentDate,
        visibility: "public",
        offices: [
          {
            officeKey: "us-president",
            title: "President of the United States",
            organizationId: null,
            termEvidenceId: president.event.id,
          },
        ],
        sourceRecordId: death.id,
      },
    ]);
    if (place === watchedPlace)
      writeFileSync(
        join(tmpdir(), "rules2-offices-watch.json"),
        JSON.stringify({
          place,
          seed: base.world.seed,
          worldId: world.id,
          deathRecordId: death.id,
          successorPersonId: currentPresidentOf(next)?.personId,
          vacatedSeatKey: planned?.seat.seatKey,
        }),
      );
    expect(currentPresidentOf(next)?.personId ?? null).toBe(
      planned?.personId ?? null,
    );
    if (planned) {
      expect(
        congressSeatHeldBy(
          [...congress.house.seats, ...congress.senate.seats],
          congressSeats(),
          planned.personId,
        ),
      ).toEqual(planned.seat);
      expect(
        projectCongress(next)![
          planned.seat.chamberKey === "us-house" ? "house" : "senate"
        ].seats.find((row) => row.seatKey === planned.seat.seatKey)!.occupant
          .kind,
      ).toBe("vacancy");
    }
    const senatorSeat = projectCongress(base.world)!.senate.seats.find(
      (row) =>
        row.occupant.kind === "member" &&
        congressSeats().some(
          (seat) =>
            seat.seatKey === row.seatKey && (seat.senateClass ?? 0) !== 2,
        ),
    )!;
    if (senatorSeat.occupant.kind !== "member")
      throw new Error("No sitting senator");
    const senator = senatorSeat.occupant.member;
    const seat = congressSeats().find(
      (row) => row.seatKey === senatorSeat.seatKey,
    )!;
    const vacancy = recordPersonDeath(base.world, {
      stableKey: "rules2:senator-death",
      personId: senator.personId,
      diedAt: base.world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [base.world.id],
      summary: "Senate calendar control.",
      provenance: {
        kind: "authored",
        note: "Public vacancy producer control.",
      },
    });
    const senatorDeath = vacancy.history.personDeaths.at(-1)!;
    const filled = applyOfficeContinuityNotices(vacancy, [
      {
        noticeKey: "rules2:senate-continuity:" + senatorDeath.id,
        sequence: senatorDeath.sequence,
        originEventId: senatorDeath.eventId,
        personId: senator.personId,
        kind: "death",
        effectiveDate: senatorDeath.diedAt,
        recordedDate: vacancy.currentDate,
        visibility: "public",
        sourceRecordId: senatorDeath.id,
        offices: [
          {
            officeKey: seat.seatKey,
            title: senator.title,
            organizationId: projectCongress(base.world)!.senate.organizationId,
            termEvidenceId: senator.termId,
          },
        ],
      },
    ]);
    const law = senateVacancyLaw(seat.stateUsps);
    const appoints = law ? law.appointment !== "none" : true;
    const timing = senateAppointmentTiming(law);
    const modeled = timing
      ? addDays(vacancy.currentDate, timing.days)
      : vacancy.currentDate;
    const appointment =
      modeled <= vacancy.currentDate
        ? addDays(vacancy.currentDate, 1)
        : modeled;
    const nextGeneral = nextCongressionalElectionAfter(
      appoints ? appointment : vacancy.currentDate,
    );
    const prompt =
      law?.specialElection.kind === "prompt"
        ? addDays(
            vacancy.currentDate,
            law.specialElection.promptDays ??
              SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS,
          )
        : null;
    // Prompt-period estimation is owned by elections; this assertion observes the strict next-general helper when no prompt supersedes it.
    if (prompt === null || prompt >= nextGeneral) {
      const regular = congressionalElectionDay(
        Number(
          seatTermWindow(seat, vacancy.currentDate).endExclusive.slice(0, 4),
        ) - 1,
      );
      const due = filled.history.futureDueItems.find(
        (row) =>
          row.transitionKey === "governing:house-special-election" &&
          row.stableKey.includes(seat.seatKey),
      );
      expect(due?.dueAt ?? null).toBe(
        nextGeneral < regular ? nextGeneral : null,
      );
    }
  },
);
