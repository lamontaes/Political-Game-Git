---
id: play-nov8-news-opens-on-a-different-paper-each-time
title: "News opens on whichever outlet printed the newest story, so the paper in front changes from visit to visit (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-nov8-news-opens-on-a-different-paper-each-time
pr: #8521
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point P16, partly fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:50:41.712Z
---

**What.** The owner, Nov 8, about 2:20 p.m. (v0.94.0, Manchester, Connecticut): "if you notice, all like the things are changing, like the news outlets, and now it's something about New York bottle deposit. What is going on?" News puts the stories into a map of outlets in the order they arrive, newest first, and opens on the first key, so the paper in front is the outlet of the newest story and the tabs reorder with it. Nothing remembers which paper the player was reading. News should open on the player's own local paper, keep the tabs in one order, and keep the tab the player last chose while the game is open.

**Cause.** Found in code: `news` in src/bench/play.mjs (line 3830) builds the outlets map in story order (the lines just after) and `newsBoard` in src/bench/ui/news-board.mjs opens on `outlets.keys().next().value` (line 20). Read on Nov 10, not measured in the running game; whether the press engine keeps a record of which outlets a household follows was not traced.

**Fix.** Open on the player's own local paper (the outlet the household's records say they follow, or else the town's outlet; the town's own paper first is the smallest version and is registered as a stopgap), keep one fixed tab order, and keep the tab the player chose while the game is open. A story about another state sits under the national or other-states paper, never in front of the local one.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which paper opens first is read from the place's outlets and the household's news habits in the records, never from a named outlet or state. An effect is a read, not a record: the screen reads which outlets the player follows from the press engine's record and keeps no list of its own. Every cut corner is a registered stopgap in the press family file under src/core2/data/stopgaps/.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of News on day one and after each of four presses of Week. The tab in front is the same outlet in all five screenshots, the proof names that outlet's record id and why it is the player's, and the tabs are in the same order in all five. The session then picks another tab, closes News, opens it again and the picked tab is still in front. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/news-board.mjs, src/bench/nation-news.ts

**Notes.** From the Nov 8 playtest, point P16 (docs/coordination/playtest/2026-11-08-1.md) and its row in `2026-11-08-1-check.md` (Check B): "One tab per outlet; the first tab is the newest story's outlet, so the default paper changes". The other halves of P16 belong to open items and are not this one: "it's only political stories... This news is terrible. There's no information here" is words-paper-side-stories and words-paper-and-journal-everyday-life (Words), and which other-state laws make the Nation paper is words-nation-newsworthy-by-reach-and-ties (open) after words-nation-reach-and-ties-built (done). Related, filed Nov 10: play-nov8-news-lead-has-no-picture-of-its-story. The play mock is `docs/mocks/2026-11-08-play/renders/pl-news.jpg` and `pl-news_p.paper_courier.jpg`. Not verified: nothing here was measured in the running game on Nov 10; whether the press engine keeps a record of which outlets a household follows was not traced, and if it does not, the town's own paper first is the smallest version, registered as a stopgap.
