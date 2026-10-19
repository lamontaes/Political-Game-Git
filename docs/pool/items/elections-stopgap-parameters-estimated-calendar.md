---
id: elections-stopgap-parameters-estimated-calendar
title: "Stopgaps in parameters (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/special-elections
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/elections/parameters.json, kind estimated-calendar"
claimed-at: 2026-10-19T22:36:17.053Z
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/data/elections/parameters.json: SG-GOV-special-election-timing. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/data/elections/parameters.json

**Notes.** First row: The date of a special election where the state's law for that office family is not read: 90 days after the vacancy. Only California's U.S. House and legislative rows are read in special-election-law.json.

Oct 19 (claude/special-elections): partial. Added the U.S. House rows for Alaska (Alaska Stat. 15.40.140: special primary 60 to 90 days after the vacancy, election at least 60 days after it) and Iowa (Iowa Code 69.14: order within 5 days, at least 40 days' notice), read from GAO-24-107789 (Sept 2024), the only state-law examples in that testimony besides Arizona, Colorado and Delaware. Arizona and Colorado's 49-day rules are the extraordinary-circumstances laws, not the ordinary timing, and Delaware's governor has discretion, so those three were not added. 53 states and the other office families are still unread, so SG-GOV-special-election-timing stays open. GAO's full state table is not published in that testimony; the next step is each state's statute, or the GAO's final report.

Also added New York (Election Law 6-114, 70 to 80 days after the proclamation; read from the struck text in bills A1860 and A1610, so tagged ESTIMATED and not yet checked against the codified section). Searched and not added: Texas (first uniform election date on or after the 36th day after the governor orders it, Election Code 203.004 and 204.021; a calendar rule, not a day count), Ohio (the governor's writ sets the date, no day count, R.C. 3521.03) and Illinois (the search returned only the U.S. Senator section). Those need a 'uniform date' and a 'governor sets it' kind in elections-calendar.ts first.

Also added Washington (RCW 29A.28.041: writ within 10 days, special primary 70+ days after, general 70+ days after that; text quoted in the search result, not read from the code site) and Georgia (O.C.G.A. 21-2-543: writ within 10 days, election 30+ days after; from the 2007 Secretary of State guidance, so its current text is unchecked). Searched and not added: Wisconsin (the governor 'may' under 8.50(4); no day count found for U.S. House), Minnesota (204D.19 is the legislature's rule; the 2025 text drops Congress) and Michigan (governor's timing, no deadline). Six states are read in all: AK, IA, NY, WA, GA, plus CA from before.

Also added Pennsylvania (25 P.S. 2777), Massachusetts (ch. 54 sec. 140, 145 to 160 days) and Tennessee (2-16-101, 2-14-102, 2-6-503), each read in a third-party statute database and tagged ESTIMATED until checked on the official code. Searched and not added: Virginia (24.2-682 sets only a Tuesday and blackout rules; the U.S. House writ section was not reached), North Carolina (nothing returned) and Florida (only the state-legislative rule returned). Nine U.S. House rows are read now: CA, AK, IA, NY, WA, GA, PA, MA, TN.

Also added Maryland (Election Law 8-710: proclamation within 10 days, primary 80+ days after, general 70+ days after that) and New Jersey (A5886/S4664, January 2026, from a news report; enacted text unread). Searched and not added: Kentucky (a proclamation, but the election day count was not found; the notice deadlines vary by source), Oregon (ORS 188.120 says the governor calls an election if the vacancy comes before the 61st day before the general; no day range for the House), Missouri, Connecticut and Indiana (nothing returned). Eleven U.S. House rows are read: CA, AK, IA, NY, WA, GA, PA, MA, TN, MD, NJ.

Also added Arkansas (Ark. Code 7-8-104 and 7-7-105: election not more than 150 days after the vacancy; the 120-day nominal is a midpoint, so the least certain row here). Searched and not added: Oklahoma (26 O.S. 12-101: the governor calls the election within 30 days of the vacancy, but the election date has no day count), Alabama (Code 17-15-3 and 17-15-4: the governor sets the day by proclamation), South Carolina (7-13-190: a primary on the 11th Tuesday after the vacancy per a 2017 analysis; current text unread), Mississippi, Louisiana's House section (only the Senate section returned), Kentucky and Oregon. NCSL's page returns 403 to the fetch tool, and GAO's testimony has only a few examples. Twelve U.S. House rows are read in all. Governor-sets-the-day states (AL, OH, MI, WI) and uniform-date states (TX) need new row kinds before they can be recorded.

Added two row kinds to elections-calendar.ts, next-uniform-date and governor-sets-date, and used them for Texas (first uniform date at least 36 days after the order; uniform dates quoted from Election Code 41.001) and Ohio, Alabama and Michigan (governor sets the day). Sixteen U.S. House rows are now recorded. Wisconsin and Oklahoma were not added (no usable statute text).

Also added Vermont (17 V.S.A. 2621: within six months) and Montana (2015 law: 85 to 100 days, from a 2016 news report). Searched and not added: Utah, Nevada (chapter table only), West Virginia (the day counts are in 3-10-4, not retrieved), Hawaii (17-2 proclamation not later than 60 days before the election; the repeal bills' status unknown), Maine and New Hampshire (nothing returned), Colorado (only the extraordinary-circumstances 49-day rule) and Idaho (nothing). Eighteen U.S. House rows are recorded.

Also added Kansas (K.S.A. 25-3501/3502), Nebraska (32-564), South Dakota (12-11-1), Wyoming (from a 2015 bill's restatement, the weakest of these) and, as governor-sets-date, Delaware (tit. 15 sec. 7301) and Rhode Island (a news report). Searched and not added: New Mexico, North Dakota (only the extraordinary-circumstances 49 days), Connecticut (an NCSL line for legislative seats), Idaho, Indiana. Twenty-four U.S. House rows are recorded. Still unread for the House: AZ, CO, CT, FL, HI, ID, IL, IN, KY, LA, ME, MN, MS, MO, NV, NH, NM, NC, ND, OK, OR, SC, UT, VA, WV, WI, DC, PR, GU, VI, AS, MP.

Also added Illinois (10 ILCS 5/25-7(a): writ within 5 days, election within 180 days of it, for a vacancy over 240 days before the general), Virginia (24.2-209, governor-sets-date: the Department of Elections says the law has no timeline) and Indiana (3-10-8-1 and 3-10-8-3, governor-sets-date). Searched and not added: North Carolina (163-12 is the Senate section), Florida (only state-legislative text), Louisiana (NCSL cites 18:601: writ within 10 days, no election deadline; the section was not read) and Kentucky (the day counts returned were for legislative seats). Twenty-seven U.S. House rows are recorded.

Also added Arizona (A.R.S. 16-222 and 16-223 as amended by HB 2538, 2018: special primary 120 to 133 days out, special general 70 to 80 days after it) and Nevada (NRS 304.230: proclamation within 7 days, elections within 180 days of it), both read from the legislatures' own texts. From the Utah House staff 50-state survey (May 2017; a chart whose positions assume a mid-May vacancy, so only its groupings were used) added Florida, Missouri, Kentucky, Louisiana and Oregon as governor-sets-date and Maine as next-general; the survey also lists Utah, Idaho and North Dakota as having no statutory provision (2017). The survey puts Arkansas with Maine and Ohio on the regular general schedule, against the 150-day cap read above, so Arkansas needs its statute read. Thirty-five U.S. House rows are recorded.

Also added West Virginia (3-10-4: special general 84 to 120 days from the vacancy) and Oklahoma (26 O.S. 12-101, governor-sets-date). Searched and not added: Colorado (only the extraordinary-circumstances rule), Mississippi, South Carolina, Minnesota (2007 text only: writ within 5 days, election within 28 days of it while Congress is in session; the survey puts Minnesota past 150 days, so the current text must be read), Wisconsin, New Hampshire and Hawaii. Thirty-seven U.S. House rows are recorded.

Also added South Carolina (7-13-190(B)(2), read on the legislature's own code site: the special election on the twentieth Tuesday after the vacancy). Minnesota's 204D.19, read on the revisor's site, covers vacancies in the legislature only, not Congress, so it was not added. Official sites that answered: South Carolina, Minnesota, Nevada, West Virginia; Hawaii returned 403, Wisconsin 404, Connecticut 503, New Hampshire's RSA 661:2 has no U.S. House text, North Carolina's 163-12 is Senate only. Thirty-eight U.S. House rows are recorded.

Also added Colorado (C.R.S. 1-12-202: the governor sets a day, none within 90 days before a general election; governor-sets-date) and North Dakota (16.1-13-08.1 covers only a catastrophic vacancy; an ordinary vacancy has no timing, governor-sets-date). Searched with no usable text: Utah (le.utah.gov page returned navigation only), Idaho (Title 34 chapter 2 has no vacancy section on the page). Forty U.S. House rows are recorded.

Oct 19, end of this session's reading. Unread for the U.S. House: CT, HI, ID, MS, NH, NM, NC, UT, WI, MN (the 2017 survey puts it past 150 days; 204D.19 covers the legislature only), plus the other office families (state legislative, governor, statewide offices) and the District of Columbia and the territories. Sources tried and why they gave nothing: GAO-24-107789 (a testimony with a few examples) and GAO-25-107428 (a Q&A report with no state table); NCSL's table (403); Hawaii's, Justia's and Connecticut's code sites (403, 403, 503); Wisconsin's statute page (404, then 429); Utah's page (navigation only). The next session should read each remaining statute from its legislature's own site when it answers, or from a state election office's guide to congressional vacancies.

Later, from search results: added Connecticut (9-212: writs within 10 days, election 60 days after), New Mexico (1-15-18.1: 77 to 91 days after the vacancy), Mississippi (23-15-853: order within 60 days, election 60+ days after the order) and Hawaii (HRS 17-2, governor-sets-date). All are tagged ESTIMATED and read in mirrors or search excerpts; 44 U.S. House rows are recorded. Still unread: ID, NH, NC, UT, WI, MN, and the other office families.

State legislative family (not started): NCSL's "Filling Legislative Vacancies" summary, as quoted in a search result, groups states only coarsely: no set deadline in 10 states (including Alabama, Florida, Michigan), within 50 days in Delaware, Iowa, Minnesota and Virginia, 50 days to six months in nine states (including Connecticut, Arkansas, California, New York). That is a grouping, not a day count; each state's statute is needed. Minnesota's 204D.19 (read on the revisor's site) is the legislature's rule: writ within 5 days and election within 35 days of the writ when the legislature will be in session.

Added Idaho, New Hampshire (RSA 661:6), North Carolina (G.S. 163-13(a), on ncleg.gov) and Wisconsin (8.50(4), text not retrieved) as governor-sets-date. Forty-eight U.S. House rows are recorded. Unread for the House: Utah (the 2017 survey says no statute) and Minnesota; not recorded: the District of Columbia and the territories.
