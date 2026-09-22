/**
 * American spelling, units and dates, as data.
 *
 * The game is set in the United States and its owner writes American English,
 * so everything the project writes does too: player text, content, docs, and
 * the skill and instruction files that tell the next author how to write.
 * `BRITISH_IDIOM` in `american-english.ts` catches vocabulary (lorry, fortnight);
 * this file catches spelling (colour, centre, labour, organise), metric
 * measurements in player text, and day-first dates.
 *
 * It is a word table, not a rule like "-our becomes -or": `four`, `tour`,
 * `your` and `glamour` are all fine, and so are `advertise`, `exercise` and
 * `compromise`. Only words listed here are ever flagged or changed.
 */

const OUR_STEMS = [
  "ard",
  "arm",
  "behavi",
  "cand",
  "clam",
  "col",
  "endeav",
  "fav",
  "ferv",
  "flav",
  "harb",
  "hon",
  "hum",
  "lab",
  "neighb",
  "od",
  "parl",
  "rig",
  "rum",
  "savi",
  "sav",
  "splend",
  "succ",
  "tum",
  "val",
  "vap",
  "vig",
];
const OUR_PREFIXES = [
  "",
  "dis",
  "re",
  "mis",
  "un",
  "multi",
  "water",
  "tri",
  "bi",
];
const OUR_SUFFIXES = [
  "",
  "s",
  "ed",
  "ing",
  "ings",
  "able",
  "ably",
  "ful",
  "fully",
  "less",
  "ite",
  "ites",
  "itism",
  "hood",
  "hoods",
  "al",
  "ally",
  "er",
  "ers",
  "ist",
  "ists",
  "ism",
  "isms",
  "y",
];

/** Words whose British form ends -ise/-isation and whose American form is -ize. */
const ISE_STEMS = [
  "agon",
  "amort",
  "anonym",
  "antagon",
  "apolog",
  "author",
  "canonical",
  "capital",
  "categor",
  "character",
  "civil",
  "colon",
  "commercial",
  "conceptual",
  "contextual",
  "critic",
  "crystall",
  "custom",
  "decentral",
  "democrat",
  "demon",
  "demoral",
  "deputy",
  "digit",
  "dramat",
  "econom",
  "emphas",
  "energ",
  "epitom",
  "equal",
  "familiar",
  "fantas",
  "fertil",
  "final",
  "formal",
  "fossil",
  "galvan",
  "general",
  "global",
  "harmon",
  "hospital",
  "human",
  "hypothes",
  "ideal",
  "immun",
  "incentiv",
  "initial",
  "institutional",
  "internal",
  "item",
  "legal",
  "legitim",
  "liberal",
  "local",
  "magnet",
  "marginal",
  "material",
  "maxim",
  "memorial",
  "memor",
  "mesmer",
  "metabol",
  "minim",
  "mobil",
  "modern",
  "monopol",
  "moral",
  "national",
  "natural",
  "neutral",
  "normal",
  "operational",
  "optim",
  "organ",
  "parallel",
  "parameter",
  "patron",
  "penal",
  "personal",
  "polar",
  "politic",
  "popular",
  "pressur",
  "priorit",
  "privat",
  "public",
  "radical",
  "random",
  "rational",
  "real",
  "recogn",
  "regular",
  "revolution",
  "sanit",
  "satir",
  "scrutin",
  "sensit",
  "serial",
  "social",
  "special",
  "stabil",
  "standard",
  "steril",
  "stigmat",
  "styl",
  "subsid",
  "summar",
  "symbol",
  "sympath",
  "synchron",
  "synthes",
  "terror",
  "theor",
  "token",
  "trivial",
  "union",
  "urban",
  "util",
  "vandal",
  "verbal",
  "victim",
  "visual",
  "vocal",
  "western",
];
const ISE_PREFIXES = [
  "",
  "un",
  "re",
  "de",
  "dis",
  "non",
  "over",
  "under",
  "mis",
  "pre",
];
const ISE_SUFFIXES = [
  ["ise", "ize"],
  ["ises", "izes"],
  ["ised", "ized"],
  ["ising", "izing"],
  ["isation", "ization"],
  ["isations", "izations"],
  ["iser", "izer"],
  ["isers", "izers"],
  ["isable", "izable"],
] as const;

