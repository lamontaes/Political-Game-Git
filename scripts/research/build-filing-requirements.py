import json, re, sys, importlib.util as iu
BASE = "/tmp/claude-0/-home-user-Political-Game-Git/fd6dc1da-816a-5bb4-9c7d-6026cd8b012b/scratchpad"
REPO = "/home/user/Political-Game-Git/data/research/elections"

def load(name):
    s = iu.spec_from_file_location(name, f"{BASE}/scripts/{name}.py"); m = iu.module_from_spec(s); s.loader.exec_module(m); return m
DS = load("data_state"); DL = load("data_local")

NAMES = {'AL':'Alabama','AK':'Alaska','AZ':'Arizona','AR':'Arkansas','CA':'California','CO':'Colorado','CT':'Connecticut','DE':'Delaware','FL':'Florida','GA':'Georgia','HI':'Hawaii','ID':'Idaho','IL':'Illinois','IN':'Indiana','IA':'Iowa','KS':'Kansas','KY':'Kentucky','LA':'Louisiana','ME':'Maine','MD':'Maryland','MA':'Massachusetts','MI':'Michigan','MN':'Minnesota','MS':'Mississippi','MO':'Missouri','MT':'Montana','NE':'Nebraska','NV':'Nevada','NH':'New Hampshire','NJ':'New Jersey','NM':'New Mexico','NY':'New York','NC':'North Carolina','ND':'North Dakota','OH':'Ohio','OK':'Oklahoma','OR':'Oregon','PA':'Pennsylvania','RI':'Rhode Island','SC':'South Carolina','SD':'South Dakota','TN':'Tennessee','TX':'Texas','UT':'Utah','VT':'Vermont','VA':'Virginia','WA':'Washington','WV':'West Virginia','WI':'Wisconsin','WY':'Wyoming'}
RET = "2026-10-12"
BP = lambda st: "https://ballotpedia.org/Ballot_access_requirements_for_political_candidates_in_" + NAMES[st].replace(" ", "_")
BPGOV = lambda st: "https://ballotpedia.org/Governor_of_" + NAMES[st].replace(" ", "_")
BPLEG = "https://ballotpedia.org/State_legislature_candidate_requirements_by_state"
FEC = "https://www.fec.gov/resources/cms-content/documents/2026pdates.pdf"

flagged = {"est": False}
def clean(x):
    if isinstance(x, str):
        if "?" in x or "estimate" in x.lower():
            flagged["est"] = True
        x = x.replace("? (estimate", " (estimate").replace("?)", ")").replace("? ", " (estimate) ").replace("?", " (estimate)")
        x = re.sub(r"\s+\(estimate\)\s+\(estimate", " (estimate", x)
        x = re.sub(r"  +", " ", x).strip()
    return x

def side(t):
    if t is None: return None
    t = list(t) + [None] * (6 - len(t))
    fee, ff, sig, sf, alt, dl = t[:6]
    d = {"feeUSD": fee, "feeFormula": clean(ff), "signatures": sig, "signatureFormula": clean(sf),
         "feeInLieuOfSignatures": alt == "fee-or-petition",
         "petitionInLieuOfFee": True if alt == "fee-or-petition" else ("only with a showing of inability to pay" if alt == "pauper-petition" else False),
         "feeAndPetitionBothRequired": alt == "both" or (alt is None and bool(fee) and bool(sig)),
         "alternativeRoute": {"convention-or-petition": "party convention endorsement instead of petition", "assembly-or-petition": "party assembly designation instead of petition"}.get(alt)}
    if dl is not None or len(t) >= 6: d["deadline2026"] = dl
    return d

# ---- legislative qualifications table
LEGQ = {}
for line in open(f"{BASE}/research/q/leg_table.tsv"):
    p = line.rstrip("\n").split("\t")
    if p[0] == "State": continue
    st = [k for k, v in NAMES.items() if v == p[0]][0]
    age = None if p[2] == "Not specified" else int(p[2])
    dist, elect, cit, stres = p[3], p[4], p[5], p[6]
    parts = []
    parts.append(f"state resident {stres}" if stres not in ("Yes", "Not specified") else ("state resident" if stres == "Yes" else "state residency not specified"))
    parts.append(f"district resident {dist}" if dist not in ("Yes", "Not specified") else ("district resident" if dist == "Yes" else "district residency not specified"))
    if cit not in ("Yes", "Not specified"): parts.append(f"U.S. citizen {cit}")
    LEGQ[st] = (age, "; ".join(parts), True if elect == "Yes" else "not specified")

FO = json.load(open(f"{REPO}/filing-office.json"))["filingOfficers"]["states"]
PN = json.load(open(f"{REPO}/party-nomination-rules-2026.json"))["places"]

OFFICE = {"statewideExecutive": "Governor", "stateLegislative": "Lower chamber of the state legislature", "usHouse": "U.S. Representative",
          "countyOffice": "County commission / board member", "municipalOffice": "City or town council member (state general-law default)"}
