---
id: people-broken-promise-costs-share-of-tie
title: "A broken promise costs a share of the tie, as a lie found out does"
area: people
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: sonnet
effort: medium
root: none
source: Lying PR (people can lie to the player), Nov 15, when trust lost became a share of the tie
---

**What.** On Nov 15 the Account lead ruled that trust lost (a lie found out) takes a share of the hours a tie stands on today, so a close tie loses more than a slight one; the Words lead agreed, and scene-talk-rules endingStrain trust-lost is now a share. A promise broken is the same loss of trust, but the director still takes a fixed two hours for it, so a broken promise costs a lifelong friend almost nothing and costs a stranger their whole tie. Seen: in dev mode, a broken promise between close friends cools their tie by a share of it, the same share a lie found out takes.

**Cause.** Found in code: `promiseBrokenHours` in src/core2/data/promises/promise-kinds.json is a fixed number of hours, read where src/director/promises.ts settles a broken promise and where src/director/promise-talk.ts weighs one; its citation used to say it costs what trust lost costs, which is no longer true.

**Fix.** Read the endingStrain trust-lost share through `tieHoursBetween` (src/core2/closeness.ts) where promises.ts settles a broken promise, and delete `promiseBrokenHours`, so one row says what lost trust costs.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Wire to the world: the broken promise changes the tie every engine reads, by record id. No dice: the cost comes from the tie's hours and the row's share, never a chance.

**Done when.** At the named place 4846968 seed 8647-mason, a test through the game's own path breaks a promise between two people with a close tie and between two with a slight one, and the close tie loses more closeness, by record id; `promiseBrokenHours` is gone; a second session sees it in dev mode on main.

**Waits on.** The lying PR (people can lie to the player) on the Train.

**Files.** src/director/promises.ts, src/director/promise-talk.ts, src/core2/data/promises/promise-kinds.json

**Notes.** Nov 16, promises thread, from the second reader's question on #9517: the four answers to a broken promise use fixed hours too, in `answerOnEvent` in src/core2/modules/promises.ts (it was `answerPromise` in src/director/promise-talk.ts before the promises engine) (`promiseBrokenHours` times `promiseOwnShare` to recover, `promiseDeniedHours` to cool). They differ, but at a close tie the difference is too small to see. At Ragland, Alabama (seed promises-real-loan-1, draw loan:16, born 1995), a housemate tie of 0.98309828 ends at 0.98310027 after owning it, 0.98309884 after explaining, 0.98309523 after denying, and 0.98309836 after making it right, which also writes a new promise. Each answer also writes its own `promise.answer` record. The same share rule should size these answers.
