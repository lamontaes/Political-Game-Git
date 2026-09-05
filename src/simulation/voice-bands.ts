/**
 * How old the person in the scene is, and what that means for the words.
 *
 * The human playtest started a ten-year-old and was handed, in order: a
 * midnight conversation about the household bills, an option reading "Say
 * you'll deal with the furnace", a colleague's misuse of a trip fund, a
 * professional reference to co-sign, and then a scene asking whether to report
 * their own guardian to somebody older. Every one of those is a competent
 * sentence. None of them is a thing a ten-year-old is in a position to do.
 *
 * The failure was not vocabulary. A child can follow the sentence "the furnace
 * is worse than she told you" perfectly well. What they cannot do is own the
 * furnace. So this file is about **standing and agency first**, and register
 * second.
 *
 * ## The bands
 *
 * Three, matched to what a life actually looks like from inside rather than to
 * a legal threshold. The boundaries are soft on purpose — a thirteen-year-old
 * and a twelve-year-old are not different species — and the bands exist to
 * stop a whole class of error, not to sort every sentence perfectly.
 *
 * **Middle childhood, roughly 8–12.** The character lives in somebody else's
 * household under somebody else's authority. They notice everything and decide
 * very little. What they *can* do is real and worth writing: ask, tell, hide,
 * help, wait, join in, refuse, promise, lie, stick up for somebody, follow
 * somebody, walk off. What they cannot do is settle a bill, employ anybody,
 * carry an institution's decision, or speak for the household to the outside
 * world. A scene where an adult problem is happening near them and they have
 * to decide what to do about *their* part of it is the correct shape.
 *
 * **Adolescence, roughly 13–17.** Still under authority, and now with money
 * they earned, somewhere to be that nobody drove them to, and other people's
 * opinions of them mattering enormously. The characteristic decision is
 * between two loyalties, or between what they want and what they can get away
 * with. They can hold a job, be somewhere they were not supposed to be, and be
 * asked for an opinion by an adult who then ignores it.
 *
 * **Adult, 18 and over.** Answers for themselves. Everything the game already
 * wrote.
 *
 * ## What this is not
 *
 * Not a reading-level filter. The narrator may be more articulate than the
 * child it is describing, and a good line about a nine-year-old can use a word
 * a nine-year-old would not. What the narrator may not do is give the child an
 * adult's job, an adult's institutional standing, or an adult's way of
 * explaining their own feelings back to themselves.
 *
 * Not a euphemism filter either. Children encounter money trouble, drinking,
 * absence, and people lying to them. Writing them out is its own falseness.
 */

export type LifeVoiceBand = "middle-childhood" | "adolescence" | "adult";

export const LIFE_VOICE_BANDS: readonly LifeVoiceBand[] = [
  "middle-childhood",
  "adolescence",
  "adult",
];

/** Where each band starts. Below the first one the game has no content at all. */
export const MIDDLE_CHILDHOOD_FLOOR_AGE = 8;
export const ADOLESCENCE_FLOOR_AGE = 13;
export const ADULT_FLOOR_AGE = 18;

/**
 * The band an age falls in.
 *
 * Ages under the middle-childhood floor return `middle-childhood` rather than
 * a fourth band: the game's minimum start age is five, there is no authored
 * content written for a five-year-old, and inventing a band with nothing in it
 * would report coverage the bank does not have.
 */
export function lifeVoiceBandForAge(age: number): LifeVoiceBand {
  if (age >= ADULT_FLOOR_AGE) return "adult";
  if (age >= ADOLESCENCE_FLOOR_AGE) return "adolescence";
  return "middle-childhood";
}

/** True when a piece of content written for `band` may be shown at `age`. */
export function bandAdmitsAge(band: LifeVoiceBand, age: number): boolean {
  return lifeVoiceBandForAge(age) === band;
}

export const LIFE_VOICE_BAND_LABELS: Readonly<Record<LifeVoiceBand, string>> = {
  "middle-childhood": "a child of about eight to twelve",
  adolescence: "somebody between thirteen and seventeen",
  adult: "an adult",
};

