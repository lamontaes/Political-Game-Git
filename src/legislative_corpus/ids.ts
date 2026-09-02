/**
 * Deterministic Stable ID Generation for Legislative Source Records
 *
 * Ensures IDs are:
 * 1. Independent of enumeration/traversal order;
 * 2. Globally unique across jurisdictions and providers;
 * 3. Human-readable and debuggable;
 * 4. Deterministic across rebuilds.
 */

export function sanitizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeJurisdictionKey(providerOrName: string): string {
  const cleaned = providerOrName.toLowerCase().trim();

  // Handle Open States OCD IDs: ocd-jurisdiction/country:us/state:ky/government
  const ocdMatch = cleaned.match(
    /country:us\/(state|territory|district):([a-z]{2})/,
  );
  if (ocdMatch && ocdMatch[2]) {
    return `us_${ocdMatch[2]}`;
  }
  if (cleaned.startsWith("us_")) {
    return cleaned;
  }
  if (
    cleaned.includes("country:us/government") ||
    cleaned === "us" ||
    cleaned === "congress" ||
    cleaned === "federal"
  ) {
    return "us_fed";
  }

  // Handle state abbreviations or names
  const stateMap: Record<string, string> = {
    al: "us_al",
    alabama: "us_al",
    ak: "us_ak",
    alaska: "us_ak",
    az: "us_az",
    arizona: "us_az",
    ar: "us_ar",
    arkansas: "us_ar",
    ca: "us_ca",
    california: "us_ca",
    co: "us_co",
    colorado: "us_co",
    ct: "us_ct",
    connecticut: "us_ct",
    de: "us_de",
    delaware: "us_de",
    fl: "us_fl",
    florida: "us_fl",
    ga: "us_ga",
    georgia: "us_ga",
    hi: "us_hi",
    hawaii: "us_hi",
    id: "us_id",
    idaho: "us_id",
    il: "us_il",
    illinois: "us_il",
    in: "us_in",
    indiana: "us_in",
    ia: "us_ia",
    iowa: "us_ia",
    ks: "us_ks",
    kansas: "us_ks",
    ky: "us_ky",
    kentucky: "us_ky",
    la: "us_la",
    louisiana: "us_la",
    me: "us_me",
    maine: "us_me",
    md: "us_md",
    maryland: "us_md",
    ma: "us_ma",
    massachusetts: "us_ma",
    mi: "us_mi",
    michigan: "us_mi",
    mn: "us_mn",
    minnesota: "us_mn",
    ms: "us_ms",
    mississippi: "us_ms",
    mo: "us_mo",
    missouri: "us_mo",
    mt: "us_mt",
    montana: "us_mt",
    ne: "us_ne",
    nebraska: "us_ne",
    nv: "us_nv",
    nevada: "us_nv",
    nh: "us_nh",
    new_hampshire: "us_nh",
    "new hampshire": "us_nh",
    nj: "us_nj",
    new_jersey: "us_nj",
    "new jersey": "us_nj",
    nm: "us_nm",
    new_mexico: "us_nm",
    "new mexico": "us_nm",
    ny: "us_ny",
    new_york: "us_ny",
    "new york": "us_ny",
    nc: "us_nc",
    north_carolina: "us_nc",
    "north carolina": "us_nc",
    nd: "us_nd",
    north_dakota: "us_nd",
    "north dakota": "us_nd",
    oh: "us_oh",
    ohio: "us_oh",
    ok: "us_ok",
    oklahoma: "us_ok",
    or: "us_or",
    oregon: "us_or",
    pa: "us_pa",
    pennsylvania: "us_pa",
    ri: "us_ri",
    rhode_island: "us_ri",
    "rhode island": "us_ri",
    sc: "us_sc",
    south_carolina: "us_sc",
    "south carolina": "us_sc",
    sd: "us_sd",
    south_dakota: "us_sd",
    "south dakota": "us_sd",
    tn: "us_tn",
    tennessee: "us_tn",
    tx: "us_tx",
    texas: "us_tx",
    ut: "us_ut",
    utah: "us_ut",
    vt: "us_vt",
    vermont: "us_vt",
    va: "us_va",
    virginia: "us_va",
    wa: "us_wa",
    washington: "us_wa",
    wv: "us_wv",
    west_virginia: "us_wv",
    "west virginia": "us_wv",
    wi: "us_wi",
    wisconsin: "us_wi",
    wy: "us_wy",
    wyoming: "us_wy",
    dc: "us_dc",
    "district of columbia": "us_dc",
    "washington dc": "us_dc",
    "washington, d.c.": "us_dc",
    pr: "us_pr",
    "puerto rico": "us_pr",
    us: "us_fed",
    congress: "us_fed",
    federal: "us_fed",
    united_states: "us_fed",
  };

  const direct = stateMap[cleaned];
  if (direct) {
    return direct;
  }

  return `us_${sanitizeKey(cleaned)}`;
}

export function buildSessionId(
  jurisdictionKey: string,
  sessionIdentifier: string,
): string {
  const normJur = normalizeJurisdictionKey(jurisdictionKey);
  const normSess = sanitizeKey(sessionIdentifier);
  return `${normJur}_${normSess}`;
}

export function buildMeasureId(
  jurisdictionKey: string,
  sessionIdentifier: string,
  billIdentifier: string,
): string {
  const normJur = normalizeJurisdictionKey(jurisdictionKey);
  const normSess = sanitizeKey(sessionIdentifier);
  const normBill = sanitizeKey(billIdentifier);
  return `${normJur}_${normSess}_${normBill}`;
}

export function buildTextVersionId(
  measureId: string,
  versionIdOrLabel: string,
): string {
  return `${measureId}_ver_${sanitizeKey(versionIdOrLabel)}`;
}

export function buildActionId(
  measureId: string,
  sequenceIndex: number,
  actionDate: string,
): string {
  const normDate = sanitizeKey(actionDate || "undated");
  return `${measureId}_act_${sequenceIndex}_${normDate}`;
}

export function buildVoteId(
  measureId: string,
  chamber: string,
  date: string,
  sequenceIndex: number = 0,
): string {
  const normChamber = sanitizeKey(chamber);
  const normDate = sanitizeKey(date || "undated");
  return `${measureId}_vote_${normChamber}_${normDate}_${sequenceIndex}`;
}

export function buildSponsorId(
  measureId: string,
  personNameOrId: string,
  orderIndex: number = 0,
): string {
  const normPerson = sanitizeKey(personNameOrId);
  return `${measureId}_sp_${normPerson}_${orderIndex}`;
}
