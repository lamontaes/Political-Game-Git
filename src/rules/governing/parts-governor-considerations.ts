// STOPGAP RULES3-GOV-090: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/governor-bill-decision.ts :: governorConsiderations.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 207: principles.optionKey === "vote-yea"           ? "governor:principle:for"           : "governor:principle:against" */
export function governorConsiderationsRule1(facts: {
  readonly principlesOptionKey: string;
}) {
  return facts.principlesOptionKey === "vote-yea"
    ? "governor:principle:for"
    : "governor:principle:against";
}

/** Legacy line 210: principles.optionKey === "vote-yea" ? BILL_SIGN : BILL_RETURN */
export function governorConsiderationsRule2(facts: {
  readonly principlesOptionKey: string;
  readonly BILL_SIGN: string;
  readonly BILL_RETURN: string;
}) {
  return facts.principlesOptionKey === "vote-yea"
    ? facts.BILL_SIGN
    : facts.BILL_RETURN;
}

/** Legacy line 212: principles.optionKey === "vote-yea"           ? "The bill does what the governor's principles call for."           : "The bill cuts against the governor's principles." */
export function governorConsiderationsRule3(facts: {
  readonly principlesOptionKey: string;
}) {
  return facts.principlesOptionKey === "vote-yea"
    ? "The bill does what the governor's principles call for."
    : "The bill cuts against the governor's principles.";
}

/** Legacy line 218: measure.sponsorPersonId ? [measure.sponsorPersonId] : [] */
export function governorConsiderationsRule4(facts: {
  readonly measureSponsorPersonId: string | null;
  readonly measureSponsorPersonId2: unknown[];
}) {
  return facts.measureSponsorPersonId! ? facts.measureSponsorPersonId2 : [];
}

/** Legacy line 224: backerParty ? [backerParty] : [] */
export function governorConsiderationsRule5(facts: {
  readonly backerParty: string | null;
  readonly backerParty2: string[];
}) {
  return facts.backerParty! ? facts.backerParty2 : [];
}

/** Legacy line 227: party && backerParties.has(party) */
export function governorConsiderationsRule6(facts: {
  readonly party: string | null;
  readonly backerPartiesHasParty: boolean;
}) {
  return facts.party! && facts.backerPartiesHasParty;
}

/** Legacy line 238: party && backerParties.size > 0 */
export function governorConsiderationsRule7(facts: {
  readonly party: string | null;
  readonly backerPartiesSize: number;
}) {
  return facts.party! && facts.backerPartiesSize > 0;
}

/** Legacy line 250: own.yea !== own.nay */
export function governorConsiderationsRule8(facts: {
  readonly ownYea: number;
  readonly ownNay: number;
}) {
  return facts.ownYea !== facts.ownNay;
}

/** Legacy line 253: own.yea > own.nay           ? "governor:party-voted-for"           : "governor:party-voted-against" */
export function governorConsiderationsRule9(facts: {
  readonly ownYea: number;
  readonly ownNay: number;
}) {
  return facts.ownYea > facts.ownNay
    ? "governor:party-voted-for"
    : "governor:party-voted-against";
}

/** Legacy line 256: own.yea > own.nay ? BILL_SIGN : BILL_RETURN */
export function governorConsiderationsRule10(facts: {
  readonly ownYea: number;
  readonly ownNay: number;
  readonly BILL_SIGN: string;
  readonly BILL_RETURN: string;
}) {
  return facts.ownYea > facts.ownNay ? facts.BILL_SIGN : facts.BILL_RETURN;
}

/** Legacy line 262: own.yea > own.nay           ? `The governor's party voted for it in the legislature, ${own.yea} to ${own.nay}.`           : `The governor's party voted against it in the legislature, ${own.nay} to ${own.yea}.` */
export function governorConsiderationsRule11(facts: {
  readonly ownYea: number;
  readonly ownNay: number;
}) {
  return facts.ownYea > facts.ownNay
    ? `The governor's party voted for it in the legislature, ${facts.ownYea} to ${facts.ownNay}.`
    : `The governor's party voted against it in the legislature, ${facts.ownNay} to ${facts.ownYea}.`;
}

/** Legacy line 288: reason.direction === "opposes"           ? {               ...reason,               optionKey: BILL_RETURN,               direction: "supports" as const,             }           : reason */
export function governorConsiderationsRule12(facts: {
  readonly reasonDirection: string;
  readonly reasonOptionKeyBILL_RETURNDirectionSupportsAsConst: unknown;
  readonly reason: unknown;
}) {
  return facts.reasonDirection === "opposes"
    ? facts.reasonOptionKeyBILL_RETURNDirectionSupportsAsConst
    : facts.reason;
}
