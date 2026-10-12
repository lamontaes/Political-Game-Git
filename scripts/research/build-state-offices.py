#!/usr/bin/env python3
"""Build state-offices-2026 research JSON for 56 jurisdictions.

sourceRetrieved=true means the fact was checked against a page fetched in this
session (Wikipedia raw wikitext, Pew). false means the citation is the governing
constitution/statute section from compiled knowledge, not fetched this session
(NCSL, Ballotpedia and the Wayback Machine refused automated access on 2026-10-12).
"""
import json, sys

R = "2026-10-12"
W_LEG = "https://en.wikipedia.org/wiki/List_of_U.S._state_legislatures"
W_TL = "https://en.wikipedia.org/wiki/Term_limits_in_the_United_States"
W_SUCC = "https://en.wikipedia.org/wiki/Gubernatorial_lines_of_succession_in_the_United_States"
PEW = "https://www.pewresearch.org/short-reads/2024/08/06/how-do-states-fill-vacancies-in-the-us-senate-it-depends-on-the-state/"
BP_VAC = "https://ballotpedia.org/How_vacancies_are_filled_in_state_legislatures"
BP_EXEC = "https://ballotpedia.org/State_executive_offices"
W_TERR = "https://en.wikipedia.org/wiki/Comparison_of_U.S._state_and_territory_governments"
US_HOUSE_CIT = "U.S. Const. art. I, sec. 2, cl. 4 (executive authority issues writs of election)"


def none_tl():
    return {"kind": "none"}


def cons(years=None, terms=None, notes=None):
    d = {"kind": "consecutive"}
    if years: d["years"] = years
    if terms: d["terms"] = terms
    if notes: d["notes"] = notes
    return d


def life(years=None, terms=None, notes=None):
    d = {"kind": "lifetime"}
    if years: d["years"] = years
    if terms: d["terms"] = terms
    if notes: d["notes"] = notes
    return d


# ---------------------------------------------------------------- legislatures
# code: (legislature name, upper(name, seats, term, staggered), lower(name, seats, term, staggered) or None for unicameral)
LEG = {
 "AL": ("Legislature", ("Senate", 35, 4, False), ("House of Representatives", 105, 4, False)),
 "AK": ("Legislature", ("Senate", 20, 4, True), ("House of Representatives", 40, 2, False)),
 "AZ": ("State Legislature", ("Senate", 30, 2, False), ("House of Representatives", 60, 2, False)),
 "AR": ("General Assembly", ("Senate", 35, 4, True), ("House of Representatives", 100, 2, False)),
 "CA": ("State Legislature", ("Senate", 40, 4, True), ("Assembly", 80, 2, False)),
 "CO": ("General Assembly", ("Senate", 35, 4, True), ("House of Representatives", 65, 2, False)),
 "CT": ("General Assembly", ("State Senate", 36, 2, False), ("House of Representatives", 151, 2, False)),
 "DE": ("General Assembly", ("Senate", 21, 4, True), ("House of Representatives", 41, 2, False)),
 "FL": ("Legislature", ("Senate", 40, 4, True), ("House of Representatives", 120, 2, False)),
 "GA": ("General Assembly", ("State Senate", 56, 2, False), ("House of Representatives", 180, 2, False)),
 "HI": ("State Legislature", ("Senate", 25, 4, True), ("House of Representatives", 51, 2, False)),
 "ID": ("Legislature", ("Senate", 35, 2, False), ("House of Representatives", 70, 2, False)),
 "IL": ("General Assembly", ("Senate", 59, 4, True), ("House of Representatives", 118, 2, False)),
 "IN": ("General Assembly", ("Senate", 50, 4, True), ("House of Representatives", 100, 2, False)),
 "IA": ("General Assembly", ("Senate", 50, 4, True), ("House of Representatives", 100, 2, False)),
 "KS": ("Legislature", ("Senate", 40, 4, False), ("House of Representatives", 125, 2, False)),
 "KY": ("General Assembly", ("Senate", 38, 4, True), ("House of Representatives", 100, 2, False)),
 "LA": ("Legislature", ("State Senate", 39, 4, False), ("House of Representatives", 105, 4, False)),
 "ME": ("Legislature", ("Senate", 35, 2, False), ("House of Representatives", 151, 2, False)),
 "MD": ("General Assembly", ("Senate", 47, 4, False), ("House of Delegates", 141, 4, False)),
 "MA": ("General Court", ("Senate", 40, 2, False), ("House of Representatives", 160, 2, False)),
 "MI": ("Legislature", ("Senate", 38, 4, False), ("House of Representatives", 110, 2, False)),
 "MN": ("Legislature", ("Senate", 67, 4, False), ("House of Representatives", 134, 2, False)),
 "MS": ("Legislature", ("State Senate", 52, 4, False), ("House of Representatives", 122, 4, False)),
 "MO": ("General Assembly", ("Senate", 34, 4, True), ("House of Representatives", 163, 2, False)),
 "MT": ("Legislature", ("Senate", 50, 4, True), ("House of Representatives", 100, 2, False)),
 "NE": ("Legislature", ("Legislature (unicameral)", 49, 4, True), None),
 "NV": ("Legislature", ("Senate", 21, 4, True), ("Assembly", 42, 2, False)),
 "NH": ("General Court", ("Senate", 24, 2, False), ("House of Representatives", 400, 2, False)),
 "NJ": ("Legislature", ("Senate", 40, 4, False), ("General Assembly", 80, 2, False)),
 "NM": ("Legislature", ("Senate", 42, 4, False), ("House of Representatives", 70, 2, False)),
 "NY": ("State Legislature", ("State Senate", 63, 2, False), ("State Assembly", 150, 2, False)),
 "NC": ("General Assembly", ("Senate", 50, 2, False), ("House of Representatives", 120, 2, False)),
 "ND": ("Legislative Assembly", ("Senate", 47, 4, True), ("House of Representatives", 94, 4, True)),
 "OH": ("General Assembly", ("Senate", 33, 4, True), ("House of Representatives", 99, 2, False)),
 "OK": ("Legislature", ("Senate", 48, 4, True), ("House of Representatives", 101, 2, False)),
 "OR": ("Legislative Assembly", ("State Senate", 30, 4, True), ("House of Representatives", 60, 2, False)),
 "PA": ("General Assembly", ("State Senate", 50, 4, True), ("House of Representatives", 203, 2, False)),
 "RI": ("General Assembly", ("Senate", 38, 2, False), ("House of Representatives", 75, 2, False)),
 "SC": ("General Assembly", ("Senate", 46, 4, False), ("House of Representatives", 124, 2, False)),
 "SD": ("Legislature", ("Senate", 35, 2, False), ("House of Representatives", 70, 2, False)),
 "TN": ("General Assembly", ("Senate", 33, 4, True), ("House of Representatives", 99, 2, False)),
 "TX": ("Legislature", ("Senate", 31, 4, True), ("House of Representatives", 150, 2, False)),
 "UT": ("State Legislature", ("State Senate", 29, 4, True), ("House of Representatives", 75, 2, False)),
 "VT": ("General Assembly", ("Senate", 30, 2, False), ("House of Representatives", 150, 2, False)),
 "VA": ("General Assembly", ("Senate", 40, 4, False), ("House of Delegates", 100, 2, False)),
 "WA": ("State Legislature", ("State Senate", 49, 4, True), ("House of Representatives", 98, 2, False)),
 "WV": ("Legislature", ("Senate", 34, 4, True), ("House of Delegates", 100, 2, False)),
 "WI": ("Legislature", ("Senate", 33, 4, True), ("State Assembly", 99, 2, False)),
 "WY": ("Legislature", ("Senate", 31, 4, True), ("House of Representatives", 62, 2, False)),
 # territories / DC
 "DC": ("Council of the District of Columbia", ("Council (unicameral)", 13, 4, True), None),
 "PR": ("Legislative Assembly", ("Senate", 27, 4, False), ("House of Representatives", 51, 4, False)),
 "GU": ("Legislature of Guam", ("Legislature (unicameral)", 15, 2, False), None),
 "VI": ("Legislature of the Virgin Islands", ("Legislature (unicameral)", 15, 2, False), None),
 "AS": ("American Samoa Fono", ("Senate", 18, 4, False), ("House of Representatives", 21, 2, False)),
 "MP": ("Commonwealth Legislature", ("Senate", 9, 4, True), ("House of Representatives", 20, 2, False)),
}

