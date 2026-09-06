/**
 * The first wave of municipal-election rule packs: fifty states and the
 * District of Columbia, compiled from the 92O national research synthesis.
 *
 * ## What a pack claims, and what it does not
 *
 * Each pack states what a **state's general municipal law** provides. It is
 * never a claim about a particular city. American municipal law is a layered
 * thing — a state baseline, an optional-charter menu, and named local charters
 * that displace both — and this wave compiles only the first layer. Where the
 * baseline resolves that a municipality chooses, the value is
 * `locally-selectable` and carries the option set; it never guesses which
 * option a city took, and a `locally-selectable` value is not a value a
 * simulation may operate on.
 *
 * ## Two files, two jobs
 *
 * `data/municipal-elections/92O-national-state-baseline.json` holds the corpus
 * verbatim: every field as 92O serialises it, every citation, and the register
 * of the source's own internal conflicts. Nothing is interpreted there.
 *
 * This file holds the interpretation, in one place, as {@link READINGS}. Three
 * judgments could not come from the corpus's own booleans and had to be read
 * out of its prose:
 *
 * 1. **Whether citizen initiative and protest referendum exist at all under
 *    general law.** The corpus serialises a flat `Authorized` boolean, and for
 *    fourteen jurisdictions that boolean is `true` while the same row's prose
 *    says the right exists *only* in some municipal forms — Kentucky's
 *    Commission and City Manager cities, Tennessee's Manager-Commission
 *    charters, Texas home-rule charters. A flat `true` there would assert a
 *    statewide right the source does not claim.
 * 2. **What a signature percentage is a percentage of.** The corpus carries a
 *    base only for recall. For initiative and referendum the base sits in
 *    prose, and 15% of registered voters and 15% of the votes cast for mayor
 *    differ by roughly an order of magnitude. Where the prose names no base,
 *    or gives a tiered or ranged requirement, the threshold stays `unknown`
 *    with the source's own words in the note.
 * 3. **The option set behind a `locally_selectable` runoff rule.** Six
 *    jurisdictions carry that value; the options are enumerated in the
 *    citation prose rather than in a field.
 *
 * Every reading below quotes what it was read from. A test asserts that each
 * reading's percentage still matches the corpus row it claims to read, so the
 * table cannot drift away from the data underneath it.
 *
 * ## Nothing here is audited law
 *
 * Every value carries verification `secondary-synthesis-only`. See
 * {@link MUNICIPAL_RULES_AUDIT_GATE} before consuming any of it.
 */

import corpus from "../../data/municipal-elections/92O-national-state-baseline.json";
import {
  MUNICIPAL_RULES_AUDIT_GATE,
  assertMunicipalElectionRulePack,
  knownMunicipalRule,
  locallySelectableMunicipalRule,
  notApplicableMunicipalRule,
  unknownMunicipalRule,
  type ElectionAdministrationModel,
  type HomeRuleFoundation,
  type MunicipalAuthorityLayer,
  type MunicipalBallotStructure,
  type MunicipalElectionRulePack,
  type MunicipalElectionTiming,
  type MunicipalInitiativeForm,
  type MunicipalOptionFamily,
  type MunicipalRecallDoctrine,
  type MunicipalRule,
  type MunicipalRunoffRule,
  type MunicipalSourceRef,
  type MunicipalVacancyRule,
  type PetitionSignatureBase,
  type PetitionThreshold,
  type ProtestReferendumAvailability,
} from "./municipal-election-rules";

export { MUNICIPAL_RULES_AUDIT_GATE };

/** Where these values were read, and when. Carried onto every citation. */
export const MUNICIPAL_CORPUS_ID = corpus.meta.packetId;
export const MUNICIPAL_CORPUS_AS_OF = corpus.meta.asOf;
export const MUNICIPAL_CORPUS_READ_ON = corpus.meta.readOn;

/** The source's own catalogue of places it contradicts itself, surfaced. */
export const MUNICIPAL_CORPUS_CONFLICTS = corpus.conflicts;

// ---------------------------------------------------------------------------
// Readings
// ---------------------------------------------------------------------------

