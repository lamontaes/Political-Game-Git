---
id: tests-talk-move-pairs-second-talk-opens-another-subject
title: "The move-pair test's second talk the same day opens on a different subject"
area: words
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by: claude/project-thread-5efbu8-movepairs
pr: 9602
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while gating #9279 (Nov 14); red the same on the clean train 8bb1ff9d
---

**What.** `src/director/talk-move-pairs.test.ts` (removed) is red by draw. It opens a talk, grades its first reply's move pair, and opens the same talk again expecting the same opening line. At seed 82998207500ce8e2 the second talk opens on another subject: expected "Ask me about a higher federal minimum wage. I'm all for it." and got "The President is for admitting more immigrants. I agree. What did you think of that?". Guards: the everyday talk's reply order (words-talk-replies-follow-move-pair-grades).

**Cause.** Measured: `GOLDEN_PATH_SEED=82998207500ce8e2 npx vitest run src/director/talk-move-pairs.test.ts` fails at line 85, both on the train 8bb1ff9d and on #9279 b894fff6, in about 7 seconds. The first `openConversation` writes what was said (the subject goes on the talk's used list, and a view the player learned is recorded), so the second talk with the same person that day picks a different subject. The test compares two talks as if the first left no record.

**Fix.** In the test, open the graded talk on a copy of the world taken before the first talk, or compare against a first talk that was opened on such a copy, so both talks start from the same records. No change to the conversation engine. Pin the test to named places and seeds (`pinned-tests`).

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the test draws or pins places from data, never one named in logic. No dice: the fix changes the test's setup, never which reply a person is offered.

**Done when.** A second session, on main, runs the test in a drawn place with its seed printed and at seed 82998207500ce8e2; it passes at seed 82998207500ce8e2 and at its pinned places, and the second talk's opening line equals the first's because both start from the same records.

**Waits on.** Nothing.

**Files.** `docs/current.json` (the replaced row for the deleted test).

**Notes.** Nov 18 (Story): dropped; the test it would fix was deleted on #10063 with the talk lines it needed (owner, Nov 17: delete everything the engine did not write). Nov 16, election-results thread: red at seed 82998207500ce8e2 on the Train ef708196 (Basco, Illinois: the second talk said "The President is for admitting more immigrants..." after "Ask me about paid family leave."). Fixed in the test: the graded talk opens in a twin world built from the same seed and played the same days, so both talks are that day's first with that person; pinned to Basco, Illinois (1704052) and Platteville, Colorado (0860160) with their seeds; green at both (14 and 18 talks, 12 and 18 moved). 75 s alone, 83 s beside two talk tests, limit 180 s.
