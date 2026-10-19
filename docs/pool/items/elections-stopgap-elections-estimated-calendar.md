---
id: elections-stopgap-elections-estimated-calendar
title: "Stopgaps in elections (estimated-calendar): 1 open"
area: elections
kind: stopgap
priority: 3
status: claimed
claimed-by: claude/filing-deadline-georgia
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/elections.ts, kind estimated-calendar"
claimed-at: 2026-10-19T23:29:34.405Z
---

**What.** Replace or clear the 1 open estimated-calendar stopgap row(s) in src/core2/modules/elections.ts: SG-GOV-filing-deadline-estimate. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/elections.ts

**Notes.** First row: A town's filing deadline where the state's municipal rule is unread (its row in filing-deadlines.json is 'unread'): the median number of days between the candidate filing deadline and the primary over the places with a 2

Oct 19 (claude/filing-deadline-georgia): Georgia's row now reads its statute (O.C.G.A. 21-2-132(c)(3): the third Monday in August to the following Friday), and Nevada (first Monday in March plus 11 days), West Virginia (last Saturday of January) and Kentucky (second Tuesday in August) and Arizona (120 days before) are read the same way, so 16 places remain `unread`. Searched Indiana (the 88-day primary rule is measured from the primary, which the rule kinds cannot express yet) and Mississippi (the search showed no statute text); both are left. Each remaining row needs the statute text read from the code itself, not a search excerpt.

Oct 19 (later): West Virginia, Arizona and Nevada are now SOURCED, read from the official code pages (code.wvlegislature.gov, azleg.gov, leg.state.nv.us). Georgia and Kentucky stay ESTIMATED: the Georgia code page and the Kentucky statute (a compressed PDF) could not be read from the official site here.

Wyoming is also SOURCED (W.S. 22-23-302 and 22-2-104(b), from the Title 22 PDF at wyoleg.gov): 15 places remain `unread`.
Michigan is also SOURCED (MCL 168.644e, from legislature.mi.gov): 14 places remain `unread`.