LEG_NOTES = {
 "AR": "Senate uses a 2-4-4 term cycle after each redistricting.",
 "DE": "Senate uses a 2-4-4 term cycle after each redistricting.",
 "IL": "Senate uses a 2-4-4 term cycle; districts rotate through three groups.",
 "MN": "Senate uses a 2-4-4 cycle; all 67 seats elected together (next 2026).",
 "NJ": "Senate uses a 2-4-4 cycle; all 40 seats elected together in odd years (next 2027).",
 "TX": "Senate uses a 2-4-4 cycle after redistricting, staggered by lot.",
 "MI": "All 38 Senate seats elected together in gubernatorial years (2026).",
 "KS": "All 40 Senate seats elected together in presidential years (next 2028).",
 "NM": "All 42 Senate seats elected together in presidential years (next 2028).",
 "SC": "All 46 Senate seats elected together in presidential years (next 2028).",
 "VA": "All 40 Senate seats elected together in odd years (next 2027); House of Delegates every odd year.",
 "AL": "Both chambers elected together in gubernatorial years (2026).",
 "MD": "Both chambers elected together in gubernatorial years (2026).",
 "LA": "Both chambers elected together in odd years with statewide offices (next 2027).",
 "MS": "Both chambers elected together in odd years with statewide offices (next 2027).",
 "ND": "House and Senate seats in half the districts are elected each even year.",
 "NE": "Nonpartisan unicameral; half the seats elected each even year.",
 "DC": "8 ward members + 4 at-large members + at-large chair; at-large seats staggered; no more than 2 of the at-large non-chair seats may be held by the majority party (Home Rule Act sec. 401).",
 "PR": "Minimum 27 senators / 51 representatives; minority-party seats may be added (Const. art. III sec. 7). 11 at-large seats in each house. Next general election 2028-11-07.",
 "AS": "Senate: 18 matai chosen by county councils under Samoan custom, 4-year terms. House: 20 elected by ballot + 1 non-voting Swains Island delegate chosen in open meeting, 2-year terms.",
 "MP": "Senate: 9 (3 per senatorial district: Saipan, Tinian/Aguijan, Rota), two classes. House: 20 from 7 districts.",
 "GU": "15 senators elected at large.",
 "VI": "15 senators: 7 St. Croix, 7 St. Thomas-St. John, 1 at-large (must reside on St. John).",
}

# legislative term limits: code -> (upperLimit, lowerLimit)
LTL = {
 "AZ": (cons(8, 4, "4 consecutive terms; may return after 1 term out"), cons(8, 4, "4 consecutive terms; may return after 1 term out")),
 "AR": (cons(12, None, "12 consecutive years combined in either chamber; eligible again after 4 years out"),) * 2,
 "CA": (life(12, None, "12 years combined, either chamber (members first elected after June 5, 2012)"),) * 2,
 "CO": (cons(8, 2, "2 consecutive 4-year terms; may return after 4 years"), cons(8, 4, "4 consecutive 2-year terms; may return after 4 years")),
 "FL": (cons(8, None, "8 consecutive years"),) * 2,
 "LA": (cons(12, 3, "3 consecutive terms"),) * 2,
 "ME": (cons(8, 4, "4 consecutive terms"),) * 2,
 "MI": (life(12, None, "12 years combined, either chamber (2022 Proposal 1)"),) * 2,
 "MO": (life(8, 2, "2 terms in Senate; 16 years total across both chambers"), life(8, 4, "4 terms in House; 16 years total across both chambers")),
 "MT": (cons(8, 2, "8 years in any 16-year period"), cons(8, 4, "8 years in any 16-year period")),
 "NE": (cons(8, 2, "2 consecutive terms; may return after 4 years"),),
 "NV": (life(12, 3, "12 years lifetime in Senate"), life(12, 6, "12 years lifetime in Assembly")),
 "ND": (life(8, None, "8 years cumulative in each chamber; applies to those elected after 2022 Measure 1"),) * 2,
 "OH": (cons(8, 2, "2 consecutive terms; may return after 4 years"), cons(8, 4, "4 consecutive terms; may return after 4 years")),
 "OK": (life(12, None, "12 years combined service in either chamber"),) * 2,
 "SD": (cons(8, 4, "4 consecutive terms"),) * 2,
}