/** Single words and small families that follow no pattern worth generating. */
const EXPLICIT: readonly (readonly [string, string])[] = [
  // -re
  ["centre", "center"],
  ["centres", "centers"],
  ["centred", "centered"],
  ["centring", "centering"],
  ["centrepiece", "centerpiece"],
  ["centrepieces", "centerpieces"],
  ["centreline", "centerline"],
  ["centrelines", "centerlines"],
  ["theatre", "theater"],
  ["theatres", "theaters"],
  ["metre", "meter"],
  ["metres", "meters"],
  ["kilometre", "kilometer"],
  ["kilometres", "kilometers"],
  ["centimetre", "centimeter"],
  ["centimetres", "centimeters"],
  ["millimetre", "millimeter"],
  ["millimetres", "millimeters"],
  ["litre", "liter"],
  ["litres", "liters"],
  ["fibre", "fiber"],
  ["fibres", "fibers"],
  ["calibre", "caliber"],
  ["sombre", "somber"],
  ["spectre", "specter"],
  ["lustre", "luster"],
  ["meagre", "meager"],
  ["sabre", "saber"],
  ["manoeuvre", "maneuver"],
  ["manoeuvres", "maneuvers"],
  ["manoeuvred", "maneuvered"],
  ["manoeuvring", "maneuvering"],
  // -ce
  ["defence", "defense"],
  ["defences", "defenses"],
  ["offence", "offense"],
  ["offences", "offenses"],
  ["licence", "license"],
  ["licences", "licenses"],
  ["licenced", "licensed"],
  ["pretence", "pretense"],
  // -yse
  ["analyse", "analyze"],
  ["analysed", "analyzed"],
  ["analysing", "analyzing"],
  ["analyser", "analyzer"],
  ["reanalyse", "reanalyze"],
  ["paralyse", "paralyze"],
  ["paralysed", "paralyzed"],
  ["paralyses", "paralyzes"],
  ["paralysing", "paralyzing"],
  ["catalyse", "catalyze"],
  ["catalysed", "catalyzed"],
  // -ogue
  ["catalogue", "catalog"],
  ["catalogues", "catalogs"],
  ["catalogued", "cataloged"],
  ["cataloguing", "cataloging"],
  ["analogue", "analog"],
  ["analogues", "analogs"],
  // doubled l
  ["cancelled", "canceled"],
  ["cancelling", "canceling"],
  ["labelled", "labeled"],
  ["labelling", "labeling"],
  ["modelled", "modeled"],
  ["modelling", "modeling"],
  ["modeller", "modeler"],
  ["modellers", "modelers"],
  ["travelled", "traveled"],
  ["travelling", "traveling"],
  ["traveller", "traveler"],
  ["travellers", "travelers"],
  ["levelled", "leveled"],
  ["levelling", "leveling"],
  ["fuelled", "fueled"],
  ["fuelling", "fueling"],
  ["counselled", "counseled"],
  ["counselling", "counseling"],
  ["counsellor", "counselor"],
  ["counsellors", "counselors"],
  ["signalled", "signaled"],
  ["signalling", "signaling"],
  ["totalled", "totaled"],
  ["totalling", "totaling"],
  ["marvellous", "marvelous"],
  ["dialled", "dialed"],
  ["dialling", "dialing"],
  ["channelled", "channeled"],
  ["channelling", "channeling"],
  ["funnelled", "funneled"],
  ["tunnelled", "tunneled"],
  ["quarrelled", "quarreled"],
  ["rivalled", "rivaled"],
  ["equalled", "equaled"],
  ["pencilled", "penciled"],
  ["marshalled", "marshaled"],
  ["jewellery", "jewelry"],
  ["enrol", "enroll"],
  ["enrols", "enrolls"],
  ["enrolment", "enrollment"],
  ["enrolments", "enrollments"],
  ["fulfil", "fulfill"],
  ["fulfils", "fulfills"],
  ["fulfilment", "fulfillment"],
  ["instalment", "installment"],
  ["instalments", "installments"],
  ["skilful", "skillful"],
  ["skilfully", "skillfully"],
  ["wilful", "willful"],
  ["wilfully", "willfully"],
  ["distil", "distill"],
  ["focussed", "focused"],
  ["focussing", "focusing"],
  ["benefitted", "benefited"],
  ["benefitting", "benefiting"],
  // vowels
  ["paediatric", "pediatric"],
  ["paediatrician", "pediatrician"],
  ["anaesthetic", "anesthetic"],
  ["anaesthesia", "anesthesia"],
  ["oestrogen", "estrogen"],
  ["foetus", "fetus"],
  ["foetal", "fetal"],
  ["haemorrhage", "hemorrhage"],
  ["leukaemia", "leukemia"],
  ["diarrhoea", "diarrhea"],
  ["orthopaedic", "orthopedic"],
  ["encyclopaedia", "encyclopedia"],
  ["mediaeval", "medieval"],
  // everything else
  ["grey", "gray"],
  ["greys", "grays"],
  ["greyed", "grayed"],
  ["greying", "graying"],
  ["greyer", "grayer"],
  ["greyish", "grayish"],
  ["greyscale", "grayscale"],
  ["programme", "program"],
  ["programmes", "programs"],
  ["judgement", "judgment"],
  ["judgements", "judgments"],
  ["acknowledgement", "acknowledgment"],
  ["acknowledgements", "acknowledgments"],
  ["ageing", "aging"],
  ["storey", "story"],
  ["storeys", "stories"],
  ["tyre", "tire"],
  ["tyres", "tires"],
  ["cheque", "check"],
  ["cheques", "checks"],
  ["aluminium", "aluminum"],
  ["sceptic", "skeptic"],
  ["sceptical", "skeptical"],
  ["scepticism", "skepticism"],
  ["mould", "mold"],
  ["moulds", "molds"],
  ["mouldy", "moldy"],
  ["plough", "plow"],
  ["ploughed", "plowed"],
  ["whilst", "while"],
  ["amongst", "among"],
  ["learnt", "learned"],
  ["spelt", "spelled"],
  ["practise", "practice"],
  ["practised", "practiced"],
  ["practising", "practicing"],
  ["practises", "practices"],
  ["artefact", "artifact"],
  ["artefacts", "artifacts"],
  ["enquire", "inquire"],
  ["enquired", "inquired"],
  ["enquiry", "inquiry"],
  ["enquiries", "inquiries"],
  ["cosy", "cozy"],
  ["cosier", "cozier"],
  ["pyjamas", "pajamas"],
  ["moustache", "mustache"],
  ["moustached", "mustached"],
  ["sulphur", "sulfur"],
  ["sulphate", "sulfate"],
  ["kerb", "curb"],
  ["kerbs", "curbs"],
  ["kerbside", "curbside"],
  ["draught", "draft"],
  ["draughts", "drafts"],
  ["gaol", "jail"],
  ["aeroplane", "airplane"],
  ["aeroplanes", "airplanes"],
  ["speciality", "specialty"],
  ["specialities", "specialties"],
  ["tonne", "ton"],
  ["tonnes", "tons"],
  ["mum", "mom"],
  ["mums", "moms"],
  ["mummy", "mommy"],
];

