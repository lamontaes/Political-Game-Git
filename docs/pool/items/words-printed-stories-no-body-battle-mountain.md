---
id: words-printed-stories-no-body-battle-mountain
title: "A town whose whole year of news is briefs, with no story body"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/printed-bodies
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
claimed-at: 2026-10-29T17:34:52.882Z
---

**What.** src/bench/printed-words.test.ts fails in Battle Mountain, Nevada (GOLDEN_PATH_SEED=2fceb56ff6ed8412863c8c2c738d4157334295bf) on clean main at 96b3688d06: 'printed-words bodies: 0 of 582', so the check that some of the year's stories carry a body fails. Every one of the 582 stories that town's press printed has a headline and a first sentence and nothing more. Why that town's stories all lack a body (the kinds it printed, or the builders for them) is not known yet; four other drawn places passed the same test on Oct 29.

**Rules.** One rule, all 56 places: the news reads the same records the same way in every place, so a town whose press prints all year must get stories with bodies from the same builders. Ask why: name the kinds that town printed and why each had no body before changing the test.

**Done when.** In a played world (buildBenchWorld) in Battle Mountain with that seed, a run lists the kinds of the 582 printed stories and why each has no body, by record id; the fix gives the kinds that should have a body one; src/bench/printed-words.test.ts passes there and in two more drawn places with the seeds named.

**Files.** src/bench/printed-words.ts, src/bench/archive-words.ts, src/english/english-newscast.ts, data/english/parts/news.json

**Notes.** Found Oct 29 by the Words and director session while running the printed-kinds branch on five seeds (red the same way on clean main). Related, not a twin: words-printed-stories-have-a-body built the body sentences and this check (open; its body check is on main); this item is one drawn town where that check fails.
