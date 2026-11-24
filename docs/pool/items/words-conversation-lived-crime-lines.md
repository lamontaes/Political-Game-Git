---
id: words-conversation-lived-crime-lines
title: "Conversation lines for a resident telling of their home broken into, or being robbed or assaulted"
area: words
kind: feature
priority: 1
size: S
status: dropped
claimed-by:
pr: #5935
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The director is getting a conversation subject for a household's victimization (director-talk-lived-crime), the scene step of the effects lead's end-to-end proof. The conversation bank has no lines for it, and the four bring-it-up lines for a story read (bring-it-up parts 31 to 34, I read in {subject} about {topic}) are held until graded. Mine or author the speaker's lines (raising it, by what happened: a break-in, a theft, a robbery, an assault) and the listener's replies, as bank pieces held until the owner grades them, and put them with the four held read lines in the next grading batch.

**Rules.** No hand-written player text: the lines are bank pieces through the civic-prose process, shippable false until graded, never typed into the director. Ask why: each line's slots read the crime record's facts (what happened, when), so the scene's reason is on the record.

**Done when.** The conversation bank holds the victimization subject's speaker and reply pieces with their slots read from the crime record, each shippable false until graded; they and the four bring-it-up read lines are on the next grading page; a src/director/conversation-crime.test.ts run in a drawn place stages the subject with a held line, named in the PR.

**Files.** data/english/parts/conversation.json, data/english/parts/bring-it-up.json, src/director/conversation-crime.test.ts

**Notes.** Added Oct 24 by the effects lead (effects-end-to-end-proof's scene step); see director-talk-lived-crime and the Effects status in the leads' channel.

Sent back 2026-10-26 from PR #5935 (branch claude/lived-crime-lines): After prerequisite5922 and main integrate only batch23/page/declaration remain; the page says12lines are held until graded, but all12parts already ship under OWNER-DECISIONS.md:46 releasing the hold and replacing batch-style grading with scene/voice-note review; reconcile the item and page with that ruling without reverting shipped flags, or retire this obsolete batch-only PR; finish on that branch, merge main into it first.

Retired 2026-10-26 by its builder: PR #5935 closed, as the send-back allowed. What the item asks for is on main. The conversation bank's 12 victimization-raise parts read `{when}` from the crime record and play in the game (the Oct 24 grading ruling released the hold, OWNER-DECISIONS.md line 46). `src/director/conversation-crime.test.ts` stages the subject from a drawn place's crime record. The two lines left (held until graded; on the next grading page) are batch-style grading, which that ruling replaced with scene review. For the CTO: mark done or dropped.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
