import type { GenderIdentityKey } from "../simulation/types";

/**
 * Where a line is spoken, and what that setting allows.
 *
 * A House member does not talk on the floor the way they talk at the kitchen
 * table. A register names the setting; its card says who is addressed and how,
 * which rhetorical devices the setting admits, and what real talk in that
 * setting measured like. The engine uses the first two to choose parts. The
 * measured figures are never dice: they are checks a watched world's totals
 * should land near, because each speaker's own choices add up to them
 * (Lamontae, September 28, 2026: "no fixed percentages for behavior").
 *
 * The cards are Research 2's (Drive, "07 RESEARCH FOR CTO REVIEW, Sept 28 —
 * Research 2 · Speech and Dialogue Corpus", 9:50 p.m. consolidated), approved
 * as design D-3. Only formulas from public-domain government sources (the
 * Congressional Record, federal hearings, White House briefings) are written
 * here word for word; the other corpora supply counts only.
 */
export const SPEECH_REGISTERS = [
  "house-one-minute",
  "house-debate",
  "senate-floor",
  "committee-questioning",
  "state-floor",
  "council-comment",
  "press-briefing",
  "town-hall",
  "rally",
  "election-night",
  "eulogy",
  "small-talk",
  "family",
] as const;

export type SpeechRegister = (typeof SPEECH_REGISTERS)[number];

/**
 * How public a setting is. Only a public address (one speaker, an audience)
 * admits the crafted devices; an exchange in public is still turn by turn,
 * and a private room is ordinary talk.
 */
export type RegisterSetting = "public-address" | "public-exchange" | "private";

/** The crafted moves a speech can make beyond saying its business. */
export const SPEECH_DEVICES = [
  "contrast",
  "three-part-list",
  "disclosure",
  "quotation",
  "callback",
] as const;

export type SpeechDevice = (typeof SPEECH_DEVICES)[number];

/**
 * A figure from the counted corpus. `basis` says whether it was measured or
 * set by hand, and `source` says from what; the game never draws against it.
 */
export interface RegisterCheck {
  readonly key: string;
  readonly label: string;
  /** A share from 0 to 1, or a count of words for a median. */
  readonly value: number;
  readonly unit: "share" | "words";
  /**
   * `measured` where the corpus is the setting itself; `estimated-from-average`
   * where one sample stands in for every place of that kind (one state's
   * journal for every state's floor), per the one-rule-for-every-place ruling.
   */
  readonly basis: "measured" | "estimated-from-average";
  readonly source: string;
  /**
   * How much the share varies from one hearing, day or meeting to the next,
   * where Research 2 measured it (10:50 p.m. update): one standard deviation
   * and the range to check against. Where the deviation exceeds the average,
   * check the range, not the band.
   */
  readonly spread?: {
    readonly deviation: number;
    readonly low: number;
    readonly high: number;
    readonly range: "middle-80-percent" | "lowest-to-highest";
    readonly units: string;
  };
}

export interface RegisterCard {
  readonly register: SpeechRegister;
  readonly setting: RegisterSetting;
  readonly devices: readonly SpeechDevice[];
  /**
   * Whether a speaker may swear here at all. Where it is allowed, whether they
   * do is theirs (Lamontae, September 28, 2026: by personality).
   */
  readonly swearing: "never" | "by-personality";
  readonly checks: readonly RegisterCheck[];
}

const RECORD_2025 =
  "Congressional Record, 2025 daily edition, 28 sitting days (govinfo.gov), counted by Research 2";
const HEARINGS_2025 =
  "66 House and Senate hearings, 2025 (govinfo.gov), 956 questioning turns, counted by Research 2";
const PA_2025 =
  "Pennsylvania Legislative Journal, 10 sitting days of 2025, 147 member turns, counted by Research 2 (patterns only)";
const MEETINGBANK =
  "MeetingBank council meetings, 287 public-comment turns, counted by Research 2 (patterns only)";
const BRIEFINGS =
  "19 White House briefings and gaggles, late 2024 to January 2025, counted by Research 2";
const SANTA_BARBARA =
  "Santa Barbara Corpus of Spoken American English, counted by Research 2 (patterns only)";

const PUBLIC_ADDRESS_DEVICES = SPEECH_DEVICES;

