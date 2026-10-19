/**
 * Who each state and federal official is (OPUS-OFFICIALS, M1-12): their own
 * left-right position, their party wing, the few questions that are their
 * own causes, their traits, how loyal and how ambitious they are, and, for an
 * independent, whom they caucus with and why they're independent.
 *
 * All of it is who the person is, drawn once from the world's seed and the
 * seat (seeded generation of who exists); nothing here decides a vote. The
 * spreads are data (`data/officials/officials.json`): the parties' real
 * first-dimension spread in the 119th Congress (Voteview), pulled toward the
 * member's district as members really are.
 */
import officialsData from "./data/officials/officials.json" with { type: "json" };
import axesJson from "../../data/research/campaigns/issue-axes-2026.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import { partySide } from "./appointments";
import {
  PLATFORM_QUESTIONS,
  personStance,
  publicOffset,
} from "./campaign-views";

interface Spread {
  readonly mean: number;
  readonly sd: number;
}
interface Weight {
  readonly value: number;
}

export const OFFICIALS_DATA = officialsData as unknown as {
  ideology: {
    parties: Record<PartyKey, Record<"us-house" | "us-senate", Spread>>;
    districtPull: Weight;
    stateMeanScale: Weight;
    executiveSpreadScale: Weight;
    leanScale: Weight;
  };
  wings: { cut: number; names: Record<PartyKey, readonly string[]> };
  signatureIssues: { count: Weight; tiltSd: Weight };
  independents: {
    caucus: Record<
      string,
      { caucus: string; formerParty?: string; leftPartyOn?: string }
    >;
    betweenBand: Weight;
  };
  traits: { keys: Record<string, Spread> };
  weights: Record<
    | "views"
    | "district"
    | "stateStake"
    | "statePartyLoyalty"
    | "party"
    | "caucus"
    | "wing"
    | "ambition"
    | "press"
    | "independentReason"
    | "executiveParty",
    Weight
  >;
  loyalty: {
    perDutyBound: number;
    perGenerous: number;
    perConflict: number;
    perRisk: number;
    leadership: number;
    floor: number;
  };
  ambitionTraits: { perEnterprising: number; perRisk: number };
  visibility: Record<string, number>;
  leadership: { roles: readonly string[] };
  stateSample: { perChamber: number };
  colleagues: { hoursPerSharedYear: Weight; maxYears: Weight };
  tier: string;
  candidacy: {
    ladder: Record<string, readonly BodyKind[]>;
    fit: Weight;
    noRecord: Weight;
  };
};

export type PartyKey = "democratic" | "republican" | "other";

/** Which body's spread a seat draws from. */
export type BodyKind = "us-house" | "us-senate" | "executive" | "legislature";

export function partyKey(party: string | null | undefined): PartyKey {
  const side = partySide(party);
  return side < 0 ? "democratic" : side > 0 ? "republican" : "other";
}

/** A uniform value in (0, 1) for a key. */
export function uniform(key: string): number {
  const draw = Number.parseInt(stableHash(key).slice(0, 12), 16);
  return (draw + 0.5) / 16 ** 12;
}

/** A standard normal value for a key (Box and Muller 1958). */
export function seededNormal(key: string): number {
  return (
    Math.sqrt(-2 * Math.log(uniform(`${key}:a`))) *
    Math.cos(2 * Math.PI * uniform(`${key}:b`))
  );
}

/** The party's spread for a kind of body, from the data. */
export function partySpread(party: PartyKey, body: BodyKind): Spread {
  const rows = OFFICIALS_DATA.ideology.parties[party];
  const ideology = OFFICIALS_DATA.ideology;
  if (body === "us-house" || body === "us-senate") return rows[body];
  if (body === "executive")
    return {
      mean: rows["us-senate"].mean,
      sd: rows["us-senate"].sd * ideology.executiveSpreadScale.value,
    };
  return {
    mean: rows["us-house"].mean * ideology.stateMeanScale.value,
    sd: rows["us-house"].sd,
  };
}