/** How a jurisdiction's citizen initiative resolves under general law. */
type InitiativeReading =
  /** General law settles one form for the whole state. */
  | { readonly kind: "statewide"; readonly form: MunicipalInitiativeForm }
  /**
   * General law makes the right depend on a municipal form or charter this
   * corpus does not resolve for any municipality.
   */
  | {
      readonly kind: "form-conditional";
      readonly options: readonly MunicipalInitiativeForm[];
      readonly statutoryDefault: MunicipalInitiativeForm | null;
    };

/** How a signature percentage resolves, and against what. */
type ThresholdReading =
  | { readonly kind: "resolved"; readonly base: PetitionSignatureBase }
  /** The source gives a tiered, ranged, or baseless requirement. */
  | { readonly kind: "unresolved" }
  /** The requirement is an absolute count of signers, not a share. */
  | { readonly kind: "absolute-count" };

interface StateReading {
  /** The prose these judgments were read out of, quoted for audit. */
  readonly readFrom: string;
  readonly initiative: InitiativeReading;
  readonly initiativeThreshold: ThresholdReading;
  readonly referendum:
    | {
        readonly kind: "statewide";
        readonly value: ProtestReferendumAvailability;
      }
    | {
        readonly kind: "form-conditional";
        readonly options: readonly ProtestReferendumAvailability[];
      };
  readonly referendumThreshold: ThresholdReading;
  /** Only where the corpus's runoff rule is `locally_selectable`. */
  readonly runoffOptions?: {
    readonly options: readonly MunicipalRunoffRule[];
    readonly statutoryDefault: MunicipalRunoffRule | null;
  };
}

const REGISTERED: ThresholdReading = {
  kind: "resolved",
  base: "registered-voters",
};
const FOR_OFFICE: ThresholdReading = {
  kind: "resolved",
  base: "votes-cast-for-office",
};
const LAST_ELECTION: ThresholdReading = {
  kind: "resolved",
  base: "votes-cast-last-election",
};
const GUBERNATORIAL: ThresholdReading = {
  kind: "resolved",
  base: "last-gubernatorial-vote",
};
const UNRESOLVED: ThresholdReading = { kind: "unresolved" };
const ABSOLUTE: ThresholdReading = { kind: "absolute-count" };

const AVAILABLE = { kind: "statewide", value: "available" } as const;
const NO_REFERENDUM = { kind: "statewide", value: "prohibited" } as const;
const REFERENDUM_BY_CHARTER = {
  kind: "form-conditional",
  options: ["available", "prohibited"],
} as const;

const STATEWIDE = (form: MunicipalInitiativeForm): InitiativeReading => ({
  kind: "statewide",
  form,
});

/** Initiative exists in some municipal forms and not others. */
const BY_FORM = (
  options: readonly MunicipalInitiativeForm[],
  statutoryDefault: MunicipalInitiativeForm | null = null,
): InitiativeReading => ({
  kind: "form-conditional",
  options,
  statutoryDefault,
});

/**
 * The per-jurisdiction reading table.
 *
 * `readFrom` quotes the corpus prose each judgment rests on. Where a threshold
 * is `unresolved`, that quote is what a later audit has to go and settle.
 */
