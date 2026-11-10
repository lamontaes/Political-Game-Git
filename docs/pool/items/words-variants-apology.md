---
id: words-variants-apology
title: "An apology owed after a quarrel over a missed payment plays one of four arcs (money, close, repeat, pressed), picked from the quarrel, the tie, earlier quarrels and the wronged person's money"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/variants-apology
pr: 8077
blocked-on:
lead: words
source: owner, Nov 8, 9:50 voice note ("they've gotta have like a variance"); the Nov 9 brief to widen variants
claimed-at: 2026-11-09T22:00:00.000Z
---

**What.** The `apology` scene (the partnerships engine's `family.quarrel`, written when a borrower misses a payment and a grown housemate shares the home) played one arc whose lines were all about a council meeting and a parking lot, which did not fit a quarrel over a missed payment. It is now a variant family, `owed-apology`, through the one arc engine (`src/director/arc-variant.ts`, `data/arc-variants.json`): `money` (the quarrel is about money; the default), `close` (the two are close, so the wronged person is hurt and asks, and the player may ask back), `repeat` (earlier quarrels between the two are on record) and `pressed` (the wronged person is short on money too). Each is scored from the records: the quarrel's own `about` fact, the tie's closeness, earlier `family.quarrel` records naming both, and the wronged person's cash against a year of costs, times one plus the speaker's pull. The plain arc stays for a quarrel that is not about money; its council-meeting lines now carry `excludesFacts: read-about-money`, so they never serve a money quarrel.

**Rules.** No new engine. The new reads are two rows of data (`about-money`, `quarreled-before`). Variants differ in the asker's first move and the player's reply menu, not only the words. A variant that needs a history scores below `money` without it (the repeat variant's history term carries nearly all its weight). Replies are written by record id; a promise is kept on the reply record and a no that is pressed strains the tie. No dice.

**Done when.** src/director/apology-variants.test.ts, in worlds drawn from all 56 places, begins with a hand-staged missed-payment record, plays the engines' own quarrel record and scene, finds the variant with the highest score, checks every reachable line is one of that variant's, and proves with labeled hand-made probes that a quarrel not about money plays plain, earlier quarrels play repeat and a speaker with no cash plays pressed; src/director/arc-variant.test.ts composes every variant whole.

**Files.** src/director/data/arc-variants.json, data/english/parts/scene-talk.json, src/director/data/stopgaps.json, src/director/arc-variant.test.ts, src/director/apology-variants.test.ts

**Notes.** Stopgaps: SG-STORY-arc-variant-weights (extended), SG-WORDS-apology-promise-unread. Stacked on story/purposes-rescue (PR #8076). In a played world the closest housemate is the one wronged, so `close` plays most often and `money` plays when the two are not close; the probes show the others. Voice read: advice and threads on apologizing to a partner or a roommate over a missed bill.