export const REGISTER_CARDS: Readonly<Record<SpeechRegister, RegisterCard>> = {
  "house-one-minute": {
    register: "house-one-minute",
    setting: "public-address",
    devices: PUBLIC_ADDRESS_DEVICES,
    swearing: "never",
    checks: [
      check("addresses-chair", "Open by addressing the chair", 295 / 298),
      check("tribute", "Tributes", 0.58, {
        deviation: 0.1,
        low: 0.4,
        high: 0.75,
        range: "lowest-to-highest",
        units: "10 sitting days with eight or more speeches",
      }),
      check("mixed", "Tribute with a party jab", 0.11),
      check("argument", "Arguments", 0.31),
      check("has-figure", "Include a figure, date or year", 0.73),
      check("explicit-ask", "Make an explicit ask", 0.21),
      words("median-words", "Median length", 180),
    ].map((row) => ({ ...row, source: RECORD_2025 })),
  },
  "house-debate": {
    register: "house-debate",
    setting: "public-exchange",
    devices: ["contrast", "quotation"],
    swearing: "never",
    checks: [],
  },
  "senate-floor": {
    register: "senate-floor",
    setting: "public-address",
    devices: PUBLIC_ADDRESS_DEVICES,
    swearing: "never",
    checks: [
      check("addresses-chair", "Open by addressing the chair", 0.86),
      check("names-party", "Name a party, administration or leader", 0.67, {
        deviation: 0.12,
        low: 0.38,
        high: 0.8,
        range: "lowest-to-highest",
        units: "18 sitting days with ten or more long turns",
      }),
      check("answers-senator", "Answer another senator", 0.28),
      check("yields-floor", 'End "I yield the floor"', 0.34),
      check("long", "Run 1,500 words or more", 0.13),
      check("five-seniors", "Speeches by five senior senators", 0.31),
      words("median-words", "Median length", 695),
    ].map((row) => ({ ...row, source: RECORD_2025 })),
  },
  "committee-questioning": {
    register: "committee-questioning",
    setting: "public-exchange",
    devices: [],
    swearing: "never",
    checks: [
      check("opens-thanks", "Open with thanks", 0.73, hearing(0.16, 0.5, 0.91)),
      check("yes-or-no", 'Ask "yes or no"', 0.06, hearing(0.08, 0, 0.16)),
      check("cuts-off", "Cut a witness off", 0.05, hearing(0.05, 0, 0.11)),
      check(
        "names-party",
        "Name a party or the administration",
        0.33,
        hearing(0.21, 0.07, 0.63),
      ),
      check("mentions-home", "Mention home", 0.2),
      check("yields-back", 'End "I yield back"', 0.47),
      check("witness-hedges", "Witness hedges", 609 / 956),
      words("median-words", "Median questioning turn", 482),
    ].map((row) => ({ ...row, source: HEARINGS_2025 })),
  },
  "state-floor": {
    register: "state-floor",
    setting: "public-address",
    devices: PUBLIC_ADDRESS_DEVICES,
    swearing: "never",
    checks: [
      check(
        "thanks-chair",
        "Open by thanking the chair",
        120 / 147,
        day(0.08, 0.71, 0.93),
      ),
      check("ends-thanks", 'End "Thank you"', 90 / 147),
      check(
        "names-home",
        "Name a county or district",
        30 / 147,
        day(0.11, 0.05, 0.38),
      ),
      check("asks-vote", "Ask for a yes or no vote", 17 / 147),
      words("median-words", "Median length", 189),
      // One card for every state's floor: a single state's journal stands in
      // for all of them, so every figure is an estimate from that average.
    ].map((row) => ({
      ...row,
      basis: "estimated-from-average" as const,
      source: PA_2025,
    })),
  },
  "council-comment": {
    register: "council-comment",
    setting: "public-address",
    devices: ["disclosure", "contrast"],
    swearing: "never",
    checks: [
      check("gives-name", "Give a name", 1),
      check("greets-body", "Greet the body first", 0.8),
      check("gives-place", "Give district, neighborhood or tenure", 0.75),
      check("ends-ask", "End on an ask", 0.6),
      check("angry", "Show anger", 1 / 12, meeting(0.09, 0, 0.25)),
      check("supports", "Speak in support", 0.31, meeting(0.22, 0, 0.62)),
      words("median-words", "Median length", 410),
    ].map((row) => ({ ...row, source: MEETINGBANK })),
  },
  "press-briefing": {
    register: "press-briefing",
    setting: "public-exchange",
    devices: [],
    swearing: "never",
    checks: [
      check("evades", "Substantive answers using a set evasion", 173 / 731, {
        deviation: 0.11,
        low: 0.09,
        high: 0.5,
        range: "lowest-to-highest",
        units: "18 briefings",
      }),
      words("median-question", "Median question", 14),
      words("median-answer", "Median answer turn", 17),
    ].map((row) => ({ ...row, source: BRIEFINGS })),
  },
  "town-hall": {
    register: "town-hall",
    setting: "public-exchange",
    devices: ["disclosure"],
    swearing: "never",
    checks: [],
  },
  rally: {
    register: "rally",
    setting: "public-address",
    devices: PUBLIC_ADDRESS_DEVICES,
    swearing: "never",
    checks: [],
  },
  "election-night": {
    register: "election-night",
    setting: "public-address",
    devices: PUBLIC_ADDRESS_DEVICES,
    swearing: "never",
    checks: [],
  },
  eulogy: {
    register: "eulogy",
    setting: "public-address",
    devices: ["disclosure", "quotation"],
    swearing: "never",
    checks: [],
  },
  "small-talk": {
    register: "small-talk",
    setting: "private",
    devices: [],
    swearing: "by-personality",
    checks: [
      check("short-turns", "Turns of three words or fewer", 0.45),
      words("median-words", "Median turn", 4),
    ].map((row) => ({ ...row, source: SANTA_BARBARA })),
  },
  family: {
    register: "family",
    setting: "private",
    devices: [],
    swearing: "by-personality",
    checks: [
      check("short-turns", "Turns of three words or fewer", 0.48),
      words("median-words", "Median turn", 4),
    ].map((row) => ({ ...row, source: SANTA_BARBARA })),
  },
};

