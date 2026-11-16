---
id: director-own-record-at-a-venue-stops-the-day
title: "Your own filing and the night of your own race's count never open a scene when they are set at a venue"
area: director
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-5efbu8-venue
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: concession-call press run at Amherst NH, Nov 16 2026
checked:
---

**What.** Played by the page's own presses at Amherst, New Hampshire (3301220, world seed 2988b829…df4a9, as Pat Leonard), the player files for Selectman and loses on 2025-11-04, but the filing at the clerk's counter and the night of the count are both Journal lines. Election night shows the returns and no scene of the player's own result, so the concession call never plays. Seen: no filing scene and no concession call by presses, though a script run of the same place staged both at home.

**Cause.** Found in code: `race-won`, `race-lost` and `filing` (src/director/data/situation-types.json) list "venue" first among their settings, and a moment takes its place from the day's event (src/director/ledger.ts, where the day's events stamp `placeId`), so in play they bind at the venue. The rule that a person's own record is met the same day (scheduling.ownRecordScenes, src/director/scheduling.ts `ownNews`) holds only when a binding's setting is in `scheduling.ownRecordSettings`, which listed home, office, chamber, phone and public but not venue. Below the interrupt line (Amherst's loss weighed 0.28) and ranked past the pace (92 against 4), each became a Journal line.

**Fix.** Add "venue" to `ownRecordSettings`. Only these three types are own-record types that can bind at a venue, so no other scene is pulled in. Record which rule stopped the day on the schedule row (`stopsBecause`) and show the row in dev mode's Trace of the moment ("How the story staged it": outcome, setting, the rule that stopped the day, weight, rank against pace).

**Time box.** 2 hours for one session.

**Rules.** One rule for every place: the setting rule is data. What a script traces, dev mode traces (owner, Nov 16). The chain is the acceptance: the filing and the result record each open their scene by record id.

**Done when.** A second session plays a place drawn from all 56 by the page's presses, files for a race and sees the filing scene that day, and on the night of the count sees the scene of their own result (a concession call or the victory night), naming place, seed and the moment ids, and dev mode's Trace of each moment reads "the person's own record, met where its scene is set".

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/scheduling.ts, src/bench/dev-why.ts, src/bench/dev-trace.ts, src/bench/own-record-at-venue.test.ts (new)

**Notes.** Found while proving director-concession-call-says-close-when-the-race-was-not, whose lines it unblocks.