# legislative vacancy rule: code -> (method, appointedBy, notes, citation, estimate)
LV = {
 "AL": ("special-election", None, "Governor issues writ for special election.", "Ala. Const. art. IV; Code of Ala. sec. 17-15-1", False),
 "AK": ("appointment", "governor, from same party as predecessor; confirmed by the party's members of the chamber", "Appointee serves until next general election.", "Alaska Stat. sec. 24.10.130; 15.40.320-.330", False),
 "AZ": ("appointment", "county board of supervisors from 3 nominees of the predecessor's party precinct committeemen", "Appointee serves remainder of term.", "Ariz. Const. art. IV pt. 2 sec. 12; A.R.S. sec. 41-1202", False),
 "AR": ("special-election", None, "Governor calls special election.", "Ark. Const. art. 5 sec. 6; A.C.A. sec. 7-11-101", False),
 "CA": ("special-election", None, "Governor calls special primary and general within ~14 days of vacancy.", "Cal. Const. art. IV sec. 2(d); Cal. Elec. Code sec. 10700", False),
 "CO": ("appointment", "vacancy committee of the predecessor's political party", "Senate appointee filling the first half of a term must stand at the next even-year general election.", "Colo. Const. art. V sec. 3; C.R.S. sec. 1-12-203", False),
 "CT": ("special-election", None, "Governor issues writ within 10 days; election ~46 days later.", "Conn. Gen. Stat. sec. 9-212", False),
 "DE": ("special-election", None, "Presiding officer issues writ for special election.", "15 Del. C. sec. 7101 et seq.", True),
 "FL": ("special-election", None, "Governor sets special primary and election.", "Fla. Stat. sec. 100.101, 100.111", False),
 "GA": ("special-election", None, "Governor issues writ within 10 days; nonpartisan-format special election.", "O.C.G.A. sec. 21-2-540, 21-2-541", False),
 "HI": ("appointment", "governor from 3 nominees of the predecessor's party", "Senate seat: appointee serves until next general election if more than half of term remains, then special election for remainder.", "Haw. Const. art. III sec. 5; HRS sec. 17-3, 17-4", False),
 "ID": ("appointment", "governor from 3 nominees of the legislative district party committee", "", "Idaho Code sec. 59-904A", False),
 "IL": ("appointment", "legislative or representative committee of the predecessor's party", "Appointment within 30 days; Senate seat with more than 28 months left goes to special election at next general election.", "Ill. Const. art. IV sec. 2(d); 10 ILCS 5/25-6", False),
 "IN": ("appointment", "party caucus of precinct committee members in the district", "", "Ind. Code 3-13-5", False),
 "IA": ("special-election", None, "Governor orders special election within 5 days; held within 40 days.", "Iowa Code sec. 69.14", False),
 "KS": ("appointment", "governor, appointing the person selected by the predecessor's party district convention", "", "K.S.A. 25-3902, 25-3903", False),
 "KY": ("special-election", None, "Governor (or presiding officer) issues writ.", "Ky. Const. sec. 152; KRS 118.730", True),
 "LA": ("special-election", None, "Presiding officer issues writ.", "La. R.S. 18:601-602", False),
 "ME": ("special-election", None, "Governor calls special election.", "21-A M.R.S. sec. 366", True),
 "MD": ("appointment", "governor, appointing the person named by the predecessor's party central committee", "Appointee serves remainder of term.", "Md. Const. art. III sec. 13", False),
 "MA": ("special-election", None, "Chamber orders special election.", "Mass. Gen. Laws ch. 3 sec. 10", True),
 "MI": ("special-election", None, "Governor may call special election.", "Mich. Const. art. V sec. 13; MCL 168.178", False),
 "MN": ("special-election", None, "Governor issues writ within 5 days.", "Minn. Stat. sec. 204D.19", False),
 "MS": ("special-election", None, "Governor issues writ for special election.", "Miss. Code sec. 23-15-851", False),
 "MO": ("special-election", None, "Governor issues writ for special election.", "Mo. Const. art. III sec. 14; RSMo sec. 21.130", True),
 "MT": ("appointment", "board of county commissioners from a list of 3 nominated by the predecessor's party", "Appointee serves until next general election.", "MCA sec. 5-2-402", True),
 "NE": ("appointment", "governor", "Nonpartisan legislature; governor appoints for remainder of term (or until next general if over half the term remains).", "Neb. Const. art. III sec. 9; Neb. Rev. Stat. sec. 32-566", True),
 "NV": ("appointment", "board of county commissioners (same party as predecessor)", "Multi-county district: commissioners of each county act jointly.", "Nev. Const. art. 4 sec. 12; NRS 218A.260", False),
 "NH": ("special-election", None, "Precept/writ for special election.", "N.H. Const. pt. II arts. 20, 34; RSA 661:8", False),
 "NJ": ("appointment-then-special", "predecessor's party county committee(s) in the district", "Appointee serves until a special election at the next general election, unless vacancy is within 51 days of it.", "N.J. Const. art. IV sec. IV para. 1; N.J.S.A. 19:13-20", False),
 "NM": ("appointment", "board of county commissioners (multi-county: governor appoints from county nominees)", "", "N.M. Const. art. IV sec. 4", False),
 "NY": ("special-election", None, "Governor may call special election (proclamation); not mandatory.", "N.Y. Pub. Off. Law sec. 42", False),
 "NC": ("appointment", "governor, appointing the person recommended by the predecessor's party district executive committee", "", "N.C. Gen. Stat. sec. 163-11", False),
 "ND": ("appointment", "district committee of the predecessor's political party", "", "N.D.C.C. sec. 16.1-13-10", False),
 "OH": ("appointment", "members of the chamber belonging to the predecessor's party (caucus vote)", "Senate: if vacancy within first 20 months of term, special election at next even-year general election.", "Ohio Const. art. II sec. 11", False),
 "OK": ("special-election", None, "Governor issues writ for special election.", "26 O.S. sec. 12-101", True),
 "OR": ("appointment", "board(s) of county commissioners from 3-5 nominees of the predecessor's party", "", "Or. Const. art. IV sec. 34", False),
 "PA": ("special-election", None, "Presiding officer issues writ within 10 days.", "Pa. Const. art. II sec. 2; 25 P.S. sec. 2778", False),
 "RI": ("special-election", None, "Secretary of state schedules special election.", "R.I. Gen. Laws title 17 (special elections)", True),
 "SC": ("special-election", None, "Special primary and election scheduled by statute.", "S.C. Code sec. 7-13-190", False),
 "SD": ("appointment", "governor", "", "S.D. Const. art. III sec. 10", False),
 "TN": ("appointment-then-special", "county legislative body (county commission) of the predecessor's county", "Interim appointee serves until special election or next general election if more than ~ year remains.", "Tenn. Const. art. II sec. 15", False),
 "TX": ("special-election", None, "Governor orders special election.", "Tex. Const. art. III sec. 13; Tex. Elec. Code sec. 203.002", False),
 "UT": ("appointment", "governor, appointing the person selected by the predecessor's party delegates", "", "Utah Const. art. VI sec. 13; Utah Code sec. 20A-1-503", False),
 "VT": ("appointment", "governor (from recommendations of the predecessor's party district committee)", "", "Vt. Const. ch. II sec. 47; 17 V.S.A. sec. 2621", True),
 "VA": ("special-election", None, "Presiding officer or governor issues writ.", "Va. Code sec. 24.2-216", False),
 "WA": ("appointment-then-special", "county legislative authority from 3 nominees of the predecessor's party precinct committee officers", "Appointee serves until a special election at the next November general election (if vacancy before filing week).", "Wash. Const. art. II sec. 15; RCW 42.12.070", False),
 "WV": ("appointment", "governor from a list of 3 submitted by the predecessor's party district executive committee", "", "W. Va. Code sec. 3-10-5", False),
 "WI": ("special-election", None, "Governor orders special election.", "Wis. Stat. sec. 8.50", False),
 "WY": ("appointment", "board(s) of county commissioners from 3 nominees of the predecessor's party", "", "Wyo. Stat. sec. 22-18-111", False),
 "DC": ("special-election", None, "Ward and non-party at-large seats: special election by the Board of Elections. At-large seat held by a party member: party central committee appoints an interim member until the special election (appointment-then-special). Chair vacancy: Council selects interim chair from at-large members.", "D.C. Code sec. 1-204.01(d)", False),
 "PR": ("appointment", "presiding officer of the chamber, on the nomination of the predecessor's political party", "Within 30 days; if party fails to nominate or member was independent, special election.", "P.R. Const. art. III sec. 8", True),
 "GU": ("special-election", None, "Governor calls special election.", "Guam Organic Act; 3 G.C.A. (Elections)", True),
 "VI": ("special-election", None, "Governor calls special election.", "Revised Organic Act of the Virgin Islands sec. 5(b); 18 V.I.C.", True),
 "AS": ("special-election", None, "House: special election. Senate: county council selects a replacement under Samoan custom.", "Rev. Const. of American Samoa art. II", True),
 "MP": ("special-election", None, "Special election if more than a year remains; otherwise filled per statute.", "N.M.I. Const. art. II sec. 10", True),
}
LV_UPPER_OVERRIDE = {
 "AS": ("appointment", "county council of the senator's county under Samoan custom (fa'amatai)", "Senators are chosen by county councils, not by ballot.", "Rev. Const. of American Samoa art. II sec. 3", True),
}

# --------------------------------------------------------- US Senate vacancy
SPECIAL_ONLY = {"KY", "ND", "OR", "RI", "WI"}
LIST3 = {"HI", "MD", "MT", "NC", "WV", "WY"}
SAME_PARTY = {"AZ", "NV", "OK"}


def senate_vac(c):
    base = {"source": PEW, "retrievedDate": R, "estimate": False, "sourceRetrieved": True,
            "citation": "U.S. Const. amend. XVII; state election code (per Pew Research Center 2024 survey of state codes)"}
    if c in SPECIAL_ONLY:
        base.update(method="special-election", appointedBy=None, sameParty=False,
                    notes="No temporary appointment; seat stays vacant until a special election." + (" Appointment power removed in 2024." if c == "KY" else ""))
    elif c in LIST3:
        base.update(method="appointment-then-special", appointedBy="governor, from a list of 3 nominees submitted by the former senator's party", sameParty=True,
                    notes="Appointee serves until a special election.")
    elif c == "UT":
        base.update(method="appointment-then-special", appointedBy="governor, from a list of 3 nominees (Pew: list comes via the state legislature/party of the former senator)", sameParty=True,
                    notes="Appointee serves until a special election.")
    elif c in SAME_PARTY:
        base.update(method="appointment-then-special", appointedBy="governor; appointee must be of the former senator's party", sameParty=True,
                    notes="OK: appointee must have been registered in that party for 5 years and may not run in the special; OK holds a stand-alone accelerated special election." if c == "OK" else "Appointee serves until a special election.")
    elif c == "CT":
        base.update(method="special-election", appointedBy="governor only if 1 year or less remains, with 2/3 approval of each legislative house (per Pew)", sameParty=False,
                    notes="Most restrictive rule in the country (Pew 2024).", estimate=True)
    else:
        base.update(method="appointment-then-special", appointedBy="governor (no party restriction)", sameParty=False,
                    notes="Appointee serves until a special election, usually at the next regular general election.")
        if c == "AK":
            base["notes"] += " Alaska's 2004 ballot measure removing appointment conflicts with statute; Pew counts Alaska among appointing states."
            base["estimate"] = True
    return base


