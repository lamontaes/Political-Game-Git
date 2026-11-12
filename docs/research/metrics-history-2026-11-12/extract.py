"""Builds history.json from the probe's year-*.json snapshots (Metrics researcher, Nov 12, 2026).

    python3 -I extract.py <probe-out-dir> <history.json> <run-seed>
Every value is read from a record in the snapshot; null where the world had no figure that December.
"""
import json, sys, glob, os

src, dst = sys.argv[1], sys.argv[2]
game = json.load(open(os.path.join(src, "game.json")))
snaps = {int(os.path.basename(p)[5:9]): json.load(open(p)) for p in sorted(glob.glob(os.path.join(src, "year-*.json")))}
years = sorted(snaps)
final = snaps[years[-1]]

def dec(rows_key, field, scale=1.0):
    """The town's world-metrics row of Dec 2 that year."""
    def f(s, y):
        for r in s.get("worldMetricsDecember", []):
            if r["date"].startswith(f"{y}-12") and r.get(field) is not None:
                return r[field] * scale
        return None
    return f

def wm_year_sum(field):
    """Sum of a monthly world-metrics count over the year, from the final snapshot is not possible (only Dec kept in probe) -> use the latest snapshot's kept dates? Read from each December snapshot's monthly rows instead."""
    def f(s, y):
        rows = s.get("worldMetricsYear", None)
        return None
    return f

def web(name):
    def f(s, y):
        w = s.get("webLatest")
        if not w or not w["month"].startswith(f"{y}-12"):
            return None
        return w["values"].get(name)
    return f

def macro(field, scale=1.0):
    def f(s, y):
        m = s.get("macroNow")
        return m[field] * scale if m and m["month"] == f"{y}-12" and m.get(field) is not None else None
    return f

def region(field, scale=1.0):
    def f(s, y):
        r = s["regional"]
        return r["stateNow"][field] * scale if r.get("stateNow") and r.get("latestMonth") == f"{y}-12" else None
    return f

def view(section, key, scale=1.0):
    def f(s, y):
        v = s.get("view") or {}
        for sec in v.get("sections", []):
            if sec["key"] == section:
                for row in sec["rows"]:
                    if row["key"] == key and row["now"] is not None:
                        return row["now"] * scale
        return None
    return f

def budget(level, which, field):
    def f(s, y):
        for g in s.get("budgets") or []:
            if g["level"] == level and g.get(which):
                return g[which][field] / 100.0
        return None
    return f

def budget_fy(level):
    def f(s, y):
        for g in s.get("budgets") or []:
            if g["level"] == level and g.get("latest"):
                return g["latest"]["fiscalYear"]
        return None
    return f

def pop(field):
    return lambda s, y: (s.get("population") or {}).get(field)

def pop_total(s, y):
    p = s.get("population") or {}
    return (p.get("namedPeople") or 0) + (p.get("countedPeople") or 0)

def town_table_latest(table, field, month_key="month"):
    def f(s, y):
        t = (s.get("townTables") or {}).get(table)
        if not t or not t["sample"]:
            return None
        r = t["sample"][-1]
        if str(r.get(month_key, r.get("date", ""))).startswith(str(y)) and r.get(field) is not None:
            return r[field]
        return None
    return f

def crime_reported(s, y):
    t = (s.get("townTables") or {}).get("core2-crime-v1.months")
    if not t or not t["sample"]:
        return None
    r = t["sample"][-1]
    if not r["month"].startswith(f"{y}-12"):
        return None
    return sum(v.get("reported", 0) for v in r["types"].values())

def homeless(s, y):
    t = (s.get("townTables") or {}).get("core2-homeless-count-v1.counts")
    if not t or not t["sample"]:
        return None
    r = t["sample"][-1]
    return r["homeless"] if r["date"].startswith(str(y)) else None

def jobs_panel(field):
    return lambda s, y: (s.get("jobs") or {}).get(field)

def stock(field, scale=1.0):
    def f(s, y):
        st = s.get("stock")
        return st[field] * scale if st and st.get(field) is not None else None
    return f

def approval(s, y):
    t = (s.get("townTables") or {}).get("national-opinion.approval")
    if not t or not t["sample"]:
        return None
    r = t["sample"][-1]
    return r["pct"] if r["month"] == f"{y}-12" else None

