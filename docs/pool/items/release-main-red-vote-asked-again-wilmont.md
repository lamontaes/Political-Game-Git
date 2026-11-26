---
id: release-main-red-vote-asked-again-wilmont
title: "The second-ask check is pinned to Wilmont, Minnesota, which holds no second ask in its played year"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pt-wilmont-ask-again
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
source: Coordinator and the tracer, Nov 25 (#10377, comment 7149297164)
---

**What.** `src/director/vote-asked-again.test.ts` at Wilmont, Minnesota (2770582, world seed 2cb5aaf1...) has never been green on main: "no second ask played: expected 0 to be greater than 0". Seen: in a state House, a colleague the player asked on an earlier bill about the same question is asked again and their no says they were asked before.

**Cause.** Found by a probe of the played year at the pinned place (main b8febe43 with #10606 merged locally): the player's asks at Wilmont are 56 asks of 56 different colleague-and-question pairs (no pair occurs twice), at five floor dates; no scene facts hold `asked-before`. The engine asks a colleague only where the count could carry the bill, so the redrafts reach the floor and no one is asked again. The pinned premise (a colleague asked twice on one question) no longer holds there; the fact reader is not at fault.

**Fix.** Test only: the state House case draws places (up to 12, from all 56) until one holds a second ask, plays it with every assertion the pinned case had, and names every place passed over and why. Banks, Idaho stays as the one labeled case.

**Time box.** 1.5 hours

**Rules.** One rule, all 56 places. No assertion is loosened; no place is pinned for the state House case.

**Done when.** A second session runs vote-asked-again.test.ts at two fresh seeds; each names the drawn places passed over and the one that held a second ask, and passes.

**Waits on.** Nothing.

**Files.** src/director/vote-asked-again.test.ts
