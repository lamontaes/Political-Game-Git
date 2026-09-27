/** Saved candidate evidence. A professional record is not a legal eligibility ruling. */

import { personName } from "../people";
import type { EntityId, IsoDate, World } from "../types";
import { seatHolderAt } from "./courts";
import { screenFederalJudicialNominee } from "./selection";

export interface JudicialCandidateEvidence {
  readonly personId: EntityId;
  readonly name: string;
  readonly professionalRecords: readonly {
    readonly recordId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly barAdmittedAt: IsoDate;
    readonly legalPracticeSince: IsoDate | null;
    readonly provenance: "generated-opening-background" | "recorded-life";
    readonly careerFacts: readonly {
      readonly factId: EntityId;
      readonly title: string;
      readonly employer: string;
      readonly startedAt: IsoDate;
      readonly endedAt: IsoDate | null;
    }[];
  }[];
  readonly currentSeat: {
    readonly seatId: string;
    readonly courtName: string;
    readonly startedAt: IsoDate;
  } | null;
  readonly philosophy: "recorded" | "unresolved";
}

/** Read only the person's saved records; leave every unsupported attribute unknown. */
export function judicialCandidateEvidence(
  world: World,
  personId: EntityId,
): JudicialCandidateEvidence | null {
  const person = world.people[personId];
  if (!person) return null;
  const professionalRecords = (
    world.judiciary?.professionalQualifications ?? []
  )
    .filter(
      (record) =>
        record.personId === personId && record.recordedAt <= world.currentDate,
    )
    .map((record) => ({
      recordId: record.recordId,
      jurisdictionId: record.jurisdictionId,
      barAdmittedAt: record.barAdmittedAt,
      legalPracticeSince: record.legalPracticeSince,
      provenance: record.provenance.kind,
      careerFacts: record.provenance.evidenceFactIds.flatMap((factId) => {
        const fact = person.establishedFacts.find(
          (entry) =>
            entry.id === factId && entry.occurredAt <= world.currentDate,
        );
        return fact?.kind === "occupation"
          ? [
              {
                factId: fact.id,
                title: fact.title,
                employer: fact.employer,
                startedAt: fact.occurredAt,
                endedAt: fact.endedAt,
              },
            ]
          : [];
      }),
    }));
  const possibleSeats = new Set(
    (world.judiciary?.seatTenures ?? [])
      .filter((tenure) => tenure.personId === personId)
      .map((tenure) => tenure.seatId),
  );
  for (const seat of Object.values(world.judiciary?.seats ?? {})) {
    if (seat.linkedOfficeId) possibleSeats.add(seat.seatId);
  }
  const currentSeat = [...possibleSeats]
    .map((seatId) => world.judiciary?.seats[seatId])
    .filter((seat) => seat !== undefined)
    .map((seat) => ({ seat, holder: seatHolderAt(world, seat.seatId) }))
    .find(({ holder }) => holder?.personId === personId);
  return {
    personId,
    name: personName(person),
    professionalRecords,
    currentSeat: currentSeat?.holder
      ? {
          seatId: currentSeat.seat.seatId,
          courtName: world.judiciary!.courts[currentSeat.seat.courtId]!.name,
          startedAt: currentSeat.holder.startedAt,
        }
      : null,
    philosophy:
      screenFederalJudicialNominee(world, personId).state === "ready"
        ? "recorded"
        : "unresolved",
  };
}

/** A discovery list of living people with saved professional records. */
export function judicialCandidatesWithProfessionalRecord(
  world: World,
): readonly JudicialCandidateEvidence[] {
  const ids = new Set(
    (world.judiciary?.professionalQualifications ?? [])
      .filter((record) => record.recordedAt <= world.currentDate)
      .map((record) => record.personId),
  );
  return [...ids]
    .filter(
      (personId) =>
        !world.history.personDeaths.some(
          (death) =>
            death.personId === personId && death.diedAt <= world.currentDate,
        ),
    )
    .flatMap((personId) => {
      const evidence = judicialCandidateEvidence(world, personId);
      return evidence ? [evidence] : [];
    })
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.personId.localeCompare(right.personId),
    );
}
