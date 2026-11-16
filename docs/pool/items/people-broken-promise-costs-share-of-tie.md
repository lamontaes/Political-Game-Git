---
id: people-broken-promise-costs-share-of-tie
title: "A broken promise costs a share of the tie, as a lie found out does"
area: people
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: S6 (branch claude/project-thread-d5qa0q-share-of-tie)
pr: "#9624"
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
