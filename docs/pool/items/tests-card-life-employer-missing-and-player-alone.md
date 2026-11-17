---
id: tests-card-life-employer-missing-and-player-alone
title: "A worked-life card names a job at an employer the world does not hold; the test also needs a player who lives with someone"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 0
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

**Cause.** Found in code: `hire` in `src/core2/past-work.ts` returned no employer for a spell when the town held no firm for that day, and `elsewhereEmployerId` in `src/core2/places-elsewhere.ts` returns nothing for a place its lookup does not know, so the spell (for example `past-work:person_32e6239e8aee1e1b:1` at Bozeman, Montana, seed pin-card-life:1) had no `organizationId` and the card could not name it.

**Fix.** `hire` in `src/core2/past-work.ts` names an estimated employer when no firm fits, from the place they lived in, else from the place they live in now. The player opens a card whose every job names an employer.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/card-life.test.ts, src/bench/card.ts

**Notes.**
Nov 16 (views thread): Correction. Both pinned East Merrimack, New Hampshire cases are red on every Train head from the pin (749af289, f1ec70f9, 6e9df72b, 18d92e2e, b91d3fb3), three runs a head with the same records each time: no living household member, then an employer the organizations table does not hold. The note that they passed at 8d26a629 was wrong. They are expected failures again with this item.