def credit_book(field, scale=1.0):
    def f(s, y):
        t = (s.get("townTables") or {}).get("credit.books")
        if not t or not t["sample"]:
            return None
        r = t["sample"][-1]
        return r[field] * scale if r["date"].startswith(f"{y}-12") else None
    return f

def year_count(table, field="date", town_field=None):
    """Event rows dated in that year (from the year's snapshot inventory, when the table kept them all)."""
    def f(s, y):
        return s.get("eventCounts", {}).get(table, {}).get(str(y))
    return f

def emp(s, y):
    return dec(None, "employed")(s, y)

# area, name, level, unit, source, kept, getter
M = []
def m(area, name, level, unit, source, kept, getter):
    M.append(dict(area=area, name=name, level=level, unit=unit, source=source, kept=kept, get=getter))

WM = "world-metrics.months (one row per place on the 2nd of each month; every month kept)"
WEB = "core2-outcome-web-v1.months values (one row per place on the 3rd of each month; every month kept)"
MAC = "macro.months (one row per month for the country; every month kept, from 2021-01)"
REG = "regional.months, stateFigures() over the state's regions (last twelve months and each December kept)"
BUD = "core2-budgets-v1.budgets (one row per government per fiscal year; every year kept)"

# Jobs and pay
m("Jobs and pay", "Unemployment rate", "town", "percent", WM + ", unemploymentRate", "every month", dec(None, "unemploymentRate", 100))
m("Jobs and pay", "Residents with a job", "town", "people", WM + ", residentsEmployed", "every month", dec(None, "residentsEmployed"))
m("Jobs and pay", "Jobs at the town's employers", "town", "jobs", WM + ", employed", "every month", dec(None, "employed"))
m("Jobs and pay", "Typical hourly pay", "town", "dollars an hour", WM + ", medianHourlyMinor", "every month", dec(None, "medianHourlyMinor", 0.01))
m("Jobs and pay", "Typical household earnings", "town", "dollars a year", WM + ", medianHouseholdEarningsMinor", "every month", dec(None, "medianHouseholdEarningsMinor", 0.01))
m("Jobs and pay", "Businesses open", "town", "businesses", WM + ", businessesOpen", "every month", dec(None, "businessesOpen"))
m("Jobs and pay", "Businesses opened (December)", "town", "businesses a month", WM + ", businessesFoundedThisMonth", "every month", dec(None, "businessesFoundedThisMonth"))
m("Jobs and pay", "Businesses closed (December)", "town", "businesses a month", WM + ", businessesClosedThisMonth", "every month", dec(None, "businessesClosedThisMonth"))
m("Jobs and pay", "Open positions", "town", "positions", "jobs.positions byStatus open (townJobsPanel)", "now only", jobs_panel("openPositions"))
m("Jobs and pay", "People looking for work", "town", "people", "jobs.seekers + jobs.countedSeekers (townJobsPanel)", "now only", jobs_panel("seekers"))
m("Jobs and pay", "Unemployment claims open", "town", "claims", "jobs.claims open, by placeId (metricsView benefits)", "now only (closed claims stay as rows, filedAt kept)", view("benefits", "claims"))
m("Jobs and pay", "Average hourly earnings (web)", "town", "dollars an hour", WEB + ", labor.wages", "every month", web("labor.wages"))
m("Jobs and pay", "Low-wage jobs", "town", "percent of workers", WEB + ", labor.low-wage-jobs", "every month", web("labor.low-wage-jobs"))
m("Jobs and pay", "Median earnings", "town", "dollars a year", WEB + ", labor.median-earnings", "every month", web("labor.median-earnings"))
m("Jobs and pay", "Unemployment rate", "state", "percent", REG + ", unemploymentPct", "last 12 months + each December", region("unemploymentPct"))
m("Jobs and pay", "Average hourly pay", "state", "dollars an hour", REG + ", hourlyEarnings", "last 12 months + each December", region("hourlyEarnings"))
m("Jobs and pay", "Jobs", "state", "jobs", REG + ", jobsThousands", "last 12 months + each December", region("jobsThousands", 1000))
m("Jobs and pay", "Unemployment rate", "country", "percent", MAC + ", unemploymentPct", "every month", macro("unemploymentPct"))
m("Jobs and pay", "Payroll jobs", "country", "jobs", MAC + ", payrollJobsThousands", "every month", macro("payrollJobsThousands", 1000))
m("Jobs and pay", "Average hourly pay", "country", "dollars an hour", MAC + ", hourlyEarnings", "every month", macro("hourlyEarnings"))
# Prices and money
m("Prices and money", "Price level (1 = opening)", "town", "index", WM + ", priceLevel", "every month", dec(None, "priceLevel"))
m("Prices and money", "Prices against the U.S.", "town", "index, U.S. = 100", WEB + ", household.prices", "every month", web("household.prices"))
m("Prices and money", "People in poverty", "town", "percent", WM + ", povertyShare", "every month", dec(None, "povertyShare", 100))
m("Prices and money", "Household income (web)", "town", "thousand dollars a year", WEB + ", household.income", "every month", web("household.income"))
m("Prices and money", "Households short of food", "town", "percent of households", WEB + ", household.food-insecurity", "every month", web("household.food-insecurity"))
m("Prices and money", "Receiving food help (SNAP)", "town", "percent of residents", WEB + ", program.snap-receipt", "every month", web("program.snap-receipt"))
m("Prices and money", "Household loans open", "town", "loans", WM + ", householdLoansOpen", "every month", dec(None, "householdLoansOpen"))
m("Prices and money", "Town bank deposits", "town", "dollars", "credit.books (one row a month for the town bank; every month kept), deposits", "every month", credit_book("deposits", 0.01))
m("Prices and money", "Price level", "state", "percent of U.S.", REG + ", priceLevelPct", "last 12 months + each December", region("priceLevelPct"))
m("Prices and money", "Inflation", "country", "percent a year", MAC + ", inflationPct", "every month", macro("inflationPct"))
m("Prices and money", "Consumer price index", "country", "index", MAC + ", priceIndex", "every month", macro("priceIndex"))
m("Prices and money", "Central bank rate", "country", "percent", MAC + ", policyRatePct", "every month", macro("policyRatePct"))
m("Prices and money", "30-year mortgage rate", "country", "percent", MAC + ", mortgage30Pct", "every month", macro("mortgage30Pct"))
m("Prices and money", "Prime rate", "country", "percent", MAC + ", primeRatePct", "every month", macro("primeRatePct"))
m("Prices and money", "10-year Treasury rate", "country", "percent", MAC + ", treasury10Pct", "every month", macro("treasury10Pct"))
m("Prices and money", "Output gap", "country", "percent", MAC + ", outputGapPct", "every month", macro("outputGapPct"))
# Homes
m("Homes", "Typical rent", "town", "dollars a month", WM + ", medianRentMinor", "every month", dec(None, "medianRentMinor", 0.01))
m("Homes", "Typical home value", "town", "dollars", WM + ", medianHomeValueMinor", "every month", dec(None, "medianHomeValueMinor", 0.01))
m("Homes", "Rent against earnings", "town", "percent", WM + ", rentToEarnings", "every month", dec(None, "rentToEarnings", 100))
m("Homes", "Eviction orders (November)", "town", "orders a month", WM + ", evictionOrdersLastMonth", "every month", dec(None, "evictionOrdersLastMonth"))
m("Homes", "Evictions served, last 12 months", "town", "households", "housing.cases noticeAt, by household's place (metricsView evictions)", "every case kept (noticeAt)", view("evictions", "evictions"))
m("Homes", "Homes with a mortgage (town bank)", "town", "mortgages", WM + ", mortgagesOwed", "every month", dec(None, "mortgagesOwed"))
m("Homes", "Rental homes", "town", "homes", "housing.stock (one row per place, overwritten), rentalUnits", "now only", stock("rentalUnits"))
m("Homes", "Empty rentals", "town", "homes", "housing.stock, vacantRental", "now only", stock("vacantRental"))
m("Homes", "People without a home", "town", "people", "core2-homeless-count-v1.counts (one row per place, overwritten), homeless", "now only", homeless)
m("Homes", "Homelessness (web)", "town", "per 10,000 residents", WEB + ", housing.homelessness", "every month", web("housing.homelessness"))
m("Homes", "Eviction filings (web)", "town", "per 100 renter homes", WEB + ", housing.eviction", "every month", web("housing.eviction"))
m("Homes", "Renter homes", "town", "percent of homes", WEB + ", housing.rental-supply", "every month", web("housing.rental-supply"))
m("Homes", "Property tax rate", "town", "percent of value", WEB + ", housing.property-tax-rate", "every month", web("housing.property-tax-rate"))
# Schools
for key, name, unit in [("school.graduation-pct", "Graduation rate", "percent"), ("school.reading-proficient-pct", "Reading at grade level (8th grade)", "percent"),
                        ("school.math-proficient-pct", "Math at grade level (8th grade)", "percent"), ("school.spending-per-student", "Spending per student", "dollars a year"),
                        ("school.college-completion-pct", "Adults with a college degree", "percent")]:
    m("Schools", name, "town", unit, WEB + ", " + key, "every month", web(key))
