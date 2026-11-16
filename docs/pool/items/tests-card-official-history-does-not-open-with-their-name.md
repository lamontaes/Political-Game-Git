---
id: tests-card-official-history-does-not-open-with-their-name
title: "An official's card history does not open with the official's name"
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

**What.** At Montfort, Wisconsin (5553950), seed pin-card-history-story, the card of the longest-serving legislator found does not open its history with the name on their first term: the first line, past its date, does not start with that name (src/bench/card-history-story.test.ts about line 106). The player would open the official's card and read a history that does not say who it is about first.
Seen: on the Train at 6d12556a in the trial batch, by `npx vitest run src/bench/card-history-story.test.ts` with its fixed seed.

**Cause.** Needs cause. Looked at: only the failing assertion and the place it failed in.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/card-history-story.test.ts, src/bench/card.ts

**Notes.**
