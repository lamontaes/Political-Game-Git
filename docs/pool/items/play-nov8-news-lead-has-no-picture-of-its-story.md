---
id: play-nov8-news-lead-has-no-picture-of-its-story
title: "News shows a picture only for a state or local government story, from three stock photos, and a paper of briefs is mostly empty panel (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-nov8-news-lead-has-no-picture-of-its-story
pr: #8539
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, points P14 and C10, partly fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:29:10.910Z
---

**What.** The owner, Nov 8, about 2:10 p.m. (v0.94.0, Manchester, Connecticut), on News: "There's no story. There's no pictures. Again, it's just a black screen." The CTO's note (point C10): the panel is mostly empty black. Part of this is fixed (the briefs no longer page with arrows and the date follows the world's). The lead story gets a picture only for a state or local government story, chosen from three stock room photos; a federal story, a business story and every story about a person get none, and a paper of only one-line briefs has no lead, so its first column draws nothing. Each lead story should carry a picture of what it is about, from the story's own record, and a briefs-only paper should fill its panel with the briefs.

**Cause.** Found in code: `storyPhoto` in src/bench/play.mjs (line 263) picks from `STORY_PHOTOS` (line 240) for state and local government stories only, and `newsBoard` in src/bench/ui/news-board.mjs (line 19) draws a picture on the lead only; with every story a brief, `front` is empty (line 41) and the first column draws nothing. Read on Nov 10, not measured in the running game.

**Fix.** Choose each lead story's picture from the record the story tells (the room of the body that acted, the place of the business), never a stock list keyed by level and never a face that does not match a card. Let a paper with only briefs fill its panel with them. Any new picture goes through `.agents/skills/asset-scene-admission/SKILL.md`.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a story's picture is chosen from the record the story tells, not from a list keyed by level. Owner, Oct 14 (docs/play-first/LAW.md): "The game paints the photo of the actual story". No hand-written player text: a picture carries no typed caption. Owner, Oct 27: "No dead space".

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named), plays four weeks with Week, and takes a screenshot at 1440x900 of News on day one and after each week on every paper's tab. Every screenshot with a lead story shows a picture, the proof names the record id the picture was chosen from, and a federal lead and a business lead each appear at least once with a picture. No screenshot shows an empty first column or a panel more than half bare, and no picture is a named official's face that does not match their card. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/ui/news-board.mjs, src/bench/play.mjs, src/bench/story.ts, src/bench/play.css

**Notes.** From the Nov 8 playtest, points P14 and C10 (docs/coordination/playtest/2026-11-08-1.md), their rows in `2026-11-08-1-check.md` (Check B) and the Nov 9 Screens row note ("What is left is the picture slot on the board"). Since that note the board has a picture slot for the lead; what is left is where the picture comes from. The code's own comment gives the reason federal stories have none: "No photo shows the official's own face, which would not match the record; a federal story has none until the art has one without a face." Whether there are stories with a body at all is the Words lead's work and has open items: words-paper-side-stories, words-paper-and-journal-everyday-life, and words-paper-law-and-budget-briefs-read-right (in PR). Other Nov 8 news points and where they stand: P15 (the date, and "News" printed twice) and C8 (which House voted) look fixed on main; P16 is play-nov8-news-opens-on-a-different-paper-each-time (filed Nov 10). Not verified: nothing here was measured in the running game on Nov 10.
