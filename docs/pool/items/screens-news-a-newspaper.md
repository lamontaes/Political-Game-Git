---
id: screens-news-a-newspaper
title: "News is a newspaper with story text, not headlines and record rows"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: screens/news-a-newspaper
pr: #6396
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T20:33:58.712Z
---

**What.** In v0.56.2 the owner said "There is still no newspapers, even though UI was made for them. I've talked about stories having actual text but there is none." News lists headlines only, and a public-record row reads "Law took effect / Series Local sales tax average · Jurisdiction Colorado". News must be a front page: masthead and date, a lead story with headline and several sentences of story text from the English engine's printed-news pieces, smaller stories below, and no record kinds, series names or jurisdiction labels.

**Rules.** No hand-written player text: story text comes from the English engine's banks (the printed-news pieces; the words lead owns the lines). Replace, never layer: the public-record row list is deleted from the News screen. This is a game, not a spreadsheet: a story with no text is not printed.

**Done when.** In a drawn place (name the place and seed), src/bench/news.browser.mjs passes on a restarted bench and asserts the News screen shows a masthead, a lead story with at least two sentences of body text, and no text matching Series, Jurisdiction or a record kind; a 1440x900 screenshot is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News opens as a front page with the lead story's text under its headline.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/calendar.ts, src/bench/archive-words.ts, src/bench/news.browser.mjs

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
