---
id: tests-talk-history-one-exchange
title: "talk-history.browser.mjs expects two exchanges; the first talk after the address has one"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-talk-history-one-exchange
pr: #8427
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:53:46.945Z
branch: claude/pool-tests-talk-history-one-exchange
---

**What.** src/bench/talk-history.browser.mjs talks to the first person in the room and picks a reply twice to build a history block. Since the talk after the President's address was rewritten, that talk has one exchange: a reply, the person's answer with Continue, then it ends (Nibbe, Montana, seed 9300f75f-9b1d-48b4-8d84-c409754ff9a4). The check then fails with no second reply, so the history display goes unchecked.

**Cause.** Measured: in Nibbe, Montana, seed 9300f75f-9b1d-48b4-8d84-c409754ff9a4, the first person in the room after the President's address has a talk of one reply, the person's answer with Continue, then it ends, so src/bench/talk-history.browser.mjs finds no second reply and the history block goes unchecked.

**Fix.** Make the check talk to a person whose talk has two or more exchanges in play (the next person, or a later talk) through the shared start-a-life helper src/bench/start-life.mjs, then read the history block. Do not accept a one-exchange talk.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Wire to the world: the check reads a talk the game really plays, in a place drawn from all 56, never a hand-made talk; loosening it to one exchange without checking the history block would be a check with nothing to check.

**Done when.** A second session runs src/bench/talk-history.browser.mjs on a fresh bench in three drawn places (named with seeds, Nibbe, Montana seed 9300f75f-9b1d-48b4-8d84-c409754ff9a4 among them); each reads a history block from a talk with at least two exchanges and passes.

**Waits on.** Nothing.

**Files.** src/bench/talk-history.browser.mjs, src/bench/start-life.mjs

**Notes.** TODO

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:53 UTC) on branch claude/pool-tests-talk-history-one-exchange.
