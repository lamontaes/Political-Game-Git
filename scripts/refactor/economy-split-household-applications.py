#!/usr/bin/env python3
"""Economy item 4: split householdApplications (src/core2/modules/credit.ts)
into named steps, moving its statements verbatim: the setup that reads the
market and the loans (`openApplications`), each household's shortfall and the
quote it would get (`quoteShortfall`), the bank's answer (`askBank`) and the
storefront lender's (`askStorefront`). The room each lender has left is kept on
one `run` object, so every step reads and writes the same numbers in the same
order. Nothing is reordered or tidied. Structure only: the records digest stays
identical. Re-run on a clean copy of the file."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "src/core2/modules/credit.ts"
lines = PATH.read_text().split("\n")

def find(prefix, start=0):
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    sys.exit(f"missing: {prefix!r}")

top = find("function householdApplications(")
# the doc comment above it stays on the main function
end = next(i for i in range(top, len(lines)) if lines[i] == "}")
i_c = find("  const c = core(api),", top)
i_prime = find("  const prime = (", i_c)
i_early = find("  if (prime === undefined) return room;", i_prime)
i_after_early = i_early + 1
i_lender_room = find("  let lenderRoom = lender?.roomMinor ?? 0;", top)
i_loop = find("  // The town's bank and its storefront lender serve the town's households:", i_lender_room)
i_for_end = end - 2  # the loop's closing "  }" is the line before "  return room;"
assert lines[i_for_end] == "  }" and lines[end - 1] == "  return room;", "end of function moved"
i_open_loan = find("    // stopgapId: SG-WORLD-small-dollar-one-open-loan", i_loop)
i_lent = find("    let lent = 0;", i_open_loan)
i_store = find("    // The storefront is in the bank's town, whose households alone apply here.", i_lent)
i_lender_gate = find("    if (lent > 0 || !lender || lenderRoom <= 0) continue;", i_store)
i_store_body = find("    // stopgapId: SG-WORLD-small-dollar-one-lender", i_lender_gate)

def block(a, b):
    return "\n".join(lines[a:b])

def room(text):
    text = re.sub(r"(?<![\w.])room\b(?!\w)", "run.room", text)
    return re.sub(r"(?<![\w.])lenderRoom\b", "run.lenderRoom", text)

setup = (
    block(i_c, i_prime)
    + "\n"
    + block(i_prime, i_early)
    + "\n  if (prime === undefined) return null;\n"
    + block(i_after_early, i_lender_room + 1)
)
loop_head = lines[i_loop:i_open_loan]  # comment + for ( ... ) {
quote_text = room(block(i_open_loan, i_lent)).replace("continue;", "return null;")
bank_text = room(block(i_lent, i_store))
store_text = room(block(i_store_body, i_for_end)).replace("continue;", "return;")

out = []
out.append("function householdApplications(")
out.append("  api: CoreAPI,\n  bankId: string,\n  appetite: number,\n  room: number,\n): number {")
out.append("  const run = openApplications(api, bankId, appetite, room);")
out.append("  if (!run) return room;")
out.extend(loop_head[:-1] if False else [])
# the for statement header (everything from the comment to the line ending with "{")
out.append("\n".join(loop_head).replace("c.organizations", "run.c.organizations"))
out.append("    const quote = quoteShortfall(run, household);")
out.append("    if (!quote) continue;")
out.append("    // The bank answers first; the storefront lender only when the bank wrote no loan.")
out.append("    const lent = askBank(run, quote);")
out.append("    if (lent > 0 || !run.lender || run.lenderRoom <= 0) continue;")
out.append("    askStorefront(run, quote);")
out.append("  }")
out.append("  return run.room;")
out.append("}")
out.append("")
out.append('''/** What one run of the month's household applications holds: the market, the loans on the books, and the room each lender has left. */
interface ApplicationRun {
  api: CoreAPI;
  c: CoreState;
  p: (key: string) => number;
  bankId: string;
  appetite: number;
  marketRate: number;
  cap: ReturnType<typeof lawInForce> | undefined;
  federalCap: ReturnType<typeof lawInForce> | undefined;
  town: string | undefined;
  owing: Set<string>;
  reported: Set<string>;
  defaulted: Map<string, string>;
  lender: ReturnType<typeof smallLender>;
  room: number;
  lenderRoom: number;
}

/** A household with a real shortfall, and the rate and law the quote it would get answers to. */
interface ShortfallQuote {
  household: BorrowingHousehold;
  head: BorrowingHousehold["members"][number];
  costs: number;
  income: number;
  amount: number;
  need: number;
  rate: number;
  ceiling: number | null;
  lawId: string | null;
  governing: { key: string; lawId: string } | null;
}
''')
out.append("/** The month's market and the loans on the books: the rate a household would be quoted, who owes, whose charge-off is reported, and each lender's room. */")
out.append("function openApplications(\n  api: CoreAPI,\n  bankId: string,\n  appetite: number,\n  room: number,\n): ApplicationRun | null {")
out.append(setup.replace("let lenderRoom =", "const lenderRoom ="))
out.append('''  return {
    api,
    c,
    p,
    bankId,
    appetite,
    marketRate,
    cap,
    federalCap,
    town,
    owing,
    reported,
    defaulted,
    lender,
    room,
    lenderRoom,
  };
}
''')
USES_Q = "api, p, marketRate, cap, federalCap, town, owing, lender"
out.append("/** Whether a household is short of money and what the quote it would get answers to; none when it owes already, is out of reach or is not short. */")
out.append("function quoteShortfall(\n  run: ApplicationRun,\n  household: BorrowingHousehold,\n): ShortfallQuote | null {")
out.append(f"  const {{ {USES_Q} }} = run;")
out.append(quote_text)
out.append("  return {\n    household,\n    head,\n    costs,\n    income,\n    amount,\n    need,\n    rate,\n    ceiling,\n    lawId,\n    governing,\n  };\n}\n")
out.append("/** The bank's answer to a household's shortfall: its application, and the loan when it writes one. Returns what it lent. */")
out.append("function askBank(run: ApplicationRun, quote: ShortfallQuote): number {")
out.append("  const { api, c, p, bankId, appetite, marketRate, reported } = run;")
out.append("  const { household, head, costs, income, amount, need, rate, ceiling, lawId } = quote;")
out.append(bank_text)
out.append("  return lent;\n}\n")
out.append("/** The storefront lender's answer to a household the bank did not lend to: its application, and the loan when it writes one. */")
out.append("function askStorefront(run: ApplicationRun, quote: ShortfallQuote): void {")
out.append("  const { api, c, p, defaulted } = run;")
out.append("  const lender = run.lender!;")
out.append("  const { household, head, income, amount, need, ceiling, lawId, governing } = quote;")
out.append(store_text)
out.append("}")

lines[top:end + 1] = "\n".join(out).split("\n")
PATH.write_text("\n".join(lines))
print("householdApplications split into openApplications, quoteShortfall, askBank and askStorefront")