# ----------------------------------------------------- governor succession
SUCC = {  # successor, citation
 "AL": ("lieutenant governor", "Ala. Const. art. V sec. 127"),
 "AK": ("lieutenant governor", "Alaska Const. art. III sec. 10"),
 "AZ": ("secretary of state (lieutenant governor from January 2027, after the first LG is elected in 2026 under Prop. 131 of 2022)", "Ariz. Const. art. V sec. 6"),
 "AR": ("lieutenant governor", "Ark. Const. art. VI sec. 5 (as amended)"),
 "CA": ("lieutenant governor", "Cal. Const. art. V sec. 10"),
 "CO": ("lieutenant governor", "Colo. Const. art. IV sec. 13(7)"),
 "CT": ("lieutenant governor", "Conn. Const. art. IV secs. 18-21"),
 "DE": ("lieutenant governor", "Del. Const. art. III sec. 20"),
 "FL": ("lieutenant governor", "Fla. Const. art. IV sec. 3; Fla. Stat. 14.055"),
 "GA": ("lieutenant governor", "Ga. Const. art. V sec. I para. V"),
 "HI": ("lieutenant governor", "Haw. Const. art. V sec. 4; HRS sec. 26-2"),
 "ID": ("lieutenant governor", "Idaho Const. art. IV secs. 12-14"),
 "IL": ("lieutenant governor", "Ill. Const. art. V sec. 6; Governor Succession Act"),
 "IN": ("lieutenant governor", "Ind. Const. art. 5 sec. 10"),
 "IA": ("lieutenant governor", "Iowa Const. art. IV secs. 17-19"),
 "KS": ("lieutenant governor", "K.S.A. 75-125"),
 "KY": ("lieutenant governor", "Ky. Const. secs. 84, 85, 87"),
 "LA": ("lieutenant governor", "La. Const. art. IV sec. 14"),
 "ME": ("president of the senate", "Me. Const. art. V pt. 1 sec. 14"),
 "MD": ("lieutenant governor", "Md. Const. art. II sec. 6"),
 "MA": ("lieutenant governor", "Mass. Const. amend. art. LV"),
 "MI": ("lieutenant governor", "Mich. Const. art. V sec. 26"),
 "MN": ("lieutenant governor", "Minn. Const. art. V sec. 5; Minn. Stat. 4.06"),
 "MS": ("lieutenant governor", "Miss. Const. art. V sec. 131"),
 "MO": ("lieutenant governor", "Mo. Const. art. IV sec. 11(a)"),
 "MT": ("lieutenant governor", "Mont. Const. art. VI sec. 6; MCA 2-16-511 to -513"),
 "NE": ("lieutenant governor", "Neb. Const. art. IV sec. 16; Neb. Rev. Stat. 84-120"),
 "NV": ("lieutenant governor", "NRS 223.080"),
 "NH": ("president of the senate", "N.H. Const. pt. II art. 49"),
 "NJ": ("lieutenant governor", "N.J. Const. art. V sec. I para. 7; N.J.S.A. 52:14A-4"),
 "NM": ("lieutenant governor", "N.M. Const. art. V sec. 7"),
 "NY": ("lieutenant governor", "N.Y. Const. art. IV secs. 5-6"),
 "NC": ("lieutenant governor", "N.C. Const. art. III sec. 3; G.S. 147-11.1"),
 "ND": ("lieutenant governor", "N.D. Const. art. V sec. 11"),
 "OH": ("lieutenant governor", "Ohio Const. art. III sec. 15; R.C. ch. 161"),
 "OK": ("lieutenant governor", "Okla. Const. art. VI sec. 15"),
 "OR": ("secretary of state", "Or. Const. art. V sec. 8a"),
 "PA": ("lieutenant governor", "Pa. Const. art. IV secs. 13-14"),
 "RI": ("lieutenant governor", "R.I. Const. art. IX secs. 9-10"),
 "SC": ("lieutenant governor", "S.C. Const. art. IV secs. 6-7; S.C. Code 1-3-120"),
 "SD": ("lieutenant governor", "S.D. Const. art. IV sec. 6"),
 "TN": ("speaker of the senate (holds the title lieutenant governor)", "Tenn. Const. art. III sec. 12"),
 "TX": ("lieutenant governor", "Tex. Const. art. IV secs. 3a, 16-18; Tex. Gov't Code 401.023"),
 "UT": ("lieutenant governor", "Utah Const. art. VII sec. 11"),
 "VT": ("lieutenant governor", "Vt. Const. ch. II sec. 20; 3 V.S.A. sec. 1"),
 "VA": ("lieutenant governor", "Va. Const. art. V sec. 16"),
 "WA": ("lieutenant governor", "Wash. Const. art. III sec. 10"),
 "WV": ("president of the senate (holds the title lieutenant governor)", "W. Va. Code sec. 6A-1-4a; W. Va. Const. art. VII sec. 16"),
 "WI": ("lieutenant governor", "Wis. Const. art. V secs. 7-8"),
 "WY": ("secretary of state", "Wyo. Const. art. IV sec. 6"),
 "DC": ("chairman of the Council (acting mayor) until a special election", "D.C. Home Rule Act sec. 421(c)(2)"),
 "PR": ("secretary of state", "P.R. Const. art. IV sec. 8; Law No. 7 of 2005"),
 "GU": ("lieutenant governor", "Guam Organic Act sec. 1422(b) (48 U.S.C. 1422)"),
 "VI": ("lieutenant governor", "Revised Organic Act of the Virgin Islands sec. 1595"),
 "AS": ("lieutenant governor", "Rev. Const. of American Samoa art. IV sec. 4; A.S.C.A. 4.0106"),
 "MP": ("lieutenant governor", "N.M.I. Const. art. III sec. 7"),
}

# governor: termYears, termLimit, nextElection
GOV_TL = {}
for c in "AL AK AZ CO FL GA HI KS KY LA ME MD NE NJ NM NC OH PA RI SC SD TN WV".split():
    GOV_TL[c] = cons(8, 2, "2 consecutive terms; eligible again after 4 years")
GOV_TL["IN"] = cons(8, 2, "8 years in any 12-year period")
GOV_TL["OR"] = cons(8, 2, "8 years in any 12-year period")
GOV_TL["MT"] = cons(8, 2, "8 years in any 16-year period")
GOV_TL["WY"] = cons(8, 2, "8 years in any 16-year period")
for c in "AR CA DE MI MS MO NV ND OK".split():
    GOV_TL[c] = life(None, 2, "2 terms lifetime")
GOV_TL["VA"] = cons(None, 1, "may not serve consecutive terms; eligible again after 4 years")
for c in "CT ID IL IA MA MN NH NY TX UT VT WA WI DC PR".split():
    GOV_TL[c] = none_tl()
for c in "GU VI AS MP".split():
    GOV_TL[c] = cons(8, 2, "2 consecutive terms")
