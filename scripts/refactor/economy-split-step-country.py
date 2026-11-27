#!/usr/bin/env python3
"""Economy item 4: split stepCountry (src/core2/country-model.ts) into named
steps, moving its statements verbatim. The month's running sums (what the
nation took in, what firms paid out, sales and so on) live in one `sums`
object made once per month, so a step adds to the same numbers in the same
order as before; nothing is reordered, renamed or tidied. Structure only: the
records digest stays identical. Re-run on a clean copy of the file."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "src/core2/country-model.ts"
lines = PATH.read_text().split("\n")

def find(prefix, start=0):
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    sys.exit(f"missing: {prefix!r}")

top = find("export function stepCountry(")
doc = top - 1
assert lines[doc].startswith("/** One month for the whole country"), "doc line moved"
end = next(i for i in range(top, len(lines)) if lines[i] == "}")  # the function's closing brace

def at(prefix, start):
    return find(prefix, start)

# Boundaries (0-based line indexes) read from the function itself.
i_setup = at("  const { law, policyRate } = input;", top)
i_forEach = at("  tier.states.forEach((state, index) => {", top)
i_plans_start = i_forEach + 1                     # const wanted = made[index]!;
i_match = at("    // People and openings find each other with friction.", top)
i_floor = at("    const floor = law.wageFloorYear(state)", top)
i_ledger = at("    // The ledger: what it took in,", top)
i_twelve = at("    // Twelve months are kept; older ones are dropped,", top)
i_settle = i_twelve + 2                           # elsewhere += state.ledger.passedOn ...
i_forEach_end = at("  });", i_settle)
i_close = i_forEach_end + 1

TOTALS = ["federal", "elsewhere", "paidOut", "salesTotal", "pricedTotal", "realTotal", "wantedReal", "normalReal"]
pat = re.compile(r"(?<![\w.])(" + "|".join(TOTALS) + r")\b(?!:)")

def totals(text):
    return pat.sub(r"sums.\1", text)

def block(a, b):
    return "\n".join(lines[a:b])

# The setup, up to the totals declaration, then the totals as one object.
i_let = at("  let federal = 0,", i_setup)
i_totals_loop = at("  for (const sector of COUNTRY_SECTORS)", i_let)
setup_a = block(i_setup, i_let)
setup_c = totals(block(i_totals_loop, i_forEach))

new = []
new.append(lines[doc])
new.append("export function stepCountry(")
new.append("  tier: CountryTier,")
new.append("  input: CountryStep,")
new.append("  rules: CountryRules,")
new.append("): CountryMonth {")
new.append("  const month = openMonth(tier, input, rules);")
new.append("  tier.states.forEach((state, index) => stepState(month, state, index));")
new.append("  return closeMonth(month);")
new.append("}")
new.append("")

body = []
body.append('''/** What a month holds while its states step: the month's inputs, the shares taken out and put back, who moved, and the running sums. */
interface MonthRun {
  tier: CountryTier;
  rules: CountryRules;
  law: CountryStep["law"];
  policyRate: number;
  jobsLost: CountryStep["jobsLost"];
  months: number;
  first: boolean;
  parts: Map<CountryState, NonNullable<ReturnType<NonNullable<CountryStep["parts"]>>>>;
  takenBy: Map<CountryState, ReturnType<typeof takeOutPart>>;
  jobsAtStart: number[][];
  moved: ReturnType<typeof moves>;
  lives: ReturnType<typeof people>;
  outsideDemand: number;
  outsidePrices: number;
  traded: ReturnType<typeof zeroBySector>;
  made: ReturnType<typeof demands>[];
  supply: ReturnType<typeof zeroBySector>;
  supplyOf: (row: SectorCell) => number;
  otherBuyersOf: (row: SectorCell) => number;
  sums: {
    federal: number;
    elsewhere: number;
    paidOut: number;
    salesTotal: number;
    pricedTotal: number;
    realTotal: number;
    wantedReal: number;
    normalReal: number;
  };
}

/** One state's sectors, as the month plans them: what each sold, the staff it needs, and the jobs it ends and posts. */
interface SectorPlan {
  row: SectorCell;
  sold: number;
  staffNeeded: number;
  ended: number;
  posted: number;
}
''')

# openMonth
body.append("/** The month opens: shares taken out, who moved, was born, aged and died, what each state wants, and the traded goods' supply. */")
body.append("function openMonth(\n  tier: CountryTier,\n  input: CountryStep,\n  rules: CountryRules,\n): MonthRun {")
body.append(setup_a)
body.append('''  const sums = {
    federal: 0,
    elsewhere: 0,
    paidOut: 0,
    salesTotal: 0,
    pricedTotal: 0,
    realTotal: 0,
    wantedReal: 0,
    normalReal: 0,
  };''')
body.append(setup_c)
body.append('''  return {
    tier,
    rules,
    law,
    policyRate,
    jobsLost: input.jobsLost,
    months,
    first,
    parts,
    takenBy,
    jobsAtStart,
    moved,
    lives,
    outsideDemand,
    outsidePrices,
    traded,
    made,
    supply,
    supplyOf,
    otherBuyersOf,
    sums,
  };
}
''')

# stepState
body.append('''/** One state's month: its sectors plan, people and openings meet, prices and pay move, the ledger is kept, and its books close. */
function stepState(month: MonthRun, state: CountryState, index: number): void {
  const wanted = month.made[index]!;
  const { plans, ended, posted } = planSectors(month, state, wanted);
  const { hires, tightness, payGrowthYear } = matchWorkers(month, state, wanted, ended, posted);
  const { profitTax, jobsAdded } = repriceSectors(month, state, wanted, plans, posted, hires, payGrowthYear);
  keepLedger(month, state, index, wanted, plans, profitTax, jobsAdded);
  settleBooks(month, state, wanted, tightness);
}
''')

pre = "  const { tier, rules, law, policyRate, months, first, parts, jobsAtStart, moved, lives, traded, supply, supplyOf, otherBuyersOf, sums } = month;"

def step(name, doc_line, params, ret_type, a, b, uses, ret, fix=()):
    out = [doc_line, f"function {name}(", *[f"  {p}," for p in params], f"): {ret_type} {{"]
    out.append("  const { " + ", ".join(uses) + " } = month;")
    text = totals(block(a, b))
    for old, new in fix:
        if old not in text:
            sys.exit(f"{name}: expected text not found: {old!r}")
        text = text.replace(old, new, 1)
    out.append(text)
    if ret:
        out.append(ret)
    out.append("}\n")
    body.append("\n".join(out))

# 1. plans: `const wanted = made[index]!;` is taken by the caller.
step("planSectors",
     "/** What each of the state's sectors sells and the staff it wants, and the jobs it ends and posts. */",
     ["month: MonthRun", "state: CountryState", "wanted: MonthRun[\"made\"][number]"],
     "{ plans: SectorPlan[]; ended: number; posted: number }",
     i_plans_start + 1, i_match,
     ["rules", "first", "parts", "traded", "supply", "supplyOf", "otherBuyersOf", "jobsLost", "sums"],
     "  return { plans, ended, posted };",
     fix=[("input.jobsLost?.(state)", "jobsLost?.(state)"),
          ("      posted = 0,\n      profitTax = 0;", "      posted = 0;")])
step("matchWorkers",
     "/** People and openings find each other with friction; pay grows with how hard workers are to find. */",
     ["month: MonthRun", "state: CountryState", "wanted: MonthRun[\"made\"][number]", "ended: number", "posted: number"],
     "{ hires: number; tightness: number; payGrowthYear: number }",
     i_match, i_floor,
     ["rules", "first"],
     "  return { hires, tightness, payGrowthYear };")
step("repriceSectors",
     "/** The month's books for each sector, its price and pay moves, and the state's price level. */",
     ["month: MonthRun", "state: CountryState", "wanted: MonthRun[\"made\"][number]", "plans: SectorPlan[]", "posted: number", "hires: number", "payGrowthYear: number"],
     "{ profitTax: number; jobsAdded: number[] }",
     i_floor, i_ledger,
     ["rules", "law", "months", "sums"],
     "  return { profitTax, jobsAdded };",
     fix=[("  const floor =", "  let profitTax = 0;\n  const floor =")])
step("keepLedger",
     "/** The state's ledger: what it took in, what it paid out, and the month kept for what moved. */",
     ["month: MonthRun", "state: CountryState", "index: number", "wanted: MonthRun[\"made\"][number]", "plans: SectorPlan[]", "profitTax: number", "jobsAdded: number[]"],
     "void",
     i_ledger, i_twelve + 2,
     ["tier", "months", "jobsAtStart", "moved", "lives"],
     None)
step("settleBooks",
     "/** What the state's month leaves for the nation's and the rest of the world's books, and how the job market is read next month. */",
     ["month: MonthRun", "state: CountryState", "wanted: MonthRun[\"made\"][number]", "tightness: number"],
     "void",
     i_settle, i_forEach_end,
     ["rules", "sums"],
     None,
     fix=[("    state.usualTightness +=\n      (tightness - state.usualTightness) / rules.usualTightnessMonths;",
           "    state.usualTightness =\n      state.usualTightness! +\n      (tightness - state.usualTightness!) / rules.usualTightnessMonths;")])
# closeMonth
body.append("/** The month closes: what firms paid out reaches their owners, the held places go back in, prices and expectations move, and the month's totals are read. */")
body.append("function closeMonth(month: MonthRun): CountryMonth {")
body.append("  const { tier, rules, policyRate, months, parts, takenBy, moved, lives, outsideDemand, outsidePrices, sums } = month;")
body.append(totals(block(i_close, end)))
body.append("}")
new_text = "\n".join(new) + "\n" + "\n".join(body)

lines[doc:end + 1] = new_text.split("\n")
PATH.write_text("\n".join(lines))
print("stepCountry split into openMonth, stepState (planSectors, matchWorkers, repriceSectors, keepLedger, settleBooks) and closeMonth")
