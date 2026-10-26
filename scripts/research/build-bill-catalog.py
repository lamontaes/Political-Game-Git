"""Build the bill catalog the bill paper reads (src/core2/data/legislature/bill-catalog.json).

The 18 subject menus and their topics are the owner-accepted catalog
(docs/design/legislative-content-menus-v1.md, Sept 26, 2026). Under them go the
policies the engine supports today, each with one identity and one primary
home (cross-links elsewhere), and the operations it supports:

- law amounts in force (minimum wage; local income and sales tax): raise, lower;
- the recorded policy questions (data/research/laws/starting-law-2026): enact,
  repeal; placed in the subject of their own category;
- budget lines (the Census spending functions in data/research/money/
  public-budget-bases.json): expand, restrict.

Topics with no supported policy yet stay listed with supported: false, the
development inventory the design asks for, never an empty docket.

Run: python3 scripts/research/build-bill-catalog.py
"""

import glob
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "src/core2/data/legislature/bill-catalog.json"

SUBJECTS = [
    ("infrastructure", "Infrastructure", ["Transportation", "Water and wastewater", "Flood control and drainage", "Waste collection and disposal", "Public buildings and facilities", "Digital infrastructure"]),
    ("healthcare", "Healthcare", ["Coverage and insurance", "Hospitals and clinics", "Mental health and addiction services", "Public health", "Medicines and medical products", "Reproductive health", "Long-term care", "Healthcare workforce"]),
    ("education", "Education", ["Early childhood and preschool", "K-12 schools", "School funding", "School facilities", "Teachers and support staff", "Special education", "Colleges and universities", "Student aid", "Vocational and adult education"]),
    ("taxes-finance", "Taxes & Public Finance", ["Taxes", "Fees and charges", "Budgets and appropriations", "Grants and transfers", "Debt and borrowing", "Reserves and fiscal rules", "Fiscal and monetary institutions"]),
    ("assistance", "Assistance & Social Insurance", ["Food assistance", "Cash assistance", "Child-care assistance", "Disability support", "Unemployment benefits", "Retirement and survivor benefits", "Elder and caregiver support", "Utility-bill assistance"]),
    ("housing", "Housing & Land Use", ["Planning and zoning", "Building permits and standards", "Affordable and public housing", "Rental rules", "Homeownership assistance", "Homelessness services", "Neighborhood redevelopment"]),
    ("labor", "Labor & Employment", ["Wages and working hours", "Paid and unpaid leave", "Workplace health and safety", "Hiring and employment protections", "Unions and collective bargaining", "Workers' compensation", "Employment training", "Pensions"]),
    ("business", "Business & Economic Development", ["Business formation and licensing", "Small-business finance", "Development incentives", "Competition and market rules", "Banking and credit", "Insurance markets", "Manufacturing and industry", "Commercial development"]),
    ("energy-environment", "Energy & Environment", ["Electricity and the grid", "Fuels and extraction", "Energy efficiency and renewables", "Utility regulation", "Air and emissions", "Water quality", "Land, wildlife and conservation", "Pollution cleanup", "Climate and resilience"]),
    ("justice", "Justice & Public Safety", ["Policing", "Courts and legal aid", "Criminal law and sentencing", "Prisons, probation and reentry", "Juvenile justice", "Firearms and weapons rules", "Fire and emergency medical services", "Emergency management and disaster recovery"]),
    ("government", "Government & Democracy", ["Elections and representation", "Campaign finance", "Ethics and conflicts", "Public records and meetings", "Agencies and public employment", "Procurement", "Local-government powers", "Intergovernmental relations", "Constitutional and institutional reform"]),
    ("rights", "Rights, Family & Consumer Protection", ["Civil rights and equal treatment", "Speech and religious liberty", "Privacy and personal rights", "Marriage, divorce and custody", "Adoption and child welfare", "Consumer contracts and products", "Fraud and unfair practices"]),
    ("technology", "Science, Technology & Communications", ["Research and development", "Broadband and telecommunications", "Data protection", "Cybersecurity", "Artificial intelligence and automated systems", "Government digital services", "Space and scientific infrastructure"]),
    ("agriculture", "Agriculture & Food", ["Crops and livestock", "Farm support and insurance", "Soil and agricultural water", "Food production and safety", "Rural development", "Forestry", "Fisheries"]),
    ("parks-culture", "Parks, Culture & Community Life", ["Parks and recreation", "Libraries", "Arts and museums", "Historic preservation", "Tourism and events", "Community facilities and public spaces"]),
    ("immigration", "Immigration & Citizenship", ["Entry and visas", "Residency and naturalization", "Asylum and refugee resettlement", "Border administration", "Immigration proceedings", "Settlement and integration services"]),
    ("defense-veterans", "Defense & Veterans", ["Military personnel and benefits", "Readiness and procurement", "Bases and facilities", "Defense authorization and oversight", "Veterans' healthcare", "Veterans' education, housing and employment", "Transition and survivor services"]),
    ("foreign-trade", "Foreign Affairs & Trade", ["Diplomacy and international institutions", "International agreements", "Foreign aid", "Trade and customs", "Sanctions and export controls", "International security cooperation"]),
]