# Health
for key, name, unit in [("health.uninsured-pct", "People without health insurance", "percent"), ("health.mortality-55-64", "Deaths, ages 55 to 64", "per 100,000"),
                        ("health.overdose-deaths", "Overdose deaths", "per 100,000"), ("health.infant-mortality", "Infant deaths", "per 1,000 births"),
                        ("health.low-birthweight", "Low birth weight", "percent of births"), ("health.child-asthma-pct", "Children with asthma", "percent"),
                        ("health.youth-major-depressive-episode", "Teens with major depression", "percent"), ("finance.medical-debt-in-collections", "Adults with medical debt in collections", "percent")]:
    m("Health", name, "town", unit, WEB + ", " + key, "every month", web(key))
# Safety
for key, name, unit in [("crime.violent", "Violent crime", "per 100,000"), ("crime.property", "Property crime", "per 1,000 households"),
                        ("crime.burglary", "Burglary", "per 1,000 households"), ("crime.firearm-homicide", "Gun homicides", "per 100,000"),
                        ("police.officers-per-1000", "Police officers", "per 1,000 residents"), ("justice.low-level-arrests", "Low-level arrests", "per 1,000"),
                        ("justice.pretrial-detained", "Held in jail awaiting trial", "per 100,000"), ("justice.incarcerated-per-100k", "In state prison", "per 100,000")]:
    m("Safety", name, "town", unit, WEB + ", " + key, "every month", web(key))