GOV_TERM = {c: 4 for c in LEG}
GOV_TERM["NH"] = 2
GOV_TERM["VT"] = 2
GOV_YEAR = {c: 2026 for c in LEG}
for c in "DE IN MO MT NC ND UT WA WV PR AS".split():
    GOV_YEAR[c] = 2028
for c in "KY LA MS".split():
    GOV_YEAR[c] = 2027
for c in "NJ VA".split():
    GOV_YEAR[c] = 2029

LG_TICKET = set("AK AZ CO CT FL HI IL IN IA KS KY MD MA MI MN MT NE NJ NM NY ND OH PA SC SD UT WI GU VI AS MP".split())
LG_SEPARATE = set("AL AR CA DE GA ID LA MS MO NV NC OK RI TX VT VA WA".split())

# which states apply the governor's limit (or a similar one) to other statewide officers
OTHER_TL = {
 "AZ": cons(8, 2, "2 consecutive terms (all state executive officers)"),
 "AR": life(None, 2, "2 terms lifetime (all constitutional officers)"),
 "CA": life(None, 2, "2 terms lifetime (all constitutional officers)"),
 "CO": cons(8, 2, "2 consecutive terms"),
 "FL": cons(8, 2, "2 consecutive terms (Cabinet)"),
 "KY": cons(8, 2, "2 consecutive terms"),
 "MI": life(None, 2, "2 terms (SoS and AG)"),
 "MT": cons(8, 2, "8 years in any 16-year period"),
 "NE": cons(8, 2, "2 consecutive terms (estimate for officers other than governor)"),
 "NV": life(None, 2, "2 terms lifetime (all constitutional officers)"),
 "NM": cons(8, 2, "2 consecutive terms"),
 "OH": cons(8, 2, "2 consecutive terms"),
 "OK": life(8, 2, "8 years / 2 terms (2010 SQ 747 limits statewide elected officers)"),
 "OR": cons(8, 2, "8 years in any 12-year period (SoS, Treasurer)"),
 "PA": cons(8, 2, "2 consecutive terms"),
 "RI": cons(8, 2, "2 consecutive terms (all general officers)"),
 "SD": cons(8, 2, "2 consecutive terms"),
 "AL": cons(8, 2, "2 consecutive terms (estimate for officers other than governor)"),
 "IN": cons(8, 2, "8 years in any 12-year period (SoS, Treasurer, Auditor)"),
 "NC": cons(8, 2, "2 consecutive terms (lieutenant governor only; others unlimited)"),
}
OTHER_TL_EST = {"AL", "NE", "OK", "NC", "MI"}

# Exec office definitions
TITLES = {
 "lieutenant-governor": "Lieutenant Governor", "attorney-general": "Attorney General", "secretary-of-state": "Secretary of State",
 "treasurer": "Treasurer", "auditor": "State Auditor", "comptroller": "Comptroller", "controller": "State Controller",
 "superintendent": "Superintendent of Public Instruction", "agriculture-commissioner": "Commissioner of Agriculture",
 "insurance-commissioner": "Insurance Commissioner", "labor-commissioner": "Commissioner of Labor",
 "land-commissioner": "Commissioner of Public Lands",
}

