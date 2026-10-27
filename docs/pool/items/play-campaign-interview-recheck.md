---
id: play-campaign-interview-recheck
title: "#5710 was absorbed into #5793 past an uncleared send-back (missing Done-when table): copy #5793's rows into play-campaign-interview-and-event-without-seat's Notes or confirm the evidence"
area: play
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added by the acting CTO, Oct 22 merge sample
claimed-at:
---

**What.** The Codex merger sent #5710 back on Oct 21 at 00:23Z for a missing Done-when evidence table. No fix answered that send-back; instead #5793 (tests-campaign-day-canvass-someone-answers) merged on Oct 22 at 00:42Z carrying #5710's whole diff, and #5710 was marked merged a second later. Its item play-campaign-interview-and-event-without-seat reads done with pr #5710, and its Notes end on the uncleared send-back. #5793's body does carry the table: two "Combined parent feature" rows (a candidate with no seat takes the interview and event controls in buildBenchWorld; the interview and event causes named by id) and a fresh run in Summit, South Carolina (4570315, run seed 4a10490584c40563aaf32c2cc3d17e7a) with the filing, interview and three event cause ids.

**Rules.** Done means done: an item's record names the PR that carried it and the evidence the merger asked for, so nobody reopens it to look. Pool notes are the record: the send-back is answered where it was written, in the item's Notes.

**Done when.** The item's Notes gain a dated paragraph that names #5793 as the carrying PR, copies the two Combined-parent rows and the Summit ids from #5793's body, and states that the Oct 21 send-back is cleared by that table; `pr:` reads #5793 (with #5710 kept in Notes); `npm run pool -- --check` adds no new diagnostic for the file.

**Files.** docs/pool/items/play-campaign-interview-and-event-without-seat.md

**Notes.** Found in the acting CTO's Oct 22 merge sample. If the builder judges the two rows thin against the merger's ask (control names, each act and cause id mapped to campaign-day-controls.test.ts), say so in the Notes and leave the item done; the test on main is the proof either way.
