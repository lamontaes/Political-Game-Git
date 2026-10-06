/**
 * The words of the oath of office, phrase by phrase, and what the officeholder
 * swears on.
 *
 * Only the federal minimum is sourced: 4 U.S.C. 101 requires every member of a
 * state legislature and every executive and judicial officer of a state to
 * take an oath "to support the Constitution of the United States". Each state
 * adds its own words. Until every state's text is coded, the phrases after the
 * federal minimum are ESTIMATED FROM SIMILAR PLACES: California Constitution
 * article XX, section 3 and Texas Constitution article XVI, section 1. Both
 * recorded oaths support their constitutions and faithfully discharge the
 * office's duties. The shared phrases must not be read as any one state's
 * exact oath.
 */

/** Sourced text, or the marked estimate standing in for a state's own words. */
export type OathPhraseBasis = "sourced" | "estimated-california-texas";

export interface OathPhrase {
  readonly text: string;
  readonly basis: OathPhraseBasis;
}

/** Swearing invokes God; affirming does not. The words otherwise match. */
export type OathForm = "swear" | "affirm";

export const OATH_FORMS: readonly OathForm[] = ["swear", "affirm"];

export type OathSwornOn =
  | "bible"
  | "hebrew-bible"
  | "quran"
  | "state-constitution"
  | "us-constitution"
  | "nothing";

export interface OathSwornOnOption {
  readonly key: OathSwornOn;
  readonly label: string;
}

/**
 * What the officeholder may place a hand on. The choice is recorded with the
 * oath; nothing in the world reacts to it yet.
 */
export function oathSwornOnOptions(
  stateName: string,
): readonly OathSwornOnOption[] {
  return [
    { key: "bible", label: "A Bible" },
    { key: "hebrew-bible", label: "A Hebrew Bible" },
    { key: "quran", label: "A Quran" },
    {
      key: "state-constitution",
      label: `A copy of the Constitution of ${stateName}`,
    },
    {
      key: "us-constitution",
      label: "A copy of the Constitution of the United States",
    },
    { key: "nothing", label: "Nothing; a raised right hand is enough" },
  ];
}

export function isOathSwornOn(value: string): value is OathSwornOn {
  return (
    value === "bible" ||
    value === "hebrew-bible" ||
    value === "quran" ||
    value === "state-constitution" ||
    value === "us-constitution" ||
    value === "nothing"
  );
}

/**
 * Version recorded with the California-and-Texas estimate. The string remains
 * unchanged so existing save tags and newly written tags identify one rule.
 */
export const SHARED_STATE_OATH_VERSION = "blanket-state-oath-v1";

/**
 * The oath of a state officeholder, in the phrases an officiant reads and the
 * officeholder repeats.
 */
export function stateOathOfOffice(input: {
  readonly personName: string;
  readonly stateName: string;
  readonly officeTitle: string;
  readonly form: OathForm;
}): readonly OathPhrase[] {
  const verb = input.form === "swear" ? "swear" : "affirm";
  const phrases: OathPhrase[] = [
    { text: `I, ${input.personName},`, basis: "sourced" },
    { text: `do solemnly ${verb}`, basis: "sourced" },
    {
      text: "that I will support the Constitution of the United States",
      basis: "sourced",
    },
    {
      text: `and the Constitution of ${input.stateName},`,
      basis: "estimated-california-texas",
    },
    {
      text: `and that I will faithfully discharge the duties of the office of ${input.officeTitle}`,
      basis: "estimated-california-texas",
    },
    {
      text: "to the best of my ability.",
      basis: "estimated-california-texas",
    },
  ];
  if (input.form === "swear")
    phrases.push({
      text: "So help me God.",
      basis: "estimated-california-texas",
    });
  return phrases;
}
