/**
 * What a bribe's lines may lean on beyond the favor it asks (Story lead,
 * Nov 17, the bribe rewrite). Each fact is read from the one record that
 * holds it and set only where that record holds it (an effect is a read, not
 * a record), so a line that needs it plays only where it is true:
 *
 * - `bribe-weight`: the envelope against what the player's household spends
 *   to live, in words and never a figure (data/bribe-weights.json), from the
 *   corruption engine's crime record.
 * - `bidders`: the contract the bribe asks for had other bids, from the
 *   contract's award record.
 * - `reported`: the player has already said they would report an offer or
 *   reported one to the press, from the scene replies and the scandal record
 *   the engine wrote.
 * - `your-side`, `stand-with` and `stand-apart`: which side of the bill's
 *   question the player's own recorded view puts them on, and whether that is
 *   the offerer's side, from the views engine; set only for a vote the player
 *   holds a view on.
 */
import { awardsOn } from "../core2/modules/budgets";
import { townLean } from "../core2/modules/campaigns";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  provisionStance,
} from "../core2/modules/legislature";
import { SCANDAL_REPORTED, crimeRecord } from "../core2/modules/justice";
import { VIEWS_MODULE_ID, viewOf, viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId, PersonState } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import weightsFile from "./data/bribe-weights.json" with { type: "json" };

/** The situation types that read these facts. */
export const BRIBE_TYPES: readonly string[] = ["bribe-offer", "bribe-pressed"];

/** The scene reply endings by which the player said they would report a bribe. */
const SAID_REPORT = new Set(["reported", "said-you-would-report"]);

const WEIGHTS = (
  weightsFile as unknown as {
    rows: readonly { upToDays?: number; said: string }[];
  }
).rows;

/** The envelope as people say it against a household's days of living costs. */
export function weightSaid(days: number): string {
  return (
    WEIGHTS.find((row) => row.upToDays === undefined || days <= row.upToDays) ??
    WEIGHTS[WEIGHTS.length - P.one]!
  ).said;
}

/** What a bribe's reads are read against. */
export interface BribeReadsInput {
  /** The offer's (or the press's) cause record. */
  readonly causeId: string;
  /** The day of the cause record. */
  readonly date: string;
  /** The corruption engine's crime record the cause names. */
  readonly bribeId?: string;
  /** The bill a vote was asked on, or the contract's award id. */
  readonly billId?: string;
  readonly contractId?: string;
  /** The player: the seat the bribe was offered to. */
  readonly playerId: PersonId;
  /** How far left or right a person leans (the campaign views' `personLean`). */
  readonly leanOf: (
    people: CoreState["people"],
    person: Readonly<PersonState>,
    townLean: number,
  ) => number;
}

export function bribeReads(
  core: Readonly<CoreState>,
  input: BribeReadsInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const api = coreAPI(core as CoreState);
  const { causeId, playerId } = input;
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const crime = input.bribeId ? crimeRecord(api, input.bribeId) : undefined;
  // The envelope against what the household spends to live.
  const player = core.people.get(playerId);
  if (crime && player) {
    const household = core.households.get(player.householdId);
    const daily = Math.max(
      player.livingCostDailyMinor,
      (household?.memberIds ?? []).reduce(
        (total, id) =>
          total + (core.people.get(id)?.livingCostDailyMinor ?? P.zero),
        P.zero,
      ),
    );
    if (daily > P.zero && crime.amountMinor > P.zero)
      facts["bribe-weight"] = fact(weightSaid(crime.amountMinor / daily), [
        causeId,
        crime.id,
      ]);
  }
  // Other bids on the contract the bribe asks for.
  if (crime && input.contractId) {
    const award = awardsOn(api, crime.date).find(
      (row) => row.id === input.contractId,
    );
    if (award && award.bids.length > P.one)
      facts.bidders = fact("yes", [causeId, award.id]);
  }
  // A bribe the player has already said they would report.
  const earlier: string[] = [];
  for (const id of core.logByKind.get(SCANDAL_REPORTED) ?? []) {
    const event = core.durableLog.get(id);
    if (
      event &&
      event.date < input.date &&
      event.facts?.attempt === "yes" &&
      (event.witnessIds ?? []).includes(playerId)
    )
      earlier.push(event.id);
  }
  for (const id of core.logByKind.get("scene.reply") ?? []) {
    const event = core.durableLog.get(id);
    if (
      event &&
      event.date < input.date &&
      BRIBE_TYPES.includes(event.facts?.typeKey ?? "") &&
      SAID_REPORT.has(event.facts?.ending ?? "") &&
      event.personIds[P.zero] === playerId
    )
      earlier.push(event.id);
  }
  if (earlier.length) facts.reported = fact("yes", [causeId, ...earlier]);
  // The player's own side of the bill's question, against the offerer's.
  const bill =
    input.billId && core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(api, input.billId)
      : undefined;
  const provision = bill?.provisions[P.zero];
  const stance = provision ? provisionStance(api, provision) : null;
  const offerer = crime ? core.people.get(crime.offererId) : undefined;
  if (!bill || !stance || !offerer || !core.modules.has(VIEWS_MODULE_ID))
    return facts;
  const yours = viewOf(api, playerId);
  if (!yours) return facts;
  const theirs =
    viewOn(
      api,
      offerer.id,
      stance.question,
      input.leanOf(core.people, offerer, townLean(api)),
    ) * stance.position;
  const own =
    viewOn(api, playerId, stance.question, yours.lean) * stance.position;
  if (theirs === P.zero || own === P.zero) return facts;
  const ids = [causeId, bill.id, playerId, stance.question];
  facts["your-side"] = fact(own > P.zero ? "for" : "against", ids);
  facts[theirs > P.zero === own > P.zero ? "stand-with" : "stand-apart"] = fact(
    "yes",
    ids,
  );
  return facts;
}
