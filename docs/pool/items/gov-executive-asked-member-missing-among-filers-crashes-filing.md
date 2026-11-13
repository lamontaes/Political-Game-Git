---
id: gov-executive-asked-member-missing-among-filers-crashes-filing
title: "Filing crashes when the member an executive asks to carry a bill is not among the sitting's filers"
area: gov
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: found while building meetings-resident-player-speaks-at-public-comment; filed by hand
---

**What.** A played year can stop with a TypeError in the legislature's filing step. CI's paired-performance check on pull request #9007 (a change that does not touch legislating) crashed in the legislature's work step at src/core2/modules/world-legislating.ts line 435, `memberKey`, inside `filerOf`, called with no term. The same throw failed the played-year check on pull request #9022 and on clean main. Seen: the game stops with an error on a day a council, board or legislature files, in place of the next day.

**Cause.** Found in code and reproduced Nov 13 at Sheyenne ND (3872580), Twin Creeks MT (3075550) and Booth WV (5409148). The fault is in Congress's opening only, not a state legislature's: `openSession` in src/core2/modules/world-legislating.ts files the House and the Senate as two groups, but passed the House as `body` to both. In the Senate group the executive's request (`proposeAsExecutive`) picked its member from the House roster, which is not among the 100 senators in `input.filers`, so `fileChanges` looked it up with `find(...)!` and handed `undefined` to `filerOf`, which threw at `memberKey`. A state legislature does not hit it, because its one group holds every chamber's members. Fixed by pull request #9047 (the Senate group names the Senate as its body, so the President asks a senator); this item adds the regression test.

**Fix.** Pull request #9047's change is the fix. The unchecked `find(...)!` at the lookup in `fileChanges` stays as #9047 left it (the asked member now always sits in the chamber filed); replacing it with a lookup that cannot return `undefined` is left for after the train merges. The test in src/core2/world-legislating-federal.test.ts opens Congress at the three places and checks each bill the President asked a member to carry sits in that member's chamber.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the roster is `members`. No dice. Drawn-place tests: name the place and seed that reproduced it.

**Done when.** A second session sees it in the running game: a played world in the drawn place and seed that threw runs a played year with no error, and dev mode's bill outcome for the executive's request shows the bill carried by a sitting member or the request left unfiled with its reason; the speed:year time is no more than 20 percent over main.

**Waits on.** Nothing

**Files.** src/core2/world-legislating-federal.test.ts