NO_LEG_2026 = {"LA": "2027", "MS": "2027", "NJ": "2027", "VA": "2027"}

def fam_state(st, fam):
    flagged["est"] = False
    r = DS.S[st][fam]
    o = {"office": OFFICE[fam]}
    if st == "NE" and fam == "stateLegislative": o["office"] = "Nebraska Legislature (unicameral, nonpartisan)"
    off = r.get("offered2026", True)
    if fam == "stateLegislative" and st in NO_LEG_2026: off = False
    o["offeredIn2026"] = off
    if not off:
        o["nextRegularElection"] = {"statewideExecutive": {"DE":"2028","IN":"2028","KY":"2027","LA":"2027","MS":"2027","MO":"2028","MT":"2028","NJ":"2029","NC":"2028","ND":"2028","UT":"2028","VA":"2029","WA":"2028","WV":"2028"}, "stateLegislative": NO_LEG_2026}.get(fam, {}).get(st)
    o["filedWith"] = clean(r["filedWith"])
    o["party"] = side(r["party"]); o["independent"] = side(r["indep"])
    o["feeInLieuOfSignatures"] = o["party"]["feeInLieuOfSignatures"]
    o["petitionInLieuOfFee"] = o["party"]["petitionInLieuOfFee"]
    o["partyCandidateVsIndependent"] = clean(r["diff"])
    if fam == "statewideExecutive":
        a, res, v = DL.GOVQ[st]; src_q = BPGOV(st)
    elif fam == "stateLegislative":
        a, res, v = LEGQ[st]; src_q = BPLEG
        if a is None: res += " (no minimum age in law; voting age 18 applies in practice)"
    else:
        a, res, v = 25, "U.S. citizen 7 years; inhabitant of the state when elected (no district residency required)", "not required by the Constitution"
        src_q = "https://constitution.congress.gov/browse/article-1/section-2/clause-2/"
    o["minimumAge"] = a; o["residency"] = res; o["registeredVoterRequired"] = v
    o["filingDeadlineRule"] = clean(r["rule"]); o["filingWindowOpens"] = clean(r["opens"])
    o["source"] = BP(st)
    o["secondarySources"] = [src_q] + ([FEC] if fam != "statewideExecutive" or off else [])
    o["retrievedDate"] = RET
    o["estimate"] = flagged["est"]
    if flagged["est"]: o["estimateNote"] = "Fields marked '(estimate)' were not confirmed in a source read on 2026-10-12; the rest is read from Ballotpedia's 2026 tables and process text."
    return o

def fam_local(st, fam):
    flagged["est"] = False
    key = "county" if fam == "countyOffice" else "municipal"
    r = DL.L[st][key]
    if r.get("na"):
        return {"office": OFFICE[fam], "applicable": False, "note": r["note"], "retrievedDate": RET, "estimate": False}
    fo = (FO.get(st) or {}).get(key)
    o = {"office": OFFICE[fam], "applicable": True}
    verified = []
    if r.get("filedWith"):
        fw = r["filedWith"]
    elif fo:
        t = fo.get("title")
        fw = t if t else ("City or town clerk" if key == "municipal" else "County clerk")
        if fo.get("counterTitle"): fw += f" (counter: {fo['counterTitle'].lower()})"
        verified.append("filedWith")
    else:
        fw = "County clerk" if key == "county" else "City or town clerk"
    if fo and "filedWith" not in verified and r.get("filedWith") is None: verified.append("filedWith")
    o["filedWith"] = clean(fw)
    if fo: o["filedWithCitation"] = fo.get("citation"); o["filedWithSource"] = fo.get("url"); o["filedWithReadOn"] = "2026-10-08 (data/research/elections/filing-office.json)"
    pd = PN.get("US-" + st, {}).get("filing", {}) or {}
    dl = (pd.get("deadlines2026") or {}).get("all")
    ps = side(tuple(list(r["party"]) + [None] * (5 - len(r["party"]))) + (dl if key == "county" else None,))
    o["party"] = ps
    o["independent"] = side(tuple(list(r["indep"]) + [None] * (5 - len(r["indep"]))) + (None,)) if r.get("indep") else "same as party side (nonpartisan filing)"
    o["feeInLieuOfSignatures"] = ps["feeInLieuOfSignatures"]; o["petitionInLieuOfFee"] = ps["petitionInLieuOfFee"]
    o["partyCandidateVsIndependent"] = clean(r.get("diff"))
    o["minimumAge"] = r.get("age", 18)
    o["residency"] = clean(r.get("res", DL.DEFRES if key == "county" else DL.DEFRESM))
    o["registeredVoterRequired"] = r.get("voter", True)
    o["filingDeadlineRule"] = clean(r["rule"]); o["filingWindowOpens"] = clean(r["opens"])
    if key == "municipal": o["variesByCharter"] = True
    o["citation"] = r.get("cite")
    o["source"] = (fo or {}).get("url")
    o["secondarySources"] = [BP(st)]
    o["retrievedDate"] = RET
    o["estimate"] = True
    o["verifiedFields"] = verified
    o["estimateNote"] = ("Filing officer from the repo's statute read (filing-office.json) where listed; fee, signature, age/residency and deadline figures are the state's general-law default compiled from the cited code sections and not re-read on 2026-10-12" + ("; city charters and ordinances commonly override them." if key == "municipal" else "."))
    return o

