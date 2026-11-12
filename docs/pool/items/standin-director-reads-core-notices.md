---
id: standin-director-reads-core-notices
title: "The story director reads the core's appraisal receipt and tie-change notices instead of recomputing and end-of-day reading"
area: director
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: director
standard: 2
model: sonnet
effort: medium
root: design-director-on-core2
---

**What.** Two director stand-ins still fake what the core now offers. The director works out each person's feeling about an event itself, with the core's appraisal function, instead of reading the feeling the core already worked out and published; and it reads tie changes once at the end of each day, so the order of changes within a day is lost. Seen: in the stories and journal lines that follow an appraisal or a change in a tie.

**Cause.** Found in code: src/director/ledger.ts, the call to appraiseEvent near line 1751 (stand-in SG-P13-appraisal-recompute) repeats what src/core2/modules/life.ts onEvent (line 481 to 489) already computes and publishes with api.publishEventAppraisal; the module hook onEventAppraisal exists (src/core2/types.ts line 1035) and the director module does not use it. The tie read at ledger.ts line 970 (stand-in SG-P13-tie-day-order) loops over every relationship at day end, while the core's relationship-change notice (module hook onRelationshipChange, used at ledger.ts line 1880 only to re-rate) arrives at each change.

**Fix.** Add an onEventAppraisal hook to the director module that stores, for each watched person and event, the mood and stress the core published; in the reach code near line 1751 read that stored receipt for people who learned of the event and drop the appraiseEvent call. In onRelationshipChange, queue each change (person, other, new level, day order number) for the watched person; make the day-end tie read consume that queue in order instead of looping every relationship. Delete both directorStopgap calls and mark both stand-ins resolved in src/director/data/stopgaps.json. Keep the ledger's output identical: the moments, thread turns and ratings of a played year must match before and after, apart from tie changes now carrying their order. Cost: it only stores what the core already publishes and visits only the persons whose ties changed, so a played year stays inside the two-minute bar.

**Time box.** 5 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: read the core's receipt, do not keep a second appraisal. Replace, never layer: the old recompute is deleted. No dice. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (place and seed named, any module set installed) and finds that a watched person's moment for a recorded event cites the core's receipt by event id, with the same mood and stress the core applied, and that two tie changes in one day keep their order on the thread; both stand-in rows are resolved and the two markers are gone from src/director/ledger.ts.

**Waits on.** Nothing.

**Files.** src/director/ledger.ts, src/core2/modules/life.ts, src/core2/types.ts, src/director/data/stopgaps.json
