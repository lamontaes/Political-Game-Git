/**
 * The order of names on the printed ballot, by the law of the place
 * (`data/research/elections/ballot-order-2026.json`): alphabetical by
 * surname, a drawn alphabet, a lot drawn for each contest, rotation so each
 * candidate is first on an equal share of ballots, by party, the incumbent
 * first, or filing order. A drawing the law requires (the alphabet, a lot) is
 * the world's own recorded draw: the same contest always draws the same
 * order (owner, Oct 14, 2026: where the law says lot, a recorded lot from the
 * world's generator). Every voter reads the first-listed edge from the form
 * of the ballot they hold (`ballotCuesOf`).
 */
import { stableHash } from "./kernel/ids";
import ballotOrderData from "../../data/research/elections/ballot-order-2026.json" with { type: "json" };

export type BallotOrderKind =
  | "alphabetical"
  | "randomized-alphabet"
  | "rotation"
  | "lot"
  | "party"
  | "incumbent-first"
  | "filing-order"
  | "official-discretion";

export interface BallotOrderRule {
  readonly kind: BallotOrderKind;
  /** The order within a party or after the incumbent. */
  readonly within?: BallotOrderKind;
  readonly unit?: string;
}

interface PlaceRow {
  readonly primary: BallotOrderRule;
  readonly general: BallotOrderRule;
  readonly citation: string;
  readonly url?: string;
  readonly estimate?: boolean;
}

const PLACES = (
  ballotOrderData as unknown as { places: Record<string, PlaceRow> }
).places;

/** The ballot-order law of a place for a primary or a general election, with its citation. */
export function ballotOrderRule(
  stateKey: string,
  stage: "primary" | "general",
):
  | (BallotOrderRule & {
      readonly citation: string;
      /** The rule is read from a secondary source, not yet the statute itself. */
      readonly estimate: boolean;
    })
  | null {
  const row = PLACES[stateKey];
  return row
    ? { ...row[stage], citation: row.citation, estimate: !!row.estimate }
    : null;
}

/** A candidate as the ballot lists them. */
export interface BallotCandidate {
  readonly id: string;
  readonly surname: string;
  readonly party: string | null;
  readonly isIncumbent: boolean;
  readonly filedOn: string;
  readonly filingId: string;
}

export interface BallotOrderInput {
  readonly stateKey: string;
  readonly stage: "primary" | "general";
  readonly contestId: string;
  /** The election's year, for a drawn alphabet the state draws once a cycle. */
  readonly year: string;
  readonly candidates: readonly BallotCandidate[];
  /** Each party's share of the place's voters, for an order by party. */
  readonly partyShare: (party: string) => number;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The alphabet the state drew for the year (its recorded drawing). */
function drawnAlphabet(stateKey: string, year: string): string {
  return [...LETTERS]
    .map((letter) => ({
      letter,
      key: stableHash(`ballot-alphabet:${stateKey}:${year}:${letter}`),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => row.letter)
    .join("");
}

function bySurname(alphabet: string) {
  const rank = (name: string) =>
    [...name.toUpperCase()]
      .map((c) => {
        const i = alphabet.indexOf(c);
        return String.fromCharCode(65 + (i < 0 ? 26 : i));
      })
      .join("");
  return (a: BallotCandidate, b: BallotCandidate) =>
    rank(a.surname).localeCompare(rank(b.surname)) || a.id.localeCompare(b.id);
}

/** One order of the candidates under a kind that yields one order. */
function orderBy(
  kind: BallotOrderKind,
  input: BallotOrderInput,
  list: readonly BallotCandidate[],
): BallotCandidate[] {
  const sorted = [...list];
  switch (kind) {
    // A layout (`ballotForms`) asked for an order within itself: by surname.
    case "party":
    case "incumbent-first":
    case "alphabetical":
    case "rotation":
      return sorted.sort(bySurname(LETTERS));
    case "randomized-alphabet":
      return sorted.sort(bySurname(drawnAlphabet(input.stateKey, input.year)));
    case "lot":
      return sorted.sort(
        (a, b) =>
          stableHash(`ballot-lot:${input.contestId}:${a.id}`).localeCompare(
            stableHash(`ballot-lot:${input.contestId}:${b.id}`),
          ) || a.id.localeCompare(b.id),
      );
    case "filing-order":
    case "official-discretion":
      return sorted.sort(
        (a, b) =>
          a.filedOn.localeCompare(b.filedOn) ||
          a.filingId.localeCompare(b.filingId),
      );
  }
}

/**
 * The forms of the ballot: one order of the candidates, or, where the law
 * rotates names, one form per place in the rotation, each candidate first on
 * one of them. Null where the place's law isn't in the data.
 */
export function ballotForms(
  input: BallotOrderInput,
): readonly (readonly string[])[] | null {
  const rule = ballotOrderRule(input.stateKey, input.stage);
  if (!rule) return null;
  const within = rule.within ?? "alphabetical";
  let base: BallotCandidate[];
  if (rule.kind === "party" || rule.kind === "incumbent-first") {
    // The layout first, then the order within it (a stable sort keeps it).
    const inner = orderBy(within, input, input.candidates);
    base =
      rule.kind === "party"
        ? [...inner].sort(
            (a, b) =>
              (b.party ? input.partyShare(b.party) : -1) -
              (a.party ? input.partyShare(a.party) : -1),
          )
        : [...inner].sort(
            (a, b) => Number(b.isIncumbent) - Number(a.isIncumbent),
          );
  } else base = orderBy(rule.kind, input, input.candidates);
  const ids = base.map((c) => c.id);
  const rotates = rule.kind === "rotation" || within === "rotation";
  if (!rotates || ids.length < 2) return [ids];
  return ids.map((_, k) => [...ids.slice(k), ...ids.slice(0, k)]);
}

/**
 * What each candidate's place brings on every form of the ballot, in appeal
 * units: the full edge first, sliding to nothing at the bottom.
 */
export function ballotCuesOf(
  forms: readonly (readonly string[])[],
  edge: number,
): Map<string, number[]> {
  const cues = new Map<string, number[]>();
  for (const form of forms) {
    const last = Math.max(1, form.length - 1);
    form.forEach((id, position) => {
      const row = cues.get(id) ?? [];
      row.push(form.length > 1 ? (edge * (last - position)) / last : 0);
      cues.set(id, row);
    });
  }
  return cues;
}