# state -> list of (key, title override or None, nextYear override or None, extra dict)
EX = {
 "AL": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", ("agriculture-commissioner", "Commissioner of Agriculture and Industries"),
        ("public-service-commission", "Public Service Commission (president + 2 associate commissioners, statewide)", 2026, {"seats": 3, "staggered": True, "notes": "Places 1 and 2 elected 2026; president elected 2024 (2028)."})],
 "AK": ["lieutenant-governor"],
 "AZ": [("lieutenant-governor", "Lieutenant Governor (new office, first elected 2026 on ticket with governor; Prop. 131 of 2022)"), "secretary-of-state", "attorney-general", "treasurer", "superintendent",
        ("state-mine-inspector", "State Mine Inspector"), ("corporation-commission", "Corporation Commission (5 members, statewide, staggered 4-year terms)", 2026, {"seats": 5, "staggered": True, "notes": "2 seats in 2026, 3 in 2028."})],
 "AR": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", ("land-commissioner", "Commissioner of State Lands")],
 "CA": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("controller", "State Controller"), "insurance-commissioner", ("superintendent", "Superintendent of Public Instruction (nonpartisan)")],
 "CO": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer"],
 "CT": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("comptroller", "Comptroller")],
 "DE": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2026), ("treasurer", None, 2026), ("auditor", "Auditor of Accounts", 2026), ("insurance-commissioner", None, 2028)],
 "FL": ["lieutenant-governor", "attorney-general", ("treasurer", "Chief Financial Officer"), "agriculture-commissioner"],
 "GA": ["lieutenant-governor", "attorney-general", "secretary-of-state", ("superintendent", "State School Superintendent"), "agriculture-commissioner", "insurance-commissioner", "labor-commissioner",
        ("public-service-commission", "Public Service Commission (5 members, elected statewide from residency districts, staggered 6-year terms)", 2026, {"seats": 5, "staggered": True, "estimate": True, "notes": "Elections delayed 2022-2024 by litigation; 2 seats filled in 2025 specials; next seats 2026."})],
 "HI": ["lieutenant-governor", ("office-of-hawaiian-affairs-trustees", "Office of Hawaiian Affairs Board of Trustees (9; 4 at-large statewide, 5 island-residency, nonpartisan)", 2026, {"seats": 9, "staggered": True, "notes": "Statewide vote; all voters may vote."})],
 "ID": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("controller", "State Controller"), "superintendent"],
 "IL": ["lieutenant-governor", "attorney-general", "secretary-of-state", ("comptroller", "Comptroller"), "treasurer"],
 "IN": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2028), ("secretary-of-state", None, 2026), ("treasurer", None, 2026), ("auditor", "Auditor of State", 2026)],
 "IA": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("auditor", "Auditor of State"), ("agriculture-commissioner", "Secretary of Agriculture")],
 "KS": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "insurance-commissioner"],
 "KY": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("auditor", "Auditor of Public Accounts"), "agriculture-commissioner"],
 "LA": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("agriculture-commissioner", "Commissioner of Agriculture and Forestry"), "insurance-commissioner"],
 "ME": [],
 "MD": ["lieutenant-governor", "attorney-general", ("comptroller", "Comptroller")],
 "MA": ["lieutenant-governor", "attorney-general", ("secretary-of-state", "Secretary of the Commonwealth"), ("treasurer", "Treasurer and Receiver-General"), "auditor"],
 "MI": ["lieutenant-governor", "attorney-general", "secretary-of-state",
        ("state-board-of-education", "State Board of Education (8 members, statewide, 8-year staggered terms)", 2026, {"seats": 8, "staggered": True, "termYears": 8, "notes": "2 seats each even year."}),
        ("university-boards", "University of Michigan Regents, Michigan State Trustees, Wayne State Governors (8 each, statewide, 8-year staggered)", 2026, {"seats": 24, "staggered": True, "termYears": 8, "notes": "2 seats per board each even year."})],
 "MN": ["lieutenant-governor", "attorney-general", "secretary-of-state", "auditor"],
 "MS": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", ("agriculture-commissioner", "Commissioner of Agriculture and Commerce"), "insurance-commissioner"],
 "MO": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2028), ("secretary-of-state", None, 2028), ("treasurer", None, 2028, {"termLimit": life(None, 2, "2 terms (Mo. Const. art. IV sec. 15)")}), ("auditor", None, 2026)],
 "MT": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2028), ("secretary-of-state", None, 2028), ("auditor", "State Auditor (Commissioner of Securities and Insurance)", 2028), ("superintendent", None, 2028)],
 "NE": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("auditor", "Auditor of Public Accounts")],
 "NV": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("controller", "State Controller")],
 "NH": [],
 "NJ": [("lieutenant-governor", None, 2029)],
 "NM": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", ("land-commissioner", "Commissioner of Public Lands")],
 "NY": ["lieutenant-governor", "attorney-general", ("comptroller", "Comptroller")],
 "NC": [(k, None, 2028) for k in ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", "superintendent", "agriculture-commissioner", "insurance-commissioner", "labor-commissioner"]],
 "ND": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2026), ("secretary-of-state", None, 2026), ("treasurer", None, 2028), ("auditor", None, 2028),
        ("superintendent", "Superintendent of Public Instruction (nonpartisan)", 2028), ("agriculture-commissioner", None, 2026), ("insurance-commissioner", None, 2028), ("tax-commissioner", "Tax Commissioner", 2026),
        ("public-service-commission", "Public Service Commission (3 members, statewide, staggered 6-year terms)", 2026, {"seats": 3, "staggered": True, "termYears": 6, "notes": "1 seat each even year."})],
 "OH": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor"],
 "OK": ["lieutenant-governor", "attorney-general", "treasurer", ("auditor", "State Auditor and Inspector"), "superintendent", "labor-commissioner", "insurance-commissioner",
        ("corporation-commission", "Corporation Commission (3 members, statewide, staggered 6-year terms)", 2026, {"seats": 3, "staggered": True, "termYears": 6, "notes": "1 seat each even year."})],
 "OR": [("secretary-of-state", None, 2028), ("attorney-general", None, 2028), ("treasurer", None, 2028), ("labor-commissioner", "Commissioner of Labor and Industries (nonpartisan)", 2026)],
 "PA": ["lieutenant-governor", ("attorney-general", None, 2028), ("auditor", "Auditor General", 2028), ("treasurer", None, 2028)],
 "RI": ["lieutenant-governor", "attorney-general", "secretary-of-state", ("treasurer", "General Treasurer")],
 "SC": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("comptroller", "Comptroller General"), ("superintendent", "Superintendent of Education"), "agriculture-commissioner"],
 "SD": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor", ("land-commissioner", "Commissioner of School and Public Lands"),
        ("public-utilities-commission", "Public Utilities Commission (3 members, statewide, staggered 6-year terms)", 2026, {"seats": 3, "staggered": True, "termYears": 6, "notes": "1 seat each even year."})],
 "TN": [],
 "TX": ["lieutenant-governor", "attorney-general", ("comptroller", "Comptroller of Public Accounts"), ("land-commissioner", "Commissioner of the General Land Office"), "agriculture-commissioner",
        ("railroad-commission", "Railroad Commission (3 members, statewide, staggered 6-year terms)", 2026, {"seats": 3, "staggered": True, "termYears": 6, "notes": "1 seat each even year."})],
 "UT": [("lieutenant-governor", None, 2028), ("attorney-general", None, 2028), ("treasurer", None, 2028), ("auditor", None, 2028)],
 "VT": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("auditor", "Auditor of Accounts")],
 "VA": [("lieutenant-governor", None, 2029), ("attorney-general", None, 2029)],
 "WA": [(k, None, 2028) for k in ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", "auditor"]] + [("land-commissioner", "Commissioner of Public Lands", 2028), ("superintendent", "Superintendent of Public Instruction (nonpartisan)", 2028), ("insurance-commissioner", None, 2028)],
 "WV": [(k, None, 2028) for k in ["attorney-general", "secretary-of-state", "treasurer", "auditor", "agriculture-commissioner"]],
 "WI": ["lieutenant-governor", "attorney-general", "secretary-of-state", "treasurer", ("superintendent", "Superintendent of Public Instruction (nonpartisan, spring election)", 2029)],
 "WY": ["secretary-of-state", "auditor", "treasurer", "superintendent"],
 "DC": [("attorney-general", "Attorney General for the District of Columbia", 2026), ("council-chair", "Chairman of the Council (elected citywide)", 2026),
        ("state-board-of-education-president", "State Board of Education at-large member/president (citywide, nonpartisan)", 2026, {"estimate": True})],
 "PR": [],
 "GU": ["lieutenant-governor", ("attorney-general", "Attorney General of Guam", 2026, {"estimate": True}), ("public-auditor", "Public Auditor (nonpartisan)", 2028, {"estimate": True}),
        ("consolidated-commission-on-utilities", "Consolidated Commission on Utilities (5, islandwide, nonpartisan)", 2026, {"seats": 5, "staggered": True, "estimate": True})],
 "VI": ["lieutenant-governor", ("board-of-education", "Board of Education (territory-wide/district, nonpartisan)", 2026, {"estimate": True}), ("board-of-elections", "Board of Elections (district, nonpartisan)", 2026, {"estimate": True})],
 "AS": [("lieutenant-governor", None, 2028)],
 "MP": ["lieutenant-governor", ("attorney-general", "Attorney General (elected since 2014)", 2026, {"estimate": True}), ("board-of-education", "Board of Education (elected)", 2026, {"estimate": True})],
}

DISTRICT_BODIES = {
 "AL": ["State Board of Education (8 districts + governor)"], "CO": ["State Board of Education (districts)", "University of Colorado Regents (districts + 1 at-large)"],
 "LA": ["Public Service Commission (5 districts)", "Board of Elementary and Secondary Education (8 elected districts)"],
 "MS": ["Public Service Commission (3 districts)", "Transportation Commission (3 districts)"], "MT": ["Public Service Commission (5 districts)"],
 "NE": ["Public Service Commission (5 districts)", "State Board of Education (8 districts)", "University of Nebraska Regents (districts)"],
 "NV": ["Board of Regents (13 districts)"], "NH": ["Executive Council (5 districts)"], "MA": ["Governor's Council (8 districts)"],
 "OH": ["State Board of Education (11 elected districts)"], "TX": ["State Board of Education (15 districts)"],
 "UT": ["State Board of Education (15 districts, partisan since 2024)"], "KS": ["State Board of Education (10 districts)"],
 "CA": ["Board of Equalization (4 districts)"], "NM": ["Public Education Commission (districts)"], "MI": [], "DC": ["State Board of Education (8 wards)", "Advisory Neighborhood Commissions"],
}

LG_VAC = {  # method, appointedBy, notes
 "AL": ("remains-vacant", None, "President pro tempore of the Senate presides; office stays vacant until next election."),
 "AK": ("appointment", "governor (secretary-of-state-style succession by statute)", ""),
 "AZ": ("appointment", "governor, with legislative confirmation (new office; implementing law)", ""),
 "AR": ("remains-vacant", None, "President pro tempore performs duties."),
 "CA": ("appointment", "governor, confirmed by both houses of the legislature", "Gov. Code sec. 1774."),
 "CO": ("appointment", "governor, confirmed by majority of each house", ""),
 "CT": ("remains-vacant", None, "President pro tempore of the Senate becomes acting lieutenant governor."),
 "DE": ("remains-vacant", None, "President pro tempore presides."),
 "FL": ("appointment", "governor", ""),
 "GA": ("remains-vacant", None, "President pro tempore of the Senate presides."),
 "HI": ("remains-vacant", None, "Next in line (Senate president) acts if both offices vacant."),
 "ID": ("appointment", "governor", ""),
 "IL": ("remains-vacant", None, "Office stays vacant until next election."),
 "IN": ("appointment", "governor, confirmed by both houses", ""),
 "IA": ("appointment", "governor", ""),
 "KS": ("appointment", "governor", ""),
 "KY": ("remains-vacant", None, "Senate president is next in line."),
 "LA": ("appointment", "governor, confirmed by both houses", ""),
 "MD": ("appointment", "governor, confirmed by majority of General Assembly in joint session", ""),
 "MA": ("remains-vacant", None, ""),
 "MI": ("remains-vacant", None, "Office stays vacant until next election."),
 "MN": ("appointment", "the president of the senate becomes lieutenant governor ex officio", ""),
 "MS": ("remains-vacant", None, "President pro tempore presides."),
 "MO": ("appointment", "governor", ""),
 "MT": ("appointment", "governor", ""),
 "NE": ("appointment", "governor", ""),
 "NV": ("appointment", "governor", ""),
 "NJ": ("appointment", "governor (in practice; 2023 precedent)", ""),
 "NM": ("appointment", "governor", ""),
 "NY": ("appointment", "governor (upheld in Skelos v. Paterson, 2009)", ""),
 "NC": ("remains-vacant", None, "President pro tempore presides."),
 "ND": ("appointment", "governor", ""),
 "OH": ("appointment", "governor, confirmed by both houses", ""),
 "OK": ("remains-vacant", None, "President pro tempore is next in line."),
 "PA": ("appointment", "the president pro tempore of the Senate becomes lieutenant governor", ""),
 "RI": ("remains-vacant", None, ""),
 "SC": ("appointment", "governor, with Senate advice and consent", ""),
 "SD": ("appointment", "governor", ""),
 "TX": ("appointment", "the Senate elects one of its members to perform the duties", ""),
 "UT": ("appointment", "governor, with Senate consent", ""),
 "VT": ("appointment", "governor", ""),
 "VA": ("remains-vacant", None, "Senate president pro tempore presides."),
 "WA": ("appointment", "governor", ""),
 "WI": ("remains-vacant", None, ""),
}