m("Safety", "Crimes reported (December)", "town", "crimes a month", "core2-crime-v1.months (one row per place a month; every month kept), types.*.reported", "every month", crime_reported)
m("Safety", "Fire incidents (December)", "town", "incidents a month", "core2-public-safety-v1.months (one row per place a month; every month kept), fireIncidents", "every month", town_table_latest("core2-public-safety-v1.months", "fireIncidents"))
# Roads
for key, name, unit in [("roads.poor-condition-pct", "Roads in poor condition", "percent of miles"), ("traffic.fatality-rate", "Traffic deaths", "per 100 million miles"),
                        ("traffic.vehicle-miles", "Miles driven", "miles per resident a year"), ("transit.ridership", "Transit trips", "per resident a year")]:
    m("Roads", name, "town", unit, WEB + ", " + key, "every month", web(key))
# The town's books
for level, lname in [("county", "county"), ("state", "state"), ("federal", "country")]:
    m("The books", "Fiscal year shown", lname, "year", BUD + ", fiscalYear", "every year", budget_fy(level))
    m("The books", "Revenue (budgeted)", lname, "dollars a year", BUD + ", revenueMinor (sum of lines)", "every year", budget(level, "latest", "revenueMinor"))
    m("The books", "Spending (budgeted)", lname, "dollars a year", BUD + ", spendingMinor (sum of lines)", "every year", budget(level, "latest", "spendingMinor"))
m("The books", "Spending", "town", "dollars a year", "no city government in this place: the town has none of its own", "none", lambda s, y: None)
# People
m("People", "People in town (named + counted)", "town", "people", "core.people alive by placeId + residents runtime liveHouseholds weightedCount", "now only", pop_total)
m("People", "Named people in town", "town", "people", "core.people by placeId", "now only", pop("namedPeople"))
m("People", "Counted people in town", "town", "people", "residents store liveHouseholds weightedCount", "now only", pop("countedPeople"))
m("People", "Moving in (web)", "town", "per 1,000 a year", WEB + ", population.in-migration", "every month", web("population.in-migration"))
m("People", "Moving out (web)", "town", "per 1,000 a year", WEB + ", population.out-migration", "every month", web("population.out-migration"))
m("People", "Birth rate index", "town", "index, 100 at start", WEB + ", births.rate", "every month", web("births.rate"))
m("People", "Voter turnout", "town", "percent", WEB + ", voting.turnout-pct", "every month", web("voting.turnout-pct"))
m("People", "Approval of the President", "country", "percent", "national-opinion.approval (one row a month; every month kept), pct", "every month", approval)
for k in ["births", "deaths", "movesIn", "movesOut"]:
    m("People", {"births": "Births this year", "deaths": "Deaths of named townspeople this year", "movesIn": "Counted households moving in this year", "movesOut": "Counted households moving out this year"}[k],
      "town", "per year", {"births": "core2-renewal-v1.births by placeId, date", "deaths": "core.people alive=false by placeId (no date kept on the person)", "movesIn": "core2-counted-moves-v1.moves toPlace, date", "movesOut": "core2-counted-moves-v1.moves fromPlace, date"}[k],
      "event rows kept" if k != "deaths" else "count only: no death date on the person record", (lambda k: lambda s, y: None if "yearEvents" not in s else s["yearEvents"].get(k, {}).get(str(y), 0))(k))

