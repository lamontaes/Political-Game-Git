---
id: words-a-slot-that-opens-a-sentence-is-capitalized
title: "A slot that opens a sentence inside a line starts with a capital"
area: words
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by: account-lead-M4
pr: 9358
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words lead, Nov 14 (11:47Z): a slot that opens a sentence inside a line must be capitalized; fix it in the one slot-fill function, with a test
claimed-at: 2026-11-14
branch: claude/project-thread-irab2z
---

**What.** A line whose second sentence opens with a slot plays the slot's fact in lower case: "Nobody. the Parking Ordinance is mine." The line's own first letter is capitalized; a sentence that begins inside it is not. Seen: in any spoken or written bank line where a sentence opens on a slot, such as the reporter's and the desk's lines after a short first sentence.

**Cause.** Found in code: `renderGroundedEnglish` (src/english/grounded-english.ts) fills each `{{slot}}` with the fact's text as it is; `renderLine` (src/english/bank-line.ts) capitalizes only the line's first letter. Facts such as a bill's name ("the Parking Ordinance") start lower case so they read right mid-sentence.

**Fix.** In the one slot fill, `renderGroundedEnglish`, a slot whose text before it ends a sentence (a period, question mark or exclamation point, with an optional closing quote or parenthesis, then a space) gets its first letter capitalized. After an ellipsis the sentence goes on and the slot is left as it is. The player sees it in any spoken or written line from the banks where a sentence opens on a slot.

**Time box.** 1 hour for one session.

**Rules.** Replace, never layer: the fix is in the one slot fill, never a second capitalizer in a caller, and no bank line changes.

**Done when.** A second session, on main, plays a drawn place until a line with a sentence that opens on a slot is said (the reporter's or the desk's lines after a short first sentence), names the place and seed, and reads the slot capitalized; and reads a line with a slot after "..." left in lower case.

**Waits on.** Nothing.

**Files.** src/english/grounded-english.ts, src/english/said-as.ts

**Notes.**

- Nov 15, M4: dropped, done elsewhere. `sentenceStarts` (src/english/said-as.ts) has capitalized a slot that opens a sentence since Nov 12, called in src/english/scene-talk-words.ts (two places) and src/director/conversation.ts. Five lives played 90 days with and without #9358's fix showed no played line differ; #9358 is withdrawn (a second capitalizer). The two surfaces that never call it are item words-speech-and-scene-leads-call-sentence-starts.
