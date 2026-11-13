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

**What.** A played year can stop with a TypeError in the legislature's filing step. CI's paired-performance check on pull request #9007 (a change that does not touch legislating) crashed in the legislature's work step at src/core2/modules/world-legislating.ts line 435, `memberKey`, inside `filerOf`, called with no term. No seed was captured, and it is not known whether the base or the head threw. Seen: the game stops with an error on a day a council, board or legislature files, in place of the next day.

**Cause.** Found in code: not reproduced. In src/core2/modules/world-legislating.ts, `fileChanges`. When no member carries a change, the executive over the body asks one through `proposeAsExecutive` (src/core2/modules/legislature.ts), which picks the member from `members(api, bodyOfficeId)`. `fileChanges` then looks that member up in its own list with `input.filers.find((t) => memberKey(t) === request.memberId)!` and passes the result to `filerOf`. The two lists are built by different callers, and nothing checks that the asked member is in `input.filers`; when they are not, `filerOf(api, undefined)` throws at `memberKey`. Which sitting gives two different lists is the first thing to find: log `input.key`, the body and `request.memberId` at the lookup and run the #9007 check's place and seed, or draw places until it throws. This runs at filing itself, so it is the same on a meeting filed the day before and one filed on the day.

**Fix.** In `fileChanges`, take the asked member's term from the same roster `proposeAsExecutive` read (`members(api, input.body.id)`) when it is not among `input.filers`, so one roster answers both. If the member holds no seat any more, the request has nobody to carry it: leave the executive's request on record as the engine already does for a request no member takes up, and file nothing for it. No silent skip: the request's record says why. Add the case to src/core2/world-legislating.test.ts with the place and seed that reproduced it.

**Time box.** 2 hours

**Rules.** One engine per mechanic: the roster is `members`. No dice. Drawn-place tests: name the place and seed that reproduced it.

**Done when.** A second session sees it in the running game: a played world in the drawn place and seed that threw runs a played year with no error, and dev mode's bill outcome for the executive's request shows the bill carried by a sitting member or the request left unfiled with its reason; the speed:year time is no more than 20 percent over main.

**Waits on.** Nothing

**Files.** src/core2/modules/world-legislating.ts, src/core2/world-legislating.test.ts
