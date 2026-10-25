---
id: world-session-calendar-2025-ends
title: "State session calendars hold no 2025 session end, so a 2025 act counts its effective date from passage"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/session-calendar-2025
pr: #6021
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T10:39:20.032Z
---

**What.** `data/research/laws/state-session-calendars.json` lists, under `sessionEnds`, only 2026 adjournment dates for the 21 places whose acts take effect a set time after the session ends (US-AL, US-AR, US-AS, US-AZ, US-DC, US-FL, US-HI, US-ID, US-KS, US-KY, US-ME, US-MI, US-MO, US-NC, US-NE, US-NM, US-OK, US-TX, US-UT, US-WA, US-WY). The game opens on January 20, 2025, so for any act passed in 2025 the rule finds no session end and falls back to counting from passage (`src/rules/laws/effective-date.ts:104`, registered stopgap `laws.session-end-effective-date-fallback`). In the laws end-to-end proof (seed 6685a893b8c2080d6542a87f), Burr, Nebraska's bottle deposit passed on January 20, 2025 took effect April 21, 2025, three months and a day after passage. Nebraska's rule counts from adjournment (Neb. Const. art. III, § 27), and its 2025 session adjourned June 2 (the data's own note), so the act should take effect September 3, 2025.

**Rules.** One rule, all 56 places: the same calendar rule reads each place's own session end. Estimate, never UNKNOWN: a place with no recorded end uses the median of the places read, as the 2026 rows already do.

**Done when.** Every place whose effective-date rule counts from the session end has a 2025 end (sourced where the legislature published it, else the labeled median), and in a played world (`buildBenchWorld`) an act a state legislature passes in 2025 in a randomly drawn place with such a rule takes effect on the date its rule gives from that session end, named by law id.

**Files.** data/research/laws/state-session-calendars.json, src/rules/laws/effective-date.ts

**Notes.** From the laws lead, Oct 24, reviewing the laws end-to-end proof's Burr, Nebraska chain.

2026-10-25 (claude/session-calendar-2025): 2025 adjournments added for 16 places from fetched pages (NCSL's December 22, 2025 calendar, the Kansas, Kentucky and Maine legislatures, two news pages); Missouri keeps its law's May 30 limit (its rule then gives August 28). The core reader (src/core2/state-effective-date.ts) now falls back to a place's limit, then the labeled median, as the old engine did, instead of counting from passage. D.C., Michigan, North Carolina and American Samoa have no published 2025 end and take the median.