def tier(field, scale=1.0):
    def f(s, y):
        t = (s.get("countryTier") or {}).get("state") or {}
        return t[field] * scale if t.get(field) is not None else None
    return f
TIER = "macro.countryStates (one row per state, replaced each month; countryStateNow)"
m("Jobs and pay", "Unemployment rate (country tier)", "state", "percent", TIER + ", unemploymentPct", "now only (opening base kept in macro.countryBases)", tier("unemploymentPct"))
m("Jobs and pay", "Jobs (country tier)", "state", "jobs", TIER + ", sum of sectors' jobs", "now only (opening base kept)", tier("jobs"))
m("Jobs and pay", "Average hourly pay (country tier)", "state", "dollars an hour", TIER + ", sectors' pay over hours", "now only (opening base kept)", tier("hourlyPay"))
m("Prices and money", "Price level (country tier, 1 = opening)", "state", "index", TIER + ", prices", "now only (opening base kept)", tier("prices"))
m("Prices and money", "Sales by the state's businesses", "state", "dollars a month", TIER + ", sum of sectors' sales", "now only (opening base kept)", tier("sales"))
m("People", "People in the state", "state", "people", TIER + ", countryPeople()", "now only (opening base kept)", tier("population"))
m("People", "People in the country", "country", "people", TIER + ", summed over 56 states and territories", "now only (opening bases kept)", lambda s, y: (s.get("countryTier") or {}).get("countryPeople"))
m("The books", "Federal debt held", "country", "dollars", "core2-budgets-v1.federalDebt (one row per holder, overwritten), balanceMinor summed", "now only", lambda s, y: None if (s.get("countryTier") or {}).get("federalDebtMinor") is None else s["countryTier"]["federalDebtMinor"] / 100)

measures = []
for spec in M:
    values = {}
    for y in years:
        try:
            if spec["name"].startswith("Deaths of named"):
                now = (snaps[y].get("yearEvents") or {}).get("namedDeadSoFar")
                prev = (snaps[y - 1].get("yearEvents") or {}).get("namedDeadSoFar", 0) if y - 1 in snaps else 0
                v = None if now is None else now - prev
            else:
                v = spec["get"](snaps[y], y)
        except Exception:
            v = None
        values[str(y)] = None if v is None else round(float(v), 4)
    present = [v for v in values.values() if v is not None]
    status = ("none" if not present else "flat" if len(set(present)) == 1 and len(present) > 1 else "moves")
    measures.append({k: spec[k] for k in ("area", "name", "level", "unit", "source", "kept")} | {"yearsWithValue": len(present), "valuesOverYears": status, "values": values})

out = {
    "place": f"{game['name']} ({game['state']})", "placeKey": game["key"], "placeId": game["placeId"],
    "worldSeed": game["seed"], "runSeed": sys.argv[3] if len(sys.argv) > 3 else None,
    "start": game["start"], "years": [str(y) for y in years],
    "readAt": "December 31 of each year, after advancing the played world (buildBenchWorld, two-level) to that date",
    "historyStillHeldAtEnd": {
        "worldMetricsMonths": final.get("worldMetricsDatesKept"),
        "outcomeWebMonths": final.get("webMonthsKept"),
        "regionalMonths": final["regional"].get("monthsKept"),
        "macroMonthsFirstLast": [final["macroMonthsKept"][0], final["macroMonthsKept"][-1], len(final["macroMonthsKept"])],
    },
    "measures": measures,
}
json.dump(out, open(dst, "w"), indent=1)
print(len(measures), "measures")
