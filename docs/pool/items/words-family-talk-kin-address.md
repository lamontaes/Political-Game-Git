---
id: words-family-talk-kin-address
title: "Relatives who share a parent can ask after them as Dad or Mom"
area: words
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The playtest (Oct 24) heard a sister ask 'How's John?' about their own father. play-stop-20 stops two relatives from asking after a relative they share, since the banks name a relative only by first name or as 'your father'. The owner expected 'a sister who calls our father Dad'. The banks have no kin address words (Dad, Mom, Grandma), so a brother and sister who live apart cannot ask after their parent at all.

**Rules.** No hand-written player text: words come from the English engine and its banks (words-engine). Owner, Oct 24 playtest: a sister calls our father Dad.

**Done when.** Two relatives who share a parent and live apart can ask after them from the bank as Dad or Mom (by the parent's recorded gender), never by first name; the pieces are in a grading batch. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Files.** data/english/parts/conversation.json, src/director/conversation.ts, src/director/data/journal-rows.json

**Notes.** Split from play-stop-20 by the speed lead (Oct 25); the shared-relative skip is on that PR.