def gov_row(c, territory=False):
    succ, cit = SUCC[c]
    title = "Mayor" if c == "DC" else "Governor"
    return {
        "key": "mayor" if c == "DC" else "governor", "title": title,
        "termYears": GOV_TERM[c], "termLimit": GOV_TL[c],
        "nextRegularElectionYear": GOV_YEAR[c],
        "vacancyRule": {
            "method": "special-election" if c == "DC" else "succession",
            "appointedBy": None, "successor": succ,
            "notes": "Successor serves the remainder of the term in most places; some states set a special election when the vacancy comes early in a term (check statute)." if c != "DC" else "Council chairman serves as acting mayor until a special election.",
            "citation": cit, "source": W_SUCC, "retrievedDate": R, "estimate": False, "sourceRetrieved": True,
        },
        "citation": cit, "source": W_SUCC if not GOV_TL[c].get("kind") == "x" else W_TL,
        "termLimitSource": W_TL, "retrievedDate": R, "estimate": False, "sourceRetrieved": True,
    }


def exec_row(c, spec):
    extra = {}
    if isinstance(spec, str):
        key, title, year = spec, None, None
    else:
        key = spec[0]
        title = spec[1] if len(spec) > 1 else None
        year = spec[2] if len(spec) > 2 else None
        extra = spec[3] if len(spec) > 3 else {}
    title = title or TITLES.get(key, key.replace("-", " ").title())
    year = year or GOV_YEAR[c]
    term = extra.get("termYears", 2 if c == "VT" else (6 if key in ("railroad-commission", "corporation-commission", "public-service-commission", "public-utilities-commission") and c in ("OK", "TX", "SD", "ND", "AL", "GA") else 4))
    if c == "AL" and key == "public-service-commission":
        term = 4
    if c == "GA" and key == "public-service-commission":
        term = 6
    tl = extra.get("termLimit")
    tl_est = False
    if tl is None:
        if key == "lieutenant-governor" and c in LG_TICKET:
            tl = dict(GOV_TL.get(c, none_tl())) if c not in ("KS", "NJ", "VA") else none_tl()
            if c in ("PA", "OH", "CO", "SD", "NM", "KY", "FL", "MD", "SC", "NE", "MT", "AZ", "HI", "AK", "GU", "VI", "AS", "MP", "IN"):
                tl_est = True
        elif c in OTHER_TL and not key.endswith("commission") and "board" not in key:
            tl = OTHER_TL[c]
            tl_est = c in OTHER_TL_EST
        else:
            tl = none_tl()
            tl_est = c not in ("CT", "ID", "IL", "IA", "MA", "MN", "NY", "TX", "UT", "VT", "WA", "WI")
    row = {"key": key, "title": title, "termYears": term, "termLimit": tl, "nextRegularElectionYear": year}
    if key == "lieutenant-governor":
        row["electedWithGovernorOnTicket"] = c in LG_TICKET
        if c == "AZ":
            row["notes"] = "First elected 2026; takes office January 2027 and becomes first in line of succession."
        m = LG_VAC.get(c, ("appointment", "governor", "Territory practice; verify against organic act/constitution."))
        vac = {"method": m[0], "appointedBy": m[1], "successor": None, "notes": m[2]}
        vac_est = True
    else:
        if key.endswith("commission") or "board" in key or key in ("council-chair", "public-auditor", "university-boards"):
            vac = {"method": "appointment", "appointedBy": "governor (until next general election)" if c not in ("DC",) else "Council (interim) until special election", "successor": None,
                   "notes": "Generic rule for elected commissions/boards; verify statute."}
        elif c == "VA" and key == "attorney-general":
            vac = {"method": "appointment", "appointedBy": "General Assembly elects if in session; otherwise governor appoints until it does", "successor": None, "notes": "Va. Const. art. V sec. 16."}
        elif c == "MD" and key == "comptroller":
            vac = {"method": "appointment", "appointedBy": "General Assembly in joint session (governor appoints if not in session)", "successor": None, "notes": "Md. Const. art. VI sec. 1."}
        elif c == "CA":
            vac = {"method": "appointment", "appointedBy": "governor, confirmed by both houses of the legislature", "successor": None, "notes": "Cal. Gov. Code sec. 1774."}
        elif c == "TX":
            vac = {"method": "appointment", "appointedBy": "governor, with Senate confirmation", "successor": None, "notes": "Appointee serves until next general election."}
        elif c == "NC":
            vac = {"method": "appointment", "appointedBy": "governor (Council of State vacancy; by practice from the predecessor's party)", "successor": None, "notes": "N.C. Const. art. III sec. 7(3); appointee serves until next general election."}
        elif c == "OR" and key == "secretary-of-state":
            vac = {"method": "appointment-then-special", "appointedBy": "governor, from the predecessor's party", "successor": None, "notes": "Appointee serves until next general election."}
        elif c in ("DC",):
            vac = {"method": "special-election", "appointedBy": None, "successor": None, "notes": "Interim appointment then special election."}
        else:
            vac = {"method": "appointment-then-special", "appointedBy": "governor", "successor": None,
                   "notes": "Generic: governor appoints until the next general election, when the seat is filled for the remainder of the term. Some states require senate confirmation or let the appointee serve the full remainder."}
        vac_est = True
    vac.update({"citation": "State constitution executive article / election code (generic rule; not verified per office)", "source": BP_EXEC, "retrievedDate": R, "estimate": vac_est, "sourceRetrieved": False})
    if c == "VA" and key == "attorney-general":
        vac["citation"] = "Va. Const. art. V sec. 16"
    row["vacancyRule"] = vac
    for k in ("seats", "staggered", "notes"):
        if k in extra:
            row[k] = extra[k] if k != "notes" else (row.get("notes", "") + " " + extra[k]).strip()
    row.update({"citation": "State constitution executive article and election code", "source": BP_EXEC, "retrievedDate": R,
                "estimate": bool(extra.get("estimate", False) or tl_est), "sourceRetrieved": False})
    return row


