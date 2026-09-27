/** Court and seat queries and bounded writers; no work runs on the Day clock. */

import { currentFederalTenure } from "../federal-tenures";
import type { EntityId, IsoDate, World } from "../types";
import { assertWorldIntegrity } from "../world";
import type {
  JudicialCourt,
  JudicialCourtRules,
  JudiciaryState,
  JudicialSeat,
  JudicialSeatTenure,
  JudicialSelectionProvenance,
} from "./types";
import { judicialSeatId } from "./types";

export const EMPTY_JUDICIARY: JudiciaryState = {
  courts: {},
  seats: {},
  courtRuleVersions: [],
  seatTenures: [],
  selections: [],
  selectionStages: [],
  retentionContests: [],
  retentionResults: [],
  philosophies: [],
};

export function effectiveCourtRulesAt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): { readonly recordId: string; readonly rules: JudicialCourtRules } | null {
  const version = [...(world.judiciary?.courtRuleVersions ?? [])]
    .reverse()
    .find((entry) => entry.courtId === courtId && entry.effectiveAt <= asOf);
  return version ? { recordId: version.recordId, rules: version.rules } : null;
}

export function courtById(world: World, courtId: string): JudicialCourt | null {
  return world.judiciary?.courts[courtId] ?? null;
}

export function courtsForJurisdiction(
  world: World,
  jurisdictionId: EntityId | null,
): readonly JudicialCourt[] {
  return Object.values(world.judiciary?.courts ?? {}).filter(
    (court) => court.jurisdictionId === jurisdictionId,
  );
}

export function seatsForCourt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): readonly JudicialSeat[] {
  return Object.values(world.judiciary?.seats ?? {})
    .filter(
      (seat) =>
        seat.courtId === courtId &&
        seat.createdAt <= asOf &&
        (seat.retiredAt === null || seat.retiredAt > asOf),
    )
    .sort((a, b) => a.ordinal - b.ordinal);
}

export interface JudicialSeatHolder {
  readonly seatId: string;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  readonly tenureId: string;
  readonly provenance: "judiciary" | "federal-chief-justice";
}

/** The Chief Justice is read from its already canonical federal tenure. */
export function seatHolderAt(
  world: World,
  seatId: string,
  asOf: IsoDate = world.currentDate,
): JudicialSeatHolder | null {
  const seat = world.judiciary?.seats[seatId];
  if (
    !seat ||
    seat.createdAt > asOf ||
    (seat.retiredAt && seat.retiredAt <= asOf)
  )
    return null;
  if (seat.linkedOfficeId) {
    const tenure = currentFederalTenure(world, seat.linkedOfficeId, asOf);
    return tenure
      ? {
          seatId,
          personId: tenure.personId,
          startedAt: tenure.startedAt,
          tenureId: tenure.event.id,
          provenance: "federal-chief-justice",
        }
      : null;
  }
  const tenure = [...(world.judiciary?.seatTenures ?? [])]
    .reverse()
    .find(
      (entry) =>
        entry.seatId === seatId &&
        entry.startedAt <= asOf &&
        (entry.endedAt === null || asOf < entry.endedAt),
    );
  if (!tenure) return null;
  if (
    world.history.personDeaths.some(
      (death) => death.personId === tenure.personId && death.diedAt <= asOf,
    )
  )
    return null;
  return {
    seatId,
    personId: tenure.personId,
    startedAt: tenure.startedAt,
    tenureId: tenure.tenureId,
    provenance: "judiciary",
  };
}

export function vacantSeatsAt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): readonly JudicialSeat[] {
  return seatsForCourt(world, courtId, asOf).filter(
    (seat) => !seatHolderAt(world, seat.seatId, asOf),
  );
}

function requireCourt(world: World, courtId: string): JudicialCourt {
  const court = courtById(world, courtId);
  if (!court) throw new Error(`Unknown judicial court: ${courtId}`);
  return court;
}

