---
id: words-journal-story-other-filing
title: "A relative's death never opens a journal chapter titled with their bare name"
area: words
kind: bug
priority: 3
size: S
status: done
claimed-by: story/journal-story-other-filing
pr: #8212
blocked-on:
lead: words
source: "journal-story.test.ts 'opens no chapter on someone else's filing or oath' red on clean main, seed 9d265ce046a38771"
claimed-at: 2026-11-10T16:00:00.000Z
merged-at: 2026-11-10T21:48:28.868Z
seen-by: second-session-2
seen-at: 2026-11-11T03:10:27.681Z
---

**Measured:** Barnesville, Maryland (2404475), JOURNAL_STORY_SEED=9d265ce046a38771, draw `:others:0`. The player Emily Roman (person_eb2c714a9b36db41, born 2007-03-20) has an aunt, Emily Roman (person_0c21b4e2ea99b9c3, born 1988-03-04), whose death on 2026-10-03 is the moment `person_eb2c714a9b36db41:2026-10-03:life.death:person_0c21b4e2ea99b9c3:2026-10-03`. Its journal row (event:life.death, `turn: true`, `turnFor: self-or-kin`, title `{{other}}`) opened a chapter titled "Emily" (a kin turn), and the test (chapter titles must name no other person) found another Emily in the world (person_2c056601ebfa84ad, Emily Petty, born 2019-05-06): "chapter "Emily" opens on ...life.death...: expected 'person_2c056601ebfa84ad' to be undefined".

**Cause.** `turnOf` (src/director/journal.ts) lets a kin's death open a chapter, titled by the relative. The title is `{{other}}`, which the journal says as "my aunt" where the relation has a word, and by given name where it does not (here the aunt shares the player's name, so the relation is left to the name). A chapter titled with a bare person's name breaks lane 3, path 9: no chapter titled after someone else.

**What.** In `journalFor` the chapter-opening code renders the row's title first and treats the moment as no turn when that title is a counterpart's given name or full name; the death is then told inside the chapter being lived, as a stranger's already is.

**Done when.** journal-story.test.ts "opens no chapter on someone else's filing or oath" passes on seed 9d265ce046a38771 and two fresh draws; journal.test and the English guards pass.

**Files.** src/director/journal.ts

**Time box.** 1 hour.

**You will see.** The aunt's death is a line in the chapter the player is living, not a chapter titled "Emily".

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn test worlds, seed 9d265ce046a38771, f03b165432, da7487b206, main 67947ae8: the someone-else's-filing journal test passed on the named seed and two fresh seeds when run alone, and the English guards passed 64 tests; run inside the whole file it once failed
