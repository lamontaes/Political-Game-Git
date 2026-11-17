---
id: journal-another-states-name-said-again
title: "The Journal says another state's name again on one page (Winchester, Virginia three times)"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Story lead's read of #9119, finding 6, fixer pass Nov 17
---

**What.** After the heading the Journal says the home town by its bare name, but a town in another state keeps its state each time it is named. A played Journal said "born in Winchester, Virginia", "I met Noah in Winchester, Virginia" and "I came here from Virginia" on one page. The state is said once on a page.
Seen: Alvord, Texas, seed read-9119-f, age 50, by `node --import tsx scripts/words/journal-walk.ts read-9119-f --days 10 --age 50 --file`.

**Cause.** Found in code: `render` in `composeJournal` (src/director/journal.ts) drops only the home state (`shortPlace`); the paragraph's `said` set is per stretch, so a state said in one stretch is said again in the next, and the moved-from fact is only the state's name.

**Fix.** Keep the states said in the order the first chapter's paragraphs are assembled, and have `shortPlace` and the moved-from follow drop a state already said, in `composeJournal`; the player sees each state once on the Journal page.

**Time box.** 2 hours, one Sonnet session at medium.

**Rules.** Ask why: each place and state still said must cite the record it came from, so a dropped state is dropped by the order of the page and never by a guess.

**Done when.** In a drawn place, the Journal of a 50-year-old born in another state names that state once; a second session replays the walk above on main and sees one "Virginia".

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/director/journal-composer.test.ts

**Notes.**