/**
 * Constructions that must not appear in authored copy, and what to do instead.
 *
 * Every entry on this list was found in shipped copy, most of them by the
 * human playtest and the rest by reading the bank against them afterwards.
 * That is the bar for being on the list: a guard aimed at a defect nobody
 * committed is decoration, and a guard broad enough to catch good prose is
 * worse than none.
 *
 * The patterns are deliberately narrow. `\bthe thing with\b` fires on "the
 * thing with the furnace" and leaves "the thing she said" alone, because the
 * defect is the evasion of a concrete noun, not the word "thing".
 */
export interface BannedConstruction {
  readonly pattern: RegExp;
  readonly instead: string;
  /** Where it was found, so the guard can prove it was aimed at something. */
  readonly foundIn: string;
}

export const BANNED_CONSTRUCTIONS: readonly BannedConstruction[] = [
  {
    pattern: /\bwhich is its own kind of\b/i,
    instead: "say what actually happened, or nothing",
    foundIn: "episode-bank: home.someone-is-not-all-right/noticing",
  },
  {
    pattern: /\bstops being only yours to carry\b/i,
    instead: "say who else would know, and what they would do",
    foundIn: "episode-bank: the 'tell someone older' option description",
  },
  {
    pattern: /\bthe thing with the\b/i,
    instead: "name it — the furnace, the rent, the car",
    foundIn: "setup-opening-bank: kitchen_late",
  },
  {
    pattern: /\bcover the gap\b|\bthe gap\b(?! year)/i,
    instead: "say the amount, or what is missing",
    foundIn: "setup-opening-bank: marcus_and_the_trip_fund",
  },
  {
    pattern: /\bin its own way\b/i,
    instead: "cut it; it is a hedge, not a fact",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\bsomething shifted\b|\bsomething had shifted\b/i,
    instead: "say what shifted",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\bthe weight of\b/i,
    instead: "say the thing, not its weight",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\bnot lost on (you|them|her|him)\b/i,
    instead: "say what they noticed",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\ba (quiet|small) kind of\b/i,
    instead: "cut the qualifier",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\bspeaks volumes\b|\bsays everything\b/i,
    instead: "report what was said or done",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\bcarries its own\b/i,
    instead: "say what follows from it",
    foundIn: "reviewed across the bank",
  },
];

/**
 * Words and phrases a middle-childhood scene must not put in the child's hands.
 *
 * These are about *standing*, which is why "mortgage" is here and "money" is
 * not. A child can hear any of these words; the guard fires on a child being
 * the one who acts on them, which is why it is applied to option labels and
 * descriptions — the things the player is choosing to *do* — rather than to
 * narration.
 */
export const ADULT_ONLY_AGENCY: readonly BannedConstruction[] = [
  {
    pattern:
      /\b(I'?ll |you'?ll )?(deal with|sort out|handle) the (furnace|boiler|roof|rent|mortgage|bills?)\b/i,
    instead: "a child can worry about it, ask about it, or keep out of it",
    foundIn: "setup-opening-bank: kitchen_late, option say-youll-sort-it",
  },
  {
    pattern:
      /\bcover (the|it|his|her|their) (gap|shortfall|difference|rent|costs?)\b/i,
    instead: "a child does not have the money to cover anybody",
    foundIn: "setup-opening-bank: marcus_and_the_trip_fund, option lend-him",
  },
  {
    pattern:
      /\b(sign|co-?sign|put your name to) (a |the )?(reference|application|contract|lease|petition)\b/i,
    instead: "a child's name is not wanted on a document",
    foundIn: "setup-opening-bank: priya_reference",
  },
  {
    pattern: /\bhire|\bfire (him|her|them|somebody)\b|\blay off\b/i,
    instead: "a child employs nobody",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\b(file|lodge) (a |an )?(complaint|grievance|report) with\b/i,
    instead: "a child tells a person, not an institution",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\byour (employee|staff|tenant|client|constituent)s?\b/i,
    instead: "a child has none of these",
    foundIn: "reviewed across the bank",
  },
  {
    pattern: /\btake (the|a) shift\b|\bcover (the|his|her|their) shift\b/i,
    instead: "reserved for a character old enough to hold the job",
    foundIn: "setup-opening-bank: curtis_shift",
  },
];