CATEGORY_SUBJECT = {
    "agriculture-natural-resources": "agriculture",
    "business-commerce": "business",
    "civil-family-community": "rights",
    "education": "education",
    "environment-energy": "energy-environment",
    "fiscal": "taxes-finance",
    "government-operations": "government",
    "health-human-services": "healthcare",
    "housing-land-use": "housing",
    "justice-public-safety": "justice",
    "labor-commerce": "labor",
    "labor-workforce": "labor",
    "technology-privacy": "technology",
    "transportation-infrastructure": "infrastructure",
}

# Topic placement by words in the question key; the subject's first topic otherwise.
TOPIC_WORDS = [
    ("minimum-wage", "Wages and working hours"), ("paid-family-leave", "Paid and unpaid leave"),
    ("collective-bargaining", "Unions and collective bargaining"), ("right-to-work", "Unions and collective bargaining"),
    ("voter", "Elections and representation"), ("voting", "Elections and representation"), ("redistricting", "Elections and representation"),
    ("term-limits", "Constitutional and institutional reform"), ("lobbying", "Ethics and conflicts"), ("local-authority", "Local-government powers"),
    ("medicaid", "Coverage and insurance"), ("work-requirement", "Cash assistance"),
    ("handgun", "Firearms and weapons rules"), ("carry", "Firearms and weapons rules"), ("stand-your-ground", "Firearms and weapons rules"), ("child-access", "Firearms and weapons rules"),
    ("police", "Policing"), ("bail", "Courts and legal aid"), ("juvenile", "Juvenile justice"), ("voting-after-sentence", "Prisons, probation and reentry"), ("immigration", "Policing"),
    ("rent", "Rental rules"), ("eviction", "Rental rules"), ("inclusionary", "Affordable and public housing"), ("multifamily", "Planning and zoning"),
    ("income-tax", "Taxes"), ("sales-tax", "Taxes"), ("property-tax", "Taxes"), ("budget", "Budgets and appropriations"), ("reserve", "Reserves and fiscal rules"), ("pension", "Reserves and fiscal rules"),
    ("preschool", "Early childhood and preschool"), ("private-school", "School funding"), ("teacher", "Teachers and support staff"),
    ("carbon", "Climate and resilience"), ("clean-electricity", "Electricity and the grid"), ("clean-air", "Air and emissions"), ("bottle", "Pollution cleanup"),
    ("farmland", "Rural development"), ("groundwater", "Soil and agricultural water"),
    ("cannabis", "Business formation and licensing"), ("loan", "Banking and credit"),
    ("transit", "Transportation"), ("mileage", "Transportation"), ("broadband", "Broadband and telecommunications"),
    ("facial-recognition", "Privacy and personal rights"), ("data-privacy", "Data protection"), ("age-verification", "Privacy and personal rights"),
    ("discrimination", "Civil rights and equal treatment"), ("abortion", "Reproductive health"),
]

BUDGET_LINES = {
    "schools": ("education", "K-12 schools"), "higherEducation": ("education", "Colleges and universities"),
    "welfareAndMedicaid": ("assistance", "Cash assistance"), "healthAndHospitals": ("healthcare", "Hospitals and clinics"),
    "highways": ("infrastructure", "Transportation"), "police": ("justice", "Policing"), "fire": ("justice", "Fire and emergency medical services"),
    "corrections": ("justice", "Prisons, probation and reentry"), "parks": ("parks-culture", "Parks and recreation"),
    "housing": ("housing", "Affordable and public housing"), "naturalResources": ("energy-environment", "Land, wildlife and conservation"),
    "administration": ("government", "Agencies and public employment"),
}

