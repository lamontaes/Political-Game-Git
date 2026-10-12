/**
 * Filing terms written as formulas in the research (`filing-requirements.json`):
 * a fee as a share of the office's salary, a signature count as a share of
 * the district's voters, with caps and floors. Each read is marked as an
 * estimate where the formula leaves a choice (a fee the party sets, a range).
 */
export interface FormulaRead {
  readonly value: number;
  readonly estimate: boolean;
  readonly basis: string;
}

const money = (text: string) => Number(text.replace(/[$,]/g, ""));

/** A filing fee, in dollars, from its formula and the office's annual salary. */
export function feeFromFormula(
  formula: string,
  annualSalary: number | null,
  termYears: number | null,
): FormulaRead | null {
  const text = formula.toLowerCase();
  const pct =
    /(\d+(?:\.\d+)?)%\s+of\s+(?:the\s+)?(?:office's\s+)?(?:base\s+)?(?:total\s+)?(?:annual\s+|first year's\s+)?(?:base\s+)?salary/.exec(
      text,
    );
  const fraction = /1\/8 of 1%/.test(text) ? 0.125 : null;
  const constant = /^\$(\d[\d,]*)\s*\+/.exec(text);
  const fullTerm = /full term|for the full term|term's total/.test(text);
  if ((pct || fraction !== null) && annualSalary !== null) {
    const rate = (fraction ?? Number(pct![1])) / 100;
    const years = fullTerm ? (termYears ?? 4) : 1;
    let fee =
      rate * annualSalary * years + (constant ? money(constant[1]!) : 0);
    const minimum = /minimum \$(\d[\d,]*)/.exec(text);
    if (minimum) fee = Math.max(fee, money(minimum[1]!));
    const waived = /waived if \$(\d[\d,]*) or less/.exec(text);
    if (waived && fee <= money(waived[1]!)) fee = 0;
    const capped = /capped at (\d+(?:\.\d+)?)%/.exec(text);
    const setByParty = /set by (?:the )?(?:county )?party/.test(text);
    return {
      value: Math.round(fee * 100) / 100,
      estimate:
        setByParty ||
        !!capped ||
        /estimate|historically|often|commonly/.test(text),
      basis: formula,
    };
  }
  // A range ("commonly $0-$50", "between $500 and $2,500"): its middle.
  const range =
    /\$(\d[\d,]*)\s*(?:-|to|and)\s*\$(\d[\d,]*)/.exec(text) ??
    /between \$(\d[\d,]*) and \$(\d[\d,]*)/.exec(text);
  if (range)
    return {
      value: (money(range[1]!) + money(range[2]!)) / 2,
      estimate: true,
      basis: `${formula} (middle of the range)`,
    };
  const flat = /\$(\d[\d,]*)/.exec(text);
  if (flat) return { value: money(flat[1]!), estimate: true, basis: formula };
  return null;
}

/**
 * A signature count from its formula and the district's electorate:
 * registered voters, or votes cast (for the office or for governor), with
 * "whichever is less" caps, "capped at" caps and minimums.
 */
export function signaturesFromFormula(
  formula: string,
  base: { readonly registered: number; readonly votesCast: number },
): FormulaRead | null {
  const text = formula.toLowerCase();
  const inLieu = /(\d[\d,]*) in-lieu signatures/.exec(text);
  if (inLieu)
    return { value: money(inLieu[1]!), estimate: false, basis: formula };
  const nominating = /(\d+)-(\d+) nomination signatures/.exec(text);
  if (nominating)
    return { value: Number(nominating[1]), estimate: false, basis: formula };
  const pct = /(\d+(?:\.\d+)?)%\s+of\s+(?:the\s+)?(.*)/.exec(text);
  if (!pct) {
    const flat = /(\d[\d,]*)\s+(?:signatures|voters)/.exec(text);
    return flat
      ? {
          value: money(flat[1]!),
          estimate: /estimate/.test(text),
          basis: formula,
        }
      : null;
  }
  const rate = Number(pct[1]) / 100;
  const of = pct[2]!;
  const registered = /regist|eligible|qualified|active/.test(of);
  let count = Math.ceil(rate * (registered ? base.registered : base.votesCast));
  const lesser = /or ([\d,]+), whichever is less/.exec(text);
  if (lesser) count = Math.min(count, money(lesser[1]!));
  const cap = /capped at ([\d,]+)/.exec(text);
  if (cap) count = Math.min(count, money(cap[1]!));
  const minimum = /minimum (\d[\d,]*)|or (\d[\d,]*)$/.exec(text);
  if (minimum && /minimum/.test(text))
    count = Math.max(count, money(minimum[1]!));
  return {
    value: count,
    // The electorate behind the share is read from 2024's vote.
    estimate: true,
    basis: `${formula} (base from the 2024 vote)`,
  };
}
