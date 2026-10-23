---
id: office-needs-office-local-39
title: "Needs from other sessions listed in OFFICE-LOCAL.md (line 39): 2 lines"
area: office
kind: wiring
priority: 2
status: done
claimed-by: claude/office-local-39
pr: #4519
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OFFICE-LOCAL.md "Needs from other sessions" (line 39)'
claimed-at: 2026-10-15T23:24:41.985Z
---

**What.** Two requests remain on the local office day. From GOV: local meetings on the office-day calendar, member filings held until the scene, the desk and votes reading the controlled person, and the executive's sign-or-veto choice, the office's case decision and the appointer's own choice exported. From CORE: a second, salaried pay basis for stipends, and the disasters engine for emergencies. Verify what is on main (`office-day-pay.ts`, `office-day-calendar.ts` exist), close built lines and split the rest. The player would notice his council stipend paid properly and meetings on the calendar.

**Rules.** Look before you ask: check docs/ and the register first; some lines are decided; Wire to the world: each line closes when another engine reads what it wrote, by record id; An effect is a read, not a record: the pay reads the seat's pay basis and the desk reads the controlled person when they decide; One rule, all 56 places: pay and meeting calendars come from place data, with no place named in code; Placeholders: open lines keep their stopgap rows; No dice: stipends follow the body's pay rule, not a roll.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): each of the two lines in `docs/archive/2026-10-23/coordination/OFFICE-LOCAL.md` (line 39) is struck with an id or has a pool item; in the year the bench player's council seat pays its stipend on the 1st from the treasury (payment id) and a meeting appears on the calendar. Tests beside `src/core2/office-day-calendar.test.ts`. The owner plays it: sees the stipend arrive on the first of the month.

**Files.** src/core2/office-day-pay.ts, src/core2/office-day-calendar.ts, src/core2/modules/office-day.ts, docs/archive/2026-10-23/coordination/OFFICE-LOCAL.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.

**Checked Oct 15 (claude/office-local-39).** Built on main: a part-time seat's stipend arrives on the 1st from the treasury that pays it, with a transfer id `stipend:<term>:<date>` (`office-day.ts` `payStipends`), and a local body's regular meetings are on the office-day calendar by its own rule. Fixed in the same PR: the meetings where members file their own ordinances used a tunable yearly count, so a body had two sets of meeting dates; they now read the same rule (stopgap SG-OFFICE-gov-meeting-dates resolved, parameter `localRegularMeetingsPerYear` deleted). The other lines are each tracked by a registered stopgap and its own pool item: member filings voted at midnight (SG-OFFICE-member-filings-at-midnight), the desk's sign-or-veto rule copy (SG-OFFICE-desk-rule-copy), the case decision rule copy (SG-OFFICE-case-rule-copy), the stipend as a transfer and not a payroll paycheck (SG-OFFICE-stipend-transfer), and emergencies (`office-declare-an-emergency-needs-opus-core-s`).
