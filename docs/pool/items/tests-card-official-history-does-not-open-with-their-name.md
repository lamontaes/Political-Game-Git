---
id: tests-card-official-history-does-not-open-with-their-name
title: "An official's card history does not open with the official's name"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: Fixer one (session_01S4WSHrsirzMADEiASwJ6rk)
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

**Cause.** Found in code: `renderGroundedEnglish` (src/english/grounded-english.ts, line 194) dropped every comma at the end of a said text (`/,+(?=[.!?;:,)"\u201d]|$)/`), which is every opener's own comma ("In {year},", person-history.json `person-history.when.*`). The joiner (`framedByAge`) then set "In 2012" before the sentence with no comma, so the history's first line read "In 2012 Jane Doe ..." and the check, which reads the line past its opening "In 2012, ", never found the name. The same fault left the player's own story with no line opening "In 2012, I" (src/bench/card-life.test.ts, red on the train).

**Fix.** The rule keeps dropping a comma before a stop or another comma (rule 136) and no longer drops one at the end of a said text: an opener keeps its comma. src/english/opener-comma.test.ts checks every life-story opener is said with its comma, and fails on the old line.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No hand-written player text in code; a screen shows only what the records hold.

**Done when.** The pinned case passes on the Train with the cause named in the PR body by record, and a second session runs the file and then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/card-history-story.test.ts, src/bench/card.ts

**Notes.**
