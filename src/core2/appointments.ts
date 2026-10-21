/**
 * Appointments: an official nominates, a body confirms (M3-05's "appoints
 * someone they know"; the central bank board's seats; cabinets, boards and
 * vacancies filled by appointment).
 *
 * The appointing official chooses among the candidates put before them for
 * their own recorded reasons: how close each one's views sit to their own
 * party's side, how qualified they are, and whether they know them. Where the
 * law requires confirmation, each member of the confirming body votes: yes
 * when the nominee sits closer to the member's own party's side than to the
 * other side. Simple majority confirms. The U.S. Senate's members are its
 * real party makeup, seat by seat (public-domain roster).
 */
import { campaignParameter } from "./campaign-views";
import { decisionLean, decisionTraitWeight } from "./trait-decisions";
import type { CoreState } from "./types";
import partySides from "./data/elections/party-sides.json" with { type: "json" };
import partyCounts from "../../data/research/offices/legislature-party-counts-2026.json" with { type: "json" };

export interface AppointmentCandidate {
  readonly id: string;
  /** Left-right lean in [-1, 1]. */
  readonly lean: number;
  /** How qualified for the post, in [0, 1], from the candidate's career. */
  readonly qualification: number;
  /** Whether the appointing official knows them. */
  readonly known: boolean;
}

export interface NominationReasons {
  readonly candidateId: string;
  readonly alignment: number;
  readonly qualification: number;
  readonly acquaintance: number;
  /** How much the appointer's own traits count loyalty and merit (1 each where no appointer is named). */
  readonly loyaltyWeight?: number;
  readonly meritWeight?: number;
  readonly total: number;
}

/**
 * How an appointer's own traits weigh the terms of a nomination: loyalty
 * (alignment and acquaintance) against merit (qualification). A sliding scale
 * around one for each; where the traits tilt neither way both are 1.
 */
export function appointerWeighing(
  core: Pick<CoreState, "data" | "people">,
  appointerId: string | undefined,
): { readonly loyalty: number; readonly merit: number } | undefined {
  const person = appointerId ? core.people.get(appointerId) : undefined;
  if (!person) return undefined;
  const tilt =
    decisionLean(
      core,
      person,
      "appointments.weigh",
      "appoint-loyalty",
      "appoint-merit",
    ) * decisionTraitWeight(core, "appointments.weigh");
  return { loyalty: 1 + tilt, merit: 1 - tilt };
}

export interface Appointment {
  readonly seatKey: string;
  readonly nomineeId: string;
  readonly reasons: readonly NominationReasons[];
  readonly confirmation: {
    readonly body: string;
    readonly yes: number;
    readonly no: number;
    readonly confirmed: boolean;
  } | null;
}

/**
 * A party's name as the ballot prints it: the rosters' "Democrat" is the
 * Democratic Party (one label everywhere a candidate or holder shows).
 */
export function partyName(party: string | null): string | null {
  if (!party) return party;
  return /^democrat(ic)?$/i.test(party.trim()) ? "Democratic" : party;
}

const SIDES = new Map(
  Object.entries(
    (partySides as unknown as { sides: Record<string, number> }).sides,
  ).map(([label, side]) => [label.trim().toLowerCase(), side]),
);
const CAUCUS = new Map(
  Object.entries(
    (
      partySides as unknown as {
        congressCaucus: { sides: Record<string, number> };
      }
    ).congressCaucus.sides,
  ).map(([label, side]) => [label.trim().toLowerCase(), side]),
);

/**
 * A party label's side of the left-right scale: -1 the Democratic family, +1
 * the Republican family, 0 any other. Read from the party-sides data by the
 * label as printed (`data/elections/party-sides.json`); a label not listed is
 * 0. The one place the game decides a party's side.
 */
export function partySide(party: string | null | undefined): number {
  if (!party) return 0;
  return SIDES.get(party.trim().toLowerCase()) ?? 0;
}

