/**
 * Filing terms written as formulas in the research (`filing-requirements.json`):
 * a signature count as a share of the district's voters, with caps and
 * floors. Each read is marked as an estimate where the formula leaves a
 * choice. Filing fees are not read: no one pays to file (owner, Oct 13).
 */
export interface FormulaRead {
  readonly value: number;
  readonly estimate: boolean;
  readonly basis: string;
}

const money = (text: string) => Number(text.replace(/[$,]/g, ""));

/**
 * A signature count from its formula and the district's electorate:
 * registered voters, or votes cast (for the office or for governor), with
 * "whichever is less" caps, "capped at" caps and minimums.
 */
export function signaturesFromFormula(
  formula: string,
  base: {
    readonly registered: number;
    readonly votesCast: number;
    /** The state's congressional districts, for "N from each district" rules. */
    readonly districts?: number;
  },
): FormulaRead | null {
  const text = formula.toLowerCase();
  const each = /([\d,]+) from each congressional district/.exec(text);
  if (each)
    return {
      value: money(each[1]!) * Math.max(1, base.districts ?? 1),
      estimate: base.districts === undefined,
      basis: formula,
    };
  // "1,500 or 10% of …, whichever is less"
  const lesserFirst =
    /^([\d,]+) or (\d+(?:\.\d+)?)% of (.*?), whichever is less/.exec(text);
  if (lesserFirst) {
    const registered = /regist|eligible|qualified|active/.test(lesserFirst[3]!);
    const share = Math.ceil(
      (Number(lesserFirst[2]) / 100) *
        (registered ? base.registered : base.votesCast),
    );
    return {
      value: Math.min(money(lesserFirst[1]!), share),
      estimate: true,
      basis: `${formula} (base from the 2024 vote)`,
    };
  }
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
