---
id: play-who-you-are-says-why-no-job
title: "Who you are says why a grown player has no job, from the household's livelihood record"
area: play
lead: play-first
milestone: play-first
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on: laws-opening-past-fits-the-chosen-age
source: laws-and-effects lead, Oct 27 (from the work on laws-opening-past-fits-the-chosen-age)
---

**What.** With the creator's birthday building the town around a resident of the chosen age, a 35-year-old player is often a working adult, but in about half of the drawn towns they hold no job. In those towns the household's livelihood past fact (`<household>:livelihood`) names who earns: a partner, or a parent in the home. Who you are then shows no Work section and no reason, so the owner reads a grown player with no job and no word of why. The screen should say why from that record (for example, that the household lives on a partner's pay). The controlled player is left out of the jobs engine's opening job seekers (`controlled()` in `src/core2/modules/jobs.ts`), so the player looks for work only in play.

**Rules.** Serves LAW.md §11, The world on screen makes sense ("Why, every time", OD:190). No hand-written player text: the reason is a worded label from the English engine's banks over the livelihood record (`player-screen-text`), reviewed by the Words session. Wire to the world: the reason is read from the household's own record, never assumed.

**Done when.** In a drawn place built with buildBenchWorld, with the creator's birthday set to make the player 35, where the player holds no job, Who you are shows a worded reason read from the household livelihood record by record id; a test names the place and seed; a screenshot of Who you are shows it.

**You will see.** When your character has no job, Who you are tells you how the household gets by.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Time box.** 2 hours, one lane agent with the Words session's review.

**Files.** src/bench (the Who you are sheet), data/english (the label), src/core2/modules/jobs.ts (read only)

**Notes.** Filed by the laws-and-effects lead, Oct 27. Seen in Claypool, Indiana (1813312, seed 1d6249c16386bf03ce00c4f3da717ea766591b043c1fa0595ef8bbc6f0759de8): a 35-year-old player with no job, whose household earner is `person_db83b98f2f59bc63` per its livelihood record. Also: `src/director/journal.ts:178` still names the stopgap SG-PLAY-creator-age-keeps-past, which `laws-opening-past-fits-the-chosen-age` resolves; the comment is the Words line's to correct.
