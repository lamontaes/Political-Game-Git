---
id: play-campaign-interview-recheck
title: "#5710 was absorbed into #5793 past an uncleared send-back (missing Done-when table): copy #5793's rows into play-campaign-interview-and-event-without-seat's Notes or confirm the evidence"
area: play
kind: cleanup
priority: 3
size: S
status: claimed
standard: 2
claimed-by: pool/play-campaign-interview-recheck
pr:
blocked-on:
source: added by the acting CTO, Oct 22 merge sample
claimed-at: 2026-11-10T22:40:32.048Z
after:
lead: play-first
model: haiku
effort: low
root: none
checked: fable 2026-11-10
branch: pool/play-campaign-interview-recheck
---

**What.** The Codex merger sent a pull request back on Oct 21 for a missing Done-when evidence table. No fix answered that send-back; instead a later pull request (tests-campaign-day-canvass-someone-answers, #5793) merged on Oct 22 carrying the first one's whole diff, and the first was marked merged a second later. The item play-campaign-interview-and-event-without-seat reads done with pr #5710, and its Notes end on the uncleared send-back. #5793's body does carry the table: two 'Combined parent feature' rows (a candidate with no seat takes the interview and event controls in buildBenchWorld; the interview and event causes named by id) and a fresh run in Summit, South Carolina (4570315, run seed 4a10490584c40563aaf32c2cc3d17e7a) with the filing, interview and three event cause ids.

**Cause.** Found in code: docs/pool/items/play-campaign-interview-and-event-without-seat.md has its `pr` field set to #5710 and no note naming #5793, which carried #5710's whole diff (this item's text).

**Fix.** Add one dated Notes paragraph to play-campaign-interview-and-event-without-seat naming #5793 as the carrying PR with its two Combined-parent rows and the Summit ids, set its pr to #5793 (keeping #5710 in Notes), and run npm run pool -- --check. If the two rows look thin against the merger's ask, say so in that Notes paragraph and leave the item done; the test on main is the proof either way.

**Time box.** 0.5 hours for one Haiku session.

**Rules.** Done means done: an item's record names the PR that carried it and the evidence the merger asked for, so nobody reopens it to look. Pool notes are the record: the send-back is answered where it was written, in the item's Notes.

**Done when.** A second session reads docs/pool/items/play-campaign-interview-and-event-without-seat.md and finds a dated Notes paragraph that names #5793 as the carrying PR, copies the two Combined-parent rows and the Summit, South Carolina place ids (4570315, seed 4a10490584c40563aaf32c2cc3d17e7a) from its body, and states that the Oct 21 send-back is cleared by that table; `pr:` reads #5793; and npm run pool -- --check adds no new diagnostic for the file.

**Waits on.** Nothing.

**Files.** docs/pool/items/play-campaign-interview-and-event-without-seat.md

**Notes.** Found in the acting CTO's Oct 22 merge sample. If the builder judges the two rows thin against the merger's ask (control names, each act and cause id mapped to campaign-day-controls.test.ts), say so in the Notes and leave the item done; the test on main is the proof either way.
