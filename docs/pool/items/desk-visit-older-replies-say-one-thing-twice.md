---
id: desk-visit-older-replies-say-one-thing-twice
title: "At the desk visit, some older reply menus offer two wordings of one answer, or no reply that gives a reason"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
after: ""
blocked-on: ""
lead: words
source: M5's noes on the desk sheets made for #9292 (pairs-9292c, Nov 14, 2026); the lead ruled they are older lines and go in their own item
model: opus
effort: medium
root: none
---

**What.** M5 judged 12 desk-visit slots "no" on the sheets made for #9292. Three were slots #9292 itself made, and #9292 fixes them: 0prmalqknx1 (refuse after an answer), 2cf23rp02ho (agree after an answer) and 0v019x95dm1 (the first menu's bargain). None of the three is listed at #9292's head 86b9544650. The other nine are older lines that #9292 neither added nor moved. Two of them #9292 also fixed, at the Words lead's read of Nov 15 (rule 119, one move in one wording): 0ioh08jolo9 (the four promises of a fix in writing; the sponsor is never asked for a fix, so its two come out, and "We can do that. You'll have it in a page." comes out as a second wording) and 18yqy4w48e1 (the fix is asked for once a talk, so "Show me what you would accept..." comes out). The seven left are listed with the same path id, the same lines before them and the same choices at the train's base e24cb825 and at #9292's head:

- variants-differ, 1wh0w2j5djx: the cost answers give the same yearly cost under the same facts.
- variants-differ, 169rpmlwsh5: the pleas for the bill both point to its backers under the same fact.
- variants-differ, 0ps99muaq8s: two of the three press lines say the people who pay will hear how the player decided.
- variants-differ, 1lbrpnedbin: three of the four thanks are generic thanks with only the stance behind them.
- later-replies, 0epr5do7wlb: after "Please. A lot of people put their names on this.", two of the three replies ("Fine. I'll sign it, then." and "I've heard you. The answer stays the same.") repeat the first sign-or-refuse choice.
- replies-long, 1jqjo9rdxb3: the menu after the plea gives in, holds firm or puts it off, and no reply says why.
- replies-long, 2dhdn6z90v1: the first menu ("It passed. I'll sign it." / "Not as written. I'm sorry." / "What does it cost?") has no reply that gives a reason. The first menu had none at the train's base either. #9292 adds only `after: "request"` to these root replies, which changes nothing about where they are offered.

Guards: the variants-differ, later-replies and replies-may-be-long rules on desk-visit, so that each choice and each line the asker says is one a fact in the visit picks.

**Cause.** Found in code: data/english/parts/scene-talk.json gives each of these slots two or more lines under the same `requiresFacts`, so nothing the visit holds chooses between them, and its first and after-plea menus have no reply that names a reason. The facts that would choose (heard-why, heard-cost, opposed-voters, opposed-groups, budget-cost and the rest) already exist in `deskFacts` in src/director/purpose-scene.ts and in the setsFacts of #9292.

**Fix.** For each slot, either give each line a fact the visit holds that the others do not (one line per fact), or delete the duplicate and reuse the one line. Add a reasoned reply to the first menu and the after-plea menu only where a visit fact gives it a reason to say (for example, the cost or the opposed reason the visit already holds). Where a slot has one line left, the reuse is the fix; add no line only to pass the rule. New lines go to M5 on a sheet, and the builder never judges its own lines.

**Time box.** 3 hours for one Opus session.

**Rules.** Replace, never layer: a duplicate line is deleted and its slot reuses the one line left. Never change a line only to pass a guard. Duplicates are deleted and reused. A question offered must be answered. Unreachable lines come out. Lines under data/english/parts/ follow the Words lead's review.

**Done when.** A second session plays a desk visit in a drawn place (the scene test draws Havre, Montana, and a governor's visit in Hanksville, Vermont), and `npm run words:pairs` for the three rules lists none of the seven slots above in their judged-no form: each is either gone or judged yes by M5 at that head.

**Waits on.** #9292 folding into the train, since it moves the replies after an answer.

**Files.** data/english/parts/scene-talk.json, data/english/judged/, src/director/desk-visit-scene.test.ts
