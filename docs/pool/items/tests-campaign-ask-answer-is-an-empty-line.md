---
id: tests-campaign-ask-answer-is-an-empty-line
title: "A person asked to volunteer or endorse answers the player with an empty line"
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
lead: words
model: sonnet
effort: medium
source: views thread, Nov 16 (trial batch of bench pins)
---

**What.** At St. Hedwig, Texas (4864172), seed pin-campaign-asks-spoken:0, a campaign ask (volunteer or endorsement) comes back with an answer from person_08ff0f2079a06a98 whose spoken line is the empty string (src/bench/campaign-asks-spoken.test.ts about line 90). The player would see that person answer with nothing said.
Seen: on the Train at 6d12556a in the trial batch, by `npx vitest run src/bench/campaign-asks-spoken.test.ts` with its fixed seed.

**Cause.** Needs cause. Looked at: only the failing assertion and the place it failed in.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/campaign-asks-spoken.test.ts

**Notes.**
Nov 16 (views thread): Correction. The pinned St. Hedwig, Texas case is red on every Train head from the pin (749af289, f1ec70f9, 6e9df72b, 18d92e2e, b91d3fb3), three runs a head with the same record each time: person_08ff0f2079a06a98 answers with an empty line. The note that it passed at 8d26a629 was wrong. It is an expected failure again with this item.
