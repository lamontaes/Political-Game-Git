---
id: tests-card-life-employer-missing-and-player-alone
title: "A worked-life card names a job at an employer the world does not hold; the test also needs a player who lives with someone"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: lives
model: sonnet
effort: medium
source: views thread, Nov 16 (trial batch of bench pins)
---

**What.** At East Merrimack, New Hampshire (3321780), seed pin-card-life, two cases fail. First, the player has no living household member (src/bench/card-life.test.ts about line 62); that may be the place (a player who lives alone), not a fault, and the test should then find its case another way. Second, a person with three or more job spells has a spell whose organization is not in the world's organizations, so reading its name throws (about line 233). The player would open that person's card and the employer in their job history would be missing or the card would fail.
Seen: on the Train at 6d12556a in the trial batch, by `npx vitest run src/bench/card-life.test.ts` with its fixed seed.

**Cause.** Needs cause. Looked at: only the failing assertion and the place it failed in.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/card-life.test.ts, src/bench/card.ts

**Notes.**
