---
id: press-comment-taken-story-unprinted
title: "A reporter who asks a member for comment on their bill files that story first, so the answer or the refusal reaches the paper"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: carry-8900-comment-first
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: red on clean main at seed 10e8519dc4a2cef2 (src/director/comment-printed.test.ts), reported Nov 12
checked:
claimed-at:
---

**What.** A reporter asks a council or board member about the bill they just introduced, the member answers or declines, the scene's ending keeps that the story runs, and then no paper prints it. Seen: the paper's story of the member's new bill, with their quote or "declined to comment".

**Cause.** Measured: `src/director/comment-printed.test.ts` at seed 10e8519dc4a2cef2 on clean main 33e38d44bc. Four of the five drawn places with a member kept the comment and printed nothing in ten days (Wind Lake, Wisconsin; Poydras, Louisiana; Moonshine, Louisiana; Windsor Heights, Iowa). Found in code: `src/core2/press-desk.ts`, `runDesk`, ranks a reporter's week only by score. The introduction names one person (people 0.69) and lost every local outlet's slots to the county board's sitting votes and a budget line (scores 2.8 to 3.4). Nothing in the desk read the comment the reporter had taken.

**Fix.** The comment row keeps the reporter who asked (`keepComment` in `src/core2/modules/press.ts`). The desk context reads it (`commentTakenBy`), and `runDesk` puts that reporter's commented story first among their week's stories. It still counts toward their week. No new number.

**Time box.** 1 hour.

**Rules.** An effect is a read: the press keeps the comment and the desk reads it when it picks. One rule, all 56 places. No dice.

**Done when.** A second session runs `src/director/comment-printed.test.ts` on main at seed 10e8519dc4a2cef2 and on three fresh seeds, each passing with two printed stories that name the drawn place. Then, in the running game in a drawn place, a seated member answers a reporter about their new bill and sees the paper's story quote them within the week.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/modules/press.ts, src/director/comment-printed.test.ts