function requireSeat(world: World, seatId: string): JudicialSeat {
  const seat = world.judiciary?.seats[seatId];
  if (!seat) throw new Error(`Unknown judicial seat: ${seatId}`);
  return seat;
}

function saveJudiciary(world: World, judiciary: JudiciaryState): World {
  const next = { ...world, judiciary };
  assertWorldIntegrity(next);
  return next;
}

/** Initial court creation or an enacted new court; seat allocation is explicit. */
export function addJudicialCourt(world: World, court: JudicialCourt): World {
  if (courtById(world, court.courtId))
    throw new Error(`Judicial court already exists: ${court.courtId}`);
  const count = court.rules.authorizedSeats;
  if (
    count.state === "known" &&
    (!Number.isSafeInteger(count.value) || count.value < 0)
  )
    throw new Error(
      "Authorized judicial seat count must be a nonnegative integer.",
    );
  const seats = { ...(world.judiciary?.seats ?? {}) };
  for (
    let ordinal = 1;
    count.state === "known" && ordinal <= count.value;
    ordinal += 1
  ) {
    const seatId = judicialSeatId(court.courtId, ordinal);
    seats[seatId] = {
      seatId,
      courtId: court.courtId,
      ordinal,
      createdAt: court.createdAt,
      retiredAt: null,
      linkedOfficeId:
        court.level === "federal-supreme" && ordinal === 1
          ? "us-chief-justice"
          : null,
    };
  }
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  return saveJudiciary(world, {
    ...previous,
    courts: { ...previous.courts, [court.courtId]: court },
    seats,
    courtRuleVersions: [
      ...previous.courtRuleVersions,
      {
        recordId: `judicial-rule:initial:${court.courtId}`,
        courtId: court.courtId,
        effectiveAt: court.createdAt,
        provisionId: null,
        rules: court.rules,
      },
    ],
  });
}

/** A changed statute or constitution creates vacancies, never automatic nominees. */
export function changeJudicialCourtRules(
  world: World,
  input: {
    readonly courtId: string;
    readonly effectiveAt: IsoDate;
    readonly provisionId: EntityId;
    readonly rules: JudicialCourtRules;
  },
): World {
  const court = requireCourt(world, input.courtId);
  if (input.effectiveAt > world.currentDate)
    throw new Error(
      "A future judicial rule needs a scheduled effective transition.",
    );
  if (input.rules.authorizedSeats.state !== "known")
    throw new Error("An enacted court-size change needs a known seat count.");
  const count = input.rules.authorizedSeats.value;
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error(
      "Authorized judicial seat count must be a nonnegative integer.",
    );
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const recordId = `judicial-rule:${input.provisionId}:${input.courtId}`;
  if (previous.courtRuleVersions.some((record) => record.recordId === recordId))
    return world;
  const seats = { ...previous.seats };
  const existing = Object.values(seats).filter(
    (seat) => seat.courtId === court.courtId,
  );
  const largestOrdinal = Math.max(0, ...existing.map((seat) => seat.ordinal));
  for (let ordinal = largestOrdinal + 1; ordinal <= count; ordinal += 1) {
    const seatId = judicialSeatId(court.courtId, ordinal);
    seats[seatId] = {
      seatId,
      courtId: court.courtId,
      ordinal,
      createdAt: input.effectiveAt,
      retiredAt: null,
      linkedOfficeId: null,
    };
  }
  let activeCount = Object.values(seats).filter(
    (seat) => seat.courtId === court.courtId && seat.retiredAt === null,
  ).length;
  if (activeCount < count) {
    for (const seat of existing
      .filter((entry) => entry.retiredAt !== null)
      .sort((a, b) => a.ordinal - b.ordinal)) {
      if (activeCount >= count) break;
      seats[seat.seatId] = { ...seat, retiredAt: null };
      activeCount += 1;
    }
  }
  if (activeCount > count) {
    for (const seat of existing
      .filter((entry) => entry.retiredAt === null)
      .sort((a, b) => b.ordinal - a.ordinal)) {
      if (activeCount <= count) break;
      if (seatHolderAt(world, seat.seatId, input.effectiveAt)) continue;
      seats[seat.seatId] = { ...seat, retiredAt: input.effectiveAt };
      activeCount -= 1;
    }
  }
  return saveJudiciary(world, {
    ...previous,
    courts: {
      ...previous.courts,
      [court.courtId]: { ...court, rules: input.rules },
    },
    seats,
    courtRuleVersions: [
      ...previous.courtRuleVersions,
      {
        recordId,
        courtId: court.courtId,
        effectiveAt: input.effectiveAt,
        provisionId: input.provisionId,
        rules: input.rules,
      },
    ],
  });
}