function generated(): Map<string, string> {
  const table = new Map<string, string>();
  for (const stem of OUR_STEMS)
    for (const prefix of OUR_PREFIXES)
      for (const suffix of OUR_SUFFIXES)
        table.set(
          `${prefix}${stem}our${suffix}`,
          `${prefix}${stem}or${suffix}`,
        );
  for (const stem of ISE_STEMS)
    for (const prefix of ISE_PREFIXES)
      for (const [british, american] of ISE_SUFFIXES)
        table.set(`${prefix}${stem}${british}`, `${prefix}${stem}${american}`);
  for (const [british, american] of EXPLICIT) table.set(british, american);
  // A form spelled the same on both sides of the Atlantic must never be
  // "corrected", so adding a stem cannot quietly start rewriting a good word.
  for (const safe of AMERICAN_TOO) table.delete(safe);
  return table;
}

/** Correct American words a stem or prefix could otherwise produce. */
const AMERICAN_TOO: readonly string[] = [
  "glamour",
  "glamourous",
  "four",
  "tour",
];

/** British spelling → American spelling, lower case. */
export const AMERICAN_SPELLING: ReadonlyMap<string, string> = generated();

/**
 * Proper nouns spelled the British way that are correct here.
 *
 * Real American places carry these names — Centre County, Pennsylvania,
 * Centre, Alabama, and Sulphur, Oklahoma — and a foreign party is called what it is called. Matched as
 * whole phrases, case-sensitive, before any word is looked up.
 */
export const PROPER_NOUN_PHRASES: readonly string[] = [
  "Centre County",
  "Centre, Alabama",
  "Centre, AL",
  "Centre city",
  "Centre town",
  "Labour Party",
  // Sulphur, Oklahoma; Sulphur, Louisiana; Sulphur Springs, Texas.
  "Sulphur",
  "Grey's Anatomy",
];

/**
 * Identifiers that carry a British spelling and must keep it.
 *
 * These are persisted: saved games, scene keys and asset records hold them, so
 * renaming one would orphan an old save or break another lane's reference.
 * Prose that *describes* them still reads in American English; only the token
 * itself is preserved, and only where it appears joined to the rest of an
 * identifier (with a hyphen, underscore, dot or slash).
 */
export const PRESERVED_IDENTIFIERS: readonly string[] = [
  "returning-favour",
  "favour-request",
  "source-colour",
  "fixed-skin-colour",
  "licence-document",
  "verified-licence",
  "not-modelled",
  "neighbourhood-association",
  "counsel-table-centre-papers",
  "clash-cancelled",
  "then-cancelled",
];

export type SpellingFinding = {
  readonly index: number;
  readonly british: string;
  readonly american: string;
};

function matchCase(model: string, word: string): string {
  if (model === model.toUpperCase() && model.length > 1)
    return word.toUpperCase();
  if (model[0] === model[0]!.toUpperCase())
    return word[0]!.toUpperCase() + word.slice(1);
  return word;
}

