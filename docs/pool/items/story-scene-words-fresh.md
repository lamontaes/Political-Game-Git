---
id: story-scene-words-fresh
title: "Every record-placed scene opens with the narrator again: arrivals, leads, causes and openings written fresh"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-scene-words-fresh
pr: 10063
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 21:25Z on the Story thread (issue 9750): write the narrator's scene openings fresh, from the patterns, into the cut
checked:
---

**What.** The cut of Nov 17 emptied the narrator's bank of scene openings, so a record-placed scene (news at home, a layoff, a funeral, a race lost) opened with no narration. These are the first lines the owner sees on his first evening. Seen: the opening lines of every scene the director stages from a record.

**Cause.** Measured: `data/english/parts/scene-words.json` fell from 274 lines to 4 on the cut (#10063, head 9cbbb0d1b1), and `src/director/director.test.ts` "takes a second cause the same day into the sitting already staged" failed with "expected 0 to be greater than 0" on the narration, shown by `npx vitest run src/director/director.test.ts -t "second cause"`.

**Fix.** Write the bank again with new words, from each scene type's pattern in docs/story/scene-patterns.json. That means arrivals by setting (alone and with another person), leads by scene type, cause lines by cause, and the openings. The readers are src/director/scene.ts and src/director/cause-facts.ts.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code: every opening is a bank row in scene-words.json. Wire to the world: each line of four words or more names a slot the record fills, and narration says what is seen or what a record holds, never a want or a reason.

**Done when.** A second session, in a drawn place and seed in the running game, sees a record-placed scene (news at home) open with an arrival and a lead line from the bank; `director.test.ts` and `scene-lead-fits-setting.test.ts` pass.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-words.json

**Notes.** Nov 18 (Story): a Sonnet helper wrote 441 rows, none copied from main. The lead read a sample, deleted one broken arrival, and turned a porch into a door. Some arrivals hold ambient details no record names (a stack of mail, a porch light); that is for the Words lead. A row needing more facts does not outrank a plainer one in this bank (`renderGroundedEnglish`, src/english/grounded-english.ts), so `{happened}` rows win by count, not by rule.
