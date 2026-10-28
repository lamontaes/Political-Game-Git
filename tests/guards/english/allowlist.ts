/**
 * The English guards' one allowlist. Entries here are real names and quoted
 * wording that look British but are not the game's own copy; each says why.
 * It only shrinks: a new entry needs a reason a reviewer can check, and an
 * entry whose text no longer appears is deleted.
 */

/**
 * Names and quotations that are genuinely British-looking but are not British
 * copy. Each entry removes the matching text before the word check runs.
 */
export const ALLOWED_PHRASES: readonly {
  readonly pattern: RegExp;
  readonly reason: string;
}[] = [
  {
    pattern: /\bLabour Economics\b/g,
    reason:
      "the title of a real journal (Labour Economics, Elsevier), quoted in a research citation",
  },
  {
    pattern:
      /\bThe effect of public sector employment on local labour markets\b/g,
    reason:
      "the title of a real paper (Faggio and Overman 2014, Journal of Urban Economics), quoted in a research citation",
  },
  {
    pattern: /\bLabour Party\b/g,
    reason: "a real party name, if one is ever quoted",
  },
  {
    pattern: /\bArmour, South Dakota\b/g,
    reason:
      "a real town (Armour, South Dakota), named in a pool item's calibration evidence",
  },
  {
    pattern: /\butilises measures derived by standardising\b/g,
    reason:
      "Vella, Richiardi and van de Ven's method note on their personality measures, quoted verbatim in the benefit take-up research",
  },
  {
    pattern: /\bstandardised residual\b/g,
    reason:
      "Brown and Taylor's method note on their personality measure, quoted verbatim in the borrowing research",
  },
  {
    pattern: /\bBribes in the analysed cases\b/g,
    reason:
      "a summary of the OECD Foreign Bribery Report (2014), quoted verbatim in the corruption research",
  },
  {
    pattern:
      /\b(?:church|parish|youth|associate|Baptist|Methodist|Presbyterian|Lutheran|Unitarian|Protestant|Episcopal|ordained|pastor and) ministers?\b|\bministers? of the (?:gospel|church)\b/gi,
    reason: "clergy: a church minister is American usage",
  },
  {
    pattern: /\bpublic Ministers\b/g,
    reason: "Article II of the U.S. Constitution, quoted verbatim",
  },
  {
    pattern: /\b\d+ (?:[NSEW]\. )?High Street\b/g,
    reason: "real street addresses of real government buildings",
  },
  {
    pattern:
      /\b(?:legal|public|federal|state|national|bank|school) holidays?\b/gi,
    reason: "public holidays are American usage",
  },
  { pattern: /\bsales tax holidays?\b/gi, reason: "an American tax term" },
  {
    pattern:
      /\b(?:(?:majority|two-thirds|one-third|three-fifths|quorum|number|2\/3)(?: vote)? of (?:all )?(?:the )?elected members?|elected members? (?:of|in) (?:each|the|a|that|all) (?:house|houses|chamber|senate|respective)|newly elected members?)\b/gi,
    reason:
      "state constitutions and chamber rules, quoted: 'a majority of the elected members' is the legal term of art for counting members net of vacancies",
  },
  {
    pattern: /\bD\.C\. Council redraws ward boundaries\b/g,
    reason: "the District of Columbia is divided into eight wards by D.C. Code",
  },
  {
    pattern: /\btown-wards\b/g,
    reason:
      "the legacy town-wards.ts module name and its persisted event key (identifiers keep their spelling); player text says the place's recorded seat type",
  },
  {
    pattern: /\bSG-GOV-ward-residency\b/g,
    reason:
      "the registered stopgap id the residency citation names (identifiers keep their spelling); the citation's own words say district seats",
  },
];

/**
 * Files that are lists of real names or verbatim legal text, where the British
 * spelling is the recorded wording and not the game's own copy. Entries limit
 * the exemption to named rule patterns where the file is otherwise player copy.
 */
