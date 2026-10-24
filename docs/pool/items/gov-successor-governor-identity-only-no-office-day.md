---
id: gov-successor-governor-identity-only-no-office-day
title: "A governor seated mid-year by succession stays an identity with no person, so nobody plays their office days (Sinajana, Guam)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5941
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In Sinajana, Guam (CLEMENCY_AI_SEED=449d6cfb96d84c74, draw 0, on PR 5847's branch before its fix) the governor was convicted on July 22, 2025 and term:seat:US-GU:governor:2025-01-20 ended by conviction. The seat passed to term:seat:US-GU:governor:2025-07-22, whose personId stayed null through December 18, 2025. The office-day engine runs a computer governor's day only for a holder who is a person (stateOfficeOf in src/core2/office-day-state.ts), so no clemency petition was taken up for five months with 20 prisoners serving. SG-GOV-official-identity-only is marked resolved and says a holder seated later is filled in the first time their seat is read; the office-day path does not read it that way.

**Rules.** One model, two tiers: a seat's holder who acts in the world is a person, filled in from the seat's identity when the seat starts acting. Wire to the world: show the successor's office days by record id in a played year. No dice.

**Done when.** In a played year (buildBenchWorld) of a drawn place where a governor leaves office during the run, the successor's term has a person by the next office day and that person takes up a petition or other office-day entry, named by record id; the computer-governor clemency test passes; the PR body names the place, seed and the successor's term and person ids.

**Files.** src/core2/office-day-state.ts, src/core2/modules/offices.ts, src/core2/modules/officials.ts

**Notes.** Found Oct 24 from PR 5847's unit run; that PR's clemency test now leaves the governor out of its bribes, so this gap no longer fails the test.