def terr_fam(code, fam, t):
    flagged["est"] = False
    r = t[fam]
    if r.get("na"):
        return {"office": OFFICE[fam], "applicable": False, "note": r["note"], "retrievedDate": RET, "estimate": False}
    o = {"office": r["office"], "applicable": True, "offeredIn2026": r.get("offered2026", True), "filedWith": r["filedWith"]}
    o["party"] = side(r["party"]); o["independent"] = side(r["indep"])
    o["feeInLieuOfSignatures"] = o["party"]["feeInLieuOfSignatures"]; o["petitionInLieuOfFee"] = o["party"]["petitionInLieuOfFee"]
    o["partyCandidateVsIndependent"] = clean(r["diff"])
    o["minimumAge"] = r["age"]; o["residency"] = clean(r["res"]); o["registeredVoterRequired"] = r["voter"]
    o["filingDeadlineRule"] = clean(r["rule"]); o["filingWindowOpens"] = clean(r["opens"])
    o["source"] = r["src"]; o["secondarySources"] = r.get("secondary", [])
    o["retrievedDate"] = RET
    o["estimate"] = bool(r["est"] or flagged["est"])
    if o["estimate"]: o["estimateNote"] = "Some figures (marked estimate or null) could not be read from an official source on 2026-10-12."
    return o

places = {}
for st in sorted(NAMES):
    pn = PN.get("US-" + st, {})
    p = {"name": NAMES[st], "generalElection2026": "2026-11-03",
         "primary2026": ((pn.get("primary") or {}).get("dates2026") or {}).get("all"),
         "primaryNominationMethod": pn.get("method")}
    for fam in ("statewideExecutive", "stateLegislative", "countyOffice", "municipalOffice", "usHouse"):
        p[fam] = fam_state(st, fam) if fam in ("statewideExecutive", "stateLegislative", "usHouse") else fam_local(st, fam)
    sw = p["statewideExecutive"]
    for fam in ("stateLegislative", "usHouse"):
        for k in ("partyCandidateVsIndependent", "filingDeadlineRule", "filingWindowOpens"):
            v = p[fam].get(k)
            if isinstance(v, str) and v.startswith("As statewide"):
                p[fam][k] = sw[k] + (" (same rule as statewide offices)" if k != "partyCandidateVsIndependent" else "")
    places["US-" + st] = p
for code, t in DL.TERR.items():
    pn = PN.get("US-" + code, {})
    p = {"name": t["name"], "generalElection2026": "2026-11-03" if code != "PR" else None,
         "primary2026": ((pn.get("primary") or {}).get("dates2026") or {}).get("all")}
    if t.get("note"): p["note"] = t["note"]
    for fam in ("statewideExecutive", "stateLegislative", "countyOffice", "municipalOffice", "usHouse"):
        p[fam] = terr_fam(code, fam, t)
    places["US-" + code] = p

out = {"id": "filing-requirements-2026", "retrieved": RET,
       "about": "Candidate filing requirements for the 2026 cycle in all 56 jurisdictions, by office family: who takes the filing, fee, signatures, whether a fee and a petition substitute for each other, party vs. independent differences, age, residency, registered-voter requirement, deadline rule and window opening. State-level rows are read from Ballotpedia's per-state ballot-access pages (2026 tables and process text) and its governor and legislator qualification pages; county and municipal rows are state general-law defaults (estimate unless verifiedFields says otherwise). Fees are in U.S. dollars; null means not set or not read. feeInLieuOfSignatures / petitionInLieuOfFee describe the party side; each side carries its own flags.",
       "fieldNotes": {
         "feeInLieuOfSignatures": "true when the candidate may pay the fee instead of gathering signatures (and vice versa)",
         "petitionInLieuOfFee": "true when a petition replaces the fee for anyone; a string when only for candidates unable to pay",
         "feeAndPetitionBothRequired": "true when the candidate must pay the fee and file the petition",
         "offeredIn2026": "false when the office is not on the regular 2026 ballot; the rules still describe its next regular filing",
         "deadline2026": "the 2026-cycle deadline from Ballotpedia's 2026 table (party side) or the FEC 2026 calendar via party-nomination-rules-2026.json (county rows)"},
       "places": places}
json.dump(out, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(len(places))
