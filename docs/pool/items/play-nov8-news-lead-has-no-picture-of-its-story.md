---
id: play-nov8-news-lead-has-no-picture-of-its-story
title: "News shows a picture only for a state or local government story, from three stock photos, and a paper of briefs is mostly empty panel (owner's Nov 8 playtest, Manchester, Connecticut)"
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
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, points P14 and C10, partly fixed)
---

**What.** The owner, Nov 8, about 2:10 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "I'm going to click on news. Yeah, I mean, look at this news. Again, there's the one of 3 pages, but this isn't news. I mean, this is it. There's no story. There's no pictures. Again, it's just a black screen." The CTO's note on the same screenshots (point C10): "the panel is mostly empty black (dead space)". Part of this is fixed on main: the briefs no longer page with arrows and the date follows the world's date. What main does now, read in code on Nov 10, not measured: `newsBoard` in `src/bench/ui/news-board.mjs` (line 19) draws a picture only on the lead story (its `photo` helper, lines 73 to 78), and `storyPhoto` in `src/bench/play.mjs` (line 257) returns a picture only for a state or local government acting, chosen from three stock room photos (`STORY_PHOTOS`, lines 234 to 237); a federal story, a business story and every story about a person get none. When every story of a paper is a one-line brief there is no lead at all (`front` is empty, line 39), so the first column draws nothing. Fix the class for every paper in every place: each lead story carries a picture of what it is about, from the story's own record, and a paper with only briefs fills its panel with them, with no empty column.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a story's picture is chosen from the record the story tells (the room of the body that acted, the place of the business, the person's bust), never a stock list keyed by level. Owner, Oct 14 (docs/play-first/LAW.md, line 79): "The game paints the photo of the actual story". Owner, Oct 29 (OWNER-DECISIONS, the second account's first sitting): "Nothing is actually on the paper." Owner, Oct 27 (quoted in the playtest check, point C10): "No dead space". The asset-scene-admission skill applies to any new picture.

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), plays four weeks with Week, and takes a screenshot at 1440×900 of News on day one and after each week, on every paper's tab. Every screenshot with a lead story must show a picture on it, and the proof names the record id the picture was chosen from; a federal lead and a business lead must each appear at least once with a picture. No screenshot may show an empty first column or a panel that is more than half bare. The picture must never be a named official's face that does not match their card. The same check is then run in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro, and each screenshot is set beside `docs/mocks/2026-11-08-play/renders/pl-news.jpg`. The owner plays it: he opens News and sees a front page with a picture of the story, not black panel.

**Files.** src/bench/ui/news-board.mjs, src/bench/play.mjs, src/bench/story.ts, src/bench/play.css

**Notes.** From the Nov 8 playtest, points P14 and C10 (docs/coordination/playtest/2026-11-08-1.md), their rows in `2026-11-08-1-check.md` (Check B) and the Nov 9 Screens row note ("What is left is the picture slot on the board"). Since that note the board has a picture slot for the lead; what is left is where the picture comes from. The code's own comment gives the reason federal stories have none: "No photo shows the official's own face, which would not match the record; a federal story has none until the art has one without a face." Whether there are stories with a body at all is the Words lead's work and has open items: words-paper-side-stories, words-paper-and-journal-everyday-life, and words-paper-law-and-budget-briefs-read-right (in PR). Other Nov 8 news points and where they stand: P15 (the date, and "News" printed twice) and C8 (which House voted) look fixed on main; P16 is play-nov8-news-opens-on-a-different-paper-each-time (filed Nov 10). Not verified: nothing here was measured in the running game on Nov 10.
