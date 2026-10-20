/**
 * What a person says at each venue, in the register of that venue (owner,
 * Oct 15, 2026: a floor speech that sounds like a floor speech and a
 * concession like a concession). Each venue is one of the mined registers in
 * `address-registers.ts` (house, senate and state floor, public comment, a
 * campaign stop, victory and concession); this chooses the register from the
 * venue and the speaker's position, fills the slots from the speaker's own
 * records, and composes it through the English engine's `composeAddress`.
 *
 * A venue the record cannot fill (a public comment with no one to name) is
 * not spoken: the result is null, never a guess. Every sentence cites the records
 * it was filled from, so the speech can say why it said what it said.
 */
import { composeTurn, ADDRESS_REGISTERS } from "./address-registers";
import type {
  GroundedEnglishFact,
  GroundedEnglishPacket,
} from "./grounded-english";
import { questionAbout, questionTo } from "./question-names";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { EntityId } from "../core2/kernel/brands";
import type { CoreAPI } from "../core2/types";
import { spoken } from "../director/words";

export const ADDRESS_VENUES = [
  "house-floor",
  "senate-floor",
  "state-floor",
  "public-comment",
  "campaign",
  "victory",
  "concession",
] as const;
export type AddressVenue = (typeof ADDRESS_VENUES)[number];

export interface VenueSpeechInput {
  readonly speakerId: string;
  readonly venue: AddressVenue;
  /** The measure's policy question, where the venue is about one. */
  readonly question?: string;
  /** The speaker's position on it in [-1, 1]; below zero is against. */
  readonly position?: number;
  /** The record that gives the position (a vote, a promise, a stand). */
  readonly recordIds?: readonly string[];
  /** The other candidate, for a contrast, a victory or a concession. */
  readonly opponentId?: string;
  /** Whose gavel it is, for the floor's "Mr. Speaker" or "Madam Speaker". */
  readonly chair?: "male" | "female";
}

export interface VenueSpeech {
  readonly venue: AddressVenue;
  /** The mined register it was composed from. */
  readonly register: string;
  readonly text: string;
  readonly moves: readonly string[];
  readonly sourceRecordIds: readonly string[];
}

/** The mined register a venue is composed from, given the speaker's position. */
export function registerForVenue(
  venue: AddressVenue,
  position: number | undefined,
): string {
  if (venue === "house-floor")
    return (position ?? 0) >= 0 ? "house-support" : "house-oppose";
  return venue;
}

const nameOf = (api: CoreAPI, personId: string): string | null => {
  const person = api.state.people.get(personId as never);
  return person ? `${person.givenName} ${person.familyName}` : null;
};

export function wordVenueSpeech(
  api: CoreAPI,
  input: VenueSpeechInput,
): VenueSpeech | null {
  const person = api.state.people.get(input.speakerId as never);
  if (!person) return null;
  const register = registerForVenue(input.venue, input.position);
  if (!ADDRESS_REGISTERS[register]) return null;
  const own = [input.speakerId as EntityId];
  const rest = (input.recordIds ?? []) as EntityId[];
  const facts: Record<string, GroundedEnglishFact> = {
    name: {
      text: `${person.givenName} ${person.familyName}`,
      // The speaker, and the record the speech is given on (a vote, a count).
      sourceRecordIds: [...own, ...rest],
    },
  };
  const place = corePlaceByJurisdictionId(person.placeId as never);
  if (place)
    facts.place = {
      text: spoken(place),
      sourceRecordIds: [person.placeId as EntityId],
    };
  if (input.question) {
    const cited = rest.length ? rest : own;
    const about = questionAbout(input.question);
    if (about) {
      facts.bill = { text: about, sourceRecordIds: cited };
      facts.issue = { text: about, sourceRecordIds: cited };
    }
    const goal = questionTo(input.question);
    if (goal && (input.position ?? 0) >= 0)
      facts.goal = { text: goal, sourceRecordIds: cited };
  }
  if (input.opponentId) {
    const opponent = nameOf(api, input.opponentId);
    if (opponent)
      facts.opponent = {
        text: opponent,
        sourceRecordIds: [input.opponentId as EntityId],
      };
  }
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `${input.venue}:${input.speakerId}:${api.state.date}:${input.question ?? ""}`,
    worldSeed: api.state.seed,
    bankVersion: "words-address-v1",
    stage: input.chair === "female" ? "chair-female" : "chair-male",
    sourceRecordIds: own,
    facts,
    speaker: { personId: input.speakerId as never, traits: {} },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: input.speakerId as never,
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  };
  const turn = composeTurn(packet, register);
  if (!turn) return null;
  return {
    venue: input.venue,
    register,
    text: turn.text,
    moves: turn.moves,
    sourceRecordIds: turn.sourceRecordIds,
  };
}