export interface SignatureIssue {
  readonly question: string;
  /** How far their view on it departs from their overall position (+ right). */
  readonly tilt: number;
}

export interface IndependentRecord {
  /** The party they caucus with, or null for a truly independent member. */
  readonly caucus: string | null;
  readonly caucusSource: "roster" | "own views";
  /** Why they're independent, read from their views. */
  readonly reason:
    | "between the parties"
    | "further out than their side's party"
    | "breaks with their side's party on their own issues";
  /** The questions behind that reason (their own issues that break with the party). */
  readonly reasonQuestions: readonly string[];
  readonly formerParty?: string;
}

export interface OfficialDraw {
  /** Their own left-right position, on the first-dimension scale. */
  readonly ideal: number;
  readonly wing: string;
  readonly signature: readonly SignatureIssue[];
  readonly traits: Readonly<Record<string, number>>;
  /** How strongly party pressure moves them (1 typical). */
  readonly loyalty: number;
  /** How much they want a higher office or to keep this one (0 none). */
  readonly ambition: number;
  readonly independent: IndependentRecord | null;
}

/**
 * Draw who an official is. `districtZ` is how far their district leans
 * their party's way against the party's other seats, in standard deviations
 * (0 where it isn't read).
 */
export function drawOfficial(input: {
  readonly seed: string;
  readonly key: string;
  readonly body: BodyKind;
  readonly party: string | null;
  readonly districtZ: number;
  readonly districtLean: number;
  readonly leader: boolean;
  /** The roster's caucus record for an independent, where it has one. */
  readonly caucus?: { caucus: string; formerParty?: string };
}): OfficialDraw {
  const data = OFFICIALS_DATA;
  const at = (what: string) => `${input.seed}:official:${input.key}:${what}`;
  const party = partyKey(input.party);
  const pull = data.ideology.districtPull.value;
  const z =
    pull * Math.max(-3, Math.min(3, input.districtZ)) +
    Math.sqrt(1 - pull * pull) * seededNormal(at("ideal"));
  // An independent's side is their seat's: the caucus they keep, or the way
  // their district leans.
  // An independent who caucuses with a party sits within its range (each of
  // the 119th Congress's independents does, Voteview); one who caucuses with
  // no one sits where their seat leans.
  const caucusKey = input.caucus ? partyKey(input.caucus.caucus) : null;
  const spread =
    caucusKey && caucusKey !== "other"
      ? partySpread(caucusKey, input.body)
      : party === "other"
        ? {
            ...partySpread("other", input.body),
            mean:
              partySpread("other", input.body).mean +
              input.districtLean * partySpread("other", input.body).sd,
          }
        : partySpread(party, input.body);
  const ideal = Math.max(-1, Math.min(1, spread.mean + spread.sd * z));
  const within = (ideal - spread.mean) / spread.sd;
  const names = data.wings.names[party];
  const wing =
    within < -data.wings.cut
      ? names[0]!
      : within > data.wings.cut
        ? names[2]!
        : names[1]!;
  // Their own causes: the questions their seed ranks first.
  const signature = [...PLATFORM_QUESTIONS]
    .map((question) => ({ question, rank: uniform(at(`issue:${question}`)) }))
    .sort((a, b) => a.rank - b.rank || a.question.localeCompare(b.question))
    .slice(0, data.signatureIssues.count.value)
    .map(({ question }) => ({
      question,
      tilt:
        data.signatureIssues.tiltSd.value *
        seededNormal(at(`tilt:${question}`)),
    }));
  const traits: Record<string, number> = {};
  for (const [key, row] of Object.entries(data.traits.keys))
    traits[key] = Math.max(
      -1,
      Math.min(1, row.mean + row.sd * seededNormal(at(`trait:${key}`))),
    );
  const l = data.loyalty;
  const loyalty = Math.max(
    l.floor,
    1 +
      l.perDutyBound * traits["personality-v1:facet-duty-bound"]! +
      l.perGenerous * traits["personality-v1:facet-generous"]! +
      l.perConflict * traits["people-mind-v1:conflict"]! +
      l.perRisk * traits["people-mind-v1:risk"]! +
      (input.leader ? l.leadership : 0),
  );
  const a = data.ambitionTraits;
  const ambition = Math.max(
    0,
    a.perEnterprising * traits["personality-v1:facet-enterprising"]! +
      a.perRisk * traits["people-mind-v1:risk"]!,
  );
  return {
    ideal,
    wing,
    signature,
    traits,
    loyalty,
    ambition,
    independent:
      party === "other"
        ? independentRecord(input.body, ideal, signature, input.caucus)
        : null,
  };
}

