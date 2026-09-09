export interface CivicGlossaryEntry {
  readonly conceptId: string;
  readonly label: string;
  readonly shortExplanation: string;
  readonly fullDefinition: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
}

/**
 * Stable, explicitly referenced concepts. Components select these by ID;
 * player prose is never searched for words that merely look like terms.
 */
export const CIVIC_GLOSSARY: Readonly<Record<string, CivicGlossaryEntry>> = {
  "committee-referral": {
    conceptId: "committee-referral",
    label: "Committee referral",
    shortExplanation: "Assigns a measure to a committee for consideration.",
    fullDefinition:
      "A committee referral sends a measure to a committee responsible for considering its subject before later action.",
    sourceLabel: "U.S. Senate glossary: referral",
    sourceUrl: "https://www.senate.gov/about/research-tools/glossary.htm",
  },
  "recorded-vote": {
    conceptId: "recorded-vote",
    label: "Recorded vote",
    shortExplanation:
      "Preserves how members voted and the result after the vote occurs.",
    fullDefinition:
      "A recorded vote enters members' votes and the resulting tally in the legislative record. A stated intention or a vote scheduled for later is not a recorded vote.",
    sourceLabel: "U.S. House: House Floor",
    sourceUrl:
      "https://www.house.gov/the-house-explained/the-legislative-process/house-floor",
  },
  "published-information": {
    conceptId: "published-information",
    label: "Published information",
    shortExplanation:
      "A public-information item created by an explicit publication action.",
    fullDefinition:
      "In this save, publication is a separate recorded step after an event. A fact's existence or public-record status does not by itself place it in the newspaper or on television.",
    sourceLabel: "NEWS-HELP2 delivery contract",
    sourceUrl:
      "https://docs.google.com/document/d/1BQTTAZlOLQBVKQpzVGPfqEH8iD5kuH08aB8nIfibamc/edit",
  },
};

export function civicGlossaryEntry(
  conceptId: string,
): CivicGlossaryEntry | null {
  return CIVIC_GLOSSARY[conceptId] ?? null;
}