const JOINERS = new Set(["_", ".", "/", "\\", "-", "#", "$", "@"]);

/**
 * Every British spelling in a run of prose, with its American replacement.
 *
 * A word joined to its neighbours by `_ . / \\ # $ @` is part of a path, a
 * property or a variable and is left alone; so is a camelCase run, because the
 * whole run is looked up and `sourceColour` is not a word. A hyphen joins
 * ordinary English compounds too ("full-colour"), so a hyphenated word is
 * checked unless its compound is one of the `PRESERVED_IDENTIFIERS`.
 */
export function britishSpellings(text: string): SpellingFinding[] {
  let masked = text;
  for (const phrase of PROPER_NOUN_PHRASES) {
    let at = masked.indexOf(phrase);
    while (at !== -1) {
      masked =
        masked.slice(0, at) +
        " ".repeat(phrase.length) +
        masked.slice(at + phrase.length);
      at = masked.indexOf(phrase, at + phrase.length);
    }
  }
  const findings: SpellingFinding[] = [];
  const word = /[A-Za-z]+/g;
  let match: RegExpExecArray | null;
  while ((match = word.exec(masked)) !== null) {
    const american = AMERICAN_SPELLING.get(match[0].toLowerCase());
    if (!american) continue;
    const start = match.index;
    const end = start + match[0].length;
    const before = masked[start - 1] ?? " ";
    const after = masked[end] ?? " ";
    if (/[0-9]/.test(before) || /[0-9]/.test(after)) continue;
    const sentenceEnd = after === "." && /^(\s|$)/.test(masked[end + 1] ?? "");
    if (
      (JOINERS.has(before) && before !== "-") ||
      (JOINERS.has(after) && after !== "-" && !sentenceEnd)
    )
      continue;
    if (before === "-" || after === "-") {
      let left = start;
      let right = end;
      while (left > 0 && /[A-Za-z0-9-]/.test(masked[left - 1]!)) left -= 1;
      while (right < masked.length && /[A-Za-z0-9-]/.test(masked[right]!))
        right += 1;
      const compound = masked.slice(left, right).toLowerCase();
      if (PRESERVED_IDENTIFIERS.some((id) => compound.includes(id))) continue;
      // `--colour` or `x-colour-y` inside a flag or a CSS custom property.
      if (masked[left - 1] === "-" || /^-/.test(compound)) continue;
    }
    findings.push({
      index: start,
      british: match[0],
      american: matchCase(match[0], american),
    });
  }
  return findings;
}

/** The same prose with every British spelling replaced. */
export function americanize(text: string): string {
  let result = "";
  let cursor = 0;
  for (const finding of britishSpellings(text)) {
    result += text.slice(cursor, finding.index) + finding.american;
    cursor = finding.index + finding.british.length;
  }
  return result + text.slice(cursor);
}

const MONTHS =
  "January|February|March|April|May|June|July|August|September|October|November|December";

/**
 * A day written before its month: "22 September 2026", "1 January".
 *
 * American dates put the month first — "September 22, 2026". A bare "5 May" is
 * matched too; "May" as a verb after a number is rare enough in this corpus that
 * every hit was a date when the pattern was introduced.
 */
export const DAY_FIRST_DATE = new RegExp(
  `\\b([0-3]?\\d)(?:st|nd|rd|th)? (${MONTHS})(?:,? (\\d{4}))?\\b`,
  "g",
);

/** A numeric date whose first number can only be a day: 22/09/2026. */
export const DAY_FIRST_NUMERIC_DATE =
  /\b(1[3-9]|2\d|3[01])[/.](0?[1-9]|1[0-2])[/.](\d{2}|\d{4})\b/g;

export function monthFirstDates(text: string): string {
  return text.replace(
    DAY_FIRST_DATE,
    (whole, day: string, month: string, year: string | undefined) => {
      const number = Number(day);
      if (number < 1 || number > 31) return whole;
      return year ? `${month} ${number}, ${year}` : `${month} ${number}`;
    },
  );
}

/**
 * A metric measurement a player could read.
 *
 * Player text measures the world in US customary units — miles, feet, inches,
 * pounds, ounces, gallons, degrees Fahrenheit. Checked only in player-facing
 * strings; internal art calibration may keep metric, spelled the American way.
 */
export const METRIC_MEASUREMENT =
  /\b\d[\d,.]*\s?-?(?:km|cm|mm|kg|kilomet(?:er|re)s?|centimet(?:er|re)s?|millimet(?:er|re)s?|met(?:er|re)s?|kilograms?|grams?|lit(?:er|re)s?|millilit(?:er|re)s?|hectares?|tonnes?)\b|\bsquare (?:kilo)?met(?:er|re)s?\b|°C\b|\b[Cc]elsius\b/;