/** The national party of a side of the scale, as the party-sides data names it. */
export function nationalParty(side: number): string {
  const name = (partySides as unknown as { national: Record<string, string> })
    .national[String(Math.sign(side))];
  if (!name) throw new Error(`No national party on side ${side}`);
  return name;
}

/** A member of Congress's side: their party's, or the side their label caucuses with. */
export function caucusSide(party: string | null | undefined): number {
  if (!party) return 0;
  return partySide(party) || (CAUCUS.get(party.trim().toLowerCase()) ?? 0);
}

/** The U.S. Senate's members' party sides, seat by seat. */
export function senateSides(): readonly number[] {
  const congress = (
    partyCounts as unknown as {
      congress: Record<string, Record<string, string[]>>;
    }
  ).congress;
  return Object.values(congress).flatMap((seats) =>
    (seats.senate ?? []).map((p) => partySide(p)),
  );
}

/**
 * Nominate and, where required, confirm. If the body rejects the first
 * choice, the official nominates the next one their reasons rank.
 */
export function nominateAndConfirm(input: {
  readonly seatKey: string;
  readonly appointerSide: number;
  readonly candidates: readonly AppointmentCandidate[];
  /** Party sides of the confirming body's members, or null where no confirmation is required. */
  readonly confirmingBody: {
    readonly name: string;
    readonly sides: readonly number[];
  } | null;
  /**
   * Deference to the appointer: a member confirms unless the nominee's lean
   * sits further than this from their own (bodies confirm nearly every
   * executive nominee). Without it, each member backs the nominee closer to
   * their side than the other side's would be.
   */
  readonly tolerance?: number;
  /** The appointer's own weighing (`appointerWeighing`); equal weights where none is named. */
  readonly weighing?: { readonly loyalty: number; readonly merit: number };
}): Appointment {
  const reasons = input.candidates
    .map((c): NominationReasons => {
      const alignment = 1 - Math.abs(c.lean - input.appointerSide) / 2;
      const acquaintance = c.known
        ? campaignParameter("appointmentAcquaintanceWeight")
        : 0;
      const loyalty = input.weighing?.loyalty ?? 1;
      const merit = input.weighing?.merit ?? 1;
      return {
        candidateId: c.id,
        alignment,
        qualification: c.qualification,
        acquaintance,
        ...(input.weighing
          ? { loyaltyWeight: loyalty, meritWeight: merit }
          : {}),
        total: loyalty * (alignment + acquaintance) + merit * c.qualification,
      };
    })
    .sort(
      (a, b) => b.total - a.total || a.candidateId.localeCompare(b.candidateId),
    );
  for (const choice of reasons) {
    const nominee = input.candidates.find((c) => c.id === choice.candidateId)!;
    if (!input.confirmingBody)
      return {
        seatKey: input.seatKey,
        nomineeId: nominee.id,
        reasons,
        confirmation: null,
      };
    let yes = 0;
    let no = 0;
    for (const side of input.confirmingBody.sides) {
      // An unaffiliated member weighs the nominee against the middle.
      const own = side === 0 ? 0 : side;
      const other = side === 0 ? (nominee.lean >= 0 ? -1 : 1) : -side;
      const confirms =
        input.tolerance !== undefined
          ? Math.abs(nominee.lean - own) <= input.tolerance
          : Math.abs(nominee.lean - own) <= Math.abs(nominee.lean - other);
      if (confirms) yes += 1;
      else no += 1;
    }
    if (yes > no)
      return {
        seatKey: input.seatKey,
        nomineeId: nominee.id,
        reasons,
        confirmation: {
          body: input.confirmingBody.name,
          yes,
          no,
          confirmed: true,
        },
      };
  }
  return {
    seatKey: input.seatKey,
    nomineeId: "",
    reasons,
    confirmation: input.confirmingBody
      ? {
          body: input.confirmingBody.name,
          yes: 0,
          no: input.confirmingBody.sides.length,
          confirmed: false,
        }
      : null,
  };
}
