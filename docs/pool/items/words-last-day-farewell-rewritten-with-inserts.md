---
id: words-last-day-farewell-rewritten-with-inserts
title: "The last day says where you worked, how long, where you go next and why, or how the school year ended"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9984
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The last-day farewell held 126 fixed lines that no record placed, written for an official leaving an office: "Was it worth it?", "The first budget. I said yes too fast", "Somebody has to remember where the files are", and a yearbook "Can you believe it?" for a school. The cause is any job the player chose to leave, a stock clerk or a nurse's aide, or a school year that ended, so those lines were wrong for almost every scene that played them.
Seen: the player leaves a job or finishes the school year in a drawn place, and the one who speaks names the employer or the school, how long the player was there, where the player goes next and why, in words that match what the records hold.

**Cause.** Found in code: the `last-day-farewell` pieces in data/english/parts/scene-talk.json carried no `requiresFacts` (125 of 126), and `composeBinding` in src/director/purpose-scene.ts set no fact for the ended job's employer, title or span, where the player goes next, why the job ended, the school's name or the classmate's year, so no line could be placed by them. Its one placed line, `asked_out_of_work`, never plays: no code sets any `asked_*` fact (only the reader in src/english/scene-talk-words.ts and scripts/words/reply-pairs.ts mention it).

**Fix.** Delete the 126 lines under `last-day-farewell`. Add `lastDayFacts` in src/director/last-day-facts.ts, called from `composeBinding` for the `last-day` type: `employer`, `job`, `years-there` (from `jobHeldSince` to the job's end), `next-employer` and `left-work` (from `jobLeaveRecord`, the jobs engine's own `quit` or `left-work` change), `why-pay`, `why-other` and `why-retire` (that change's reason key), `coworker-still-there`, and for a school year `school`, `passed`, `failed`, `classmate-leaving` and `same-school-next` (the school engine's graduation results). Write the new lines for narration, the opener, the question, the four replies and the close, and give the arc in src/director/data/purpose-arcs.json the moves the new lines use.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets, and none is typed in code. Wire to the world: each fact a line needs is read from the jobs record, the school record or the graduation result, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session leaves the player's job by the game's own Leave this job press and finishes the school year, presses every reply in both talks, and finds the employer, the span and the school said are the records' by id and no line names a record the packet does not hold. The `asked_*` finding is on the Story lead's list.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/last-day-facts.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/core2/modules/jobs.ts, scripts/words/last-day-walk.ts, src/director/last-day-facts.test.ts, data/english/pulled.json, data/english/judged

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
- 2026-11-17 (builder): the jobs engine writes the reasons `better-offer`, `other-offer`, `retired` and `left-work` only, so the lines cover `why-pay`, `why-other` and `why-retire`; no pay, hours, care or move reason exists to place a line.
- 2026-11-17 (builder): the school engine writes a graduation result for seniors only, so every `school.finished` is a final year; no `last-year` fact was built and no line says "see you in the fall" to the player.
- 2026-11-17 (builder): the player's own job can end as a `left-work` only (the monthly review skips the controlled person), and a town's jobs engine wrote 3 `quit` changes in 24 months against about 7,000 hires, so the `next-employer` lines are composed and not seen.
