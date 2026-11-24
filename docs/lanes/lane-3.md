# Lane 3: Words and scenes (122 items)

**What the player gets.** Win or lose, the life reads like people. No silent month in a campaign. The night you lose plays, and your answer counts next time. A promise stays a promise. A friend and a rival say different things. The Journal reads as a story. The engine work is mostly done; the lines sit in the wrong places. About half of all scene lines (2,348 of 4,800) are for moments in office a new life doesn't reach. A press comment has 427 lines and the talk after a lost race has 29, and nearly every new life loses.

**Finish line: 11 played paths**

1. **The clerk and the address.** Start: New Game, Haleyville. See: the clerk in sentences, the talk after the address following your choice, no line you didn't choose.
2. **The paper reads right.** Start: Murray, one year. See: a closing told as news, the paper's foot making sense, no sentence over three times, a parent's death saying who survives them.
3. **A card as a life story.** Start: any person, Storrs. See: a biography in sentences.
4. **A campaign never silent.** Start: New Game, Murray, filing to election. See: a scene or Journal line in every month, May to September included.
5. **Doors in their own words.** Start: Brookside, knowing few people. See: volunteers coming from doors, three people answering in their own words, sometimes a voter outside a job. Talk is never a list.
6. **The night you lose (you can play this).** Start: lose in Storrs with a relative on your volunteer list. See: they talk about what they gave, your answer shows next time, a real concession, a rival who may gloat. With no one who helped: no staged scene, ordinary talk continues.
7. **Answers count.** Start: Meadow Lakes. See: a promised vote held to you, "we'll talk later" coming due, a reporter's story quoting you or saying you declined.
8. **Talk like people.** Start: Cabo Rojo. See: a friend and a rival saying different things, a question answered ("For how long?"), relatives with real news, your grades reaching everyday talk.
9. **The Journal is a story.** Start: Haleyville, two years. See: no chapter titled after someone else, no "I ran for..." months early, a first paper with only fresh news.
10. **The paper prints the town.** Start: Storrs. See: "Mill lays off 20" and a home sold as side items, a line when a paper closes.
11. **First term, and people bring it up.** Start: seated as a council member. See: votes asked in the chamber, not your kitchen; a neighbor testifying while you can answer; a law scene saying what it cost your household; a neighbor raising your law later. Lane 1's Path 14 confirms it from New Game.

**The work, in order**

1. **Finish what's in review** (7, about 4 h). Fix #7090, #7103, #7127, then the desk merges. `words-person-history-tells-a-story`, `play-first-filing-campaign-tutorial`, `words-paper-law-and-budget-briefs-read-right`; plus `words-after-address-talk-follows`, `words-clerk-visit-narration-real`, `words-news-stories-not-fact-lists`, `words-archive-parent-death-body-by-seed`, already at the desk.
2. **The night you lose** (5, 4-6 h; `claude/scene-family-loss-worked-it` saves 4-5, lifted by hand since main's lines moved 143 times). `words-family-loss-scene-the-part-they-played`, `words-venue-speeches-delivered`, `words-arrogance-anger-and-fear`.
3. **A campaign never silent** (10, 20-24 h). `words-campaign-season-scenes-fill-the-months`, `director-circumstance-counted-cast-filled-in`, `words-campaign-asks-spoken-by-trait`, `director-canvass-meets-people-where-they-are`, `words-debate-answers-not-campaign-stops`.
4. **Talk like people** (11, 13-18 h; `claude/association-names` saves 1-2). `words-everyday-talk-one-engine`, `words-scene-talk-lines-by-tie`, `words-news-ask-gets-answer`, `words-talk-husk-acquaintances-empty`.
5. **Answers that count** (8, 16-20 h). `words-scene-ending-writes-its-record`, `scene-owed-talk-comes-due`, `people-owed-talk-record`, `scene-reporter-calls-on-a-vote`. One job, not six: what you say gets read by the part of the game that owns it.
6. **One life told as a story** (10, 10-14 h; `claude/political-game-pool-yucp92-bn` saves 2). `director-journal-one-story`, `play-stop-19-turning-eighteen-and-journal-silent`, `words-opening-paper-only-fresh-news`, `words-paper-and-journal-everyday-life`. #7070 at the desk is part of it.
7. **The paper prints the town** (3, about 5 h). `play-local-layoffs-on-screen`, `play-home-sales-on-screen`, `play-town-paper-on-screen`.
8. **First term** (14, 18-25 h; a chamber branch saves 1-2). `director-scene-settings-chamber-office-seat`, `scene-member-hears-testimony`, `words-scene-cause-law-effect-learned`, `words-swearing-in-scene-and-speech`, `words-director-one-path`, `engine-records-for-waiting-life-scenes`.

**Not in the pool, file at claim:** a check that talk is never a list, tutorials asked by a person in a scene, a Journal line for every dated record naming the player, doors on a porch, election night as its own pop-up.

**Close 23:** 18 done, such as `golden-door-ask` and `wire-people-and-director`, and 5 needing a check. **Drop 9:** old mining and grading items whose tools are gone (`words-mine-empty-cells`, `words-hearing-chair-question`), which also frees Lane 1's committee stop, and `words-unplanned-pregnancy-scenes` by your ruling. **Later 12:** the provisional ballot, press favors, ribbon cutting, the enacting clause by state, budget hearing words. **Slim 6:** victory and concession only, four dead lines deleted. **Ask 10:** all answered in section 4: five scene-report items and five executive or by-date scenes. They wait or fold in; none are cut.

**Out of scope:** new mechanics, batch grading (ended Oct 28), screens.

**Owned files:** `src/director/`, `src/english/`, `data/english/`.

**Handoffs:** Lane 1, `1-3.md`. Lane 2, `2-3.md`. Lane 4, `3-4.md`, owner Lane 3: who shows what in the paper and Journal; check: the paper's browser check.

**Open-work limit:** 3 to 5; 48-hour rule. **Stop rule:** all 11 confirmed; taste paths also seen by you in a built batch; then others' open items. **Status line:** "0 of 11 played paths confirmed. Oldest open PR N days."

**First card: finish what's in review**

- **Finish line:** a card reads as a life story with every term in it, the first filing offers its tutorial, and the paper's law items name the level.
- **Proof:** #7090 passes at GOLDEN_PATH_SEED=5988e88997d38b1e (Lyndonville, Vermont). #7103 shows the first filing's scene in Trucksville, Pennsylvania. #7127 names the level in Newport, Rhode Island, and its parent-death test passes. Each replayed on main to show it failing first.
- **Hands off:** tests; other lanes' files.
- **Known cheats:** a line typed in code, dropping the failing term, changing only the test.
- **Size:** about 4 hours, three pull requests.
- **Save, if stuck, hand-in:** as Lane 1's card, in `docs/lanes/state/lane-3.md`. **Checked by:** a fresh session, and you for how it reads.

**Every later unit gets the same card.** Before starting a unit, write its card in `docs/lanes/state/lane-3.md` from this page and the unit's pool items: finish line, proof, hands off, known cheats, size, checked by. Split it if it grows past about 400 changed lines. A unit with no card isn't started.