SERIES = {
    "minimum-wage": ("labor", "Wages and working hours", "Minimum wage", "minor/hour", ["federal", "state", "city"]),
    "income-tax": ("taxes-finance", "Taxes", "Local income tax rate", "percent", ["city"]),
    "sales-tax": ("taxes-finance", "Taxes", "Local sales tax rate", "percent", ["city"]),
    # Each government sets its own employees' pay floor (CTO ruling, Oct 14, 2026).
    "public-pay-floor": ("government", "Agencies and public employment", "Public pay floor", "dollars/year", ["federal", "state", "city"]),
    # The other amounts the starting law holds, at the levels series-powers.json
    # gives each (a local level is "city" here).
    "property-tax": ("taxes-finance", "Taxes", "Property tax rate", "percent of home value per year", ["state", "city"]),
    "corporate-income-tax": ("taxes-finance", "Taxes", "Corporate income tax rate", "percent-flat", ["federal", "state"]),
    "estate-tax": ("taxes-finance", "Taxes", "Estate tax rate", "percent-top-rate", ["federal", "state"]),
    "inheritance-tax": ("taxes-finance", "Taxes", "Inheritance tax rate", "percent-top-rate", ["state"]),
    "social-security-tax": ("assistance", "Retirement and survivor benefits", "Social Security tax rate", "percent-of-wages", ["federal"]),
    "medicare-tax": ("healthcare", "Coverage and insurance", "Medicare tax rate", "percent-of-wages", ["federal"]),
    "medicaid-match": ("healthcare", "Coverage and insurance", "Medicaid federal match", "percent", ["federal"]),
    "snap-maximum": ("assistance", "Food assistance", "SNAP maximum benefit", "USD/month", ["federal"]),
    "federal-unemployment-tax": ("assistance", "Unemployment benefits", "Federal unemployment tax rate", "percent-of-wages", ["federal"]),
    "state-unemployment-tax": ("assistance", "Unemployment benefits", "State unemployment tax rate", "percent-of-wages", ["state"]),
    "unemployment-weekly-maximum": ("assistance", "Unemployment benefits", "Unemployment weekly maximum", "USD/week", ["state"]),
}


def main():
    subjects = {key: {"id": key, "name": name, "topics": {t: {"name": t, "policies": []} for t in topics}} for key, name, topics in SUBJECTS}
    for series, (subject, topic, name, unit, levels) in SERIES.items():
        subjects[subject]["topics"][topic]["policies"].append({
            "id": f"law:{series}", "name": name, "kind": "law-amount", "series": series, "unit": unit,
            "operations": ["raise", "lower"], "levels": levels,
        })
    for line, (subject, topic) in BUDGET_LINES.items():
        subjects[subject]["topics"][topic]["policies"].append({
            "id": f"budget:{line}", "name": f"Spending: {line}", "kind": "budget-line", "line": line,
            "operations": ["expand", "restrict"], "levels": ["state", "city"],
        })
    questions = []
    for path in sorted(glob.glob(str(ROOT / "data/research/laws/starting-law-2026/*.json"))):
        if path.endswith(("metadata.json", "question-order.json")):
            continue
        questions += list(json.loads(pathlib.Path(path).read_text()).get("questions", {}).keys())
    for key in sorted(set(questions)):
        category, slug = key.split(":", 1)[1].split(".", 1)
        subject = CATEGORY_SUBJECT.get(category)
        if not subject:
            continue
        topic = next((t for word, t in TOPIC_WORDS if word in slug and t in subjects[subject]["topics"]), None)
        topic = topic or next(iter(subjects[subject]["topics"]))
        federal = key.startswith("us-federal-positions")
        subjects[subject]["topics"][topic]["policies"].append({
            "id": f"question:{key}", "name": slug.replace("-", " "), "kind": "policy-question", "question": key,
            "operations": ["enact", "repeal"], "levels": ["federal"] if federal else ["state", "city"],
        })
    out = []
    for key, name, topics in SUBJECTS:
        s = subjects[key]
        out.append({"id": key, "name": name, "topics": [
            {"name": t, "supported": bool(s["topics"][t]["policies"]), "policies": s["topics"][t]["policies"]} for t in topics
        ]})
    document = {
        "id": "bill-catalog",
        "about": "The bill paper's catalog: the owner-accepted 18 subject menus (docs/design/legislative-content-menus-v1.md) with the policies the engine supports under each topic, their operations and the levels that can pass them. Built by scripts/research/build-bill-catalog.py.",
        "subjects": out,
    }
    OUT.write_text(json.dumps(document, indent=1) + "\n")
    supported = sum(1 for s in out for t in s["topics"] if t["supported"])
    total = sum(len(s["topics"]) for s in out)
    policies = sum(len(t["policies"]) for s in out for t in s["topics"])
    print(policies, "policies in", supported, "of", total, "topics")


if __name__ == "__main__":
    main()