function check(
  key: string,
  label: string,
  value: number,
  spread?: RegisterCheck["spread"],
) {
  return {
    key,
    label,
    value,
    unit: "share" as const,
    basis: "measured" as RegisterCheck["basis"],
    ...(spread ? { spread } : {}),
  };
}

function hearing(deviation: number, low: number, high: number) {
  return {
    deviation,
    low,
    high,
    range: "middle-80-percent" as const,
    units: "59 hearings with five or more questioning turns",
  };
}

function meeting(deviation: number, low: number, high: number) {
  return {
    deviation,
    low,
    high,
    range: "lowest-to-highest" as const,
    units: "11 meetings with eight or more speakers",
  };
}

function day(deviation: number, low: number, high: number) {
  return {
    deviation,
    low,
    high,
    range: "lowest-to-highest" as const,
    units:
      "6 Pennsylvania House days with eight or more turns of 40 words or more",
  };
}

function words(key: string, label: string, value: number) {
  return {
    key,
    label,
    value,
    unit: "words" as const,
    basis: "measured" as RegisterCheck["basis"],
  };
}

export function registerAllows(
  register: SpeechRegister,
  device: SpeechDevice,
): boolean {
  return REGISTER_CARDS[register].devices.includes(device);
}

/**
 * The person a form of address points at: their recorded gender (never
 * guessed; `unstated` is a real value) and, for a colleague, where they are
 * from as the room says it — a state in Congress, a county in a state house.
 */
export interface AddressedPerson {
  readonly gender: GenderIdentityKey | null;
  readonly fromLabel?: string;
}

export type AddressRole = "chair" | "colleague";

/**
 * How the room addresses the chair or refers to a colleague, from the
 * register, the role and the jurisdiction's own label.
 *
 * Formulas are the Congressional Record's ("Mr. Speaker," "Madam President,"
 * "the gentlewoman from Texas," "the Senator from Maine"). "Mr." and "Madam"
 * need a recorded gender; with none the chair form is refused rather than
 * guessed, and a colleague is named by office ("the Representative from
 * Ohio"), which the Record also uses. Returns null where the register has no
 * such form.
 */
export function formOfAddress(
  register: SpeechRegister,
  role: AddressRole,
  person: AddressedPerson,
): string | null {
  const male = person.gender === "male";
  const female = person.gender === "female";
  if (role === "chair") {
    const title =
      register === "house-one-minute" ||
      register === "house-debate" ||
      register === "state-floor"
        ? "Speaker"
        : register === "senate-floor"
          ? "President"
          : register === "committee-questioning"
            ? "Chair"
            : null;
    if (!title) return null;
    if (title === "Chair")
      return male ? "Mr. Chairman" : female ? "Madam Chair" : null;
    return male ? `Mr. ${title}` : female ? `Madam ${title}` : null;
  }
  if (!person.fromLabel) return null;
  switch (register) {
    case "house-one-minute":
    case "house-debate":
      return male
        ? `the gentleman from ${person.fromLabel}`
        : female
          ? `the gentlewoman from ${person.fromLabel}`
          : `the Representative from ${person.fromLabel}`;
    case "senate-floor":
      return `the Senator from ${person.fromLabel}`;
    case "state-floor":
      return male
        ? `the gentleman from ${person.fromLabel}`
        : female
          ? `the gentlelady from ${person.fromLabel}`
          : `the Member from ${person.fromLabel}`;
    default:
      return null;
  }
}