export function seatJudge(
  world: World,
  input: {
    readonly seatId: string;
    readonly personId: EntityId;
    readonly startedAt: IsoDate;
    readonly selection: JudicialSelectionProvenance;
    readonly termEndsAt: IsoDate | null;
    readonly retentionDueAt: IsoDate | null;
  },
): World {
  const seat = requireSeat(world, input.seatId);
  if (seat.linkedOfficeId)
    throw new Error(
      "The Chief Justice seat follows canonical federal office tenure.",
    );
  if (
    seat.retiredAt !== null ||
    input.startedAt < seat.createdAt ||
    input.startedAt > world.currentDate
  )
    throw new Error("Judicial seat is unavailable at the requested date.");
  if (!world.people[input.personId])
    throw new Error(`Unknown judicial nominee: ${input.personId}`);
  if (seatHolderAt(world, seat.seatId, input.startedAt))
    throw new Error(`Judicial seat already held: ${seat.seatId}`);
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === input.personId && death.diedAt <= input.startedAt,
    )
  )
    throw new Error("A deceased person cannot take a judicial seat.");
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const tenureId = `judicial-tenure:${input.seatId}:${input.startedAt}:${input.personId}`;
  if (previous.seatTenures.some((tenure) => tenure.tenureId === tenureId))
    throw new Error(`Judicial tenure already exists: ${tenureId}`);
  const tenure: JudicialSeatTenure = {
    tenureId,
    seatId: input.seatId,
    personId: input.personId,
    startedAt: input.startedAt,
    endedAt: null,
    endReason: null,
    selection: input.selection,
    termEndsAt: input.termEndsAt,
    retentionDueAt: input.retentionDueAt,
  };
  return saveJudiciary(world, {
    ...previous,
    seatTenures: [...previous.seatTenures, tenure],
  });
}

export function vacateJudicialSeat(
  world: World,
  input: {
    readonly seatId: string;
    readonly vacatedAt: IsoDate;
    readonly reason: NonNullable<JudicialSeatTenure["endReason"]>;
  },
): World {
  const seat = requireSeat(world, input.seatId);
  if (seat.linkedOfficeId)
    throw new Error(
      "The Chief Justice vacancy follows canonical federal office tenure.",
    );
  if (input.vacatedAt > world.currentDate)
    throw new Error("A future vacancy needs a scheduled transition.");
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const currentTenure = [...previous.seatTenures]
    .reverse()
    .find(
      (entry) =>
        entry.seatId === input.seatId &&
        entry.startedAt <= input.vacatedAt &&
        (entry.endedAt === null || entry.endedAt > input.vacatedAt),
    );
  if (!currentTenure)
    throw new Error(`Judicial seat is already vacant: ${input.seatId}`);
  const court = requireCourt(world, seat.courtId);
  const capacity = court.rules.authorizedSeats;
  const activeCount = seatsForCourt(world, court.courtId).length;
  const retiring = capacity.state === "known" && activeCount > capacity.value;
  return saveJudiciary(world, {
    ...previous,
    seats: retiring
      ? {
          ...previous.seats,
          [seat.seatId]: { ...seat, retiredAt: input.vacatedAt },
        }
      : previous.seats,
    seatTenures: previous.seatTenures.map((tenure) =>
      tenure.tenureId === currentTenure.tenureId
        ? { ...tenure, endedAt: input.vacatedAt, endReason: input.reason }
        : tenure,
    ),
  });
}