export const ALLOWED_FILES: readonly {
  readonly file: RegExp;
  readonly words?: RegExp;
  readonly reason: string;
}[] = [
  {
    file: /^src\/core2\/reference\/(?:government-units|national-places|national-counties)\.generated\.ts$/,
    reason:
      "Census place, county and government names: Centre County, Centreville, Grey Eagle, Holiday Island, Flat Rock, Tyre, Seward",
  },
  {
    file: /^src\/core2\/gov-rules\/names-data\.ts$/,
    reason: "Ward is a family name",
  },
  {
    file: /^src\/core2\/gov-rules\/names-data\.ts$/,
    words: /^ward$/i,
    reason: "Ward is a family name in the census surname list",
  },
  {
    file: /^data\/english\/batches\/batch-\d+\.json$/,
    words: /^Ward$/,
    reason:
      "grading batches quote generated people by name, and Ward is a family name in the census surname list; a lowercase ward is still flagged",
  },
  {
    file: /^data\/research\/places\/local-institutions(?:\.json|\/[A-Z]{2}\.json)$/,
    reason:
      "real names of schools, hospitals, colleges and employers: Centre College, Sauk Centre, Long Prairie-Grey Eagle, Starr King School for the Ministry, Ward Melville High School",
  },
  {
    file: /^data\/research\/world\/hud-hic-2025-beds-by-city\.json$/,
    words: /^centre$/i,
    reason: "HUD's city names as published: Rockville Centre, New York",
  },
  {
    file: /^src\/source\/domains\/(?:municipal-governance\/|political-districts\/identity\.ts$|state-legislatures\/acquisition\.ts$)/,
    words: /^wards?$/i,
    reason:
      "research records of real charters, D.C. and a state constitution, where ward is the recorded seat type or wording",
  },
  {
    file: /^data\/municipal-elections\/92O-national-state-baseline\.json$/,
    words: /^wards?$/i,
    reason:
      "state-by-state record of real municipal seat structures (Las Vegas wards, Pittsburgh wards, D.C. wards)",
  },
  {
    file: /^data\/research\/local-government\/council-election-methods\.json$/,
    words: /^wards?$/i,
    reason:
      "cites the ICMA survey, whose category is 'all by ward or district'",
  },
  {
    file: /^data\/research\/stopgaps-oct19\/[A-Z]-[a-z-]+\.json$/,
    words: /^wards?$/i,
    reason:
      "researched stopgap values quote real places and statutes: Ward County, Texas, and Nebraska's precinct or ward primary unit",
  },
  {
    file: /^data\/research\/stopgaps-oct19\/census\/[A-Za-z0-9.-]+\.json$/,
    words: /^(?:wards?|centre|grey)$/i,
    reason:
      "census place and county names as published (Sauk Centre, Grey Eagle, Ward County), and quotes of D.C.'s wards",
  },
  {
    file: /^data\/research\/(?:elections\/(?:filing-requirements|ballot-measures-2026|ballot-order-2026|eavs-2024-polling-places)|campaigns\/campaign-finance-2026|offices\/state-offices)\.json$/,
    words: /^wards?$/i,
    reason:
      "research facts about real charters and statutes: D.C.'s eight wards, the municipal filing rules whose recorded seat type is ward, and a polling-place count quoted verbatim ('one precinct or ward'); never deleted",
  },
];

export function isAllowedFile(relative: string, word: string): boolean {
  return ALLOWED_FILES.some(
    (entry) =>
      entry.file.test(relative) && (!entry.words || entry.words.test(word)),
  );
}

/**
 * British forms already in the tree when the vocabulary guard first read the
 * whole of it, by file and count: quoted research and a few lines of old
 * copy. Each count may only go down; a file reaching zero leaves the list.
 * Fix a line by rewording it, never by raising its count.
 */
export const KNOWN_HITS: Readonly<Record<string, number>> = {
  "data/research/bill-samples/federal/united-states.json": 2,
  "data/research/core/corruption-bands-2014.json": 1,
  "data/research/government/county-row-offices-by-state.json": 2,
  "data/research/laws/starting-law-2026/environment-energy.json": 11,
  "data/research/laws/starting-law-2026/justice-public-safety.json": 2,
  "data/research/offices/roadmap-r34-pay-and-transition.json": 1,
  "data/research/outcome-web/links.json": 3,
  "data/research/outcome-web/place-outcome-bases-2024.json": 1,
  "data/research/prices/household-prices-2026.json": 2,
  "data/research/programs/roadmap-r6-medicare-ssa-2026.json": 1,
  "data/research/stand-in-figures-2026-10-12.json": 2,
  "data/research/stopgaps-oct19/C-government-law.json": 2,
  "data/research/stopgaps-oct19/census/census-SG-P15-partnership-model-places.json": 7,
  "data/research/trait-effect-sizes.json": 7,
  "src/core2/opening-economy.ts": 1,
  "src/core2/opening-work.ts": 1,
};

/**
 * Player strings that already carried an ISO date or a raw record value when
 * the player-text guard first ran, by file and count. Only goes down.
 */
export const KNOWN_DEVELOPER_TEXT: Readonly<Record<string, number>> = {
  // A seating check's failure lines, named like a screen file.
  "src/bench/m2-10-seating.ts": 2,
};
