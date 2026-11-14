---
id: campaign-gift-cause-needs-measuring
title: "A donor's gift scene now starts from a cause, not from money, and nobody has measured who gives and how much"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: found while carrying #8095
lead: words
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The `campaign-gift` row in `src/director/data/director.json` and `situation-types.json` changed from a money trigger to a cause trigger (carried from #8095). The old PR reported 217 of 217 gifts for one drawn candidate under the floor; that was not re-measured on the train. Seen: the donor scenes a candidate's player gets in a campaign year.

**Cause.** Needs cause. Looked at: the row's trigger in director.json; the count of gifts and their size against the floor for a candidate has not been taken on the train.

**Fix.** None until the cause is found.

**Time box.** 2 hours for a Sonnet session.

**Rules.** An effect is a read, not a record: the gift scene reads the gift record by id. No dice. One rule, all 56 places.

**Done when.** A second session plays a campaign year at three drawn places the builder did not choose (each named with its seed) and in the running game sees donor scenes whose gifts match the gift records (named by id), none under the floor.

**Waits on.** Nothing.

**Files.** src/director/data/director.json, src/director/data/situation-types.json
