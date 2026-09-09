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
  "on-record": {
    conceptId: "on-record",
    label: "On the record",
    shortExplanation:
      "The information may be published and attributed to the source by name.",
    fullDefinition:
      "For this interview, on-record terms mean the agreed answer may be published and attributed to the source by name. Ground rules are agreed before the answer; opening this explanation does not create an agreement.",
    sourceLabel: "Associated Press: interview ground rules",
    sourceUrl:
      "https://www.ap.org/about/news-values-and-principles/telling-the-story/",
  },
  "on-background": {
    conceptId: "on-background",
    label: "On background",
    shortExplanation:
      "The information may be published only with the attribution agreed in advance.",
    fullDefinition:
      "For this interview, background terms mean the information may be published only under the attribution negotiated with the source before the answer. News organizations can use different terminology, so the saved agreement—not this label alone—controls the simulated exchange.",
    sourceLabel: "AP and Reuters: explicit sourcing ground rules",
    sourceUrl:
      "https://www.ap.org/about/news-values-and-principles/telling-the-story/",
  },
  "off-record": {
    conceptId: "off-record",
    label: "Off the record",
    shortExplanation:
      "The information may not be published from this exchange.",
    fullDefinition:
      "For this interview, off-record terms mean the information may not be published from the exchange. The label does not erase independently obtained public facts, and it does not become effective merely because this explanation was opened.",
    sourceLabel: "Associated Press: interview ground rules",
    sourceUrl:
      "https://www.ap.org/about/news-values-and-principles/telling-the-story/",
  },
};

export function civicGlossaryEntry(
  conceptId: string,
): CivicGlossaryEntry | null {
  return CIVIC_GLOSSARY[conceptId] ?? null;
}