const READINGS: Readonly<Record<string, StateReading>> = {
  AK: {
    readFrom:
      "Initiative: 'Petitions require 25% of votes cast at last regular election.' Referendum: 'Protest petition filed within 30 days after ordinance enactment suspends legal operation'—no base named.",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: LAST_ELECTION,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
    runoffOptions: {
      options: ["pure-plurality", "majority-50-plus-1"],
      statutoryDefault: "pure-plurality",
    },
  },
  AL: {
    readFrom:
      "'Citizen ordinance initiative is not authorized under general municipal law' and 'Citizen protest referendum on city ordinances is absent in general municipal law.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  AR: {
    readFrom:
      "Initiative: '15% of votes cast for mayor at last preceding general election.' Referendum: '15% petition filed within 30 days'—no base named.",
    initiative: STATEWIDE("direct-to-ballot"),
    initiativeThreshold: FOR_OFFICE,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  AZ: {
    readFrom:
      "Initiative: '15% of registered voters in city/town.' Referendum: '10% of registered voters filed within 30 days.'",
    initiative: STATEWIDE("direct-to-ballot"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  CA: {
    readFrom:
      "Initiative: '10% of registered voters for regular election; 15% forces special election'—tiered, so unresolved. Referendum: '10% of registered voters filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  CO: {
    readFrom:
      "Initiative: '5% signatures for regular election; 15% forces special election'—tiered, so unresolved. Referendum: '10% of registered electors filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  CT: {
    readFrom:
      "'In town meeting towns, 20 or 50 electors can petition to place a warrant article'; 'In charter cities, citizen ordinance initiative is generally absent unless authorized by charter.' Referendum under C.G.S. § 7-7: '200 electors or 10% of electors.'",
    initiative: BY_FORM(["town-meeting-warrant", "prohibited"]),
    initiativeThreshold: ABSOLUTE,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  DC: {
    readFrom:
      "Initiative: '5% of registered electors District-wide with 5% in at least 5 of the 8 wards.' Referendum: '5% of registered electors filed within 30 days of mayoral transmission to Congress.'",
    initiative: STATEWIDE("direct-to-ballot"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  DE: {
    readFrom:
      "'Citizen ordinance initiative is not authorized by general Delaware law'; 'General law provides no protest referendum on ordinances.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  FL: {
    readFrom:
      "'General ordinance initiative is not statewide mandate; available only if enacted in municipal charter'; referendum 'Governed by individual municipal charters.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"], "prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
    runoffOptions: {
      options: ["pure-plurality", "majority-50-plus-1"],
      statutoryDefault: null,
    },
  },
  GA: {
    readFrom:
      "'Citizen initiative for general ordinances is PROHIBITED'; 'No general statutory protest referendum mechanism on municipal ordinances.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  HI: {
    readFrom:
      "Initiative: '10% of total voters who voted at last mayoral election.' Referendum: '10% registered voter petition filed within 60 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: FOR_OFFICE,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  IA: {
    readFrom:
      "'General citizen ordinance initiative is NOT authorized by Iowa law'; 'Citizen protest referendum on general ordinances is absent.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
    runoffOptions: {
      options: [
        "pure-plurality",
        "majority-50-plus-1",
        "top-two-primary-runoff",
      ],
      statutoryDefault: null,
    },
  },
  ID: {
    readFrom:
      "Initiative: 'Petition signed by 20% of registered electors.' Referendum: 'Petition signed by 20% of electors filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  IL: {
    readFrom:
      "'Citizen initiative for ordinary municipal ordinances is PROHIBITED'; 'Protest referendum against general city ordinances is not authorized.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  IN: {
    readFrom:
      "'Citizen initiative for municipal ordinances is STRICTLY PROHIBITED'; 'Citizen protest referendum on city ordinances is PROHIBITED.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  KS: {
    readFrom:
      "Initiative: '25% (in 2nd/3rd class) or 40% (in 1st class) of qualified electors'—tiered by city class, so unresolved. Referendum: guaranteed against charter ordinances, '10% electors within 60 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  KY: {
    readFrom:
      "'Authorized ONLY in Commission and City Manager forms (20-25% of voters at last general election). Barred in LFUCG and Louisville Metro charters.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  LA: {
    readFrom:
      "'NOT authorized in Lawrason Act municipalities'—the general law—'available ONLY where explicitly granted in individual Home Rule Charters.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  MA: {
    readFrom:
      "'Under Faulkner Act, petition signed by 8% (regular) or 12% (special)'—tiered—'In towns, 10 voters' place an article, a different form entirely.",
    initiative: BY_FORM(["indirect-council-first", "town-meeting-warrant"]),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  MD: {
    readFrom:
      "'General ordinance initiative is not authorized under state law'; protest referendum on general ordinances 'exists where provided' by charter, and the mandatory one reaches charter amendments only.",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  ME: {
    readFrom:
      "Initiative: '10% of voters (or 10 voters in small towns)'—an alternative absolute floor with no named base. Referendum: 'Towns using referendum ballot system may petition ordinances to vote; charter cities define protest referendum by charter.'",
    initiative: STATEWIDE("town-meeting-warrant"),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  MI: {
    readFrom:
      "'Home Rule City Act mandates that each charter may provide for initiative and referendum. Commonly 10-15%'—a range, and a charter condition.",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  MN: {
    readFrom:
      "'Statutory cities lack authority to adopt citizen initiative for ordinances'; 'Protest referendum against general ordinances is absent in statutory cities.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  MO: {
    readFrom:
      "'Authorized in 3rd Class optional forms (25% signatures) and Charter cities. PROHIBITED in 4th Class cities.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  MS: {
    readFrom:
      "'Authorized ONLY in Commission and Council-Manager forms (20% of qualified electors). Barred in Code Charter and Mayor-Council cities.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  MT: {
    readFrom:
      "Initiative: '15% of registered electors.' Referendum: '10% registered voter petition filed within 60 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  NC: {
    readFrom:
      "'Citizen ordinance initiative is PROHIBITED under general law'; 'No general statutory protest referendum mechanism.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
    runoffOptions: {
      options: [
        "pure-plurality",
        "majority-50-plus-1",
        "top-two-primary-runoff",
      ],
      statutoryDefault: null,
    },
  },
  ND: {
    readFrom:
      "'Authorized in Commission and Modern Council forms (15% of votes cast for executive head)'—conditional on form.",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  NE: {
    readFrom:
      "Initiative: '15% of registered voters.' Referendum: '15% registered voter petition filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  NH: {
    readFrom:
      "'25 or more registered voters petition Selectmen to include any warrant article'—an absolute count, not a share.",
    initiative: STATEWIDE("town-meeting-warrant"),
    initiativeThreshold: ABSOLUTE,
    referendum: AVAILABLE,
    referendumThreshold: ABSOLUTE,
  },
  NJ: {
    readFrom:
      "'Authorized ONLY in Faulkner Act municipalities (10% for regular election; 15% for special). PROHIBITED in traditional Boroughs and Townships.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
    runoffOptions: {
      options: ["pure-plurality", "majority-50-plus-1"],
      statutoryDefault: null,
    },
  },
  NM: {
    readFrom:
      "'Authorized in Commission-Manager cities (20% registered voters) and Charter cities'—conditional on form.",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  NV: {
    readFrom:
      "Initiative: '15% of registered voters.' Referendum: '10% of registered voters filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  NY: {
    readFrom:
      "'Citizen initiative for ordinary municipal ordinances is PROHIBITED'; 'No general protest referendum on ordinary ordinances.' The 45-day window the corpus carries belongs to the MHRL § 24 permissive referendum, a different instrument.",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  OH: {
    readFrom:
      "'UNIVERSAL CONSTITUTIONAL RIGHT. 10% of electors who voted for Governor at last election.' Referendum: '10% voter petition filed within 30 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: GUBERNATORIAL,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  OK: {
    readFrom:
      "'UNIVERSAL CONSTITUTIONAL RIGHT. 25% of total votes cast at last general municipal election.' Referendum: '25% voter petition filed within 30 days of publication'—no base named.",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: LAST_ELECTION,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  OR: {
    readFrom:
      "'UNIVERSAL CONSTITUTIONAL RIGHT. 15% of total votes cast for Governor.' Referendum: '10% voter petition filed within 30 days'—no base named.",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: GUBERNATORIAL,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  PA: {
    readFrom:
      "'Citizen initiative for general municipal ordinances is ABSENT under standard statutory codes'; 'General protest referendum does not exist in standard statutory codes.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  RI: {
    readFrom:
      "'Direct democracy exercised via Financial Town Meeting... In cities, initiative exists only where granted by charter'; referendum 'Governed by municipal charters.'",
    initiative: BY_FORM(["town-meeting-warrant", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  SC: {
    readFrom:
      "'UNIVERSAL STATUTORY RIGHT. Petition signed by 15% of registered electors.' Referendum: '15% registered elector petition filed within 60 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
    runoffOptions: {
      options: [
        "pure-plurality",
        "majority-50-plus-1",
        "top-two-primary-runoff",
      ],
      statutoryDefault: null,
    },
  },
  SD: {
    readFrom:
      "Initiative: 'Petition signed by 5% of registered voters.' Referendum: 'Petition signed by 5% of registered voters filed within 20 days.'",
    initiative: STATEWIDE("direct-to-ballot"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  TN: {
    readFrom:
      "'Authorized in Manager-Commission charters (25% voter petition)... Absent in Mayor-Aldermanic cities.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  TX: {
    readFrom:
      "'Absent in General Law cities. Universally provided in Home Rule Charters'; referendum 'Home Rule charters grant protest referendum.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"], "prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
  UT: {
    readFrom:
      "'Tiered signature thresholds: 8% (cities > 100k), 11.5% (10k-100k), 16% (< 10k) of total votes cast for Governor'—tiered by population, so unresolved at the state baseline.",
    initiative: STATEWIDE("direct-to-ballot"),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  VA: {
    readFrom:
      "'Citizen initiative for general municipal ordinances is PROHIBITED under Virginia law'; 'No general protest referendum on municipal ordinances.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: NO_REFERENDUM,
    referendumThreshold: UNRESOLVED,
  },
  VT: {
    readFrom:
      "Initiative: 'Petition signed by 5% of registered voters MANDATES Selectboard to insert proposed article into the warning.' Referendum: 'Petition signed by 5% of registered voters filed within 30 days.'",
    initiative: STATEWIDE("town-meeting-warrant"),
    initiativeThreshold: REGISTERED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  WA: {
    readFrom:
      "'Authorized in Code Cities and First Class Charters (15% for regular election; 20% for special)'—conditional on class, and tiered.",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: REGISTERED,
  },
  WI: {
    readFrom:
      "'UNIVERSAL STATUTORY RIGHT. Petition signed by 15% of votes cast for Governor in municipality.' Referendum is guaranteed against charter ordinances, '7% of votes cast for Governor within 60 days.'",
    initiative: STATEWIDE("indirect-council-first"),
    initiativeThreshold: GUBERNATORIAL,
    referendum: AVAILABLE,
    referendumThreshold: GUBERNATORIAL,
  },
  WV: {
    readFrom:
      "'Citizen initiative for ordinary municipal ordinances is not authorized by general state statute'; the referendum under § 8-1-5a reaches proposed home-rule ordinances, '15% voter petition filed within 30 days.'",
    initiative: STATEWIDE("prohibited"),
    initiativeThreshold: UNRESOLVED,
    referendum: AVAILABLE,
    referendumThreshold: UNRESOLVED,
  },
  WY: {
    readFrom:
      "'Authorized in Commission and City Manager forms (20-25% of registered electors). Limited in Mayor-Council cities.'",
    initiative: BY_FORM(["indirect-council-first", "prohibited"]),
    initiativeThreshold: UNRESOLVED,
    referendum: REFERENDUM_BY_CHARTER,
    referendumThreshold: UNRESOLVED,
  },
};

export { READINGS as MUNICIPAL_CORPUS_READINGS };

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

/** The shape one corpus row has, as the JSON carries it. */
type CorpusRow = (typeof corpus.jurisdictions)[number];

/** `snake_case` in the corpus, kebab-case in the runtime. One rule, applied once. */
function kebab(value: string): string {
  return value.replace(/_/g, "-");
}

function cite(
  citation: string,
  authority: MunicipalAuthorityLayer,
  note: string | null = null,
): MunicipalSourceRef {
  return {
    authority,
    citation,
    corpusId: MUNICIPAL_CORPUS_ID,
    asOf: MUNICIPAL_CORPUS_AS_OF,
    readOn: MUNICIPAL_CORPUS_READ_ON,
    verification: "secondary-synthesis-only",
    note,
  };
}

/**
 * Which kind of instrument a citation names.
 *
 * Read off the citation text rather than assumed, because the difference is
 * load-bearing: a constitutional right to municipal initiative cannot be
 * legislated away, and a statutory one can.
 */
function authorityOf(citation: string): MunicipalAuthorityLayer {
  if (/\bConst\b|\bConstitution\b/i.test(citation)) return "state-constitution";
  if (/^D\.C\. Code|Public Law|Home Rule Act/i.test(citation))
    return "federal-statute";
  if (
    /\bCharter/i.test(citation) &&
    !/Code|Stat|R\.S\.|RSA|ILCS|O\.S\./i.test(citation)
  ) {
    return "municipal-charter";
  }
  return "state-statute";
}

/** A count the corpus resolved, or the reason it did not. */
function numberRule(
  value: number | null,
  citation: string,
  unresolvedNote: string,
): MunicipalRule<number> {
  return value === null
    ? unknownMunicipalRule<number>(unresolvedNote)
    : knownMunicipalRule(value, cite(citation, authorityOf(citation)));
}

function booleanRule(
  value: boolean | null,
  citation: string,
  unresolvedNote: string,
): MunicipalRule<boolean> {
  return value === null
    ? unknownMunicipalRule<boolean>(unresolvedNote)
    : knownMunicipalRule(value, cite(citation, authorityOf(citation)));
}

/**
 * Compiles a petition threshold, or says why it could not be one.
 *
 * A percentage without its base is not a threshold, so a reading that resolved
 * no base yields `unknown` even though the corpus carries a number. An absolute
 * count of signers yields `not-applicable`, because there is no percentage to
 * resolve — that is a different requirement, not a missing one.
 */
function thresholdRule(
  percent: number | null,
  reading: ThresholdReading,
  citation: string,
  quotedProse: string,
): MunicipalRule<PetitionThreshold> {
  if (reading.kind === "absolute-count") {
    return notApplicableMunicipalRule<PetitionThreshold>(
      `The requirement is an absolute count of signers, not a share of an electorate: ${quotedProse}`,
    );
  }
  if (reading.kind === "unresolved" || percent === null) {
    return unknownMunicipalRule<PetitionThreshold>(
      `No single signature requirement is resolved. What the corpus says: ${quotedProse}`,
    );
  }
  return knownMunicipalRule(
    { percent, base: reading.base },
    cite(citation, authorityOf(citation), quotedProse),
  );
}

function compileElectionTiming(
  row: CorpusRow,
): MunicipalRule<MunicipalElectionTiming> {
  const options = row.electionTimingOptions.map(
    kebab,
  ) as MunicipalElectionTiming[];
  const source = cite(
    row.electionTimingCitation,
    authorityOf(row.electionTimingCitation),
  );
  if (options.length === 1) return knownMunicipalRule(options[0]!, source);
  return locallySelectableMunicipalRule(options, null, source);
}

function compileRunoff(
  row: CorpusRow,
  reading: StateReading,
): {
  rule: MunicipalRule<MunicipalRunoffRule>;
  trigger: MunicipalRule<number>;
} {
  const source = cite(row.runoffCitation, authorityOf(row.runoffCitation));

  if (row.runoffRule === "locally_selectable") {
    const options = reading.runoffOptions;
    if (!options) {
      throw new Error(
        `${row.usps} carries a locally-selectable runoff rule but no reading enumerates its options.`,
      );
    }
    return {
      rule: locallySelectableMunicipalRule(
        options.options,
        options.statutoryDefault,
        source,
      ),
      trigger: unknownMunicipalRule<number>(
        `A majority trigger of ${row.runoffTriggerPercent ?? "an unstated share"}% applies only if a municipality adopts a majority option, and state law resolves no operative trigger. Read from: ${row.runoffCitation}`,
      ),
    };
  }

  const rule = kebab(row.runoffRule) as MunicipalRunoffRule;
  const trigger =
    rule === "pure-plurality"
      ? notApplicableMunicipalRule<number>(
          "A plurality election has no share to clear; the highest vote total wins.",
        )
      : numberRule(
          row.runoffTriggerPercent,
          row.runoffCitation,
          `The corpus resolves a ${rule} rule but no majority trigger for it.`,
        );
  return { rule: knownMunicipalRule(rule, source), trigger };
}

function compileRecall(row: CorpusRow) {
  const doctrine = kebab(row.recallDoctrine) as MunicipalRecallDoctrine;
  const source = cite(
    row.recallCitation,
    authorityOf(row.recallCitation),
    row.recallMechanics || null,
  );

  // Both of these doctrines mean there is no recall *election*, so every rule
  // that only exists inside one is not-applicable rather than unknown. The
  // corpus serialises a grounds requirement and, for Iowa and Virginia, a
  // percentage even here; neither survives, and the conflict register records
  // the numbers so nothing is lost.
  const noRecallElection =
    doctrine === "prohibited" || doctrine === "judicial-cause-removal-trial";
  if (noRecallElection) {
    const why =
      doctrine === "prohibited"
        ? "State general law authorises no municipal recall."
        : `Removal runs through a court rather than a recall election. The corpus's ${row.recallPetitionPercent ?? "unstated"}% figure gates a judicial removal petition, not a recall election.`;
    return {
      doctrine: knownMunicipalRule(doctrine, source),
      groundsRequired: notApplicableMunicipalRule<boolean>(why),
      threshold: notApplicableMunicipalRule<PetitionThreshold>(why),
      windowDays: notApplicableMunicipalRule<number>(why),
    };
  }

  const base =
    row.recallPetitionBase === null ||
    row.recallPetitionBase === "not_applicable"
      ? null
      : (kebab(row.recallPetitionBase) as PetitionSignatureBase);

  return {
    doctrine: knownMunicipalRule(doctrine, source),
    groundsRequired: booleanRule(
      row.recallGroundsRequired,
      row.recallCitation,
      "The corpus does not resolve whether a recall petition must plead legal cause.",
    ),
    threshold:
      base === null || row.recallPetitionPercent === null
        ? unknownMunicipalRule<PetitionThreshold>(
            `No signature requirement is resolved for recall. Mechanics as given: ${row.recallMechanics || "none"}`,
          )
        : knownMunicipalRule(
            { percent: row.recallPetitionPercent, base },
            cite(
              row.recallCitation,
              authorityOf(row.recallCitation),
              row.recallMechanics || null,
            ),
          ),
    windowDays: numberRule(
      row.recallCirculationWindowDays,
      row.recallCitation,
      "The corpus resolves a recall doctrine but no circulation window.",
    ),
  };
}

function compileInitiative(row: CorpusRow, reading: StateReading) {
  const source = cite(
    row.initiativeCitation,
    authorityOf(row.initiativeCitation),
    row.initiativeNotes,
  );
  const exempt = [...row.initiativeExemptSubjects].map(kebab).sort();

  if (reading.initiative.kind === "form-conditional") {
    return {
      form: locallySelectableMunicipalRule(
        reading.initiative.options,
        reading.initiative.statutoryDefault,
        source,
      ),
      threshold: unknownMunicipalRule<PetitionThreshold>(
        `Whether a citizen initiative exists at all depends on a municipal form or charter this corpus does not resolve, so no statewide threshold applies. Read from: ${reading.readFrom}`,
      ),
      exempt,
    };
  }

  const form = reading.initiative.form;
  if (form === "prohibited") {
    return {
      form: knownMunicipalRule(form, source),
      threshold: notApplicableMunicipalRule<PetitionThreshold>(
        "State general law authorises no citizen ordinance initiative, so there is no petition to sign.",
      ),
      exempt,
    };
  }

  return {
    form: knownMunicipalRule(form, source),
    threshold: thresholdRule(
      row.initiativePetitionPercent,
      reading.initiativeThreshold,
      row.initiativeCitation,
      reading.readFrom,
    ),
    exempt,
  };
}

function compileReferendum(row: CorpusRow, reading: StateReading) {
  const source = cite(
    row.referendumCitation,
    authorityOf(row.referendumCitation),
    row.referendumNotes,
  );

  if (reading.referendum.kind === "form-conditional") {
    const why = `Whether a protest referendum exists depends on a charter this corpus does not resolve. Read from: ${reading.readFrom}`;
    return {
      availability: locallySelectableMunicipalRule(
        reading.referendum.options,
        null,
        source,
      ),
      windowDays: unknownMunicipalRule<number>(why),
      suspends: unknownMunicipalRule<boolean>(why),
      threshold: unknownMunicipalRule<PetitionThreshold>(why),
    };
  }

  if (reading.referendum.value === "prohibited") {
    const why =
      "State general law provides no protest referendum against municipal ordinances.";
    return {
      availability: knownMunicipalRule<ProtestReferendumAvailability>(
        "prohibited",
        source,
      ),
      windowDays: notApplicableMunicipalRule<number>(why),
      suspends: notApplicableMunicipalRule<boolean>(why),
      threshold: notApplicableMunicipalRule<PetitionThreshold>(why),
    };
  }

  return {
    availability: knownMunicipalRule<ProtestReferendumAvailability>(
      "available",
      source,
    ),
    windowDays: numberRule(
      row.protestReferendumWindowDays,
      row.referendumCitation,
      `A protest referendum exists but the corpus resolves no filing window. Notes: ${row.referendumNotes || "none"}`,
    ),
    suspends: booleanRule(
      row.protestReferendumSuspendsOrdinance,
      row.referendumCitation,
      "The corpus does not resolve whether a certified petition suspends the ordinance.",
    ),
    threshold: thresholdRule(
      row.protestReferendumPercent,
      reading.referendumThreshold,
      row.referendumCitation,
      reading.readFrom,
    ),
  };
}

function compileVacancy(row: CorpusRow) {
  const rule = kebab(row.vacancyRule) as MunicipalVacancyRule;
  const source = cite(row.vacancyCitation, authorityOf(row.vacancyCitation));
  const cutoff =
    rule === "party-precinct-committeeperson-caucus"
      ? notApplicableMunicipalRule<number>(
          "A party caucus fills the seat outright; no special-election cutoff exists to cross.",
        )
      : numberRule(
          row.vacancySpecialElectionCutoffMonths,
          row.vacancyCitation,
          "The corpus resolves a vacancy rule but no months-remaining cutoff for a special election.",
        );
  return {
    rule: knownMunicipalRule(rule, source),
    specialElectionCutoffMonths: cutoff,
    partyCaucusSuccession: booleanRule(
      row.vacancyPartyCaucusSuccession,
      row.vacancyCitation,
      "The corpus does not resolve whether a party caucus fills the seat.",
    ),
    citizenPetitionOverride: booleanRule(
      row.vacancyCitizenOverride,
      row.vacancyCitation,
      "The corpus does not resolve whether citizens may petition a special election.",
    ),
  };
}

function compilePack(row: CorpusRow): MunicipalElectionRulePack {
  const reading = READINGS[row.usps];
  if (!reading) {
    throw new Error(`No reading is recorded for ${row.usps}.`);
  }

  const runoff = compileRunoff(row, reading);
  const recall = compileRecall(row);
  const initiative = compileInitiative(row, reading);
  const referendum = compileReferendum(row, reading);

  const pack: MunicipalElectionRulePack = {
    usps: row.usps,
    stateName: row.stateName,
    optionFamily: kebab(row.optionFamily) as MunicipalOptionFamily,
    homeRuleFoundation: knownMunicipalRule(
      kebab(row.homeRuleFoundation) as HomeRuleFoundation,
      cite(row.homeRuleAuthority, authorityOf(row.homeRuleAuthority)),
    ),
    electoral: {
      ballotStructure: knownMunicipalRule(
        kebab(row.ballotStructure) as MunicipalBallotStructure,
        cite(row.ballotCitation, authorityOf(row.ballotCitation)),
      ),
      electionTiming: compileElectionTiming(row),
      runoffRule: runoff.rule,
      majorityTriggerPercent: runoff.trigger,
      administration: knownMunicipalRule(
        kebab(row.electionAdministration) as ElectionAdministrationModel,
        cite(
          row.electionAdministrationCitation,
          authorityOf(row.electionAdministrationCitation),
          row.electionCostRule,
        ),
      ),
    },
    vacancy: compileVacancy(row),
    directDemocracy: {
      recallDoctrine: recall.doctrine,
      recallGroundsRequired: recall.groundsRequired,
      recallPetitionThreshold: recall.threshold,
      recallCirculationWindowDays: recall.windowDays,
      initiativeForm: initiative.form,
      initiativePetitionThreshold: initiative.threshold,
      initiativeExemptSubjects: initiative.exempt,
      protestReferendum: referendum.availability,
      protestReferendumWindowDays: referendum.windowDays,
      protestReferendumSuspendsOrdinance: referendum.suspends,
      protestReferendumThreshold: referendum.threshold,
    },
  };

  assertMunicipalElectionRulePack(pack);
  return pack;
}

/**
 * Every compiled pack, keyed by USPS code and frozen.
 *
 * Compilation happens once at module load and throws rather than degrading: a
 * corpus row the readings do not cover, or a pack that contradicts itself, is a
 * failure to fix, not a jurisdiction to skip.
 */
export const MUNICIPAL_ELECTION_RULE_PACKS: Readonly<
  Record<string, MunicipalElectionRulePack>
> = Object.freeze(
  Object.fromEntries(
    [...corpus.jurisdictions]
      .sort((a, b) => a.usps.localeCompare(b.usps))
      .map((row) => [row.usps, compilePack(row)] as const),
  ),
);

/** Every jurisdiction in the wave, in a stable order. */
export const MUNICIPAL_RULE_PACK_JURISDICTIONS: readonly string[] =
  Object.freeze(Object.keys(MUNICIPAL_ELECTION_RULE_PACKS));

/**
 * The pack for a state, or null.
 *
 * Null means this wave does not carry the jurisdiction; it never means the
 * jurisdiction has no municipal law.
 */
export function municipalRulePackFor(
  usps: string,
): MunicipalElectionRulePack | null {
  return MUNICIPAL_ELECTION_RULE_PACKS[usps.toUpperCase()] ?? null;
}