def chamber(c, which, spec, tl, vac):
    name, seats, term, stag = spec
    m, by, notes, cit, est = vac
    d = {"chamber": which, "name": name, "seats": seats, "termYears": term, "termLimit": tl, "staggered": stag,
         "vacancyRule": {"method": m, "appointedBy": by, "notes": notes, "citation": cit, "source": BP_VAC, "retrievedDate": R, "estimate": est, "sourceRetrieved": False},
         "source": W_TERR if c in ("DC", "PR", "GU", "VI", "AS", "MP") else W_LEG, "termLimitSource": W_TL, "retrievedDate": R, "estimate": False, "sourceRetrieved": True}
    if c in ("DC", "PR", "GU", "VI", "AS", "MP"):
        d["vacancyRule"]["source"] = W_TERR
    return d


ELECTION_PATTERN = {
 "NJ": "Odd-year state elections: governor and both legislative chambers (Assembly every odd year; Senate 2-4-4 in odd years). Federal offices in even years.",
 "VA": "Odd-year state elections: governor, LG, AG every 4 years (2025, 2029); House of Delegates every odd year; Senate every 4 years (2027). Federal offices in even years.",
 "KY": "Odd-year statewide constitutional offices (2023, 2027); legislature in even years. Federal offices in even years.",
 "LA": "Odd-year statewide and legislative elections (Oct/Nov 2023, 2027); closed party primaries for some offices from 2026. Federal offices in even years.",
 "MS": "Odd-year statewide and legislative elections (Nov 2023, 2027). Federal offices in even years.",
 "VT": "Even-year elections every 2 years for governor and all statewide offices and legislature.",
 "NH": "Even-year elections every 2 years for governor, Executive Council and legislature.",
 "PR": "Quadrennial general elections in presidential years (2024, 2028) for governor, resident commissioner, legislature and municipalities; no 2026 general election.",
 "DC": "Even-year elections; mayor, AG and council chair in midterm years (2026); shadow senators/representative and delegate.",
 "AS": "Even-year elections; governor/LG in presidential years (2024, 2028); House and delegate every 2 years.",
 "GU": "Even-year elections; governor/LG in midterm years (2026); legislature and delegate every 2 years.",
 "VI": "Even-year elections; governor/LG in midterm years (2026); legislature and delegate every 2 years.",
 "MP": "Even-year elections; governor/LG in midterm years (2026); House every 2 years, Senate staggered 4-year.",
}
for c in "DE IN MO MT NC ND UT WA WV".split():
    ELECTION_PATTERN[c] = "Even-year elections; governor elected in presidential years (2024, 2028)."
for c in "AL AK AZ AR CA CO CT FL GA HI ID IL IA KS ME MD MA MI MN NE NV NM NY OH OK OR PA RI SC SD TN TX WI WY".split():
    ELECTION_PATTERN[c] = "Even-year elections; governor elected in midterm years (2022, 2026)."
ELECTION_PATTERN["OR"] += " SoS, Treasurer and AG in presidential years."
ELECTION_PATTERN["PA"] += " AG, Auditor General and Treasurer in presidential years."
ELECTION_PATTERN["WI"] += " Superintendent of Public Instruction and judges in spring nonpartisan elections (April, odd years for SPI)."

NAMES = {"AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
         "DC": "District of Columbia", "PR": "Puerto Rico", "GU": "Guam", "VI": "U.S. Virgin Islands", "AS": "American Samoa", "MP": "Northern Mariana Islands"}
TERR = {"DC", "PR", "GU", "VI", "AS", "MP"}

places = {}
for c, (lname, up, low) in LEG.items():
    tl = LTL.get(c, (none_tl(), none_tl()))
    vac = LV[c]
    chambers = []
    if low is None:
        chambers.append(chamber(c, "unicameral", up, tl[0], vac))
    else:
        chambers.append(chamber(c, "upper", up, tl[0], LV_UPPER_OVERRIDE.get(c, vac)))
        chambers.append(chamber(c, "lower", low, tl[1] if len(tl) > 1 else tl[0], vac))
    legis = {"name": lname, "chambers": chambers}
    if c in LEG_NOTES:
        legis["notes"] = LEG_NOTES[c]
    if c in ("GU", "VI", "MP", "PR", "DC"):
        legis["termLimitNote"] = "No legislative term limits."
    execs = [gov_row(c)] + [exec_row(c, s) for s in EX[c]]
    p = {"name": NAMES[c], "legislature": legis, "executives": execs}
    if c in DISTRICT_BODIES and DISTRICT_BODIES[c]:
        p["districtElectedStateBodies"] = {"items": DISTRICT_BODIES[c], "notes": "Elected by district, not statewide; listed for completeness.", "source": BP_EXEC, "retrievedDate": R, "estimate": True}
    if c in ("ME", "NH", "TN"):
        p["legislativelyElectedOfficers"] = {"items": ["Secretary of State", "Treasurer"] + (["Attorney General", "State Auditor"] if c == "ME" else []) + (["Comptroller"] if c == "TN" else []),
                                             "notes": "Chosen by the legislature, not by voters" + ("; TN attorney general is appointed by the state supreme court." if c == "TN" else "."), "source": BP_EXEC, "retrievedDate": R, "estimate": False, "sourceRetrieved": False}
    if c in TERR:
        p["usSenateVacancy"] = {"method": "not-applicable", "notes": "No U.S. Senate representation." + (" DC elects two non-seated 'shadow senators'." if c == "DC" else ""), "citation": "U.S. Const. art. I sec. 3", "source": W_TERR, "retrievedDate": R, "estimate": False}
        p["usHouseVacancy"] = {"method": "special-election", "office": "Resident Commissioner" if c == "PR" else "Delegate",
                               "notes": ("Resident Commissioner (4-year term, elected 2028); vacancy filled per P.R. Electoral Code (governor appointment with legislative consent is the commonly cited route)" if c == "PR" else "Non-voting delegate (2-year term); vacancy filled by special election under the territory's/District's law."),
                               "citation": "48 U.S.C. 891-894 (PR)" if c == "PR" else "Territorial/D.C. election law", "source": W_TERR, "retrievedDate": R, "estimate": True}
    else:
        p["usSenateVacancy"] = senate_vac(c)
        p["usHouseVacancy"] = {"method": "special-election", "notes": "All states fill House vacancies by special election only; no appointments. Timing set by state law (governor's writ; some states consolidate with the next regular election).", "citation": US_HOUSE_CIT, "source": "https://constitution.congress.gov/browse/article-1/section-2/clause-4/", "retrievedDate": R, "estimate": False}
    if c == "PR":
        p["generalElectionDate2026"] = {"date": None, "notes": "No general election in 2026; next general election 2028-11-07 (Puerto Rico elects in presidential years).", "source": W_TERR, "retrievedDate": R, "estimate": False}
    else:
        p["generalElectionDate2026"] = {"date": "2026-11-03", "notes": "Federal general election day (first Tuesday after first Monday in November)." + (" Louisiana runs closed party primaries for Congress from 2026; state offices elected in odd years." if c == "LA" else ""), "citation": "2 U.S.C. 7" if c not in TERR else "Territorial election law", "source": "https://www.law.cornell.edu/uscode/text/2/7", "retrievedDate": R, "estimate": False}
    p["stateElectionYears"] = {"pattern": ELECTION_PATTERN[c], "source": BP_EXEC, "retrievedDate": R, "estimate": False}
    places["US-" + c] = p

out = {"id": "state-offices-2026", "retrieved": R,
       "notes": "sourceRetrieved=true means checked against a page fetched 2026-10-12 (Wikipedia wikitext of List of U.S. state legislatures, Term limits in the United States, Gubernatorial lines of succession; Pew Research Center 2024 Senate-vacancy survey). sourceRetrieved=false means the citation names the governing constitution/statute section from compiled knowledge; NCSL, Ballotpedia and the Wayback Machine refused automated access. The Book of the States was not used. vacancyRule.method adds 'succession' (governor) and 'remains-vacant' (some lieutenant governors) beyond the three requested values.",
       "places": places}
json.dump(out, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(len(places), "places")