/**
 * How strongly someone at a lean supports a question's "yes": their lean
 * along the question's left-right axis plus how popular the policy is (the
 * same reading voters deciding a measure use, `publicSupport`), so a policy
 * most people favor draws members of both parties.
 */
export function supportAt(lean: number, question: string): number {
  return personStance(lean, question) + publicOffset(question);
}

const adopted = (
  axesJson as unknown as {
    axes: Record<string, { axis: number; yesShare: number }>;
  }
).axes;

/**
 * How strongly a member at a lean supports a question's "yes": their lean
 * along the question's axis plus how widely legislatures have already made
 * it law (the share of states with it, `issue-axes-2026.json`), the elite
 * consensus members answer to, where voters answer to the polls
 * (`supportAt`). A budget line has no such record and reads by lean alone.
 */
export function memberSupportAt(lean: number, question: string): number {
  const row = adopted[question];
  return (
    personStance(lean, question) +
    (row ? Math.abs(row.axis) * (2 * row.yesShare - 1) : 0)
  );
}

/** A member's own stance on a question: their position, and their own tilt if it's one of their causes. */
export function ownStance(
  ideal: number,
  signature: readonly SignatureIssue[],
  question: string,
): number {
  const tilt = signature.find((s) => s.question === question)?.tilt ?? 0;
  // On the voters' scale, no further out than the electorate's own ends.
  const lean = Math.max(
    -1,
    Math.min(1, (ideal + tilt) * OFFICIALS_DATA.ideology.leanScale.value),
  );
  return memberSupportAt(lean, question);
}

/**
 * Whom an independent caucuses with and why they're independent, read from
 * their own views: the roster's caucus where it records one; otherwise the
 * party closest to them, unless they sit between the parties.
 */
export function independentRecord(
  body: BodyKind,
  ideal: number,
  signature: readonly SignatureIssue[],
  roster?: { caucus: string; formerParty?: string },
): IndependentRecord {
  const left = partySpread("democratic", body);
  const right = partySpread("republican", body);
  const mid = (left.mean + right.mean) / 2;
  const band =
    OFFICIALS_DATA.independents.betweenBand.value * (right.mean - left.mean);
  const between = Math.abs(ideal - mid) <= band;
  const nearest = ideal < mid ? left : right;
  const nearestName = ideal < mid ? "Democratic" : "Republican";
  // Their own issues that pull against the nearest party's direction.
  const breaks = signature
    .filter((s) => Math.sign(s.tilt) === -Math.sign(nearest.mean))
    .map((s) => s.question);
  const reason: IndependentRecord["reason"] = between
    ? "between the parties"
    : Math.abs(ideal) > Math.abs(nearest.mean) + nearest.sd
      ? "further out than their side's party"
      : "breaks with their side's party on their own issues";
  return {
    caucus: roster ? roster.caucus : between ? null : nearestName,
    caucusSource: roster ? "roster" : "own views",
    reason,
    reasonQuestions:
      reason === "breaks with their side's party on their own issues"
        ? breaks
        : signature.map((s) => s.question),
    ...(roster?.formerParty ? { formerParty: roster.formerParty } : {}),
  };
}
