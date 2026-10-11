// STOPGAP RULES3-GOV-086: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/transit-service.ts :: serviceHoursText.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 96: Math.floor(paidMinorUnits / price) */
export function serviceHoursTextRule1(facts: {
  readonly paidMinorUnits: number;
  readonly price: number;
}) {
  return Math.floor(facts.paidMinorUnits / facts.price);
}

/** Legacy line 97: paidMinorUnits % price */
export function serviceHoursTextRule2(facts: {
  readonly paidMinorUnits: number;
  readonly price: number;
}) {
  return facts.paidMinorUnits % facts.price;
}

/** Legacy line 99: rest === 0       ? String(whole)       : `${whole}.${String(rest)           .padStart(String(price).length - 1, "0")           .replace(/0+$/, "")}` */
export function serviceHoursTextRule3(facts: {
  readonly rest: number;
  readonly whole: number;
  readonly StringRestPadStartStringPriceLength10Replace0$: string;
}) {
  return facts.rest === 0
    ? String(facts.whole)
    : `${facts.whole}.${facts.StringRestPadStartStringPriceLength10Replace0$}`;
}

/** Legacy line 101: String(rest) */
export function serviceHoursTextRule4(facts: { readonly rest: number }) {
  return String(facts.rest);
}

/** Legacy line 102: String(price) */
export function serviceHoursTextRule5(facts: { readonly price: number }) {
  return String(facts.price);
}

/** Legacy line 104: text === "1" ? "hour" : "hours" */
export function serviceHoursTextRule6(facts: { readonly text: string }) {
  return facts.text === "1" ? "hour" : "hours";
}
