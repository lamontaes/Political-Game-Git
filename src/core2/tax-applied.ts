/**
 * Who an income tax reached, recorded where it is collected: each paycheck's
 * withholding (a full worker's, a counted group's) names the tax rows it took
 * and the dollars, against the series "income-tax" and, when the policy
 * questions "adopt an income tax" or "graduated income tax" are law at that
 * level, against those questions too.
 */
import { lawApplied } from "./law-reach/applied";
import { lawInForce } from "./modules/laws";
import type { WithholdingLine } from "./tax-withholding";
import type { CoreAPI } from "./types";

const ADOPT = "us-policy-positions:fiscal.adopt-income-tax";
const GRADUATED = "us-policy-positions:fiscal.graduated-income-tax";
const ENGINE = "core2-budgets-v1";

interface QuestionLaw {
  readonly id: string;
  readonly level: string;
}
interface Questions {
  readonly date: string;
  readonly adopt: QuestionLaw | null;
  readonly graduated: QuestionLaw | null;
}
const held = new WeakMap<object, Questions>();

/** The two questions' laws in force today, read once a day. */
function questions(api: CoreAPI): Questions {
  const seen = held.get(api.state);
  if (seen && seen.date === api.state.date) return seen;
  const read = (key: string): QuestionLaw | null => {
    const answer = lawInForce(api, key);
    const row = answer.governing;
    return answer.value === 1 && row ? { id: row.id, level: row.level } : null;
  };
  const next = {
    date: api.state.date,
    adopt: read(ADOPT),
    graduated: read(GRADUATED),
  };
  held.set(api.state, next);
  return next;
}

/**
 * Record the income tax a payday took from a worker (`target` "person") or
 * from a counted group's workers (`target` "group", `count` workers).
 */
export function recordIncomeTaxApplied(
  api: CoreAPI,
  input: {
    readonly targetId: string;
    readonly target: "person" | "group";
    readonly count: number;
    readonly lines: readonly (Pick<
      WithholdingLine,
      "level" | "tax" | "lawId" | "graduated"
    > & { readonly minor: number })[];
  },
): void {
  const q = questions(api);
  const income = input.lines.filter((l) => l.tax === "income" && l.minor > 0);
  for (const [index, line] of income.entries()) {
    // The most local tax (the last line) is the target's own row; the levels
    // above it each get a row beside it, so no law replaces another's.
    const base = {
      targetId:
        index === income.length - 1
          ? input.targetId
          : `${input.targetId}|${line.level}`,
      target: input.target,
      engine: ENGINE,
      count: input.count,
      amountMinor: line.minor * input.count,
    };
    lawApplied(api, {
      ...base,
      key: "income-tax",
      lawId: line.lawId,
      what: "income-tax-withheld",
    });
    if (q.adopt && q.adopt.level === line.level)
      lawApplied(api, {
        ...base,
        key: ADOPT,
        lawId: q.adopt.id,
        what: "income-tax-withheld",
      });
    if (q.graduated && q.graduated.level === line.level && line.graduated)
      lawApplied(api, {
        ...base,
        key: GRADUATED,
        lawId: q.graduated.id,
        what: "graduated-income-tax-withheld",
      });
  }
}
