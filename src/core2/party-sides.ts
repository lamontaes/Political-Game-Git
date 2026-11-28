/**
 * Party identity: a party's printed name, its side of the left-right scale,
 * the national party of a side, and the side a label caucuses with in
 * Congress. One leaf file of the elections engine that imports nothing but its
 * data (`data/elections/party-sides.json`), so executive, bodies, news and the
 * screens read a party the same way and nothing here can close an import
 * cycle. Nominating and confirming stay in appointments.ts.
 */
import partySides from "./data/elections/party-sides.json" with { type: "json" };

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
