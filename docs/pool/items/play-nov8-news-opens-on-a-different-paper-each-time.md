---
id: play-nov8-news-opens-on-a-different-paper-each-time
title: "News opens on whichever outlet printed the newest story, so the paper in front changes from visit to visit (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point P16, partly fixed)
---

**What.** The owner, Nov 8, about 2:20 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "Okay, and then I go to the news again. See, if you notice, all like the things are changing, like the news outlets, and now it's something about New York bottle deposit. What is going on?" What main does now, read in code on Nov 10, not measured: `news()` in `src/bench/play.mjs` (line 3824) puts the stories into a map of outlets in the order the stories arrive, newest first (lines 3829 to 3838), and `newsBoard` in `src/bench/ui/news-board.mjs` opens on the first key of that map (line 20). So the tab in front is the outlet of the newest story, and it changes whenever another outlet prints something newer; the tabs change order with it. Nothing remembers which paper the player was reading. Fix the cause for every player in every place: News opens on the player's own local paper (the outlet their household's records say they follow, or the town's paper), the tabs keep one order, and the tab the player last chose stays chosen while the game is open.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which paper opens first is read from the place's outlets and the household's news habits in the records, never from a named outlet or state. An effect is a read, not a record: the screen reads which outlets the player follows from the press engine's own record and keeps no list of its own. Owner, Sept (quoted in the playtest check, point P16): "kind of like Apple News". Owner, Nov 8, 2:10 p.m.: "There's news and then news again up top."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof) and takes a screenshot at 1440×900 of News on day one, then after each of four presses of Week. The tab in front must be the same outlet in all five screenshots, and the proof names that outlet's record id and why it is the player's (the household's follow record or the town's paper). The tabs must be in the same order in all five. The session then picks another tab, closes News, opens it again and confirms the picked tab is still in front. A story about another state must sit under the national or other-states paper, never in front of the local one. The same check is then run in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro. The owner plays it: he opens News and finds his town's paper in front every time.

**Files.** src/bench/play.mjs, src/bench/ui/news-board.mjs, src/bench/nation-news.ts

**Notes.** From the Nov 8 playtest, point P16 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check B): "One tab per outlet; the first tab is the newest story's outlet, so the default paper changes". The other halves of P16 belong to open items and are not this one: "it's only political stories... This news is terrible. There's no information here" is words-paper-side-stories and words-paper-and-journal-everyday-life (Words), and which other-state laws make the Nation paper is words-nation-newsworthy-by-reach-and-ties (open) after words-nation-reach-and-ties-built (done). Related, filed Nov 10: play-nov8-news-lead-has-no-picture-of-its-story. The play mock is `docs/mocks/2026-11-08-play/renders/pl-news.jpg` and `pl-news_p.paper_courier.jpg`. Not verified: nothing here was measured in the running game on Nov 10; whether the press engine keeps a record of which outlets a household follows was not traced, and if it does not, the town's own paper first is the smallest version, registered as a stopgap.
