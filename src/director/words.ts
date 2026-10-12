/** Small word rules shared by the journal and conversations. */

/**
 * A record's proper name as people write it: some federal files hold names in
 * capitals only ("CENTRAL HIGH"), which are written word by word.
 */
export function properName(text: string): string {
  if (text !== text.toUpperCase()) return text;
  return text
    .toLowerCase()
    .replace(
      /(^|[\s\-/(])([a-z])/g,
      (_all, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`,
    );
}
