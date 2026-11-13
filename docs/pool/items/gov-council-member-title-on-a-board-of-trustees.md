---
id: gov-council-member-title-on-a-board-of-trustees
title: 'A seat on a Board of Trustees is called "Council member" on the Calendar and Politics'
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** In Manchester, Vermont (bench seed fdbb304e-3e4b-40fb-8750-a1bba81cef52, main 5e68cde1), the town clerk offers "I want to run for the Manchester Board of Trustees." Politics shows the "Manchester Board of Trustees". But Politics' Coming up and the Calendar say "Last day to file for Council member, 2 seats" and "Election day for Council member, 2 seats". Two screens name one seat two ways. Seen: the Calendar's and Politics' filing and election lines for a town whose body is a Board of Trustees (or a Board of Aldermen, Town Board or Select Board).

**Cause.** Found in code: src/core2/offices-local.ts, `cityOffices`, about line 174. The body's name comes from `municipalBodyName` (src/core2/data/offices/body-names.json, by state and kind: Board of Trustees, Board of Aldermen, Town Council, City Council), but the member's title is the fixed string `title: "Council member"` for every municipal body.

**Fix.** Give each body name in src/core2/data/offices/body-names.json the title its members hold (Trustee for a Board of Trustees, Alderman for a Board of Aldermen, Council member for a council, Selectboard member, Supervisor and so on, with the same citation), return it beside the body name, and use it as the office's `title` in place of the fixed string. Tests or fixtures that expect "Council member" for a trustee seat follow the data.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the title is a data row read by the one office builder, with no place named in code. No hand-written player text in code: the fixed string goes.

**Done when.** A second session, on main, starts new lives in a drawn place each until one's local body is a Board of Trustees or a Board of Aldermen, then takes a screenshot of Politics and the Calendar: the filing and election lines use the body's own member title (Trustee, Alderman), matching what the clerk's counter offers.

**Waits on.** Nothing.

**Files.** src/core2/offices-local.ts, src/core2/data/offices/body-names.json
