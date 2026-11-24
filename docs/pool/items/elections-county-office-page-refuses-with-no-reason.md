---
id: elections-county-office-page-refuses-with-no-reason
title: "A county office page says only that the player cannot run for it, with no reason or date"
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
lead: elections
model: sonnet
effort: low
root: none
source: Account lead played walk, Nov 16, 2026 (run-for-office-played.md, Millville PA and McMinnville TN on Train 6d12556a)
---

**What.** The Elections page lists county offices under Also on your ballot, and opening one says You can't run for this office. with no reason and no date. A player cannot tell whether they are the wrong kind of person, in the wrong place, or too early. Seen: the Commissioner (District 6) page at McMinnville, Tennessee on June 23, 2026 and the Commissioner (District 2) page the same way on an earlier life.

**Cause.** Found in code: `playerFilingBar` in `src/core2/modules/elections.ts` returns `not-your-office` for any contest whose office is not listed in `PLAYER_OFFICES`, and the page shows the one generic sentence for that bar in `src/bench/data/controls.json`; the record names no more specific cause, so the page cannot say one. The Words lead raised the same open question on #9676.

**Fix.** Name the true reason from the records in `playerFilingBar` (the office is not yet open to a player, and when it will be, from the office's own record) and have the page read it; if a county office is playable in early access, make it offerable through the same one check instead.

**Time box.** 3 hours for one Sonnet session.

**Rules.** This is a game, not a spreadsheet: a refusal names its true cause from the records, and the page asks the clerk's own check and keeps no rules copy of its own.

**Done when.** A second session plays a drawn place, McMinnville TN (place key 4745100) in June 2026, on main by presses only and sees a county office page saying why the player cannot run for it, or offering the office when the rule allows it.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/bench/data/controls.json

**Notes.** Account lead, Nov 16. The walk and its screenshots are in /mnt/project-files/account-lead/reports/run-for-office-played.md.
