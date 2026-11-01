---
id: golden-town-term-start
title: "A town seat won in April starts on January 1 of the next year"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: golden-path playthrough, Oct 28
lead: play-first
milestone: play-first
---

**What.** In Gilbert, West Virginia, the council race held April 1, 2025 reports its winner taking office on January 1, 2026. A city or township office reads no start rule (the term-start table covers state offices; town charters are not read), so it falls to the table's default, January 1 after the election, written for November races. The player who wins a spring town race would wait nine months before golden path step 6 (take office, propose an ordinance).

**Rules.** Sliding scales and causes: the seat starts from the election that filled it, a few weeks after the count, not from a fixed calendar day. Taking office follows the law of the place (OWNER-DECISIONS, Oct 14); until each charter is read the lag is an ESTIMATED value with its spread under the existing stopgap SG-GOV-term-end-estimate.

**Done when.** The test src/core2/town-term-start.test.ts shows a city office elected April 1, 2025 starting April 29, 2025 and one elected in November starting January 1; it fails on main and passes on the branch; terms-and-vacancies.test.ts gives the same result on the branch as on main for the same seeds.

**Time box.** 2 hours.

**You will see.** Win a spring council race and you are sworn in about four weeks later.

**Screenshot.** None needed: the term start is a date the results and the journal read.

**Files.** src/core2/elections-calendar.ts, src/core2/data/elections/term-starts.json, src/core2/town-term-start.test.ts

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `golden/town-term-start` is kept; claiming this item takes it over.
